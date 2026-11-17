import { MatSnackBar, MatSnackBarConfig } from '@angular/material/snack-bar';
import { CeSnackComponent } from '../components/ce-snack/ce-snack';

export type SnackTone = 'info' | 'success' | 'warning' | 'error';

const TONE_CLASS: Record<SnackTone, string> = {
  info: 'ce-snack--info',
  success: 'ce-snack--success',
  warning: 'ce-snack--warning',
  error: 'ce-snack--error'
};

/**
 * Toast compacto (componente con icono). Usar en lugar de snackBar.open suelto.
 */
export function showSnack(
  snackBar: MatSnackBar,
  message: string,
  tone: SnackTone = 'info',
  duration = 3500
): void {
  const config: MatSnackBarConfig = {
    duration,
    horizontalPosition: 'end',
    verticalPosition: 'top',
    panelClass: ['ce-snack', TONE_CLASS[tone]],
    data: { message, tone }
  };
  snackBar.openFromComponent(CeSnackComponent, config);
}
