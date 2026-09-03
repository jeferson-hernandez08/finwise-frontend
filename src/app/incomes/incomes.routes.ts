import { Routes } from '@angular/router';
import { ListComponent as IncomesListComponent } from './list/list.component';
import { FormComponent as IncomesFormComponent } from './form/form.component';

export const incomesRoutes: Routes = [
  { path: '', component: IncomesListComponent },
  { path: 'new', component: IncomesFormComponent },
  { path: 'edit/:id', component: IncomesFormComponent }
];