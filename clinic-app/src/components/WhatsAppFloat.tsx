import React from 'react';
import { MessageCircle } from 'lucide-react';
import { useLanguage } from '../context/useLanguage';
import { getWhatsAppUrl } from '../config/brand';

export const WhatsAppFloat: React.FC = () => {
  const { t, isAr } = useLanguage();
  const url = getWhatsAppUrl(t.whatsappFloat.prefill);

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={t.whatsappFloat.label}
      className={`fixed bottom-5 z-40 inline-flex items-center gap-2 rounded-full bg-[#059669] px-4 py-3 text-xs font-extrabold text-white shadow-xl shadow-emerald-950/25 ring-2 ring-white transition-transform hover:scale-105 hover:bg-[#047857] ${
        isAr ? 'left-5' : 'right-5'
      }`}
    >
      <MessageCircle className="h-4 w-4" />
      <span className="hidden sm:inline">{t.whatsappFloat.label}</span>
    </a>
  );
};
