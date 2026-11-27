import { useCallback, useLayoutEffect, useRef } from 'react';

/**
 * Returns a stable function identity that always calls the latest version of
 * the given callback. Useful for pointer handlers that close over frequently
 * changing props without re-subscribing listeners.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useCallbackRef<T extends (...args: any[]) => any>(callback: T): T {
  const ref = useRef(callback);
  useLayoutEffect(() => {
    ref.current = callback;
  });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useCallback(((...args) => ref.current(...args)) as T, []);
}
