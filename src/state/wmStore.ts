import { create } from 'zustand';
import { createId } from '../core/id';
import { createInitialState, wmReducer } from '../core/wm/reducer';
import type { Bounds, WindowId, WindowState, WmState } from '../core/wm/types';
import { loadSlice, saveSlice } from './persist';

interface OpenOptions {
  appId: string;
  title: string;
  bounds?: Partial<Bounds>;
  props?: Record<string, unknown>;
  /** If true, focus an existing window of this app instead of opening a new one. */
  singleton?: boolean;
}

/** Lightweight, serializable snapshot of the open windows for session restore. */
interface LayoutWindow {
  appId: string;
  title: string;
  bounds: Bounds;
  minimized: boolean;
  maximized: boolean;
  props?: Record<string, unknown>;
}
interface WmLayout {
  windows: LayoutWindow[];
}

interface WmStore {
  state: WmState;
  open: (opts: OpenOptions) => WindowId;
  close: (id: WindowId) => void;
  focus: (id: WindowId) => void;
  minimize: (id: WindowId) => void;
  restore: (id: WindowId) => void;
  toggleMaximize: (id: WindowId) => void;
  move: (id: WindowId, x: number, y: number) => void;
  resize: (id: WindowId, bounds: Partial<Bounds>) => void;
  setDesktop: (width: number, height: number) => void;
  windowsInOrder: () => WindowState[];
  /** Restore a previously persisted window layout. */
  hydrate: () => Promise<void>;
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;

function persistLayout(state: WmState): void {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const layout: WmLayout = {
      windows: state.order.flatMap((id) => {
        const w = state.windows[id];
        if (!w) return [];
        return [
          {
            appId: w.appId,
            title: w.title,
            bounds: w.bounds,
            minimized: w.minimized,
            maximized: w.maximized,
            ...(w.props ? { props: w.props } : {}),
          },
        ];
      }),
    };
    void saveSlice('wm-layout', layout);
  }, 400);
}

export const useWm = create<WmStore>((set, get) => {
  // Apply an action, then persist the resulting layout (debounced).
  const apply = (next: WmState): void => {
    set({ state: next });
    persistLayout(next);
  };

  return {
    state: createInitialState(),
    open: (opts) => {
      const { state } = get();
      if (opts.singleton) {
        const existing = Object.values(state.windows).find((w) => w.appId === opts.appId);
        if (existing) {
          apply(wmReducer(state, { type: 'FOCUS', id: existing.id }));
          return existing.id;
        }
      }
      const id = createId('win');
      apply(
        wmReducer(state, {
          type: 'OPEN',
          id,
          appId: opts.appId,
          title: opts.title,
          ...(opts.bounds ? { bounds: opts.bounds } : {}),
          ...(opts.props ? { props: opts.props } : {}),
        }),
      );
      return id;
    },
    close: (id) => apply(wmReducer(get().state, { type: 'CLOSE', id })),
    focus: (id) => apply(wmReducer(get().state, { type: 'FOCUS', id })),
    minimize: (id) => apply(wmReducer(get().state, { type: 'MINIMIZE', id })),
    restore: (id) => apply(wmReducer(get().state, { type: 'RESTORE', id })),
    toggleMaximize: (id) => apply(wmReducer(get().state, { type: 'TOGGLE_MAXIMIZE', id })),
    move: (id, x, y) => apply(wmReducer(get().state, { type: 'MOVE', id, x, y })),
    resize: (id, bounds) => apply(wmReducer(get().state, { type: 'RESIZE', id, bounds })),
    setDesktop: (width, height) =>
      // Desktop size changes are not persisted as layout; just update state.
      set({ state: wmReducer(get().state, { type: 'SET_DESKTOP', width, height }) }),
    windowsInOrder: () => {
      const { state } = get();
      return state.order.map((id) => state.windows[id]).filter((w): w is WindowState => !!w);
    },
    hydrate: async () => {
      const layout = await loadSlice<WmLayout>('wm-layout');
      if (!layout || layout.windows.length === 0) return;
      let next = get().state;
      for (const w of layout.windows) {
        const id = createId('win');
        next = wmReducer(next, {
          type: 'OPEN',
          id,
          appId: w.appId,
          title: w.title,
          bounds: w.bounds,
          ...(w.props ? { props: w.props } : {}),
        });
        if (w.maximized) next = wmReducer(next, { type: 'TOGGLE_MAXIMIZE', id });
        if (w.minimized) next = wmReducer(next, { type: 'MINIMIZE', id });
      }
      set({ state: next });
    },
  };
});
