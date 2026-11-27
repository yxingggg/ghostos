import type { WallpaperId } from '../state/settingsStore';
import {
  WallpaperCastle,
  WallpaperGraveyard,
  WallpaperForest,
  WallpaperVoid,
} from '../assets/wallpapers';

const SCENES: Record<WallpaperId, React.FC<{ className?: string }>> = {
  castle: WallpaperCastle,
  graveyard: WallpaperGraveyard,
  forest: WallpaperForest,
  void: WallpaperVoid,
};

/** Full-bleed rendered wallpaper scene for the given id. */
export function Wallpaper({ id }: { id: WallpaperId }) {
  const Scene = SCENES[id] ?? WallpaperCastle;
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <Scene />
      {/* subtle darkening so desktop icons/text stay legible over art */}
      <div className="absolute inset-0 bg-crypt-900/25" />
    </div>
  );
}

/** A small, real thumbnail of a wallpaper scene for the Settings picker. */
export function WallpaperThumb({ id }: { id: WallpaperId }) {
  const Scene = SCENES[id] ?? WallpaperCastle;
  return (
    <span className="relative block h-full w-full overflow-hidden rounded-[3px]">
      <Scene className="!absolute" />
    </span>
  );
}
