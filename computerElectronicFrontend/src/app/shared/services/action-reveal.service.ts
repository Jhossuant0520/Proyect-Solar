import { Injectable, inject } from '@angular/core';
import { FeedbackService } from './feedback.service';
import {
  RevealOptions,
  ScrollService,
  ScrollTarget
} from './scroll.service';
import { SnackTone } from '../utils/snack';

export interface ActionSuccessOptions extends RevealOptions {
  message: string;
  tone?: SnackTone;
  /** Elemento afectado (HTMLElement, ElementRef o selector CSS). */
  target?: ScrollTarget;
  /** Mostrar snack. Default true. */
  feedback?: boolean;
}

/**
 * Orquesta: feedback → (opcional) scroll si fuera de viewport → highlight breve.
 */
@Injectable({ providedIn: 'root' })
export class ActionRevealService {
  private readonly feedback = inject(FeedbackService);
  private readonly scroll = inject(ScrollService);

  success(options: ActionSuccessOptions): void {
    this.complete({ ...options, tone: options.tone ?? 'success' });
  }

  info(options: ActionSuccessOptions): void {
    this.complete({ ...options, tone: options.tone ?? 'info' });
  }

  warning(options: ActionSuccessOptions): void {
    this.complete({ ...options, tone: options.tone ?? 'warning' });
  }

  error(message: string): void {
    this.feedback.error(message);
  }

  /** Solo reveal (sin snack). Útil cuando el feedback ya se mostró. */
  reveal(target: ScrollTarget, options: RevealOptions = {}): void {
    this.schedule(() => this.scroll.reveal(target, options));
  }

  private complete(options: ActionSuccessOptions & { tone: SnackTone }): void {
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
