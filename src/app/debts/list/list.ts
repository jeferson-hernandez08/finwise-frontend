import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Debt } from '../../shared/models';
import { DebtsService } from '../../shared/services/debts.service';
import { ToastService, errorMessage } from '../../shared/services/toast.service';
import { MoneyPipe } from '../../shared/pipes/money.pipe';
import { FechaPipe } from '../../shared/pipes/fecha.pipe';
import { DebtView, buildDebtView, percentagePaid, sortDebtViews } from '../debt-utils';

/** Listado de deudas con el avance global y el estado de cada una. */
@Component({
  selector: 'app-debts-list',
  standalone: true,
  imports: [RouterLink, MoneyPipe, FechaPipe],
  templateUrl: './list.html',
  styleUrl: './list.css',
})
export class List {
  private debtsService = inject(DebtsService);
  private toast = inject(ToastService);
  private router = inject(Router);

  readonly loading = signal(true);
  readonly rows = signal<DebtView[]>([]);
  readonly skeletons = [1, 2, 3];

  readonly totalRemaining = computed(() =>
    this.rows().reduce((sum, row) => sum + Math.max(row.debt.remaining_amount, 0), 0),
  );

  readonly totalOriginal = computed(() =>
    this.rows().reduce((sum, row) => sum + Math.max(row.debt.total_amount, 0), 0),
  );

  readonly totalPaid = computed(() =>
    this.rows().reduce((sum, row) => sum + row.paid, 0),
  );

  readonly paidPercentage = computed(() =>
    percentagePaid(this.totalPaid(), this.totalOriginal()),
  );

  /** Cuántas deudas siguen con saldo: se muestra junto al título. */
  readonly activeCount = computed(
    () => this.rows().filter(row => row.status !== 'paid').length,
  );

  constructor() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.debtsService.findAll().subscribe({
      next: debts => {
        this.rows.set(sortDebtViews(debts.map(buildDebtView)));
        this.loading.set(false);
      },
      error: err => {
        this.loading.set(false);
        this.toast.error(errorMessage(err, 'No se pudieron cargar tus deudas'));
      },
    });
  }

  /** "Abonar" lleva al detalle, que es donde vive el formulario de pago. */
  goToPayment(debt: Debt) {
    this.router.navigate(['/debts/detail', debt._id], {
      queryParams: { abonar: 1 },
    });
  }
}
