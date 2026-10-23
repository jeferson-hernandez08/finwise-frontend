import { Routes } from '@angular/router';
// Importamos las Metas (Goals)
import { List as GoalsList } from './goals/list/list';
import { Form as GoalsForm } from './goals/form/form';
// Importamos los Aportes (Contributions)
import { ContributionsList } from './contributions/list/contributions-list';
import { ContributionForm } from './contributions/form/contribution-form';

export const savingsRoutes: Routes = [
  // Rutas para las Metas
  { path: '', component: GoalsList },
  { path: 'new', component: GoalsForm },
  { path: 'edit/:id', component: GoalsForm },
  
  // Rutas para los Aportes
  { path: ':id/contributions', component: ContributionsList },
  { path: ':id/contributions/new', component: ContributionForm }
];