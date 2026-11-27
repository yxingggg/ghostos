import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { useVfs } from '../../state/vfsStore';
import { useToasts } from '../../state/toastStore';
import { SaveAsDialog } from './SaveAsDialog';

interface Props {
  /** The VFS file this editor is bound to, or null for an unsaved new document. */
  fileId: string | null;
  /** Initial buffer for a brand-new document (e.g. promoted from a quick note). */
  initialBody?: string;
  /** Called when the document becomes bound to a VFS file (after Save As). */
  onBound?: (fileId: string) => void;
}

export interface EditorHandle {
  save: () => void;
  saveAs: () => void;
}

type SaveState = 'loading' | 'clean' | 'unsaved' | 'saving' | 'saved' | 'error' | 'missing';

/**
 * GraveNotes editor for a virtual-file-system text file. Reads content on open
 * and saves edits back to the SAME file. A monotonic version guard ensures a
 * stale debounced autosave can never overwrite newer content, and persistence
 * failures are surfaced honestly (never a false "Saved").
 */
export const VfsFileEditor = forwardRef<EditorHandle, Props>(function VfsFileEditor(
  { fileId: initialFileId, initialBody, onBound },
  ref,
) {
  const nodeOf = useVfs((s) => s.node);
  const readText = useVfs((s) => s.readText);
  const writeText = useVfs((s) => s.writeText);
  const saveTextAs = useVfs((s) => s.saveTextAs);
  const push = useToasts((s) => s.push);

  const [fileId, setFileId] = useState<string | null>(initialFileId);
  const node = useVfs((s) => (fileId ? s.node(fileId) : undefined));

  const [body, setBody] = useState(initialBody ?? '');
  const [stateLabel, setStateLabel] = useState<SaveState>(
    initialFileId ? 'loading' : initialBody ? 'unsaved' : 'clean',
  );
  const [showSaveAs, setShowSaveAs] = useState(false);

  const editVersion = useRef(initialBody ? 1 : 0);
  const savedVersion = useRef(0);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bodyRef = useRef(initialBody ?? '');
  const fileIdRef = useRef<string | null>(initialFileId);
  fileIdRef.current = fileId;

  // Load content when bound to a file.
  useEffect(() => {
    if (!fileId) {
      setStateLabel(bodyRef.current ? 'unsaved' : 'clean');
      return;
    }
    let cancelled = false;
    const n = nodeOf(fileId);
    if (!n || n.kind !== 'file') {
      setStateLabel('missing');
      return;
    }
    setStateLabel('loading');
    void readText(fileId).then((text) => {
      if (cancelled) return;
      setBody(text);
      bodyRef.current = text;
      editVersion.current = 0;
      savedVersion.current = 0;
      setStateLabel('clean');
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileId]);

  const doSave = useCallback(
    async (targetId: string, version: number): Promise<void> => {
      setStateLabel('saving');
      const res = await writeText(targetId, bodyRef.current);
      if (version < editVersion.current) return; // a newer edit superseded this save
      if (!res.ok) {
        setStateLabel('error');
        push(res.error ?? 'Save failed.', 'error');
        return;
      }
      savedVersion.current = version;
      if (!res.durable) {
        setStateLabel('error');
        push('Saved in memory only — storage is unavailable; changes may not survive a reload.', 'error');
        return;
      }
      setStateLabel(editVersion.current > version ? 'unsaved' : 'saved');
    },
    [writeText, push],
  );

  // Flush a pending save on unmount (window close).
  useEffect(() => {
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
      const id = fileIdRef.current;
      if (id && editVersion.current > savedVersion.current) {
        void writeText(id, bodyRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function saveNow(): Promise<void> {
    if (debounce.current) clearTimeout(debounce.current);
    if (!fileId) {
      setShowSaveAs(true);
      return;
    }
    await doSave(fileId, editVersion.current);
  }

  useImperativeHandle(ref, () => ({
    save: () => void saveNow(),
    saveAs: () => setShowSaveAs(true),
  }));

  function onChange(next: string) {
    setBody(next);
    bodyRef.current = next;
    editVersion.current += 1;
    setStateLabel('unsaved');
    if (!fileId) return; // unsaved new doc — must Save As first
    const version = editVersion.current;
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => void doSave(fileId, version), 400);
  }

  const missing = stateLabel === 'missing' || (fileId !== null && node && node.kind !== 'file');
  if (missing) {
    return (
      <div className="grid h-full place-items-center bg-crypt-700 p-6 text-center font-pixel text-bone-300">
        This file no longer exists in the crypt.
      </div>
    );
  }

  const title = node && node.kind === 'file' ? node.name : 'Untitled (unsaved)';

  return (
    <div className="flex h-full min-h-0 flex-col bg-crypt-700">
      <div className="flex shrink-0 items-center gap-2 border-b border-crypt-500 p-2">
        <span className="min-w-0 flex-1 truncate font-pixel text-lg text-bone-100">{title}</span>
        <StatusBadge state={stateLabel} />
        {!fileId && (
          <button
            type="button"
            onClick={() => setShowSaveAs(true)}
            className="shrink-0 rounded-sm border border-amethyst-600 bg-crypt-700 px-2 py-1 font-pixel text-base text-spectral-500 hover:bg-crypt-600 bevel-out"
          >
            Save As…
          </button>
        )}
        <button
          type="button"
          onClick={() => void saveNow()}
          disabled={stateLabel === 'saving' || stateLabel === 'loading'}
          className="shrink-0 rounded-sm border border-amethyst-600 bg-crypt-700 px-2 py-1 font-pixel text-base text-spectral-500 hover:bg-crypt-600 disabled:opacity-40 bevel-out"
        >
          Save
        </button>
      </div>
      <textarea
        aria-label={fileId ? `Contents of ${title}` : 'Document contents'}
        value={body}
        disabled={stateLabel === 'loading'}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
            // Always prevent the browser's Save dialog while the editor is focused.
            e.preventDefault();
            e.stopPropagation();
            void saveNow();
          }
        }}
        placeholder="Begin writing…"
        className="min-h-0 flex-1 resize-none bg-crypt-700 p-3 font-pixel text-lg leading-relaxed text-bone-100 outline-none"
      />
      {showSaveAs && (
        <SaveAsDialog
          initialName={node && node.kind === 'file' ? node.name : 'untitled.txt'}
          onCancel={() => setShowSaveAs(false)}
          onSave={async (parentId, name, overwrite) => {
            const id = await saveTextAs(parentId, name, bodyRef.current, { overwrite });
            if (!id) return; // error surfaced via toast; keep dialog open
            setShowSaveAs(false);
            setFileId(id);
            fileIdRef.current = id;
            savedVersion.current = editVersion.current;
            setStateLabel('saved');
            push('Saved.');
            onBound?.(id);
          }}
        />
      )}
    </div>
  );
});

function StatusBadge({ state }: { state: SaveState }) {
  const map: Record<SaveState, { label: string; cls: string }> = {
    loading: { label: 'Opening…', cls: 'text-bone-500' },
    clean: { label: 'Ready', cls: 'text-bone-500' },
    unsaved: { label: 'Unsaved changes', cls: 'text-teal-400' },
    saving: { label: 'Saving…', cls: 'text-bone-300' },
    saved: { label: 'Saved', cls: 'text-spectral-500' },
    error: { label: 'Save failed', cls: 'text-blood-500' },
    missing: { label: '', cls: '' },
  };
  const { label, cls } = map[state];
  return (
    <span className={`shrink-0 font-pixel text-xs ${cls}`} aria-live="polite" role="status">
      {label}
    </span>
  );
}
