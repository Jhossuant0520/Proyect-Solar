import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const AuthInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.obtenerToken()?.trim();

  if (token) {
    return next(req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    }));
  }

  return next(req);
};
