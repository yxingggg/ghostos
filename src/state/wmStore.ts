import { create } from 'zustand';
import { createId } from '../core/id';
import { createInitialState, wmReducer } from '../core/wm/reducer';
import type { Bounds, WindowId, WindowState, WmState } from '../core/wm/types';

interface OpenOptions {
  appId: string;
  title: string;
  bounds?: Partial<Bounds>;
  props?: Record<string, unknown>;
  /** If true, focus an existing window of this app instead of opening a new one. */
  singleton?: boolean;
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
}

export const useWm = create<WmStore>((set, get) => ({
  state: createInitialState(),
  open: (opts) => {
    const { state } = get();
    if (opts.singleton) {
      const existing = Object.values(state.windows).find((w) => w.appId === opts.appId);
      if (existing) {
        set({ state: wmReducer(state, { type: 'FOCUS', id: existing.id }) });
        return existing.id;
      }
    }
    const id = createId('win');
    set({
      state: wmReducer(state, {
        type: 'OPEN',
        id,
        appId: opts.appId,
        title: opts.title,
        ...(opts.bounds ? { bounds: opts.bounds } : {}),
        ...(opts.props ? { props: opts.props } : {}),
      }),
    });
    return id;
  },
  close: (id) => set({ state: wmReducer(get().state, { type: 'CLOSE', id }) }),
  focus: (id) => set({ state: wmReducer(get().state, { type: 'FOCUS', id }) }),
  minimize: (id) => set({ state: wmReducer(get().state, { type: 'MINIMIZE', id }) }),
  restore: (id) => set({ state: wmReducer(get().state, { type: 'RESTORE', id }) }),
  toggleMaximize: (id) =>
    set({ state: wmReducer(get().state, { type: 'TOGGLE_MAXIMIZE', id }) }),
  move: (id, x, y) => set({ state: wmReducer(get().state, { type: 'MOVE', id, x, y }) }),
  resize: (id, bounds) => set({ state: wmReducer(get().state, { type: 'RESIZE', id, bounds }) }),
  setDesktop: (width, height) =>
    set({ state: wmReducer(get().state, { type: 'SET_DESKTOP', width, height }) }),
  windowsInOrder: () => {
    const { state } = get();
    return state.order.map((id) => state.windows[id]).filter((w): w is WindowState => !!w);
  },
}));
