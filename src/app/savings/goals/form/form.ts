import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { SavingsService } from '../../savings.service';

@Component({
  selector: 'app-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './form.html',
  styleUrl: './form.css'
})
export class Form implements OnInit {
  private fb = inject(FormBuilder);
  private savingsService = inject(SavingsService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  savingsForm = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(3)]],
    target_amount: ['', [Validators.required, Validators.min(1)]],
    current_amount: [0, [Validators.min(0)]],
    deadline: [''] // Opcional
  });

  isEditMode = signal<boolean>(false);
  goalId = signal<string | null>(null);
  isLoading = signal<boolean>(false);
  errorMessage = signal<string>('');

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode.set(true);
      this.goalId.set(id);
      this.loadGoalData(id);
    }
  }

  loadGoalData(id: string) {
    this.isLoading.set(true);
    this.savingsService.getSavingsGoal(id).subscribe({
      next: (data) => {
        // Formateamos fecha si existe
        let formattedDate = '';
        if (data.deadline) {
          formattedDate = new Date(data.deadline).toISOString().split('T')[0];
        }

        this.savingsForm.patchValue({
          name: data.name,
          target_amount: data.target_amount,
          current_amount: data.current_amount,
          deadline: formattedDate
        });
        this.isLoading.set(false);
      },
      error: (err) => {
        this.errorMessage.set('No se pudo cargar la meta de ahorro.');
        this.isLoading.set(false);
      }
    });
  }

  onSubmit() {
    if (this.savingsForm.invalid) return;

    this.isLoading.set(true);
    this.errorMessage.set('');

    const formData = {
      name: this.savingsForm.value.name,
      target_amount: Number(this.savingsForm.value.target_amount),
      current_amount: Number(this.savingsForm.value.current_amount),
      // Si la fecha está vacía, enviamos null, si no, el valor
      deadline: this.savingsForm.value.deadline ? this.savingsForm.value.deadline : null
    };

    const request = this.isEditMode()
      ? this.savingsService.updateSavingsGoal(this.goalId()!, formData)
      : this.savingsService.createSavingsGoal(formData);

    request.subscribe({
      next: () => this.router.navigate(['/savings']),
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.message || 'Error al guardar la meta.');
      }
    });
  }
}