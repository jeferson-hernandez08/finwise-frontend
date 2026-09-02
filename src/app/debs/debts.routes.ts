import { Routes } from '@angular/router';
import { DebtsListComponent } from './list/debts-list.component';
import { DebtsFormComponent } from './form/debts-form.component';

export const debtsRoutes: Routes = [
  { path: '', component: DebtsListComponent },
  { path: 'new', component: DebtsFormComponent },
  { path: 'edit/:id', component: DebtsFormComponent }
];