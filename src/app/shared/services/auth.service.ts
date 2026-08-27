import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { jwtDecode } from 'jwt-decode';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private apiUrl = environment.apiUrl;

  // Estado reactivo con Signals
  private tokenSignal = signal<string | null>(localStorage.getItem('access_token'));

  // Computed: si el token es válido
  isAuthenticated = computed(() => {
    const token = this.tokenSignal();
    if (!token) return false;
    try {
      const decoded: any = jwtDecode(token);
      const exp = decoded.exp * 1000;
      return Date.now() < exp;
    } catch {
      return false;
    }
  });

  // Computed: información del usuario
  user = computed(() => {
    const token = this.tokenSignal();
    if (!token) return null;
    try {
      return jwtDecode(token);
    } catch {
      return null;
    }
  });

  get token(): string | null {
    return this.tokenSignal();
  }

  login(email: string, password: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/login`, { email, password }).pipe(
      tap((res: any) => {
        if (res.access_token) {
          localStorage.setItem('access_token', res.access_token);
          this.tokenSignal.set(res.access_token);
        }
      })
    );
  }

  register(email: string, password: string, fullName: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/register`, { email, password, fullName }).pipe(
      tap((res: any) => {
        if (res.access_token) {
          localStorage.setItem('access_token', res.access_token);
          this.tokenSignal.set(res.access_token);
        }
      })
    );
  }

  logout(): void {
    localStorage.removeItem('access_token');
    this.tokenSignal.set(null);
    this.router.navigate(['/auth/login']);
  }

  loginWithGoogle(): void {
    window.location.href = `${this.apiUrl}/auth/google`;
  }
}