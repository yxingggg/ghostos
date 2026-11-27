import type { AppDefinition } from '../apps/registry';

const DEFAULT_ACCENT = { from: '#1d1733', to: '#8b5cf6', glyph: '#f1edf8' };

/**
 * Renders an app's original glyph on a distinctive gradient badge, giving the
 * desktop/start menu a colourful, premium look while reusing the hand-authored
 * SVG icons. Cosmetic only.
 */
export function AppIconTile({
  app,
  size = 'md',
}: {
  app: AppDefinition;
  size?: 'sm' | 'md';
}) {
  const accent = app.accent ?? DEFAULT_ACCENT;
  const Icon = app.Icon;
  const box = size === 'sm' ? 'h-7 w-7 text-lg' : 'h-11 w-11 text-2xl';
  return (
    <span
      aria-hidden="true"
      className={`grid shrink-0 place-items-center rounded-xl border border-white/10 shadow-bevel-out ${box}`}
      style={{
        background: `linear-gradient(145deg, ${accent.from}, ${accent.to})`,
        color: accent.glyph,
      }}
    >
      <Icon className="drop-shadow" />
    </span>
  );
}
