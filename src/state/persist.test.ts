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

  it('round-trips a Blob through export/import, including empty MIME type', async () => {
    const bytes = new Uint8Array([9, 8, 7, 255, 0]);
    await putContent('blobEmptyMime', new Blob([bytes], { type: '' }));
    await putContent('blobTyped', new Blob([bytes], { type: 'audio/mpeg' }));
    const dump = await exportAll();

    await __resetPersistenceForTests();
    await importAll(dump);

    const a = await getContent('blobEmptyMime');
    const b = await getContent('blobTyped');
    // Bytes must survive the export/import round-trip for both MIME cases.
    expect(await toBytes(a)).toEqual(bytes);
    expect(await toBytes(b)).toEqual(bytes);
    // When the engine preserves Blobs, the typed MIME must be retained.
    if (Object.prototype.toString.call(b) === '[object Blob]') {
      expect((b as Blob).type).toBe('audio/mpeg');
    }
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
});
