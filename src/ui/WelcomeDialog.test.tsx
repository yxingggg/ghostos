import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WelcomeDialog } from './WelcomeDialog';
import { __resetPersistenceForTests } from '../state/persist';
import { useVfs } from '../state/vfsStore';

beforeEach(async () => {
  await __resetPersistenceForTests();
  // Seed a clean VFS so first-launch sample seeding has a home/documents target.
  useVfs.setState({ hydrated: false });
  await useVfs.getState().hydrate();
});

async function openWelcome(onOpenApp = vi.fn()): Promise<ReturnType<typeof vi.fn>> {
  render(<WelcomeDialog onOpenApp={onOpenApp} />);
  // The dialog appears after the (idempotent) sample-seed completes.
  await screen.findByRole('dialog', { name: /welcome to ghostos/i });
  return onOpenApp;
}

describe('WelcomeDialog', () => {
  it('renders exactly the four quick-action buttons', async () => {
    await openWelcome();
    for (const label of [/explore my files/i, /hear a demo track/i, /restore a backup/i, /enter ghostos/i]) {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument();
    }
  });

  it('lays the four buttons out in a 2-column grid container', async () => {
    await openWelcome();
    const btn = screen.getByRole('button', { name: /explore my files/i });
    const grid = btn.parentElement as HTMLElement;
    // The shared container is a CSS grid with a 2-col breakpoint, holding all four.
    expect(grid.className).toMatch(/grid/);
    expect(grid.className).toMatch(/grid-cols-2/);
    expect(grid.querySelectorAll('button')).toHaveLength(4);
    // Every button is full-width so the 2×2 cells are equal-sized.
    for (const b of Array.from(grid.querySelectorAll('button'))) {
      expect(b.className).toMatch(/w-full/);
    }
  });

  it('"Restore a backup" opens Settings at the restore picker', async () => {
    const onOpenApp = await openWelcome();
    await userEvent.click(screen.getByRole('button', { name: /restore a backup/i }));
    expect(onOpenApp).toHaveBeenCalledWith('settings', { focus: 'restore' });
  });

  it('does not overclaim offline availability (acknowledges the optional online AI)', async () => {
    await openWelcome();
    const dialog = screen.getByRole('dialog', { name: /welcome to ghostos/i });
    const text = dialog.textContent ?? '';
    // Must NOT say the blanket "Everything runs offline".
    expect(text).not.toMatch(/everything runs offline/i);
    // Must acknowledge the online AI as the networked exception.
    expect(text).toMatch(/online ai/i);
  });

  it('dismiss marks the welcome seen so it does not reappear', async () => {
    await openWelcome();
    await userEvent.click(screen.getByRole('button', { name: /enter ghostos/i }));
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: /welcome to ghostos/i })).toBeNull();
    });
  });
});
