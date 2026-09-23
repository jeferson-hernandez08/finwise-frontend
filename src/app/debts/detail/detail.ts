import {
  Component,
  ElementRef,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Debt, DebtPayment } from '../../shared/models';
import { DebtsService } from '../../shared/services/debts.service';
import { ConfirmService } from '../../shared/services/confirm.service';
import { ToastService, errorMessage } from '../../shared/services/toast.service';
import { toISODate } from '../../shared/services/period.service';
import { MoneyPipe } from '../../shared/pipes/money.pipe';
import { FechaPipe } from '../../shared/pipes/fecha.pipe';
import { buildDebtView } from '../debt-utils';

/** Detalle de una deuda: datos, abono rápido e historial de pagos. */
@Component({
  selector: 'app-debt-detail',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule, MoneyPipe, FechaPipe],
  templateUrl: './detail.html',
  styleUrl: './detail.css',
})
export class Detail {
  private route = inject(ActivatedRoute);
  private fb = inject(FormBuilder);
  private debtsService = inject(DebtsService);
  private confirm = inject(ConfirmService);
  private toast = inject(ToastService);

  /** Para componer mensajes de confirmación con el monto ya formateado. */
  private money = new MoneyPipe();

  private amountInput = viewChild<ElementRef<HTMLInputElement>>('amountInput');

  readonly id = this.route.snapshot.paramMap.get('id') ?? '';

  readonly debt = signal<Debt | null>(null);
  readonly payments = signal<DebtPayment[]>([]);
  readonly loading = signal(true);
  readonly loadingPayments = signal(true);
  readonly saving = signal(false);
  readonly skeletons = [1, 2, 3];

  readonly view = computed(() => {
    const debt = this.debt();
    return debt ? buildDebtView(debt) : null;
  });

  readonly isPaid = computed(() => (this.debt()?.remaining_amount ?? 1) <= 0);

  readonly form = this.fb.group({
    amount: this.fb.control<number | null>(null, {
      validators: [
        Validators.required,
        Validators.min(1),
        control => this.overRemaining(control),
      ],
    }),
    payment_date: this.fb.nonNullable.control(toISODate(new Date()), [
      Validators.required,
    ]),
    note: this.fb.nonNullable.control(''),
  });

  constructor() {
    if (this.id) {
      this.loadDebt(true);
      this.loadPayments();
    } else {
      this.loading.set(false);
      this.loadingPayments.set(false);
    }
  }

  get amount() {
    return this.form.controls.amount;
  }

  get paymentDate() {
    return this.form.controls.payment_date;
  }

  /** Un error solo se muestra cuando el usuario ya tocó el campo. */
  invalid(control: AbstractControl): boolean {
    return control.invalid && (control.touched || control.dirty);
  }

  submit() {
    const debt = this.debt();
    if (!debt || this.saving()) return;

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const note = raw.note.trim();

    this.saving.set(true);
    this.debtsService
      .addPayment({
        debt_id: debt._id,
        amount: Number(raw.amount),
        payment_date: raw.payment_date,
        note: note || undefined,
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.toast.success('Abono registrado');
          this.resetForm();
          // El backend recalcula el saldo, así que se vuelve a pedir todo.
          this.loadDebt(false);
          this.loadPayments();
        },
        error: err => {
          this.saving.set(false);
          this.toast.error(errorMessage(err, 'No se pudo registrar el abono'));
        },
      });
  }

  async removePayment(payment: DebtPayment) {
    const ok = await this.confirm.ask({
      title: 'Eliminar abono',
      message: `Se eliminará el abono de ${this.money.transform(payment.amount)} y ese importe volverá a sumarse al saldo pendiente de la deuda.`,
      confirmLabel: 'Eliminar',
    });
    if (!ok) return;

    this.debtsService.removePayment(payment._id).subscribe({
      next: () => {
        this.toast.success('Abono eliminado');
        this.loadDebt(false);
        this.loadPayments();
      },
      error: err =>
        this.toast.error(errorMessage(err, 'No se pudo eliminar el abono')),
    });
  }

  /**
   * `initial` distingue la primera carga de las recargas tras un abono: al
   * refrescar no se vacía la pantalla, para no perder el sitio donde se estaba.
   */
  private loadDebt(initial: boolean) {
    if (initial) this.loading.set(true);

    this.debtsService.findOne(this.id).subscribe({
      next: debt => {
        this.debt.set(debt);
        this.loading.set(false);
        // El tope del abono depende del saldo, que acaba de cambiar.
        this.amount.updateValueAndValidity({ emitEvent: false });
        if (initial) this.focusAmountIfRequested();
      },
      error: err => {
        this.loading.set(false);
        this.toast.error(errorMessage(err, 'No se pudo cargar la deuda'));
      },
    });
  }

  private loadPayments() {
    // Con historial ya en pantalla se recarga en silencio, sin parpadeo.
    this.loadingPayments.set(this.payments().length === 0);
    this.debtsService.findPayments(this.id).subscribe({
      next: payments => {
        this.payments.set([...payments].sort(byDateDesc));
        this.loadingPayments.set(false);
      },
      error: err => {
        this.loadingPayments.set(false);
        this.toast.error(errorMessage(err, 'No se pudo cargar el historial'));
      },
    });
  }

  private resetForm() {
    this.form.reset({
      amount: null,
      payment_date: toISODate(new Date()),
      note: '',
    });
  }

  /** El abono no puede dejar la deuda en negativo. */
  private overRemaining(control: AbstractControl): ValidationErrors | null {
    const value = Number(control.value);
    const remaining = this.debt()?.remaining_amount;
    if (remaining === undefined || !Number.isFinite(value) || value <= 0) {
      return null;
    }
    return value > remaining ? { overRemaining: { remaining } } : null;
  }

  /**
   * Se llega aquí desde el botón "Abonar" de la lista (`?abonar=1`): el campo
   * del monto se enfoca solo, pero hay que esperar a que la plantilla lo pinte.
   */
  private focusAmountIfRequested() {
    if (!this.route.snapshot.queryParamMap.has('abonar') || this.isPaid()) return;
    setTimeout(() => this.amountInput()?.nativeElement.focus());
  }
}

/** Lo más reciente primero: es lo que el usuario acaba de registrar. */
function byDateDesc(a: DebtPayment, b: DebtPayment): number {
  return b.payment_date.localeCompare(a.payment_date);
}
