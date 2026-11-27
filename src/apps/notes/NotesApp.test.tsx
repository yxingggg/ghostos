import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NotesApp } from './NotesApp';
import { __resetPersistenceForTests } from '../../state/persist';
import { useVfs } from '../../state/vfsStore';
import { childrenOf } from '../../core/vfs/ops';

async function freshVfs(): Promise<void> {
  await __resetPersistenceForTests();
  useVfs.setState({ hydrated: false });
  await useVfs.getState().hydrate();
}

function documentsFolderId(): string {
  const docs = Object.values(useVfs.getState().vfs.nodes).find(
    (n) => n.kind === 'folder' && n.name === 'documents',
  );
  if (!docs) throw new Error('seed documents folder missing');
  return docs.id;
}

describe('NotesApp — bound VFS file editor', () => {
  let fileId = '';
  beforeEach(async () => {
    await freshVfs();
    const id = await useVfs.getState().createTextFile(useVfs.getState().rootId, 'poem.txt', 'first line');
    if (!id) throw new Error('setup failed');
    fileId = id;
  });

  it('loads the VFS file content when opened with a vfsFileId', async () => {
    render(<NotesApp windowId="w" props={{ vfsFileId: fileId }} />);
    const area = await screen.findByLabelText(/contents of poem.txt/i);
    await waitFor(() => expect((area as HTMLTextAreaElement).value).toBe('first line'));
  });

  it('saves edits back to the same file and keeps its identity', async () => {
    const user = userEvent.setup();
    render(<NotesApp windowId="w" props={{ vfsFileId: fileId }} />);
    const area = (await screen.findByLabelText(/contents of poem.txt/i)) as HTMLTextAreaElement;
    await waitFor(() => expect(area.value).toBe('first line'));
    await user.clear(area);
    await user.type(area, 'rewritten');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(async () => {
      expect(await useVfs.getState().readText(fileId)).toBe('rewritten');
    });
    expect(useVfs.getState().node(fileId)?.name).toBe('poem.txt');
  });

  it('shows a Save failed indicator when persistence reports failure', async () => {
    const user = userEvent.setup();
    render(<NotesApp windowId="w" props={{ vfsFileId: fileId }} />);
    const area = (await screen.findByLabelText(/contents of poem.txt/i)) as HTMLTextAreaElement;
    await waitFor(() => expect(area.value).toBe('first line'));
    // Force writeText to fail.
    const original = useVfs.getState().writeText;
    useVfs.setState({ writeText: async () => ({ ok: false, durable: false, error: 'boom' }) });
    await user.type(area, '!');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText(/save failed/i)).toBeInTheDocument();
    useVfs.setState({ writeText: original });
  });
});

describe('NotesApp — new document → Save As integration with Tomb Explorer', () => {
  beforeEach(async () => {
    await freshVfs();
  });

  it('acceptance: new doc → type → Save As into Documents → appears in VFS and reopens', async () => {
    const user = userEvent.setup();
    render(<NotesApp windowId="w" />);

    // A fresh standalone document starts unsaved.
    const area = (await screen.findByLabelText(/document contents/i)) as HTMLTextAreaElement;
    await user.type(area, 'hello from gravenotes');
    expect(screen.getByText(/unsaved changes/i)).toBeInTheDocument();

    // File ▸ Save As…
    await user.click(screen.getByRole('button', { name: 'File' }));
    await user.click(screen.getByRole('menuitem', { name: /save as/i }));

    const dialog = await screen.findByRole('dialog', { name: /save as/i });
    const nameInput = within(dialog).getByLabelText('File name') as HTMLInputElement;
    await user.clear(nameInput);
    await user.type(nameInput, 'hello');
    // Choose the Documents destination folder.
    const folderSelect = within(dialog).getByLabelText('Destination folder') as HTMLSelectElement;
    await user.selectOptions(folderSelect, documentsFolderId());
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));

    // The file now exists in the VFS under Documents (visible to Tomb Explorer).
    await waitFor(() => {
      const kids = childrenOf(useVfs.getState().vfs, documentsFolderId()).map((n) => n.name);
      expect(kids).toContain('hello.txt');
    });
    const created = childrenOf(useVfs.getState().vfs, documentsFolderId()).find(
      (n) => n.name === 'hello.txt',
    );
    expect(created).toBeTruthy();
    if (!created) return;
    expect(await useVfs.getState().readText(created.id)).toBe('hello from gravenotes');

    // Editor is now bound to the file; its title reflects the saved name.
    await waitFor(() => expect(screen.getByText('hello.txt')).toBeInTheDocument());

    // Subsequent edits update the SAME file — no duplicate is created.
    const boundArea = screen.getByLabelText(/contents of hello.txt/i) as HTMLTextAreaElement;
    await user.type(boundArea, '!');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(async () => {
      expect(await useVfs.getState().readText(created.id)).toBe('hello from gravenotes!');
    });
    const sameName = childrenOf(useVfs.getState().vfs, documentsFolderId()).filter(
      (n) => n.name === 'hello.txt',
    );
    expect(sameName).toHaveLength(1);
  });

  it('Ctrl/Cmd+S opens Save As for an unsaved document', async () => {
    const user = userEvent.setup();
    render(<NotesApp windowId="w" />);
    const area = (await screen.findByLabelText(/document contents/i)) as HTMLTextAreaElement;
    await user.type(area, 'draft');
    area.focus();
    await user.keyboard('{Control>}s{/Control}');
    expect(await screen.findByRole('dialog', { name: /save as/i })).toBeInTheDocument();
  });

  it('offers an Open dialog listing VFS text files', async () => {
    const user = userEvent.setup();
    await useVfs.getState().createTextFile(documentsFolderId(), 'existing.txt', 'content');
    render(<NotesApp windowId="w" />);
    await user.click(screen.getByRole('button', { name: 'File' }));
    await user.click(screen.getByRole('menuitem', { name: /open/i }));
    const dialog = await screen.findByRole('dialog', { name: /open file/i });
    await user.click(within(dialog).getByRole('button', { name: /existing.txt/i }));
    const area = (await screen.findByLabelText(/contents of existing.txt/i)) as HTMLTextAreaElement;
    await waitFor(() => expect(area.value).toBe('content'));
  });
});
