import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Toolbar, type ToolbarAction } from './Toolbar';

// Drive the width-based collapse by stubbing clientWidth (jsdom reports 0).
function stubWidth(px: number): void {
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
    configurable: true,
    get() {
      return px;
    },
  });
}

const actions: ToolbarAction[] = [
  { id: 'a', label: 'New Folder', priority: 5, onClick: vi.fn() },
  { id: 'b', label: 'New File', priority: 4, onClick: vi.fn() },
  { id: 'c', label: 'Open', priority: 3, onClick: vi.fn() },
  { id: 'd', label: 'Rename', priority: 2, onClick: vi.fn() },
  { id: 'e', label: 'Delete', priority: 1, danger: true, onClick: vi.fn() },
];

describe('Toolbar — responsive overflow', () => {
  afterEach(() => {
    // Remove the clientWidth override between tests.
    delete (HTMLElement.prototype as unknown as { clientWidth?: number }).clientWidth;
  });

  it('shows all actions when there is plenty of width', () => {
    stubWidth(2000);
    render(<Toolbar actions={actions} />);
    for (const a of actions) {
      expect(screen.getByRole('button', { name: a.label })).toBeInTheDocument();
    }
    expect(screen.queryByRole('button', { name: /more actions/i })).not.toBeInTheDocument();
  });

  it('collapses lowest-priority actions into an overflow menu when narrow', async () => {
    stubWidth(260); // room for ~2 buttons + the More button
    const user = userEvent.setup();
    render(<Toolbar actions={actions} />);

    const more = screen.getByRole('button', { name: /more actions/i });
    expect(more).toBeInTheDocument();
    // Highest-priority actions stay visible as top-level buttons.
    expect(screen.getByRole('button', { name: 'New Folder' })).toBeInTheDocument();

    await user.click(more);
    const menu = screen.getByRole('menu', { name: /more actions/i });
    // A low-priority action is in the overflow menu and still works.
    const del = within(menu).getByRole('menuitem', { name: 'Delete' });
    expect(del).toBeInTheDocument();
    await user.click(del);
    expect(actions[4]?.onClick).toHaveBeenCalled();
  });
});

describe('Toolbar — action behavior', () => {
  beforeEach(() => stubWidth(2000));
  afterEach(() => {
    delete (HTMLElement.prototype as unknown as { clientWidth?: number }).clientWidth;
  });

  it('invokes a visible action and respects disabled', async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(
      <Toolbar
        actions={[
          { id: 'x', label: 'Go', onClick },
          { id: 'y', label: 'Nope', onClick: vi.fn(), disabled: true },
        ]}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Go' }));
    expect(onClick).toHaveBeenCalledOnce();
    expect(screen.getByRole('button', { name: 'Nope' })).toBeDisabled();
  });
});
