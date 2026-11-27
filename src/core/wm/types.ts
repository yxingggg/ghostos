// Window Manager — domain types.
// Pure data model; no React/DOM dependencies.

export type WindowId = string;

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface WindowState {
  id: WindowId;
  appId: string;
  title: string;
  bounds: Bounds;
  /** Saved bounds captured when the window was maximized, used for restore. */
  prevBounds?: Bounds;
  minimized: boolean;
  maximized: boolean;
  zIndex: number;
  /** Optional per-window payload for the hosted app (e.g. which note is open). */
  props?: Record<string, unknown>;
}

export interface WmConstraints {
  minWidth: number;
  minHeight: number;
}

export interface Desktop {
  width: number;
  height: number;
}

export interface WmState {
  windows: Record<WindowId, WindowState>;
  /** Stacking order, bottom -> top. The last entry is the focused window. */
  order: WindowId[];
  focusedId: WindowId | null;
  /** Next z-index to assign; monotonically increasing. */
  nextZ: number;
  /** Rolling counter driving cascade placement of new windows. */
  cascadeIndex: number;
  desktop: Desktop;
  constraints: WmConstraints;
}

export type WmAction =
  | {
      type: 'OPEN';
      id: WindowId;
      appId: string;
      title: string;
      bounds?: Partial<Bounds>;
      props?: Record<string, unknown>;
    }
  | { type: 'CLOSE'; id: WindowId }
  | { type: 'FOCUS'; id: WindowId }
  | { type: 'MINIMIZE'; id: WindowId }
  | { type: 'RESTORE'; id: WindowId }
  | { type: 'TOGGLE_MAXIMIZE'; id: WindowId }
  | { type: 'MOVE'; id: WindowId; x: number; y: number }
  | { type: 'RESIZE'; id: WindowId; bounds: Partial<Bounds> }
  | { type: 'SET_DESKTOP'; width: number; height: number };

export const DEFAULT_CONSTRAINTS: WmConstraints = {
  minWidth: 240,
  minHeight: 160,
};

export const DEFAULT_WINDOW_SIZE = { width: 520, height: 380 };
