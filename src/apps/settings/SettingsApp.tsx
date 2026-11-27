import { useRef } from 'react';
import type { AppComponentProps } from '../registry';
import { useSettings } from '../../state/settingsStore';
import { exportAll, importAll } from '../../state/persist';
import { useToasts } from '../../state/toastStore';

export function SettingsApp(_props: AppComponentProps) {
  const crt = useSettings((s) => s.crt);
  const reducedMotion = useSettings((s) => s.reducedMotion);
  const sound = useSettings((s) => s.sound);
  const assistant = useSettings((s) => s.assistant);
  const toggle = useSettings((s) => s.toggle);
  const setAssistant = useSettings((s) => s.setAssistant);
  const push = useToasts((s) => s.push);
  const fileRef = useRef<HTMLInputElement>(null);

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
      </Section>

      <Section title="Sound">
        <Toggle label="Enable sound effects" checked={sound} onChange={() => toggle('sound')} />
        <p className="text-sm text-bone-500">Sound is off by default and synthesized locally (no files, no network).</p>
      </Section>

      <Section title="Workspace data">
        <div className="flex gap-2">
          <ActionButton onClick={() => void doExport()}>Export backup</ActionButton>
          <ActionButton onClick={() => fileRef.current?.click()}>Import backup</ActionButton>
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
        <p className="text-sm text-bone-500">Everything is stored locally in your browser (IndexedDB).</p>
      </Section>

      <Section title="AI Assistant (optional, opt-in)">
        <Toggle
          label="Enable AI assistant"
          checked={assistant.enabled}
          onChange={() => setAssistant({ enabled: !assistant.enabled })}
        />
        <p className="text-sm text-bone-500">
          Disabled by default. The rest of GhostOS works fully offline. When enabled, requests go
          directly from your browser to the endpoint you configure below — nothing is sent anywhere
          unless you turn this on.
        </p>
        {assistant.enabled && (
          <div className="mt-2 flex flex-col gap-2">
            <Field
              label="Endpoint URL"
              value={assistant.endpoint ?? ''}
              placeholder="https://your-endpoint/v1/chat/completions"
              onChange={(v) => setAssistant({ endpoint: v })}
            />
            <Field
              label="Model"
              value={assistant.model ?? ''}
              placeholder="model name"
              onChange={(v) => setAssistant({ model: v })}
            />
            <Field
              label="API key"
              value={assistant.apiKey ?? ''}
              placeholder="stored locally only"
              type="password"
              onChange={(v) => setAssistant({ apiKey: v })}
            />
          </div>
        )}
      </Section>
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
