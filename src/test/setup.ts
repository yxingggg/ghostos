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
