import { useEffect, useRef, useState } from 'react';
import type { AppComponentProps } from '../registry';
import { useVfs } from '../../state/vfsStore';
import { runCommand, pathString } from '../../core/terminal/interpreter';
import type { NodeId } from '../../core/vfs/types';

interface Line {
  kind: 'prompt' | 'output';
  text: string;
}

export function TerminalApp(_props: AppComponentProps) {
  const vfs = useVfs((s) => s.vfs);
  const rootId = useVfs((s) => s.rootId);
  const applyVfs = useVfs((s) => s.applyVfs);
  const readText = useVfs((s) => s.readText);
  const [cwd, setCwd] = useState<NodeId>(rootId);
  const [lines, setLines] = useState<Line[]>([
    { kind: 'output', text: 'GhostOS Phantom Terminal — type "help" to begin.' },
  ]);
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [histIdx, setHistIdx] = useState(-1);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
  }, [lines]);

  const prompt = `ghost@crypt:${pathString(vfs, cwd)}$`;

  async function submit() {
    const line = input;
    setLines((prev) => [...prev, { kind: 'prompt', text: `${prompt} ${line}` }]);
    setInput('');
    if (line.trim()) {
      setHistory((h) => [...h, line]);
    }
    setHistIdx(-1);

    const result = runCommand(line, { vfs, cwd, user: 'ghost' });
    if (result.cleared) {
      setLines([]);
      return;
    }
    if (result.vfs) applyVfs(result.vfs);
    if (result.cwd !== undefined) setCwd(result.cwd);

    const out: Line[] = [];
    for (const text of result.output) {
      // Resolve the `cat` content marker by reading from the store.
      if (text.startsWith('\u0000cat:')) {
        const id = text.slice('\u0000cat:'.length);
        const content = await readText(id);
        for (const l of content.split('\n')) out.push({ kind: 'output', text: l });
      } else {
        out.push({ kind: 'output', text });
      }
    }
    if (out.length) setLines((prev) => [...prev, ...out]);
  }

  return (
    <div
      className="flex h-full flex-col bg-crypt-900 p-2 font-pixel text-lg text-spectral-500"
      onClick={() => inputRef.current?.focus()}
    >
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto whitespace-pre-wrap break-words">
        {lines.map((l, i) => (
          <div key={i} className={l.kind === 'prompt' ? 'text-bone-300' : 'text-spectral-400'}>
            {l.text}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <span className="shrink-0 text-amethyst-400">{prompt}</span>
        <input
          ref={inputRef}
          aria-label="Terminal input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              void submit();
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              if (history.length === 0) return;
              const idx = histIdx < 0 ? history.length - 1 : Math.max(0, histIdx - 1);
              setHistIdx(idx);
              setInput(history[idx] ?? '');
            } else if (e.key === 'ArrowDown') {
              e.preventDefault();
              if (histIdx < 0) return;
              const idx = histIdx + 1;
              if (idx >= history.length) {
                setHistIdx(-1);
                setInput('');
              } else {
                setHistIdx(idx);
                setInput(history[idx] ?? '');
              }
            }
          }}
          spellCheck={false}
          autoCapitalize="off"
          autoComplete="off"
          className="min-w-0 flex-1 bg-transparent text-spectral-500 outline-none"
        />
      </div>
    </div>
  );
}
