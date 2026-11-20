import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, ArrowLeft, CheckCircle2, MessageCircle, Sparkles } from 'lucide-react';
import { useLanguage } from '../context/useLanguage';
import { getWhatsAppUrl } from '../config/brand';
import type { MarketingMediaAsset } from '../config/cloudinary';
import { ProductShowcaseMockup } from './ProductShowcaseMockup';

interface HeroSectionProps {
  mediaAssets: Record<string, MarketingMediaAsset>;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ mediaAssets }) => {
  const { t, isAr } = useLanguage();
  const ArrowIcon = isAr ? ArrowLeft : ArrowRight;
  const whatsappUrl = getWhatsAppUrl(t.hero.whatsappMessage);

  return (
    <section
      id="top"
      className="relative overflow-hidden bg-[#F4F7F6] pb-16 pt-10 sm:pb-24 sm:pt-14"
    >
      {/* Editorial Clinic Background Photo + Light Mint Veil */}
      <img
        src="/photos/hero-clinic-bg.jpg"
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center opacity-30"
      />
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#F4F7F6]/88 via-[#F4F7F6]/82 to-[#F4F7F6]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -top-28 left-1/2 h-80 w-[44rem] -translate-x-1/2 rounded-full bg-emerald-400/15 blur-3xl"
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="mx-auto max-w-4xl text-center"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-[#D1FAE5] bg-white/95 px-4 py-1.5 text-xs font-bold text-[#059669] shadow-xs backdrop-blur-xs">
            <Sparkles className="h-3.5 w-3.5" />
            <span>{t.hero.releasePill}</span>
          </div>

          <h1 className="mt-6 text-3xl font-extrabold leading-[1.15] text-[#0B2F24] sm:text-5xl lg:text-[3.4rem]">
            {t.hero.headlineStart}
            <span className="text-[#059669]">{t.hero.headlineHighlight}</span>
            {t.hero.headlineEnd}
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-[#0B2F24]/80 sm:text-lg">
            {t.hero.subheadline}
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a
              href="#demo"
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#059669] px-7 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-emerald-900/15 transition-all hover:bg-[#047857] sm:w-auto"
            >
              <span>{t.hero.primaryCta}</span>
              <ArrowIcon className="h-4 w-4" />
            </a>

            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-[#D1FAE5] bg-white/95 px-7 py-3.5 text-sm font-bold text-[#0B2F24] backdrop-blur-xs transition-all hover:border-[#059669]/50 hover:bg-[#ECFDF5] sm:w-auto"
            >
              <MessageCircle className="h-4 w-4 text-[#059669]" />
              <span>{t.hero.secondaryCta}</span>
            </a>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-2.5">
            {t.hero.proofChips.map((chip) => (
              <div
                key={chip}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#D1FAE5] bg-white/95 px-3.5 py-1.5 text-xs font-semibold text-[#0B2F24]/85 backdrop-blur-xs"
              >
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-[#059669]" />
                <span>{chip}</span>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.12 }}
          className="mt-12"
        >
          <ProductShowcaseMockup mediaAssets={mediaAssets} />
        </motion.div>
      </div>
    </section>
  );
};
