# GhostOS 👻

A browser-based retro-gothic desktop environment. GhostOS resurrects the nostalgic
1990s desktop-computing experience with modern web technologies — a window manager,
desktop, start menu, taskbar, and a set of built-in apps — all running **fully offline**
in your browser with no backend, no accounts, and no external APIs for core features.

> **Kiroween 2026 — Resurrection category.** Built spec-first with Kiro (specs, steering,
> hooks, and property-based testing). See [`docs/KIRO.md`](docs/KIRO.md) for the
> development write-up.

---

## Features

- **Atmospheric boot sequence** — a retro BIOS-style summoning on load.
- **Window manager** — draggable, resizable windows with minimize, maximize/restore,
  close, focus/z-order management, and cascade placement.
- **Desktop shell** — original pixel-gothic icons, a start menu, and a taskbar with a
  live clock and per-window buttons.
- **Persistent virtual file system** — a single-rooted tree stored in IndexedDB.
- **Tomb Explorer** — a file manager: create/rename/delete/navigate folders and files.
- **GraveNotes** — a persistent note editor (debounced autosave, ordered by recency).
- **Phantom Terminal** — a simulated shell operating **only** on the virtual file system
  (`help`, `ls`, `cd`, `cat`, `mkdir`, `touch`, `rm`, `echo`, `clear`, `pwd`, `whoami`)
  with command history.
- **Calculator** — full keyboard + button input, divide-by-zero handled gracefully.
- **DeadWave** — a local audio player with a real-time Web Audio spectrum visualizer.
- **Settings** — toggle CRT effects, reduced motion, and sound; export/import your whole
  workspace as a JSON backup.
- **Optional Spirit Assistant** — disabled by default; opt in and point it at your own
  endpoint. Nothing leaves your browser unless you enable it.
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
> `npm install`. The CI workflow handles both cases (`npm ci` when a lockfile exists,
> otherwise `npm install`).

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
  builds with `GHOSTOS_BASE=/ghostos/` and publishes to Pages. Set `GHOSTOS_BASE` to match
  your repository's sub-path (or `/` for a root deployment on Netlify/Vercel/etc.).

## Privacy & offline

GhostOS has no backend and no telemetry. Your notes, files, and audio stay in your
browser's IndexedDB. The only code that can touch the network is the optional Spirit
Assistant, and only after you explicitly enable it and provide your own endpoint.

## Assets & branding

All icons, the wallpaper, and sound effects are original to this project (hand-authored
SVG, CSS/SVG gradients, and runtime-synthesized audio). GhostOS deliberately avoids any
proprietary branding, logos, startup sounds, or wallpapers.

## License

[MIT](LICENSE). Update the copyright line with your name/handle before submitting.
