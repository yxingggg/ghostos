---
inclusion: always
---

# GhostOS — Modular Architecture

Keep three layers strictly separated and dependencies pointing one direction:
**UI → State → Core**. Core never imports State or UI; State never imports UI.

- **Core (`src/core/**`)**: pure, framework-agnostic logic (WM reducer, VFS ops, calculator
  engine, terminal interpreter). No React, no DOM, no IndexedDB, no `window`/`document`
  access. Functions are pure: given input, return new state or a result object. These are
  the primary unit/property-test targets.
- **State (`src/state/**`)**: Zustand stores that wrap core functions and handle
  persistence side effects. Side effects (IndexedDB, timers) live here, not in Core.
- **UI (`src/ui/**`, `src/apps/**`)**: React components. Components read state via store
  hooks/selectors and dispatch store actions; they must not reimplement core logic.

## App registry rule

New applications are added ONLY by registering an `AppDefinition` through the app registry
(`src/apps/registry.ts`). The window manager, desktop, taskbar, and start menu must remain
app-agnostic: they iterate the registry and never import a specific app module. Do not add
`switch (appId)` branches in shell code — look the app up in the registry instead.

## Fallible operations

Core operations that can fail (VFS create/rename/move) return a discriminated result
`{ ok: true; ... } | { ok: false; error: string }`. Do not throw for expected failures;
reserve exceptions for programmer errors. Stores translate `ok: false` into user-facing
notices.

## Offline-first rule

Core features must not depend on any network call. The only code permitted to reach the
network is the opt-in AI assistant, and only after the user explicitly enables it. Bundle
all assets required for core features.
