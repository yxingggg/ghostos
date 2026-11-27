import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SettingsApp } from './SettingsApp';
import { registerBuiltinApps } from '../index';
import {
  __resetPersistenceForTests,
  exportAll,
  freezeWrites,
  loadSlice,
  saveSlice,
  putContent,
  getContent,
} from '../../state/persist';

registerBuiltinApps();

beforeEach(async () => {
  await __resetPersistenceForTests();
});

/** Build a File from a JSON-serializable object for the hidden file input. */
function backupFile(obj: unknown, name = 'backup.json'): File {
  return new File([JSON.stringify(obj)], name, { type: 'application/json' });
}

/** A valid backup carrying one setting, one note, and one content blob. */
function validBackupObject() {
  return {
    version: 1,
    meta: { app: 'GhostOS', appVersion: '9.9.9', createdAt: '2026-11-27T12:00:00.000Z' },
    kv: {
      settings: { crt: false, wallpaper: 'void' },
      notes: [{ id: 'n1', title: 'restored', body: 'x', createdAt: 1, updatedAt: 1 }],
      vfs: {
        rootId: 'root',
        nodes: { root: { id: 'root', kind: 'folder', parentId: null, name: '/' } },
      },
    },
    content: { blobX: 'str:restored-content' },
  };
}

describe('SettingsApp — Ghost Memory resurrection flow', () => {
  it('shows an accurate export summary after exporting', async () => {
    // Seed a known workspace, then export via the UI and check the summary line.
    await saveSlice('settings', { wallpaper: 'forest' });
    await saveSlice('notes', [{ id: 'a' }, { id: 'b' }]);
    const user = userEvent.setup();
    render(<SettingsApp windowId="set" />);

    await user.click(screen.getByRole('button', { name: /export ghost memory/i }));

    // The summary reflects the real seeded counts (2 notes, forest wallpaper).
    const status = await screen.findByText(/last export:/i);
    expect(status).toHaveTextContent(/2 notes/i);
    expect(status).toHaveTextContent(/wallpaper forest/i);
  });

  it('rejects a malformed backup before any mutation (no preview, data intact)', async () => {
    await saveSlice('settings', { wallpaper: 'castle' });
    const user = userEvent.setup();
    const { container } = render(<SettingsApp windowId="set" />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;

    await user.upload(input, backupFile({ not: 'a backup' }));

    // An error toast-worthy message is produced and NO preview dialog appears.
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: /confirm workspace restore/i })).toBeNull();
    });
    // Existing data is untouched.
    expect(await loadSlice('settings')).toEqual({ wallpaper: 'castle' });
  });

  it('cancel safety: previewing then cancelling restores nothing', async () => {
    await saveSlice('settings', { wallpaper: 'castle' });
    const user = userEvent.setup();
    const { container } = render(<SettingsApp windowId="set" />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;

    await user.upload(input, backupFile(validBackupObject()));

    // Preview appears with accurate counts, but nothing is written yet.
    const dialog = await screen.findByRole('dialog', { name: /confirm workspace restore/i });
    expect(dialog).toHaveTextContent(/1 notes/i);
    expect(await loadSlice('settings')).toEqual({ wallpaper: 'castle' }); // unchanged

    await user.click(screen.getByRole('button', { name: /cancel/i }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: /confirm workspace restore/i })).toBeNull();
    });
    // Still the original workspace — the backup was NOT applied.
    expect(await loadSlice('settings')).toEqual({ wallpaper: 'castle' });
    expect(await getContent('blobX')).toBeUndefined();
  });

  it('restore round-trip: confirming replaces data and shows the Enter button', async () => {
    await saveSlice('settings', { wallpaper: 'castle' });
    const user = userEvent.setup();
    const { container } = render(<SettingsApp windowId="set" />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;

    await user.upload(input, backupFile(validBackupObject()));
    await screen.findByRole('dialog', { name: /confirm workspace restore/i });

    await user.click(screen.getByRole('button', { name: /replace & restore/i }));

    // Success state: the explicit "Enter restored workspace" button appears
    // (we do NOT click it — that triggers a reload).
    await screen.findByRole('button', { name: /enter restored workspace/i });

    // The backup was actually applied to storage (round-trip).
    expect(await loadSlice('settings')).toEqual({ crt: false, wallpaper: 'void' });
    expect(await getContent('blobX')).toBe('restored-content');
  });

  it('no false success: a non-durable restore shows failure, not the Enter button', async () => {
    await saveSlice('settings', { wallpaper: 'castle' });
    // Freeze writes to simulate storage that cannot durably persist the import,
    // so importAll reports not-durable (false) for every write.
    freezeWrites();
    const user = userEvent.setup();
    const { container } = render(<SettingsApp windowId="set" />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;

    await user.upload(input, backupFile(validBackupObject()));
    await screen.findByRole('dialog', { name: /confirm workspace restore/i });
    await user.click(screen.getByRole('button', { name: /replace & restore/i }));

    // The success control must NOT appear — the restore was not durable.
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /enter restored workspace/i })).toBeNull();
    });
    // Dialog stays in its confirm state (still offers Cancel), not success.
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  it('exportAll carries provenance meta and remains importable', async () => {
    await saveSlice('settings', { crt: true });
    await putContent('c1', 'payload');
    const dump = await exportAll();
    expect(dump.meta.app).toBe('GhostOS');
    expect(typeof dump.meta.appVersion).toBe('string');
    expect(typeof dump.meta.createdAt).toBe('string');
  });
});
