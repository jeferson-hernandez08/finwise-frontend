import { Routes } from '@angular/router';
import { ListComponent as ExpensesListComponent } from './list/list.component';
import { FormComponent as ExpensesFormComponent } from './form/form.component';

export const expensesRoutes: Routes = [
  { path: '', component: ExpensesListComponent },
  { path: 'new', component: ExpensesFormComponent },
  { path: 'edit/:id', component: ExpensesFormComponent }
];