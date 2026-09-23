import { Component, computed, inject, signal } from '@angular/core';
import { Location } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { MoneyPipe } from '../../shared/pipes/money.pipe';
import { toDateInputValue } from '../../shared/pipes/fecha.pipe';
import { PeriodService } from '../../shared/services/period.service';
import { CategoriesService } from '../../shared/services/categories.service';
import { ConfirmService } from '../../shared/services/confirm.service';
import { DebtsService } from '../../shared/services/debts.service';
import { ExpensesService } from '../../shared/services/expenses.service';
import {
  ToastService,
  errorMessage,
} from '../../shared/services/toast.service';
import {
  Debt,
  ExpenseCategory,
  ExpensePayload,
  refId,
} from '../../shared/models';

/** Categoría que el backend siembra para los pagos de deuda. */
const DEBT_CATEGORY = 'Debts';

type FieldName = 'amount' | 'category_id' | 'description' | 'date' | 'debt_id';

@Component({
  selector: 'app-form',
  imports: [ReactiveFormsModule, MoneyPipe],
  styleUrl: './form.css',
  templateUrl: './form.html',
})
export class Form {
  private readonly fb = inject(FormBuilder);
  private readonly expenses = inject(ExpensesService);
  private readonly debts = inject(DebtsService);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly period = inject(PeriodService);

  readonly categories = inject(CategoriesService);

  /** `null` en alta; el id del gasto en edición. */
  readonly id = inject(ActivatedRoute).snapshot.paramMap.get('id');
  readonly isEdit = this.id !== null;

  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly deleting = signal(false);
  readonly submitted = signal(false);
  readonly notFound = signal<string | null>(null);
  readonly formError = signal<string | null>(null);

  readonly categoryList = signal<ExpenseCategory[]>([]);
  readonly loadingCategories = signal(true);

  /** Celdas del esqueleto de categorías; fija para no recrearla en cada ciclo. */
  readonly skeletonCells = [1, 2, 3, 4, 5, 6];

  private readonly allDebts = signal<Debt[]>([]);
  /** Deuda ya asociada al gasto que se edita, aunque hoy esté saldada. */
  private readonly linkedDebtId = signal<string | null>(null);

  /** Solo se puede abonar a deudas con saldo; se conserva la ya asociada. */
  readonly debtOptions = computed(() =>
    this.allDebts().filter(
      d => d.remaining_amount > 0 || d._id === this.linkedDebtId(),
    ),
  );

  readonly form = this.fb.nonNullable.group({
    amount: [null as number | null, [Validators.required, Validators.min(1)]],
    category_id: ['', Validators.required],
    description: ['', Validators.maxLength(120)],
    date: [this.period.defaultDateForForms(), Validators.required],
    is_debt_payment: [false],
    debt_id: [''],
  });

  constructor() {
    this.loadCategories();
    this.loadDebts();
    if (this.id) this.loadExpense(this.id);

    this.form.controls.is_debt_payment.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(checked => {
        this.syncDebtValidators(checked);
        if (checked) this.preselectDebtCategory();
        else this.form.controls.debt_id.setValue('', { emitEvent: false });
      });
  }

  // ---- Carga --------------------------------------------------------------

  private loadCategories() {
    this.categories.findAll().subscribe({
      next: list => {
        this.categoryList.set(list);
        this.loadingCategories.set(false);
      },
      error: err => {
        this.loadingCategories.set(false);
        this.toast.error(
          errorMessage(err, 'No se pudieron cargar las categorías'),
        );
      },
    });
  }

  private loadDebts() {
    this.debts.findAll().subscribe({
      next: list => this.allDebts.set(list),
      error: () => {
        // Sin deudas cargadas el formulario sigue sirviendo para un gasto normal.
      },
    });
  }

  private loadExpense(id: string) {
    this.loading.set(true);
    this.expenses.findOne(id).subscribe({
      next: expense => {
        const debtId = refId(expense.debt_id);
        this.linkedDebtId.set(debtId);
        // `emitEvent: false` evita que el checkbox reescriba la categoría guardada.
        this.form.patchValue(
          {
            amount: expense.amount,
            category_id: refId(expense.category_id) ?? '',
            description: expense.description ?? '',
            date: toDateInputValue(expense.date),
            is_debt_payment: debtId !== null,
            debt_id: debtId ?? '',
          },
          { emitEvent: false },
        );
        this.syncDebtValidators(debtId !== null);
        this.loading.set(false);
      },
      error: err => {
        this.loading.set(false);
        this.notFound.set(errorMessage(err, 'No encontramos este gasto'));
      },
    });
  }

  // ---- Interacción --------------------------------------------------------

  selectCategory(id: string) {
    this.form.controls.category_id.setValue(id);
    this.form.controls.category_id.markAsTouched();
  }

  private preselectDebtCategory() {
    const id =
      this.categoryList().find(c => c.name === DEBT_CATEGORY)?._id ?? null;
    if (id) this.form.controls.category_id.setValue(id);
  }

  private syncDebtValidators(checked: boolean) {
    const control = this.form.controls.debt_id;
    if (checked) control.setValidators(Validators.required);
    else control.clearValidators();
    control.updateValueAndValidity({ emitEvent: false });
  }

  save() {
    this.submitted.set(true);
    this.formError.set(null);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      // Sin deudas que elegir no se dibuja el select, así que su error nunca
      // se vería y el botón parecería no responder.
      this.formError.set(
        this.form.controls.debt_id.invalid && this.debtOptions().length === 0
          ? 'No tienes deudas con saldo pendiente. Desmarca «Es el pago de una deuda» o registra la deuda primero.'
          : 'Revisa los campos marcados y vuelve a intentarlo.',
      );
      return;
    }

    const value = this.form.getRawValue();
    const description = value.description.trim();
    // Al desmarcar el pago de deuda en edición hay que enviar `null` para desligarlo.
    const unlinkDebt =
      this.isEdit && !value.is_debt_payment && this.linkedDebtId() !== null;

    const payload: ExpensePayload = {
      amount: Number(value.amount),
      category_id: value.category_id,
      date: toDateInputValue(value.date),
      description: description || undefined,
      debt_id: value.is_debt_payment
        ? value.debt_id
        : unlinkDebt
          ? null
          : undefined,
    };

    this.saving.set(true);
    const request = this.id
      ? this.expenses.update(this.id, payload)
      : this.expenses.create(payload);

    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.toast.success(
          this.isEdit ? 'Gasto actualizado' : 'Gasto registrado',
        );
        this.router.navigate(['/expenses']);
      },
      error: err => {
        this.saving.set(false);
        const message = errorMessage(err, 'No se pudo guardar el gasto');
        this.formError.set(message);
        this.toast.error(message);
      },
    });
  }

  async remove() {
    if (!this.id) return;

    const ok = await this.confirm.ask({
      title: 'Eliminar gasto',
      message: this.form.controls.is_debt_payment.value
        ? 'Se eliminará el gasto y el monto volverá al saldo de la deuda.'
        : '¿Eliminar este gasto? Esta acción no se puede deshacer.',
      confirmLabel: 'Eliminar',
      danger: true,
    });
    if (!ok) return;

    this.deleting.set(true);
    this.expenses.remove(this.id).subscribe({
      next: () => {
        this.deleting.set(false);
        this.toast.success('Gasto eliminado');
        this.router.navigate(['/expenses']);
      },
      error: err => {
        this.deleting.set(false);
        const message = errorMessage(err, 'No se pudo eliminar el gasto');
        this.formError.set(message);
        this.toast.error(message);
      },
    });
  }

  cancel() {
    // `window.history.length` también cuenta las páginas anteriores de la
    // pestaña, así que sacaría al usuario de FinWise si llegó por un enlace
    // externo. Solo hay a dónde volver si antes hubo navegación en la app.
    const cameFromApp =
      this.router.lastSuccessfulNavigation()?.previousNavigation != null;

    if (cameFromApp) this.location.back();
    else this.router.navigate(['/expenses']);
  }

  goToList() {
    this.router.navigate(['/expenses']);
  }

  // ---- Validación ---------------------------------------------------------

  invalid(name: FieldName): boolean {
    const control = this.form.controls[name];
    return control.invalid && (control.touched || this.submitted());
  }

  errorFor(name: FieldName): string {
    const control = this.form.controls[name];
    if (control.hasError('required')) {
      switch (name) {
        case 'amount':
          return 'Escribe el monto del gasto';
        case 'category_id':
          return 'Elige una categoría';
        case 'date':
          return 'Elige la fecha del gasto';
        case 'debt_id':
          return 'Elige a qué deuda corresponde el pago';
        default:
          return 'Este campo es obligatorio';
      }
    }
    if (control.hasError('min')) return 'El monto debe ser mayor que cero';
    if (control.hasError('maxlength')) return 'Máximo 120 caracteres';
    return 'Revisa este campo';
  }
}
