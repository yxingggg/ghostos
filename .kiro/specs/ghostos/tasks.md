# GhostOS — Implementation Plan

> Legend: [x] implemented · [~] implemented, not yet verified by execution (no npm
> install possible in the Kiro Web sandbox) · [ ] not started. All code to date is
> written but UNVERIFIED by running tests/build in this environment.

- [~] 1. Scaffold project and tooling
  - Initialize Vite + React + TypeScript project; enable `strict` mode in tsconfig.
  - Add Tailwind CSS with a retro-gothic theme extension (colors, fonts, borders).
  - Add Vitest, @testing-library/react, jsdom, fake-indexeddb, fast-check, ESLint.
  - Add npm scripts: `dev`, `build`, `typecheck`, `lint`, `test`, `test:watch`.
  - _Requirements: 11.1, 14.2, 14.3, 15.1, 15.5_

- [~] 2. Core window-manager kernel (pure)
  - [~] 2.1 Define WM types and the `wmReducer` with OPEN/CLOSE/FOCUS/MINIMIZE/RESTORE/TOGGLE_MAXIMIZE/MOVE/RESIZE/SET_DESKTOP.
    - Implement cascading placement, bounds clamping, min-size constraints, maximize/restore.
    - _Requirements: 1.1–1.7, 2.1–2.4, 3.1–3.5_
  - [~] 2.2 Unit tests for each action and property-based tests for WM invariants (focus uniqueness, order integrity, clamping, maximize identity).
    - _Requirements: 15.3, 15.4_

- [~] 3. Virtual file system kernel (pure)
  - [~] 3.1 Define VFS types and operations: create, rename, remove (subtree), move (cycle-safe), selectors (childrenOf, pathOf, isDescendant). Use discriminated result type for fallible ops.
    - _Requirements: 7.1–7.7_
  - [~] 3.2 Unit tests for each op and property-based tests for VFS invariants (single-parent/acyclic, delete-subtree, move safety, sibling-name uniqueness).
    - _Requirements: 15.3, 15.4_

- [ ] 4. Persistence layer (IndexedDB)
  - Implement `idb`-based db with `kv` and `content` stores; `loadSlice/saveSlice`, content get/put.
  - Implement `hydrateAll()` and in-memory fallback with a one-time notice on failure.
  - Integration test with `fake-indexeddb` (round-trip a slice and a content blob).
  - _Requirements: 5.1–5.4, 14.1_

- [ ] 5. State layer (Zustand stores)
  - [ ] 5.1 `wmStore` wrapping `wmReducer`; actions exposed as methods; desktop-size sync.
    - _Requirements: 1–3_
  - [ ] 5.2 `vfsStore` wrapping VFS ops with persistence; `settingsStore` (crt, reducedMotion, sound default off, assistant off).
    - _Requirements: 5, 7, 11.2, 11.4, 13.2_
  - [ ] 5.3 `notesStore` and `musicStore` with debounced persistence.
    - _Requirements: 6, 9_
  - [ ] 5.4 Integration tests: open/close windows via store; notes persist and reload.
    - _Requirements: 15.3_

- [ ] 6. App registry and desktop shell
  - [ ] 6.1 `AppDefinition` type + `registerApp/getApps/getApp`.
    - _Requirements: 15.2_
  - [ ] 6.2 `WindowFrame` with title bar, controls, pointer drag/resize, ARIA dialog, focus management.
    - _Requirements: 1, 2, 3, 12.1, 12.2_
  - [ ] 6.3 `Desktop`, `DesktopIcon` grid (roving tabindex), `StartMenu` (menu pattern), `Taskbar` with per-window buttons and live `Clock`.
    - _Requirements: 4.1–4.7, 12.1, 12.2_
  - [ ] 6.4 `CrtOverlay` (toggle, reduced-motion aware) and theme wiring.
    - _Requirements: 11.1, 11.2, 11.4_

- [ ] 7. Original icon set
  - Author original SVG icon components for each app and the start button; no third-party icon packs.
  - _Requirements: 11.3_

- [ ] 8. Notes app
  - List + editor; create/edit (debounced persist)/delete; order by updatedAt.
  - _Requirements: 6.1–6.4_

- [ ] 9. File Explorer app
  - Tree/column view over `vfsStore`; breadcrumb; create/rename/delete/move; keyboard support.
  - _Requirements: 7.2–7.7, 12.1_

- [ ] 10. Calculator app
  - `calcReduce` engine + UI; button and keyboard input; divide-by-zero error; clear.
  - Unit tests for the engine (incl. div-by-zero, clear).
  - _Requirements: 8.1–8.4, 15.3_

- [ ] 11. Terminal app
  - `runCommand` interpreter over VFS (help/ls/cd/cat/mkdir/touch/rm/echo/clear/pwd/whoami); history; unknown-command error.
  - Unit tests for the interpreter.
  - _Requirements: 8b.1–8b.5, 15.3_

- [ ] 12. Music player app
  - Add local audio to VFS/content; playlist; play/pause/stop/next/prev/seek; Web Audio analyser visualizer with graceful fallback; honor mute.
  - _Requirements: 9.1–9.5_

- [ ] 13. Sound effects
  - `sfx` manager with bundled cues; wired to open/close/click/error; disabled by default; respects setting.
  - _Requirements: 13.1–13.3, 11.4_

- [ ] 14. Optional AI assistant (opt-in)
  - Disabled-by-default app; settings to enable + endpoint/key; direct browser request; graceful failure; no data sent unless enabled.
  - _Requirements: 10.1–10.4, 14.1_

- [ ] 15. Accessibility and responsiveness pass
  - Keyboard reachability, focus rings, ARIA roles/labels, focus return on close; responsive stacked/full-screen windows on narrow viewports; reduced-motion and sound settings honored throughout.
  - _Requirements: 12.1–12.4, 11.4, 13.3_

- [ ] 16. Register apps and finalize boot
  - Register all apps; boot/loading screen awaiting hydration; wire settings toggles; verify offline operation (no network calls for core features).
  - _Requirements: 4.1, 5.2, 14.1–14.3_

- [ ] 17. Quality gate
  - Ensure `typecheck`, `lint`, and `test` pass; document scripts in README.
  - _Requirements: 15.1, 15.5_
