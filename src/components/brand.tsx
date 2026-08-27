'use client';

import { BRAND } from '@/lib/brand';

// Vector rebuild of brand-kit/logo-horizontal.png — stays sharp at print DPI
// and keeps the document self-contained (no image asset to load).
export function NewDiamondLogo({ width = 246 }: { width?: number }) {
  return (
    <svg
      width={width}
      height={width * (104 / 400)}
      viewBox="0 0 400 104"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="New Diamond Corporation"
    >
      <circle cx="52" cy="52" r="46" stroke={BRAND.navy} strokeWidth="9" />
      <path
        d="M52 52 L52 6 M52 52 L95.8 37.8 M52 52 L79 89.2 M52 52 L25 89.2 M52 52 L8.3 37.8"
        stroke={BRAND.navy}
        strokeWidth="9"
      />
      <circle cx="52" cy="52" r="15" fill={BRAND.brass} />
      <text
        x="126" y="46" fontSize="30" fontWeight="800"
        letterSpacing="-0.5" fill={BRAND.navy}
      >
        NEW DIAMOND
      </text>
      <text
        x="126" y="76" fontSize="14" fontWeight="500"
        letterSpacing="4.4" fill={BRAND.grey}
      >
        CORPORATION
      </text>
    </svg>
  );
}

// The wheel mark alone, greyed — footer flourish.
export function NewDiamondMark({ size = 22 }: { size?: number }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 104 104"
      fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"
    >
      <circle cx="52" cy="52" r="44" stroke="#DCDCD6" strokeWidth="11" />
      <path
        d="M52 52 L52 8 M52 52 L94 38 M52 52 L78 88 M52 52 L26 88 M52 52 L10 38"
        stroke="#DCDCD6"
        strokeWidth="11"
      />
    </svg>
  );
}
