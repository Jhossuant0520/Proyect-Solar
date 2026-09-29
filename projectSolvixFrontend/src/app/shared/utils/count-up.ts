/** Count-up visual. No altera el valor de negocio; solo interpola presentación. */

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export interface CountUpHandle {
  cancel: () => void;
}

/**
 * Interpola de `from` a `to` con requestAnimationFrame.
 * Llama `onFrame` en cada frame y `onDone` con el valor final exacto.
 */
export function runCountUp(
  from: number,
  to: number,
  durationMs: number,
  onFrame: (value: number) => void,
  onDone?: (value: number) => void
): CountUpHandle {
  if (prefersReducedMotion() || durationMs <= 0 || from === to) {
    onFrame(to);
    onDone?.(to);
    return { cancel: () => undefined };
  }

  let raf = 0;
  const start = performance.now();

  const tick = (now: number): void => {
    const elapsed = now - start;
    const t = Math.min(1, elapsed / durationMs);
    const value = from + (to - from) * easeOutCubic(t);
    if (t >= 1) {
      onFrame(to);
      onDone?.(to);
      return;
    }
    onFrame(value);
    raf = requestAnimationFrame(tick);
  };

  raf = requestAnimationFrame(tick);
  return {
    cancel: () => {
      if (raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    }
  };
}
