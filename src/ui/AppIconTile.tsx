import type { AppDefinition } from '../apps/registry';

const DEFAULT_ACCENT = { from: '#1d1733', to: '#8b5cf6', glyph: '#f1edf8' };

/**
 * Renders an app's icon as a distinctive tile. If the app provides an
 * illustrated full-colour `TileIcon`, it is used directly; otherwise the
 * monochrome glyph is placed on an accent-gradient plate as a fallback.
 */
export function AppIconTile({
  app,
  size = 'md',
}: {
  app: AppDefinition;
  size?: 'sm' | 'desktop' | 'md';
}) {
  const box = size === 'sm' ? 'h-7 w-7' : size === 'desktop' ? 'h-9 w-9' : 'h-11 w-11';

  if (app.TileIcon) {
    const Tile = app.TileIcon;
    return <Tile className={`${box} drop-shadow`} />;
  }

  const accent = app.accent ?? DEFAULT_ACCENT;
  const Icon = app.Icon;
  return (
    <span
      aria-hidden="true"
      className={`grid shrink-0 place-items-center rounded-xl border border-white/10 shadow-bevel-out ${box} ${size === 'sm' ? 'text-lg' : size === 'desktop' ? 'text-xl' : 'text-2xl'}`}
      style={{
        background: `linear-gradient(145deg, ${accent.from}, ${accent.to})`,
        color: accent.glyph,
      }}
    >
      <Icon className="drop-shadow" />
    </span>
  );
}
