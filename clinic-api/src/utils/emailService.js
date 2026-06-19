const { Resend } = require('resend');
require('dotenv').config();

const apiKey = process.env.RESEND_API_KEY;
const resend = apiKey ? new Resend(apiKey) : null;
const FROM = `${process.env.RESEND_FROM_NAME || 'SaaS Clinic'} <${process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'}>`;

// Helper: chunk array into batches
const chunkArray = (arr, size) => {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  return chunks;
};

// Base HTML wrapper with dark branded styling
const baseTemplate = (content) => `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#0f1117;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:40px 20px;">
      <table width="600" style="background:#1a1d27;border-radius:16px;overflow:hidden;border:1px solid #1e2333;">
        <tr><td style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:32px 40px;">
          <h1 style="margin:0;color:#fff;font-size:24px;font-weight:900;letter-spacing:-0.5px;">🏥 SaaS Clinic</h1>
          <p style="margin:6px 0 0;color:rgba(255,255,255,0.7);font-size:12px;text-transform:uppercase;letter-spacing:2px;">Clinic Management Platform</p>
        </td></tr>
        <tr><td style="padding:40px;color:#f1f5f9;">
          ${content}
        </td></tr>
        <tr><td style="padding:24px 40px;border-top:1px solid #1e2333;">
          <p style="margin:0;color:#64748b;font-size:12px;">© ${new Date().getFullYear()} SaaS Clinic Platform. All rights reserved.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

exports.sendApprovalEmail = async (clinicEmail, clinicName, subdomain, loginUrl, tempPassword) => {
  if (!clinicEmail) return;
  if (!resend) {
    console.warn(`[EMAIL] Resend is not configured. Skipping approval email to ${clinicEmail}`);
    return;
  }
  const content = `
    <h2 style="color:#10b981;margin:0 0 16px;">✅ Your Clinic Has Been Approved!</h2>
    <p style="color:#94a3b8;line-height:1.6;">Congratulations! <strong style="color:#f1f5f9;">${clinicName}</strong> has been approved and your clinic workspace is now active.</p>
    <div style="background:#12151f;border-radius:12px;padding:20px;margin:24px 0;border:1px solid #1e2333;">
      <p style="margin:0 0 8px;color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Your Clinic Subdomain</p>
      <p style="margin:0 0 16px;color:#6366f1;font-size:18px;font-weight:700;">${subdomain}</p>
      ${tempPassword ? `
      <p style="margin:0 0 8px;color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Temporary Admin Password</p>
      <p style="margin:0;color:#6366f1;font-size:18px;font-weight:700;font-family:monospace;">${tempPassword}</p>
      ` : ''}
    </div>
    <div style="background:#12151f;border-radius:12px;padding:20px;margin:24px 0;border:1px solid #1e2333;">
      <p style="margin:0 0 8px;color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Help & Instruction Manual</p>
      <p style="margin:0 0 16px;line-height:1.5;"><a href="https://drive.google.com/file/d/1FHsldlwVFfGr7L8-bKQQXArccJiTdPXU/view?usp=sharing" target="_blank" style="color:#10b981;font-weight:700;text-decoration:underline;">Download Registrar Manual Guide →</a></p>
      <p style="margin:0 0 8px;color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Support Calls</p>
      <p style="margin:0;color:#f1f5f9;font-size:16px;font-weight:700;">📞 01507881974</p>
    </div>
    <a href="${loginUrl || '#'}" style="display:inline-block;background:#6366f1;color:#fff;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:700;margin-top:8px;">Log In to Your Clinic →</a>
    <p style="margin-top:24px;color:#64748b;font-size:13px;">If you have any questions, reply to this email and our team will help you get started.</p>`;
  try {
    await resend.emails.send({ from: FROM, to: clinicEmail, subject: `✅ ${clinicName} — Clinic Approved & Ready!`, html: baseTemplate(content) });
    console.log(`[EMAIL] Approval email sent to ${clinicEmail}`);
  } catch (e) { console.error('[EMAIL] Failed to send approval email:', e.message); }
};

exports.sendRejectionEmail = async (clinicEmail, clinicName, reason) => {
  if (!clinicEmail) return;
  if (!resend) {
    console.warn(`[EMAIL] Resend is not configured. Skipping rejection email to ${clinicEmail}`);
    return;
  }
  const content = `
    <h2 style="color:#ef4444;margin:0 0 16px;">❌ Clinic Registration Update</h2>
    <p style="color:#94a3b8;line-height:1.6;">Thank you for registering <strong style="color:#f1f5f9;">${clinicName}</strong>. After review, we were unable to approve your application at this time.</p>
    ${reason ? `<div style="background:#12151f;border-radius:12px;padding:20px;margin:24px 0;border:1px solid #ef4444/20;"><p style="margin:0 0 8px;color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Reason</p><p style="margin:0;color:#f1f5f9;line-height:1.6;">${reason}</p></div>` : ''}
    <p style="color:#64748b;font-size:13px;margin-top:24px;">You are welcome to reapply after addressing the concerns above. Contact us if you need clarification.</p>`;
  try {
    await resend.emails.send({ from: FROM, to: clinicEmail, subject: `Clinic Registration — Application Update`, html: baseTemplate(content) });
    console.log(`[EMAIL] Rejection email sent to ${clinicEmail}`);
  } catch (e) { console.error('[EMAIL] Failed to send rejection email:', e.message); }
};

exports.sendAnnouncementBroadcast = async (announcement, clinicEmails) => {
  if (!clinicEmails || clinicEmails.length === 0) return;
  if (!resend) {
    console.warn(`[EMAIL] Resend is not configured. Skipping announcement broadcast to ${clinicEmails.length} emails`);
    return;
  }
  const typeColors = { info: '#0ea5e9', warning: '#f59e0b', maintenance: '#ef4444', feature: '#10b981' };
  const typeIcons = { info: 'ℹ️', warning: '⚠️', maintenance: '🔧', feature: '🚀' };
  const color = typeColors[announcement.type] || '#6366f1';
  const icon = typeIcons[announcement.type] || '📢';
  const content = `
    <h2 style="color:${color};margin:0 0 16px;">${icon} ${announcement.title}</h2>
    <div style="background:#12151f;border-radius:12px;padding:20px;margin:16px 0;border:1px solid #1e2333;">
      <p style="margin:0;color:#94a3b8;line-height:1.7;">${announcement.body.replace(/\n/g, '<br>')}</p>
    </div>
    <p style="color:#64748b;font-size:12px;margin-top:24px;">This is an official platform announcement from SaaS Clinic.</p>`;
  const batches = chunkArray(clinicEmails, 100);
  for (const batch of batches) {
    try {
      await resend.batch.send(batch.map(email => ({ from: FROM, to: email, subject: `${icon} ${announcement.title}`, html: baseTemplate(content) })));
      console.log(`[EMAIL] Announcement batch sent to ${batch.length} clinics`);
    } catch (e) { console.error('[EMAIL] Announcement batch failed:', e.message); }
  }
};

exports.sendExpiryWarningEmail = async (clinicEmail, clinicName, expiryDate) => {
  if (!clinicEmail) return;
  if (!resend) {
    console.warn(`[EMAIL] Resend is not configured. Skipping expiry warning email to ${clinicEmail}`);
    return;
  }
  const dateStr = new Date(expiryDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const content = `
    <h2 style="color:#f59e0b;margin:0 0 16px;">⚠️ Subscription Expiring Soon</h2>
    <p style="color:#94a3b8;line-height:1.6;"><strong style="color:#f1f5f9;">${clinicName}</strong>, your subscription expires on <strong style="color:#f59e0b;">${dateStr}</strong> — that's in 7 days.</p>
    <p style="color:#94a3b8;line-height:1.6;">To keep your clinic active and avoid any service interruption, please contact us to renew your subscription.</p>
    <p style="color:#64748b;font-size:13px;margin-top:24px;">If you have already renewed, please disregard this notice.</p>`;
  try {
    await resend.emails.send({ from: FROM, to: clinicEmail, subject: `⚠️ ${clinicName} — Subscription Expiring in 7 Days`, html: baseTemplate(content) });
    console.log(`[EMAIL] Expiry warning sent to ${clinicEmail}`);
  } catch (e) { console.error('[EMAIL] Failed to send expiry warning:', e.message); }
};

exports.sendSuspendedEmail = async (clinicEmail, clinicName) => {
  if (!clinicEmail) return;
  if (!resend) {
    console.warn(`[EMAIL] Resend is not configured. Skipping suspension email to ${clinicEmail}`);
    return;
  }
  const content = `
    <h2 style="color:#ef4444;margin:0 0 16px;">🚫 Clinic Account Suspended</h2>
    <p style="color:#94a3b8;line-height:1.6;">Your clinic <strong style="color:#f1f5f9;">${clinicName}</strong> has been suspended due to a lapsed subscription.</p>
    <p style="color:#94a3b8;line-height:1.6;">Your data is safe and preserved. To reactivate your clinic, please contact us to renew your subscription.</p>
    <p style="color:#64748b;font-size:13px;margin-top:24px;">We're here to help — reply to this email to speak with our team.</p>`;
  try {
    await resend.emails.send({ from: FROM, to: clinicEmail, subject: `🚫 ${clinicName} — Account Suspended`, html: baseTemplate(content) });
    console.log(`[EMAIL] Suspension notice sent to ${clinicEmail}`);
  } catch (e) { console.error('[EMAIL] Failed to send suspension email:', e.message); }
};

exports.sendNewClinicRegistrationAdminNotification = async (tenantId, clinicName, email, whatsappNumber) => {
  const adminEmail = 'ziadweal55@gmail.com';
  if (!resend) {
    console.warn(`[EMAIL] Resend is not configured. Skipping admin notification email to ${adminEmail}`);
    return;
  }
  const content = `
    <h2 style="color:#6366f1;margin:0 0 16px;">🏥 New Clinic Registration Request</h2>
    <p style="color:#94a3b8;line-height:1.6;">A new clinic has registered and is pending approval in the admin dashboard.</p>
    <div style="background:#12151f;border-radius:12px;padding:20px;margin:24px 0;border:1px solid #1e2333;">
      <p style="margin:0 0 8px;color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Clinic Name</p>
      <p style="margin:0 0 16px;color:#f1f5f9;font-size:16px;font-weight:700;">${clinicName}</p>
      <p style="margin:0 0 8px;color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Subdomain (Tenant ID)</p>
      <p style="margin:0 0 16px;color:#6366f1;font-size:16px;font-weight:700;">${tenantId}</p>
      <p style="margin:0 0 8px;color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Contact Email</p>
      <p style="margin:0 0 16px;color:#f1f5f9;font-size:16px;font-weight:700;">${email}</p>
      <p style="margin:0 0 8px;color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:1px;">WhatsApp Number</p>
      <p style="margin:0;color:#f1f5f9;font-size:16px;font-weight:700;">${whatsappNumber || '—'}</p>
    </div>
    <p style="color:#94a3b8;line-height:1.6;">Please log in to your admin dashboard to accept or decline this application.</p>
  `;
  try {
    await resend.emails.send({
      from: FROM,
      to: adminEmail,
      subject: `🏥 New Clinic Registration: ${clinicName} (${tenantId})`,
      html: baseTemplate(content)
    });
    console.log(`[EMAIL] New registration admin notification email sent to ${adminEmail}`);
  } catch (e) {
    console.error('[EMAIL] Failed to send registration admin notification email:', e.message);
  }
};
