# GhostOS — Implementation Plan

> Legend: [x] verified by execution · [~] implemented, not yet verified · [ ] not started.
>
> VERIFICATION STATUS (GitHub Actions CI, commit 7efda62, run 45955101633):
> install ✅ · typecheck ✅ · lint ✅ · test ✅ (88 tests, 10 files, incl. WM & VFS
> property-based) · build ✅ (Vite production bundle + service worker). The tasks below
> are marked [x] on the strength of that green CI run. The one item NOT verified is the
> live GitHub Pages deployment: the build + upload-artifact steps pass, but the final
> deploy step is blocked until the repo owner enables GitHub Pages (Settings → Pages →
> Source: GitHub Actions). See task 18.

- [x] 1. Scaffold project and tooling
  - Initialize Vite + React + TypeScript project; enable `strict` mode in tsconfig.
  - Add Tailwind CSS with a retro-gothic theme extension (colors, fonts, borders).
  - Add Vitest, @testing-library/react, jsdom, fake-indexeddb, fast-check, ESLint.
  - Add npm scripts: `dev`, `build`, `typecheck`, `lint`, `test`, `test:watch`.
  - _Requirements: 11.1, 14.2, 14.3, 15.1, 15.5_

- [x] 2. Core window-manager kernel (pure)
  - [x] 2.1 Define WM types and the `wmReducer` with OPEN/CLOSE/FOCUS/MINIMIZE/RESTORE/TOGGLE_MAXIMIZE/MOVE/RESIZE/SET_DESKTOP.
    - Implement cascading placement, bounds clamping, min-size constraints, maximize/restore.
    - _Requirements: 1.1–1.7, 2.1–2.4, 3.1–3.5_
  - [x] 2.2 Unit tests for each action and property-based tests for WM invariants (focus uniqueness, order integrity, clamping, maximize identity).
    - _Requirements: 15.3, 15.4_

- [x] 3. Virtual file system kernel (pure)
  - [x] 3.1 Define VFS types and operations: create, rename, remove (subtree), move (cycle-safe), selectors (childrenOf, pathOf, isDescendant). Use discriminated result type for fallible ops.
    - _Requirements: 7.1–7.7_
  - [x] 3.2 Unit tests for each op and property-based tests for VFS invariants (single-parent/acyclic, delete-subtree, move safety, sibling-name uniqueness).
    - _Requirements: 15.3, 15.4_

- [x] 4. Persistence layer (IndexedDB)
  - Implement `idb`-based db with `kv` and `content` stores; `loadSlice/saveSlice`, content get/put.
  - Implement `hydrateAll()` and in-memory fallback with a one-time notice on failure.
  - Integration test with `fake-indexeddb` (round-trip a slice and a content blob).
  - _Requirements: 5.1–5.4, 14.1_

- [x] 5. State layer (Zustand stores)
  - [x] 5.1 `wmStore` wrapping `wmReducer`; actions exposed as methods; desktop-size sync.
    - _Requirements: 1–3_
  - [x] 5.2 `vfsStore` wrapping VFS ops with persistence; `settingsStore` (crt, reducedMotion, sound default off, assistant off).
    - _Requirements: 5, 7, 11.2, 11.4, 13.2_
  - [x] 5.3 `notesStore` and `musicStore` with debounced persistence.
    - _Requirements: 6, 9_
  - [x] 5.4 Integration tests: open/close windows via store; notes persist and reload.
    - _Requirements: 15.3_

- [x] 6. App registry and desktop shell
  - [x] 6.1 `AppDefinition` type + `registerApp/getApps/getApp`.
    - _Requirements: 15.2_
  - [x] 6.2 `WindowFrame` with title bar, controls, pointer drag/resize, ARIA dialog, focus management.
    - _Requirements: 1, 2, 3, 12.1, 12.2_
  - [x] 6.3 `Desktop`, `DesktopIcon` grid (roving tabindex), `StartMenu` (menu pattern), `Taskbar` with per-window buttons and live `Clock`.
    - _Requirements: 4.1–4.7, 12.1, 12.2_
  - [x] 6.4 `CrtOverlay` (toggle, reduced-motion aware) and theme wiring.
    - _Requirements: 11.1, 11.2, 11.4_

- [x] 7. Original icon set
  - Author original SVG icon components for each app and the start button; no third-party icon packs.
  - _Requirements: 11.3_

- [x] 8. Notes app
  - List + editor; create/edit (debounced persist)/delete; order by updatedAt.
  - _Requirements: 6.1–6.4_

- [x] 9. File Explorer app
  - Tree/column view over `vfsStore`; breadcrumb; create/rename/delete/move; keyboard support.
  - _Requirements: 7.2–7.7, 12.1_

- [x] 10. Calculator app
  - `calcReduce` engine + UI; button and keyboard input; divide-by-zero error; clear.
  - Unit tests for the engine (incl. div-by-zero, clear).
  - _Requirements: 8.1–8.4, 15.3_

- [x] 11. Terminal app
  - `runCommand` interpreter over VFS (help/ls/cd/cat/mkdir/touch/rm/echo/clear/pwd/whoami); history; unknown-command error.
  - Unit tests for the interpreter.
  - _Requirements: 8b.1–8b.5, 15.3_

- [x] 12. Music player app
  - Add local audio to VFS/content; playlist; play/pause/stop/next/prev/seek; Web Audio analyser visualizer with graceful fallback; honor mute.
  - _Requirements: 9.1–9.5_

- [x] 13. Sound effects
  - `sfx` manager with bundled cues; wired to open/close/click/error; disabled by default; respects setting.
  - _Requirements: 13.1–13.3, 11.4_

- [x] 14. Optional AI assistant (opt-in)
  - Disabled-by-default app; settings to enable + endpoint/key; direct browser request; graceful failure; no data sent unless enabled.
  - _Requirements: 10.1–10.4, 14.1_

- [x] 15. Accessibility and responsiveness pass
  - Keyboard reachability, focus rings, ARIA roles/labels, focus return on close; responsive stacked/full-screen windows on narrow viewports; reduced-motion and sound settings honored throughout.
  - _Requirements: 12.1–12.4, 11.4, 13.3_

- [x] 16. Register apps and finalize boot
  - Register all apps; boot/loading screen awaiting hydration; wire settings toggles; verify offline operation (no network calls for core features).
  - _Requirements: 4.1, 5.2, 14.1–14.3_

- [x] 17. Quality gate
  - `typecheck`, `lint`, `test`, and `build` all pass in GitHub Actions CI
    (run 45955101633, commit 7efda62): 88 tests across 10 files, production build
    emitted. Scripts documented in the README and wired into `.github/workflows/ci.yml`.
  - _Requirements: 15.1, 15.5_

- [x] 18. Live GitHub Pages deployment
  - Owner enabled Pages (Source: "GitHub Actions"). The Deploy workflow (run 45956462745,
    commit 8990bf4) completed with all jobs green: quality ✅, build ✅, deploy ✅.
  - GitHub's deployment record for the `github-pages` environment reports
    `state: success` with `environment_url: https://yxingggg.github.io/ghostos/`.
  - The deployed artifact was inspected and is correct: every `index.html` reference is
    prefixed with `/ghostos/` (JS, CSS, favicon SVG, manifest, registerSW); the manifest
    uses `start_url`/`scope` = `/ghostos/`; the service worker registers at `/ghostos/sw.js`
    with scope `/ghostos/` and precaches `/ghostos/index.html`.
  - NOT verified from here: the authoring sandbox is `INTEGRATIONS_ONLY` and cannot reach
    `github.io`, and no browser testing tool can reach it either, so the live HTTP 200
    response, in-browser rendering, console-error state, and runtime
    persistence/offline behavior were NOT tested by execution. They should be confirmed
    manually in a browser at https://yxingggg.github.io/ghostos/.
  - _Requirements: 14.1–14.3_

- [x] 19. Fix: open files from Tomb Explorer (post-submission bug report)
  - Root cause: Explorer's double-click handler only navigated folders; files had no open
    path, and GraveNotes only read its own notesStore, so a file (esp. a newly created one)
    could not be opened.
  - [x] 19.1 Add a pure `core/vfs/fileType.ts` (classify by extension then MIME; associate
    to a registered app) + unit tests. _Requirements: 7b.1, 7b.3, 7b.9_
  - [x] 19.2 Explorer: double-click and Enter open files; folders navigate; right-click
    context menu (Open, Open with, Rename, Delete, Duplicate, Download, Properties), all
    functional; no placeholder actions. _Requirements: 7b.1, 7b.2, 7c.1–7c.7_
  - [x] 19.3 GraveNotes: when opened with `props.vfsFileId`, edit that VFS file in place
    (read on open, save back to the same id); empty files open and edit without error;
    standalone notes unchanged. _Requirements: 7b.4, 7b.5, 7b.6_
  - [x] 19.4 DeadWave opens VFS audio (`addTrackFromVfs`, de-duped); new `imageviewer` app
    previews images; unsupported types show a toast. _Requirements: 7b.7, 7b.8, 7b.9_
  - [x] 19.5 `vfsStore.duplicate`/`readBinary`; pure `nodeProperties` helper + tests.
    _Requirements: 7c.4, 7c.5, 7c.6_
  - [x] 19.6 Regression/integration tests for the full workflow: create → open → edit →
    save → close → reopen → verify content → restore persisted workspace.
    _Requirements: 15.3_
  - Registry-driven: no application-specific branching added to the window manager. No
    IndexedDB reset or breaking persistence change. Existing files and standalone
    GraveNotes behavior preserved.
  - Verified: CI run 45960707510 (commit 2d4f976) green — 146 tests / 18 files, build OK.
  - _Requirements: 7b, 7c_

- [x] 20. Spirit Assistant: offline help mode + robust online AI mode
  - Root cause of "No endpoint configured": the assistant had only an online mode that
    required configuration, with no default offline capability.
  - [x] 20.1 Pure `core/assistant/offlineHelp.ts`: local knowledge base + keyword matcher
    + suggested questions + graceful fallback; labeled as non-generative. Unit tested.
    _Requirements: 10.1, 10.2_
  - [x] 20.2 Pure `core/assistant/providers.ts`: OpenAI/Gemini/custom presets,
    `buildRequest`/`parseResponse`, HTTP + network/timeout/CORS error classification,
    HTTPS-with-key guard. Unit tested. _Requirements: 10.4, 10.6, 10.9_
  - [x] 20.3 `apps/assistant/client.ts`: fetch wrapper with AbortController timeout; never
    throws. _Requirements: 10.6_
  - [x] 20.4 AssistantApp: Offline Spirit tab (default) with clickable suggestions; Online
    AI tab (opt-in) with chat, provider banner, and "Open Assistant Settings" navigation.
    _Requirements: 10.1–10.3, 10.5, 10.10_
  - [x] 20.5 Settings: provider preset selector, endpoint/model/key fields, Test
    Connection button with success/error, and an `assistant-settings` anchor.
    _Requirements: 10.4, 10.5_
  - [x] 20.6 settingsStore: `provider`; API key session-only (stripped from persist and
    export); cleared on provider/endpoint change. Unit tested. _Requirements: 10.7, 10.8_
  - [x] 20.7 Tests: offline matcher, provider formatting/parse/errors, credential handling,
    and AssistantApp integration (offline answers; online opt-in → open settings).
    _Requirements: 15.3_
  - Offline mode works with no external dependency or network. API keys never hardcoded or
    committed. Registry-driven settings navigation (no WM branching).
  - Verified: CI run 45960707510 (commit 2d4f976) green. NOT verified: live connectivity to
    a real OpenAI/Gemini provider was not exercised (no credentials/outbound access in CI
    or the sandbox); provider request/response/error logic is covered by unit tests only.
  - _Requirements: 10_

- [x] 21. GraveNotes ↔ Tomb Explorer file-save integration (reported bug)
  - Root cause: GraveNotes standalone documents lived only in notesStore and were never
    written to the virtual filesystem, so they never appeared in Tomb Explorer. The gap
    was integration between notesStore and vfsStore, not IndexedDB persistence.
  - [x] 21.1 GraveNotes File menu (New, Open, Save, Save As, Close) over real VFS files;
    legacy quick notes kept with a "Save as File" promotion. _Requirements: 6b.1, 6b.6, 6b.12_
  - [x] 21.2 SaveAsDialog: name + `.txt`/`.md` extension + destination folder; duplicate
    handling with overwrite confirmation (no duplicate copies). _Requirements: 6b.3, 6b.7_
  - [x] 21.3 Bind editor to the created/opened file id; subsequent saves update the same
    file; files appear in Explorer immediately. _Requirements: 6b.2, 6b.4, 6b.11_
  - [x] 21.4 Robust save controller: Ctrl/Cmd+S (prevent browser dialog), real
    Unsaved/Saving/Saved/Save-failed status from actual persistence results, monotonic
    version guard against stale autosave, flush on close. _Requirements: 6b.5, 6b.8–6b.10_
  - [x] 21.5 persist.saveSlice/putContent return durability; vfsStore.writeText returns a
    result and preserves the file's MIME; added saveTextAs and folders selectors.
  - [x] 21.6 Tests: unit (saveTextAs/durability), integration (acceptance workflow:
    new → type → Save As → appears in VFS → reopen → edit → save → persists;
    Ctrl+S opens Save As; Open dialog; Save-failed indicator), plus Playwright e2e.
    _Requirements: 15.3_
  - No IndexedDB reset; existing notes preserved; registry-driven (no WM branching).
  - _Requirements: 6b_

- [x] 22. Gemini default model → gemini-3-flash-preview
  - Update the Gemini preset default model; keep the model field editable; don't overwrite
    a user-configured model without an explicit provider switch; update tests/placeholders.
  - _Requirements: 10.4_

- [x] 23. Responsive window content (Tomb Explorer header clipping)
  - Shared `ui/Toolbar` with ResizeObserver-based overflow (⋯) menu; Explorer uses it;
    breadcrumb scrolls; terminal prompt truncates; app roots use `min-h-0` flex columns so
    content scrolls independently and controls are never clipped. Toolbar unit test +
    Playwright viewport check. Audited all apps.
  - _Requirements: 12.3 (responsive), 4 (shell)_

- [x] 24. DeadWave usability + original demo tracks
  - Prominent Import Audio, drag-and-drop, VFS-open integration, empty state, playlist,
    play/pause/stop/prev/next/seek/volume/mute/repeat, elapsed/duration/filename, autoplay
    handling, unsupported/corrupted messaging, object-URL cleanup.
  - Pure `core/audio/wav.ts` (WAV encoder + synth) and `core/audio/demoTracks.ts` (three
    original compositions) synthesized at runtime; "Play Demo Track" action; never
    autoplayed; no external/streamed/copyrighted audio. Unit tests for encoder + tracks.
  - _Requirements: 9_

- [x] 25. Playwright end-to-end browser tests
  - `e2e/ghostos.spec.ts` covering the create→open→edit→save→reload→persist workflow,
    GraveNotes Save As → appears in Explorer, Explorer resize control visibility, DeadWave
    demo playback, and Offline Spirit without credentials. Dedicated CI job installs
    Chromium. NOT claimed to pass until an Actions run executes it.
  - _Requirements: 15.3, 15.5_

> Verification (CI run on commit ed4fb38): build-and-test green — 160 unit/integration/
> property tests across 20 files, type-check, lint, production build; e2e job green — 5
> Playwright tests passed in real Chromium (create→open→edit→save→reload→persist;
> GraveNotes Save As → file appears in Tomb Explorer; Explorer resize keeps controls in
> bounds; DeadWave plays an original demo track after a click; Offline Spirit answers with
> no credentials). Deploy workflow green; github-pages deployment state=success at
> https://yxingggg.github.io/ghostos/. Live in-browser use beyond these scripted e2e flows
> was not manually exercised from this environment.
