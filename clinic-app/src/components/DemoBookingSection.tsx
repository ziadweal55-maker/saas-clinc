import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Loader2,
  Mail,
  MessageCircle,
  Send,
  AlertCircle,
} from 'lucide-react';
import { useLanguage } from '../context/useLanguage';
import { BRAND, getWhatsAppUrl } from '../config/brand';
import { submitDemoRequest } from '../lib/supabase';

interface DemoBookingSectionProps {
  selectedPlan: string;
}

export const DemoBookingSection: React.FC<DemoBookingSectionProps> = ({
  selectedPlan,
}) => {
  const { t, lang } = useLanguage();

  const [clinicName, setClinicName] = useState('');
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneWhatsapp, setPhoneWhatsapp] = useState('');
  const [branchesCount, setBranchesCount] = useState('1');
  const [planTier, setPlanTier] = useState(
    selectedPlan || t.demo.form.planOptions[1]?.value || 'Multi-Branch Suite',
  );
  const [interestModules, setInterestModules] = useState<string[]>([
    'Command Center & Queue',
    'Doctor Commissions & Payroll',
  ]);
  const [message, setMessage] = useState('');
  const [websiteHoneypot, setWebsiteHoneypot] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [errorText, setErrorText] = useState('');
  const [submittedId, setSubmittedId] = useState<string | null>(null);

  useEffect(() => {
    if (selectedPlan) {
      setPlanTier(selectedPlan);
    }
  }, [selectedPlan]);

  const toggleModule = (modId: string) => {
    setInterestModules((prev) =>
      prev.includes(modId)
        ? prev.filter((item) => item !== modId)
        : [...prev, modId],
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorText('');

    if (
      clinicName.trim().length < 2 ||
      contactName.trim().length < 2 ||
      !email.includes('@') ||
      phoneWhatsapp.trim().length < 6
    ) {
      setErrorText(t.demo.form.validationError);
      return;
    }

    setSubmitting(true);
    const params =
      typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search)
        : null;

    const result = await submitDemoRequest({
      clinicName: clinicName.trim(),
      contactName: contactName.trim(),
      email: email.trim().toLowerCase(),
      phoneWhatsapp: phoneWhatsapp.trim(),
      branchesCount,
      preferredLanguage: lang,
      interestModules,
      planTier,
      message: message.trim() || undefined,
      sourceUrl:
        typeof window !== 'undefined' ? window.location.href : undefined,
      utmSource: params?.get('utm_source') || undefined,
      website: websiteHoneypot,
    });

    setSubmitting(false);

    if (!result.success) {
      setErrorText(result.error || t.demo.form.validationError);
      return;
    }

    setSubmittedId(result.id || 'SAVED');
  };

  const resetForm = () => {
    setSubmittedId(null);
    setClinicName('');
    setContactName('');
    setEmail('');
    setPhoneWhatsapp('');
    setMessage('');
    setErrorText('');
  };

  const directWaUrl = getWhatsAppUrl(t.hero.whatsappMessage);
  const followUpWaUrl = getWhatsAppUrl(
    `${t.demo.success.whatsappPrefillPrefix} ${clinicName || 'our clinic'} (${submittedId ?? ''}).`,
  );

  return (
    <section id="demo" className="relative overflow-hidden bg-[#F4F7F6] py-20 sm:py-24">
      <img
        src="/photos/clinic-reception-team.jpg"
        alt=""
        aria-hidden="true"
        loading="lazy"
        className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center opacity-[0.07]"
      />
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#F4F7F6] via-[#F4F7F6]/92 to-[#F4F7F6]"
        aria-hidden="true"
      />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
          {/* Left Column: Reception Team Photo, Direct Channels & Demo Agenda */}
          <div className="space-y-6 lg:col-span-5">
            <div>
              <span className="inline-block rounded-full bg-white px-3.5 py-1 text-xs font-extrabold uppercase tracking-wider text-[#059669] ring-1 ring-[#D1FAE5]">
                {t.demo.eyebrow}
              </span>
              <h2 className="mt-4 text-3xl font-extrabold text-[#0B2F24] sm:text-4xl">
                {t.demo.title}
              </h2>
              <p className="mt-3 text-base leading-relaxed text-[#0B2F24]/75">
                {t.demo.subtitle}
              </p>
            </div>

            <div className="relative overflow-hidden rounded-3xl border border-[#D1FAE5] bg-[#071F18] shadow-sm">
              <img
                src="/photos/clinic-reception-team.jpg"
                alt={t.demo.photoBannerTitle}
                loading="lazy"
                className="h-48 w-full object-cover object-center"
              />
              <div
                className="absolute inset-0 bg-gradient-to-t from-[#071F18]/90 via-[#071F18]/35 to-transparent"
                aria-hidden="true"
              />
              <div className="absolute inset-x-0 bottom-0 p-5">
                <div className="text-sm font-extrabold text-white">
                  {t.demo.photoBannerTitle}
                </div>
                <div className="mt-0.5 text-xs font-medium text-emerald-200/90">
                  {t.demo.photoBannerSubtitle}
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-[#D1FAE5] bg-white p-6 space-y-4">
              <h3 className="text-sm font-extrabold text-[#0B2F24]">
                {t.demo.directTitle}
              </h3>

              <a
                href={directWaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between rounded-2xl border border-[#D1FAE5] bg-[#ECFDF5] p-4 transition-colors hover:border-[#059669]"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#059669] text-white">
                    <MessageCircle className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[#059669]">
                      {t.demo.directWhatsappLabel}
                    </div>
                    <div
                      dir="ltr"
                      className="text-base font-extrabold text-[#0B2F24]"
                    >
                      {BRAND.whatsappDisplay}
                    </div>
                  </div>
                </div>
              </a>

              <a
                href={`mailto:${BRAND.supportEmail}`}
                className="flex items-center gap-3 rounded-2xl border border-[#D1FAE5] bg-[#F4F7F6]/70 p-4 transition-colors hover:border-[#059669]"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[#059669] ring-1 ring-[#D1FAE5]">
                  <Mail className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-[#0B2F24]/65">
                    {t.demo.directEmailLabel}
                  </div>
                  <div
                    dir="ltr"
                    className="text-sm font-extrabold text-[#0B2F24]"
                  >
                    {BRAND.supportEmail}
                  </div>
                </div>
              </a>
            </div>

            <div className="rounded-3xl border border-[#D1FAE5] bg-white p-6">
              <h3 className="text-sm font-extrabold text-[#0B2F24]">
                {t.demo.coversTitle}
              </h3>
              <ul className="mt-4 space-y-3">
                {t.demo.covers.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-2.5 text-sm leading-relaxed text-[#0B2F24]/80"
                  >
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#059669]" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Right Column: Supabase + Resend Demo Form */}
          <div className="lg:col-span-7">
            <div className="rounded-3xl border border-[#D1FAE5] bg-white p-6 shadow-sm sm:p-8">
              {submittedId ? (
                <div className="py-8 text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#ECFDF5] text-[#059669] ring-1 ring-[#D1FAE5]">
                    <CheckCircle2 className="h-9 w-9" />
                  </div>
                  <h3 className="mt-5 text-2xl font-extrabold text-[#0B2F24]">
                    {t.demo.success.title}
                  </h3>
                  <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-[#0B2F24]/75">
                    {t.demo.success.subtitle}
                  </p>

                  <div className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#F4F7F6] px-4 py-2 text-xs font-bold text-[#0B2F24] ring-1 ring-[#D1FAE5]">
                    <span>{t.demo.success.referenceLabel}:</span>
                    <span className="font-mono text-[#059669]">{submittedId}</span>
                  </div>

                  <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
                    <a
                      href={followUpWaUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#059669] px-6 py-3.5 text-sm font-extrabold text-white transition-all hover:bg-[#047857] sm:w-auto"
                    >
                      <MessageCircle className="h-4 w-4" />
                      <span>{t.demo.success.whatsappFollowUp}</span>
                    </a>
                    <button
                      type="button"
                      onClick={resetForm}
                      className="inline-flex w-full cursor-pointer items-center justify-center rounded-2xl border border-[#D1FAE5] bg-white px-5 py-3.5 text-sm font-bold text-[#0B2F24] hover:bg-[#ECFDF5] sm:w-auto"
                    >
                      {t.demo.success.submitAnother}
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                  {/* Honeypot field for bot filtering */}
                  <div className="hidden" aria-hidden="true">
                    <label htmlFor="website-honeypot">Website</label>
                    <input
                      id="website-honeypot"
                      type="text"
                      name="website"
                      tabIndex={-1}
                      autoComplete="off"
                      value={websiteHoneypot}
                      onChange={(e) => setWebsiteHoneypot(e.target.value)}
                    />
                  </div>

                  {errorText && (
                    <div className="flex items-start gap-2.5 rounded-2xl border border-rose-200 bg-rose-50 p-3.5 text-xs font-bold text-rose-700">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>{errorText}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-xs font-extrabold text-[#0B2F24]">
                        {t.demo.form.clinicNameLabel}
                      </label>
                      <input
                        type="text"
                        required
                        value={clinicName}
                        onChange={(e) => setClinicName(e.target.value)}
                        placeholder={t.demo.form.clinicNamePlaceholder}
                        className="w-full rounded-xl border border-[#D1FAE5] bg-[#F4F7F6]/60 px-3.5 py-2.5 text-sm text-[#0B2F24] placeholder:text-[#0B2F24]/40 focus:border-[#059669] focus:bg-white focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-extrabold text-[#0B2F24]">
                        {t.demo.form.contactNameLabel}
                      </label>
                      <input
                        type="text"
                        required
                        value={contactName}
                        onChange={(e) => setContactName(e.target.value)}
                        placeholder={t.demo.form.contactNamePlaceholder}
                        className="w-full rounded-xl border border-[#D1FAE5] bg-[#F4F7F6]/60 px-3.5 py-2.5 text-sm text-[#0B2F24] placeholder:text-[#0B2F24]/40 focus:border-[#059669] focus:bg-white focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-xs font-extrabold text-[#0B2F24]">
                        {t.demo.form.emailLabel}
                      </label>
                      <input
                        type="email"
                        required
                        dir="ltr"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder={t.demo.form.emailPlaceholder}
                        className="w-full rounded-xl border border-[#D1FAE5] bg-[#F4F7F6]/60 px-3.5 py-2.5 text-sm text-[#0B2F24] placeholder:text-[#0B2F24]/40 focus:border-[#059669] focus:bg-white focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-extrabold text-[#0B2F24]">
                        {t.demo.form.phoneLabel}
                      </label>
                      <input
                        type="tel"
                        required
                        dir="ltr"
                        value={phoneWhatsapp}
                        onChange={(e) => setPhoneWhatsapp(e.target.value)}
                        placeholder={t.demo.form.phonePlaceholder}
                        className="w-full rounded-xl border border-[#D1FAE5] bg-[#F4F7F6]/60 px-3.5 py-2.5 text-sm text-[#0B2F24] placeholder:text-[#0B2F24]/40 focus:border-[#059669] focus:bg-white focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-xs font-extrabold text-[#0B2F24]">
                        {t.demo.form.branchesLabel}
                      </label>
                      <select
                        value={branchesCount}
                        onChange={(e) => setBranchesCount(e.target.value)}
                        className="w-full rounded-xl border border-[#D1FAE5] bg-[#F4F7F6]/60 px-3.5 py-2.5 text-sm font-semibold text-[#0B2F24] focus:border-[#059669] focus:bg-white focus:outline-none"
                      >
                        {t.demo.form.branchOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-extrabold text-[#0B2F24]">
                        {t.demo.form.planLabel}
                      </label>
                      <select
                        value={planTier}
                        onChange={(e) => setPlanTier(e.target.value)}
                        className="w-full rounded-xl border border-[#D1FAE5] bg-[#F4F7F6]/60 px-3.5 py-2.5 text-sm font-semibold text-[#0B2F24] focus:border-[#059669] focus:bg-white focus:outline-none"
                      >
                        {t.demo.form.planOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-extrabold text-[#0B2F24]">
                      {t.demo.form.modulesLabel}
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {t.demo.form.moduleOptions.map((mod) => {
                        const active = interestModules.includes(mod.id);
                        return (
                          <button
                            key={mod.id}
                            type="button"
                            onClick={() => toggleModule(mod.id)}
                            className={`cursor-pointer rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                              active
                                ? 'bg-[#059669] text-white'
                                : 'border border-[#D1FAE5] bg-[#F4F7F6] text-[#0B2F24]/80 hover:border-[#059669]/40 hover:bg-[#ECFDF5]'
                            }`}
                          >
                            {mod.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-extrabold text-[#0B2F24]">
                      {t.demo.form.notesLabel}
                    </label>
                    <textarea
                      rows={3}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder={t.demo.form.notesPlaceholder}
                      className="w-full rounded-xl border border-[#D1FAE5] bg-[#F4F7F6]/60 px-3.5 py-2.5 text-sm text-[#0B2F24] placeholder:text-[#0B2F24]/40 focus:border-[#059669] focus:bg-white focus:outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-[#059669] px-6 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-emerald-950/10 transition-all hover:bg-[#047857] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>{t.demo.form.submittingBtn}</span>
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        <span>{t.demo.form.submitBtn}</span>
                      </>
                    )}
                  </button>

                  <p className="text-center text-[11px] font-medium text-[#0B2F24]/55">
                    {t.demo.form.privacyNote}
                  </p>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
