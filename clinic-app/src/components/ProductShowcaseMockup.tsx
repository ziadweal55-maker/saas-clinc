import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  Bot,
  CheckCircle2,
  Clock,
  CreditCard,
  QrCode,
  Smartphone,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { useLanguage } from '../context/useLanguage';
import {
  resolveMediaAssetUrl,
  type MarketingMediaAsset,
} from '../config/cloudinary';

interface ProductShowcaseMockupProps {
  mediaAssets: Record<string, MarketingMediaAsset>;
}

type TabId = 'command' | 'clinical' | 'portal' | 'finance';

const TAB_SLOT_MAP: Record<TabId, string> = {
  command: 'desktop_command',
  clinical: 'ai_copilot',
  portal: 'patient_portal',
  finance: 'financial_hub',
};

export const ProductShowcaseMockup: React.FC<ProductShowcaseMockupProps> = ({
  mediaAssets,
}) => {
  const { t, isAr } = useLanguage();
  const [activeTab, setActiveTab] = useState<TabId>('command');
  const [rangeIndex, setRangeIndex] = useState<number>(0);

  const currentTabMeta =
    t.showcase.tabs.find((tab) => tab.id === activeTab) ?? t.showcase.tabs[0];

  const mappedAsset =
    mediaAssets[TAB_SLOT_MAP[activeTab]] ||
    (activeTab === 'command' ? mediaAssets.hero_showcase : undefined);
  const customImageUrl =
    mappedAsset && mappedAsset.media_type === 'image'
      ? resolveMediaAssetUrl(mappedAsset, { width: 1400 })
      : null;

  return (
    <div className="relative overflow-hidden rounded-3xl border border-[#D1FAE5] bg-white shadow-[0_24px_70px_-24px_rgba(11,47,36,0.18)]">
      {/* Top Browser/App Window Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#D1FAE5] bg-[#ECFDF5]/65 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5" aria-hidden="true">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-200" />
          </div>
          <span className="text-xs font-bold text-[#0B2F24]/75">
            {t.showcase.windowSubtitle}
          </span>
        </div>

        <div className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-[#059669] ring-1 ring-[#D1FAE5]">
          <span className="h-2 w-2 rounded-full bg-[#10B981] animate-pulse" />
          <span>{t.showcase.liveIndicator}</span>
        </div>
      </div>

      {/* Interactive Module Switcher Tabs */}
      <div className="border-b border-[#D1FAE5] bg-white px-4 py-3 sm:px-6">
        <div className="flex flex-wrap gap-2">
          {t.showcase.tabs.map((tab) => {
            const isSelected = tab.id === activeTab;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex cursor-pointer items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${
                  isSelected
                    ? 'bg-[#059669] text-white shadow-sm'
                    : 'bg-[#F4F7F6] text-[#0B2F24]/75 hover:bg-[#ECFDF5] hover:text-[#059669]'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`hidden rounded-md px-1.5 py-0.5 text-[10px] sm:inline-block ${
                    isSelected
                      ? 'bg-white/20 text-white'
                      : 'bg-white text-[#059669]'
                  }`}
                >
                  {tab.badge}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Preview Stage */}
      <div className="p-4 sm:p-6 bg-[#F4F7F6]/60">
        <div className="mb-4 flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
          <div>
            <h3 className="text-base font-extrabold text-[#0B2F24] sm:text-lg">
              {currentTabMeta.headline}
            </h3>
            <p className="mt-0.5 text-xs leading-relaxed text-[#0B2F24]/70 sm:text-sm">
              {currentTabMeta.caption}
            </p>
          </div>
        </div>

        {customImageUrl ? (
          <div className="overflow-hidden rounded-2xl border border-[#D1FAE5] bg-white">
            <img
              src={customImageUrl}
              alt={
                (isAr ? mappedAsset?.alt_ar : mappedAsset?.alt_en) ||
                currentTabMeta.headline
              }
              className="h-auto w-full object-cover"
              loading="lazy"
            />
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.22 }}
              className="rounded-2xl border border-[#D1FAE5] bg-white p-4 sm:p-5"
            >
              {activeTab === 'command' && (
                <div className="space-y-4">
                  {/* Today / 7D / 30D Toggle + Live Timer */}
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="inline-flex rounded-xl bg-[#F4F7F6] p-1 ring-1 ring-[#D1FAE5]">
                      {t.showcase.command.rangeLabels.map((label, idx) => (
                        <button
                          key={label}
                          type="button"
                          onClick={() => setRangeIndex(idx)}
                          className={`cursor-pointer rounded-lg px-3 py-1 text-xs font-bold transition-all ${
                            rangeIndex === idx
                              ? 'bg-[#059669] text-white shadow-xs'
                              : 'text-[#0B2F24]/70 hover:text-[#0B2F24]'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>

                    <div className="inline-flex items-center gap-2 rounded-xl bg-[#ECFDF5] px-3 py-1.5 text-xs font-bold text-[#059669] ring-1 ring-[#D1FAE5]">
                      <Clock className="h-3.5 w-3.5" />
                      <span>{t.showcase.command.timerLabel}:</span>
                      <span className="font-mono tabular-nums text-[#0B2F24]">
                        {t.showcase.command.timerValue}
                      </span>
                    </div>
                  </div>

                  {/* KPI Row */}
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    {t.showcase.command.kpis.map((kpi) => (
                      <div
                        key={kpi.label}
                        className="rounded-2xl border border-[#D1FAE5] bg-[#F4F7F6]/70 p-3.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-semibold text-[#0B2F24]/65">
                            {kpi.label}
                          </span>
                          <span className="rounded-full bg-[#ECFDF5] px-2 py-0.5 text-[10px] font-bold text-[#059669]">
                            {kpi.delta}
                          </span>
                        </div>
                        <div className="mt-2 text-xl font-extrabold tabular-nums text-[#0B2F24]">
                          {kpi.values[rangeIndex] ?? kpi.values[0]}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Fast Desk Queue */}
                  <div className="rounded-2xl border border-[#D1FAE5] bg-[#F4F7F6]/45 p-3.5">
                    <div className="mb-2.5 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-extrabold text-[#0B2F24]">
                        <Activity className="h-4 w-4 text-[#059669]" />
                        <span>{t.showcase.command.queueTitle}</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {t.showcase.command.queuePatients.map((patient) => (
                        <div
                          key={patient.name}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white px-3.5 py-2.5 ring-1 ring-[#D1FAE5]/80"
                        >
                          <div>
                            <div className="text-xs font-bold text-[#0B2F24]">
                              {patient.name}
                            </div>
                            <div className="text-[11px] text-[#0B2F24]/65">
                              {patient.therapy}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="rounded-lg bg-[#ECFDF5] px-2.5 py-1 text-[11px] font-bold text-[#059669]">
                              {patient.status}
                            </span>
                            <span className="font-mono text-[11px] font-bold tabular-nums text-[#0B2F24]/70">
                              {patient.duration}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'clinical' && (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
                  <div className="space-y-3 lg:col-span-3">
                    <div className="rounded-xl bg-[#ECFDF5] px-4 py-3 ring-1 ring-[#D1FAE5]">
                      <div className="text-sm font-extrabold text-[#0B2F24]">
                        {t.showcase.clinical.patientName}
                      </div>
                      <div className="mt-0.5 text-xs font-medium text-[#059669]">
                        {t.showcase.clinical.patientMeta}
                      </div>
                    </div>

                    {t.showcase.clinical.sections.map((section) => (
                      <div
                        key={section.title}
                        className="flex items-start justify-between gap-3 rounded-xl border border-[#D1FAE5] bg-[#F4F7F6]/60 p-3.5"
                      >
                        <div>
                          <div className="text-xs font-extrabold text-[#0B2F24]">
                            {section.title}
                          </div>
                          <div className="mt-1 text-[11px] text-[#0B2F24]/70">
                            {section.summary}
                          </div>
                        </div>
                        <span className="shrink-0 rounded-lg bg-white px-2.5 py-1 text-[11px] font-bold text-[#059669] ring-1 ring-[#D1FAE5]">
                          {section.metric}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Smart Clinical Assistant Drawer */}
                  <div className="flex flex-col justify-between rounded-2xl bg-[#071F18] p-4 text-white lg:col-span-2">
                    <div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs font-bold text-[#10B981]">
                          <Bot className="h-4 w-4" />
                          <span>{t.showcase.clinical.copilotTitle}</span>
                        </div>
                        <span className="rounded-md bg-white/10 px-2 py-0.5 text-[10px] font-bold text-emerald-200">
                          {t.showcase.clinical.copilotShortcut}
                        </span>
                      </div>

                      <div className="mt-3 rounded-xl bg-white/10 p-3 text-xs leading-relaxed text-emerald-50">
                        {t.showcase.clinical.copilotPrompt}
                      </div>

                      <div className="mt-3 rounded-xl border border-emerald-500/30 bg-[#059669]/20 p-3 text-xs leading-relaxed text-emerald-100">
                        <div className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#10B981]">
                          <Sparkles className="h-3 w-3" />
                          <span>{t.showcase.clinical.copilotBadge}</span>
                        </div>
                        {t.showcase.clinical.copilotReply}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'portal' && (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
                  {/* Cloudinary Promo Ad Banner */}
                  <div className="flex flex-col justify-between rounded-2xl bg-gradient-to-br from-[#071F18] via-[#0B2F24] to-[#059669] p-5 text-white lg:col-span-2">
                    <div>
                      <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-bold text-emerald-200">
                        <QrCode className="h-3 w-3" />
                        <span>{t.showcase.portal.bannerTag}</span>
                      </div>
                      <h4 className="mt-4 text-base font-extrabold">
                        {t.showcase.portal.bannerTitle}
                      </h4>
                      <p className="mt-1.5 text-xs leading-relaxed text-emerald-100/85">
                        {t.showcase.portal.bannerSubtitle}
                      </p>
                    </div>

                    <div className="mt-5 flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-[11px] font-semibold text-emerald-100">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-[#10B981]" />
                      <span>{t.showcase.portal.clinicName}</span>
                    </div>
                  </div>

                  {/* Multi-Screen Patient Cards */}
                  <div className="space-y-2.5 lg:col-span-3">
                    {t.showcase.portal.screens.map((screen) => (
                      <div
                        key={screen.title}
                        className="flex items-center justify-between gap-3 rounded-xl border border-[#D1FAE5] bg-[#F4F7F6]/70 px-4 py-3"
                      >
                        <div>
                          <div className="text-xs font-extrabold text-[#0B2F24]">
                            {screen.title}
                          </div>
                          <div className="mt-0.5 text-[11px] text-[#0B2F24]/70">
                            {screen.detail}
                          </div>
                        </div>
                        <span className="h-2 w-2 shrink-0 rounded-full bg-[#059669]" />
                      </div>
                    ))}

                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[#ECFDF5] px-4 py-3 ring-1 ring-[#D1FAE5]">
                      <span className="text-xs font-bold text-[#059669]">
                        {t.showcase.portal.checkinLabel}
                      </span>
                      <span className="text-xs font-extrabold text-[#0B2F24]">
                        {t.showcase.portal.checkinScore}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'finance' && (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
                  <div className="space-y-3 lg:col-span-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-xl border border-[#D1FAE5] bg-[#F4F7F6]/80 p-3.5">
                        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#0B2F24]/65">
                          <TrendingUp className="h-3.5 w-3.5 text-[#059669]" />
                          <span>{t.showcase.finance.revenueLabel}</span>
                        </div>
                        <div className="mt-1.5 text-lg font-extrabold tabular-nums text-[#0B2F24]">
                          {t.showcase.finance.revenueValue}
                        </div>
                      </div>
                      <div className="rounded-xl border border-[#A7F3D0] bg-[#ECFDF5] p-3.5">
                        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#059669]">
                          <CreditCard className="h-3.5 w-3.5" />
                          <span>{t.showcase.finance.netProfitLabel}</span>
                        </div>
                        <div className="mt-1.5 text-lg font-extrabold tabular-nums text-[#0B2F24]">
                          {t.showcase.finance.netProfitValue}
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl border border-[#D1FAE5] bg-[#F4F7F6]/60 p-3.5">
                      <div className="mb-2 text-xs font-extrabold text-[#0B2F24]">
                        {t.showcase.finance.payrollTitle}
                      </div>
                      <div className="space-y-2">
                        {t.showcase.finance.doctors.map((doc) => (
                          <div
                            key={doc.name}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white px-3 py-2 ring-1 ring-[#D1FAE5]/70"
                          >
                            <div>
                              <div className="text-xs font-bold text-[#0B2F24]">
                                {doc.name}
                              </div>
                              <div className="text-[11px] text-[#0B2F24]/65">
                                {doc.sessions} • {doc.loanNote}
                              </div>
                            </div>
                            <span className="text-xs font-extrabold tabular-nums text-[#059669]">
                              {doc.commission}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Owner Mobile Companion Card */}
                  <div className="flex flex-col justify-between rounded-2xl bg-[#071F18] p-4 text-white lg:col-span-2">
                    <div>
                      <div className="flex items-center gap-2 text-xs font-bold text-[#10B981]">
                        <Smartphone className="h-4 w-4" />
                        <span>{t.showcase.finance.mobileCompanionTitle}</span>
                      </div>
                      <div className="mt-3 rounded-xl bg-white/10 p-3 text-xs italic text-emerald-50">
                        {t.showcase.finance.mobilePrompt}
                      </div>
                      <div className="mt-3 rounded-xl border border-emerald-500/30 bg-[#059669]/20 p-3 text-xs leading-relaxed text-emerald-100">
                        {t.showcase.finance.mobileReply}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
};
