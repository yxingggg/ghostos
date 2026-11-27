import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// GhostOS Vite configuration.
// base is read from GHOSTOS_BASE so the app can be deployed under a sub-path
// (e.g. GitHub Pages at /ghostos/) or at the root for other static hosts.
const base = process.env.GHOSTOS_BASE ?? '/';

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'GhostOS',
        short_name: 'GhostOS',
        description: 'A browser-based retro-gothic desktop environment.',
        theme_color: '#0e0b16',
        background_color: '#0e0b16',
        display: 'standalone',
        start_url: base,
        scope: base,
        icons: [
          {
            src: 'icon-192.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
          {
            src: 'icon-512.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        // Precache the built app shell and assets so GhostOS works fully offline.
        globPatterns: ['**/*.{js,css,html,svg,woff2,png,webp,jpg,jpeg,ico}'],
        navigateFallback: `${base}index.html`,
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  build: {
    target: 'es2021',
    sourcemap: true,
  },
});
