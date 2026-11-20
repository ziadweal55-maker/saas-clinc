import React from 'react';
import { motion } from 'framer-motion';
import { Monitor, QrCode, Smartphone, Bot, Check, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '../context/useLanguage';

const PILLAR_ICONS: Record<string, React.ReactNode> = {
  desktop: <Monitor className="h-6 w-6 text-[#059669]" />,
  portal: <QrCode className="h-6 w-6 text-[#059669]" />,
  mobile: <Smartphone className="h-6 w-6 text-[#059669]" />,
  ai: <Bot className="h-6 w-6 text-[#059669]" />,
};

export const EcosystemSection: React.FC = () => {
  const { t, isAr } = useLanguage();

  return (
    <section id="ecosystem" className="bg-white py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-block rounded-full bg-[#ECFDF5] px-3.5 py-1 text-xs font-extrabold uppercase tracking-wider text-[#059669] ring-1 ring-[#D1FAE5]">
            {t.ecosystem.eyebrow}
          </span>
          <h2 className="mt-4 text-3xl font-extrabold text-[#0B2F24] sm:text-4xl">
            {t.ecosystem.title}
          </h2>
          <p className="mt-3 text-base leading-relaxed text-[#0B2F24]/70">
            {t.ecosystem.subtitle}
          </p>
        </div>

        {/* Editorial Clinic Care Photo Banner */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.45 }}
          className="relative mt-10 overflow-hidden rounded-3xl border border-[#D1FAE5] bg-[#071F18] shadow-lg shadow-emerald-950/10"
        >
          <img
            src="/photos/doctor-care.jpg"
            alt={t.ecosystem.banner.headline}
            loading="lazy"
            className="h-64 w-full object-cover object-center sm:h-72 lg:h-80"
          />
          <div
            className={`absolute inset-0 ${
              isAr
                ? 'bg-gradient-to-l from-[#071F18]/90 via-[#071F18]/65 to-[#071F18]/20'
                : 'bg-gradient-to-r from-[#071F18]/90 via-[#071F18]/65 to-[#071F18]/20'
            }`}
            aria-hidden="true"
          />
          <div className="absolute inset-0 flex flex-col justify-end p-6 sm:justify-center sm:p-10">
            <div className="max-w-xl">
              <span className="inline-block rounded-full bg-[#10B981]/20 px-3 py-1 text-[11px] font-bold text-[#A7F3D0] backdrop-blur-xs">
                {t.ecosystem.banner.eyebrow}
              </span>
              <h3 className="mt-3 text-xl font-extrabold leading-snug text-white sm:text-2xl lg:text-3xl">
                {t.ecosystem.banner.headline}
              </h3>
              <div className="mt-5 flex flex-wrap gap-2.5">
                {t.ecosystem.banner.stats.map((stat) => (
                  <div
                    key={stat}
                    className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3.5 py-1.5 text-xs font-bold text-white backdrop-blur-md ring-1 ring-white/20"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-[#10B981]" />
                    <span>{stat}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {t.ecosystem.pillars.map((pillar, index) => (
            <motion.div
              key={pillar.id}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.15 }}
              transition={{ duration: 0.4, delay: index * 0.06 }}
              className="flex flex-col justify-between rounded-3xl border border-[#D1FAE5] bg-[#F4F7F6]/55 p-6 transition-all hover:border-[#059669]/40 hover:bg-white hover:shadow-lg hover:shadow-emerald-950/5"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#ECFDF5] ring-1 ring-[#D1FAE5]">
                    {PILLAR_ICONS[pillar.id]}
                  </div>
                  <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-[#059669] ring-1 ring-[#D1FAE5]">
                    {pillar.tag}
                  </span>
                </div>

                <h3 className="mt-5 text-lg font-extrabold text-[#0B2F24]">
                  {pillar.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[#0B2F24]/70">
                  {pillar.description}
                </p>
              </div>

              <ul className="mt-6 space-y-2 border-t border-[#D1FAE5]/80 pt-4">
                {pillar.highlights.map((item) => (
                  <li
                    key={item}
                    className="flex items-center gap-2 text-xs font-bold text-[#0B2F24]/85"
                  >
                    <Check className="h-3.5 w-3.5 shrink-0 text-[#059669]" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
