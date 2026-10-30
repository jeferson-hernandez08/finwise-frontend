import { Routes } from '@angular/router';
// Importamos los componentes de la Deuda Principal (Main)
import { List as DebtsList } from './main/list/list';
import { Form as DebtsForm } from './main/form/form';
// Importamos los componentes de los Pagos (Payments)
import { PaymentsList } from './payments/list/payments-list'; // (O 'list' si lo renombraste)
import { PaymentForm } from './payments/form/payment-form';   // (O 'form' si lo renombraste)
import { Edit as PaymentEdit } from './payments/edit/edit';

export const debtsRoutes: Routes = [
  // Rutas para la Deuda principal
  { path: '', component: DebtsList },
  { path: 'new', component: DebtsForm },
  { path: 'edit/:id', component: DebtsForm },
  // Rutas para pagos
  { path: ':id/payments', component: PaymentsList },
  { path: ':id/payments/new', component: PaymentForm },
  { path: ':id/payments/edit/:paymentId', component: PaymentEdit }
];