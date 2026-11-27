# GhostOS 👻

A browser-based retro-gothic desktop environment. GhostOS resurrects the nostalgic
1990s desktop-computing experience with modern web technologies — a window manager,
desktop, start menu, taskbar, and a set of built-in apps — all running **fully offline**
in your browser with no backend, no accounts, and no external APIs for core features.

> **Kiroween 2026 — Resurrection category.** Built spec-first with Kiro (specs, steering,
> hooks, and property-based testing). See [`docs/KIRO.md`](docs/KIRO.md) for the
> development write-up.

- **Repository:** https://github.com/yxingggg/ghostos
- **Deployment (GitHub Pages):** https://yxingggg.github.io/ghostos/ *(live once the
  Pages deploy workflow has run on the `main` branch)*

---

## Project status

GhostOS is **feature-complete and verified by CI**. The GitHub Actions
[CI workflow](.github/workflows/ci.yml) runs green on `main`:

| Check | Status |
|-------|--------|
| Install dependencies | ✅ |
| Type-check (`tsc`, strict) | ✅ |
| Lint (ESLint, `.ts`/`.tsx`) | ✅ |
| Test (Vitest) | ✅ **88 tests, 10 files** (incl. WM & VFS property-based) |
| Production build (Vite) | ✅ bundle + service worker emitted |

**Deployment:** the Deploy workflow runs green (quality gate, build, artifact upload, and
the `deploy-pages` publish job), and GitHub's deployment record for the `github-pages`
environment reports `state: success` at **https://yxingggg.github.io/ghostos/**. The
deployed artifact was inspected and all assets are correctly served under the `/ghostos/`
base path (JS, CSS, SVG icons, PWA manifest, service worker). The **live in-browser
behavior** (HTTP 200 render, console-error state, runtime persistence/offline) was **not**
verified from the authoring environment — it has no outbound access to `github.io` — so
confirm it in a browser. See [Limitations](#limitations-and-remaining-verification).

---

## Features

- **Premium haunted look** — an original GhostOS logo and ghost mascot ("Wisp"), colourful
  app icon tiles, four selectable CSS/SVG gothic wallpapers, polished window chrome, and
  smooth reduced-motion-aware animations.
- **First-launch welcome** — a branded intro that seeds sample files into your filesystem;
  shown once.
- **Ghost Memory** — your desktop, files, notes, and open windows are restored automatically
  each visit (and are exportable/importable).
- **Atmospheric boot sequence** — a retro BIOS-style summoning on load.
- **Window manager** — draggable, resizable windows with minimize, maximize/restore,
  close, focus/z-order management, and cascade placement.
- **Desktop shell** — original pixel-gothic icons, a start menu, and a taskbar with a
  live clock and per-window buttons.
- **Persistent virtual file system** — a single-rooted tree stored in IndexedDB.
- **Tomb Explorer** — a file manager: create/rename/delete/duplicate/download/navigate,
  a right-click context menu, Properties, and **opening files** (double-click or Enter)
  into the right app by type.
- **GraveNotes** — a persistent note editor (debounced autosave, ordered by recency) that
  also opens and edits text/Markdown files from the filesystem in place.
- **Spectral Viewer** — view images from the filesystem, import local files or drag-and-drop
  (they also land in Tomb Explorer), with zoom, rotate, fit-to-window, actual-size, and an
  original bundled sample image.
- **Phantom Terminal** — a simulated shell operating **only** on the virtual file system
  (`help`, `ls`, `cd`, `cat`, `mkdir`, `touch`, `rm`, `echo`, `clear`, `pwd`, `whoami`)
  with command history.
- **Calculator** — full keyboard + button input, divide-by-zero handled gracefully.
- **DeadWave** — a local audio player: import via button or drag-and-drop (or open audio
  from Tomb Explorer), playlist, play/pause/stop/prev/next/seek/volume/mute/repeat, a
  real-time Web Audio spectrum visualizer, and three **original** locally-synthesized demo
  tracks (Midnight Transmission · Spectral Frequencies · Echoes from 1998) playable with
  one click — no streaming, no bundled audio files, never autoplayed.
- **Settings** — toggle CRT effects, reduced motion, and sound; export/import your whole
  workspace as a JSON backup.
- **Spirit Assistant** — an **offline help mode** by default (rule-based answers about
  GhostOS from local docs, with clickable suggested questions; no API key, no network, not
  a generative model), plus an **optional online AI mode** with provider presets (OpenAI,
  Google Gemini, custom OpenAI-compatible), a Test Connection button, and graceful error
  handling. Online mode is opt-in; your API key stays in session memory (never saved or
  exported), is never sent over non-HTTPS, and only your messages are sent — never your
  files or notes.
- **Offline-first** — a service worker precaches the app shell so it runs without a
  network. All assets are bundled or generated locally.
- **Accessible & responsive** — keyboard-operable controls, ARIA roles/labels, visible
  focus, `prefers-reduced-motion` support, and a stacked layout on small screens.

## Tech stack

React 18 · TypeScript (strict) · Vite · Tailwind CSS · Zustand · IndexedDB (`idb`) ·
Web Audio API · Vitest + Testing Library · fast-check (property-based testing) ·
`vite-plugin-pwa` (offline service worker).

## Getting started

Requires Node.js 18+.

```bash
npm install      # install dependencies (generates package-lock.json on first run)
npm run dev      # start the Vite dev server
npm run build    # type-check + production build into dist/
npm run preview  # preview the production build
```

### Quality scripts

```bash
npm run typecheck   # tsc --noEmit (strict)
npm run lint        # eslint
npm test            # vitest run (unit + property + integration)
npm run test:watch  # vitest in watch mode
npm run test:coverage
```

> Note: GhostOS was authored in an offline sandbox that could not reach the npm registry,
> so a `package-lock.json` is **not** committed. It is generated the first time you run
> `npm install` — commit it afterward to enable reproducible installs and CI caching. The
> CI and deploy workflows handle both cases (`npm ci` when a lockfile exists, otherwise
> `npm install`).

## Architecture

GhostOS is layered with a strict one-directional dependency rule: **UI → State → Core**.

```
src/
  core/      pure, framework-free logic (the main test target)
    wm/        window-manager reducer + types
    vfs/       virtual filesystem operations + types
    calc/      calculator state machine
    terminal/  command interpreter over the VFS
  state/     Zustand stores + IndexedDB persistence (side effects live here)
  apps/      built-in apps, each registered via the app registry
  ui/        desktop shell: WindowFrame, Desktop, Taskbar, StartMenu, CRT overlay
  assets/    original SVG icon set
  sound/     synthesized sound effects (no audio files)
  styles/    Tailwind entry + CSS/SVG wallpaper + CRT effects
```

- **Core** modules are pure: no React, DOM, or IndexedDB. They return new state or a
  `{ ok } | { ok: false; error }` result. This is what the unit and property-based tests
  exercise directly.
- **Apps are decoupled** from the shell through an **app registry**
  (`src/apps/registry.ts`). The window manager, desktop, taskbar, and start menu iterate
  the registry — adding a new app means registering an `AppDefinition`, with no changes to
  the WM core.

The full requirements, design, and task breakdown live in
[`.kiro/specs/ghostos/`](.kiro/specs/ghostos/).

## Testing

- **Unit** tests cover the calculator engine, terminal interpreter, every VFS operation,
  and every window-manager action (including edge cases: divide-by-zero, unknown command,
  closing the focused window, maximize/restore).
- **Property-based** tests (fast-check) assert invariants:
  - **Window manager** — focus uniqueness, order/z integrity, bounds clamping, and
    double-maximize returning the original bounds, across random action sequences.
  - **Virtual filesystem** — single-parent/acyclic tree, delete-subtree, cycle-safe moves,
    and no sibling name collisions, across random operation sequences.
- **Integration** tests (Testing Library + `fake-indexeddb`) cover store behavior,
  persistence round-trips, and the desktop shell (launching/closing windows, start menu).

## Deployment

The production build is a static bundle in `dist/`, deployable to any static host.

- **GitHub Pages** — the included [`deploy.yml`](.github/workflows/deploy.yml) workflow
  builds with `GHOSTOS_BASE=/ghostos/` and publishes to **https://yxingggg.github.io/ghostos/**.
  Set `GHOSTOS_BASE` to match your repository's sub-path (or `/` for a root deployment on
  Netlify/Vercel/etc.).

See [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) for the full pipeline, verification status,
and a manual in-browser confirmation checklist.

## Privacy & offline

GhostOS has no backend and no telemetry. Your notes, files, and audio stay in your
browser's IndexedDB. The only code that can touch the network is the optional Spirit
Assistant, and only after you explicitly enable it and provide your own endpoint.

## Assets & branding

All icons, the wallpaper, and sound effects are original to this project (hand-authored
SVG, CSS/SVG gradients, and runtime-synthesized audio). GhostOS deliberately avoids any
proprietary branding, logos, startup sounds, or wallpapers.

## Limitations and remaining verification

Honest status of what has and hasn't been confirmed:

- **Verified by CI, not in the authoring sandbox.** The authoring environment had no npm
  registry or general internet access, so the suite/build were executed by GitHub Actions.
  CI is green (install via `npm ci`, type-check, lint, 88 tests, production build), and the
  Pages deployment job succeeded (deployment record `state: success`).
- **Live browser behavior is NOT yet verified.** The authoring environment cannot reach
  `github.io`, so the live site's HTTP response, in-browser rendering, console errors, and
  runtime persistence/offline behavior were not tested by execution. The deployed *artifact*
  was inspected and is correct (all assets base-pathed to `/ghostos/`, valid PWA manifest
  and service worker), but please confirm the running app at
  https://yxingggg.github.io/ghostos/ in a browser.
- **`package-lock.json` is committed** (generated in CI via the
  [generate-lockfile workflow](.github/workflows/generate-lockfile.yml)), so installs are
  reproducible and CI uses `npm ci`.
- **Web fonts are not bundled.** To stay fully offline, GhostOS uses system-font fallbacks
  for the pixel/gothic look rather than loading fonts from a CDN. For the authentic bitmap
  typeface, drop self-hosted `.woff2` files into `src/assets/fonts/` and uncomment the
  `@font-face` blocks in `src/styles/fonts.css`.
- **AI assistant requires your own endpoint.** It is disabled by default and never
  contacts the network unless you enable it and supply an endpoint; it refuses to send an
  API key over a non-HTTPS endpoint.
- **Audio visualization** needs the Web Audio API; where it is unavailable, audio still
  plays and the visualizer renders a flat baseline instead of failing.

See [`.kiro/specs/ghostos/tasks.md`](.kiro/specs/ghostos/tasks.md) for per-task status
(`[~]` = implemented but not yet verified by execution; `[x]` = verified).

## License

Licensed under the [MIT License](LICENSE) — Copyright (c) 2026 yxingggg.
