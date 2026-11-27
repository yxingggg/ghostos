import { describe, it, expect, beforeEach } from 'vitest';
import { __resetPersistenceForTests, exportAll, loadSlice } from './persist';
import { useSettings, defaultSettings } from './settingsStore';

describe('settingsStore — assistant credential handling', () => {
  beforeEach(async () => {
    await __resetPersistenceForTests();
    useSettings.setState({ ...defaultSettings, hydrated: true });
  });

  it('defaults to online AI disabled with the openai provider', () => {
    expect(useSettings.getState().assistant.enabled).toBe(false);
    expect(useSettings.getState().assistant.provider).toBe('openai');
  });

  it('keeps the API key in memory but never persists it to storage', async () => {
    useSettings.getState().setAssistant({ enabled: true, apiKey: 'sk-secret', endpoint: 'https://api.openai.com/v1/chat/completions' });
    // In-memory state has the key.
    expect(useSettings.getState().assistant.apiKey).toBe('sk-secret');
    // Persisted slice must NOT contain it.
    await new Promise((r) => setTimeout(r, 10));
    const stored = await loadSlice<{ assistant?: { apiKey?: string } }>('settings');
    expect(stored?.assistant).toBeDefined();
    expect(stored?.assistant?.apiKey).toBeUndefined();
  });

  it('excludes the API key from workspace exports', async () => {
    useSettings.getState().setAssistant({ enabled: true, apiKey: 'sk-secret' });
    await new Promise((r) => setTimeout(r, 10));
    const dump = await exportAll();
    const json = JSON.stringify(dump);
    expect(json).not.toContain('sk-secret');
  });

  it('clears the API key when switching provider', () => {
    useSettings.getState().setAssistant({ apiKey: 'sk-openai' });
    expect(useSettings.getState().assistant.apiKey).toBe('sk-openai');
    useSettings.getState().setAssistant({ provider: 'gemini' });
    expect(useSettings.getState().assistant.apiKey).toBeUndefined();
  });

  it('clears the API key when changing the endpoint', () => {
    useSettings.getState().setAssistant({ endpoint: 'https://a.example/v1', apiKey: 'k1' });
    expect(useSettings.getState().assistant.apiKey).toBe('k1');
    useSettings.getState().setAssistant({ endpoint: 'https://b.example/v1' });
    expect(useSettings.getState().assistant.apiKey).toBeUndefined();
  });

  it('does not clear the key when the same patch sets a new key', () => {
    useSettings.getState().setAssistant({ provider: 'gemini', apiKey: 'g-key' });
    expect(useSettings.getState().assistant.provider).toBe('gemini');
    expect(useSettings.getState().assistant.apiKey).toBe('g-key');
  });
});
