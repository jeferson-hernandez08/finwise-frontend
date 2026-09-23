import { Routes } from '@angular/router';

export const dashboardRoutes: Routes = [
  {
    path: '',
    title: 'Resumen | FinWise',
    loadComponent: () => import('./dashboard').then(m => m.Dashboard),
  },
];
