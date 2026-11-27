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

## Provenance

If the raster wallpapers here are AI-generated (e.g. produced with ChatGPT /
an image model), state that honestly and avoid asserting a license you cannot
substantiate:

> The raster wallpaper images (`castle.webp`, `graveyard.webp`, `forest.webp`,
> `void.webp`) were generated with ChatGPT image generation. They are provided
> for this project's own use. No third-party copyrighted artwork was traced or
> copied; GhostOS makes no additional licensing claim about AI-generated output
> beyond the terms of the tool that produced it.

The built-in SVG scenes (`src/assets/wallpapers.tsx`) are original hand-authored
vector art by the project and ship as the default/offline fallback.

