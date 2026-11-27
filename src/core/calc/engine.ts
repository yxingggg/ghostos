// Calculator — pure state machine.
// Supports + - * / over decimals, clear, sign toggle, percent, and backspace.
// Division by zero yields an error state instead of throwing.

export type Op = '+' | '-' | '*' | '/';

export interface CalcState {
  /** The currently displayed string. */
  display: string;
  /** The stored left-hand operand, or null before the first operator. */
  acc: number | null;
  /** The pending operator awaiting a right operand, or null. */
  op: Op | null;
  /** True when the next digit should start a fresh operand. */
  pending: boolean;
  /** True when the machine is in an error state. */
  error: boolean;
}

export type CalcInput =
  | { type: 'digit'; value: string } // '0'..'9'
  | { type: 'dot' }
  | { type: 'op'; value: Op }
  | { type: 'equals' }
  | { type: 'clear' }
  | { type: 'sign' }
  | { type: 'percent' }
  | { type: 'backspace' };

export const initialCalcState: CalcState = {
  display: '0',
  acc: null,
  op: null,
  pending: false,
  error: false,
};

function toNumber(display: string): number {
  const n = Number(display);
  return Number.isFinite(n) ? n : 0;
}

function format(n: number): string {
  if (!Number.isFinite(n)) return 'Error';
  // Trim floating noise while keeping reasonable precision.
  const rounded = Math.round((n + Number.EPSILON) * 1e10) / 1e10;
  return String(rounded);
}

function apply(a: number, op: Op, b: number): number | null {
  switch (op) {
    case '+':
      return a + b;
    case '-':
      return a - b;
    case '*':
      return a * b;
    case '/':
      return b === 0 ? null : a / b;
    default: {
      const _never: never = op;
      return _never;
    }
  }
}

export function calcReduce(state: CalcState, input: CalcInput): CalcState {
  // Any key except clear on an error state is ignored.
  if (state.error && input.type !== 'clear') return state;

  switch (input.type) {
    case 'clear':
      return { ...initialCalcState };

    case 'digit': {
      if (state.pending || state.display === '0') {
        return { ...state, display: input.value, pending: false };
      }
      if (state.display.replace('-', '').replace('.', '').length >= 15) return state;
      return { ...state, display: state.display + input.value };
    }

    case 'dot': {
      if (state.pending) return { ...state, display: '0.', pending: false };
      if (state.display.includes('.')) return state;
      return { ...state, display: state.display + '.' };
    }

    case 'sign': {
      if (state.display === '0') return state;
      const flipped = state.display.startsWith('-')
        ? state.display.slice(1)
        : `-${state.display}`;
      return { ...state, display: flipped };
    }

    case 'percent': {
      const value = toNumber(state.display) / 100;
      return { ...state, display: format(value), pending: true };
    }

    case 'backspace': {
      if (state.pending) return state;
      const next = state.display.length > 1 ? state.display.slice(0, -1) : '0';
      return { ...state, display: next === '-' ? '0' : next };
    }

    case 'op': {
      const current = toNumber(state.display);
      if (state.acc === null) {
        return { ...state, acc: current, op: input.value, pending: true };
      }
      if (state.pending) {
        // Operator change before entering the right operand.
        return { ...state, op: input.value };
      }
      const result = apply(state.acc, state.op as Op, current);
      if (result === null) {
        return { ...initialCalcState, display: 'Error', error: true };
      }
      return {
        ...state,
        acc: result,
        op: input.value,
        display: format(result),
        pending: true,
      };
    }

    case 'equals': {
      if (state.op === null || state.acc === null) return state;
      const current = toNumber(state.display);
      const result = apply(state.acc, state.op, current);
      if (result === null) {
        return { ...initialCalcState, display: 'Error', error: true };
      }
      return {
        ...initialCalcState,
        display: format(result),
      };
    }

    default: {
      const _never: never = input;
      return _never;
    }
  }
}

/** Map a keyboard key to a CalcInput, or null if unmapped. */
export function keyToInput(key: string): CalcInput | null {
  if (key >= '0' && key <= '9') return { type: 'digit', value: key };
  switch (key) {
    case '.':
      return { type: 'dot' };
    case '+':
      return { type: 'op', value: '+' };
    case '-':
      return { type: 'op', value: '-' };
    case '*':
      return { type: 'op', value: '*' };
    case '/':
      return { type: 'op', value: '/' };
    case '=':
    case 'Enter':
      return { type: 'equals' };
    case 'Escape':
    case 'c':
    case 'C':
      return { type: 'clear' };
    case '%':
      return { type: 'percent' };
    case 'Backspace':
      return { type: 'backspace' };
    default:
      return null;
  }
}
