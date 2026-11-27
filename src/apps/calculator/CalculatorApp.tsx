import { useEffect, useReducer } from 'react';
import type { AppComponentProps } from '../registry';
import {
  CalcInput,
  calcReduce,
  initialCalcState,
  keyToInput,
} from '../../core/calc/engine';
import { useWm } from '../../state/wmStore';

const layout: Array<{ label: string; input: CalcInput; span?: boolean; accent?: boolean }> = [
  { label: 'C', input: { type: 'clear' } },
  { label: '±', input: { type: 'sign' } },
  { label: '%', input: { type: 'percent' } },
  { label: '÷', input: { type: 'op', value: '/' }, accent: true },
  { label: '7', input: { type: 'digit', value: '7' } },
  { label: '8', input: { type: 'digit', value: '8' } },
  { label: '9', input: { type: 'digit', value: '9' } },
  { label: '×', input: { type: 'op', value: '*' }, accent: true },
  { label: '4', input: { type: 'digit', value: '4' } },
  { label: '5', input: { type: 'digit', value: '5' } },
  { label: '6', input: { type: 'digit', value: '6' } },
  { label: '−', input: { type: 'op', value: '-' }, accent: true },
  { label: '1', input: { type: 'digit', value: '1' } },
  { label: '2', input: { type: 'digit', value: '2' } },
  { label: '3', input: { type: 'digit', value: '3' } },
  { label: '+', input: { type: 'op', value: '+' }, accent: true },
  { label: '0', input: { type: 'digit', value: '0' }, span: true },
  { label: '.', input: { type: 'dot' } },
  { label: '=', input: { type: 'equals' }, accent: true },
];

export function CalculatorApp({ windowId }: AppComponentProps) {
  const [state, dispatch] = useReducer(calcReduce, initialCalcState);
  const focusedId = useWm((s) => s.state.focusedId);

  useEffect(() => {
    // Only consume keyboard input when this calculator window is focused, so
    // typing doesn't leak between windows.
    if (focusedId !== windowId) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      // Let text inputs elsewhere keep their keystrokes.
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
      const input = keyToInput(e.key);
      if (input) {
        e.preventDefault();
        dispatch(input);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [focusedId, windowId]);

  return (
    <div className="flex h-full flex-col bg-crypt-800 p-3">
      <output
        aria-live="polite"
        className={[
          'mb-3 flex h-16 items-center justify-end rounded-sm border border-crypt-500 bg-crypt-900 px-3 font-pixel text-4xl bevel-out',
          state.error ? 'text-blood-500' : 'text-spectral-500',
        ].join(' ')}
      >
        {state.display}
      </output>
      <div className="grid flex-1 grid-cols-4 gap-1.5">
        {layout.map((btn) => (
          <button
            key={btn.label}
            type="button"
            aria-label={btn.label}
            onClick={() => dispatch(btn.input)}
            className={[
              'rounded-sm border font-pixel text-2xl bevel-out active:translate-y-px',
              btn.span ? 'col-span-2' : '',
              btn.accent
                ? 'border-amethyst-600 bg-amethyst-600/40 text-bone-100 hover:bg-amethyst-600/60'
                : 'border-crypt-500 bg-crypt-700 text-bone-100 hover:bg-crypt-600',
            ].join(' ')}
          >
            {btn.label}
          </button>
        ))}
      </div>
    </div>
  );
}
