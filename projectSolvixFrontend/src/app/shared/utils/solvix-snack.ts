import { MatSnackBar, MatSnackBarConfig } from '@angular/material/snack-bar';
import { SolvixSnackComponent } from '../components/solvix-snack/solvix-snack';

export type SolvixSnackTone = 'info' | 'success' | 'warning' | 'error';

const TONE_CLASS: Record<SolvixSnackTone, string> = {
  info: 'solvix-snack--info',
  success: 'solvix-snack--success',
  warning: 'solvix-snack--warning',
  error: 'solvix-snack--error'
};

/**
 * Toast SOLVIX compacto (componente con icono). Usar en lugar de snackBar.open suelto.
 */
export function showSolvixSnack(
  snackBar: MatSnackBar,
  message: string,
  tone: SolvixSnackTone = 'info',
  duration = 3500
): void {
  const config: MatSnackBarConfig = {
    duration,
    horizontalPosition: 'end',
    verticalPosition: 'top',
    panelClass: ['solvix-snack', TONE_CLASS[tone]],
    data: { message, tone }
  };
  snackBar.openFromComponent(SolvixSnackComponent, config);
}
