import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AssistantApp } from './AssistantApp';
import { useSettings, defaultSettings } from '../../state/settingsStore';
import { useWm } from '../../state/wmStore';
import { createInitialState } from '../../core/wm/reducer';

describe('AssistantApp — offline + online modes', () => {
  beforeEach(() => {
    useSettings.setState({ ...defaultSettings, hydrated: true });
    useWm.setState({ state: createInitialState() });
  });

  it('defaults to the offline help mode and labels it as non-generative', () => {
    render(<AssistantApp windowId="a" />);
    expect(screen.getByText(/not a generative ai/i)).toBeInTheDocument();
  });

  it('answers a clicked suggested question offline (no network)', async () => {
    const user = userEvent.setup();
    render(<AssistantApp windowId="a" />);
    await user.click(screen.getByRole('button', { name: /what terminal commands/i }));
    // The offline knowledge-base answer mentions specific commands.
    expect(await screen.findByText(/mkdir/i)).toBeInTheDocument();
  });

  it('answers a typed question offline', async () => {
    const user = userEvent.setup();
    render(<AssistantApp windowId="a" />);
    const box = screen.getByRole('textbox', { name: /message the assistant/i });
    await user.type(box, 'how do I open a file');
    await user.keyboard('{Enter}');
    expect(await screen.findByText(/double-click a file/i)).toBeInTheDocument();
  });

  it('online tab shows an opt-in prompt and can open settings when disabled', async () => {
    const user = userEvent.setup();
    render(<AssistantApp windowId="a" />);
    await user.click(screen.getByRole('button', { name: /online ai/i }));
    expect(screen.getByText(/online ai is disabled/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /open assistant settings/i }));
    // A Settings window was launched via the registry (no WM app-branching).
    const settingsWin = Object.values(useWm.getState().state.windows).find(
      (w) => w.appId === 'settings',
    );
    expect(settingsWin).toBeDefined();
    expect(settingsWin?.props?.focus).toBe('assistant');
  });

  it('online tab shows the chat composer when enabled', async () => {
    useSettings.setState({
      ...defaultSettings,
      hydrated: true,
      assistant: { enabled: true, provider: 'openai' },
    });
    const user = userEvent.setup();
    render(<AssistantApp windowId="a" />);
    await user.click(screen.getByRole('button', { name: /online ai/i }));
    const banner = screen.getByText(/requests leave your device/i);
    expect(banner).toBeInTheDocument();
    expect(within(document.body).getByText(/OpenAI · online/i)).toBeInTheDocument();
  });
});
