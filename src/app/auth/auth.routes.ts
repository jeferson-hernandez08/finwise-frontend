import { Routes } from '@angular/router';

/** Cada pantalla se carga en su propio chunk: el login no arrastra al registro. */
export const authRoutes: Routes = [
  {
    path: 'login',
    title: 'Iniciar sesión | FinWise',
    loadComponent: () => import('./login/login').then(m => m.Login),
  },
  {
    path: 'register',
    title: 'Crear cuenta | FinWise',
    loadComponent: () => import('./register/register').then(m => m.Register),
  },
  {
    path: 'callback',
    title: 'Conectando con Google | FinWise',
    loadComponent: () =>
      import('./google-callback/google-callback').then(m => m.GoogleCallback),
  },
  { path: '', redirectTo: 'login', pathMatch: 'full' },
];
