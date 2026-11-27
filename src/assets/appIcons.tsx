// Distinctive full-colour retro-gothic app icons for the desktop, Start menu
// and taskbar. Each is an original multi-colour SVG illustration on a framed
// stone plate — richer than a flat gradient tile. Rendered at a 48x48 viewBox.

import type { FC } from 'react';

type Props = { className?: string };

function Plate({
  children,
  from,
  to,
}: {
  children: React.ReactNode;
  from: string;
  to: string;
}) {
  return (
    <svg viewBox="0 0 48 48" className={className48()} aria-hidden="true" shapeRendering="geometricPrecision">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={from} />
          <stop offset="100%" stopColor={to} />
        </linearGradient>
      </defs>
      {/* beveled plate */}
      <rect x="2" y="2" width="44" height="44" rx="9" fill="url(#g)" />
      <rect x="2" y="2" width="44" height="44" rx="9" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" />
      <rect x="3.5" y="3.5" width="41" height="41" rx="8" fill="none" stroke="rgba(0,0,0,0.35)" strokeWidth="1" />
      {children}
    </svg>
  );
}
function className48(): string {
  return 'h-full w-full';
}

/** GraveNotes — glowing tombstone with quill scratch. */
export const NotesAppIcon: FC<Props> = ({ className }) => (
  <span className={className}>
    <Plate from="#7c4bd6" to="#2a1b4e">
      <path d="M15 34V21a9 9 0 0 1 18 0v13z" fill="#1a1230" stroke="#cdbdf2" strokeWidth="1.4" />
      <path d="M18 23h12M18 27h12M18 31h8" stroke="#8ff7bc" strokeWidth="1.6" strokeLinecap="round" />
      <rect x="13" y="34" width="22" height="3" rx="1.5" fill="#cdbdf2" />
      <path d="M31 16l5-5 2 2-5 5z" fill="#f4c66a" />
    </Plate>
  </span>
);

/** Tomb Explorer — a crypt doorway folder. */
export const ExplorerAppIcon: FC<Props> = ({ className }) => (
  <span className={className}>
    <Plate from="#3fae9d" to="#123b36">
      <path d="M9 17h11l3 3h16v16H9z" fill="#0e2d29" stroke="#7be7cf" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M20 36V26a4 4 0 0 1 8 0v10z" fill="#06211d" stroke="#6ef2a4" strokeWidth="1.2" />
      <circle cx="26" cy="31" r="1.3" fill="#f4c66a" />
    </Plate>
  </span>
);

/** Phantom Terminal — glowing CRT prompt. */
export const TerminalAppIcon: FC<Props> = ({ className }) => (
  <span className={className}>
    <Plate from="#1b2a22" to="#06120d">
      <rect x="9" y="11" width="30" height="26" rx="3" fill="#03130c" stroke="#39c178" strokeWidth="1.5" />
      <path d="M14 20l5 4-5 4" stroke="#6ef2a4" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M25 30h8" stroke="#6ef2a4" strokeWidth="2" strokeLinecap="round" />
      <rect x="9" y="11" width="30" height="5" rx="3" fill="#0a2a1c" />
    </Plate>
  </span>
);

/** Calculator — amber-keyed abacus. */
export const CalculatorAppIcon: FC<Props> = ({ className }) => (
  <span className={className}>
    <Plate from="#9a6ef0" to="#3a2466">
      <rect x="13" y="9" width="22" height="30" rx="3" fill="#1b1230" stroke="#cdbdf2" strokeWidth="1.3" />
      <rect x="16" y="12" width="16" height="6" rx="1" fill="#8ff7bc" />
      {[0, 1, 2].map((r) =>
        [0, 1, 2].map((c) => (
          <rect key={`${r}-${c}`} x={16 + c * 5.5} y={21 + r * 5.5} width="4" height="4" rx="1" fill={r === 2 && c === 2 ? '#f4c66a' : '#a784f8'} />
        )),
      )}
    </Plate>
  </span>
);

/** DeadWave — equalizer bars + waveform. */
export const MusicAppIcon: FC<Props> = ({ className }) => (
  <span className={className}>
    <Plate from="#4bb3a7" to="#2a1b4e">
      <path d="M6 24h4l3-9 4 18 4-24 4 20 3-5h10" fill="none" stroke="#6ef2a4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <g fill="#f4c66a">
        <rect x="13" y="30" width="3" height="8" rx="1" />
        <rect x="19" y="26" width="3" height="12" rx="1" />
        <rect x="25" y="28" width="3" height="10" rx="1" />
        <rect x="31" y="24" width="3" height="14" rx="1" />
      </g>
    </Plate>
  </span>
);

/** Spectral Viewer — framed mountain/moon picture. */
export const ImageAppIcon: FC<Props> = ({ className }) => (
  <span className={className}>
    <Plate from="#4bb3a7" to="#1b3b3a">
      <rect x="10" y="12" width="28" height="24" rx="2" fill="#07201d" stroke="#7be7cf" strokeWidth="1.4" />
      <circle cx="30" cy="19" r="3" fill="#f4c66a" />
      <path d="M11 34l8-9 5 5 6-7 7 11z" fill="#6ef2a4" opacity="0.85" />
    </Plate>
  </span>
);

/** Settings — gothic cog. */
export const SettingsAppIcon: FC<Props> = ({ className }) => (
  <span className={className}>
    <Plate from="#5b5570" to="#23212e">
      <path
        d="M24 10l2.6 3.4 4.1-1.1.7 4.2 4.2.7-1.1 4.1L41 28l-3.4 2.6 1.1 4.1-4.2.7-.7 4.2-4.1-1.1L24 46"
        fill="none"
      />
      <path
        d="M24 12l2 2.8 3.4-1 .6 3.5 3.5.6-1 3.4L38 26l-2.8 2 1 3.4-3.5.6-.6 3.5-3.4-1L24 40l-2-2.8-3.4 1-.6-3.5-3.5-.6 1-3.4L10 26l2.8-2-1-3.4 3.5-.6.6-3.5 3.4 1z"
        fill="#2b2838"
        stroke="#cfc7df"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <circle cx="24" cy="26" r="5" fill="#1a1824" stroke="#8ff7bc" strokeWidth="1.5" />
    </Plate>
  </span>
);

/** Spirit Assistant — the Wisp mascot. */
export const AssistantAppIcon: FC<Props> = ({ className }) => (
  <span className={className}>
    <Plate from="#8b5cf6" to="#2a1b4e">
      <path d="M15 27a9 9 0 0 1 18 0v12l-3-2-3 2-3-2-3 2-3-2-3 2z" fill="#eef0fb" stroke="#1a1230" strokeWidth="1.3" strokeLinejoin="round" />
      <circle cx="21" cy="26" r="2" fill="#1a1230" />
      <circle cx="27" cy="26" r="2" fill="#1a1230" />
      <circle cx="21.6" cy="25.4" r="0.6" fill="#6ef2a4" />
      <circle cx="27.6" cy="25.4" r="0.6" fill="#6ef2a4" />
    </Plate>
  </span>
);
