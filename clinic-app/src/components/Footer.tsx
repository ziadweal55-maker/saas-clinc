import React from 'react';
import { BrandMark } from './BrandMark';
import { useLanguage } from '../context/useLanguage';
import { BRAND, getWhatsAppUrl } from '../config/brand';

export const Footer: React.FC = () => {
  const { t, isAr } = useLanguage();
  const whatsappUrl = getWhatsAppUrl(t.hero.whatsappMessage);

  return (
    <footer className="border-t border-emerald-500/20 bg-[#071F18] py-12 text-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-12">
          <div className="space-y-4 md:col-span-5">
            <BrandMark variant="dark" />
            <p className="max-w-sm text-sm leading-relaxed text-emerald-100/70">
              {t.footer.tagline}
            </p>
          </div>

          <div className="md:col-span-3">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#10B981]">
              {t.footer.linksTitle}
            </h4>
            <ul className="mt-4 space-y-2.5 text-sm font-medium text-emerald-100/80">
              <li>
                <a href="#ecosystem" className="hover:text-white">
                  {t.nav.ecosystem}
                </a>
              </li>
              <li>
                <a href="#features" className="hover:text-white">
                  {t.nav.features}
                </a>
              </li>
              <li>
                <a href="#workflow" className="hover:text-white">
                  {t.nav.workflow}
                </a>
              </li>
              <li>
                <a href="#plans" className="hover:text-white">
                  {t.nav.plans}
                </a>
              </li>
              <li>
                <a href="#demo" className="hover:text-white">
                  {t.nav.bookDemo}
                </a>
              </li>
            </ul>
          </div>

          <div className="md:col-span-4">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#10B981]">
              {t.footer.contactTitle}
            </h4>
            <ul className="mt-4 space-y-2.5 text-sm text-emerald-100/80">
              <li>
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white"
                >
                  {t.demo.directWhatsappLabel}:{' '}
                  <span dir="ltr" className="font-bold text-white">
                    {BRAND.whatsappDisplay}
                  </span>
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${BRAND.supportEmail}`}
                  className="hover:text-white"
                >
                  <span dir="ltr">{BRAND.supportEmail}</span>
                </a>
              </li>
              <li>
                <span className="text-emerald-200/60">
                  {t.footer.domainLabel}:{' '}
                </span>
                <span dir="ltr" className="font-semibold text-white">
                  www.clinicmanger-pt.com
                </span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-emerald-500/15 pt-6 text-xs text-emerald-200/60 sm:flex-row">
          <span>
            © {new Date().getFullYear()} {isAr ? BRAND.nameAr : BRAND.nameEn}.{' '}
            {t.footer.copyright}
          </span>
          <span dir="ltr">clinicmanger-pt.com</span>
        </div>
      </div>
    </footer>
  );
};
