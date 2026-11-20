import React from 'react';
import { motion } from 'framer-motion';
import {
  Activity,
  Calculator,
  DollarSign,
  Timer,
  MessageSquare,
  Building2,
  ShieldCheck,
  Languages,
} from 'lucide-react';
import { useLanguage } from '../context/useLanguage';

const FEATURE_ICONS: Record<string, React.ReactNode> = {
  profiles: <Activity className="h-5 w-5 text-[#059669]" />,
  nutrition: <Calculator className="h-5 w-5 text-[#059669]" />,
  commissions: <DollarSign className="h-5 w-5 text-[#059669]" />,
  queue: <Timer className="h-5 w-5 text-[#059669]" />,
  whatsapp: <MessageSquare className="h-5 w-5 text-[#059669]" />,
  branches: <Building2 className="h-5 w-5 text-[#059669]" />,
  security: <ShieldCheck className="h-5 w-5 text-[#059669]" />,
  bilingual: <Languages className="h-5 w-5 text-[#059669]" />,
};

export const FeaturesGrid: React.FC = () => {
  const { t } = useLanguage();

  return (
    <section id="features" className="bg-[#F4F7F6] py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-block rounded-full bg-white px-3.5 py-1 text-xs font-extrabold uppercase tracking-wider text-[#059669] ring-1 ring-[#D1FAE5]">
            {t.features.eyebrow}
          </span>
          <h2 className="mt-4 text-3xl font-extrabold text-[#0B2F24] sm:text-4xl">
            {t.features.title}
          </h2>
          <p className="mt-3 text-base leading-relaxed text-[#0B2F24]/70">
            {t.features.subtitle}
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {t.features.cards.map((card, index) => (
            <motion.div
              key={card.id}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.12 }}
              transition={{ duration: 0.35, delay: index * 0.04 }}
              className="flex flex-col justify-between rounded-3xl border border-[#D1FAE5] bg-white p-6 transition-all hover:-translate-y-0.5 hover:border-[#059669]/40 hover:shadow-md"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#ECFDF5] ring-1 ring-[#D1FAE5]">
                    {FEATURE_ICONS[card.id]}
                  </div>
                  {card.badge && (
                    <span className="rounded-full bg-[#ECFDF5] px-2.5 py-0.5 text-[10px] font-extrabold text-[#059669] ring-1 ring-[#D1FAE5]">
                      {card.badge}
                    </span>
                  )}
                </div>

                <div className="mt-4 text-[11px] font-bold uppercase tracking-wider text-[#059669]">
                  {card.category}
                </div>
                <h3 className="mt-1 text-base font-extrabold text-[#0B2F24]">
                  {card.title}
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-[#0B2F24]/70 sm:text-sm">
                  {card.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
