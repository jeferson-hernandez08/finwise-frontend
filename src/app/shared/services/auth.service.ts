import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { jwtDecode } from 'jwt-decode';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthResponse, JwtPayload, UserProfile } from '../models';

const TOKEN_KEY = 'access_token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private apiUrl = environment.apiUrl;

  /** Contenido del JWT. `null` cuando no hay sesión. */
  readonly user = signal<JwtPayload | null>(null);

  /** Perfil ampliado (nombre completo), se carga tras iniciar sesión. */
  readonly profile = signal<UserProfile | null>(null);

  readonly isLoggedIn = computed(() => this.user() !== null);

  /** Nombre a mostrar en la cabecera: nombre completo, o la parte local del correo. */
  readonly displayName = computed(() => {
    const full = this.profile()?.full_name;
    if (full) return full;
    const email = this.profile()?.email ?? this.user()?.email;
    return email ? email.split('@')[0] : 'Usuario';
  });

  /** Iniciales para el avatar de la cabecera. */
  readonly initials = computed(() => {
    const name = this.displayName();
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  });

  constructor() {
    // Rehidrata la sesión al arrancar la aplicación.
    const token = this.getToken();
    if (token && this.isAuthenticated()) {
      this.decodeInto(token);
    } else if (token) {
      // Token caducado: se limpia para no dejar basura en el almacenamiento.
      this.clearToken();
    }
  }

  login(email: string, password: string): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.apiUrl}/auth/login`, { email, password })
      .pipe(tap(res => this.setToken(res.access_token)));
  }

  register(
    email: string,
    password: string,
    fullName: string,
  ): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.apiUrl}/auth/register`, {
        email,
        password,
        full_name: fullName,
      })
      .pipe(tap(res => this.setToken(res.access_token)));
  }

  /** Perfil del usuario autenticado. */
  me(): Observable<UserProfile> {
    return this.http
      .get<UserProfile>(`${this.apiUrl}/auth/me`)
      .pipe(tap(profile => this.profile.set(profile)));
  }

  /** Redirige al flujo de Google OAuth del backend. */
  loginWithGoogle() {
    window.location.href = `${this.apiUrl}/auth/google`;
  }

  logout() {
    this.clearToken();
    this.router.navigate(['/auth/login']);
  }

  getToken(): string | null {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  }

  setToken(token: string) {
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch {
      /* Sin almacenamiento la sesión dura solo hasta recargar. */
    }
    this.decodeInto(token);
  }

  isAuthenticated(): boolean {
    const token = this.getToken();
    if (!token) return false;
    try {
      const decoded = jwtDecode<JwtPayload>(token);
      // Un token sin `exp` se considera válido; el backend tendrá la última palabra.
      if (!decoded.exp) return true;
      return decoded.exp * 1000 > Date.now();
    } catch {
      return false;
    }
  }

  private decodeInto(token: string) {
    try {
      this.user.set(jwtDecode<JwtPayload>(token));
    } catch {
      this.user.set(null);
    }
  }

  private clearToken() {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* Nada que limpiar. */
    }
    this.user.set(null);
    this.profile.set(null);
  }
}
