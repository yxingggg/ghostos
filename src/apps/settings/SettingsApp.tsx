import { useEffect, useRef, useState } from 'react';
import type { AppComponentProps } from '../registry';
import { useSettings, WALLPAPERS } from '../../state/settingsStore';
import { WallpaperThumb } from '../../ui/Wallpaper';
import { exportAll, importAll, freezeWrites } from '../../state/persist';
import {
  validateBackup,
  summarizeBackup,
  type BackupFile,
  type BackupSummary,
} from '../../core/persistence/backup';
import { GhostLogo, GhostMascot } from '../../assets/brand';
import { APP_NAME, APP_VERSION } from '../../version';
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
  const ghostMemorySectionRef = useRef<HTMLDivElement>(null);
  const [testState, setTestState] = useState<
    { status: 'idle' | 'testing' } | { status: 'ok' | 'error'; message: string }
  >({ status: 'idle' });

  // Ghost Memory resurrection flow state.
  const [lastExport, setLastExport] = useState<BackupSummary | null>(null);
  const [preview, setPreview] = useState<{ backup: BackupFile; summary: BackupSummary } | null>(
    null,
  );
  const [restoreBusy, setRestoreBusy] = useState(false);
  const [restored, setRestored] = useState(false);

  // Deep-link scroll/actions when launched with a `focus` prop.
  useEffect(() => {
    if (props?.focus === 'assistant') {
      assistantSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (props?.focus === 'restore') {
      // From the welcome "Restore a backup" shortcut: reveal Ghost Memory and
      // open the file picker so the user can pick a backup immediately.
      ghostMemorySectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      fileRef.current?.click();
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
    // Summarize the backup we just produced (validate to reuse the same shape).
    const checked = validateBackup(data);
    if (checked.ok) setLastExport(summarizeBackup(checked.backup));
    push('Ghost Memory exported.');
  }

  /**
   * Stage a backup for restore. We parse and VALIDATE the file but perform NO
   * storage mutation — a malformed backup is rejected here, before anything is
   * written, and the user sees a preview + explicit replacement confirmation.
   */
  async function stageImport(file: File) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(await file.text());
    } catch {
      push('Import failed: that file is not valid JSON.', 'error');
      return;
    }
    const checked = validateBackup(parsed);
    if (!checked.ok) {
      push(`Import failed: ${checked.error}`, 'error');
      return;
    }
    setRestored(false);
    setPreview({ backup: checked.backup, summary: summarizeBackup(checked.backup) });
  }

  /** Perform the confirmed restore. Only reached after validation + preview. */
  async function confirmRestore() {
    if (!preview || restoreBusy || restored) return;
    setRestoreBusy(true);
    let durable = false;
    try {
      // Write content blobs first, then the kv slices (so the vfs node index is
      // only replaced once its referenced blobs exist). importAll ignores
      // unknown keys and already excludes the session-only API key. It returns
      // false if any write was not durable (storage degraded mid-import).
      durable = await importAll({ kv: preview.backup.kv, content: preview.backup.content });
    } catch {
      setRestoreBusy(false);
      push(
        'Restore failed mid-write. Your workspace may be PARTIALLY replaced and inconsistent — do not rely on it. Re-import the backup to retry, and in future export your current workspace before restoring so you can recover it.',
        'error',
      );
      return;
    }
    setRestoreBusy(false);
    if (!durable) {
      // Partial/failed restore: NEVER show success. Writes may be inconsistent.
      push(
        'Restore did not complete — storage is unavailable, so the backup was not durably written and your workspace may be partially replaced. Nothing was safely restored. Export your current workspace before trying again.',
        'error',
      );
      return;
    }
    // Success: freeze all further writes in this tab so a stale autosave or any
    // interaction before reload cannot overwrite the restored data.
    freezeWrites();
    setRestored(true);
  }

  function cancelRestore() {
    setPreview(null);
    setRestoreBusy(false);
    setRestored(false);
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

      <div ref={ghostMemorySectionRef}>
        <Section title="Ghost Memory (workspace resurrection)">
          <p className="text-sm text-bone-500">
            Ghost Memory keeps your files, notes, music, and open windows in this browser and
            restores them automatically on each visit — no account, no server. Export a portable
            backup to move your whole workspace between browsers or machines, or resurrect one here.
          </p>
          <div className="flex flex-wrap gap-2">
            <ActionButton onClick={() => void doExport()}>Export Ghost Memory</ActionButton>
            <ActionButton onClick={() => fileRef.current?.click()}>Restore from backup…</ActionButton>
            <input
              ref={fileRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                // Reset the input so re-selecting the same file re-triggers change.
                e.target.value = '';
                if (f) void stageImport(f);
              }}
            />
          </div>
          {lastExport && (
            <p className="text-xs text-spectral-400" role="status">
              Last export: {lastExport.files} files, {lastExport.folders} folders,{' '}
              {lastExport.notes} notes, {lastExport.tracks} tracks · wallpaper{' '}
              {lastExport.wallpaper ?? 'default'}.
            </p>
          )}
        </Section>
      </div>

      {preview && (
        <RestoreDialog
          summary={preview.summary}
          busy={restoreBusy}
          restored={restored}
          onConfirm={() => void confirmRestore()}
          onCancel={cancelRestore}
          onEnter={() => window.location.reload()}
        />
      )}

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

      <Section title="About GhostOS">
        <div className="flex items-center gap-3">
          <GhostMascot className="h-12 w-12" float={false} />
          <div>
            <GhostLogo className="text-xl" showMascot={false} />
            <p className="font-pixel text-sm text-bone-400">a haunted desktop, reborn</p>
          </div>
        </div>
        <p className="text-sm text-bone-500">
          {APP_NAME} v{APP_VERSION} — a fully client-side, offline-first retro-gothic desktop.
          Your workspace lives in this browser via Ghost Memory; nothing is sent to a server
          except the optional, opt-in online AI you configure yourself.
        </p>
        <p className="text-xs text-bone-500">
          Built for Kiroween 2026 (Resurrection). MIT licensed. Icons, wallpapers, mascot, and
          demo music are original assets.
        </p>
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

/**
 * The workspace "resurrection" dialog: shows a preview of the backup's
 * contents, requires an explicit replacement confirmation, reflects a busy
 * state during restore, and ends with an explicit "Enter restored workspace"
 * button (a clean reload) rather than an automatic reload — so the user stays
 * in control and the app re-hydrates from the now-consistent store.
 */
function RestoreDialog({
  summary,
  busy,
  restored,
  onConfirm,
  onCancel,
  onEnter,
}: {
  summary: BackupSummary;
  busy: boolean;
  restored: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  onEnter: () => void;
}) {
  return (
    <div className="absolute inset-0 z-[600] grid place-items-center bg-black/60 p-4 animate-fadein">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={restored ? 'Workspace resurrected' : 'Confirm workspace restore'}
        className="w-full max-w-md overflow-hidden rounded-xl border border-amethyst-600/70 bg-crypt-800 shadow-window"
      >
        <div className="flex items-center gap-3 border-b border-amethyst-600/50 bg-gradient-to-r from-amethyst-600/40 via-crypt-700 to-crypt-800 p-4">
          <GhostMascot className="h-12 w-12" float={false} />
          <div>
            <h2 className="font-gothic text-xl text-spectral-500">
              {restored ? 'Workspace resurrected' : 'Resurrect this workspace?'}
            </h2>
            <p className="font-pixel text-sm text-bone-400">
              {summary.createdAt
                ? `Backup from ${new Date(summary.createdAt).toLocaleString()}`
                : 'Backup (older format — no timestamp)'}
              {summary.appVersion ? ` · GhostOS v${summary.appVersion}` : ''}
            </p>
          </div>
        </div>

        <div className="p-4 font-pixel text-base text-bone-200">
          <p className="mb-2 text-bone-300">This backup contains:</p>
          <ul className="mb-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-bone-200">
            <li>📄 {summary.files} files</li>
            <li>📁 {summary.folders} folders</li>
            <li>📝 {summary.notes} notes</li>
            <li>🎵 {summary.tracks} tracks</li>
            <li>🖼 wallpaper: {summary.wallpaper ?? 'default'}</li>
            <li>💾 {summary.contentItems} stored items</li>
          </ul>

          {restored ? (
            <p className="mb-4 text-sm text-spectral-400" role="status">
              Your workspace has been restored to Ghost Memory. Saving is paused to protect it —
              enter the restored workspace to reload and re-summon your desktop.
            </p>
          ) : (
            <>
              <p className="mb-2 text-sm text-blood-400">
                This <strong>replaces</strong> your current GhostOS workspace (files, notes, music,
                settings, and window layout) in this browser. It can only be undone if you exported
                your current workspace first — do that before restoring if you want to keep it.
              </p>
              <p className="mb-4 text-xs text-bone-500">
                For a clean restore, close other GhostOS tabs first: this tab stops saving once the
                restore succeeds, but another open tab could still write over the restored data.
              </p>
            </>
          )}

          <div className="flex flex-wrap items-center gap-2">
            {restored ? (
              <ActionButton onClick={onEnter}>Enter restored workspace</ActionButton>
            ) : (
              <>
                <ActionButton onClick={onConfirm}>
                  {busy ? 'Resurrecting…' : 'Replace & restore'}
                </ActionButton>
                <button
                  type="button"
                  onClick={onCancel}
                  disabled={busy}
                  className="rounded-sm border border-crypt-500 bg-crypt-700 px-3 py-1 font-pixel text-base text-bone-300 hover:bg-crypt-600 disabled:opacity-40"
                >
                  Cancel
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
