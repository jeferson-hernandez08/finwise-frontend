import { Routes } from '@angular/router';
import { ExpensesListComponent } from './list/expenses-list.component';
import { ExpensesFormComponent } from './form/expenses-form.component';

export const expensesRoutes: Routes = [
  { path: '', component: ExpensesListComponent },
  { path: 'new', component: ExpensesFormComponent },
  { path: 'edit/:id', component: ExpensesFormComponent }
];