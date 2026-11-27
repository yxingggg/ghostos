import { useEffect, useState } from 'react';
import { isDegraded } from '../state/persist';

/**
 * A small taskbar badge reflecting two independent facts, honestly:
 *
 *  1. Network reachability (`navigator.onLine`). GhostOS is offline-first, so
 *     being offline is NOT an error — every core feature keeps working. The
 *     badge therefore frames offline as reassurance, and is explicit that this
 *     only affects the opt-in online AI (not local features), and that
 *     `navigator.onLine` reflects network interface state, not any cache
 *     guarantee.
 *  2. Storage health (persistence degraded to memory-only). This is a genuine
 *     "your changes won't be saved" warning and is shown distinctly from the
 *     network state.
 *
 * It mirrors the Clock's interval/listener + pixel-font styling idiom and holds
 * no app state of its own.
 */
export function ConnectivityIndicator() {
  const [online, setOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  );
  const [degraded, setDegraded] = useState<boolean>(() => isDegraded());

  useEffect(() => {
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    // Reflect a persistence degrade if it happens after mount. We POLL the flag
    // rather than register a notice handler, because that handler is a single
    // slot already owned by App (which raises the one-time toast) — polling
    // avoids clobbering it while still updating the badge. The flag is sticky,
    // so a light 2s poll is sufficient and cheap (mirrors the Clock idiom).
    const poll = setInterval(() => {
      if (isDegraded()) setDegraded(true);
    }, 2000);
    if (isDegraded()) setDegraded(true);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      clearInterval(poll);
    };
  }, []);

  // Storage trouble takes visual priority — it is the only state that means
  // "work may be lost".
  if (degraded) {
    return (
      <div
        role="status"
        aria-label="Storage unavailable — running in memory only; changes will not be saved."
        title="Storage unavailable: GhostOS is running in memory only. Your changes will NOT be saved to this browser. Export a backup to keep your work."
        className="flex items-center gap-1.5 px-2 font-pixel text-xs text-blood-400"
      >
        <span aria-hidden="true" className="inline-block h-2 w-2 rounded-full bg-blood-500 shadow-glow-sm" />
        <span className="hidden sm:inline">Memory only</span>
      </div>
    );
  }

  if (!online) {
    return (
      <div
        role="status"
        aria-label="Offline. All local features work; only the optional online AI needs a connection."
        title="You are offline. GhostOS is offline-first: your files, notes, music, terminal and apps all keep working. Only the optional online AI assistant needs a network connection. (This reflects your network state, not any page-cache guarantee.)"
        className="flex items-center gap-1.5 px-2 font-pixel text-xs text-bone-400"
      >
        <span aria-hidden="true" className="inline-block h-2 w-2 rounded-full bg-bone-500" />
        <span className="hidden sm:inline">Offline · all features work</span>
      </div>
    );
  }

  // Online: a quiet, unobtrusive indicator.
  return (
    <div
      role="status"
      aria-label="Online"
      title="Online. Local features always work offline too; only the optional online AI uses the network."
      className="flex items-center gap-1.5 px-2 font-pixel text-xs text-bone-500"
    >
      <span aria-hidden="true" className="inline-block h-2 w-2 rounded-full bg-spectral-600" />
      <span className="hidden md:inline">Online</span>
    </div>
  );
}
