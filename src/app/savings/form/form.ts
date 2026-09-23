import { Component, inject, signal } from '@angular/core';
import { Location } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';

import { MoneyPipe } from '../../shared/pipes/money.pipe';
import { toDateInputValue } from '../../shared/pipes/fecha.pipe';
import { toISODate } from '../../shared/services/period.service';
import { SavingsService } from '../../shared/services/savings.service';
import { ConfirmService } from '../../shared/services/confirm.service';
import { ToastService, errorMessage } from '../../shared/services/toast.service';
import { SavingsGoalPayload } from '../../shared/models';
import { goalEmoji } from '../goal-utils';

/** Nombres habituales: ahorran escribir en móvil y dan ideas. */
const SUGGESTIONS = ['Moto', 'Casa', 'Viaje', 'Emergencias', 'Estudio'];

@Component({
  selector: 'app-savings-form',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule, MoneyPipe],
  templateUrl: './form.html',
  styleUrl: './form.css',
})
export class Form {
  private readonly fb = inject(FormBuilder);
  private readonly savings = inject(SavingsService);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly location = inject(Location);

  /** `null` en alta; el id de la meta en edición. */
  readonly id = inject(ActivatedRoute).snapshot.paramMap.get('id');
  readonly isEdit = this.id !== null;

  readonly suggestions = SUGGESTIONS;
  readonly today = toISODate(new Date());

  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly deleting = signal(false);
  readonly submitted = signal(false);
  readonly notFound = signal<string | null>(null);
  readonly formError = signal<string | null>(null);
  /** Acumulado actual: solo informativo, en edición no se edita a mano. */
  readonly currentAmount = signal(0);

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(60)]],
    target_amount: [
      null as number | null,
      [Validators.required, Validators.min(1)],
    ],
    current_amount: [
      null as number | null,
      [
        Validators.min(0),
        (control: AbstractControl) => this.overTarget(control),
      ],
    ],
    deadline: ['', (control: AbstractControl) => this.pastDeadline(control)],
  });

  constructor() {
    if (this.isEdit) {
      // En edición el acumulado no se pinta (lo gobiernan los aportes). Si se
      // quedara habilitado, bajar el objetivo por debajo de lo ya ahorrado lo
      // volvería inválido y el guardado se bloquearía sin ningún mensaje
      // visible, porque el campo no está en pantalla.
      this.form.controls.current_amount.disable({ emitEvent: false });
    }

    if (this.id) this.loadGoal(this.id);

    // El tope del "ya ahorrado" depende del objetivo: hay que revalidarlo.
    this.form.controls.target_amount.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(() =>
        this.form.controls.current_amount.updateValueAndValidity({
          emitEvent: false,
        }),
      );
  }

  get name() {
    return this.form.controls.name;
  }

  get target() {
    return this.form.controls.target_amount;
  }

  get current() {
    return this.form.controls.current_amount;
  }

  get deadline() {
    return this.form.controls.deadline;
  }

  /** El emoji se deduce del nombre: se muestra en vivo mientras se escribe. */
  emoji(): string {
    return goalEmoji(this.name.value.trim() || 'meta');
  }

  invalid(control: AbstractControl): boolean {
    return control.invalid && (control.touched || this.submitted());
  }

  // ---- Interacción --------------------------------------------------------

  useSuggestion(value: string) {
    this.name.setValue(value);
    this.name.markAsDirty();
  }

  save() {
    this.submitted.set(true);
    this.formError.set(null);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const deadline = value.deadline ? toDateInputValue(value.deadline) : undefined;

    const payload: SavingsGoalPayload = {
      name: value.name.trim(),
      target_amount: Number(value.target_amount),
      deadline,
    };

    // El acumulado solo se fija al crear: después lo gobiernan los aportes.
    if (!this.isEdit && value.current_amount) {
      payload.current_amount = Number(value.current_amount);
    }

    this.saving.set(true);
    const request = this.id
      ? this.savings.update(this.id, payload)
      : this.savings.create(payload);

    request.subscribe({
      next: goal => {
        this.saving.set(false);
        this.toast.success(this.isEdit ? 'Meta actualizada' : 'Meta creada');
        this.router.navigate(['/savings/detail', goal._id]);
      },
      error: err => {
        this.saving.set(false);
        const message = errorMessage(err, 'No se pudo guardar la meta');
        this.formError.set(message);
        this.toast.error(message);
      },
    });
  }

  async remove() {
    if (!this.id) return;

    const ok = await this.confirm.ask({
      title: 'Eliminar meta',
      message:
        'Se eliminará la meta junto con todo su historial de aportes. Esta acción no se puede deshacer.',
      confirmLabel: 'Eliminar',
      danger: true,
    });
    if (!ok) return;

    this.deleting.set(true);
    this.savings.remove(this.id).subscribe({
      next: () => {
        this.deleting.set(false);
        this.toast.success('Meta eliminada');
        this.router.navigate(['/savings']);
      },
      error: err => {
        this.deleting.set(false);
        const message = errorMessage(err, 'No se pudo eliminar la meta');
        this.formError.set(message);
        this.toast.error(message);
      },
    });
  }

  cancel() {
    // Si se llegó por enlace directo no hay a dónde volver: se va a la lista.
    if (window.history.length > 1) this.location.back();
    else this.router.navigate(['/savings']);
  }

  // ---- Carga --------------------------------------------------------------

  private loadGoal(id: string) {
    this.loading.set(true);
    this.savings.findOne(id).subscribe({
      next: goal => {
        this.currentAmount.set(goal.current_amount);
        this.form.patchValue(
          {
            name: goal.name,
            target_amount: goal.target_amount,
            current_amount: goal.current_amount,
            deadline: toDateInputValue(goal.deadline),
          },
          { emitEvent: false },
        );
        this.loading.set(false);
      },
      error: err => {
        this.loading.set(false);
        this.notFound.set(errorMessage(err, 'No encontramos esta meta'));
      },
    });
  }

  // ---- Validación ---------------------------------------------------------

  /** Lo ya ahorrado no puede pasarse del objetivo. */
  private overTarget(control: AbstractControl): ValidationErrors | null {
    const value = Number(control.value);
    const target = Number(this.form?.controls.target_amount.value);
    if (!control.value || !Number.isFinite(value) || !Number.isFinite(target)) {
      return null;
    }
    return value > target ? { overTarget: true } : null;
  }

  /** Al crear una meta no tiene sentido poner una fecha límite ya pasada. */
  private pastDeadline(control: AbstractControl): ValidationErrors | null {
    if (this.isEdit || !control.value) return null;
    return control.value < this.today ? { pastDeadline: true } : null;
  }

  errorForName(): string {
    if (this.name.hasError('required')) return 'Ponle un nombre a tu meta';
    if (this.name.hasError('maxlength')) return 'Máximo 60 caracteres';
    return 'Revisa este campo';
  }

  errorForTarget(): string {
    if (this.target.hasError('required')) return 'Escribe cuánto quieres reunir';
    if (this.target.hasError('min')) return 'El objetivo debe ser mayor que cero';
    return 'Revisa este campo';
  }

  errorForCurrent(): string {
    if (this.current.hasError('min')) return 'No puede ser un valor negativo';
    if (this.current.hasError('overTarget')) {
      return 'Lo que ya llevas no puede superar el objetivo';
    }
    return 'Revisa este campo';
  }
}
