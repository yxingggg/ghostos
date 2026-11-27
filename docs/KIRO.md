# Building GhostOS with Kiro

This document describes how [Kiro](https://kiro.dev) was used to build GhostOS — not as a
checklist of features, but as an honest account of the spec-driven workflow, the steering
rules that shaped the code, the hooks that kept quality up, and the property-based testing
that pins down the trickiest invariants.

## Spec-first development

GhostOS started as a **spec**, not as code. Before any implementation, three documents
were authored in [`.kiro/specs/ghostos/`](../.kiro/specs/ghostos/):

- **`requirements.md`** — 15 requirements written as user stories with **EARS-style**
  acceptance criteria (WHEN/WHILE/IF … THEN … SHALL). These cover the window manager
  lifecycle and focus model, drag/resize, the desktop/taskbar/start menu, persistence,
  each application, the retro-gothic theme and CRT effects, accessibility, offline
  operation, and the quality bar (strict TypeScript, modularity, testing).
- **`design.md`** — the architecture (the `UI → State → Core` layering), the data models
  (`WmState`/`WmAction`, the VFS node tree, the calculator state machine, the terminal
  interpreter contract), the app-registry interface, the IndexedDB persistence schema, and
  the testing strategy — including the exact invariants the property tests assert.
- **`tasks.md`** — an incremental, dependency-ordered implementation plan. Each task links
  back to the requirements it satisfies, and the plan is updated as work lands. Tasks are
  marked `[x]` (implemented), `[~]` (implemented but not yet verified by executing the
  suite), or `[ ]` (not started), so the status is never overstated.

Working from the spec meant the window manager and VFS had precise, testable contracts
before a line of React was written — which is exactly what made the property-based tests
possible.

## Steering rules

Three always-on steering files in [`.kiro/steering/`](../.kiro/steering/) encoded the
project's engineering standards so every change respected them:

- **`architecture.md`** — the strict `UI → State → Core` dependency rule (Core stays pure:
  no React, DOM, or IndexedDB), the app-registry rule (new apps are added only by
  registering an `AppDefinition`; no app-specific branching in the shell), the
  fallible-operation convention (return a `{ ok } | { ok: false; error }` result instead of
  throwing), and the offline-first rule (only the opt-in assistant may touch the network).
- **`typescript.md`** — keep `strict` on, no `any`, discriminated unions with exhaustive
  `never` checks, annotated public return types, and no error-suppression comments.
- **`testing.md`** — Vitest + Testing Library + `fake-indexeddb` + fast-check; what to
  unit-test, which invariants to property-test, and the rule that a task isn't done until
  `typecheck`, `lint`, and `test` pass.

These rules are visible in the result: core modules genuinely have no DOM imports, every
VFS mutation returns a `Result`, and the shell never references a concrete app — it only
iterates the registry.

## Hooks

Two hooks live in [`.kiro/hooks/`](../.kiro/hooks/):

1. **`test-on-core-save.json`** (`PostFileSave`) — fires whenever a file under `src/core`
   is saved and reminds the agent to add/update colocated tests, run the suite, and
   type-check before moving on. Its matcher,
   `src/core/(?!.*\.(test|spec)\.tsx?$).*\.tsx?$`, deliberately **excludes** the test and
   spec files themselves, so creating a test doesn't re-trigger the hook. This is a
   local-development hook: Kiro Web does not execute file-save hooks, but the hook is
   preserved for use in the Kiro IDE.
2. **`quality-review.json`** (`Manual`) — an on-demand review hook that works in **Kiro
   Web**. Invoking it asks the agent to audit the current changes against the steering
   rules: layering, registry wiring, TypeScript strictness, the fallible-result
   convention, test coverage, and the no-network-in-core guarantee — and to report
   findings without modifying code.

## Property-based testing

The most valuable testing payoff from the spec work is **property-based testing** with
`fast-check`, which checks invariants across thousands of randomized inputs rather than a
handful of hand-picked cases.

**Window manager** ([`src/core/wm/reducer.test.ts`](../src/core/wm/reducer.test.ts)) drives
random sequences of `OPEN`/`CLOSE`/`FOCUS`/`MINIMIZE`/`RESTORE`/`TOGGLE_MAXIMIZE`/`MOVE`/
`RESIZE` actions and, after every step, asserts:

- `order` always equals the set of live window ids, with no duplicates;
- at most one window is focused, and the focused window sits on top of the stack;
- `zIndex` values stay consistent with the stacking order;
- every window's size respects the minimum constraints and its title bar stays reachable
  within the desktop;
- applying `TOGGLE_MAXIMIZE` twice returns a window to its exact original bounds.

**Virtual filesystem** ([`src/core/vfs/ops.test.ts`](../src/core/vfs/ops.test.ts)) drives
random `create`/`rename`/`move`/`remove` sequences and asserts the tree invariants after
every step:

- every non-root node has exactly one existing parent, and every node reaches the root
  without a cycle;
- siblings never share a name;
- removing a folder deletes its entire subtree;
- a folder can never be moved inside its own descendant (no cycles are ever introduced).

These properties come straight from the invariants written in `design.md` — the spec
told us what had to be true, and fast-check keeps it true.

## Honest status

GhostOS was authored in an environment without npm-registry access, so dependencies could
not be installed there and the suite could not be executed in that sandbox. The code is
complete and written to the contracts above; `tasks.md` marks items not yet verified by a
real test run as `[~]` rather than claiming green checks. Running `npm install && npm test`
in any networked environment (and the CI workflow) executes everything described here.
