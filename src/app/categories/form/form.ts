import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CategoriesService } from '../categories.service';

@Component({
  selector: 'app-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './form.html'
})
export class Form implements OnInit {
  private fb = inject(FormBuilder);
  private catService = inject(CategoriesService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  categoryForm = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]]
  });

  isEditMode = signal<boolean>(false);
  categoryId = signal<string | null>(null);
  isLoading = signal<boolean>(false);
  errorMessage = signal<string>('');

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode.set(true);
      this.categoryId.set(id);
      this.catService.getCategory(id).subscribe(data => {
        this.categoryForm.patchValue({ name: data.name });
      });
    }
  }

  onSubmit() {
    if (this.categoryForm.invalid) return;
    this.isLoading.set(true);
    this.errorMessage.set('');

    const request = this.isEditMode()
      ? this.catService.updateCategory(this.categoryId()!, this.categoryForm.value)
      : this.catService.createCategory(this.categoryForm.value);

    request.subscribe({
      next: () => this.router.navigate(['/categories']),
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.message || 'Error al guardar la categoría');
      }
    });
  }
}