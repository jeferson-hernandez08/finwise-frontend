import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './shared/guards/auth.guard';
import { Shell } from './layout/shell/shell';

export const routes: Routes = [
  {
    path: 'auth',
    canActivate: [guestGuard],
    loadChildren: () => import('./auth/auth.routes').then(m => m.authRoutes),
  },
  {
    // Todas las pantallas privadas cuelgan del shell (cabecera + barra inferior).
    path: '',
    component: Shell,
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        loadChildren: () =>
          import('./dashboard/dashboard.routes').then(m => m.dashboardRoutes),
      },
      {
        path: 'incomes',
        loadChildren: () =>
          import('./incomes/incomes.routes').then(m => m.incomesRoutes),
      },
      {
        path: 'expenses',
        loadChildren: () =>
          import('./expenses/expenses.routes').then(m => m.expensesRoutes),
      },
      {
        path: 'debts',
        loadChildren: () => import('./debts/debts.routes').then(m => m.debtsRoutes),
      },
      {
        path: 'savings',
        loadChildren: () =>
          import('./savings/savings.routes').then(m => m.savingsRoutes),
      },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    ],
  },
  { path: '**', redirectTo: '' },
];
