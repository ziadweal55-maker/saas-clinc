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
      <div className="inline-flex items-center select-none">
        <img
          src={horizontalUrl}
          alt={`${BRAND.wordmark} — ${BRAND.subtitleEn}`}
          className="h-10 sm:h-11 w-auto object-contain"
        />
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
        <span
          dir="ltr"
          className={`text-lg font-extrabold tracking-wide ${
            isDark ? 'text-white' : 'text-[#0B2F24]'
          }`}
        >
          P<span className={dotColor}>.</span>T<span className={dotColor}>.</span>A
        </span>

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
