import { Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { showSnack, SnackTone } from '../utils/snack';

/**
 * Feedback contextual (capa sobre MatSnackBar + showSnack).
 * No conoce reglas de negocio: solo comunica mensajes genéricos.
 */
@Injectable({ providedIn: 'root' })
export class FeedbackService {
  private readonly snackBar = inject(MatSnackBar);

  success(message: string, duration = 3500): void {
    this.show(message, 'success', duration);
  }

  info(message: string, duration = 3500): void {
    this.show(message, 'info', duration);
  }

  warning(message: string, duration = 4500): void {
    this.show(message, 'warning', duration);
  }

  error(message: string, duration = 5000): void {
    this.show(message, 'error', duration);
  }

  show(message: string, tone: SnackTone = 'info', duration = 3500): void {
    const text = (message ?? '').trim();
    if (!text) {
      return;
    }
    showSnack(this.snackBar, text, tone, duration);
  }
}
