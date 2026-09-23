import { inject } from '@angular/core';
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

/**
 * Adjunta el token a cada petición y cierra la sesión si el backend
 * responde 401 (token caducado o revocado).
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);

  let token: string | null = null;
  try {
    token = localStorage.getItem('access_token');
  } catch {
    token = null;
  }

  const authorized = token
    ? req.clone({ headers: req.headers.set('Authorization', `Bearer ${token}`) })
    : req;

  return next(authorized).pipe(
    catchError((error: HttpErrorResponse) => {
      // El propio login devuelve 401 con credenciales malas: ahí no hay sesión que cerrar.
      const isAuthCall = req.url.includes('/auth/login') || req.url.includes('/auth/register');

      if (error.status === 401 && !isAuthCall) {
        try {
          localStorage.removeItem('access_token');
        } catch {
          /* Sin almacenamiento no hay nada que limpiar. */
        }
        router.navigate(['/auth/login'], {
          queryParams: { expired: '1' },
        });
      }

      return throwError(() => error);
    }),
  );
};
