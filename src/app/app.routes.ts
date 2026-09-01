import { Routes } from '@angular/router';
import { AuthGuard } from './shared/guards/auth.guard';

export const routes: Routes = [
  // Lazy loading para autenticación
  {
    path: 'auth',
    loadChildren: () => import('./auth/auth.routes').then(m => m.authRoutes)
  },
  // Rutas protegidas (requieren autenticación)
  {
    path: 'dashboard',
    loadChildren: () => import('./dashboard/dashboard.routes').then(m => m.dashboardRoutes),
    canActivate: [AuthGuard]
  },
  {
    path: 'incomes',
    loadChildren: () => import('./incomes/incomes.routes').then(m => m.incomesRoutes),
    canActivate: [AuthGuard]
  },
  {
    path: 'expenses',
    loadChildren: () => import('./expenses/expenses.routes').then(m => m.expensesRoutes),
    canActivate: [AuthGuard]
  },
  {
    path: 'debts',
    loadChildren: () => import('./debts/debts.routes').then(m => m.debtsRoutes),
    canActivate: [AuthGuard]
  },
  {
    path: 'savings',
    loadChildren: () => import('./savings/savings.routes').then(m => m.savingsRoutes),
    canActivate: [AuthGuard]
  },
  // Redirecciones
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  { path: '**', redirectTo: '/dashboard' }
];