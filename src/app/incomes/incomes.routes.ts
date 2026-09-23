import { Routes } from '@angular/router';

export const incomesRoutes: Routes = [
  {
    path: '',
    title: 'Ingresos · FinWise',
    loadComponent: () => import('./list/list').then(m => m.IncomesList),
  },
  {
    path: 'new',
    title: 'Registrar ingreso · FinWise',
    loadComponent: () => import('./form/form').then(m => m.IncomeForm),
  },
  {
    path: 'edit/:id',
    title: 'Editar ingreso · FinWise',
    loadComponent: () => import('./form/form').then(m => m.IncomeForm),
  },
];
