import { useSettings, prefersReducedMotion } from '../state/settingsStore';

/**
 * CRT effect layer: scanlines + vignette + glow, with an optional flicker that
 * is disabled when reduced motion is requested. Toggleable via settings.
 */
export function CrtOverlay() {
  const crt = useSettings((s) => s.crt);
  const reducedMotion = useSettings((s) => s.reducedMotion);
  if (!crt) return null;
  const flicker = !prefersReducedMotion(reducedMotion);
  return (
    <>
      <div className={`crt-overlay ${flicker ? 'animate-flicker' : ''}`} aria-hidden="true" />
      <div className="crt-glow" aria-hidden="true" />
    </>
  );
}
