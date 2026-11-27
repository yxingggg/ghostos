// Online AI providers — pure request/response formatting and error handling.
// No network calls happen here (the app layer performs fetch); these functions
// only build request descriptors and parse/classify results, so they are fully
// unit-testable and contain no secrets.

export type ProviderId = 'openai' | 'gemini' | 'custom';

export interface ProviderPreset {
  id: ProviderId;
  label: string;
  /** API shape used to format requests/responses. */
  shape: 'openai' | 'gemini';
  /** Default endpoint (users can override, required for custom). */
  defaultEndpoint: string;
  /** Example model to prefill. */
  defaultModel: string;
  /** How the API key is carried. */
  auth: 'bearer' | 'x-goog-api-key';
  /** Short note shown in the UI. */
  note: string;
}

export const PROVIDER_PRESETS: Record<ProviderId, ProviderPreset> = {
  openai: {
    id: 'openai',
    label: 'OpenAI',
    shape: 'openai',
    defaultEndpoint: 'https://api.openai.com/v1/chat/completions',
    defaultModel: 'gpt-4o-mini',
    auth: 'bearer',
    note: 'OpenAI Chat Completions API. Browser requests may be blocked by CORS unless the endpoint allows it.',
  },
  gemini: {
    id: 'gemini',
    label: 'Google Gemini',
    shape: 'gemini',
    defaultEndpoint: 'https://generativelanguage.googleapis.com/v1beta/models',
    defaultModel: 'gemini-2.5-flash',
    auth: 'x-goog-api-key',
    note: 'Google Gemini generateContent API. The endpoint is the models base; the model name is appended automatically.',
  },
  custom: {
    id: 'custom',
    label: 'Custom (OpenAI-compatible)',
    shape: 'openai',
    defaultEndpoint: '',
    defaultModel: '',
    auth: 'bearer',
    note: 'Any OpenAI-compatible endpoint (e.g. a local or self-hosted gateway). Provide the full chat-completions URL.',
  },
};

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ProviderConfig {
  provider: ProviderId;
  endpoint: string;
  model: string;
  apiKey: string;
}

export interface RequestDescriptor {
  url: string;
  headers: Record<string, string>;
  body: string;
}

export type BuildResult =
  | { ok: true; request: RequestDescriptor }
  | { ok: false; error: string };

function isHttps(url: string): boolean {
  return /^https:\/\//i.test(url.trim());
}

/**
 * Build a provider-specific HTTP request from the config and chat history.
 * Enforces HTTPS whenever an API key is present (never leak a key in cleartext).
 */
export function buildRequest(
  cfg: ProviderConfig,
  messages: ChatMessage[],
): BuildResult {
  const preset = PROVIDER_PRESETS[cfg.provider];
  const endpoint = cfg.endpoint.trim();
  if (!endpoint) return { ok: false, error: 'No endpoint configured. Set one in Settings.' };
  if (cfg.apiKey && !isHttps(endpoint)) {
    return {
      ok: false,
      error: 'Refusing to send the API key over a non-HTTPS endpoint. Use an https:// URL.',
    };
  }

  if (preset.shape === 'gemini') {
    // Endpoint is the models base; append `${model}:generateContent`.
    const base = endpoint.replace(/\/$/, '');
    const model = cfg.model.trim() || preset.defaultModel;
    const url = `${base}/${encodeURIComponent(model)}:generateContent`;
    const system = messages.find((m) => m.role === 'system');
    const turns = messages.filter((m) => m.role !== 'system');
    const body = {
      contents: turns.map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      })),
      ...(system ? { systemInstruction: { parts: [{ text: system.content }] } } : {}),
    };
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (cfg.apiKey) headers['x-goog-api-key'] = cfg.apiKey;
    return { ok: true, request: { url, headers, body: JSON.stringify(body) } };
  }

  // OpenAI-compatible chat completions.
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (cfg.apiKey) headers['Authorization'] = `Bearer ${cfg.apiKey}`;
  const body = {
    model: cfg.model.trim() || preset.defaultModel || 'gpt-4o-mini',
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
    stream: false,
  };
  return { ok: true, request: { url: endpoint, headers, body: JSON.stringify(body) } };
}

/** Extract the assistant's reply text from a provider response payload. */
export function parseResponse(shape: 'openai' | 'gemini', data: unknown): string | null {
  if (typeof data !== 'object' || data === null) return null;
  const obj = data as Record<string, unknown>;

  if (shape === 'gemini') {
    const candidates = obj.candidates;
    if (Array.isArray(candidates) && candidates[0] && typeof candidates[0] === 'object') {
      const content = (candidates[0] as Record<string, unknown>).content;
      if (content && typeof content === 'object') {
        const parts = (content as Record<string, unknown>).parts;
        if (Array.isArray(parts)) {
          const text = parts
            .map((p) =>
              p && typeof p === 'object' && typeof (p as Record<string, unknown>).text === 'string'
                ? ((p as Record<string, unknown>).text as string)
                : '',
            )
            .join('');
          return text || null;
        }
      }
    }
    return null;
  }

  // OpenAI-compatible.
  const choices = obj.choices;
  if (Array.isArray(choices) && choices[0] && typeof choices[0] === 'object') {
    const msg = (choices[0] as Record<string, unknown>).message;
    if (msg && typeof msg === 'object') {
      const content = (msg as Record<string, unknown>).content;
      if (typeof content === 'string') return content;
    }
  }
  return null;
}

/** Translate an HTTP status into a user-facing error message. */
export function classifyHttpError(status: number): string {
  if (status === 401 || status === 403) {
    return 'Authentication failed — check your API key and that it has access to this model.';
  }
  if (status === 404) {
    return 'Not found — the endpoint URL or model name may be wrong, or the model is unavailable.';
  }
  if (status === 429) {
    return 'Rate limited — the provider is throttling requests. Wait a moment and try again.';
  }
  if (status >= 500) {
    return `The provider reported a server error (${status}). Try again shortly.`;
  }
  return `Request failed (HTTP ${status}).`;
}

/** Translate a thrown fetch/abort error into a user-facing message. */
export function classifyNetworkError(err: unknown): string {
  if (err instanceof DOMException && err.name === 'AbortError') {
    return 'The request timed out. Check your connection or try a different endpoint.';
  }
  const msg = err instanceof Error ? err.message : String(err);
  // Browsers surface CORS and offline failures as a generic TypeError.
  if (/load failed|failed to fetch|networkerror/i.test(msg)) {
    return (
      'Could not reach the endpoint. This is often a CORS restriction (the provider must ' +
      'allow browser requests), or you may be offline.'
    );
  }
  return msg || 'The request failed.';
}
