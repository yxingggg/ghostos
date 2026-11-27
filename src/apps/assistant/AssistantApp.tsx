import { useState } from 'react';
import type { AppComponentProps } from '../registry';
import { useSettings } from '../../state/settingsStore';
import { useWm } from '../../state/wmStore';
import {
  answerQuestion,
  suggestedQuestions,
  type HelpTopic,
} from '../../core/assistant/offlineHelp';
import { PROVIDER_PRESETS, type ChatMessage, type ProviderConfig } from '../../core/assistant/providers';
import { sendToProvider } from './client';

interface DisplayMessage {
  role: 'user' | 'assistant';
  content: string;
}

type Mode = 'offline' | 'online';

/**
 * Spirit Assistant. Two modes:
 *  - Offline Spirit (default): a rule-based local help assistant — no network,
 *    no API key, not a generative model. Always available.
 *  - Online AI (opt-in): sends messages to a user-configured provider.
 */
export function AssistantApp(_props: AppComponentProps) {
  const [mode, setMode] = useState<Mode>('offline');
  const assistantEnabled = useSettings((s) => s.assistant.enabled);

  return (
    <div className="flex h-full flex-col bg-crypt-800">
      <div className="flex shrink-0 border-b border-crypt-500">
        <TabButton active={mode === 'offline'} onClick={() => setMode('offline')}>
          Offline Spirit
        </TabButton>
        <TabButton active={mode === 'online'} onClick={() => setMode('online')}>
          Online AI {assistantEnabled ? '' : '(off)'}
        </TabButton>
      </div>
      {mode === 'offline' ? <OfflineSpirit /> : <OnlineAI />}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'flex-1 px-3 py-1.5 font-pixel text-base',
        active ? 'bg-amethyst-600/40 text-bone-100' : 'text-bone-400 hover:bg-crypt-700',
      ].join(' ')}
    >
      {children}
    </button>
  );
}

/** Offline, rule-based help assistant. */
function OfflineSpirit() {
  const [messages, setMessages] = useState<DisplayMessage[]>([
    {
      role: 'assistant',
      content:
        "I'm the offline help spirit. I answer questions about GhostOS from local " +
        'documentation — I am not a generative AI model, and I work with no internet. ' +
        'Ask me something, or pick a question below.',
    },
  ]);
  const [input, setInput] = useState('');
  const suggestions = suggestedQuestions(6);

  function ask(text: string) {
    const q = text.trim();
    if (!q) return;
    const res = answerQuestion(q);
    setMessages((prev) => [
      ...prev,
      { role: 'user', content: q },
      { role: 'assistant', content: res.answer },
    ]);
    setInput('');
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
        {messages.map((m, i) => (
          <Bubble key={i} role={m.role} content={m.content} />
        ))}
        <div className="pt-1">
          <p className="mb-1 font-pixel text-sm text-bone-500">Suggested questions:</p>
          <div className="flex flex-wrap gap-1.5">
            {suggestions.map((s: HelpTopic) => (
              <button
                key={s.id}
                type="button"
                onClick={() => ask(s.question)}
                className="rounded-sm border border-crypt-500 bg-crypt-700 px-2 py-1 text-left font-pixel text-sm text-spectral-400 hover:bg-crypt-600"
              >
                {s.question}
              </button>
            ))}
          </div>
        </div>
      </div>
      <Composer
        input={input}
        setInput={setInput}
        onSend={() => ask(input)}
        placeholder="Ask about GhostOS…"
      />
    </div>
  );
}

/** Online AI mode — opt-in, user-configured provider. */
function OnlineAI() {
  const assistant = useSettings((s) => s.assistant);
  const openWindow = useWm((s) => s.open);
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openSettings() {
    openWindow({
      appId: 'settings',
      title: 'Settings',
      singleton: true,
      props: { focus: 'assistant' },
    });
  }

  if (!assistant.enabled) {
    return (
      <div className="grid min-h-0 flex-1 place-items-center p-6 text-center font-pixel text-bone-300">
        <div>
          <p className="mb-2 text-lg text-spectral-500">Online AI is disabled.</p>
          <p className="mb-4 text-base text-bone-500">
            GhostOS works fully offline — use the Offline Spirit tab for help with no setup. To use
            a real AI model, enable online mode and add your own provider and API key.
          </p>
          <button
            type="button"
            onClick={openSettings}
            className="rounded-sm border border-amethyst-600 bg-crypt-700 px-3 py-1.5 font-pixel text-base text-spectral-500 hover:bg-crypt-600 bevel-out"
          >
            Open Assistant Settings
          </button>
        </div>
      </div>
    );
  }

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    const history: DisplayMessage[] = [...messages, { role: 'user', content: text }];
    setMessages(history);
    setInput('');
    setError(null);
    setBusy(true);
    const preset = PROVIDER_PRESETS[assistant.provider];
    const cfg: ProviderConfig = {
      provider: assistant.provider,
      endpoint: assistant.endpoint ?? preset.defaultEndpoint,
      model: assistant.model ?? preset.defaultModel,
      apiKey: assistant.apiKey ?? '',
    };
    // Only the conversation is sent — never VFS files or notes.
    const chat: ChatMessage[] = history.map((m) => ({ role: m.role, content: m.content }));
    const res = await sendToProvider(cfg, chat);
    if (res.ok) {
      setMessages((prev) => [...prev, { role: 'assistant', content: res.content }]);
    } else {
      setError(res.error);
    }
    setBusy(false);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between border-b border-crypt-500 px-3 py-1">
        <span className="font-pixel text-sm text-bone-500">
          {PROVIDER_PRESETS[assistant.provider].label} · online · requests leave your device
        </span>
        <button
          type="button"
          onClick={openSettings}
          className="font-pixel text-sm text-spectral-400 hover:text-spectral-500 underline"
        >
          Settings
        </button>
      </div>
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
        {messages.length === 0 && (
          <p className="font-pixel text-bone-500">Ask the spirit a question…</p>
        )}
        {messages.map((m, i) => (
          <Bubble key={i} role={m.role} content={m.content} />
        ))}
        {busy && <div className="font-pixel text-bone-500">The spirit is channeling…</div>}
        {error && <div className="font-pixel text-blood-500">{error}</div>}
      </div>
      <Composer input={input} setInput={setInput} onSend={() => void send()} disabled={busy} placeholder="Message the AI…" />
    </div>
  );
}

function Bubble({ role, content }: { role: 'user' | 'assistant'; content: string }) {
  return (
    <div
      className={[
        'max-w-[88%] whitespace-pre-wrap rounded-sm border px-2 py-1 font-pixel text-base',
        role === 'user'
          ? 'ml-auto border-amethyst-600 bg-amethyst-600/30 text-bone-100'
          : 'border-crypt-500 bg-crypt-700 text-bone-200',
      ].join(' ')}
    >
      {content}
    </div>
  );
}

function Composer({
  input,
  setInput,
  onSend,
  disabled,
  placeholder,
}: {
  input: string;
  setInput: (v: string) => void;
  onSend: () => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  return (
    <div className="flex shrink-0 gap-2 border-t border-crypt-500 p-2">
      <input
        aria-label="Message the assistant"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onSend();
        }}
        placeholder={placeholder}
        className="min-w-0 flex-1 rounded-sm border border-crypt-500 bg-crypt-900 px-2 py-1 font-pixel text-base text-bone-100 outline-none focus:border-amethyst-500"
      />
      <button
        type="button"
        onClick={onSend}
        disabled={disabled}
        className="rounded-sm border border-amethyst-600 bg-crypt-700 px-3 font-pixel text-base text-spectral-500 hover:bg-crypt-600 disabled:opacity-40 bevel-out"
      >
        Send
      </button>
    </div>
  );
}
