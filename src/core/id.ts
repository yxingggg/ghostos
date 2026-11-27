// Small, dependency-free id generator for core modules.
// Pure except for the optional randomness source, which is injectable for tests.

let counter = 0;

/**
 * Generate a reasonably-unique id. Uses crypto.randomUUID when available
 * (browser/node), falling back to a timestamp+counter scheme. The fallback
 * keeps the core modules usable in any JS environment without DOM access.
 */
export function createId(prefix = 'id'): string {
  const g = globalThis as { crypto?: { randomUUID?: () => string } };
  if (g.crypto?.randomUUID) {
    return `${prefix}_${g.crypto.randomUUID()}`;
  }
  counter += 1;
  return `${prefix}_${Date.now().toString(36)}_${counter.toString(36)}`;
}

/** Deterministic id factory for tests. */
export function createSeededIdFactory(prefix = 'id'): () => string {
  let n = 0;
  return () => {
    n += 1;
    return `${prefix}_${n}`;
  };
}
