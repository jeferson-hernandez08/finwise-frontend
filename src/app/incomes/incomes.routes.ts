import { Routes } from '@angular/router';
import { IncomesListComponent } from './list/incomes-list.component';
import { IncomesFormComponent } from './form/incomes-form.component';

export const incomesRoutes: Routes = [
  { path: '', component: IncomesListComponent },
  { path: 'new', component: IncomesFormComponent },
  { path: 'edit/:id', component: IncomesFormComponent }
];