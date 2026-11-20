import React, { useState } from 'react';
import { Globe, Menu, MessageCircle, X, ArrowUpRight } from 'lucide-react';
import { BrandMark } from './BrandMark';
import { useLanguage } from '../context/useLanguage';
import { getWhatsAppUrl } from '../config/brand';

export const Navbar: React.FC = () => {
  const { t, toggleLang } = useLanguage();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navLinks = [
    { href: '#ecosystem', label: t.nav.ecosystem },
    { href: '#features', label: t.nav.features },
    { href: '#workflow', label: t.nav.workflow },
    { href: '#plans', label: t.nav.plans },
  ];

  const whatsappUrl = getWhatsAppUrl(t.hero.whatsappMessage);

  return (
    <header className="sticky top-0 z-40 border-b border-[#D1FAE5]/80 bg-[#F4F7F6]/85 backdrop-blur-md">
      <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <a href="#top" className="focus:outline-none">
          <BrandMark variant="light" />
        </a>

        <nav className="hidden items-center gap-7 md:flex">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-semibold text-[#0B2F24]/80 transition-colors hover:text-[#059669]"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-2.5 md:flex">
          <button
            type="button"
            onClick={toggleLang}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-[#D1FAE5] bg-white px-3 py-2 text-xs font-bold text-[#0B2F24] transition-colors hover:border-[#059669]/40 hover:bg-[#ECFDF5]"
          >
            <Globe className="h-3.5 w-3.5 text-[#059669]" />
            <span>{t.nav.langSwitch}</span>
          </button>

          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#D1FAE5] bg-white px-3.5 py-2 text-xs font-bold text-[#0B2F24] transition-colors hover:border-[#059669]/40 hover:bg-[#ECFDF5]"
          >
            <MessageCircle className="h-3.5 w-3.5 text-[#059669]" />
            <span>{t.nav.whatsapp}</span>
          </a>

          <a
            href="#demo"
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#059669] px-4 py-2 text-xs font-bold text-white shadow-sm transition-all hover:bg-[#047857]"
          >
            <span>{t.nav.bookDemo}</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <button
            type="button"
            onClick={toggleLang}
            className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-[#D1FAE5] bg-white px-2.5 py-1.5 text-xs font-bold text-[#0B2F24]"
          >
            <Globe className="h-3.5 w-3.5 text-[#059669]" />
            <span>{t.nav.langSwitch}</span>
          </button>

          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-label="Toggle Menu"
            className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-[#D1FAE5] bg-white p-2 text-[#0B2F24]"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-[#D1FAE5] bg-white px-4 py-4 md:hidden">
          <div className="flex flex-col gap-3">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="rounded-lg px-3 py-2 text-sm font-semibold text-[#0B2F24] hover:bg-[#ECFDF5]"
              >
                {link.label}
              </a>
            ))}
            <div className="mt-2 grid grid-cols-2 gap-2.5 pt-2 border-t border-[#D1FAE5]">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#D1FAE5] bg-[#ECFDF5] px-3 py-2.5 text-xs font-bold text-[#0B2F24]"
              >
                <MessageCircle className="h-4 w-4 text-[#059669]" />
                <span>{t.nav.whatsapp}</span>
              </a>
              <a
                href="#demo"
                onClick={() => setMobileOpen(false)}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#059669] px-3 py-2.5 text-xs font-bold text-white"
              >
                <span>{t.nav.bookDemo}</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
