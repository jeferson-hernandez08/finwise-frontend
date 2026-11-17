import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { UsersService } from '../users.service';

@Component({
  selector: 'app-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './form.html'
})
export class Form implements OnInit {
  private fb = inject(FormBuilder);
  private usersService = inject(UsersService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  userForm = this.fb.group({
    full_name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: [''], // Solo requerida al crear
    role_id: ['', Validators.required]
  });

  isEditMode = signal<boolean>(false);
  userId = signal<string | null>(null);
  roles = signal<any[]>([]);
  isGoogleUser = signal<boolean>(false);
  errorMessage = signal<string>('');

  ngOnInit() {
    this.loadRoles();
    
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode.set(true);
      this.userId.set(id);
      this.usersService.getUser(id).subscribe(data => {
        this.isGoogleUser.set(!!data.google_id);
        this.userForm.patchValue({
          full_name: data.full_name,
          email: data.email,
          // Extraemos el ID del rol, ya que viene populado
          role_id: data.role_id?._id || data.role_id
        });
      });
    } else {
      // Si es nuevo usuario, la contraseña es obligatoria
      this.userForm.get('password')?.setValidators([Validators.required, Validators.minLength(6)]);
      this.userForm.get('password')?.updateValueAndValidity();
    }
  }

  loadRoles() {
    this.usersService.getRoles().subscribe(data => this.roles.set(data));
  }

  onSubmit() {
    if (this.userForm.invalid) return;
    
    const formData = { ...this.userForm.value };
    
    // Si estamos editando y es usuario de Google, no enviamos contraseña
    if (this.isEditMode() && this.isGoogleUser()) {
      delete formData.password;
    }

    const request = this.isEditMode()
      ? this.usersService.updateUser(this.userId()!, formData)
      : this.usersService.createUser(formData);

    request.subscribe({
      next: () => this.router.navigate(['/users']),
      error: (err) => this.errorMessage.set(err.error?.message || 'Error al guardar')
    });
  }
}