import { Routes } from '@angular/router';
import { ListComponent as SavingsListComponent } from './list/list.component';
import { FormComponent as SavingsFormComponent } from './form/form.component';

export const savingsRoutes: Routes = [
  { path: '', component: SavingsListComponent },
  { path: 'new', component: SavingsFormComponent },
  { path: 'edit/:id', component: SavingsFormComponent }
];