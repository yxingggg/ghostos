// Vitest setup: jest-dom matchers + a fake IndexedDB for persistence tests.
import '@testing-library/jest-dom/vitest';
import 'fake-indexeddb/auto';

// jsdom lacks ResizeObserver; provide a no-op stub (layout-dependent behavior is
// exercised by the Playwright browser tests, not jsdom).
if (!('ResizeObserver' in globalThis)) {
  class ResizeObserverStub {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  }
  (globalThis as unknown as { ResizeObserver: typeof ResizeObserverStub }).ResizeObserver =
    ResizeObserverStub;
}

// jsdom lacks URL.createObjectURL/revokeObjectURL; provide no-op stubs so code
// paths that build downloadable blobs (e.g. Ghost Memory export, Spectral
// Viewer, DeadWave) can run under jsdom. Real blob-URL behavior is exercised by
// the Playwright browser tests.
if (typeof URL.createObjectURL !== 'function') {
  (URL as unknown as { createObjectURL: (b: Blob) => string }).createObjectURL = () =>
    'blob:jsdom-stub';
}
if (typeof URL.revokeObjectURL !== 'function') {
  (URL as unknown as { revokeObjectURL: (u: string) => void }).revokeObjectURL = () => {};
}

// Some jsdom builds lack Blob.prototype.text(); provide a FileReader-based
// fallback so File/Blob uploads can be read in tests (used by backup import).
if (typeof Blob !== 'undefined' && typeof Blob.prototype.text !== 'function') {
  (Blob.prototype as unknown as { text: () => Promise<string> }).text = function text(this: Blob) {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error ?? new Error('read failed'));
      reader.readAsText(this);
    });
  };
}

// jsdom lacks matchMedia; provide a minimal stub so components that query
// prefers-reduced-motion do not crash in tests.
if (!window.matchMedia) {
  window.matchMedia = (query: string): MediaQueryList =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList;
}
