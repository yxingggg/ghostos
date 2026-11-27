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

  it('round-trips Blob bytes through export/import (stored as ArrayBuffer)', async () => {
    // Blobs are normalized to ArrayBuffer at the storage layer; callers that
    // need a MIME type retain it separately (e.g. the music store's Track).
    // This test asserts the raw bytes survive a full export/import cycle for
    // both empty and non-empty source MIME types.
    const bytes = new Uint8Array([9, 8, 7, 255, 0]);
    await putContent('blobEmptyMime', new Blob([bytes], { type: '' }));
    await putContent('blobTyped', new Blob([bytes], { type: 'audio/mpeg' }));
    const dump = await exportAll();

    await __resetPersistenceForTests();
    await importAll(dump);

    expect(await toBytes(await getContent('blobEmptyMime'))).toEqual(bytes);
    expect(await toBytes(await getContent('blobTyped'))).toEqual(bytes);
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
