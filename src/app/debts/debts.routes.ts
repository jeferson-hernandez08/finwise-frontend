import { Routes } from '@angular/router';

export const debtsRoutes: Routes = [
  {
    path: '',
    title: 'Mis deudas · FinWise',
    loadComponent: () => import('./list/list').then(m => m.List),
  },
  {
    path: 'new',
    title: 'Nueva deuda · FinWise',
    loadComponent: () => import('./form/form').then(m => m.Form),
  },
  {
    path: 'detail/:id',
    title: 'Detalle de la deuda · FinWise',
    loadComponent: () => import('./detail/detail').then(m => m.Detail),
  },
  {
    path: 'edit/:id',
    title: 'Editar deuda · FinWise',
    loadComponent: () => import('./form/form').then(m => m.Form),
  },
];
