import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { DebtsService } from '../debts.service';

@Component({
  selector: 'app-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './form.html',
  styleUrl: './form.css'
})
export class Form implements OnInit {
  private fb = inject(FormBuilder);
  private debtsService = inject(DebtsService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  debtForm = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(3)]],
    total_amount: ['', [Validators.required, Validators.min(1)]],
    remaining_amount: ['', [Validators.required, Validators.min(0)]],
    minimum_monthly_payment: [''],
    interest_rate: [''],
    due_date: ['']
  });

  isEditMode = signal<boolean>(false);
  debtId = signal<string | null>(null);
  isLoading = signal<boolean>(false);
  errorMessage = signal<string>('');

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode.set(true);
      this.debtId.set(id);
      this.loadDebtData(id);
    } else {
      // Si es nueva, por defecto el saldo restante es igual al total
      // Podemos hacer esto escuchando los cambios del monto total
      this.debtForm.get('total_amount')?.valueChanges.subscribe(val => {
        if (!this.isEditMode() && val) {
          this.debtForm.get('remaining_amount')?.setValue(val);
        }
      });
    }
  }

  loadDebtData(id: string) {
    this.isLoading.set(true);
    this.debtsService.getDebt(id).subscribe({
      next: (data) => {
        let formattedDate = '';
        if (data.due_date) {
          formattedDate = new Date(data.due_date).toISOString().split('T')[0];
        }

        this.debtForm.patchValue({
          name: data.name,
          total_amount: data.total_amount,
          remaining_amount: data.remaining_amount,
          minimum_monthly_payment: data.minimum_monthly_payment || '',
          interest_rate: data.interest_rate || '',
          due_date: formattedDate
        });
        this.isLoading.set(false);
      },
      error: (err) => {
        this.errorMessage.set('No se pudo cargar la deuda.');
        this.isLoading.set(false);
      }
    });
  }

  onSubmit() {
    if (this.debtForm.invalid) return;

    // Validación lógica extra
    if (Number(this.debtForm.value.remaining_amount) > Number(this.debtForm.value.total_amount)) {
      this.errorMessage.set('El saldo restante no puede ser mayor al monto total.');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    const formData = {
      name: this.debtForm.value.name,
      total_amount: Number(this.debtForm.value.total_amount),
      remaining_amount: Number(this.debtForm.value.remaining_amount),
      minimum_monthly_payment: this.debtForm.value.minimum_monthly_payment ? Number(this.debtForm.value.minimum_monthly_payment) : null,
      interest_rate: this.debtForm.value.interest_rate ? Number(this.debtForm.value.interest_rate) : null,
      due_date: this.debtForm.value.due_date ? this.debtForm.value.due_date : null
    };

    const request = this.isEditMode()
      ? this.debtsService.updateDebt(this.debtId()!, formData)
      : this.debtsService.createDebt(formData);

    request.subscribe({
      next: () => this.router.navigate(['/debts']),
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.message || 'Error al guardar la deuda.');
      }
    });
  }
}