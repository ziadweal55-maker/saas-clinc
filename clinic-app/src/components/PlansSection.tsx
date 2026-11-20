import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '../context/useLanguage';

interface PlansSectionProps {
  onSelectPlan: (planName: string) => void;
}

export const PlansSection: React.FC<PlansSectionProps> = ({ onSelectPlan }) => {
  const { t, isAr } = useLanguage();
  const ArrowIcon = isAr ? ArrowLeft : ArrowRight;

  const handleChoose = (planName: string) => {
    onSelectPlan(planName);
    const el = document.getElementById('demo');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section id="plans" className="bg-white py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-block rounded-full bg-[#ECFDF5] px-3.5 py-1 text-xs font-extrabold uppercase tracking-wider text-[#059669] ring-1 ring-[#D1FAE5]">
            {t.plans.eyebrow}
          </span>
          <h2 className="mt-4 text-3xl font-extrabold text-[#0B2F24] sm:text-4xl">
            {t.plans.title}
          </h2>
          <p className="mt-3 text-base leading-relaxed text-[#0B2F24]/70">
            {t.plans.subtitle}
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {t.plans.tiers.map((tier, index) => {
            const isPopular = Boolean(tier.popular);
            return (
              <motion.div
                key={tier.id}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.15 }}
                transition={{ duration: 0.4, delay: index * 0.06 }}
                className={`relative flex flex-col justify-between rounded-3xl p-7 transition-all ${
                  isPopular
                    ? 'border-2 border-[#059669] bg-[#ECFDF5]/60 shadow-xl shadow-emerald-950/10'
                    : 'border border-[#D1FAE5] bg-[#F4F7F6]/55'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-xl font-extrabold text-[#0B2F24]">
                      {tier.name}
                    </h3>
                    {isPopular && (
                      <span className="rounded-full bg-[#059669] px-3 py-1 text-[11px] font-extrabold text-white">
                        {t.plans.popularBadge}
                      </span>
                    )}
                  </div>

                  <p className="mt-2 text-sm text-[#0B2F24]/70">{tier.tagline}</p>

                  <div className="mt-4 inline-block rounded-xl bg-white px-3 py-1.5 text-xs font-extrabold text-[#059669] ring-1 ring-[#D1FAE5]">
                    {tier.idealFor}
                  </div>

                  <ul className="mt-6 space-y-3 border-t border-[#D1FAE5] pt-6">
                    {tier.highlights.map((item) => (
                      <li
                        key={item}
                        className="flex items-start gap-2.5 text-sm font-medium text-[#0B2F24]/85"
                      >
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#059669]" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  type="button"
                  onClick={() => handleChoose(tier.name)}
                  className={`mt-8 inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl px-5 py-3.5 text-sm font-extrabold transition-all ${
                    isPopular
                      ? 'bg-[#059669] text-white hover:bg-[#047857]'
                      : 'border border-[#D1FAE5] bg-white text-[#0B2F24] hover:border-[#059669] hover:bg-[#ECFDF5]'
                  }`}
                >
                  <span>{tier.ctaLabel}</span>
                  <ArrowIcon className="h-4 w-4" />
                </button>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
