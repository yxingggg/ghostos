import { useEffect, useRef, useState } from 'react';
import type { AppComponentProps } from '../registry';
import { useNotes } from '../../state/notesStore';
import { useVfs } from '../../state/vfsStore';
import { VfsFileEditor, type EditorHandle } from './VfsFileEditor';
import { OpenFileDialog } from './OpenFileDialog';

export function NotesApp({ props }: AppComponentProps) {
  // Launched from Tomb Explorer bound to a specific VFS file.
  const launchedFileId = typeof props?.vfsFileId === 'string' ? props.vfsFileId : null;
  return <GraveNotes initialFileId={launchedFileId} />;
}

/**
 * GraveNotes document workspace. It edits real virtual-filesystem text files so
 * documents appear in Tomb Explorer immediately. A File menu offers New, Open,
 * Save, Save As, and Close. Legacy standalone quick-notes remain available and
 * can be promoted to real files.
 */
function GraveNotes({ initialFileId }: { initialFileId: string | null }) {
  // `doc` identifies the current document: a remount key, the bound file id (or
  // null for a new buffer), and an optional seed body for promoted quick notes.
  const [doc, setDoc] = useState<{ key: number; fileId: string | null; seed?: string }>({
    key: 0,
    fileId: initialFileId,
  });
  const [showOpen, setShowOpen] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<EditorHandle>(null);

  const node = useVfs((s) => (doc.fileId ? s.node(doc.fileId) : undefined));
  const vfsPath = useVfs((s) => (doc.fileId ? s.path(doc.fileId) : []));

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [menuOpen]);

  function newDocument(seed?: string) {
    setDoc((d) => ({ key: d.key + 1, fileId: null, ...(seed ? { seed } : {}) }));
    setMenuOpen(false);
    setShowNotes(false);
  }
  function openFile(id: string) {
    setDoc((d) => ({ key: d.key + 1, fileId: id }));
    setShowOpen(false);
    setShowNotes(false);
  }

  const pathLabel =
    doc.fileId && vfsPath.length > 1
      ? '/' + vfsPath.slice(1).map((p) => p.name).join('/')
      : doc.fileId && node
        ? `/${node.name}`
        : 'unsaved document';

  return (
    <div className="flex h-full min-h-0 flex-col bg-crypt-700">
      {/* Menu bar */}
      <div className="relative flex shrink-0 items-center gap-1 border-b border-crypt-500 bg-crypt-800 px-1 py-0.5">
        <div ref={menuRef} className="relative">
          <button
            type="button"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((o) => !o)}
            className="rounded-sm px-3 py-1 font-pixel text-base text-bone-100 hover:bg-crypt-600"
          >
            File
          </button>
          {menuOpen && (
            <div
              role="menu"
              aria-label="File menu"
              className="absolute left-0 top-full z-20 mt-0.5 w-44 rounded-sm border border-amethyst-600 bg-crypt-800 py-1 shadow-window"
            >
              <MenuItem onClick={() => newDocument()}>New</MenuItem>
              <MenuItem onClick={() => { setShowOpen(true); setMenuOpen(false); }}>Open…</MenuItem>
              <MenuItem onClick={() => { editorRef.current?.save(); setMenuOpen(false); }}>Save</MenuItem>
              <MenuItem onClick={() => { editorRef.current?.saveAs(); setMenuOpen(false); }}>
                Save As…
              </MenuItem>
              <div className="my-1 border-t border-crypt-600" />
              <MenuItem onClick={() => { setShowNotes((v) => !v); setMenuOpen(false); }}>
                Quick notes…
              </MenuItem>
              <MenuItem onClick={() => newDocument()}>Close document</MenuItem>
            </div>
          )}
        </div>
        <span
          className="min-w-0 flex-1 truncate px-2 font-pixel text-sm text-bone-500"
          title={pathLabel}
          aria-label={`Current document: ${pathLabel}`}
        >
          {pathLabel}
        </span>
      </div>

      <div className="flex min-h-0 flex-1">
        {showNotes && <QuickNotesSidebar onPromote={(text) => newDocument(text)} />}
        <div className="min-h-0 flex-1">
          <VfsFileEditor
            key={doc.key}
            ref={editorRef}
            fileId={doc.fileId}
            {...(doc.seed ? { initialBody: doc.seed } : {})}
            onBound={(id) => setDoc((d) => ({ ...d, fileId: id }))}
          />
        </div>
      </div>

      {showOpen && <OpenFileDialog onCancel={() => setShowOpen(false)} onOpen={openFile} />}
    </div>
  );
}

function MenuItem({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className="block w-full px-3 py-1 text-left font-pixel text-base text-bone-200 hover:bg-amethyst-600/40"
    >
      {children}
    </button>
  );
}

/** Legacy standalone quick-notes, with a "Save as File" promotion path. */
function QuickNotesSidebar({ onPromote }: { onPromote: (text: string) => void }) {
  const notes = useNotes((s) => s.notes);
  const ordered = useNotes((s) => s.ordered);
  const create = useNotes((s) => s.create);
  const update = useNotes((s) => s.update);
  const remove = useNotes((s) => s.remove);
  const [activeId, setActiveId] = useState<string | null>(null);
  const list = ordered();
  const active = notes.find((n) => n.id === activeId) ?? list[0] ?? null;

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-crypt-500 bg-crypt-800">
      <div className="flex items-center justify-between border-b border-crypt-500 p-1.5">
        <span className="font-pixel text-sm text-bone-400">Quick notes</span>
        <button
          type="button"
          onClick={() => setActiveId(create('Untitled'))}
          className="rounded-sm border border-amethyst-600 bg-crypt-700 px-2 font-pixel text-sm text-spectral-500 hover:bg-crypt-600"
        >
          + New
        </button>
      </div>
      <ul className="max-h-24 shrink-0 overflow-y-auto border-b border-crypt-500">
        {list.map((n) => (
          <li key={n.id}>
            <button
              type="button"
              onClick={() => setActiveId(n.id)}
              className={[
                'block w-full truncate px-2 py-1 text-left font-pixel text-sm',
                n.id === active?.id ? 'bg-amethyst-600/40 text-bone-100' : 'text-bone-300 hover:bg-crypt-700',
              ].join(' ')}
            >
              {n.title || 'Untitled'}
            </button>
          </li>
        ))}
        {list.length === 0 && <li className="px-2 py-1 font-pixel text-xs text-bone-500">No quick notes.</li>}
      </ul>
      {active && (
        <div className="flex min-h-0 flex-1 flex-col p-1.5">
          <input
            aria-label="Quick note title"
            value={active.title}
            onChange={(e) => update(active.id, { title: e.target.value })}
            className="mb-1 bg-crypt-900 px-2 py-1 font-pixel text-base text-bone-100 outline-none"
          />
          <textarea
            aria-label="Quick note body"
            value={active.body}
            onChange={(e) => update(active.id, { body: e.target.value })}
            className="min-h-0 flex-1 resize-none bg-crypt-900 p-2 font-pixel text-base text-bone-100 outline-none"
          />
          <div className="mt-1 flex gap-1">
            <button
              type="button"
              onClick={() => onPromote(active.body)}
              className="flex-1 rounded-sm border border-amethyst-600 bg-crypt-700 px-2 py-1 font-pixel text-sm text-spectral-500 hover:bg-crypt-600"
            >
              Save as File…
            </button>
            <button
              type="button"
              aria-label="Delete quick note"
              onClick={() => { remove(active.id); setActiveId(null); }}
              className="rounded-sm border border-crypt-500 px-2 py-1 font-pixel text-sm text-bone-300 hover:bg-blood-500 hover:text-white"
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}

export { GraveNotes };
