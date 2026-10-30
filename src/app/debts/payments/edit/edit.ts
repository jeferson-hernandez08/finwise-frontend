import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { DebtsService } from '../../debts.service';

@Component({
  selector: 'app-edit',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './edit.html',
  styleUrl: './edit.css'
})
export class Edit implements OnInit {
  private fb = inject(FormBuilder);
  private debtsService = inject(DebtsService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  debtId = signal<string>('');
  paymentId = signal<string>('');
  originalPayment = signal<any>(null);
  isLoading = signal<boolean>(false);
  errorMessage = signal<string>('');

  // Solo permitimos editar la nota
  editForm = this.fb.group({
    note: ['']
  });

  ngOnInit() {
    const dId = this.route.snapshot.paramMap.get('id');
    const pId = this.route.snapshot.paramMap.get('paymentId');
    
    if (dId && pId) {
      this.debtId.set(dId);
      this.paymentId.set(pId);
      this.loadPayment(pId);
    }
  }

  loadPayment(id: string) {
    this.isLoading.set(true);
    this.debtsService.getDebtPayment(id).subscribe({
      next: (data) => {
        this.originalPayment.set(data);
        this.editForm.patchValue({
          note: data.note
        });
        this.isLoading.set(false);
      },
      error: (err) => {
        this.errorMessage.set('No se pudo cargar el pago.');
        this.isLoading.set(false);
      }
    });
  }

  onSubmit() {
    this.isLoading.set(true);
    const formData = {
      note: this.editForm.value.note
    };

    this.debtsService.updateDebtPayment(this.paymentId(), formData).subscribe({
      next: () => {
        this.router.navigate(['/debts', this.debtId(), 'payments']);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set('Error al actualizar la nota.');
      }
    });
  }
}