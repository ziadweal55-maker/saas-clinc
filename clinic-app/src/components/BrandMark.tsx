import React from 'react';
import { BRAND } from '../config/brand';
import { useLanguage } from '../context/useLanguage';

interface BrandMarkProps {
  variant?: 'light' | 'dark';
  showSubtitle?: boolean;
}

export const BrandMark: React.FC<BrandMarkProps> = ({
  variant = 'light',
  showSubtitle = true,
}) => {
  const { isAr } = useLanguage();
  const isDark = variant === 'dark';

  const horizontalUrl = isDark
    ? BRAND.logoHorizontalDarkUrl
    : BRAND.logoHorizontalLightUrl;

  if (!isAr && horizontalUrl) {
    return (
      <div className="inline-flex items-center gap-2.5 select-none">
        <img
          src={horizontalUrl}
          alt={`${BRAND.wordmark} — ${BRAND.subtitleEn}`}
          className="h-10 sm:h-11 w-auto object-contain"
        />
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide ${
            isDark
              ? 'bg-emerald-500/20 text-emerald-300'
              : 'bg-[#ECFDF5] text-[#059669] ring-1 ring-[#D1FAE5]'
          }`}
        >
          {BRAND.versionBadge}
        </span>
      </div>
    );
  }

  const dotColor = isDark ? 'text-[#10B981]' : 'text-[#059669]';

  return (
    <div className="inline-flex items-center gap-3 select-none">
      <img
        src={BRAND.logoMarkUrl}
        alt={BRAND.wordmark}
        className="h-10 w-10 rounded-xl object-contain shrink-0"
      />

      <div className="flex flex-col leading-none">
        <div className="flex items-center gap-1.5">
          <span
            dir="ltr"
            className={`text-lg font-extrabold tracking-wide ${
              isDark ? 'text-white' : 'text-[#0B2F24]'
            }`}
          >
            P<span className={dotColor}>.</span>T<span className={dotColor}>.</span>A
          </span>
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide ${
              isDark
                ? 'bg-emerald-500/20 text-emerald-300'
                : 'bg-[#ECFDF5] text-[#059669] ring-1 ring-[#D1FAE5]'
            }`}
          >
            {BRAND.versionBadge}
          </span>
        </div>

        {showSubtitle && (
          <span
            className={`mt-1 text-[10px] font-bold ${
              isDark ? 'text-emerald-200/80' : 'text-[#059669]'
            }`}
          >
            {isAr ? BRAND.subtitleAr : BRAND.subtitleEn}
          </span>
        )}
      </div>
    </div>
  );
};
