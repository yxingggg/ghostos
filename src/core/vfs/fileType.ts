// Pure file-type classification for the virtual file system.
// Maps a file name (and optional MIME) to how GhostOS should open it. This lives
// in core so the window manager and shell stay app-agnostic: the Explorer uses
// this to decide which registered app to launch, without any app-specific
// branching in the WM.

export type OpenKind = 'text' | 'markdown' | 'audio' | 'image' | 'unsupported';

export interface FileAssociation {
  kind: OpenKind;
  /** Registered app id that should open this file, or null if unsupported. */
  appId: string | null;
  /** Human-readable label for the default handler. */
  label: string;
}

const TEXT_EXT = new Set([
  'txt',
  'text',
  'log',
  'json',
  'csv',
  'ini',
  'cfg',
  'conf',
  'yml',
  'yaml',
  'xml',
  'js',
  'ts',
  'tsx',
  'jsx',
  'css',
  'html',
  'sh',
]);
const MARKDOWN_EXT = new Set(['md', 'markdown', 'mdown', 'mkd']);
const AUDIO_EXT = new Set(['mp3', 'wav', 'ogg', 'oga', 'flac', 'm4a', 'aac', 'weba', 'opus']);
const IMAGE_EXT = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'ico', 'avif']);

export function extensionOf(name: string): string {
  const dot = name.lastIndexOf('.');
  if (dot <= 0 || dot === name.length - 1) return '';
  return name.slice(dot + 1).toLowerCase();
}

/** Classify a file into an open-kind using its extension, then its MIME type. */
export function classifyFile(name: string, mime?: string): OpenKind {
  const ext = extensionOf(name);
  if (MARKDOWN_EXT.has(ext)) return 'markdown';
  if (TEXT_EXT.has(ext)) return 'text';
  if (AUDIO_EXT.has(ext)) return 'audio';
  if (IMAGE_EXT.has(ext)) return 'image';

  // Fall back to MIME when the extension is unknown/missing.
  if (mime) {
    if (mime === 'text/markdown') return 'markdown';
    if (mime.startsWith('text/')) return 'text';
    if (mime === 'application/json') return 'text';
    if (mime.startsWith('audio/')) return 'audio';
    if (mime.startsWith('image/')) return 'image';
  }

  // Files with no extension and no (or generic) MIME are treated as text so
  // they can at least be opened and edited in the editor.
  if (ext === '' && (!mime || mime === 'application/octet-stream')) return 'text';
  return 'unsupported';
}

const APP_FOR_KIND: Record<OpenKind, { appId: string | null; label: string }> = {
  text: { appId: 'notes', label: 'GraveNotes' },
  markdown: { appId: 'notes', label: 'GraveNotes' },
  audio: { appId: 'music', label: 'DeadWave' },
  image: { appId: 'imageviewer', label: 'Spectral Viewer' },
  unsupported: { appId: null, label: 'Unsupported' },
};

export function associate(name: string, mime?: string): FileAssociation {
  const kind = classifyFile(name, mime);
  const app = APP_FOR_KIND[kind];
  return { kind, appId: app.appId, label: app.label };
}

/** True if the editor (GraveNotes) can open this file as editable text. */
export function isTextLike(name: string, mime?: string): boolean {
  const kind = classifyFile(name, mime);
  return kind === 'text' || kind === 'markdown';
}
