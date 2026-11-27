---
inclusion: always
---

# GhostOS — Testing Standards

Use **Vitest** for all tests, **@testing-library/react** for component/integration tests
(JSDOM environment), **fake-indexeddb** for persistence tests, and **fast-check** for
property-based tests. Place tests next to the code as `*.test.ts(x)`.

## What to test

- **Pure core logic** gets unit tests: calculator engine, terminal interpreter, every VFS
  operation, every WM reducer action (including edge cases like divide-by-zero, unknown
  command, close-focused-window, maximize/restore).
- **Invariants** get property-based tests with `fast-check`:
  - WM: random valid action sequences preserve focus uniqueness, order integrity (order
    matches `windows` keys), bounds clamping (title bar within desktop, size ≥ min), and
    double-maximize returns original bounds.
  - VFS: random op sequences preserve the single-parent/acyclic tree, `remove(folder)`
    leaves no descendants, `move` never creates a cycle, and siblings never share a name.
- **Stores/persistence** get integration tests: dispatch store actions and assert state;
  round-trip through `fake-indexeddb` (save then reload a fresh store).

## Conventions

- Keep core modules free of DOM/IndexedDB so they test without mocks.
- Prefer deterministic tests; when using randomness, seed `fast-check` for reproducibility
  on failures and keep run counts reasonable (e.g., 100–300 runs).
- Do NOT add tests for trivial glue or snapshot-only UI unless requested.
- A task is not complete until `npm run typecheck`, `npm run lint`, and `npm test` pass.
- When you change behavior of a core module, update or add the corresponding test in the
  same change.
