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

## Verifying CI after a push (lean workflow)

The sandbox cannot run the suite (no registry); CI is the source of truth. Verify it
efficiently — do NOT burn context on long `sleep`/poll loops or ZIP log extraction:

- Find the run by the exact pushed SHA, non-blocking:
  `gh run list --repo <owner/repo> --commit "$(git rev-parse HEAD)" --json workflowName,status,conclusion,url`
- If a run is `in_progress`/`queued`, **report its URL and status and stop** — do not block,
  poll in a tight loop, or re-dispatch. Re-check once later only if needed.
- Read a completed run's per-job result with `gh run view <id>` (or `--json jobs`); prefer
  the GitHub **job summary** (test counts, build status, wallpaper asset verification) that
  CI writes to `$GITHUB_STEP_SUMMARY` over parsing raw logs.
- Fetch logs ONLY for a failed step: `gh run view <id> --log-failed` (or the run's
  `logs` endpoint), targeting the failing job — never the whole run by default.
- Deployment: check the `github-pages` deployment record state and `environment_url`;
  report the URL/state instead of waiting.

Keep CI/deploy workflow structure and security unchanged when adding summaries; a summary
step must be `if: always()` and must not alter exit status.
