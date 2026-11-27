import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NotesApp } from './NotesApp';
import { __resetPersistenceForTests } from '../../state/persist';
import { useVfs } from '../../state/vfsStore';

async function freshVfs(): Promise<string> {
  await __resetPersistenceForTests();
  useVfs.setState({ hydrated: false });
  await useVfs.getState().hydrate();
  const root = useVfs.getState().rootId;
  const id = await useVfs.getState().createTextFile(root, 'poem.txt', 'first line');
  if (!id) throw new Error('setup failed');
  return id;
}

describe('NotesApp — VFS file editor mode', () => {
  let fileId = '';
  beforeEach(async () => {
    fileId = await freshVfs();
  });

  it('loads the VFS file content when opened with a vfsFileId', async () => {
    render(<NotesApp windowId="w" props={{ vfsFileId: fileId }} />);
    const area = await screen.findByLabelText(/contents of poem.txt/i);
    await waitFor(() => expect((area as HTMLTextAreaElement).value).toBe('first line'));
  });

  it('saves edits back to the same VFS file (no unrelated note)', async () => {
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
    // The file node kept its identity.
    expect(useVfs.getState().node(fileId)?.name).toBe('poem.txt');
  });

  it('opens an empty VFS file without error and allows editing', async () => {
    const root = useVfs.getState().rootId;
    const emptyId = await useVfs.getState().createTextFile(root, 'blank.txt', '');
    expect(emptyId).not.toBeNull();
    if (!emptyId) return;
    const user = userEvent.setup();
    render(<NotesApp windowId="w" props={{ vfsFileId: emptyId }} />);
    const area = (await screen.findByLabelText(/contents of blank.txt/i)) as HTMLTextAreaElement;
    await waitFor(() => expect(area.value).toBe(''));
    await user.type(area, 'no longer empty');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(async () => {
      expect(await useVfs.getState().readText(emptyId)).toBe('no longer empty');
    });
  });

  it('falls back to standalone notes when no vfsFileId is given', () => {
    render(<NotesApp windowId="w" />);
    expect(screen.getByRole('button', { name: '+ New Note' })).toBeInTheDocument();
  });
});
