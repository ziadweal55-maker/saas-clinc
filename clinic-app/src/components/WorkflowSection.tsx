import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Play } from 'lucide-react';
import { useLanguage } from '../context/useLanguage';
import {
  buildCloudinaryVideoPosterUrl,
  resolveMediaAssetUrl,
  type MarketingMediaAsset,
} from '../config/cloudinary';

interface WorkflowSectionProps {
  mediaAssets: Record<string, MarketingMediaAsset>;
}

export const WorkflowSection: React.FC<WorkflowSectionProps> = ({ mediaAssets }) => {
  const { t, isAr } = useLanguage();
  const ArrowIcon = isAr ? ArrowLeft : ArrowRight;

  const heroVideo = mediaAssets.hero_video;
  const heroVideoUrl = resolveMediaAssetUrl(heroVideo, { width: 1280 });
  const posterUrl = heroVideo?.cloudinary_public_id
    ? buildCloudinaryVideoPosterUrl(heroVideo.cloudinary_public_id)
    : undefined;

  return (
    <section
      id="workflow"
      className="relative overflow-hidden bg-[#071F18] py-20 text-white sm:py-24"
    >
      {/* Subtle Clinic Interior Architectural Background */}
      <img
        src="/photos/clinic-interior-workflow.jpg"
        alt=""
        aria-hidden="true"
        loading="lazy"
        className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center opacity-20"
      />
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#071F18]/92 via-[#071F18]/84 to-[#071F18]/95"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute right-0 top-0 h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl"
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-block rounded-full border border-emerald-400/25 bg-emerald-500/10 px-3.5 py-1 text-xs font-extrabold uppercase tracking-wider text-[#10B981]">
            {t.workflow.eyebrow}
          </span>
          <h2 className="mt-4 text-3xl font-extrabold text-white sm:text-4xl">
            {t.workflow.title}
          </h2>
          <p className="mt-3 text-base leading-relaxed text-emerald-100/80">
            {t.workflow.subtitle}
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
          {t.workflow.steps.map((step, index) => (
            <motion.div
              key={step.step}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.15 }}
              transition={{ duration: 0.35, delay: index * 0.06 }}
              className="rounded-3xl border border-emerald-500/25 bg-[#0B2F24]/80 p-6 backdrop-blur-xs"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-2xl font-extrabold text-[#10B981]">
                  {step.step}
                </span>
                <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-200">
                  {step.subtitle}
                </span>
              </div>
              <h3 className="mt-4 text-lg font-extrabold text-white">
                {step.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-emerald-100/75">
                {step.description}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Live Walkthrough Visual Card */}
        <div className="mt-12 overflow-hidden rounded-3xl border border-emerald-500/25 bg-[#0B2F24]/90 p-6 backdrop-blur-sm sm:p-8">
          <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-12">
            <div className="lg:col-span-6">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#059669]/25 px-3 py-1 text-xs font-bold text-[#A7F3D0]">
                <Play className="h-3.5 w-3.5 fill-current" />
                <span>{t.workflow.videoCard.badge}</span>
              </span>
              <h3 className="mt-4 text-2xl font-extrabold text-white sm:text-3xl">
                {t.workflow.videoCard.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-emerald-100/80 sm:text-base">
                {t.workflow.videoCard.description}
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-4">
                <a
                  href="#demo"
                  className="inline-flex items-center gap-2 rounded-2xl bg-[#10B981] px-6 py-3 text-sm font-extrabold text-[#071F18] transition-all hover:bg-[#34D399]"
                >
                  <span>{t.workflow.videoCard.cta}</span>
                  <ArrowIcon className="h-4 w-4" />
                </a>
                <span className="text-xs font-semibold text-emerald-200/80">
                  {t.workflow.videoCard.duration}
                </span>
              </div>
            </div>

            <div className="lg:col-span-6">
              {heroVideoUrl ? (
                heroVideo?.media_type === 'video' ? (
                  <video
                    controls
                    playsInline
                    preload="metadata"
                    poster={posterUrl}
                    src={heroVideoUrl}
                    className="aspect-video w-full rounded-2xl border border-emerald-400/25 bg-black object-cover"
                  />
                ) : (
                  <img
                    src={heroVideoUrl}
                    alt={
                      (isAr ? heroVideo?.alt_ar : heroVideo?.alt_en) ||
                      t.workflow.videoCard.title
                    }
                    className="aspect-video w-full rounded-2xl border border-emerald-400/25 object-cover"
                    loading="lazy"
                  />
                )
              ) : (
                <a
                  href="#demo"
                  className="group relative block aspect-video w-full overflow-hidden rounded-2xl border border-emerald-500/30 transition-all hover:border-emerald-400/70"
                >
                  <img
                    src="/photos/doctor-care.jpg"
                    alt={t.workflow.videoCard.title}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#071F18]/85 via-[#071F18]/35 to-transparent" />
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
                    <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#10B981] text-[#071F18] shadow-xl ring-4 ring-white/20 transition-transform group-hover:scale-110">
                      <Play className="h-7 w-7 fill-current ms-0.5" />
                    </span>
                    <span className="mt-4 rounded-full bg-[#071F18]/80 px-4 py-1.5 text-xs font-extrabold text-white backdrop-blur-xs ring-1 ring-white/15">
                      {t.workflow.videoCard.previewActionLabel}
                    </span>
                  </div>
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
