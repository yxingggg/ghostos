import { useEffect, useRef, useState } from 'react';
import { useVfs } from '../../state/vfsStore';
import { useToasts } from '../../state/toastStore';

interface Props {
  fileId: string;
}

type Status = 'loading' | 'ready' | 'saving' | 'saved' | 'missing';

/**
 * GraveNotes editor bound to a single virtual-file-system file. It reads the
 * file's content on open and saves edits back to the *same* VFS file (via
 * vfsStore.writeText), so editing never spawns an unrelated note.
 */
export function VfsFileEditor({ fileId }: Props) {
  const node = useVfs((s) => s.node(fileId));
  const readText = useVfs((s) => s.readText);
  const writeText = useVfs((s) => s.writeText);
  const push = useToasts((s) => s.push);

  const [body, setBody] = useState('');
  const [status, setStatus] = useState<Status>('loading');
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadedFor = useRef<string | null>(null);
  // Latest edited body + dirty flag, so we can flush a pending save on unmount.
  const latest = useRef<{ body: string; dirty: boolean }>({ body: '', dirty: false });

  // Load content when the bound file changes.
  useEffect(() => {
    let cancelled = false;
    if (!node || node.kind !== 'file') {
      setStatus('missing');
      return;
    }
    setStatus('loading');
    void readText(fileId).then((text) => {
      if (cancelled) return;
      setBody(text);
      loadedFor.current = fileId;
      setStatus('ready');
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileId]);

  // Flush any pending save on unmount (window close) so edits are never lost.
  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      if (latest.current.dirty && loadedFor.current) {
        void writeText(loadedFor.current, latest.current.body);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onChange(next: string) {
    setBody(next);
    latest.current = { body: next, dirty: true };
    setStatus('saving');
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      void writeText(fileId, next).then(() => {
        latest.current.dirty = false;
        setStatus('saved');
      });
    }, 350);
  }

  async function saveNow() {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    await writeText(fileId, body);
    latest.current = { body, dirty: false };
    setStatus('saved');
    push('Saved.');
  }

  if (status === 'missing' || !node || node.kind !== 'file') {
    return (
      <div className="grid h-full place-items-center bg-crypt-700 p-6 text-center font-pixel text-bone-300">
        This file no longer exists in the crypt.
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-crypt-700">
      <div className="flex items-center gap-2 border-b border-crypt-500 p-2">
        <span className="min-w-0 flex-1 truncate font-pixel text-lg text-bone-100">
          {node.name}
        </span>
        <span className="font-pixel text-xs text-bone-500" aria-live="polite">
          {status === 'loading'
            ? 'Opening…'
            : status === 'saving'
              ? 'Saving…'
              : status === 'saved'
                ? 'Saved'
                : 'Ready'}
        </span>
        <button
          type="button"
          onClick={() => void saveNow()}
          className="rounded-sm border border-amethyst-600 bg-crypt-700 px-2 py-1 font-pixel text-base text-spectral-500 hover:bg-crypt-600 bevel-out"
        >
          Save
        </button>
      </div>
      <textarea
        aria-label={`Contents of ${node.name}`}
        value={body}
        disabled={status === 'loading'}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          // Ctrl/Cmd+S saves immediately.
          if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
            e.preventDefault();
            void saveNow();
          }
        }}
        placeholder="This file is empty. Begin writing…"
        className="min-h-0 flex-1 resize-none bg-crypt-700 p-3 font-pixel text-lg leading-relaxed text-bone-100 outline-none"
      />
    </div>
  );
}
