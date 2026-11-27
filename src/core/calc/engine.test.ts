import { describe, it, expect } from 'vitest';
import { CalcInput, calcReduce, initialCalcState, keyToInput } from './engine';

function run(inputs: CalcInput[]): string {
  let s = initialCalcState;
  for (const i of inputs) s = calcReduce(s, i);
  return s.display;
}

const d = (value: string): CalcInput => ({ type: 'digit', value });
const op = (value: '+' | '-' | '*' | '/'): CalcInput => ({ type: 'op', value });
const eq: CalcInput = { type: 'equals' };

describe('calcReduce — arithmetic', () => {
  it('adds', () => {
    expect(run([d('2'), op('+'), d('3'), eq])).toBe('5');
  });
  it('subtracts', () => {
    expect(run([d('9'), op('-'), d('4'), eq])).toBe('5');
  });
  it('multiplies', () => {
    expect(run([d('6'), op('*'), d('7'), eq])).toBe('42');
  });
  it('divides', () => {
    expect(run([d('8'), op('/'), d('2'), eq])).toBe('4');
  });
  it('chains operations left-to-right', () => {
    expect(run([d('2'), op('+'), d('3'), op('*'), d('4'), eq])).toBe('20');
  });
  it('handles decimals', () => {
    expect(run([d('1'), { type: 'dot' }, d('5'), op('+'), d('2'), { type: 'dot' }, d('5'), eq])).toBe(
      '4',
    );
  });
});

describe('calcReduce — edge cases', () => {
  it('division by zero yields an error state', () => {
    let s = initialCalcState;
    for (const i of [d('5'), op('/'), d('0'), eq]) s = calcReduce(s, i);
    expect(s.error).toBe(true);
    expect(s.display).toBe('Error');
  });

  it('ignores input while in error state except clear', () => {
    let s = initialCalcState;
    for (const i of [d('5'), op('/'), d('0'), eq, d('9')]) s = calcReduce(s, i);
    expect(s.error).toBe(true);
    s = calcReduce(s, { type: 'clear' });
    expect(s).toEqual(initialCalcState);
  });

  it('clear resets to zero', () => {
    expect(run([d('1'), d('2'), { type: 'clear' }])).toBe('0');
  });

  it('sign toggles negativity', () => {
    expect(run([d('5'), { type: 'sign' }])).toBe('-5');
    expect(run([d('5'), { type: 'sign' }, { type: 'sign' }])).toBe('5');
  });

  it('backspace deletes the last digit', () => {
    expect(run([d('1'), d('2'), d('3'), { type: 'backspace' }])).toBe('12');
    expect(run([d('5'), { type: 'backspace' }])).toBe('0');
  });

  it('equals with no pending op is a no-op', () => {
    expect(run([d('7'), eq])).toBe('7');
  });

  it('operator change before right operand keeps the left operand', () => {
    expect(run([d('6'), op('+'), op('*'), d('2'), eq])).toBe('12');
  });
});

describe('keyToInput', () => {
  it('maps digits, operators and controls', () => {
    expect(keyToInput('7')).toEqual({ type: 'digit', value: '7' });
    expect(keyToInput('/')).toEqual({ type: 'op', value: '/' });
    expect(keyToInput('Enter')).toEqual({ type: 'equals' });
    expect(keyToInput('Escape')).toEqual({ type: 'clear' });
    expect(keyToInput('x')).toBeNull();
  });
});
