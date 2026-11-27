// Persistence layer — IndexedDB via `idb`, with an in-memory fallback.
// Two object stores:
//   kv      — small JSON slices (settings, notes, vfs node index, music list, wm layout)
//   content — large/binary blobs (file bodies, audio) keyed by contentId

import { openDB, type IDBPDatabase } from 'idb';

const DB_NAME = 'ghostos';
const DB_VERSION = 1;
const KV_STORE = 'kv';
const CONTENT_STORE = 'content';

export type SliceName =
  | 'settings'
  | 'notes'
  | 'vfs'
  | 'music'
  | 'wm-layout';

interface GhostDB {
  kv: Map<string, unknown>;
  content: Map<string, Blob | ArrayBuffer | string>;
}

// In-memory fallback store used when IndexedDB is unavailable.
const memory: GhostDB = { kv: new Map(), content: new Map() };

let dbPromise: Promise<IDBPDatabase | null> | null = null;
let degraded = false;
let noticeShown = false;
let onDegrade: ((reason: string) => void) | null = null;

/** Register a callback invoked once if persistence degrades to memory-only. */
export function setPersistenceNoticeHandler(cb: (reason: string) => void): void {
  onDegrade = cb;
  if (degraded && !noticeShown) {
    noticeShown = true;
    cb('Storage unavailable — running in memory only. Changes will not be saved.');
  }
}

function markDegraded(reason: string): void {
  degraded = true;
  if (!noticeShown && onDegrade) {
    noticeShown = true;
    onDegrade(reason);
  }
}

export function isDegraded(): boolean {
  return degraded;
}

async function getDB(): Promise<IDBPDatabase | null> {
  if (degraded) return null;
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(KV_STORE)) db.createObjectStore(KV_STORE);
        if (!db.objectStoreNames.contains(CONTENT_STORE)) db.createObjectStore(CONTENT_STORE);
      },
    }).catch((e: unknown) => {
      markDegraded(e instanceof Error ? e.message : 'IndexedDB unavailable');
      return null;
    });
  }
  return dbPromise;
}

export async function loadSlice<T>(name: SliceName): Promise<T | undefined> {
  try {
    const db = await getDB();
    if (!db) return memory.kv.get(name) as T | undefined;
    return (await db.get(KV_STORE, name)) as T | undefined;
  } catch (e) {
    markDegraded(e instanceof Error ? e.message : 'read failed');
    return memory.kv.get(name) as T | undefined;
  }
}

export async function saveSlice<T>(name: SliceName, value: T): Promise<void> {
  memory.kv.set(name, value);
  try {
    const db = await getDB();
    if (!db) return;
    await db.put(KV_STORE, value, name);
  } catch (e) {
    markDegraded(e instanceof Error ? e.message : 'write failed');
  }
}

export async function getContent(
  id: string,
): Promise<Blob | ArrayBuffer | string | undefined> {
  try {
    const db = await getDB();
    if (!db) return memory.content.get(id);
    return (await db.get(CONTENT_STORE, id)) as Blob | ArrayBuffer | string | undefined;
  } catch (e) {
    markDegraded(e instanceof Error ? e.message : 'read failed');
    return memory.content.get(id);
  }
}

export async function putContent(
  id: string,
  value: Blob | ArrayBuffer | string,
): Promise<void> {
  memory.content.set(id, value);
  try {
    const db = await getDB();
    if (!db) return;
    await db.put(CONTENT_STORE, value, id);
  } catch (e) {
    markDegraded(e instanceof Error ? e.message : 'write failed');
  }
}

export async function deleteContent(id: string): Promise<void> {
  memory.content.delete(id);
  try {
    const db = await getDB();
    if (!db) return;
    await db.delete(CONTENT_STORE, id);
  } catch (e) {
    markDegraded(e instanceof Error ? e.message : 'delete failed');
  }
}

/** Export the full KV + content database as a plain JSON-serializable object. */
export async function exportAll(): Promise<{
  version: number;
  kv: Record<string, unknown>;
  content: Record<string, string>;
}> {
  const kv: Record<string, unknown> = {};
  const content: Record<string, string> = {};
  const db = await getDB();
  if (db) {
    for (const key of await db.getAllKeys(KV_STORE)) {
      kv[String(key)] = await db.get(KV_STORE, key);
    }
    for (const key of await db.getAllKeys(CONTENT_STORE)) {
      const value = await db.get(CONTENT_STORE, key);
      content[String(key)] = await serializeContent(value);
    }
  } else {
    for (const [k, v] of memory.kv) kv[k] = v;
    for (const [k, v] of memory.content) content[k] = await serializeContent(v);
  }
  return { version: DB_VERSION, kv, content };
}

/** Import a previously exported database, replacing current slices/content. */
export async function importAll(data: {
  kv: Record<string, unknown>;
  content: Record<string, string>;
}): Promise<void> {
  const known: readonly SliceName[] = ['settings', 'notes', 'vfs', 'music', 'wm-layout'];
  for (const [k, v] of Object.entries(data.kv)) {
    // Only import recognized slice names; ignore unknown keys from a tampered file.
    if ((known as readonly string[]).includes(k)) {
      await saveSlice(k as SliceName, v);
    }
  }
  for (const [k, v] of Object.entries(data.content)) {
    if (typeof v === 'string') await putContent(k, deserializeContent(v));
  }
}

async function serializeContent(value: unknown): Promise<string> {
  // Encode blobs/buffers as base64 data so export is pure JSON.
  if (typeof value === 'string') return `str:${value}`;
  if (value instanceof ArrayBuffer) return `b64:${bufferToBase64(value)}`;
  if (value instanceof Blob) {
    const buf = await value.arrayBuffer();
    return `blob:${value.type}:${bufferToBase64(buf)}`;
  }
  return 'str:';
}

function deserializeContent(value: string): Blob | ArrayBuffer | string {
  if (value.startsWith('str:')) return value.slice(4);
  if (value.startsWith('b64:')) return base64ToBuffer(value.slice(4));
  if (value.startsWith('blob:')) {
    const rest = value.slice(5);
    // Format is `blob:<mime>:<base64>`. MIME never contains ':' and base64 never
    // contains ':', so the first colon unambiguously ends the (possibly empty)
    // MIME type. Guard a malformed string with no colon.
    const sep = rest.indexOf(':');
    if (sep === -1) return new Blob([base64ToBuffer(rest)]);
    const type = rest.slice(0, sep);
    const buf = base64ToBuffer(rest.slice(sep + 1));
    return new Blob([buf], { type });
  }
  return value;
}

function bufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i] as number);
  return btoa(binary);
}

function base64ToBuffer(b64: string): ArrayBuffer {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

/** Test-only: reset the in-memory fallback and cached db handle. */
export function __resetPersistenceForTests(): void {
  memory.kv.clear();
  memory.content.clear();
  dbPromise = null;
  degraded = false;
  noticeShown = false;
  onDegrade = null;
}
