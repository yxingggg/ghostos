import { useState } from 'react';
import type { AppComponentProps } from '../registry';
import { useSettings } from '../../state/settingsStore';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Optional AI assistant. Disabled by default. When enabled in Settings with a
 * user-supplied endpoint, requests go directly from the browser to that
 * endpoint. No data is sent anywhere unless the user explicitly enables it.
 * Failures are shown inline and never break the desktop.
 */
export function AssistantApp(_props: AppComponentProps) {
  const assistant = useSettings((s) => s.assistant);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!assistant.enabled) {
    return (
      <div className="grid h-full place-items-center bg-crypt-800 p-6 text-center font-pixel text-lg text-bone-300">
        <div>
          <p className="mb-2 text-spectral-500">The spirit slumbers.</p>
          <p className="text-base text-bone-500">
            The AI assistant is disabled. Enable it in Settings and provide an endpoint to awaken it.
            GhostOS works completely offline without it.
          </p>
        </div>
      </div>
    );
  }

  async function send() {
    if (!input.trim() || busy) return;
    if (!assistant.endpoint) {
      setError('No endpoint configured. Set one in Settings.');
      return;
    }
    const userMsg: ChatMessage = { role: 'user', content: input };
    const history = [...messages, userMsg];
    setMessages(history);
    setInput('');
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(assistant.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(assistant.apiKey ? { Authorization: `Bearer ${assistant.apiKey}` } : {}),
        },
        body: JSON.stringify({
          model: assistant.model ?? 'default',
          messages: history.map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      const data: unknown = await res.json();
      const content = extractContent(data);
      setMessages((prev) => [...prev, { role: 'assistant', content }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The séance failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-full flex-col bg-crypt-800">
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
        {messages.length === 0 && (
          <p className="font-pixel text-bone-500">Ask the spirit a question…</p>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={[
              'max-w-[85%] rounded-sm border px-2 py-1 font-pixel text-base',
              m.role === 'user'
                ? 'ml-auto border-amethyst-600 bg-amethyst-600/30 text-bone-100'
                : 'border-crypt-500 bg-crypt-700 text-bone-200',
            ].join(' ')}
          >
            {m.content}
          </div>
        ))}
        {busy && <div className="font-pixel text-bone-500">The spirit is channeling…</div>}
        {error && <div className="font-pixel text-blood-500">{error}</div>}
      </div>
      <div className="flex gap-2 border-t border-crypt-500 p-2">
        <input
          aria-label="Message the assistant"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void send();
          }}
          className="min-w-0 flex-1 rounded-sm border border-crypt-500 bg-crypt-900 px-2 py-1 font-pixel text-base text-bone-100 outline-none focus:border-amethyst-500"
        />
        <button
          type="button"
          onClick={() => void send()}
          disabled={busy}
          className="rounded-sm border border-amethyst-600 bg-crypt-700 px-3 font-pixel text-base text-spectral-500 hover:bg-crypt-600 disabled:opacity-40 bevel-out"
        >
          Send
        </button>
      </div>
    </div>
  );
}

function extractContent(data: unknown): string {
  // Best-effort extraction compatible with common chat-completion shapes.
  if (typeof data === 'object' && data !== null) {
    const obj = data as Record<string, unknown>;
    const choices = obj.choices;
    if (Array.isArray(choices) && choices[0] && typeof choices[0] === 'object') {
      const msg = (choices[0] as Record<string, unknown>).message;
      if (msg && typeof msg === 'object' && typeof (msg as Record<string, unknown>).content === 'string') {
        return (msg as Record<string, unknown>).content as string;
      }
    }
    if (typeof obj.content === 'string') return obj.content;
    if (typeof obj.response === 'string') return obj.response;
  }
  return 'The spirit returned an unreadable omen.';
}
