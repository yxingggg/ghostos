import { useEffect, useRef, useState } from 'react';
import type { AppComponentProps } from '../registry';
import { useNotes } from '../../state/notesStore';
import { VfsFileEditor } from './VfsFileEditor';

export function NotesApp({ props }: AppComponentProps) {
  // When launched with a VFS file id (e.g. from Tomb Explorer), GraveNotes acts
  // as an editor bound to that file, reading and saving its content in place.
  // Otherwise it behaves as the standalone notes app backed by notesStore.
  const vfsFileId = typeof props?.vfsFileId === 'string' ? props.vfsFileId : null;
  if (vfsFileId) {
    return <VfsFileEditor fileId={vfsFileId} />;
  }
  return <StandaloneNotes />;
}

function StandaloneNotes() {
  const notes = useNotes((s) => s.notes);
  const ordered = useNotes((s) => s.ordered);
  const create = useNotes((s) => s.create);
  const update = useNotes((s) => s.update);
  const remove = useNotes((s) => s.remove);
  const [activeId, setActiveId] = useState<string | null>(null);
  const list = ordered();
  const active = notes.find((n) => n.id === activeId) ?? list[0] ?? null;
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const first = list[0];
    if (!activeId && first) setActiveId(first.id);
  }, [activeId, list]);

  return (
    <div className="flex h-full">
      <aside className="flex w-40 shrink-0 flex-col border-r border-crypt-500 bg-crypt-800">
        <button
          type="button"
          onClick={() => {
            const id = create('Untitled');
            setActiveId(id);
            setTimeout(() => bodyRef.current?.focus(), 0);
          }}
          className="m-2 rounded-sm border border-amethyst-600 bg-crypt-700 px-2 py-1 font-pixel text-base text-spectral-500 hover:bg-crypt-600 bevel-out"
        >
          + New Note
        </button>
        <ul className="min-h-0 flex-1 overflow-y-auto">
          {list.map((n) => (
            <li key={n.id}>
              <button
                type="button"
                onClick={() => setActiveId(n.id)}
                className={[
                  'block w-full truncate px-2 py-1 text-left font-pixel text-base',
                  n.id === active?.id ? 'bg-amethyst-600/40 text-bone-100' : 'text-bone-300 hover:bg-crypt-700',
                ].join(' ')}
              >
                {n.title || 'Untitled'}
              </button>
            </li>
          ))}
          {list.length === 0 && (
            <li className="px-2 py-2 font-pixel text-sm text-bone-500">No notes yet.</li>
          )}
        </ul>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col">
        {active ? (
          <>
            <div className="flex items-center gap-2 border-b border-crypt-500 p-2">
              <input
                aria-label="Note title"
                value={active.title}
                onChange={(e) => update(active.id, { title: e.target.value })}
                className="min-w-0 flex-1 bg-crypt-700 px-2 py-1 font-pixel text-lg text-bone-100 outline-none focus:bg-crypt-600"
              />
              <button
                type="button"
                aria-label="Delete note"
                onClick={() => {
                  remove(active.id);
                  setActiveId(null);
                }}
                className="rounded-sm border border-crypt-500 px-2 py-1 font-pixel text-base text-bone-300 hover:bg-blood-500 hover:text-white"
              >
                Delete
              </button>
            </div>
            <textarea
              ref={bodyRef}
              aria-label="Note body"
              value={active.body}
              onChange={(e) => update(active.id, { body: e.target.value })}
              placeholder="Scrawl your thoughts into the crypt..."
              className="min-h-0 flex-1 resize-none bg-crypt-700 p-3 font-pixel text-lg leading-relaxed text-bone-100 outline-none"
            />
            <div className="border-t border-crypt-500 px-3 py-1 font-pixel text-xs text-bone-500">
              Updated {new Date(active.updatedAt).toLocaleString()}
            </div>
          </>
        ) : (
          <div className="grid flex-1 place-items-center font-pixel text-bone-500">
            Create a note to begin.
          </div>
        )}
      </section>
    </div>
  );
}
