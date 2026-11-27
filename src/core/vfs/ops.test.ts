import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  childrenOf,
  createNode,
  createVfs,
  isDescendant,
  move,
  pathOf,
  remove,
  rename,
  type Clock,
} from './ops';
import { NodeId, VfsNode, VfsState } from './types';

const clock: Clock = { now: () => 1000 };

function mkRoot(): VfsState {
  return createVfs('root', clock);
}

function mkFolder(state: VfsState, parent: NodeId, id: string, name: string): VfsState {
  const r = createNode(state, parent, name, { id, kind: 'folder' }, clock);
  if (!r.ok) throw new Error(r.error);
  return r.value;
}

function mkFile(state: VfsState, parent: NodeId, id: string, name: string): VfsState {
  const r = createNode(state, parent, name, { id, kind: 'file' }, clock);
  if (!r.ok) throw new Error(r.error);
  return r.value;
}

describe('vfs ops — create', () => {
  it('creates folders and files under a folder', () => {
    let s = mkRoot();
    s = mkFolder(s, 'root', 'docs', 'docs');
    s = mkFile(s, 'docs', 'f1', 'readme.txt');
    expect(childrenOf(s, 'root').map((n) => n.id)).toEqual(['docs']);
    expect(childrenOf(s, 'docs').map((n) => n.name)).toEqual(['readme.txt']);
  });

  it('rejects duplicate sibling names', () => {
    let s = mkRoot();
    s = mkFolder(s, 'root', 'a', 'same');
    const r = createNode(s, 'root', 'same', { id: 'b', kind: 'folder' }, clock);
    expect(r.ok).toBe(false);
  });

  it('rejects empty names and names with slashes', () => {
    const s = mkRoot();
    expect(createNode(s, 'root', '   ', { id: 'x', kind: 'file' }, clock).ok).toBe(false);
    expect(createNode(s, 'root', 'a/b', { id: 'y', kind: 'file' }, clock).ok).toBe(false);
  });

  it('rejects creating under a file or missing parent', () => {
    let s = mkRoot();
    s = mkFile(s, 'root', 'f', 'file');
    expect(createNode(s, 'f', 'child', { id: 'c', kind: 'file' }, clock).ok).toBe(false);
    expect(createNode(s, 'nope', 'child', { id: 'd', kind: 'file' }, clock).ok).toBe(false);
  });
});

describe('vfs ops — rename', () => {
  it('renames a node', () => {
    let s = mkRoot();
    s = mkFile(s, 'root', 'f', 'old.txt');
    const r = rename(s, 'f', 'new.txt', clock);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.nodes.f?.name).toBe('new.txt');
  });

  it('rejects rename causing sibling collision and rejects renaming root', () => {
    let s = mkRoot();
    s = mkFile(s, 'root', 'a', 'a.txt');
    s = mkFile(s, 'root', 'b', 'b.txt');
    expect(rename(s, 'b', 'a.txt', clock).ok).toBe(false);
    expect(rename(s, 'root', 'x', clock).ok).toBe(false);
  });
});

describe('vfs ops — remove (subtree)', () => {
  it('removes a folder and all descendants', () => {
    let s = mkRoot();
    s = mkFolder(s, 'root', 'd', 'd');
    s = mkFolder(s, 'd', 'd2', 'd2');
    s = mkFile(s, 'd2', 'deep', 'deep.txt');
    const r = remove(s, 'd');
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.nodes.d).toBeUndefined();
      expect(r.value.nodes.d2).toBeUndefined();
      expect(r.value.nodes.deep).toBeUndefined();
      expect(r.value.nodes.root).toBeDefined();
    }
  });

  it('refuses to remove root', () => {
    expect(remove(mkRoot(), 'root').ok).toBe(false);
  });
});

describe('vfs ops — move', () => {
  it('reparents a node', () => {
    let s = mkRoot();
    s = mkFolder(s, 'root', 'a', 'a');
    s = mkFolder(s, 'root', 'b', 'b');
    s = mkFile(s, 'a', 'f', 'f.txt');
    const r = move(s, 'f', 'b', clock);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.nodes.f?.parentId).toBe('b');
  });

  it('rejects moving a folder into its own descendant', () => {
    let s = mkRoot();
    s = mkFolder(s, 'root', 'a', 'a');
    s = mkFolder(s, 'a', 'a1', 'a1');
    expect(move(s, 'a', 'a1', clock).ok).toBe(false);
    expect(move(s, 'a', 'a', clock).ok).toBe(false);
  });
});

describe('vfs ops — selectors', () => {
  it('pathOf returns root-to-node chain', () => {
    let s = mkRoot();
    s = mkFolder(s, 'root', 'a', 'a');
    s = mkFile(s, 'a', 'f', 'f.txt');
    expect(pathOf(s, 'f').map((n) => n.id)).toEqual(['root', 'a', 'f']);
  });

  it('isDescendant detects ancestry', () => {
    let s = mkRoot();
    s = mkFolder(s, 'root', 'a', 'a');
    s = mkFolder(s, 'a', 'a1', 'a1');
    expect(isDescendant(s, 'a', 'a1')).toBe(true);
    expect(isDescendant(s, 'a1', 'a')).toBe(false);
  });
});

// ---------- Property-based invariants ----------

type Op =
  | { kind: 'create'; folder: boolean }
  | { kind: 'remove' }
  | { kind: 'move' }
  | { kind: 'rename' };

function allIds(s: VfsState): NodeId[] {
  return Object.keys(s.nodes);
}

function folderIds(s: VfsState): NodeId[] {
  return Object.values(s.nodes)
    .filter((n) => n.kind === 'folder')
    .map((n) => n.id);
}

function assertTreeInvariants(s: VfsState): void {
  // single parent + acyclic: every node reaches root
  for (const node of Object.values(s.nodes)) {
    if (node.parentId === null) {
      expect(node.id).toBe(s.rootId);
      continue;
    }
    // parent exists
    expect(s.nodes[node.parentId]).toBeDefined();
    // reaches root without cycle
    let cur: NodeId | null = node.id;
    const seen = new Set<NodeId>();
    let reachedRoot = false;
    while (cur !== null) {
      if (seen.has(cur)) break;
      seen.add(cur);
      const n: VfsNode | undefined = s.nodes[cur];
      if (!n) break;
      if (n.parentId === null) {
        reachedRoot = n.id === s.rootId;
        break;
      }
      cur = n.parentId;
    }
    expect(reachedRoot).toBe(true);
  }
  // no sibling name collisions
  const byParent = new Map<NodeId, Set<string>>();
  for (const node of Object.values(s.nodes)) {
    if (node.parentId === null) continue;
    const set = byParent.get(node.parentId) ?? new Set<string>();
    expect(set.has(node.name)).toBe(false);
    set.add(node.name);
    byParent.set(node.parentId, set);
  }
}

describe('vfs ops — invariants (property-based)', () => {
  it('maintains tree invariants across random op sequences', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.oneof(
            fc.record({ kind: fc.constant<'create'>('create'), folder: fc.boolean() }),
            fc.record({ kind: fc.constant<'remove'>('remove') }),
            fc.record({ kind: fc.constant<'move'>('move') }),
            fc.record({ kind: fc.constant<'rename'>('rename') }),
          ) as fc.Arbitrary<Op>,
          { minLength: 0, maxLength: 60 },
        ),
        fc.array(fc.nat(10000), { minLength: 60, maxLength: 60 }),
        (ops, picks) => {
          let s = mkRoot();
          let seq = 0;
          ops.forEach((op, i) => {
            const pick = picks[i] ?? 0;
            if (op.kind === 'create') {
              const folders = folderIds(s);
              const parent = folders[pick % folders.length] ?? s.rootId;
              seq += 1;
              const r = createNode(
                s,
                parent,
                `n${seq}`,
                { id: `id${seq}`, kind: op.folder ? 'folder' : 'file' },
                clock,
              );
              if (r.ok) s = r.value;
            } else if (op.kind === 'remove') {
              const ids = allIds(s).filter((id) => id !== s.rootId);
              if (ids.length) {
                const r = remove(s, ids[pick % ids.length] as NodeId);
                if (r.ok) s = r.value;
              }
            } else if (op.kind === 'move') {
              const ids = allIds(s).filter((id) => id !== s.rootId);
              const folders = folderIds(s);
              if (ids.length && folders.length) {
                const r = move(
                  s,
                  ids[pick % ids.length] as NodeId,
                  folders[(pick + 1) % folders.length] as NodeId,
                  clock,
                );
                if (r.ok) s = r.value;
              }
            } else {
              const ids = allIds(s).filter((id) => id !== s.rootId);
              if (ids.length) {
                seq += 1;
                const r = rename(s, ids[pick % ids.length] as NodeId, `r${seq}`, clock);
                if (r.ok) s = r.value;
              }
            }
            assertTreeInvariants(s);
          });
          assertTreeInvariants(s);
        },
      ),
      { numRuns: 150 },
    );
  });

  it('remove(folder) leaves no descendants', () => {
    let s = mkRoot();
    s = mkFolder(s, 'root', 'a', 'a');
    s = mkFolder(s, 'a', 'b', 'b');
    s = mkFile(s, 'b', 'c', 'c.txt');
    const r = remove(s, 'a');
    expect(r.ok).toBe(true);
    if (r.ok) {
      for (const id of ['a', 'b', 'c']) expect(r.value.nodes[id]).toBeUndefined();
    }
  });

  it('move never creates a cycle', () => {
    fc.assert(
      fc.property(fc.integer({ min: 2, max: 6 }), (depth) => {
        let s = mkRoot();
        let parent = 'root';
        const chain: string[] = [];
        for (let i = 0; i < depth; i += 1) {
          const id = `c${i}`;
          s = mkFolder(s, parent, id, `c${i}`);
          chain.push(id);
          parent = id;
        }
        // Attempt to move the top of the chain under its deepest descendant.
        const top = chain[0] as string;
        const bottom = chain[chain.length - 1] as string;
        const r = move(s, top, bottom, clock);
        expect(r.ok).toBe(false);
      }),
      { numRuns: 50 },
    );
  });
});
