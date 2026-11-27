import { describe, it, expect } from 'vitest';
import { createNode, createVfs } from '../../core/vfs/ops';
import type { Clock } from '../../core/vfs/ops';
import { nodeProperties } from './PropertiesDialog';

const clock: Clock = { now: () => 42 };

describe('nodeProperties', () => {
  it('reports file properties with path, type and size', () => {
    let s = createVfs('root', clock);
    const dir = createNode(s, 'root', 'docs', { id: 'd', kind: 'folder' }, clock);
    if (dir.ok) s = dir.value;
    const file = createNode(
      s,
      'd',
      'note.txt',
      { id: 'f', kind: 'file', mime: 'text/plain', size: 12 },
      clock,
    );
    if (file.ok) s = file.value;

    const info = nodeProperties(s, 'f');
    expect(info).not.toBeNull();
    expect(info?.kind).toBe('file');
    expect(info?.name).toBe('note.txt');
    expect(info?.path).toBe('/docs/note.txt');
    expect(info?.size).toBe(12);
    expect(info?.type).toBe('text/plain');
  });

  it('reports folder properties with child count', () => {
    let s = createVfs('root', clock);
    const dir = createNode(s, 'root', 'docs', { id: 'd', kind: 'folder' }, clock);
    if (dir.ok) s = dir.value;
    const a = createNode(s, 'd', 'a.txt', { id: 'a', kind: 'file' }, clock);
    if (a.ok) s = a.value;
    const b = createNode(s, 'd', 'b.txt', { id: 'b', kind: 'file' }, clock);
    if (b.ok) s = b.value;

    const info = nodeProperties(s, 'd');
    expect(info?.kind).toBe('folder');
    expect(info?.childCount).toBe(2);
    expect(info?.path).toBe('/docs');
  });

  it('returns null for a missing node', () => {
    const s = createVfs('root', clock);
    expect(nodeProperties(s, 'nope')).toBeNull();
  });
});
