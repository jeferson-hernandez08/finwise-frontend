import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { jwtDecode } from 'jwt-decode';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private apiUrl = environment.apiUrl;

  // Señal para el estado del usuario (reactivo)
  user = signal<any>(null);

  login(email: string, password: string) {
    return this.http.post<{ access_token: string }>(`${this.apiUrl}/auth/login`, { email, password });
  }

  register(email: string, password: string, fullName: string) {
    return this.http.post<{ access_token: string }>(`${this.apiUrl}/auth/register`, { email, password, fullName });
  }

  logout() {
    localStorage.removeItem('access_token');
    this.user.set(null);
    this.router.navigate(['/auth/login']);
  }

  getToken(): string | null {
    return localStorage.getItem('access_token');
  }

  setToken(token: string) {
    localStorage.setItem('access_token', token);
    this.user.set(this.decodeToken(token));
  }

  isAuthenticated(): boolean {
    const token = this.getToken();
    if (!token) return false;
    try {
      const decoded: any = jwtDecode(token);
      return decoded.exp * 1000 > Date.now();
    } catch {
      return false;
    }
  }

  private decodeToken(token: string) {
    try {
      return jwtDecode(token);
    } catch {
      return null;
    }
  }
}