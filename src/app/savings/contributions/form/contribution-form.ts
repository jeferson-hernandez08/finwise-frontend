import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { SavingsService } from '../../savings.service';

@Component({
  selector: 'app-contribution-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './contribution-form.html',
  styleUrl: './contribution-form.css'
})
export class ContributionForm implements OnInit {
  private fb = inject(FormBuilder);
  private savingsService = inject(SavingsService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  goalId = signal<string>('');
  goalInfo = signal<any>(null);
  isLoading = signal<boolean>(false);
  errorMessage = signal<string>('');

  contributionForm = this.fb.group({
    amount: ['', [Validators.required, Validators.min(0.01)]],
    date: [new Date().toISOString().split('T')[0], Validators.required], // YYYY-MM-DD
    note: ['']
  });

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.goalId.set(id);
      // Cargamos la info de la meta para mostrarla en pantalla
      this.savingsService.getSavingsGoal(id).subscribe(data => {
        this.goalInfo.set(data);
      });
    }
  }

  onSubmit() {
    if (this.contributionForm.invalid) return;

    this.isLoading.set(true);
    this.errorMessage.set('');

    const formData = {
      savings_goal_id: this.goalId(), // El ID de la meta a la que le estamos abonando
      amount: Number(this.contributionForm.value.amount),
      date: this.contributionForm.value.date,
      note: this.contributionForm.value.note
    };

    this.savingsService.createContribution(formData).subscribe({
      next: () => {
        // Volvemos al historial de aportes
        this.router.navigate(['/savings', this.goalId(), 'contributions']);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.message || 'Error al guardar el aporte.');
      }
    });
  }
}