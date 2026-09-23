import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../shared/services/auth.service';
import { errorMessage } from '../../shared/services/toast.service';

/** Pantalla de bienvenida: inicio de sesión con correo o con Google. */
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  readonly loading = signal(false);
  readonly showPassword = signal(false);

  /** Error del backend; se pinta dentro del formulario, junto a los campos. */
  readonly errorText = signal<string | null>(null);

  /**
   * Se leen reactivos, no del `snapshot`: si el interceptor vuelve a traer
   * aquí con `expired=1` estando ya en el login, el componente se reutiliza
   * y solo cambian los parámetros.
   */
  private readonly params = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });

  /** El interceptor manda `expired=1` cuando el backend responde 401. */
  readonly sessionExpired = computed(() => this.params().get('expired') === '1');

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  get email() {
    return this.form.controls.email;
  }

  get password() {
    return this.form.controls.password;
  }

  togglePassword() {
    this.showPassword.update(visible => !visible);
  }

  submit() {
    // Evita una segunda petición si se reenvía el formulario con Enter.
    if (this.loading()) return;

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { email, password } = this.form.getRawValue();
    this.loading.set(true);
    this.errorText.set(null);

    this.auth.login(email.trim(), password).subscribe({
      next: () => this.afterLogin(),
      error: (err: unknown) => {
        this.errorText.set(errorMessage(err, 'Correo o contraseña incorrectos'));
        this.loading.set(false);
      },
    });
  }

  loginWithGoogle() {
    this.auth.loginWithGoogle();
  }

  /** El perfil es opcional: si `me()` falla igual entramos con los datos del token. */
  private afterLogin() {
    const target = this.safeRedirect();
    this.auth.me().subscribe({
      next: () => this.go(target),
      error: () => this.go(target),
    });
  }

  /** Solo se acepta una ruta interna; así `redirect` no sirve para sacar al usuario del sitio. */
  private safeRedirect(): string {
    const redirect = this.params().get('redirect');
    if (!redirect) return '/dashboard';

    const isInternal =
      redirect.startsWith('/') &&
      // `//host` y `/\host` son rutas hacia fuera, no pantallas de FinWise.
      !redirect.startsWith('//') &&
      !redirect.startsWith('/\\') &&
      !redirect.startsWith('/auth');

    return isInternal ? redirect : '/dashboard';
  }

  private go(target: string) {
    this.loading.set(false);
    this.router.navigateByUrl(target);
  }
}
