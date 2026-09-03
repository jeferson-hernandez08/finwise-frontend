import { Routes } from '@angular/router';
import { ListComponent as DebtsListComponent } from './list/list.component';
import { FormComponent as DebtsFormComponent } from './form/form.component';

export const debtsRoutes: Routes = [
  { path: '', component: DebtsListComponent },
  { path: 'new', component: DebtsFormComponent },
  { path: 'edit/:id', component: DebtsFormComponent }
];