import { Routes } from '@angular/router';

export const expensesRoutes: Routes = [
  {
    path: '',
    title: 'Gastos | FinWise',
    loadComponent: () => import('./list/list').then(m => m.List),
  },
  {
    path: 'new',
    title: 'Nuevo gasto | FinWise',
    loadComponent: () => import('./form/form').then(m => m.Form),
  },
  {
    path: 'edit/:id',
    title: 'Editar gasto | FinWise',
    loadComponent: () => import('./form/form').then(m => m.Form),
  },
];
