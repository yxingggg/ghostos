// Pure, framework-agnostic logic for the Ghost Memory backup/restore experience.
// No React, DOM, or IndexedDB here — this module only inspects and validates the
// plain JSON shape produced by `exportAll()` so the UI can summarize a backup and
// reject a malformed one BEFORE any storage mutation.

/** The slice names a backup may legitimately carry (mirrors persist.ts). */
export const BACKUP_SLICES = ['settings', 'notes', 'vfs', 'music', 'wm-layout', 'welcome'] as const;

/** Shape of an exported workspace backup. `meta` is optional for back-compat. */
export interface BackupMeta {
  app: string;
  /** App (marketing) version, e.g. "0.1.0". */
  appVersion: string;
  /** ISO timestamp of when the backup was created. */
  createdAt: string;
}

export interface BackupFile {
  /** IndexedDB schema version (present on every export). */
  version: number;
  /** Optional provenance metadata; absent in older backups. */
  meta?: BackupMeta;
  kv: Record<string, unknown>;
  content: Record<string, string>;
}

/** A human-facing summary of what a backup contains. */
export interface BackupSummary {
  files: number;
  folders: number;
  notes: number;
  tracks: number;
  wallpaper: string | null;
  /** Number of stored content blobs (file bodies, audio). */
  contentItems: number;
  createdAt: string | null;
  appVersion: string | null;
}

export type ValidateResult =
  | { ok: true; backup: BackupFile }
  | { ok: false; error: string };

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/**
 * Validate a parsed JSON value as a GhostOS backup WITHOUT mutating anything.
 * Returns a discriminated result so the caller can refuse to restore a
 * malformed file before touching storage. Validation is intentionally
 * structural and lenient about unknown kv keys (they are ignored on import),
 * but strict about the overall shape and the types of recognized slices it
 * will actually restore.
 */
export function validateBackup(value: unknown): ValidateResult {
  if (!isObject(value)) return { ok: false, error: 'Not a valid backup file (expected an object).' };
  if (!isObject(value.kv)) return { ok: false, error: 'Backup is missing its "kv" section.' };
  if (!isObject(value.content)) {
    return { ok: false, error: 'Backup is missing its "content" section.' };
  }
  // Every content entry must be a string (base64/`str:`/legacy `blob:` form).
  for (const [k, v] of Object.entries(value.content)) {
    if (typeof v !== 'string') {
      return { ok: false, error: `Backup content entry "${k}" is corrupt (not a string).` };
    }
  }
  // If a recognized slice is present, it must be a non-null object. (vfs in
  // particular must look like a node tree; a primitive here would corrupt state.)
  const kv = value.kv;
  if ('vfs' in kv && kv.vfs !== undefined) {
    const vfs = kv.vfs;
    if (!isObject(vfs) || !isObject((vfs as Record<string, unknown>).nodes)) {
      return { ok: false, error: 'Backup filesystem (vfs) is malformed.' };
    }
  }
  if ('settings' in kv && kv.settings !== undefined && !isObject(kv.settings)) {
    return { ok: false, error: 'Backup settings are malformed.' };
  }
  // At least one recognized, restorable slice must be present — otherwise the
  // file carries nothing we would restore, and is almost certainly not a backup.
  const hasKnownSlice = BACKUP_SLICES.some((s) => s in kv);
  if (!hasKnownSlice) {
    return { ok: false, error: 'Backup contains no recognizable GhostOS workspace data.' };
  }
  const version = typeof value.version === 'number' ? value.version : 1;
  const backup: BackupFile = {
    version,
    kv: value.kv,
    content: value.content,
    ...(isValidMeta(value.meta) ? { meta: value.meta } : {}),
  };
  return { ok: true, backup };
}

function isValidMeta(v: unknown): v is BackupMeta {
  return (
    isObject(v) &&
    typeof v.app === 'string' &&
    typeof v.appVersion === 'string' &&
    typeof v.createdAt === 'string'
  );
}

/** Count folders/files in a persisted vfs slice shaped like `{ nodes: {...} }`. */
function countVfs(vfs: unknown): { files: number; folders: number } {
  let files = 0;
  let folders = 0;
  if (isObject(vfs) && isObject(vfs.nodes)) {
    for (const node of Object.values(vfs.nodes)) {
      if (!isObject(node)) continue;
      if (node.kind === 'folder') {
        // The single root folder is structural; don't count it as a user folder.
        if (node.parentId === null) continue;
        folders += 1;
      } else if (node.kind === 'file') {
        files += 1;
      }
    }
  }
  return { files, folders };
}

function countArrayLike(value: unknown, key: string): number {
  if (Array.isArray(value)) return value.length;
  if (isObject(value) && Array.isArray(value[key])) return (value[key] as unknown[]).length;
  return 0;
}

/**
 * Produce a human-facing summary of a validated backup. Derives counts purely
 * from the backup's own data — no stores or storage access — so it can drive
 * both the export summary and the pre-restore import preview.
 */
export function summarizeBackup(backup: BackupFile): BackupSummary {
  const { files, folders } = countVfs(backup.kv.vfs);
  const notes = countArrayLike(backup.kv.notes, 'notes');
  const tracks = countArrayLike(backup.kv.music, 'tracks');
  const settings = backup.kv.settings;
  const wallpaper =
    isObject(settings) && typeof settings.wallpaper === 'string' ? settings.wallpaper : null;
  return {
    files,
    folders,
    notes,
    tracks,
    wallpaper,
    contentItems: Object.keys(backup.content).length,
    createdAt: backup.meta?.createdAt ?? null,
    appVersion: backup.meta?.appVersion ?? null,
  };
}
