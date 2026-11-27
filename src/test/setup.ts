// Vitest setup: jest-dom matchers + a fake IndexedDB for persistence tests.
import '@testing-library/jest-dom/vitest';
import 'fake-indexeddb/auto';

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
