import { describe, it, expect } from 'vitest';
import {
  buildRequest,
  classifyHttpError,
  classifyNetworkError,
  parseResponse,
  PROVIDER_PRESETS,
  type ChatMessage,
  type ProviderConfig,
} from './providers';

const messages: ChatMessage[] = [
  { role: 'system', content: 'be concise' },
  { role: 'user', content: 'hello' },
];

describe('buildRequest — OpenAI shape', () => {
  const cfg: ProviderConfig = {
    provider: 'openai',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    model: 'gpt-4o-mini',
    apiKey: 'sk-test',
  };
  it('formats a chat-completions request with bearer auth', () => {
    const r = buildRequest(cfg, messages);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.request.url).toBe(cfg.endpoint);
    expect(r.request.headers['Authorization']).toBe('Bearer sk-test');
    const body = JSON.parse(r.request.body);
    expect(body.model).toBe('gpt-4o-mini');
    expect(body.messages).toHaveLength(2);
    expect(body.messages[0]).toEqual({ role: 'system', content: 'be concise' });
  });
  it('omits auth header when no key is set', () => {
    const r = buildRequest({ ...cfg, apiKey: '' }, messages);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.request.headers['Authorization']).toBeUndefined();
  });
});

describe('buildRequest — Gemini shape', () => {
  const cfg: ProviderConfig = {
    provider: 'gemini',
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/models',
    model: 'gemini-2.5-flash',
    apiKey: 'g-key',
  };
  it('appends model:generateContent and uses x-goog-api-key', () => {
    const r = buildRequest(cfg, messages);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.request.url).toBe(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
    );
    expect(r.request.headers['x-goog-api-key']).toBe('g-key');
    const body = JSON.parse(r.request.body);
    expect(body.contents[0]).toEqual({ role: 'user', parts: [{ text: 'hello' }] });
    expect(body.systemInstruction.parts[0].text).toBe('be concise');
  });
  it('maps assistant role to model', () => {
    const r = buildRequest(cfg, [
      { role: 'user', content: 'hi' },
      { role: 'assistant', content: 'hey' },
    ]);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const body = JSON.parse(r.request.body);
    expect(body.contents[1].role).toBe('model');
  });
});

describe('buildRequest — validation', () => {
  it('rejects a missing endpoint', () => {
    const r = buildRequest(
      { provider: 'custom', endpoint: '', model: 'm', apiKey: '' },
      messages,
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/no endpoint/i);
  });
  it('refuses to send a key over non-HTTPS', () => {
    const r = buildRequest(
      { provider: 'custom', endpoint: 'http://insecure.local/v1/chat/completions', model: 'm', apiKey: 'secret' },
      messages,
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/non-HTTPS/i);
  });
  it('allows a non-HTTPS endpoint when there is no key (e.g. local model)', () => {
    const r = buildRequest(
      { provider: 'custom', endpoint: 'http://localhost:1234/v1/chat/completions', model: 'm', apiKey: '' },
      messages,
    );
    expect(r.ok).toBe(true);
  });
});

describe('parseResponse', () => {
  it('reads OpenAI choices[0].message.content', () => {
    const data = { choices: [{ message: { role: 'assistant', content: 'hi there' } }] };
    expect(parseResponse('openai', data)).toBe('hi there');
  });
  it('reads Gemini candidates[0].content.parts[].text', () => {
    const data = { candidates: [{ content: { parts: [{ text: 'spectral ' }, { text: 'reply' }] } }] };
    expect(parseResponse('gemini', data)).toBe('spectral reply');
  });
  it('returns null for unexpected shapes', () => {
    expect(parseResponse('openai', {})).toBeNull();
    expect(parseResponse('gemini', { candidates: [] })).toBeNull();
    expect(parseResponse('openai', null)).toBeNull();
  });
});

describe('error classification', () => {
  it('maps HTTP statuses to helpful messages', () => {
    expect(classifyHttpError(401)).toMatch(/authentication/i);
    expect(classifyHttpError(404)).toMatch(/not found|unavailable/i);
    expect(classifyHttpError(429)).toMatch(/rate limit/i);
    expect(classifyHttpError(500)).toMatch(/server error/i);
    expect(classifyHttpError(418)).toMatch(/418/);
  });
  it('maps abort to a timeout message', () => {
    const err = new DOMException('aborted', 'AbortError');
    expect(classifyNetworkError(err)).toMatch(/timed out/i);
  });
  it('maps fetch failures to a CORS/offline hint', () => {
    expect(classifyNetworkError(new TypeError('Failed to fetch'))).toMatch(/CORS|offline/i);
  });
});

describe('presets', () => {
  it('provides openai, gemini, and custom presets', () => {
    expect(PROVIDER_PRESETS.openai.shape).toBe('openai');
    expect(PROVIDER_PRESETS.gemini.shape).toBe('gemini');
    expect(PROVIDER_PRESETS.custom.shape).toBe('openai');
  });

  it('defaults Gemini to the gemini-3-flash-preview model', () => {
    expect(PROVIDER_PRESETS.gemini.defaultModel).toBe('gemini-3-flash-preview');
  });

  it('uses the preset default model only when the user leaves it blank', () => {
    const base = 'https://generativelanguage.googleapis.com/v1beta/models';
    // Blank model -> falls back to the preset default.
    const d = buildRequest(
      { provider: 'gemini', endpoint: base, model: '', apiKey: 'k' },
      [{ role: 'user', content: 'hi' }],
    );
    expect(d.ok).toBe(true);
    if (d.ok) expect(d.request.url).toContain('gemini-3-flash-preview:generateContent');
    // A user-configured model is never overwritten.
    const u = buildRequest(
      { provider: 'gemini', endpoint: base, model: 'gemini-2.5-flash', apiKey: 'k' },
      [{ role: 'user', content: 'hi' }],
    );
    expect(u.ok).toBe(true);
    if (u.ok) expect(u.request.url).toContain('gemini-2.5-flash:generateContent');
  });
});
