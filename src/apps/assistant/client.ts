// Thin app-layer client that performs the actual network request for the online
// AI mode, using the pure provider formatting in core. Kept small and isolated
// so the rest of GhostOS has no network dependency.

import {
  buildRequest,
  classifyHttpError,
  classifyNetworkError,
  parseResponse,
  PROVIDER_PRESETS,
  type ChatMessage,
  type ProviderConfig,
} from '../../core/assistant/providers';

export type AssistantResult =
  | { ok: true; content: string }
  | { ok: false; error: string };

const DEFAULT_TIMEOUT_MS = 30_000;

/**
 * Send a chat to the configured provider and return the reply or a friendly
 * error. Never throws. Enforces HTTPS-with-key via buildRequest, and applies a
 * request timeout so a hung endpoint fails gracefully.
 */
export async function sendToProvider(
  cfg: ProviderConfig,
  messages: ChatMessage[],
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<AssistantResult> {
  const built = buildRequest(cfg, messages);
  if (!built.ok) return { ok: false, error: built.error };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(built.request.url, {
      method: 'POST',
      headers: built.request.headers,
      body: built.request.body,
      signal: controller.signal,
    });
    if (!res.ok) {
      return { ok: false, error: classifyHttpError(res.status) };
    }
    const data: unknown = await res.json();
    const shape = PROVIDER_PRESETS[cfg.provider].shape;
    const content = parseResponse(shape, data);
    if (content === null) {
      return { ok: false, error: 'The provider returned a response in an unexpected format.' };
    }
    return { ok: true, content };
  } catch (err) {
    return { ok: false, error: classifyNetworkError(err) };
  } finally {
    clearTimeout(timer);
  }
}

/** A minimal connectivity probe used by the Settings "Test Connection" button. */
export async function testConnection(cfg: ProviderConfig): Promise<AssistantResult> {
  return sendToProvider(
    cfg,
    [{ role: 'user', content: 'ping' }],
    15_000,
  );
}
