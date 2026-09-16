import { MatSnackBar, MatSnackBarConfig } from '@angular/material/snack-bar';

export type SolvixSnackTone = 'info' | 'success' | 'warning' | 'error';

const TONE_CLASS: Record<SolvixSnackTone, string> = {
  info: 'solvix-snack--info',
  success: 'solvix-snack--success',
  warning: 'solvix-snack--warning',
  error: 'solvix-snack--error'
};

/**
 * Toast SOLVIX (card). Usar en lugar de snackBar.open suelto
 * para éxito / error / aviso con el mismo lenguaje visual.
 */
export function showSolvixSnack(
  snackBar: MatSnackBar,
  message: string,
  tone: SolvixSnackTone = 'info',
  duration = 3500,
  action = 'Cerrar'
): void {
  const config: MatSnackBarConfig = {
    duration,
    horizontalPosition: 'end',
    verticalPosition: 'top',
    panelClass: ['solvix-snack', TONE_CLASS[tone]]
  };
  snackBar.open(message, action, config);
}
