import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const EXACT_ALLOWED_ORIGINS = new Set([
  "https://www.clinicmanger-pt.com",
  "https://clinicmanger-pt.com",
  "https://saas-clinc.vercel.app",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
]);

function resolveAllowedOrigin(origin: string | null): string {
  if (!origin) return "https://www.clinicmanger-pt.com";
  if (EXACT_ALLOWED_ORIGINS.has(origin)) return origin;

  try {
    const parsed = new URL(origin);
    if (
      parsed.protocol === "https:" &&
      parsed.hostname.endsWith(".vercel.app")
    ) {
      return origin;
    }
    if (
      (parsed.protocol === "http:" || parsed.protocol === "https:") &&
      (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1")
    ) {
      return origin;
    }
  } catch {
    // Fallback to primary site origin below
  }

  return "https://www.clinicmanger-pt.com";
}

function corsHeaders(origin: string | null): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": resolveAllowedOrigin(origin),
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "content-type, apikey, authorization, x-client-info",
    "Vary": "Origin",
  };
}

function jsonResponse(
  body: Record<string, unknown>,
  status: number,
  origin: string | null,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders(origin),
    },
  });
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatWhatsAppDigits(rawPhone: string): string {
  const digits = rawPhone.replace(/[^\d]/g, "");
  if (digits.startsWith("01") && digits.length === 11) {
    return `2${digits}`;
  }
  return digits || "201507881974";
}

function trimString(value: unknown, maxLen: number): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLen);
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function sendResendEmail(
  apiKey: string,
  payload: {
    from: string;
    to: string[];
    subject: string;
    html: string;
    reply_to?: string;
  },
): Promise<boolean> {
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const text = await res.text();
      console.error("[RESEND] Email rejected:", res.status, text);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[RESEND] Request error:", err);
    return false;
  }
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed." }, 405, origin);
  }

  let body: Record<string, unknown>;
  try {
    const parsed = await req.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return jsonResponse({ error: "Invalid JSON payload." }, 400, origin);
    }
    body = parsed as Record<string, unknown>;
  } catch {
    return jsonResponse({ error: "Malformed JSON request body." }, 400, origin);
  }

  // Silent honeypot drop for bots
  if (typeof body.website === "string" && body.website.trim().length > 0) {
    return jsonResponse({ success: true }, 200, origin);
  }

  const clinicName = trimString(body.clinicName, 120);
  const contactName = trimString(body.contactName, 120);
  const email = trimString(body.email, 180).toLowerCase();
  const phoneWhatsapp = trimString(body.phoneWhatsapp, 40);
  const branchesCount = trimString(body.branchesCount, 30) || "1";
  const preferredLanguage = body.preferredLanguage === "ar" ? "ar" : "en";
  const planTier = trimString(body.planTier, 60) || null;
  const message = trimString(body.message, 2000) || null;
  const sourceUrl = trimString(body.sourceUrl, 300) || null;
  const utmSource = trimString(body.utmSource, 120) || null;

  const rawModules = Array.isArray(body.interestModules)
    ? body.interestModules
    : [];
  const interestModules = rawModules
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim().slice(0, 60))
    .filter((item) => item.length > 0)
    .slice(0, 20);

  if (clinicName.length < 2) {
    return jsonResponse(
      { error: "Clinic name must be at least 2 characters." },
      400,
      origin,
    );
  }
  if (contactName.length < 2) {
    return jsonResponse(
      { error: "Contact name must be at least 2 characters." },
      400,
      origin,
    );
  }
  if (!EMAIL_REGEX.test(email)) {
    return jsonResponse(
      { error: "Please provide a valid email address." },
      400,
      origin,
    );
  }
  if (phoneWhatsapp.length < 6) {
    return jsonResponse(
      { error: "Please provide a valid phone or WhatsApp number." },
      400,
      origin,
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("[SUBMIT-DEMO] Missing Supabase environment variables.");
    return jsonResponse(
      { error: "Server configuration error." },
      500,
      origin,
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 60-second per-email duplicate guard
  const sixtySecondsAgo = new Date(Date.now() - 60_000).toISOString();
  const { data: recentLeads, error: dupErr } = await supabase
    .from("marketing_demo_requests")
    .select("id")
    .eq("email", email)
    .gte("created_at", sixtySecondsAgo)
    .limit(1);

  if (dupErr) {
    console.error("[SUBMIT-DEMO] Duplicate check error:", dupErr);
  } else if (recentLeads && recentLeads.length > 0) {
    return jsonResponse(
      { error: "Please wait a moment before submitting again." },
      429,
      origin,
    );
  }

  const { data: inserted, error: insertError } = await supabase
    .from("marketing_demo_requests")
    .insert({
      clinic_name: clinicName,
      contact_name: contactName,
      email,
      phone_whatsapp: phoneWhatsapp,
      branches_count: branchesCount,
      preferred_language: preferredLanguage,
      interest_modules: interestModules,
      plan_tier: planTier,
      message,
      source_url: sourceUrl,
      utm_source: utmSource,
      status: "new",
      email_sent: false,
    })
    .select("id")
    .single();

  if (insertError || !inserted) {
    console.error("[SUBMIT-DEMO] Insert failed:", insertError);
    return jsonResponse(
      { error: "Could not save demo request. Please try again." },
      500,
      origin,
    );
  }

  let emailSent = false;
  const resendApiKey = Deno.env.get("RESEND_API_KEY");

  if (resendApiKey) {
    const fromName =
      Deno.env.get("RESEND_FROM_NAME") || "P.T.A — Physical Therapy Assistant";
    const fromEmail =
      Deno.env.get("RESEND_FROM_EMAIL") || "onboarding@clinicmanger-pt.com";
    const adminEmail =
      Deno.env.get("LEAD_NOTIFY_EMAIL") || "ziadweal55@gmail.com";
    const fromAddress = `${fromName} <${fromEmail}>`;

    const waDigits = formatWhatsAppDigits(phoneWhatsapp);
    const waLink = `https://wa.me/${waDigits}`;
    const safeClinic = escapeHtml(clinicName);
    const safeContact = escapeHtml(contactName);
    const safeEmail = escapeHtml(email);
    const safePhone = escapeHtml(phoneWhatsapp);
    const safeBranches = escapeHtml(branchesCount);
    const safePlan = escapeHtml(planTier || "Not specified");
    const safeModules =
      interestModules.length > 0
        ? escapeHtml(interestModules.join(", "))
        : "Full Suite Overview";
    const safeMessage = message ? escapeHtml(message).replaceAll("\n", "<br>") : "—";
    const safeId = escapeHtml(String(inserted.id));

    const adminHtml = `
      <div style="font-family:Figtree,Arial,sans-serif;background:#F4F7F6;padding:32px 16px;color:#0B2F24;">
        <div style="max-width:600px;margin:0 auto;background:#FFFFFF;border:1px solid #D1FAE5;border-radius:16px;overflow:hidden;">
          <div style="background:#071F18;padding:24px 28px;color:#FFFFFF;">
            <div style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#10B981;font-weight:700;">P.T.A • Physical Therapy Assistant • New Demo Request</div>
            <h1 style="margin:8px 0 0;font-size:22px;">${safeClinic}</h1>
          </div>
          <div style="padding:24px 28px;">
            <table style="width:100%;border-collapse:collapse;font-size:14px;">
              <tr><td style="padding:8px 0;color:#475569;width:150px;">Contact Person</td><td style="padding:8px 0;font-weight:700;">${safeContact}</td></tr>
              <tr><td style="padding:8px 0;color:#475569;">Email</td><td style="padding:8px 0;"><a href="mailto:${safeEmail}" style="color:#059669;">${safeEmail}</a></td></tr>
              <tr><td style="padding:8px 0;color:#475569;">WhatsApp / Phone</td><td style="padding:8px 0;"><a href="${waLink}" style="color:#059669;font-weight:700;">${safePhone} (Open WhatsApp)</a></td></tr>
              <tr><td style="padding:8px 0;color:#475569;">Branches</td><td style="padding:8px 0;">${safeBranches}</td></tr>
              <tr><td style="padding:8px 0;color:#475569;">Plan Tier</td><td style="padding:8px 0;">${safePlan}</td></tr>
              <tr><td style="padding:8px 0;color:#475569;">Modules</td><td style="padding:8px 0;">${safeModules}</td></tr>
              <tr><td style="padding:8px 0;color:#475569;">Language</td><td style="padding:8px 0;">${preferredLanguage.toUpperCase()}</td></tr>
              <tr><td style="padding:8px 0;color:#475569;vertical-align:top;">Notes</td><td style="padding:8px 0;">${safeMessage}</td></tr>
              <tr><td style="padding:8px 0;color:#475569;">Lead ID</td><td style="padding:8px 0;font-family:monospace;font-size:12px;">${safeId}</td></tr>
            </table>
          </div>
        </div>
      </div>
    `;

    const isAr = preferredLanguage === "ar";
    const prospectSubject = isAr
      ? `تم استلام طلب العرض التجريبي لعيادة ${clinicName} — P.T.A`
      : `Your Live Demo Request for ${clinicName} — P.T.A`;

    const prospectHtml = isAr
      ? `
      <div dir="rtl" style="font-family:'Noto Sans Arabic',Arial,sans-serif;background:#F4F7F6;padding:32px 16px;color:#0B2F24;">
        <div style="max-width:600px;margin:0 auto;background:#FFFFFF;border:1px solid #D1FAE5;border-radius:16px;overflow:hidden;">
          <div style="background:#071F18;padding:24px 28px;color:#FFFFFF;">
            <div style="font-size:12px;color:#10B981;font-weight:700;">P.T.A • منظومة إدارة عيادات العلاج الطبيعي</div>
            <h1 style="margin:8px 0 0;font-size:22px;">أهلاً ${safeContact}</h1>
          </div>
          <div style="padding:24px 28px;line-height:1.8;font-size:15px;">
            <p style="margin:0 0 12px;">شكراً لتواصلك مع فريق <strong>P.T.A</strong>. تم تسجيل طلب العرض التوضيحي المباشر الخاص بعيادة <strong>${safeClinic}</strong> بنجاح.</p>
            <p style="margin:0 0 20px;">سيتواصل معك فريقنا خلال ساعات العمل لتنسيق موعد عرض تفاعلي لمدة 15 دقيقة يشمل لوحة التحكم، نظام العمولات، بوابة المرضى، والمساعد الذكي.</p>
            <a href="https://wa.me/201507881974" style="display:inline-block;background:#059669;color:#FFFFFF;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:700;">تواصل مباشرة عبر واتساب: 01507881974</a>
          </div>
        </div>
      </div>
    `
      : `
      <div style="font-family:Figtree,Arial,sans-serif;background:#F4F7F6;padding:32px 16px;color:#0B2F24;">
        <div style="max-width:600px;margin:0 auto;background:#FFFFFF;border:1px solid #D1FAE5;border-radius:16px;overflow:hidden;">
          <div style="background:#071F18;padding:24px 28px;color:#FFFFFF;">
            <div style="font-size:12px;letter-spacing:1.5px;text-transform:uppercase;color:#10B981;font-weight:700;">P.T.A • Physical Therapy Assistant</div>
            <h1 style="margin:8px 0 0;font-size:22px;">We received your demo request, ${safeContact}</h1>
          </div>
          <div style="padding:24px 28px;line-height:1.7;font-size:15px;">
            <p style="margin:0 0 12px;">Thank you for requesting a live walkthrough for <strong>${safeClinic}</strong>.</p>
            <p style="margin:0 0 20px;">Our team will reach out shortly to schedule your 15-minute live session covering the Command Center, automated doctor commissions, patient portal, and Gemini AI Clinical Co-Pilot.</p>
            <a href="https://wa.me/201507881974" style="display:inline-block;background:#059669;color:#FFFFFF;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:700;">Message Us on WhatsApp: 01507881974</a>
          </div>
        </div>
      </div>
    `;

    const [adminOk, prospectOk] = await Promise.all([
      sendResendEmail(resendApiKey, {
        from: fromAddress,
        to: [adminEmail],
        reply_to: email,
        subject: `New Demo Request: ${clinicName} (${branchesCount} branches)`,
        html: adminHtml,
      }),
      sendResendEmail(resendApiKey, {
        from: fromAddress,
        to: [email],
        subject: prospectSubject,
        html: prospectHtml,
      }),
    ]);

    emailSent = adminOk || prospectOk;
    if (emailSent) {
      await supabase
        .from("marketing_demo_requests")
        .update({ email_sent: true })
        .eq("id", inserted.id);
    }
  } else {
    console.warn("[SUBMIT-DEMO] RESEND_API_KEY secret is not configured yet.");
  }

  return jsonResponse(
    {
      success: true,
      id: inserted.id,
      emailSent,
    },
    201,
    origin,
  );
});
