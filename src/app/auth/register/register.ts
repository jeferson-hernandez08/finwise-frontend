import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../shared/services/auth.service';
import { ToastService, errorMessage } from '../../shared/services/toast.service';

/** Validador de grupo: la confirmación debe coincidir con la contraseña. */
function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const password = group.get('password')?.value;
  const confirmPassword = group.get('confirmPassword')?.value;
  // Sin confirmación escrita todavía no hay nada que comparar.
  if (!confirmPassword) return null;
  return password === confirmPassword ? null : { passwordMismatch: true };
}

/** Fortaleza aproximada de la contraseña: 0 (vacía) a 3 (fuerte). */
function scorePassword(value: string): 0 | 1 | 2 | 3 {
  if (!value) return 0;

  let points = 0;
  if (value.length >= 6) points++;
  if (value.length >= 10) points++;
  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) points++;
  if (/\d/.test(value)) points++;
  if (/[^A-Za-z0-9]/.test(value)) points++;

  if (points <= 2) return 1;
  if (points <= 3) return 2;
  return 3;
}

/** Alta de usuario con correo y contraseña. */
@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class Register {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  private toast = inject(ToastService);

  readonly loading = signal(false);
  readonly showPassword = signal(false);
  readonly errorText = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group(
    {
      fullName: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: passwordsMatch },
  );

  private readonly passwordValue = toSignal(this.form.controls.password.valueChanges, {
    initialValue: '',
  });

  readonly strength = computed(() => scorePassword(this.passwordValue()));

  readonly strengthLabel = computed(() => {
    switch (this.strength()) {
      case 1:
        return 'Débil';
      case 2:
        return 'Media';
      case 3:
        return 'Fuerte';
      default:
        return '';
    }
  });

  readonly strengthClass = computed(() => {
    switch (this.strength()) {
      case 1:
        return 'is-weak';
      case 2:
        return 'is-medium';
      case 3:
        return 'is-strong';
      default:
        return '';
    }
  });

  get fullName() {
    return this.form.controls.fullName;
  }

  get email() {
    return this.form.controls.email;
  }

  get password() {
    return this.form.controls.password;
  }

  get confirmPassword() {
    return this.form.controls.confirmPassword;
  }

  /** El aviso de "no coinciden" vive en el grupo, no en el control. */
  get showMismatch(): boolean {
    const control = this.confirmPassword;
    return (
      this.form.hasError('passwordMismatch') && (control.touched || control.dirty)
    );
  }

  togglePassword() {
    this.showPassword.update(visible => !visible);
  }

  submit() {
    // Evita una segunda alta si se reenvía el formulario con Enter.
    if (this.loading()) return;

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { email, password, fullName } = this.form.getRawValue();
    this.loading.set(true);
    this.errorText.set(null);

    this.auth.register(email.trim(), password, fullName.trim()).subscribe({
      next: () => this.afterRegister(),
      error: (err: unknown) => {
        this.errorText.set(errorMessage(err, 'No pudimos crear tu cuenta'));
        this.loading.set(false);
      },
    });
  }

  /** El perfil es opcional: si `me()` falla igual entramos con los datos del token. */
  private afterRegister() {
    this.auth.me().subscribe({
      next: () => this.go(),
      error: () => this.go(),
    });
  }

  /** El aviso lo pinta el shell: se lanza aquí y se ve ya dentro del dashboard. */
  private go() {
    this.loading.set(false);
    this.toast.success('¡Cuenta creada! Bienvenido a FinWise');
    this.router.navigateByUrl('/dashboard');
  }
}
