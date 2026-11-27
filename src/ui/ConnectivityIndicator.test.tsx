import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, act, cleanup } from '@testing-library/react';
import { ConnectivityIndicator } from './ConnectivityIndicator';

function setOnLine(value: boolean): void {
  Object.defineProperty(navigator, 'onLine', { configurable: true, value });
}

afterEach(() => {
  cleanup();
  setOnLine(true);
});

describe('ConnectivityIndicator', () => {
  it('shows an Online status when the browser reports online', () => {
    setOnLine(true);
    render(<ConnectivityIndicator />);
    expect(screen.getByRole('status')).toHaveAccessibleName(/online/i);
  });

  it('reacts to offline/online events and frames offline as non-blocking', () => {
    setOnLine(true);
    render(<ConnectivityIndicator />);

    act(() => {
      setOnLine(false);
      window.dispatchEvent(new Event('offline'));
    });
    const offline = screen.getByRole('status');
    expect(offline).toHaveAccessibleName(/offline/i);
    // Must reassure that local features still work and not claim AI works offline.
    expect(offline.getAttribute('aria-label') ?? '').toMatch(/all local features work|features work/i);

    act(() => {
      setOnLine(true);
      window.dispatchEvent(new Event('online'));
    });
    expect(screen.getByRole('status')).toHaveAccessibleName(/online/i);
  });

  it('renders at the initial navigator.onLine value (offline on mount)', () => {
    setOnLine(false);
    render(<ConnectivityIndicator />);
    expect(screen.getByRole('status')).toHaveAccessibleName(/offline/i);
  });
});
