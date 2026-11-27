import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  createInitialState,
  wmReducer,
  clampPosition,
} from './reducer';
import { Bounds, WindowId, WmAction, WmState } from './types';

const desktop = { width: 1024, height: 768 };

function open(state: WmState, id: string, bounds?: Partial<Bounds>): WmState {
  return wmReducer(state, { type: 'OPEN', id, appId: 'app', title: id, ...(bounds ? { bounds } : {}) });
}

describe('wmReducer — lifecycle', () => {
  it('OPEN creates a focused window and appends to order', () => {
    const s = open(createInitialState(desktop), 'w1');
    expect(Object.keys(s.windows)).toEqual(['w1']);
    expect(s.order).toEqual(['w1']);
    expect(s.focusedId).toBe('w1');
    expect(s.windows.w1?.minimized).toBe(false);
  });

  it('OPEN with duplicate id focuses instead of duplicating', () => {
    let s = open(createInitialState(desktop), 'w1');
    s = open(s, 'w2');
    s = open(s, 'w1'); // duplicate
    expect(s.order).toEqual(['w2', 'w1']);
    expect(s.focusedId).toBe('w1');
  });

  it('cascades new windows so positions differ', () => {
    let s = createInitialState(desktop);
    s = open(s, 'a');
    s = open(s, 'b');
    expect(s.windows.a?.bounds.x).not.toBe(s.windows.b?.bounds.x);
  });

  it('CLOSE removes the window and transfers focus to top of remaining', () => {
    let s = createInitialState(desktop);
    s = open(s, 'a');
    s = open(s, 'b');
    s = open(s, 'c'); // focused
    s = wmReducer(s, { type: 'CLOSE', id: 'c' });
    expect(s.windows.c).toBeUndefined();
    expect(s.focusedId).toBe('b');
  });

  it('CLOSE last window leaves focus null', () => {
    let s = open(createInitialState(desktop), 'a');
    s = wmReducer(s, { type: 'CLOSE', id: 'a' });
    expect(s.focusedId).toBeNull();
    expect(s.order).toEqual([]);
  });

  it('MINIMIZE hides and moves focus to next visible window', () => {
    let s = createInitialState(desktop);
    s = open(s, 'a');
    s = open(s, 'b'); // focused
    s = wmReducer(s, { type: 'MINIMIZE', id: 'b' });
    expect(s.windows.b?.minimized).toBe(true);
    expect(s.focusedId).toBe('a');
  });

  it('RESTORE un-minimizes and focuses', () => {
    let s = open(createInitialState(desktop), 'a');
    s = wmReducer(s, { type: 'MINIMIZE', id: 'a' });
    s = wmReducer(s, { type: 'RESTORE', id: 'a' });
    expect(s.windows.a?.minimized).toBe(false);
    expect(s.focusedId).toBe('a');
  });
});

describe('wmReducer — focus & z-order', () => {
  it('FOCUS raises a window to the top and gives highest z', () => {
    let s = createInitialState(desktop);
    s = open(s, 'a');
    s = open(s, 'b');
    s = wmReducer(s, { type: 'FOCUS', id: 'a' });
    expect(s.order[s.order.length - 1]).toBe('a');
    expect(s.windows.a?.zIndex).toBeGreaterThan(s.windows.b?.zIndex ?? 0);
  });
});

describe('wmReducer — maximize / move / resize', () => {
  it('TOGGLE_MAXIMIZE fills desktop and restores original bounds', () => {
    let s = open(createInitialState(desktop), 'a', { x: 100, y: 120, width: 400, height: 300 });
    const original = { ...s.windows.a!.bounds };
    s = wmReducer(s, { type: 'TOGGLE_MAXIMIZE', id: 'a' });
    expect(s.windows.a?.maximized).toBe(true);
    expect(s.windows.a?.bounds).toEqual({ x: 0, y: 0, width: 1024, height: 768 });
    s = wmReducer(s, { type: 'TOGGLE_MAXIMIZE', id: 'a' });
    expect(s.windows.a?.maximized).toBe(false);
    expect(s.windows.a?.bounds).toEqual(original);
  });

  it('MOVE is ignored while maximized', () => {
    let s = open(createInitialState(desktop), 'a');
    s = wmReducer(s, { type: 'TOGGLE_MAXIMIZE', id: 'a' });
    const before = { ...s.windows.a!.bounds };
    s = wmReducer(s, { type: 'MOVE', id: 'a', x: 500, y: 500 });
    expect(s.windows.a?.bounds).toEqual(before);
  });

  it('RESIZE enforces minimum size', () => {
    let s = open(createInitialState(desktop), 'a');
    s = wmReducer(s, { type: 'RESIZE', id: 'a', bounds: { width: 10, height: 10 } });
    expect(s.windows.a!.bounds.width).toBeGreaterThanOrEqual(s.constraints.minWidth);
    expect(s.windows.a!.bounds.height).toBeGreaterThanOrEqual(s.constraints.minHeight);
  });

  it('MOVE clamps so the title bar stays reachable', () => {
    let s = open(createInitialState(desktop), 'a');
    s = wmReducer(s, { type: 'MOVE', id: 'a', x: 99999, y: 99999 });
    const b = s.windows.a!.bounds;
    expect(b.x).toBeLessThanOrEqual(desktop.width);
    expect(b.y).toBeLessThanOrEqual(desktop.height);
  });

  it('SET_DESKTOP keeps maximized windows full-size', () => {
    let s = open(createInitialState(desktop), 'a');
    s = wmReducer(s, { type: 'TOGGLE_MAXIMIZE', id: 'a' });
    s = wmReducer(s, { type: 'SET_DESKTOP', width: 800, height: 600 });
    expect(s.windows.a?.bounds).toEqual({ x: 0, y: 0, width: 800, height: 600 });
  });
});

// ---------- Property-based tests (invariants) ----------

type ArbAction = WmAction;

function actionArb(ids: WindowId[]): fc.Arbitrary<ArbAction> {
  const idArb = ids.length ? fc.constantFrom(...ids) : fc.constant('w0');
  const coord = fc.integer({ min: -2000, max: 4000 });
  const dim = fc.integer({ min: 1, max: 3000 });
  return fc.oneof(
    fc.record({
      type: fc.constant<'OPEN'>('OPEN'),
      id: fc.string({ minLength: 1, maxLength: 4 }).map((s) => `w_${s}`),
      appId: fc.constant('app'),
      title: fc.constant('t'),
    }),
    fc.record({ type: fc.constant<'CLOSE'>('CLOSE'), id: idArb }),
    fc.record({ type: fc.constant<'FOCUS'>('FOCUS'), id: idArb }),
    fc.record({ type: fc.constant<'MINIMIZE'>('MINIMIZE'), id: idArb }),
    fc.record({ type: fc.constant<'RESTORE'>('RESTORE'), id: idArb }),
    fc.record({ type: fc.constant<'TOGGLE_MAXIMIZE'>('TOGGLE_MAXIMIZE'), id: idArb }),
    fc.record({ type: fc.constant<'MOVE'>('MOVE'), id: idArb, x: coord, y: coord }),
    fc.record({
      type: fc.constant<'RESIZE'>('RESIZE'),
      id: idArb,
      bounds: fc.record({ width: dim, height: dim }),
    }),
  );
}

function checkInvariants(s: WmState): void {
  const keys = Object.keys(s.windows).sort();
  const order = [...s.order].sort();
  // order integrity
  expect(order).toEqual(keys);
  expect(new Set(s.order).size).toBe(s.order.length);
  // focus uniqueness: the focused id must reference a live window, and a
  // focused non-minimized window must be the topmost *non-minimized* window
  // (minimized windows may legitimately sit above it in the stacking order).
  if (s.focusedId !== null) {
    const focused = s.windows[s.focusedId];
    expect(focused).toBeDefined();
    if (focused && !focused.minimized) {
      const topVisible = [...s.order]
        .reverse()
        .find((id) => !s.windows[id]?.minimized);
      expect(s.focusedId).toBe(topVisible);
    }
  }
  // z monotonicity + bounds clamping
  s.order.forEach((id, i) => {
    const w = s.windows[id];
    expect(w).toBeDefined();
    if (!w) return;
    expect(w.zIndex).toBe(i + 1);
    expect(w.bounds.width).toBeGreaterThanOrEqual(s.constraints.minWidth);
    expect(w.bounds.height).toBeGreaterThanOrEqual(s.constraints.minHeight);
    // title bar reachable
    expect(w.bounds.x).toBeLessThanOrEqual(s.desktop.width);
    expect(w.bounds.y).toBeLessThanOrEqual(s.desktop.height);
  });
}

describe('wmReducer — invariants (property-based)', () => {
  it('preserves invariants across random action sequences', () => {
    fc.assert(
      fc.property(
        fc.array(fc.string({ minLength: 1, maxLength: 3 }), { minLength: 1, maxLength: 5 }),
        fc.array(fc.nat(7), { minLength: 0, maxLength: 40 }),
        (seedIds, rawActions) => {
          let s = createInitialState(desktop);
          const ids = seedIds.map((x, i) => `w${i}_${x}`);
          for (const id of ids) s = open(s, id);
          // Drive a random stream of actions referencing live ids.
          const rng = fc.sample(actionArb(Object.keys(s.windows)), rawActions.length + 1);
          for (const a of rng) {
            s = wmReducer(s, a);
            checkInvariants(s);
          }
          checkInvariants(s);
        },
      ),
      { numRuns: 200 },
    );
  });

  it('double TOGGLE_MAXIMIZE returns original bounds', () => {
    fc.assert(
      fc.property(
        fc.record({
          x: fc.integer({ min: 0, max: 900 }),
          y: fc.integer({ min: 0, max: 600 }),
          width: fc.integer({ min: 240, max: 900 }),
          height: fc.integer({ min: 160, max: 600 }),
        }),
        (b) => {
          let s = open(createInitialState(desktop), 'a', b);
          const original = { ...s.windows.a!.bounds };
          s = wmReducer(s, { type: 'TOGGLE_MAXIMIZE', id: 'a' });
          s = wmReducer(s, { type: 'TOGGLE_MAXIMIZE', id: 'a' });
          expect(s.windows.a?.bounds).toEqual(original);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('clampPosition keeps x/y within reachable range', () => {
    fc.assert(
      fc.property(
        fc.record({
          x: fc.integer({ min: -5000, max: 5000 }),
          y: fc.integer({ min: -5000, max: 5000 }),
          width: fc.integer({ min: 240, max: 1200 }),
          height: fc.integer({ min: 160, max: 900 }),
        }),
        (b) => {
          const c = clampPosition(b, desktop);
          expect(c.x).toBeLessThanOrEqual(desktop.width);
          expect(c.y).toBeGreaterThanOrEqual(0);
          expect(c.y).toBeLessThanOrEqual(desktop.height);
        },
      ),
      { numRuns: 200 },
    );
  });
});
