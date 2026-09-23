import { Routes } from '@angular/router';

export const savingsRoutes: Routes = [
  {
    path: '',
    title: 'Mis metas de ahorro | FinWise',
    loadComponent: () => import('./list/list').then(m => m.List),
  },
  {
    path: 'new',
    title: 'Nueva meta de ahorro | FinWise',
    loadComponent: () => import('./form/form').then(m => m.Form),
  },
  {
    path: 'detail/:id',
    title: 'Detalle de la meta | FinWise',
    loadComponent: () => import('./detail/detail').then(m => m.Detail),
  },
  {
    path: 'edit/:id',
    title: 'Editar meta de ahorro | FinWise',
    loadComponent: () => import('./form/form').then(m => m.Form),
  },
];
