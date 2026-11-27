// Original GhostOS branding: a ghost mascot ("Wisp") and a wordmark logo.
// Hand-authored SVG, no third-party assets.

import type { FC } from 'react';

/**
 * The GhostOS mascot — a friendly spectral wisp with a crescent-moon eye glint.
 * `float`/`pulse` enable the idle animations (callers gate these on reduced motion).
 */
export const GhostMascot: FC<{ className?: string; float?: boolean }> = ({ className, float }) => (
  <svg
    viewBox="0 0 120 120"
    className={`${float ? 'animate-float' : ''} ${className ?? ''}`}
    role="img"
    aria-label="GhostOS mascot"
  >
    <defs>
      <radialGradient id="wisp-body" cx="50%" cy="38%" r="68%">
        <stop offset="0%" stopColor="#f1edf8" />
        <stop offset="55%" stopColor="#cfc7df" />
        <stop offset="100%" stopColor="#8b5cf6" />
      </radialGradient>
      <linearGradient id="wisp-aura" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#6ef2a4" stopOpacity="0.55" />
        <stop offset="100%" stopColor="#4bb3a7" stopOpacity="0" />
      </linearGradient>
    </defs>
    {/* aura */}
    <ellipse cx="60" cy="64" rx="46" ry="50" fill="url(#wisp-aura)" />
    {/* body */}
    <path
      d="M24 58a36 36 0 0 1 72 0v44c0 3-3 5-6 3l-7-5-7 6c-2 1-4 1-6 0l-7-6-7 6c-2 1-4 1-6 0l-7-6-7 5c-3 2-6 0-6-3V58Z"
      fill="url(#wisp-body)"
      stroke="#271f45"
      strokeWidth="2"
      strokeLinejoin="round"
    />
    {/* eyes */}
    <circle cx="47" cy="56" r="6.5" fill="#0e0b16" />
    <circle cx="73" cy="56" r="6.5" fill="#0e0b16" />
    {/* crescent glints */}
    <circle cx="49" cy="53.5" r="2.2" fill="#6ef2a4" />
    <circle cx="75" cy="53.5" r="2.2" fill="#6ef2a4" />
    {/* blush */}
    <ellipse cx="40" cy="68" rx="5" ry="3" fill="#e8963a" opacity="0.35" />
    <ellipse cx="80" cy="68" rx="5" ry="3" fill="#e8963a" opacity="0.35" />
    {/* mouth */}
    <path d="M54 70c3 4 9 4 12 0" fill="none" stroke="#0e0b16" strokeWidth="2.2" strokeLinecap="round" />
  </svg>
);

/** The GhostOS wordmark: mascot glyph + gothic/pixel lettering. */
export const GhostLogo: FC<{ className?: string; showMascot?: boolean }> = ({
  className,
  showMascot = true,
}) => (
  <span className={`inline-flex items-center gap-2 ${className ?? ''}`}>
    {showMascot && <GhostMascot className="h-[1.2em] w-[1.2em]" />}
    <span className="font-gothic leading-none">
      <span className="text-spectral-500 drop-shadow-[0_0_8px_rgba(110,242,164,0.5)]">Ghost</span>
      <span className="text-amethyst-400">OS</span>
    </span>
  </span>
);
