import { Routes } from '@angular/router';
import { Login } from './login/login';
import { Register } from './register/register';
import { GoogleCallback } from './google-callback/google-callback';

export const authRoutes: Routes = [
  { path: 'login', component: Login },
  { path: 'register', component: Register },
  { path: 'callback', component: GoogleCallback },
  { path: '', redirectTo: 'login', pathMatch: 'full' }
];