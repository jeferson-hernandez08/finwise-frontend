import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { DebtsService } from '../../debts.service';

@Component({
  selector: 'app-payments-list',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './payments-list.html',
  styleUrl: './payments-list.css'
})
export class PaymentsList implements OnInit {
  private debtsService = inject(DebtsService);
  private route = inject(ActivatedRoute);

  payments = signal<any[]>([]);
  debtInfo = signal<any>(null); 
  debtId = signal<string>('');
  isLoading = signal<boolean>(true);

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.debtId.set(id);
      this.loadData(id);
    }
  }

  loadData(id: string) {
    this.isLoading.set(true);
    
    // Obtenemos la info de la deuda (para mostrar el saldo actualizado)
    this.debtsService.getDebt(id).subscribe({
      next: (debt) => this.debtInfo.set(debt)
    });

    // Obtenemos el historial de pagos
    this.debtsService.getDebtPayments(id).subscribe({
      next: (data) => {
        this.payments.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error(err);
        this.isLoading.set(false);
      }
    });
  }

  deletePayment(paymentId: string) {
    if (confirm('¿Estás seguro de eliminar este pago? El saldo de la deuda volverá a subir.')) {
      this.debtsService.deleteDebtPayment(paymentId).subscribe({
        next: () => {
          // Recargamos los datos para ver el nuevo saldo
          this.loadData(this.debtId());
        },
        error: (err) => console.error(err)
      });
    }
  }
}