// Original pixel-inspired gothic icon set for GhostOS.
// All icons are hand-authored SVG — no third-party icon packs.
// They share a 24x24 viewBox and inherit color via currentColor.

import type { FC } from 'react';

type IconProps = { className?: string };

const base = 'inline-block';

function Svg({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`${base} ${className ?? ''}`}
      width="1em"
      height="1em"
      fill="none"
      shapeRendering="crispEdges"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

/** GraveNotes — a tombstone with lines of text. */
export const NotesIcon: FC<IconProps> = ({ className }) => (
  <Svg className={className}>
    <path
      d="M6 10a6 6 0 0 1 12 0v10H6V10Z"
      fill="currentColor"
      opacity="0.18"
    />
    <path
      d="M6 10a6 6 0 0 1 12 0v10H6V10Z"
      stroke="currentColor"
      strokeWidth="1.4"
    />
    <path d="M9 12h6M9 15h6M9 18h3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    <path d="M8 20h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </Svg>
);

/** Tomb Explorer — a stone folder / crypt door. */
export const ExplorerIcon: FC<IconProps> = ({ className }) => (
  <Svg className={className}>
    <path d="M3 7h6l2 2h10v10H3V7Z" fill="currentColor" opacity="0.18" />
    <path d="M3 7h6l2 2h10v10H3V7Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    <path d="M11 11a1 1 0 0 1 2 0v6h-2v-6Z" fill="currentColor" opacity="0.5" />
  </Svg>
);

/** Phantom Terminal — a glowing prompt. */
export const TerminalIcon: FC<IconProps> = ({ className }) => (
  <Svg className={className}>
    <rect x="3" y="4" width="18" height="16" rx="1.5" fill="currentColor" opacity="0.14" />
    <rect x="3" y="4" width="18" height="16" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
    <path d="M6 9l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M12 15h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </Svg>
);

/** Calculator — abacus-like grid. */
export const CalculatorIcon: FC<IconProps> = ({ className }) => (
  <Svg className={className}>
    <rect x="5" y="3" width="14" height="18" rx="1.5" fill="currentColor" opacity="0.14" />
    <rect x="5" y="3" width="14" height="18" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
    <rect x="7.5" y="5.5" width="9" height="3" fill="currentColor" opacity="0.5" />
    <circle cx="9" cy="12" r="1" fill="currentColor" />
    <circle cx="12" cy="12" r="1" fill="currentColor" />
    <circle cx="15" cy="12" r="1" fill="currentColor" />
    <circle cx="9" cy="15.5" r="1" fill="currentColor" />
    <circle cx="12" cy="15.5" r="1" fill="currentColor" />
    <circle cx="15" cy="15.5" r="1" fill="currentColor" />
    <circle cx="9" cy="18.5" r="1" fill="currentColor" />
    <circle cx="12" cy="18.5" r="1" fill="currentColor" />
  </Svg>
);

/** DeadWave — a waveform skull. */
export const MusicIcon: FC<IconProps> = ({ className }) => (
  <Svg className={className}>
    <path
      d="M2 12h3l2-5 3 10 3-13 3 11 2-3h4"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

/** Settings — a gothic cog. */
export const SettingsIcon: FC<IconProps> = ({ className }) => (
  <Svg className={className}>
    <path
      d="M12 3l1.6 2.1 2.5-.7.4 2.6 2.6.4-.7 2.5L20 12l-2.1 1.6.7 2.5-2.6.4-.4 2.6-2.5-.7L12 21l-1.6-2.1-2.5.7-.4-2.6-2.6-.4.7-2.5L3 12l2.1-1.6-.7-2.5 2.6-.4.4-2.6 2.5.7L12 3Z"
      fill="currentColor"
      opacity="0.16"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinejoin="round"
    />
    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.4" />
  </Svg>
);

/** Assistant — a hovering ghost orb. */
export const AssistantIcon: FC<IconProps> = ({ className }) => (
  <Svg className={className}>
    <path
      d="M6 11a6 6 0 0 1 12 0v8l-2-1.5L14 19l-2-1.5L10 19l-2-1.5L6 19v-8Z"
      fill="currentColor"
      opacity="0.16"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinejoin="round"
    />
    <circle cx="9.5" cy="11" r="1.1" fill="currentColor" />
    <circle cx="14.5" cy="11" r="1.1" fill="currentColor" />
  </Svg>
);

/** Start button glyph — a pentacle-free gothic sigil (a stylized ghost moon). */
export const GhostSigil: FC<IconProps> = ({ className }) => (
  <Svg className={className}>
    <path
      d="M12 3a9 9 0 1 0 6 15.7 7 7 0 0 1-6-11.2A9 9 0 0 0 12 3Z"
      fill="currentColor"
    />
  </Svg>
);

/** Generic file icon. */
export const FileIcon: FC<IconProps> = ({ className }) => (
  <Svg className={className}>
    <path d="M7 3h7l4 4v14H7V3Z" fill="currentColor" opacity="0.14" />
    <path d="M7 3h7l4 4v14H7V3Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    <path d="M14 3v4h4" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
  </Svg>
);

/** Generic folder icon. */
export const FolderIcon: FC<IconProps> = ({ className }) => (
  <Svg className={className}>
    <path d="M3 6h6l2 2h10v11H3V6Z" fill="currentColor" opacity="0.16" />
    <path d="M3 6h6l2 2h10v11H3V6Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
  </Svg>
);
