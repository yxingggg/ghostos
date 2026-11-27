import { describe, it, expect, beforeEach } from 'vitest';
import {
  __resetPersistenceForTests,
  blobToArrayBuffer,
  exportAll,
  freezeWrites,
  getContent,
  importAll,
  isFrozen,
  loadSlice,
  putContent,
  saveSlice,
} from './persist';

/**
 * Normalize any binary representation the storage engine may return to bytes.
 * Uses structural tags, not `instanceof`, because fake-indexeddb can return
 * values from a different realm where `instanceof` is unreliable.
 */
async function toBytes(value: unknown): Promise<Uint8Array> {
  const tag = Object.prototype.toString.call(value);
  if (tag === '[object Blob]' || (value && typeof (value as Blob).arrayBuffer === 'function' && 'type' in (value as object))) {
    return new Uint8Array(await (value as Blob).arrayBuffer());
  }
  if (tag === '[object ArrayBuffer]') return new Uint8Array(value as ArrayBuffer);
  if (ArrayBuffer.isView(value as ArrayBufferView)) {
    const v = value as ArrayBufferView;
    return new Uint8Array(v.buffer, v.byteOffset, v.byteLength);
  }
  throw new Error(`Expected binary content, got: ${tag} (${String(value)})`);
}

describe('persistence (fake-indexeddb)', () => {
  beforeEach(async () => {
    await __resetPersistenceForTests();
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
    // The storage engine may hand binary back as an ArrayBuffer, a typed-array
    // view, or a Blob; what matters is the bytes survive intact.
    expect(await toBytes(out)).toEqual(new Uint8Array([1, 2, 3, 250]));
  });

  it('round-trips binary content through export/import', async () => {
    // Binary content is stored as ArrayBuffer (the form the stores convert to).
    // This asserts the raw bytes, including high/zero bytes, survive a full
    // export/import cycle intact.
    const bytes = new Uint8Array([9, 8, 7, 255, 0]);
    await putContent('audioA', bytes.buffer);
    await putContent('audioB', new Uint8Array([0, 128, 200, 1]).buffer);
    const dump = await exportAll();

    await __resetPersistenceForTests();
    await importAll(dump);

    expect(await toBytes(await getContent('audioA'))).toEqual(bytes);
    expect(await toBytes(await getContent('audioB'))).toEqual(new Uint8Array([0, 128, 200, 1]));
  });

  it('blobToArrayBuffer reads bytes via the native arrayBuffer() path', async () => {
    const bytes = new Uint8Array([1, 2, 3, 4, 250]);
    // A minimal Blob-like object exposing the native arrayBuffer() method,
    // which real browsers provide (jsdom does not, hence this focused test).
    const blobLike = {
      type: 'application/octet-stream',
      arrayBuffer: async () => bytes.buffer,
    } as unknown as Blob;
    const out = await blobToArrayBuffer(blobLike);
    expect(new Uint8Array(out)).toEqual(bytes);
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

    await __resetPersistenceForTests();
    expect(await loadSlice('settings')).toBeUndefined();

    await importAll(dump);
    expect(await loadSlice('settings')).toEqual({ crt: true });
    expect(await getContent('blob1')).toBe('payload');
  });

  it('exportAll includes provenance meta (app, version, timestamp)', async () => {
    await saveSlice('settings', { crt: true });
    const dump = await exportAll();
    expect(dump.meta).toBeDefined();
    expect(typeof dump.meta.app).toBe('string');
    expect(typeof dump.meta.appVersion).toBe('string');
    expect(() => new Date(dump.meta.createdAt).toISOString()).not.toThrow();
  });

  it('imports a legacy backup that has no meta field (backward compatible)', async () => {
    // A pre-meta export shape: only version/kv/content.
    const legacy = { version: 1, kv: { settings: { crt: false } }, content: { c: 'str:hi' } };
    await importAll(legacy);
    expect(await loadSlice('settings')).toEqual({ crt: false });
    expect(await getContent('c')).toBe('hi');
  });

  it('importAll reports success (true) when all writes are durable', async () => {
    const ok = await importAll({ kv: { settings: { crt: true } }, content: { c: 'str:x' } });
    expect(ok).toBe(true);
  });

  describe('write freeze after restore (stale-write safety)', () => {
    it('freezeWrites stops saveSlice/putContent from mutating storage', async () => {
      await saveSlice('settings', { wallpaper: 'restored' });
      await putContent('blobR', 'restored-bytes');

      freezeWrites();
      expect(isFrozen()).toBe(true);

      // A stale autosave attempt after restore must NOT overwrite restored data
      // and must report not-durable (false).
      const sliceOk = await saveSlice('settings', { wallpaper: 'STALE' });
      const contentOk = await putContent('blobR', 'STALE-bytes');
      expect(sliceOk).toBe(false);
      expect(contentOk).toBe(false);

      // Storage still holds the restored values, untouched by the frozen writes.
      expect(await loadSlice('settings')).toEqual({ wallpaper: 'restored' });
      expect(await getContent('blobR')).toBe('restored-bytes');
    });

    it('a reset clears the freeze so later sessions can write again', async () => {
      freezeWrites();
      expect(isFrozen()).toBe(true);
      await __resetPersistenceForTests();
      expect(isFrozen()).toBe(false);
      expect(await saveSlice('settings', { crt: true })).toBe(true);
    });
  });
});
