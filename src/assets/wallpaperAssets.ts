// Optional high-quality raster wallpaper assets.
//
// Drop original PNG/WebP artwork into src/assets/wallpapers/ named by wallpaper
// id (e.g. castle.webp, castle.png, graveyard.webp, forest.png, void.webp).
// When present, GhostOS uses the raster image instead of the built-in SVG
// scene — no code changes needed. Vite bundles these locally (offline-safe).
// If no file exists for an id, the detailed SVG scene is rendered.

import type { WallpaperId } from '../state/settingsStore';

// Eagerly import any raster wallpapers so the map is available synchronously.
// The glob is empty until artwork is added; this is intentionally forward-looking.
const modules = import.meta.glob('./wallpapers/*.{png,webp,jpg,jpeg}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

const byId: Partial<Record<WallpaperId, string>> = {};
for (const [path, url] of Object.entries(modules)) {
  const name = path.split('/').pop() ?? '';
  const id = name.replace(/\.(png|webp|jpe?g)$/i, '') as WallpaperId;
  // Prefer webp > png > jpg if multiple exist (webp set last wins only if later).
  if (!byId[id]) byId[id] = url;
}

/** Returns a bundled raster wallpaper URL for the id, or null to use the SVG. */
export function rasterWallpaper(id: WallpaperId): string | null {
  return byId[id] ?? null;
}
