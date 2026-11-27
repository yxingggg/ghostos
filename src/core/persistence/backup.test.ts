import { describe, it, expect } from 'vitest';
import {
  validateBackup,
  summarizeBackup,
  type BackupFile,
} from './backup';

function makeBackup(overrides: Partial<BackupFile> = {}): BackupFile {
  return {
    version: 1,
    kv: {
      settings: { crt: true, wallpaper: 'graveyard' },
      notes: [{ id: 'n1' }, { id: 'n2' }],
      music: { tracks: [{ id: 't1' }] },
      vfs: {
        rootId: 'root',
        nodes: {
          root: { id: 'root', kind: 'folder', parentId: null, name: '/' },
          d1: { id: 'd1', kind: 'folder', parentId: 'root', name: 'home' },
          f1: { id: 'f1', kind: 'file', parentId: 'd1', name: 'a.txt', contentId: 'c1' },
          f2: { id: 'f2', kind: 'file', parentId: 'd1', name: 'b.md', contentId: 'c2' },
        },
      },
    },
    content: { c1: 'str:hello', c2: 'str:world' },
    ...overrides,
  };
}

describe('validateBackup', () => {
  it('accepts a well-formed backup and preserves its sections', () => {
    const res = validateBackup(makeBackup());
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.backup.kv.settings).toBeDefined();
      expect(Object.keys(res.backup.content)).toEqual(['c1', 'c2']);
    }
  });

  it('accepts a legacy backup with no meta (backward compatible)', () => {
    const legacy = makeBackup();
    const res = validateBackup(legacy);
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.backup.meta).toBeUndefined();
  });

  it('keeps valid meta when present', () => {
    const res = validateBackup(
      makeBackup({ meta: { app: 'GhostOS', appVersion: '0.1.0', createdAt: '2026-11-27T00:00:00Z' } }),
    );
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.backup.meta?.appVersion).toBe('0.1.0');
  });

  it('drops malformed meta but still accepts the backup', () => {
    const res = validateBackup(makeBackup({ meta: { bogus: true } as never }));
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.backup.meta).toBeUndefined();
  });

  it.each([
    [null, 'non-object'],
    [42, 'number'],
    ['nope', 'string'],
    [[], 'array'],
    [{ kv: {}, content: {} }, 'no recognizable slices'],
    [{ kv: { settings: {} }, content: [] }, 'content not an object'],
    [{ content: {} }, 'missing kv'],
    [{ kv: { settings: {} } }, 'missing content'],
  ])('rejects malformed input (%s) before any mutation', (input) => {
    const res = validateBackup(input);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/\S/);
  });

  it('rejects a corrupt vfs slice (nodes not an object)', () => {
    const res = validateBackup({ kv: { vfs: { nodes: 'oops' } }, content: {} });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/filesystem|vfs/i);
  });

  it('rejects a non-string content entry', () => {
    const res = validateBackup({ kv: { settings: {} }, content: { c1: 123 } });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/corrupt/i);
  });

  it('rejects primitive settings', () => {
    const res = validateBackup({ kv: { settings: 5 }, content: {} });
    expect(res.ok).toBe(false);
  });
});

describe('summarizeBackup', () => {
  it('counts files, folders, notes, tracks and reads wallpaper (not the root folder)', () => {
    const s = summarizeBackup(makeBackup());
    expect(s.files).toBe(2); // f1, f2
    expect(s.folders).toBe(1); // d1 (root folder excluded)
    expect(s.notes).toBe(2);
    expect(s.tracks).toBe(1);
    expect(s.wallpaper).toBe('graveyard');
    expect(s.contentItems).toBe(2);
  });

  it('surfaces createdAt and appVersion from meta when present', () => {
    const s = summarizeBackup(
      makeBackup({ meta: { app: 'GhostOS', appVersion: '0.1.0', createdAt: '2026-11-27T00:00:00Z' } }),
    );
    expect(s.createdAt).toBe('2026-11-27T00:00:00Z');
    expect(s.appVersion).toBe('0.1.0');
  });

  it('reports nulls/zeros for an empty-but-valid backup', () => {
    const s = summarizeBackup({ version: 1, kv: { settings: {} }, content: {} });
    expect(s).toMatchObject({
      files: 0,
      folders: 0,
      notes: 0,
      tracks: 0,
      wallpaper: null,
      contentItems: 0,
      createdAt: null,
      appVersion: null,
    });
  });

  it('tolerates notes stored as a bare array or as { notes: [...] }', () => {
    const asArray = summarizeBackup({ version: 1, kv: { settings: {}, notes: [{ id: 'a' }] }, content: {} });
    expect(asArray.notes).toBe(1);
    const asObject = summarizeBackup({
      version: 1,
      kv: { settings: {}, notes: { notes: [{ id: 'a' }, { id: 'b' }] } },
      content: {},
    });
    expect(asObject.notes).toBe(2);
  });
});
