import type { WallpaperId } from '../state/settingsStore';
import {
  WallpaperCastle,
  WallpaperGraveyard,
  WallpaperForest,
  WallpaperVoid,
} from '../assets/wallpapers';
import { rasterWallpaper } from '../assets/wallpaperAssets';

const SCENES: Record<WallpaperId, React.FC<{ className?: string }>> = {
  castle: WallpaperCastle,
  graveyard: WallpaperGraveyard,
  forest: WallpaperForest,
  void: WallpaperVoid,
};

/** Full-bleed wallpaper: a bundled raster image if provided, else the SVG scene. */
export function Wallpaper({ id }: { id: WallpaperId }) {
  const raster = rasterWallpaper(id);
  const Scene = SCENES[id] ?? WallpaperCastle;
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {raster ? (
        <img
          src={raster}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          style={{ imageRendering: 'pixelated' }}
        />
      ) : (
        <Scene />
      )}
      {/* subtle darkening so desktop icons/text stay legible over art */}
      <div className="absolute inset-0 bg-crypt-900/25" />
    </div>
  );
}

/** A small, real thumbnail of a wallpaper (raster if present, else SVG scene). */
export function WallpaperThumb({ id }: { id: WallpaperId }) {
  const raster = rasterWallpaper(id);
  const Scene = SCENES[id] ?? WallpaperCastle;
  return (
    <span className="relative block h-full w-full overflow-hidden rounded-[3px]">
      {raster ? (
        <img
          src={raster}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          style={{ imageRendering: 'pixelated' }}
        />
      ) : (
        <Scene className="!absolute" />
      )}
    </span>
  );
}
