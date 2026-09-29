import { Injectable, inject } from '@angular/core';
import { SolvixFeedbackService } from './solvix-feedback.service';
import {
  SolvixRevealOptions,
  SolvixScrollService,
  SolvixScrollTarget
} from './solvix-scroll.service';
import { SolvixSnackTone } from '../utils/solvix-snack';

export interface SolvixActionSuccessOptions extends SolvixRevealOptions {
  message: string;
  tone?: SolvixSnackTone;
  /** Elemento afectado (HTMLElement, ElementRef o selector CSS). */
  target?: SolvixScrollTarget;
  /** Mostrar snack. Default true. */
  feedback?: boolean;
}

/**
 * Orquesta: feedback → (opcional) scroll si fuera de viewport → highlight breve.
 */
@Injectable({ providedIn: 'root' })
export class SolvixActionRevealService {
  private readonly feedback = inject(SolvixFeedbackService);
  private readonly scroll = inject(SolvixScrollService);

  success(options: SolvixActionSuccessOptions): void {
    this.complete({ ...options, tone: options.tone ?? 'success' });
  }

  info(options: SolvixActionSuccessOptions): void {
    this.complete({ ...options, tone: options.tone ?? 'info' });
  }

  warning(options: SolvixActionSuccessOptions): void {
    this.complete({ ...options, tone: options.tone ?? 'warning' });
  }

  error(message: string): void {
    this.feedback.error(message);
  }

  /** Solo reveal (sin snack). Útil cuando el feedback ya se mostró. */
  reveal(target: SolvixScrollTarget, options: SolvixRevealOptions = {}): void {
    this.schedule(() => this.scroll.reveal(target, options));
  }

  private complete(options: SolvixActionSuccessOptions & { tone: SolvixSnackTone }): void {
    if (options.feedback !== false) {
      this.feedback.show(options.message, options.tone);
    }
    if (options.target == null) {
      return;
    }
    const target = options.target;
    this.schedule(() => {
      this.scroll.reveal(target, {
        scroll: options.scroll,
        highlight: options.highlight,
        visibilityRatio: options.visibilityRatio,
        highlightMs: options.highlightMs
      });
    });
  }

  /** Espera al siguiente paint para que el DOM del resultado exista. */
  private schedule(fn: () => void): void {
    queueMicrotask(() => {
      if (typeof requestAnimationFrame === 'function') {
        requestAnimationFrame(() => fn());
      } else {
        fn();
      }
    });
  }
}
