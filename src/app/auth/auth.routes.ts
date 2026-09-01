import { Routes } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { RegisterComponent } from './register/register.component';
import { GoogleCallbackComponent } from './google-callback/google-callback.component';

export const authRoutes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'callback', component: GoogleCallbackComponent },
  { path: '', redirectTo: 'login', pathMatch: 'full' }
];