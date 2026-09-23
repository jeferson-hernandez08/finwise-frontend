import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/** Bloquea las pantallas privadas cuando no hay sesión válida. */
export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isAuthenticated()) return true;

  // Se guarda el destino para volver a él después de iniciar sesión.
  return router.createUrlTree(['/auth/login'], {
    queryParams: state.url && state.url !== '/' ? { redirect: state.url } : {},
  });
};

/** Evita que alguien ya autenticado vea de nuevo el login o el registro. */
export const guestGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  // El callback de Google debe ejecutarse siempre: es quien guarda el token.
  if (state.url.startsWith('/auth/callback')) return true;

  return auth.isAuthenticated() ? router.createUrlTree(['/dashboard']) : true;
};

/** Alias retrocompatible con el nombre anterior del guard. */
export const AuthGuard = authGuard;
