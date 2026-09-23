import { DestroyRef, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { DebtPayload } from '../../shared/models';
import { DebtsService } from '../../shared/services/debts.service';
import { ConfirmService } from '../../shared/services/confirm.service';
import { ToastService, errorMessage } from '../../shared/services/toast.service';
import { toDateInputValue } from '../../shared/pipes/fecha.pipe';

/** Alta y edición de una deuda. La ruta decide el modo: `edit/:id` o `new`. */
@Component({
  selector: 'app-debt-form',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule],
  templateUrl: './form.html',
  styleUrl: './form.css',
})
export class Form {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);
  private fb = inject(FormBuilder);
  private debtsService = inject(DebtsService);
  private confirm = inject(ConfirmService);
  private toast = inject(ToastService);

  readonly id = this.route.snapshot.paramMap.get('id');
  readonly isEdit = this.id !== null;

  readonly loading = signal(this.isEdit);
  readonly saving = signal(false);
  readonly deleting = signal(false);

  /** Si el usuario escribe el saldo a mano, deja de copiarse del monto total. */
  private remainingEdited = false;

  readonly form = this.fb.group(
    {
      name: this.fb.nonNullable.control('', [
        Validators.required,
        Validators.maxLength(60),
      ]),
      total_amount: this.fb.control<number | null>(null, [
        Validators.required,
        Validators.min(0),
      ]),
      remaining_amount: this.fb.control<number | null>(null, [
        Validators.required,
        Validators.min(0),
      ]),
      minimum_monthly_payment: this.fb.control<number | null>(null, [
        Validators.min(0),
      ]),
      interest_rate: this.fb.control<number | null>(null, [
        Validators.min(0),
        Validators.max(100),
      ]),
      due_date: this.fb.nonNullable.control(''),
    },
    { validators: [remainingWithinTotal] },
  );

  constructor() {
    if (this.isEdit) {
      this.loadDebt();
    } else {
      this.mirrorTotalIntoRemaining();
    }
  }

  get name() {
    return this.form.controls.name;
  }

  get totalAmount() {
    return this.form.controls.total_amount;
  }

  get remainingAmount() {
    return this.form.controls.remaining_amount;
  }

  get interestRate() {
    return this.form.controls.interest_rate;
  }

  get minimumPayment() {
    return this.form.controls.minimum_monthly_payment;
  }

  invalid(control: AbstractControl): boolean {
    return control.invalid && (control.touched || control.dirty);
  }

  /** El error de grupo solo estorba una vez que hay algo escrito en ambos campos. */
  get showTotalMismatch(): boolean {
    return (
      this.form.hasError('remainingExceedsTotal') &&
      (this.remainingAmount.touched || this.remainingAmount.dirty)
    );
  }

  markRemainingEdited() {
    this.remainingEdited = true;
  }

  submit() {
    if (this.saving() || this.deleting()) return;

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const payload: DebtPayload = {
      name: raw.name.trim(),
      total_amount: Number(raw.total_amount),
      remaining_amount: Number(raw.remaining_amount),
    };

    const minimum = numberOrNull(raw.minimum_monthly_payment);
    if (minimum !== null) payload.minimum_monthly_payment = minimum;

    const rate = numberOrNull(raw.interest_rate);
    if (rate !== null) payload.interest_rate = rate;

    // El `input type="date"` ya entrega 'YYYY-MM-DD'; si está vacío no se envía.
    if (raw.due_date) payload.due_date = raw.due_date;

    this.saving.set(true);
    const request =
      this.isEdit && this.id
        ? this.debtsService.update(this.id, payload)
        : this.debtsService.create(payload);

    request.subscribe({
      next: debt => {
        this.saving.set(false);
        this.toast.success(this.isEdit ? 'Deuda actualizada' : 'Deuda creada');
        this.router.navigate(['/debts/detail', debt._id]);
      },
      error: err => {
        this.saving.set(false);
        this.toast.error(errorMessage(err, 'No se pudo guardar la deuda'));
      },
    });
  }

  async remove() {
    if (!this.id || this.deleting()) return;

    const ok = await this.confirm.ask({
      title: 'Eliminar deuda',
      message:
        'Se eliminarán la deuda y todo su historial de abonos. Esta acción no se puede deshacer.',
      confirmLabel: 'Eliminar',
    });
    if (!ok) return;

    this.deleting.set(true);
    this.debtsService.remove(this.id).subscribe({
      next: () => {
        this.deleting.set(false);
        this.toast.success('Deuda eliminada');
        this.router.navigate(['/debts']);
      },
      error: err => {
        this.deleting.set(false);
        this.toast.error(errorMessage(err, 'No se pudo eliminar la deuda'));
      },
    });
  }

  private loadDebt() {
    if (!this.id) return;

    this.debtsService.findOne(this.id).subscribe({
      next: debt => {
        this.form.patchValue({
          name: debt.name,
          total_amount: debt.total_amount,
          remaining_amount: debt.remaining_amount,
          minimum_monthly_payment: debt.minimum_monthly_payment ?? null,
          interest_rate: debt.interest_rate ?? null,
          due_date: toDateInputValue(debt.due_date),
        });
        this.loading.set(false);
      },
      error: err => {
        this.loading.set(false);
        this.toast.error(errorMessage(err, 'No se pudo cargar la deuda'));
        this.router.navigate(['/debts']);
      },
    });
  }

  /**
   * Al dar de alta una deuda lo normal es deber todavía el monto completo, así
   * que el saldo se copia del total mientras el usuario no lo escriba él mismo.
   */
  private mirrorTotalIntoRemaining() {
    this.totalAmount.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(value => {
        const remaining = this.remainingAmount.value;
        const isEmpty = remaining === null || Number.isNaN(Number(remaining));
        if (this.remainingEdited && !isEmpty) return;
        this.remainingAmount.setValue(value, { emitEvent: false });
      });
  }
}

/** Deber más de lo que se pidió no tiene sentido: se valida sobre el grupo. */
function remainingWithinTotal(group: AbstractControl): ValidationErrors | null {
  const total = numberOrNull(group.get('total_amount')?.value);
  const remaining = numberOrNull(group.get('remaining_amount')?.value);

  // Mientras falte uno de los dos no hay nada que comparar.
  if (total === null || remaining === null) return null;

  return remaining > total ? { remainingExceedsTotal: true } : null;
}

/** Convierte el valor de un campo numérico opcional: vacío se trata como ausente. */
function numberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
