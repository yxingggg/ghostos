# Raster wallpaper assets (optional)

Drop **original** high-quality pixel-art wallpapers here to override the built-in
SVG scenes. Name each file by its wallpaper id:

- `castle.webp` (or `.png`) → Haunted Castle
- `graveyard.webp` → Blood Moon Graveyard
- `forest.webp` → Misty Haunted Forest
- `void.webp` → Supernatural Void

When a file is present, GhostOS uses it instead of the SVG scene automatically
(see `src/assets/wallpaperAssets.ts`). Files are bundled locally by Vite, so the
app stays fully offline. Use only original or appropriately licensed artwork.

Recommended: 1920×1200 or larger, WebP for size. No file is required — the
detailed SVG scenes render when none is provided.
