import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Protege la interfaz de administración. Es una capa de UX:
 * la autoridad de seguridad sigue siendo el backend (@PreAuthorize + JWT).
 */
export const adminGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.estaAutenticado()) {
    router.navigate(['/login']);
    return false;
  }

  if (!authService.esAdmin()) {
    router.navigate(['/dashboard']);
    return false;
  }

  return true;
};
