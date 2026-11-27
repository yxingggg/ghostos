// Persistence layer — IndexedDB via `idb`, with an in-memory fallback.
// Two object stores:
//   kv      — small JSON slices (settings, notes, vfs node index, music list, wm layout)
//   content — large/binary blobs (file bodies, audio) keyed by contentId

import { openDB, type IDBPDatabase } from 'idb';
import { APP_NAME, APP_VERSION } from '../version';

const DB_NAME = 'ghostos';
const DB_VERSION = 1;
const KV_STORE = 'kv';
const CONTENT_STORE = 'content';

export type SliceName =
  | 'settings'
  | 'notes'
  | 'vfs'
  | 'music'
  | 'wm-layout'
  | 'welcome';

// Content is stored only as ArrayBuffer (binary) or string (text). Blobs are
// converted to ArrayBuffer by callers before storage, because Blobs do not
// round-trip reliably across all IndexedDB implementations. Callers that need a
// Blob reconstruct one from their own retained MIME type.
type StoredContent = ArrayBuffer | string;

interface GhostDB {
  kv: Map<string, unknown>;
  content: Map<string, StoredContent>;
}

// In-memory fallback store used when IndexedDB is unavailable.
const memory: GhostDB = { kv: new Map(), content: new Map() };

let dbPromise: Promise<IDBPDatabase | null> | null = null;
let degraded = false;
let noticeShown = false;
let onDegrade: ((reason: string) => void) | null = null;

// Once a workspace restore succeeds, writes are FROZEN until the page reloads.
// This prevents stale in-flight writes — a pending debounced autosave (editor,
// notes, wm-layout) or any live store action in this tab — from clobbering the
// freshly-restored database in the window between "restore complete" and the
// user clicking "Enter restored workspace" (which reloads). The flag is
// per-realm; see freezeWrites() for the cross-tab limitation.
let frozen = false;

/**
 * Permanently stop this tab from writing to persistence until reload. Called by
 * the restore flow AFTER importAll succeeds, so no stale write can overwrite the
 * restored data. Frozen writes become no-ops that report "not durable" (false),
 * so callers surface an honest status rather than a false success.
 *
 * Limitation: the flag lives in this JS realm only. It cannot stop a SECOND open
 * GhostOS tab, whose stores share the same IndexedDB. Restoring while other tabs
 * are open is therefore not guaranteed safe across tabs — the UI warns about this.
 */
export function freezeWrites(): void {
  frozen = true;
}

export function isFrozen(): boolean {
  return frozen;
}

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

/**
 * Persist a KV slice. Returns true when it was durably written to IndexedDB,
 * false when only the in-memory fallback holds it (storage unavailable), so
 * callers can surface an honest "not durably saved" state instead of lying.
 */
export async function saveSlice<T>(name: SliceName, value: T): Promise<boolean> {
  // After a restore, refuse writes so a stale autosave can't clobber the
  // restored workspace before reload. Report not-durable (false).
  if (frozen) return false;
  memory.kv.set(name, value);
  try {
    const db = await getDB();
    if (!db) return false;
    await db.put(KV_STORE, value, name);
    return true;
  } catch (e) {
    markDegraded(e instanceof Error ? e.message : 'write failed');
    return false;
  }
}

export async function getContent(
  id: string,
): Promise<StoredContent | undefined> {
  try {
    const db = await getDB();
    if (!db) return memory.content.get(id);
    return (await db.get(CONTENT_STORE, id)) as StoredContent | undefined;
  } catch (e) {
    markDegraded(e instanceof Error ? e.message : 'read failed');
    return memory.content.get(id);
  }
}

/** Store content. Returns true if durably written to IndexedDB, false if only in memory. */
export async function putContent(id: string, value: StoredContent): Promise<boolean> {
  if (frozen) return false; // frozen after restore — see freezeWrites()
  memory.content.set(id, value);
  try {
    const db = await getDB();
    if (!db) return false;
    await db.put(CONTENT_STORE, value, id);
    return true;
  } catch (e) {
    markDegraded(e instanceof Error ? e.message : 'write failed');
    return false;
  }
}

/**
 * Read a Blob's bytes portably. Prefer the native Blob.arrayBuffer(); otherwise
 * use FileReader. (The Response wrapper is intentionally avoided: some jsdom
 * builds don't accept a jsdom Blob as a BodyInit and stringify it instead.)
 */
export async function blobToArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
  if (typeof blob.arrayBuffer === 'function') {
    const buf = await blob.arrayBuffer();
    // Guard against environments whose arrayBuffer() returns a view.
    return buf instanceof ArrayBuffer
      ? buf
      : (buf as ArrayBufferView).buffer.slice(0);
  }
  if (typeof FileReader !== 'undefined') {
    return new Promise<ArrayBuffer>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = () => reject(reader.error ?? new Error('read failed'));
      reader.readAsArrayBuffer(blob);
    });
  }
  // Last resort: text round-trip (loses binary fidelity, but avoids a throw).
  const text = await blob.text();
  return new TextEncoder().encode(text).buffer;
}

export async function deleteContent(id: string): Promise<void> {
  if (frozen) return; // frozen after restore — see freezeWrites()
  memory.content.delete(id);
  try {
    const db = await getDB();
    if (!db) return;
    await db.delete(CONTENT_STORE, id);
  } catch (e) {
    markDegraded(e instanceof Error ? e.message : 'delete failed');
  }
}

export interface ExportedBackup {
  version: number;
  /** Provenance metadata for backup summaries/previews (added for Ghost Memory). */
  meta: { app: string; appVersion: string; createdAt: string };
  kv: Record<string, unknown>;
  content: Record<string, string>;
}

/**
 * Export the full KV + content database as a plain JSON-serializable object.
 * Includes `meta` provenance (app, version, timestamp); older backups without
 * `meta` still import fine, and importAll ignores unknown top-level fields.
 */
export async function exportAll(): Promise<ExportedBackup> {
  const kv: Record<string, unknown> = {};
  const content: Record<string, string> = {};
  const db = await getDB();
  if (db) {
    for (const key of await db.getAllKeys(KV_STORE)) {
      kv[String(key)] = await db.get(KV_STORE, key);
    }
    for (const key of await db.getAllKeys(CONTENT_STORE)) {
      const value = await db.get(CONTENT_STORE, key);
      content[String(key)] = serializeContent(value);
    }
  } else {
    for (const [k, v] of memory.kv) kv[k] = v;
    for (const [k, v] of memory.content) content[k] = serializeContent(v);
  }
  return {
    version: DB_VERSION,
    meta: { app: APP_NAME, appVersion: APP_VERSION, createdAt: new Date().toISOString() },
    kv,
    content,
  };
}

/**
 * Import a previously exported database, replacing current slices/content.
 *
 * Content blobs are written BEFORE the kv slices so the `vfs` node index is
 * only replaced once the file bodies it references already exist — this avoids
 * a window where the tree points at missing content if a write fails partway.
 * (This is not a single atomic transaction across both object stores; callers
 * should treat restore as "best-effort replace then reload", which is why the
 * UI reloads from the resulting store rather than hot-swapping live state.)
 *
 * Returns `true` only if EVERY write was durable. If any write reports
 * not-durable (storage unavailable/degraded mid-import), returns `false` so the
 * caller never shows a false "restored" success. A `false` result means the
 * restore is partial and the user must be told, not reassured.
 */
export async function importAll(data: {
  kv: Record<string, unknown>;
  content: Record<string, string>;
}): Promise<boolean> {
  let durable = true;
  for (const [k, v] of Object.entries(data.content)) {
    if (typeof v === 'string') {
      const ok = await putContent(k, deserializeContent(v));
      durable = durable && ok;
    }
  }
  const known: readonly SliceName[] = ['settings', 'notes', 'vfs', 'music', 'wm-layout'];
  for (const [k, v] of Object.entries(data.kv)) {
    // Only import recognized slice names; ignore unknown keys from a tampered file.
    if ((known as readonly string[]).includes(k)) {
      const ok = await saveSlice(k as SliceName, v);
      durable = durable && ok;
    }
  }
  return durable;
}

// Classify binary by structural tag rather than `instanceof`, because a storage
// engine can return values from a different realm (e.g. Node/jsdom +
// fake-indexeddb) where `instanceof ArrayBuffer` is false even though the value
// is one.
function isArrayBufferLike(value: unknown): value is ArrayBuffer {
  return Object.prototype.toString.call(value) === '[object ArrayBuffer]';
}

function serializeContent(value: unknown): string {
  // Content is only ever a string or ArrayBuffer (Blobs are converted before
  // storage). Encode binary as base64 so export is pure JSON.
  if (typeof value === 'string') return `str:${value}`;
  if (isArrayBufferLike(value)) return `b64:${bufferToBase64(value as ArrayBuffer)}`;
  // Defensive: a typed-array view or Node Buffer from the storage engine.
  if (ArrayBuffer.isView(value)) {
    const view = value as ArrayBufferView;
    const slice = view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength);
    return `b64:${bufferToBase64(slice)}`;
  }
  return 'str:';
}

function deserializeContent(value: string): ArrayBuffer | string {
  if (value.startsWith('str:')) return value.slice(4);
  if (value.startsWith('b64:')) return base64ToBuffer(value.slice(4));
  // Legacy `blob:<mime>:<base64>` form (older exports): decode to bytes and drop
  // the MIME, which this layer does not track. The first colon ends the MIME.
  if (value.startsWith('blob:')) {
    const rest = value.slice(5);
    const sep = rest.indexOf(':');
    return base64ToBuffer(sep === -1 ? rest : rest.slice(sep + 1));
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

/**
 * Test-only: reset the in-memory fallback and cached db handle, and delete the
 * underlying IndexedDB database so each test starts from a clean store.
 */
export async function __resetPersistenceForTests(): Promise<void> {
  memory.kv.clear();
  memory.content.clear();
  // Close the cached connection before deleting, then wait for deletion.
  if (dbPromise) {
    try {
      const db = await dbPromise;
      db?.close();
    } catch {
      // ignore
    }
  }
  dbPromise = null;
  degraded = false;
  noticeShown = false;
  onDegrade = null;
  frozen = false;
  if (typeof indexedDB !== 'undefined') {
    await new Promise<void>((resolve) => {
      const req = indexedDB.deleteDatabase(DB_NAME);
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
      req.onblocked = () => resolve();
    });
  }
}
