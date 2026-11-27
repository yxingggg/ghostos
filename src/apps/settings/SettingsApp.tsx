import { useEffect, useRef, useState } from 'react';
import type { AppComponentProps } from '../registry';
import { useSettings, WALLPAPERS } from '../../state/settingsStore';
import { WallpaperThumb } from '../../ui/Wallpaper';
import { exportAll, importAll } from '../../state/persist';
import { useToasts } from '../../state/toastStore';
import {
  PROVIDER_PRESETS,
  type ProviderConfig,
  type ProviderId,
} from '../../core/assistant/providers';
import { testConnection } from '../assistant/client';

export function SettingsApp({ props }: AppComponentProps) {
  const crt = useSettings((s) => s.crt);
  const reducedMotion = useSettings((s) => s.reducedMotion);
  const sound = useSettings((s) => s.sound);
  const wallpaper = useSettings((s) => s.wallpaper);
  const assistant = useSettings((s) => s.assistant);
  const toggle = useSettings((s) => s.toggle);
  const set = useSettings((s) => s.set);
  const setAssistant = useSettings((s) => s.setAssistant);
  const push = useToasts((s) => s.push);
  const fileRef = useRef<HTMLInputElement>(null);
  const assistantSectionRef = useRef<HTMLDivElement>(null);
  const [testState, setTestState] = useState<
    { status: 'idle' | 'testing' } | { status: 'ok' | 'error'; message: string }
  >({ status: 'idle' });

  // When launched from Spirit Assistant with focus:'assistant', scroll there.
  useEffect(() => {
    if (props?.focus === 'assistant') {
      assistantSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [props]);

  const preset = PROVIDER_PRESETS[assistant.provider];

  async function runTest() {
    setTestState({ status: 'testing' });
    const cfg: ProviderConfig = {
      provider: assistant.provider,
      endpoint: assistant.endpoint ?? preset.defaultEndpoint,
      model: assistant.model ?? preset.defaultModel,
      apiKey: assistant.apiKey ?? '',
    };
    const res = await testConnection(cfg);
    if (res.ok) setTestState({ status: 'ok', message: 'Connection succeeded — the spirit answered.' });
    else setTestState({ status: 'error', message: res.error });
  }

  function chooseProvider(id: ProviderId) {
    const p = PROVIDER_PRESETS[id];
    // Switching provider clears the key (handled in the store) and prefills
    // sensible defaults for the new provider.
    setAssistant({ provider: id, endpoint: p.defaultEndpoint, model: p.defaultModel });
    setTestState({ status: 'idle' });
  }

  async function doExport() {
    const data = await exportAll();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ghostos-backup-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    push('Workspace exported.');
  }

  async function doImport(file: File) {
    try {
      const text = await file.text();
      const data = JSON.parse(text) as { kv: Record<string, unknown>; content: Record<string, string> };
      await importAll(data);
      push('Workspace imported. Reload to see all changes.');
    } catch {
      push('Import failed: invalid backup file.', 'error');
    }
  }

  return (
    <div className="h-full overflow-y-auto bg-crypt-800 p-4 font-pixel text-lg text-bone-100">
      <Section title="Appearance">
        <Toggle label="CRT effect (scanlines & glow)" checked={crt} onChange={() => toggle('crt')} />
        <Toggle
          label="Reduce motion (disable flicker & animation)"
          checked={reducedMotion}
          onChange={() => toggle('reducedMotion')}
        />
        <div>
          <span className="mb-2 block text-bone-300">Wallpaper</span>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {WALLPAPERS.map((w) => (
              <button
                key={w.id}
                type="button"
                aria-label={w.name}
                aria-pressed={wallpaper === w.id}
                onClick={() => set('wallpaper', w.id)}
                className={[
                  'overflow-hidden rounded-md border-2 text-left transition-transform hover:-translate-y-0.5',
                  wallpaper === w.id ? 'border-spectral-500 shadow-glow-sm' : 'border-crypt-500',
                ].join(' ')}
                title={w.name}
              >
                <span className="relative block h-16 w-full">
                  <WallpaperThumb id={w.id} />
                </span>
                <span className="block bg-crypt-900/80 px-1.5 py-0.5 font-pixel text-[13px] text-bone-100">
                  {w.name}
                </span>
              </button>
            ))}
          </div>
        </div>
      </Section>

      <Section title="Sound">
        <Toggle label="Enable sound effects" checked={sound} onChange={() => toggle('sound')} />
        <p className="text-sm text-bone-500">Sound is off by default and synthesized locally (no files, no network).</p>
      </Section>

      <Section title="Ghost Memory (workspace data)">
        <p className="text-sm text-bone-500">
          Ghost Memory keeps your files, notes, music, and open windows in this browser and
          restores them automatically on each visit. Back it up or move it between browsers here.
        </p>
        <div className="flex gap-2">
          <ActionButton onClick={() => void doExport()}>Export Ghost Memory</ActionButton>
          <ActionButton onClick={() => fileRef.current?.click()}>Import Ghost Memory</ActionButton>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void doImport(f);
            }}
          />
        </div>
      </Section>

      <div ref={assistantSectionRef} id="assistant-settings">
        <Section title="AI Assistant">
          <p className="text-sm text-bone-500">
            Spirit Assistant always has an <strong>offline help mode</strong> that needs no setup.
            The <strong>online AI mode</strong> below is optional and opt-in: when enabled, your
            messages are sent from your browser directly to the provider you configure — they leave
            your device. GhostOS never sends your files or notes, and your API key is kept only in
            this browser session (never saved to disk or included in backups).
          </p>
          <Toggle
            label="Enable online AI mode"
            checked={assistant.enabled}
            onChange={() => setAssistant({ enabled: !assistant.enabled })}
          />
          {assistant.enabled && (
            <div className="mt-2 flex flex-col gap-2">
              <label className="flex flex-col gap-1 text-base">
                <span className="text-bone-300">Provider</span>
                <select
                  aria-label="Provider"
                  value={assistant.provider}
                  onChange={(e) => chooseProvider(e.target.value as ProviderId)}
                  className="rounded-sm border border-crypt-500 bg-crypt-900 px-2 py-1 text-bone-100 outline-none focus:border-amethyst-500"
                >
                  {Object.values(PROVIDER_PRESETS).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </label>
              <p className="text-xs text-bone-500">{preset.note}</p>
              <Field
                label={preset.shape === 'gemini' ? 'Endpoint (models base URL)' : 'Endpoint URL'}
                value={assistant.endpoint ?? ''}
                placeholder={preset.defaultEndpoint || 'https://your-endpoint/v1/chat/completions'}
                onChange={(v) => setAssistant({ endpoint: v })}
              />
              <Field
                label="Model"
                value={assistant.model ?? ''}
                placeholder={preset.defaultModel || 'model name'}
                onChange={(v) => setAssistant({ model: v })}
              />
              <Field
                label="API key (session only)"
                value={assistant.apiKey ?? ''}
                placeholder="kept in memory, never saved or exported"
                type="password"
                onChange={(v) => setAssistant({ apiKey: v })}
              />
              <div className="flex items-center gap-2">
                <ActionButton onClick={() => void runTest()}>
                  {testState.status === 'testing' ? 'Testing…' : 'Test Connection'}
                </ActionButton>
                {testState.status === 'ok' && (
                  <span className="text-sm text-spectral-500">{testState.message}</span>
                )}
                {testState.status === 'error' && (
                  <span className="text-sm text-blood-500">{testState.message}</span>
                )}
              </div>
            </div>
          )}
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-5">
      <h2 className="mb-2 font-gothic text-xl text-spectral-500">{title}</h2>
      <div className="flex flex-col gap-2">{children}</div>
    </section>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-3">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={onChange}
        className={[
          'relative h-6 w-11 shrink-0 rounded-full border transition-colors',
          checked ? 'border-spectral-600 bg-spectral-600/60' : 'border-crypt-500 bg-crypt-700',
        ].join(' ')}
      >
        <span
          className={[
            'absolute top-0.5 h-4 w-4 rounded-full bg-bone-100 transition-all',
            checked ? 'left-[22px]' : 'left-0.5',
          ].join(' ')}
        />
      </button>
      <span>{label}</span>
    </label>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-base">
      <span className="text-bone-300">{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-sm border border-crypt-500 bg-crypt-900 px-2 py-1 text-bone-100 outline-none focus:border-amethyst-500"
      />
    </label>
  );
}

function ActionButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-sm border border-amethyst-600 bg-crypt-700 px-3 py-1 text-base text-spectral-500 hover:bg-crypt-600 bevel-out"
    >
      {children}
    </button>
  );
}
