# GhostOS — Design

## Overview

GhostOS is a single-page application that renders a simulated desktop OS in the browser.
All logic runs client-side. State lives in Zustand stores and is persisted to IndexedDB.
The architecture separates three concerns:

1. **Kernel/core** — pure, framework-agnostic logic: window-manager reducer, VFS
   operations, calculator engine, terminal command interpreter. These modules have no
   React or DOM dependencies and are the primary target of unit and property-based tests.
2. **State layer** — Zustand stores that hold runtime state and wrap the kernel reducers,
   plus a persistence middleware that writes slices to IndexedDB and rehydrates on boot.
3. **UI layer** — React components for the desktop shell (desktop, taskbar, start menu,
   window chrome) and the built-in apps, styled with Tailwind using retro-gothic tokens.

Apps are decoupled from the shell through an **app registry**: each app declares an id,
metadata, an icon, and a React component. The window manager and desktop consume the
registry and never import individual apps directly, satisfying the modularity requirement.

```
┌──────────────────────────────────────────────────────────┐
│                         UI Layer (React)                   │
│  Desktop · Taskbar · StartMenu · WindowFrame · Apps        │
└───────────────▲───────────────────────────▲───────────────┘
                │ hooks/selectors            │ registry
┌───────────────┴───────────────┐  ┌─────────┴──────────────┐
│       State Layer (Zustand)    │  │     App Registry        │
│  wmStore · vfsStore · notes    │  │  id, meta, icon, view   │
│  settings · music · persist mw │  └────────────────────────┘
└───────────────▲────────────────┘
                │ pure calls
┌───────────────┴────────────────────────────────────────────┐
│                    Kernel/Core (pure TS)                     │
│  wm-reducer · vfs-ops · calc-engine · terminal-interpreter   │
└───────────────▲────────────────────────────────────────────┘
                │
┌───────────────┴────────────────────────────────────────────┐
│          Persistence (IndexedDB via idb wrapper)             │
└─────────────────────────────────────────────────────────────┘
```

## Technology choices

- **React 18 + TypeScript (strict)** — UI and type safety.
- **Vite** — dev server and build; fast HMR, bundles all assets for offline use.
- **Tailwind CSS** — utility styling with a custom retro-gothic theme extension.
- **Zustand** — small, unopinionated store; easy to keep slices pure and testable.
- **IndexedDB** (via the `idb` helper) — structured, async, large-capacity local storage
  suitable for note bodies, VFS content, and audio blobs.
- **Vitest + @testing-library/react** — unit/integration testing with JSDOM.
- **fast-check** — property-based testing for WM and VFS invariants.
- **Web Audio API** — music visualization (analyser node) and sound effects.

## Module layout

```
src/
  core/
    wm/            window-manager reducer + types + pure helpers
    vfs/           virtual filesystem operations + types
    calc/          calculator engine (state machine)
    terminal/      command interpreter over VFS
    id.ts          id generation
  state/
    wmStore.ts     Zustand store wrapping wm reducer
    vfsStore.ts
    notesStore.ts
    musicStore.ts
    settingsStore.ts
    persist.ts     IndexedDB persistence middleware + db schema
  apps/
    registry.ts    AppDefinition type + register/getApps
    notes/ explorer/ calculator/ terminal/ music/ assistant/
  ui/
    Desktop.tsx Taskbar.tsx StartMenu.tsx DesktopIcon.tsx
    WindowFrame.tsx CrtOverlay.tsx Clock.tsx ...
  assets/icons/    original SVG icons
  sound/           sound-effect manager + bundled cues
  theme/           tailwind token references, fonts
  main.tsx App.tsx
```

## Core data models

### Window manager

```ts
type WindowId = string;

interface Bounds { x: number; y: number; width: number; height: number; }

interface WindowState {
  id: WindowId;
  appId: string;
  title: string;
  bounds: Bounds;
  prevBounds?: Bounds;   // saved bounds when maximized
  minimized: boolean;
  maximized: boolean;
  zIndex: number;
  // optional per-window app payload (e.g., which note/file is open)
  props?: Record<string, unknown>;
}

interface WmState {
  windows: Record<WindowId, WindowState>;
  order: WindowId[];     // bottom -> top; last is focused
  focusedId: WindowId | null;
  nextZ: number;
  cascadeIndex: number;
  desktop: { width: number; height: number };
  constraints: { minWidth: number; minHeight: number };
}

type WmAction =
  | { type: 'OPEN'; appId: string; title: string; bounds?: Partial<Bounds>; props?: Record<string, unknown> }
  | { type: 'CLOSE'; id: WindowId }
  | { type: 'FOCUS'; id: WindowId }
  | { type: 'MINIMIZE'; id: WindowId }
  | { type: 'RESTORE'; id: WindowId }
  | { type: 'TOGGLE_MAXIMIZE'; id: WindowId }
  | { type: 'MOVE'; id: WindowId; x: number; y: number }
  | { type: 'RESIZE'; id: WindowId; bounds: Partial<Bounds> }
  | { type: 'SET_DESKTOP'; width: number; height: number };
```

The reducer `wmReducer(state, action): WmState` is pure. Invariants it guarantees
(verified by property tests):

- **Focus uniqueness**: at most one window is focused; `focusedId` is either `null` or an
  existing window; the focused window is the last element of `order`.
- **Order integrity**: `order` contains exactly the ids in `windows`, no duplicates.
- **Z monotonicity**: `zIndex` values respect `order` (top window has the highest z).
- **Bounds clamping**: after MOVE/RESIZE the window title bar stays within the desktop and
  width/height ≥ constraints.
- **Maximize/restore**: TOGGLE_MAXIMIZE twice returns to the original bounds.

Cascading placement: new windows without explicit position are placed at
`(baseX + k*offset, baseY + k*offset)` modulo the desktop size, where `k = cascadeIndex`.

### Virtual file system

```ts
type NodeId = string;

interface VfsNodeBase { id: NodeId; name: string; parentId: NodeId | null; createdAt: number; updatedAt: number; }
interface FolderNode extends VfsNodeBase { kind: 'folder'; }
interface FileNode   extends VfsNodeBase { kind: 'file'; contentId?: string; size: number; mime?: string; }
type VfsNode = FolderNode | FileNode;

interface VfsState {
  nodes: Record<NodeId, VfsNode>;   // includes the root (parentId === null)
  rootId: NodeId;
}
```

File content is stored separately (an IndexedDB `content` object store keyed by
`contentId`) so that large blobs (audio) don't bloat the node index. Operations are pure
functions returning a new `VfsState` (or an error):

- `createNode(state, parentId, kind, name)`
- `rename(state, id, name)`
- `remove(state, id)` (removes node and, for folders, all descendants)
- `move(state, id, newParentId)` (rejects moving a folder into its own descendant)
- selectors: `childrenOf`, `pathOf`, `isDescendant`

VFS invariants (property-tested):

- **Single parent / tree**: every non-root node has exactly one parent that exists.
- **Acyclic**: following `parentId` from any node reaches the root without revisiting.
- **No sibling name collisions**.
- **Delete subtree**: after `remove(folder)`, no descendant of that folder remains.
- **Move safety**: `move` never creates a cycle.

### Calculator

A small state machine (pure):

```ts
interface CalcState { display: string; acc: number | null; op: Op | null; pending: boolean; error: boolean; }
function calcReduce(state: CalcState, input: CalcInput): CalcState;
```

Division by zero sets `error: true`; `clear` resets. Keyboard and button inputs both map
to `CalcInput`.

### Terminal

```ts
interface ShellState { cwd: NodeId; history: string[]; }
interface CommandResult { output: string[]; vfs?: VfsState; cwd?: NodeId; cleared?: boolean; }
function runCommand(line: string, ctx: { vfs: VfsState; cwd: NodeId; user: string }): CommandResult;
```

The interpreter tokenizes a line, dispatches to a command table, and returns output plus
any VFS/cwd mutations for the store to apply. It never evals host code.

### Notes

```ts
interface Note { id: string; title: string; body: string; createdAt: number; updatedAt: number; }
```

### Music

```ts
interface Track { id: string; name: string; contentId: string; mime: string; duration?: number; addedAt: number; }
interface MusicState { tracks: Track[]; currentId: string | null; playing: boolean; }
```

Playback uses an `<audio>` element; an `AnalyserNode` taps the element's `MediaElementSource`
to drive a canvas visualizer (bars/oscilloscope). If Web Audio is unavailable, audio still
plays and the visualizer is hidden.

### Settings

```ts
interface Settings {
  crt: boolean;
  reducedMotion: boolean;   // user override; OR'd with prefers-reduced-motion
  sound: boolean;           // default false
  assistant: { enabled: boolean; endpoint?: string; apiKey?: string };
  theme: 'gothic';
}
```

## App registry

```ts
interface AppDefinition {
  id: string;
  name: string;
  Icon: React.FC<{ className?: string }>;   // original SVG icon component
  Component: React.FC<{ windowId: string; props?: Record<string, unknown> }>;
  defaultBounds?: Partial<Bounds>;
  singleton?: boolean;      // if true, focus existing window instead of opening a new one
}

const registry = new Map<string, AppDefinition>();
export function registerApp(def: AppDefinition): void;
export function getApps(): AppDefinition[];
export function getApp(id: string): AppDefinition | undefined;
```

The desktop/start-menu iterate `getApps()`. The window manager stores only `appId`; the
`WindowFrame` looks up the component via the registry. Adding an app = register it; no WM
changes.

## Persistence design

A single IndexedDB database `ghostos` (versioned) with object stores:

- `kv` — small JSON slices (settings, notes list, vfs node index, music track list, wm
  layout snapshot) keyed by slice name.
- `content` — binary/large content (file bodies, audio blobs) keyed by `contentId`.

`persist.ts` exposes `loadSlice(name)`, `saveSlice(name, value)` and content helpers.
Each store subscribes to its own changes and writes a debounced snapshot. On boot, `App`
awaits `hydrateAll()` and shows a boot/loading screen until stores are rehydrated. If
IndexedDB access throws (private mode, disabled), the layer logs once, raises a toast, and
operates purely in memory.

The window manager persists a lightweight layout snapshot (open apps + bounds) so the
desktop can optionally restore the previous session; transient drag state is never
persisted.

## UI and theming

- Tailwind config extends the theme with retro-gothic tokens: a dark bone/charcoal
  palette, blood/amber accents, a pixel display font and a gothic serif for headings,
  thick inset/outset borders to mimic beveled 9x-era chrome.
- `CrtOverlay` is a fixed, pointer-events-none layer with scanlines, vignette, and an
  optional flicker animation. Flicker and other non-essential animations are gated behind
  `!reducedMotion`.
- `WindowFrame` renders a title bar (icon, title, min/max/close), a body slot, and resize
  handles. It is a controlled component driven by `wmStore`; drag/resize use pointer
  events and update the store via `MOVE`/`RESIZE`.
- Responsive: below a breakpoint, windows render maximized/stacked and the taskbar
  collapses; dragging is disabled on coarse pointers.

## Accessibility

- Windows use `role="dialog"` with `aria-label`; opening a window moves focus into it, and
  closing returns focus to the launching control.
- Start menu uses a menu/listbox pattern with arrow-key navigation and Escape to close.
- Desktop icons are a focusable grid (roving tabindex); Enter/Space launches.
- Visible focus rings via Tailwind `focus-visible` utilities, not removed.
- All animation respects `prefers-reduced-motion`; all sound respects the `sound` setting.

## Sound

`sound/sfx.ts` manages a small set of short, bundled cues (synthesized or tiny assets).
`play(cue)` is a no-op when `settings.sound` is false. Cues are triggered on open/close,
clicks, and errors.

## AI assistant (optional, opt-in)

The assistant app shows a disabled state by default with a settings link. When the user
enables it and provides an endpoint/key, requests go directly from the browser to that
user-configured endpoint. No data leaves the browser otherwise. Failures render inline and
never crash the shell. The feature is isolated so the rest of GhostOS has zero network
dependencies.

## Testing strategy

- **Unit (Vitest)**: `calcReduce`, `runCommand`, all VFS ops, WM reducer actions.
- **Property-based (fast-check)**:
  - WM: random action sequences preserve focus uniqueness, order integrity, bounds
    clamping; double maximize is identity on bounds.
  - VFS: random op sequences preserve single-parent/acyclic tree; `remove(folder)` leaves
    no descendants; `move` never creates a cycle; no sibling name collisions.
- **Integration (Vitest + Testing Library)**: stores wired to a fake IndexedDB
  (`fake-indexeddb`) — open/close windows, create/persist/reload notes, VFS round-trip.
- **Scripts**: `typecheck`, `lint`, `test`, `test:watch`, `build`.

## Error handling

- Kernel operations that can fail (VFS rename/move/create) return a discriminated result
  `{ ok: true; state } | { ok: false; error }`; stores surface failures as toasts.
- Persistence failures degrade to in-memory with a one-time notice.
- The music player and assistant guard optional browser APIs and fail soft.
