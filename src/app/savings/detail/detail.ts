import {
  Component,
  ElementRef,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { Location } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';

import { MoneyPipe } from '../../shared/pipes/money.pipe';
import { FechaPipe } from '../../shared/pipes/fecha.pipe';
import { toISODate } from '../../shared/services/period.service';
import { SavingsService } from '../../shared/services/savings.service';
import { ConfirmService } from '../../shared/services/confirm.service';
import { ToastService, errorMessage } from '../../shared/services/toast.service';
import { SavingsContribution, SavingsGoal } from '../../shared/models';
import { buildGoalView, deadlineLabel } from '../goal-utils';

/** Detalle de una meta: progreso, registro de aportes e historial. */
@Component({
  selector: 'app-savings-detail',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule, MoneyPipe, FechaPipe],
  templateUrl: './detail.html',
  styleUrl: './detail.css',
})
export class Detail {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly fb = inject(FormBuilder);
  private readonly savings = inject(SavingsService);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);

  /** Para componer mensajes de confirmación con el monto ya formateado. */
  private readonly money = new MoneyPipe();

  private readonly amountInput =
    viewChild<ElementRef<HTMLInputElement>>('amountInput');

  readonly id = this.route.snapshot.paramMap.get('id') ?? '';

  readonly goal = signal<SavingsGoal | null>(null);
  readonly contributions = signal<SavingsContribution[]>([]);
  readonly loading = signal(true);
  readonly loadingContributions = signal(true);
  readonly notFound = signal<string | null>(null);
  readonly saving = signal(false);
  readonly deletingId = signal<string | null>(null);
  readonly skeletons = [1, 2, 3];

  readonly view = computed(() => {
    const goal = this.goal();
    return goal ? buildGoalView(goal) : null;
  });

  readonly completed = computed(() => this.view()?.completed ?? false);

  readonly plazo = computed(() => {
    const view = this.view();
    return view ? deadlineLabel(view) : null;
  });

  readonly form = this.fb.group({
    amount: this.fb.control<number | null>(null, {
      validators: [
        Validators.required,
        Validators.min(1),
        control => this.overRemaining(control),
      ],
    }),
    date: this.fb.nonNullable.control(toISODate(new Date()), [
      Validators.required,
    ]),
    note: this.fb.nonNullable.control('', [Validators.maxLength(120)]),
  });

  constructor() {
    if (this.id) {
      this.loadGoal(true);
      this.loadContributions();
    } else {
      this.loading.set(false);
      this.loadingContributions.set(false);
      this.notFound.set('No encontramos esta meta de ahorro');
    }
  }

  get amount() {
    return this.form.controls.amount;
  }

  get date() {
    return this.form.controls.date;
  }

  /** Un error solo se muestra cuando el usuario ya tocó el campo. */
  invalid(control: AbstractControl): boolean {
    return control.invalid && (control.touched || control.dirty);
  }

  amountError(): string {
    const control = this.amount;
    if (control.hasError('required')) return 'Escribe cuánto vas a aportar';
    if (control.hasError('min')) return 'El aporte debe ser mayor que cero';
    const over = control.getError('overRemaining') as { remaining: number } | null;
    if (over) {
      return `El aporte supera la meta: solo te faltan ${this.money.transform(over.remaining)}`;
    }
    return 'Revisa este campo';
  }

  // ---- Acciones -----------------------------------------------------------

  submit() {
    const goal = this.goal();
    if (!goal || this.saving() || this.completed()) return;

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const note = raw.note.trim();

    this.saving.set(true);
    this.savings
      .addContribution({
        savings_goal_id: goal._id,
        amount: Number(raw.amount),
        date: raw.date,
        note: note || undefined,
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.toast.success('Aporte registrado');
          this.resetForm();
          // El backend recalcula el acumulado, así que se vuelve a pedir todo.
          this.loadGoal(false);
          this.loadContributions();
        },
        error: err => {
          this.saving.set(false);
          this.toast.error(errorMessage(err, 'No se pudo registrar el aporte'));
        },
      });
  }

  async removeContribution(contribution: SavingsContribution) {
    const ok = await this.confirm.ask({
      title: 'Eliminar aporte',
      message: `Se eliminará el aporte de ${this.money.transform(contribution.amount)} y ese importe se restará de lo que llevas ahorrado.`,
      confirmLabel: 'Eliminar',
      danger: true,
    });
    if (!ok) return;

    this.deletingId.set(contribution._id);
    this.savings.removeContribution(contribution._id).subscribe({
      next: () => {
        this.deletingId.set(null);
        this.toast.success('Aporte eliminado');
        this.loadGoal(false);
        this.loadContributions();
      },
      error: err => {
        this.deletingId.set(null);
        this.toast.error(errorMessage(err, 'No se pudo eliminar el aporte'));
      },
    });
  }

  back() {
    // Si se llegó por enlace directo no hay a dónde volver: se va a la lista.
    if (window.history.length > 1) this.location.back();
    else this.router.navigate(['/savings']);
  }

  // ---- Carga --------------------------------------------------------------

  private loadGoal(focusAfterLoad: boolean) {
    this.loading.set(true);
    this.savings.findOne(this.id).subscribe({
      next: goal => {
        this.goal.set(goal);
        this.loading.set(false);
        // El tope del aporte depende del acumulado, que acaba de cambiar.
        this.amount.updateValueAndValidity({ emitEvent: false });
        if (focusAfterLoad) this.focusAmountIfRequested();
      },
      error: err => {
        this.loading.set(false);
        const message = errorMessage(err, 'No encontramos esta meta de ahorro');
        // Si ya había datos en pantalla esto es una recarga tras un aporte:
        // sustituirlo todo por el panel de error borraría el historial recién
        // guardado, así que basta con avisar.
        if (this.goal()) this.toast.error(message);
        else this.notFound.set(message);
      },
    });
  }

  private loadContributions() {
    this.loadingContributions.set(true);
    this.savings.findContributions(this.id).subscribe({
      next: list => {
        this.contributions.set([...list].sort(byDateDesc));
        this.loadingContributions.set(false);
      },
      error: err => {
        this.loadingContributions.set(false);
        this.toast.error(errorMessage(err, 'No se pudo cargar el historial'));
      },
    });
  }

  private resetForm() {
    this.form.reset({
      amount: null,
      date: toISODate(new Date()),
      note: '',
    });
  }

  /** El aporte no puede pasarse de la meta: el backend lo rechaza con 409. */
  private overRemaining(control: AbstractControl): ValidationErrors | null {
    const value = Number(control.value);
    const view = this.view();
    if (!view || !Number.isFinite(value) || value <= 0) return null;
    return value > view.remaining
      ? { overRemaining: { remaining: view.remaining } }
      : null;
  }

  /**
   * Se llega aquí desde el botón "Aportar" de la lista (`?aportar=1`): el campo
   * del monto se enfoca solo, pero hay que esperar a que la plantilla lo pinte.
   */
  private focusAmountIfRequested() {
    if (!this.route.snapshot.queryParamMap.has('aportar') || this.completed()) {
      return;
    }
    setTimeout(() => this.amountInput()?.nativeElement.focus());
  }
}

/** Lo más reciente primero: es lo que el usuario acaba de registrar. */
function byDateDesc(a: SavingsContribution, b: SavingsContribution): number {
  return b.date.localeCompare(a.date);
}
