import { ElementRef, Injectable } from '@angular/core';
import { prefersReducedMotion } from '../utils/count-up';

export type SolvixScrollTarget = HTMLElement | ElementRef<HTMLElement> | string | null | undefined;

export interface SolvixScrollOptions {
  /** Si omitido: smooth salvo reduced-motion → auto. */
  behavior?: ScrollBehavior;
  block?: ScrollLogicalPosition;
  inline?: ScrollLogicalPosition;
}

export interface SolvixRevealOptions {
  /** Hacer scroll solo si el target no está razonablemente visible. Default true. */
  scroll?: boolean;
  /** Aplicar highlight contextual breve. Default true. */
  highlight?: boolean;
  /** Ratio mínimo de área visible (0–1). Default 0.55. */
  visibilityRatio?: number;
  /** Duración del highlight en ms. Default = --motion-highlight (~560). */
  highlightMs?: number;
}

const HIGHLIGHT_CLASS = 'solvix-context-highlight';
const DEFAULT_HIGHLIGHT_MS = 560;

/**
 * Scroll contextual + highlight. No hace scroll si el elemento ya es visible.
 */
@Injectable({ providedIn: 'root' })
export class SolvixScrollService {
  resolve(target: SolvixScrollTarget): HTMLElement | null {
    if (target == null) {
      return null;
    }
    if (typeof target === 'string') {
      if (typeof document === 'undefined') {
        return null;
      }
      return document.querySelector(target) as HTMLElement | null;
    }
    if (target instanceof ElementRef) {
      return target.nativeElement ?? null;
    }
    return target;
  }

  /**
   * True si una porción significativa del elemento está en el viewport del documento.
   * Usa bounding rect (síncrono) con margen; no polling.
   */
  isReasonablyVisible(el: HTMLElement, minRatio = 0.55): boolean {
    if (typeof window === 'undefined') {
      return true;
    }
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      return false;
    }
    const vh = window.innerHeight || document.documentElement.clientHeight;
    const vw = window.innerWidth || document.documentElement.clientWidth;
    const margin = 24;
    const visibleH = Math.min(rect.bottom, vh - margin) - Math.max(rect.top, margin);
    const visibleW = Math.min(rect.right, vw - margin) - Math.max(rect.left, margin);
    if (visibleH <= 0 || visibleW <= 0) {
      return false;
    }
    const ratio = (visibleH * visibleW) / (rect.height * rect.width);
    return ratio >= minRatio;
  }

  scrollToElement(target: SolvixScrollTarget, options: SolvixScrollOptions = {}): boolean {
    const el = this.resolve(target);
    if (!el) {
      return false;
    }
    const behavior: ScrollBehavior =
      options.behavior ?? (prefersReducedMotion() ? 'auto' : 'smooth');
    try {
      el.scrollIntoView({
        behavior,
        block: options.block ?? 'center',
        inline: options.inline ?? 'nearest'
      });
      return true;
    } catch {
      return false;
    }
  }

  highlight(target: SolvixScrollTarget, durationMs = DEFAULT_HIGHLIGHT_MS): boolean {
    const el = this.resolve(target);
    if (!el) {
      return false;
    }
    el.classList.remove(HIGHLIGHT_CLASS);
    // Force reflow so re-adding restarts the animation.
    void el.offsetWidth;
    el.classList.add(HIGHLIGHT_CLASS);

    const ms = prefersReducedMotion() ? 1 : Math.max(1, durationMs);
    window.setTimeout(() => {
      el.classList.remove(HIGHLIGHT_CLASS);
    }, ms + 40);
    return true;
  }

  /**
   * Scroll condicional + highlight. Si ya es visible, no desplaza.
   */
  reveal(target: SolvixScrollTarget, options: SolvixRevealOptions = {}): boolean {
    const el = this.resolve(target);
    if (!el) {
      return false;
    }
    const doScroll = options.scroll !== false;
    const doHighlight = options.highlight !== false;
    const ratio = options.visibilityRatio ?? 0.55;

    if (doScroll && !this.isReasonablyVisible(el, ratio)) {
      this.scrollToElement(el);
    }
    if (doHighlight) {
      this.highlight(el, options.highlightMs ?? DEFAULT_HIGHLIGHT_MS);
    }
    return true;
  }
}
