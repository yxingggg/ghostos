// Single source of truth for the app's marketing version, shared by the export
// metadata (Ghost Memory backups) and the About section. This is the APP
// version and is intentionally separate from the IndexedDB schema `DB_VERSION`
// in persist.ts. Keep in sync with package.json "version".
export const APP_VERSION = '0.1.0';
export const APP_NAME = 'GhostOS';
