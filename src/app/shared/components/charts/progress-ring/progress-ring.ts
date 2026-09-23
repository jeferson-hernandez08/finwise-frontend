import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

const RADIUS = 42;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * Anillo de progreso con el porcentaje en el centro.
 *
 * Pasarse del 100 % se pinta entero en rojo: en esta app significa haber
 * gastado más de lo que se ingresó, y eso debe verse de un vistazo.
 */
@Component({
  selector: 'app-progress-ring',
  standalone: true,
  templateUrl: './progress-ring.html',
  styleUrl: './progress-ring.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProgressRing {
  readonly value = input(0);
  readonly size = input(88);
  readonly label = input('');
  readonly color = input('var(--fw-primary)');

  readonly radius = RADIUS;

  private readonly safeValue = computed(() => {
    const value = this.value();
    return typeof value === 'number' && isFinite(value) ? value : 0;
  });

  readonly exceeded = computed(() => this.safeValue() > 100);

  /**
   * A 0 % el arco no se dibuja.
   * Con `stroke-linecap: round` un trazo de longitud cero se pinta como un
   * punto suelto arriba del anillo, que se lee como si hubiera algo gastado.
   */
  readonly hasProgress = computed(() => this.safeValue() > 0);

  readonly strokeColor = computed(() =>
    this.exceeded() ? 'var(--fw-danger)' : this.color(),
  );

  readonly dashArray = computed(() => {
    const percent = this.exceeded()
      ? 100
      : Math.min(100, Math.max(0, this.safeValue()));
    const drawn = (percent / 100) * CIRCUMFERENCE;
    return `${round(drawn)} ${round(CIRCUMFERENCE)}`;
  });

  readonly percentText = computed(() => `${Math.round(this.safeValue())}%`);

  readonly ariaLabel = computed(() => {
    const base = this.label() || 'Progreso';
    return `${base}: ${this.percentText()}`;
  });
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
