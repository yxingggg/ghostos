import { describe, it, expect } from 'vitest';
import { createId, createSeededIdFactory } from './id';

describe('createId', () => {
  it('applies the given prefix', () => {
    expect(createId('win')).toMatch(/^win_/);
  });

  it('produces distinct ids across many calls', () => {
    const ids = new Set(Array.from({ length: 1000 }, () => createId('x')));
    expect(ids.size).toBe(1000);
  });
});

describe('createSeededIdFactory', () => {
  it('is deterministic and monotonic', () => {
    const next = createSeededIdFactory('n');
    expect(next()).toBe('n_1');
    expect(next()).toBe('n_2');
    expect(next()).toBe('n_3');
  });
});
