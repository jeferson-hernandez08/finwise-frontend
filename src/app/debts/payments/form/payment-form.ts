import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { DebtsService } from '../../debts.service';

@Component({
  selector: 'app-payment-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './payment-form.html',
  styleUrl: './payment-form.css'
})
export class PaymentForm implements OnInit {
  private fb = inject(FormBuilder);
  private debtsService = inject(DebtsService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  debtId = signal<string>('');
  debtInfo = signal<any>(null);
  isLoading = signal<boolean>(false);
  errorMessage = signal<string>('');

  paymentForm = this.fb.group({
    amount: ['', [Validators.required, Validators.min(0.01)]],
    payment_date: [new Date().toISOString().split('T')[0], Validators.required],
    note: ['']
  });

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.debtId.set(id);
      this.debtsService.getDebt(id).subscribe(data => {
        this.debtInfo.set(data);
        
        // Ponemos como valor por defecto la cuota mínima si existe
        if (data.minimum_monthly_payment) {
          this.paymentForm.patchValue({
            amount: data.minimum_monthly_payment
          });
        }
      });
    }
  }

  onSubmit() {
    if (this.paymentForm.invalid) return;

    this.isLoading.set(true);
    this.errorMessage.set('');

    const formData = {
      debt_id: this.debtId(), // El ID de la deuda a la que le estamos pagando
      amount: Number(this.paymentForm.value.amount),
      payment_date: this.paymentForm.value.payment_date,
      note: this.paymentForm.value.note
    };

    // Validación en Frontend antes de enviar (por si acaso)
    if (formData.amount > this.debtInfo().remaining_amount) {
      this.errorMessage.set(`El pago no puede ser mayor al saldo pendiente ($${this.debtInfo().remaining_amount}).`);
      this.isLoading.set(false);
      return;
    }

    this.debtsService.createDebtPayment(formData).subscribe({
      next: () => {
        this.router.navigate(['/debts', this.debtId(), 'payments']);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.message || 'Error al procesar el pago.');
      }
    });
  }
}