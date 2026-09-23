import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { paletteColor } from '../chart-palette';

/** Un segmento de la dona tal como lo entrega quien usa el componente. */
export interface DonutDatum {
  label: string;
  value: number;
  /** Color explícito; si falta se toma de la paleta categórica. */
  color?: string;
  /** Emoji opcional que acompaña a la etiqueta en la leyenda. */
  icon?: string;
}

interface DonutSegment {
  label: string;
  icon?: string;
  color: string;
  percentLabel: string;
  dashArray: string;
  dashOffset: number;
}

const RADIUS = 44;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
/** Separación entre segmentos, en unidades del viewBox. */
const GAP = 2.5;
/** Arco mínimo para que una porción diminuta no desaparezca del todo. */
const MIN_ARC = 1.2;

/**
 * Anillo de proporciones en SVG puro.
 *
 * Los segmentos se dibujan con un único `<circle>` por porción y
 * `stroke-dasharray` / `stroke-dashoffset`: más simple y exacto que componer
 * arcos con `path`, y sin ningún problema de redondeo en las esquinas.
 */
@Component({
  selector: 'app-donut-chart',
  standalone: true,
  templateUrl: './donut-chart.html',
  styleUrl: './donut-chart.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DonutChart {
  readonly data = input<DonutDatum[]>([]);
  readonly centerLabel = input('');
  readonly centerValue = input('');

  readonly radius = RADIUS;

  readonly total = computed(() =>
    this.data().reduce((sum, d) => sum + positive(d.value), 0),
  );

  readonly segments = computed<DonutSegment[]>(() => {
    const total = this.total();
    if (total <= 0) return [];

    const items = this.data().filter(d => positive(d.value) > 0);
    const gap = items.length > 1 ? GAP : 0;

    let offset = 0;
    return items.map((item, index) => {
      const fraction = positive(item.value) / total;
      const length = fraction * CIRCUMFERENCE;
      const drawn = Math.max(length - gap, MIN_ARC);
      const segment: DonutSegment = {
        label: item.label,
        icon: item.icon,
        color: item.color ?? paletteColor(index),
        percentLabel: percentLabel(fraction),
        dashArray: `${round(drawn)} ${round(CIRCUMFERENCE - drawn)}`,
        // El patrón se repite cada `CIRCUMFERENCE`, así que desplazarlo
        // `C - offset` equivale a `-offset` pero sin valores negativos,
        // que SVG 1.1 considera inválidos.
        dashOffset: round(CIRCUMFERENCE - offset),
      };
      offset += length;
      return segment;
    });
  });

  /** Resumen hablado: quien no ve la gráfica escucha las porciones principales. */
  readonly ariaLabel = computed(() => {
    const segments = this.segments();
    if (!segments.length) return 'Gráfica circular sin datos';

    const shown = segments
      .slice(0, 5)
      .map(s => `${s.label} ${s.percentLabel}`)
      .join(', ');
    const rest = segments.length - 5;
    const tail = rest > 0 ? ` y ${rest} categorías más` : '';
    return `Distribución: ${shown}${tail}`;
  });
}

function positive(value: number | null | undefined): number {
  return typeof value === 'number' && isFinite(value) && value > 0 ? value : 0;
}

function percentLabel(fraction: number): string {
  const percent = fraction * 100;
  // Un decimal solo en las porciones pequeñas, donde "0 %" no diría nada.
  const digits = percent < 10 ? 1 : 0;
  return `${percent.toFixed(digits).replace('.', ',')} %`;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
