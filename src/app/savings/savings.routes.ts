import { Routes } from '@angular/router';
import { SavingsListComponent } from './list/savings-list.component';
import { SavingsFormComponent } from './form/savings-form.component';

export const savingsRoutes: Routes = [
  { path: '', component: SavingsListComponent },
  { path: 'new', component: SavingsFormComponent },
  { path: 'edit/:id', component: SavingsFormComponent }
];