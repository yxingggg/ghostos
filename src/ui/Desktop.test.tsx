import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Desktop } from './Desktop';
import { registerBuiltinApps } from '../apps';
import { useWm } from '../state/wmStore';
import { createInitialState } from '../core/wm/reducer';

registerBuiltinApps();

describe('Desktop shell (integration)', () => {
  beforeEach(() => {
    useWm.setState({ state: createInitialState() });
  });

  it('renders desktop icons for registered apps', () => {
    render(<Desktop />);
    const grid = screen.getByRole('grid', { name: /desktop icons/i });
    expect(within(grid).getByLabelText('GraveNotes')).toBeInTheDocument();
    expect(within(grid).getByLabelText('Phantom Terminal')).toBeInTheDocument();
  });

  it('launches an app window on icon double-click and shows a taskbar button', async () => {
    const user = userEvent.setup();
    render(<Desktop />);
    const grid = screen.getByRole('grid', { name: /desktop icons/i });
    await user.dblClick(within(grid).getByLabelText('Calculator'));
    // A dialog window appears for the app.
    expect(screen.getByRole('dialog', { name: 'Calculator' })).toBeInTheDocument();
    expect(Object.keys(useWm.getState().state.windows)).toHaveLength(1);
  });

  it('opens the start menu and launches from it', async () => {
    const user = userEvent.setup();
    render(<Desktop />);
    await user.click(screen.getByRole('button', { name: /start menu/i }));
    const menu = screen.getByRole('menu', { name: /start menu/i });
    await user.click(within(menu).getByRole('menuitem', { name: 'GraveNotes' }));
    expect(screen.getByRole('dialog', { name: 'GraveNotes' })).toBeInTheDocument();
  });

  it('closes a window via its close control', async () => {
    const user = userEvent.setup();
    render(<Desktop />);
    const grid = screen.getByRole('grid', { name: /desktop icons/i });
    await user.dblClick(within(grid).getByLabelText('Calculator'));
    const dialog = screen.getByRole('dialog', { name: 'Calculator' });
    await user.click(within(dialog).getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog', { name: 'Calculator' })).not.toBeInTheDocument();
    expect(Object.keys(useWm.getState().state.windows)).toHaveLength(0);
  });
});
