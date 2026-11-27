import { describe, it, expect, beforeEach } from 'vitest';
import {
  __resetPersistenceForTests,
  exportAll,
  getContent,
  importAll,
  loadSlice,
  putContent,
  saveSlice,
} from './persist';

describe('persistence (fake-indexeddb)', () => {
  beforeEach(() => {
    __resetPersistenceForTests();
  });

  it('round-trips a KV slice', async () => {
    await saveSlice('notes', [{ id: 'n1', title: 'hi' }]);
    const loaded = await loadSlice<Array<{ id: string }>>('notes');
    expect(loaded).toEqual([{ id: 'n1', title: 'hi' }]);
  });

  it('returns undefined for a missing slice', async () => {
    expect(await loadSlice('music')).toBeUndefined();
  });

  it('round-trips string content', async () => {
    await putContent('c1', 'the body');
    expect(await getContent('c1')).toBe('the body');
  });

  it('round-trips binary content', async () => {
    const buf = new Uint8Array([1, 2, 3, 250]).buffer;
    await putContent('bin', buf);
    const out = await getContent('bin');
    expect(out).toBeInstanceOf(ArrayBuffer);
    expect(new Uint8Array(out as ArrayBuffer)).toEqual(new Uint8Array([1, 2, 3, 250]));
  });

  it('round-trips a Blob through export/import, including empty MIME type', async () => {
    const bytes = new Uint8Array([9, 8, 7, 255, 0]);
    await putContent('blobEmptyMime', new Blob([bytes], { type: '' }));
    await putContent('blobTyped', new Blob([bytes], { type: 'audio/mpeg' }));
    const dump = await exportAll();

    __resetPersistenceForTests();
    await importAll(dump);

    const a = await getContent('blobEmptyMime');
    const b = await getContent('blobTyped');
    expect(a).toBeInstanceOf(Blob);
    expect(b).toBeInstanceOf(Blob);
    expect(new Uint8Array(await (a as Blob).arrayBuffer())).toEqual(bytes);
    expect(new Uint8Array(await (b as Blob).arrayBuffer())).toEqual(bytes);
    expect((b as Blob).type).toBe('audio/mpeg');
  });

  it('ignores unknown kv keys on import', async () => {
    await importAll({ kv: { settings: { crt: false }, bogus: 123 }, content: {} });
    expect(await loadSlice('settings')).toEqual({ crt: false });
    expect(await loadSlice('bogus' as never)).toBeUndefined();
  });

  it('exports and re-imports the whole database', async () => {
    await saveSlice('settings', { crt: true });
    await putContent('blob1', 'payload');
    const dump = await exportAll();

    __resetPersistenceForTests();
    expect(await loadSlice('settings')).toBeUndefined();

    await importAll(dump);
    expect(await loadSlice('settings')).toEqual({ crt: true });
    expect(await getContent('blob1')).toBe('payload');
  });
});
