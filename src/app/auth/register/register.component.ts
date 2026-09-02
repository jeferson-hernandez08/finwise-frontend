import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../shared/services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  template: `
    <div class="container mt-5">
      <div class="row justify-content-center">
        <div class="col-md-4">
          <div class="card">
            <div class="card-body">
              <h2 class="text-center">FinWise</h2>
              <p class="text-center text-muted">Regístrate para gestionar tus finanzas</p>

              <form [formGroup]="registerForm" (ngSubmit)="onSubmit()">
                <div class="mb-3">
                  <label for="fullName" class="form-label">Nombre completo</label>
                  <input id="fullName" type="text" class="form-control" formControlName="fullName">
                  @if (registerForm.get('fullName')?.invalid && registerForm.get('fullName')?.touched) {
                    <div class="text-danger small">Nombre completo requerido</div>
                  }
                </div>

                <div class="mb-3">
                  <label for="email" class="form-label">Email</label>
                  <input id="email" type="email" class="form-control" formControlName="email" placeholder="tu@email.com">
                  @if (registerForm.get('email')?.invalid && registerForm.get('email')?.touched) {
                    <div class="text-danger small">Email válido requerido</div>
                  }
                </div>

                <div class="mb-3">
                  <label for="password" class="form-label">Contraseña</label>
                  <input id="password" type="password" class="form-control" formControlName="password" placeholder="Mínimo 6 caracteres">
                  @if (registerForm.get('password')?.invalid && registerForm.get('password')?.touched) {
                    <div class="text-danger small">Contraseña requerida (mínimo 6 caracteres)</div>
                  }
                </div>

                <button type="submit" class="btn btn-primary w-100" [disabled]="registerForm.invalid">
                  Registrarse
                </button>

                @if (errorMessage()) {
                  <div class="alert alert-danger mt-3">{{ errorMessage() }}</div>
                }
                @if (successMessage()) {
                  <div class="alert alert-success mt-3">{{ successMessage() }}</div>
                }
              </form>

              <p class="text-center mt-3">
                ¿Ya tienes cuenta? <a routerLink="/auth/login">Inicia sesión</a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: ``
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  registerForm = this.fb.group({
    fullName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  errorMessage = signal<string>('');
  successMessage = signal<string>('');

  onSubmit() {
    if (this.registerForm.invalid) return;
    const { fullName, email, password } = this.registerForm.value;
    this.authService.register(email!, password!, fullName!).subscribe({
      next: (res) => {
        this.authService.setToken(res.access_token);
        this.successMessage.set('¡Registro exitoso! Redirigiendo...');
        setTimeout(() => this.router.navigate(['/dashboard']), 1000);
      },
      error: (err) => {
        this.errorMessage.set(err.error.message || 'Error al registrarse');
      }
    });
  }
}