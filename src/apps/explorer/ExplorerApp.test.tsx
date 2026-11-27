import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, within, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExplorerApp } from './ExplorerApp';
import { registerBuiltinApps } from '../index';
import { __resetPersistenceForTests } from '../../state/persist';
import { useVfs } from '../../state/vfsStore';
import { useWm } from '../../state/wmStore';
import { createInitialState } from '../../core/wm/reducer';

registerBuiltinApps();

async function freshStores(): Promise<void> {
  await __resetPersistenceForTests();
  useWm.setState({ state: createInitialState() });
  // Reset VFS to a clean seeded tree.
  useVfs.setState({ hydrated: false });
  await useVfs.getState().hydrate();
}

describe('ExplorerApp — opening files (regression for "files cannot be opened")', () => {
  beforeEach(async () => {
    await freshStores();
  });

  it('creates a file and opens it into a GraveNotes window on double-click', async () => {
    const user = userEvent.setup();
    render(<ExplorerApp windowId="exp" />);

    // Create a new file via the toolbar.
    await user.click(screen.getByRole('button', { name: 'New File' }));
    const fileBtn = await screen.findByRole('button', { name: 'untitled.txt' });

    // Double-click opens it — a window must be launched for the notes app.
    await user.dblClick(fileBtn);

    await waitFor(() => {
      const wins = Object.values(useWm.getState().state.windows);
      expect(wins.some((w) => w.appId === 'notes')).toBe(true);
    });
    // The launched window carries the VFS file id so the editor binds to it.
    const win = Object.values(useWm.getState().state.windows).find((w) => w.appId === 'notes');
    const createdFile = Object.values(useVfs.getState().vfs.nodes).find(
      (n) => n.name === 'untitled.txt',
    );
    expect(win?.props?.vfsFileId).toBe(createdFile?.id);
  });

  it('opens a file with Enter when selected', async () => {
    const user = userEvent.setup();
    render(<ExplorerApp windowId="exp" />);
    await user.click(screen.getByRole('button', { name: 'New File' }));
    const fileBtn = await screen.findByRole('button', { name: 'untitled.txt' });
    fileBtn.focus();
    await user.click(fileBtn); // select
    fireEvent.keyDown(fileBtn, { key: 'Enter' });
    await waitFor(() => {
      expect(
        Object.values(useWm.getState().state.windows).some((w) => w.appId === 'notes'),
      ).toBe(true);
    });
  });

  it('navigates into a folder on double-click (does not launch a window)', async () => {
    const user = userEvent.setup();
    render(<ExplorerApp windowId="exp" />);
    await user.click(screen.getByRole('button', { name: 'New Folder' }));
    // The toolbar button and the created folder cell share the text "New Folder";
    // the grid cell is the one carrying an explicit aria-label.
    const gridCell = screen
      .getAllByRole('button', { name: 'New Folder' })
      .find((c) => c.getAttribute('aria-label') === 'New Folder');
    expect(gridCell).toBeTruthy();
    if (!gridCell) return;
    await user.dblClick(gridCell);
    // No app window should open for a folder navigation.
    expect(Object.keys(useWm.getState().state.windows)).toHaveLength(0);
    // Breadcrumb now shows the folder.
    expect(screen.getByRole('navigation', { name: /breadcrumb/i })).toHaveTextContent('New Folder');
  });

  it('shows a context menu with the documented actions on right-click', async () => {
    const user = userEvent.setup();
    render(<ExplorerApp windowId="exp" />);
    await user.click(screen.getByRole('button', { name: 'New File' }));
    const fileBtn = await screen.findByRole('button', { name: 'untitled.txt' });
    fireEvent.contextMenu(fileBtn);
    const menu = await screen.findByRole('menu', { name: /file actions/i });
    for (const label of ['Open', 'Open with…', 'Rename', 'Duplicate', 'Download', 'Delete', 'Properties']) {
      expect(within(menu).getByRole('menuitem', { name: label })).toBeInTheDocument();
    }
  });

  it('duplicates a file via the context menu', async () => {
    const user = userEvent.setup();
    render(<ExplorerApp windowId="exp" />);
    await user.click(screen.getByRole('button', { name: 'New File' }));
    const fileBtn = await screen.findByRole('button', { name: 'untitled.txt' });
    fireEvent.contextMenu(fileBtn);
    const menu = await screen.findByRole('menu', { name: /file actions/i });
    await user.click(within(menu).getByRole('menuitem', { name: 'Duplicate' }));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'untitled copy.txt' })).toBeInTheDocument();
    });
  });
});
