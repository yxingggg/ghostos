// Window Manager — pure reducer.
// Guarantees the invariants documented in design.md:
//  - focus uniqueness (focusedId is null or an existing window, and is last in order)
//  - order integrity (order === keys(windows), no duplicates)
//  - z monotonicity (zIndex order matches `order`)
//  - bounds clamping (title bar stays reachable; size >= constraints)
//  - maximize/restore round-trips to original bounds

import {
  Bounds,
  DEFAULT_CONSTRAINTS,
  DEFAULT_WINDOW_SIZE,
  Desktop,
  WindowId,
  WindowState,
  WmAction,
  WmState,
} from './types';

export const CASCADE_OFFSET = 28;
const CASCADE_BASE = { x: 64, y: 48 };
/** Minimum visible slice of a window kept on-screen when clamping. */
const MIN_VISIBLE = 48;
const TITLEBAR_HEIGHT = 32;

export function createInitialState(
  desktop: Desktop = { width: 1024, height: 768 },
  constraints = DEFAULT_CONSTRAINTS,
): WmState {
  return {
    windows: {},
    order: [],
    focusedId: null,
    nextZ: 1,
    cascadeIndex: 0,
    desktop,
    constraints,
  };
}

function clampSize(
  bounds: Bounds,
  desktop: Desktop,
  c: { minWidth: number; minHeight: number },
): Bounds {
  // A window must be at least the minimum size, but must also never exceed the
  // desktop (so it stays usable on narrow/mobile viewports). When the desktop
  // is smaller than the minimum, the desktop wins so the window still fits.
  const maxWidth = Math.max(1, Math.round(desktop.width));
  const maxHeight = Math.max(1, Math.round(desktop.height));
  return {
    ...bounds,
    width: Math.min(maxWidth, Math.max(c.minWidth, Math.round(bounds.width))),
    height: Math.min(maxHeight, Math.max(c.minHeight, Math.round(bounds.height))),
  };
}

/**
 * Clamp a window's position so that at least a MIN_VISIBLE slice of it, and the
 * title bar, remain reachable within the desktop. Width/height are not altered here.
 *
 * When the window fully fits within the desktop (width/height ≤ desktop), its
 * right/bottom edge is additionally kept on-screen so it never overflows the
 * viewport — important on narrow/mobile layouts where a window is capped to the
 * desktop width and should sit flush rather than hang off the edge. Oversized
 * windows (larger than the desktop) keep the MIN_VISIBLE slide-off behavior.
 */
export function clampPosition(bounds: Bounds, desktop: Desktop): Bounds {
  const fitsX = bounds.width <= desktop.width;
  const fitsY = bounds.height <= desktop.height;
  const maxX = fitsX ? desktop.width - bounds.width : desktop.width - MIN_VISIBLE;
  const maxY = fitsY ? desktop.height - bounds.height : desktop.height - TITLEBAR_HEIGHT;
  const minX = fitsX ? 0 : MIN_VISIBLE - bounds.width;
  const minY = 0;
  return {
    ...bounds,
    x: Math.min(maxX, Math.max(minX, Math.round(bounds.x))),
    y: Math.min(maxY, Math.max(minY, Math.round(bounds.y))),
  };
}

function clampBounds(
  bounds: Bounds,
  desktop: Desktop,
  c: { minWidth: number; minHeight: number },
): Bounds {
  return clampPosition(clampSize(bounds, desktop, c), desktop);
}

function reindexZ(state: WmState): WmState {
  // Reassign z-index so it strictly matches `order` (bottom -> top).
  const windows: Record<WindowId, WindowState> = {};
  state.order.forEach((id, i) => {
    const w = state.windows[id];
    if (w) windows[id] = { ...w, zIndex: i + 1 };
  });
  return { ...state, windows, nextZ: state.order.length + 1 };
}

function focus(state: WmState, id: WindowId): WmState {
  if (!state.windows[id]) return state;
  const order = [...state.order.filter((w) => w !== id), id];
  const next = reindexZ({ ...state, order, focusedId: id });
  const w = next.windows[id];
  if (w && w.minimized) {
    next.windows[id] = { ...w, minimized: false };
  }
  return next;
}

function nextCascadeBounds(state: WmState, size: { width: number; height: number }): Bounds {
  const k = state.cascadeIndex;
  const spanX = Math.max(1, state.desktop.width - size.width - CASCADE_BASE.x);
  const spanY = Math.max(1, state.desktop.height - size.height - CASCADE_BASE.y);
  const x = CASCADE_BASE.x + ((k * CASCADE_OFFSET) % spanX);
  const y = CASCADE_BASE.y + ((k * CASCADE_OFFSET) % spanY);
  return { x, y, width: size.width, height: size.height };
}

function maximizedBounds(desktop: Desktop): Bounds {
  return { x: 0, y: 0, width: desktop.width, height: desktop.height };
}

export function wmReducer(state: WmState, action: WmAction): WmState {
  switch (action.type) {
    case 'OPEN': {
      if (state.windows[action.id]) {
        // Id collision: treat as focus to keep OPEN idempotent.
        return focus(state, action.id);
      }
      const size = {
        width: action.bounds?.width ?? DEFAULT_WINDOW_SIZE.width,
        height: action.bounds?.height ?? DEFAULT_WINDOW_SIZE.height,
      };
      const hasPos = action.bounds?.x !== undefined && action.bounds?.y !== undefined;
      const rawBounds: Bounds = hasPos
        ? {
            x: action.bounds?.x ?? 0,
            y: action.bounds?.y ?? 0,
            width: size.width,
            height: size.height,
          }
        : nextCascadeBounds(state, size);
      const bounds = clampBounds(rawBounds, state.desktop, state.constraints);
      const win: WindowState = {
        id: action.id,
        appId: action.appId,
        title: action.title,
        bounds,
        minimized: false,
        maximized: false,
        zIndex: state.order.length + 1,
        ...(action.props ? { props: action.props } : {}),
      };
      const withWin: WmState = {
        ...state,
        windows: { ...state.windows, [action.id]: win },
        order: [...state.order, action.id],
        cascadeIndex: hasPos ? state.cascadeIndex : state.cascadeIndex + 1,
      };
      return focus(withWin, action.id);
    }

    case 'CLOSE': {
      if (!state.windows[action.id]) return state;
      const windows = { ...state.windows };
      delete windows[action.id];
      const order = state.order.filter((w) => w !== action.id);
      const focusedId =
        state.focusedId === action.id ? (order[order.length - 1] ?? null) : state.focusedId;
      return reindexZ({ ...state, windows, order, focusedId });
    }

    case 'FOCUS':
      return focus(state, action.id);

    case 'MINIMIZE': {
      const w = state.windows[action.id];
      if (!w) return state;
      const windows = { ...state.windows, [action.id]: { ...w, minimized: true } };
      // Focus passes to the next non-minimized window from the top.
      let focusedId: WindowId | null = null;
      for (let i = state.order.length - 1; i >= 0; i -= 1) {
        const id = state.order[i];
        if (id && id !== action.id && !windows[id]?.minimized) {
          focusedId = id;
          break;
        }
      }
      return { ...state, windows, focusedId };
    }

    case 'RESTORE': {
      const w = state.windows[action.id];
      if (!w) return state;
      return focus(state, action.id);
    }

    case 'TOGGLE_MAXIMIZE': {
      const w = state.windows[action.id];
      if (!w) return state;
      let updated: WindowState;
      if (w.maximized) {
        const restore = w.prevBounds ?? w.bounds;
        updated = {
          ...w,
          bounds: clampBounds(restore, state.desktop, state.constraints),
          maximized: false,
        };
        delete updated.prevBounds;
      } else {
        updated = {
          ...w,
          prevBounds: w.bounds,
          bounds: maximizedBounds(state.desktop),
          maximized: true,
        };
      }
      const withUpdate: WmState = { ...state, windows: { ...state.windows, [action.id]: updated } };
      return focus(withUpdate, action.id);
    }

    case 'MOVE': {
      const w = state.windows[action.id];
      if (!w || w.maximized) return state;
      const moved = clampPosition(
        { ...w.bounds, x: action.x, y: action.y },
        state.desktop,
      );
      return { ...state, windows: { ...state.windows, [action.id]: { ...w, bounds: moved } } };
    }

    case 'RESIZE': {
      const w = state.windows[action.id];
      if (!w || w.maximized) return state;
      const merged: Bounds = {
        x: action.bounds.x ?? w.bounds.x,
        y: action.bounds.y ?? w.bounds.y,
        width: action.bounds.width ?? w.bounds.width,
        height: action.bounds.height ?? w.bounds.height,
      };
      const resized = clampBounds(merged, state.desktop, state.constraints);
      return { ...state, windows: { ...state.windows, [action.id]: { ...w, bounds: resized } } };
    }

    case 'SET_DESKTOP': {
      const desktop: Desktop = { width: action.width, height: action.height };
      const windows: Record<WindowId, WindowState> = {};
      for (const id of state.order) {
        const w = state.windows[id];
        if (!w) continue;
        if (w.maximized) {
          windows[id] = { ...w, bounds: maximizedBounds(desktop) };
        } else {
          windows[id] = { ...w, bounds: clampBounds(w.bounds, desktop, state.constraints) };
        }
      }
      return { ...state, desktop, windows };
    }

    default: {
      // Exhaustiveness guard.
      const _never: never = action;
      return _never;
    }
  }
}
