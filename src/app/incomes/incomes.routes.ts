import { Routes } from '@angular/router';
import { List } from './list/list';
import { Form } from './form/form';

export const incomesRoutes: Routes = [
  { path: '', component: List },
  { path: 'new', component: Form },
  { path: 'edit/:id', component: Form }
];