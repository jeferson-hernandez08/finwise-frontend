import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../shared/services/auth.service';

/**
 * Aterrizaje del OAuth de Google: el backend redirige aquí con `?token=`.
 * Guarda el token y salta al dashboard sin dejar rastro en el historial.
 */
@Component({
  selector: 'app-google-callback',
  standalone: true,
  templateUrl: './google-callback.html',
  styleUrl: './google-callback.css',
})
export class GoogleCallback implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private auth = inject(AuthService);

  readonly errorText = signal<string | null>(null);

  ngOnInit() {
    const token = this.route.snapshot.queryParamMap.get('token');

    if (!token) {
      this.errorText.set(
        'No recibimos la respuesta de Google. Vuelve a intentar el ingreso.',
      );
      return;
    }

    this.auth.setToken(token);

    this.auth.me().subscribe({
      next: () =>
        // `replaceUrl` evita que el token quede accesible con el botón "atrás".
        this.router.navigate(['/dashboard'], { replaceUrl: true }),
      error: () =>
        this.errorText.set(
          'No pudimos validar tu cuenta de Google. Vuelve a intentar el ingreso.',
        ),
    });
  }

  /** Limpia el token dudoso antes de volver al login, si no el guard rebota. */
  backToLogin() {
    this.auth.logout();
  }
}
