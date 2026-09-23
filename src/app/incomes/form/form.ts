import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Observable } from 'rxjs';
import { distinctUntilChanged, map, startWith, switchMap, tap } from 'rxjs/operators';
import { MoneyPipe } from '../../shared/pipes/money.pipe';
import { ConfirmService } from '../../shared/services/confirm.service';
import { IncomesService } from '../../shared/services/incomes.service';
import { MONTH_NAMES, PeriodService } from '../../shared/services/period.service';
import { ToastService, errorMessage } from '../../shared/services/toast.service';
import { MonthlyIncome, MonthlyIncomePayload } from '../../shared/models';

@Component({
  selector: 'app-income-form',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, MoneyPipe],
  templateUrl: './form.html',
  styleUrl: './form.css',
})
export class IncomeForm {
  private fb = inject(FormBuilder);
  private api = inject(IncomesService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private toast = inject(ToastService);
  private confirm = inject(ConfirmService);
  private period = inject(PeriodService);
  private destroyRef = inject(DestroyRef);

  readonly months = MONTH_NAMES;

  /** `null` en alta. Es una señal porque se puede saltar de un ingreso a otro. */
  readonly incomeId = signal<string | null>(null);
  readonly isEdit = computed(() => this.incomeId() !== null);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly deleting = signal(false);
  readonly years = signal<number[]>(lastYears());

  readonly form = this.fb.group({
    // El monto se maneja como texto para aceptar "2.500.000" tal cual se escribe.
    amount: this.fb.nonNullable.control('', amountValidator),
    month: this.fb.nonNullable.control(this.period.month(), Validators.required),
    year: this.fb.nonNullable.control(this.period.year(), Validators.required),
  });

  /** Lo que devolvió el backend para el periodo elegido en el formulario. */
  private readonly existingAtPeriod = signal<MonthlyIncome | null>(null);

  /**
   * Ingreso que choca con el que se está creando. En edición, coincidir
   * consigo mismo no es un duplicado.
   */
  readonly duplicate = computed(() => {
    const found = this.existingAtPeriod();
    return found && found._id !== this.incomeId() ? found : null;
  });

  readonly duplicateLabel = computed(() => {
    const found = this.duplicate();
    return found ? `${MONTH_NAMES[found.month - 1]} ${found.year}` : '';
  });

  private readonly amountText = toSignal(this.form.controls.amount.valueChanges, {
    initialValue: this.form.controls.amount.value,
  });

  /** Monto ya interpretado, para mostrarlo formateado bajo el campo. */
  readonly amountPreview = computed(() => parseAmount(this.amountText()));

  constructor() {
    // La misma ruta se reutiliza al saltar de un ingreso a otro, así que se
    // escucha el parámetro en lugar de leer el snapshot una sola vez.
    this.route.paramMap.pipe(takeUntilDestroyed()).subscribe(params => {
      const id = params.get('id');
      this.incomeId.set(id);
      if (id) {
        this.loadIncome(id);
      } else {
        this.resetToPeriod();
      }
    });

    // Avisa del choque antes de enviar nada al backend.
    this.form.valueChanges
      .pipe(
        startWith(null),
        map(() => {
          const { year, month } = this.form.getRawValue();
          return { year, month };
        }),
        distinctUntilChanged((a, b) => a.year === b.year && a.month === b.month),
        // Mientras llega la respuesta del mes nuevo no se muestra el aviso del anterior.
        tap(() => this.existingAtPeriod.set(null)),
        switchMap(({ year, month }) => this.api.findByPeriod(year, month)),
        takeUntilDestroyed(),
      )
      .subscribe(found => this.existingAtPeriod.set(found ?? null));
  }

  /** El error solo se muestra cuando el usuario ya tocó el campo. */
  showError(name: 'amount' | 'month' | 'year'): boolean {
    const control = this.form.controls[name];
    return control.invalid && (control.touched || control.dirty);
  }

  amountError(): string {
    const errors = this.form.controls.amount.errors;
    if (!errors) return '';
    if (errors['required']) return 'Escribe cuánto recibiste este mes';
    if (errors['nan']) return 'Usa solo números, por ejemplo 2.500.000';
    if (errors['min']) return 'El monto no puede ser negativo';
    return 'El monto no es válido';
  }

  save() {
    if (this.saving() || this.loading()) return;

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const blocking = this.duplicate();
    if (blocking) {
      this.toast.error(
        `${MONTH_NAMES[blocking.month - 1]} ${blocking.year} ya tiene un ingreso registrado.`,
      );
      return;
    }

    const raw = this.form.getRawValue();
    const amount = parseAmount(raw.amount);
    if (amount === null) {
      this.form.controls.amount.markAsTouched();
      return;
    }

    const payload: MonthlyIncomePayload = { amount, month: raw.month, year: raw.year };
    const id = this.incomeId();
    const request: Observable<MonthlyIncome> = id
      ? this.api.update(id, payload)
      : this.api.create(payload);

    this.saving.set(true);
    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.toast.success(id ? 'Ingreso actualizado' : 'Ingreso registrado');
        // El listado se abre en el mes que se acaba de guardar.
        if (!isFuture(payload.year, payload.month)) {
          this.period.set(payload.year, payload.month);
        }
        this.router.navigate(['/incomes']);
      },
      error: (err: unknown) => {
        this.saving.set(false);
        if ((err as { status?: number }).status === 409) {
          const label = `${MONTH_NAMES[payload.month - 1]} ${payload.year}`;
          this.toast.error(
            `Ya existe un ingreso para ${label}. Solo puede haber uno por mes.`,
          );
          // Se recupera el registro que choca para ofrecer el enlace de edición.
          this.api
            .findByPeriod(payload.year, payload.month)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(found => this.existingAtPeriod.set(found ?? null));
          return;
        }
        this.toast.error(errorMessage(err, 'No se pudo guardar el ingreso'));
      },
    });
  }

  async removeIncome() {
    const id = this.incomeId();
    if (!id || this.deleting()) return;

    const raw = this.form.getRawValue();
    const label = `${MONTH_NAMES[raw.month - 1]} ${raw.year}`;
    const confirmed = await this.confirm.ask({
      title: 'Eliminar ingreso',
      message:
        `Se borrará el ingreso de ${label}. Ese mes quedará sin sueldo ` +
        'registrado y su saldo se calculará como si no hubieras recibido nada.',
      confirmLabel: 'Eliminar',
    });
    if (!confirmed) return;

    this.deleting.set(true);
    this.api.remove(id).subscribe({
      next: () => {
        this.deleting.set(false);
        this.toast.success('Ingreso eliminado');
        this.router.navigate(['/incomes']);
      },
      error: (err: unknown) => {
        this.deleting.set(false);
        this.toast.error(errorMessage(err, 'No se pudo eliminar el ingreso'));
      },
    });
  }

  private loadIncome(id: string) {
    this.loading.set(true);
    // Se cancela al destruir: de lo contrario un fallo tardío sacaría un aviso
    // y arrastraría al listado desde la pantalla a la que el usuario ya se fue.
    this.api.findOne(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: income => {
        this.ensureYear(income.year);
        this.form.reset({
          amount: `${income.amount}`,
          month: income.month,
          year: income.year,
        });
        this.loading.set(false);
      },
      error: (err: unknown) => {
        this.loading.set(false);
        this.toast.error(errorMessage(err, 'No se pudo cargar el ingreso'));
        this.router.navigate(['/incomes']);
      },
    });
  }

  private resetToPeriod() {
    this.ensureYear(this.period.year());
    this.form.reset({
      amount: '',
      month: this.period.month(),
      year: this.period.year(),
    });
    this.loading.set(false);
  }

  /** Un ingreso antiguo puede caer fuera de los últimos cinco años. */
  private ensureYear(year: number) {
    this.years.update(list =>
      list.includes(year) ? list : [...list, year].sort((a, b) => b - a),
    );
  }
}

/** Los últimos cinco años, del más reciente al más antiguo. */
function lastYears(): number[] {
  const current = new Date().getFullYear();
  return [0, 1, 2, 3, 4].map(offset => current - offset);
}

function isFuture(year: number, month: number): boolean {
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1;
  return year > currentYear || (year === currentYear && month > currentMonth);
}

/**
 * Interpreta el monto tal como lo escribe alguien en Colombia: "2.500.000",
 * "2500000" o "2500000,50". Devuelve `null` si no hay forma de leerlo.
 */
export function parseAmount(raw: string | null | undefined): number | null {
  const cleaned = (raw ?? '').replace(/[\s$]/g, '');
  if (!cleaned) return null;
  if (!/^-?[\d.,]+$/.test(cleaned)) return null;

  const hasDot = cleaned.includes('.');
  const hasComma = cleaned.includes(',');
  let normalized = cleaned;

  if (hasDot && hasComma) {
    // "1.250.000,50": el punto agrupa miles y la coma separa decimales.
    normalized = cleaned.replace(/\./g, '').replace(',', '.');
  } else if (hasComma) {
    normalized = /^-?\d{1,3}(,\d{3})+$/.test(cleaned)
      ? cleaned.replace(/,/g, '')
      : cleaned.replace(',', '.');
  } else if (hasDot && /^-?\d{1,3}(\.\d{3})+$/.test(cleaned)) {
    // "1.250.000": puntos de miles, sin decimales.
    normalized = cleaned.replace(/\./g, '');
  }

  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

function amountValidator(control: AbstractControl): ValidationErrors | null {
  const raw = `${control.value ?? ''}`.trim();
  if (!raw) return { required: true };

  const value = parseAmount(raw);
  if (value === null) return { nan: true };
  if (value < 0) return { min: true };
  return null;
}
