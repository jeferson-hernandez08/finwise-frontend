import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';

/** Un grupo del eje X: una barra principal y, si existe, su comparativa. */
export interface BarDatum {
  label: string;
  value: number;
  secondaryValue?: number;
}

interface Bar {
  /** 0 = serie principal, 1 = serie secundaria. */
  series: 0 | 1;
  path: string;
  color: string;
  top: number;
  centerX: number;
  /** Zona sensible al toque: más ancha y alta que la barra. */
  hitX: number;
  hitWidth: number;
  text: string;
  aria: string;
}

interface BarGroup {
  label: string;
  short: string;
  centerX: number;
  bars: Bar[];
}

const W = 320;
const H = 168;
const PAD_TOP = 26;
const PAD_BOTTOM = 26;
const PAD_X = 6;
const BASELINE = H - PAD_BOTTOM;
const PLOT_HEIGHT = BASELINE - PAD_TOP;
/** Separación entre la barra principal y la secundaria del mismo grupo. */
const BAR_GAP = 2;
/** Altura mínima visible: un valor pequeño no debe desaparecer. */
const MIN_BAR = 2;

/**
 * Barras verticales agrupadas en SVG puro.
 *
 * Las dos series comparten escala (son montos en pesos), así que hay un solo
 * eje: nunca dos escalas distintas, que harían comparar peras con manzanas.
 */
@Component({
  selector: 'app-bar-chart',
  standalone: true,
  templateUrl: './bar-chart.html',
  styleUrl: './bar-chart.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BarChart {
  readonly data = input<BarDatum[]>([]);
  readonly primaryColor = input('var(--fw-c4)');
  readonly secondaryColor = input('var(--fw-c1)');
  readonly primaryLabel = input('Gastos');
  readonly secondaryLabel = input('Ingresos');
  readonly emptyMessage = input('Todavía no hay movimientos para comparar.');
  /** Formateador del valor mostrado al tocar una barra. */
  readonly formatValue = input<((value: number) => string) | null>(null);

  readonly width = W;
  readonly height = H;
  readonly baseline = BASELINE;
  readonly guideY = PAD_TOP;
  readonly padX = PAD_X;
  readonly labelY = BASELINE + 14;

  /** Barra resaltada: `[grupo, serie]`. `null` mientras no se toca nada. */
  private readonly selected = signal<[number, 0 | 1] | null>(null);

  readonly hasSecondary = computed(() =>
    this.data().some(d => typeof d.secondaryValue === 'number'),
  );

  readonly max = computed(() => {
    let max = 0;
    for (const item of this.data()) {
      max = Math.max(max, amount(item.value), amount(item.secondaryValue));
    }
    return max;
  });

  readonly groups = computed<BarGroup[]>(() => {
    const data = this.data();
    const max = this.max();
    if (!data.length || max <= 0) return [];

    const dual = this.hasSecondary();
    const slot = (W - PAD_X * 2) / data.length;
    const barWidth = dual
      ? Math.min(16, slot * 0.32)
      : Math.min(28, slot * 0.5);
    const blockWidth = dual ? barWidth * 2 + BAR_GAP : barWidth;

    return data.map((item, index) => {
      const slotStart = PAD_X + index * slot;
      const centerX = slotStart + slot / 2;
      const firstX = centerX - blockWidth / 2;

      const bars: Bar[] = [
        this.buildBar(item.label, amount(item.value), 0, firstX, barWidth, max, {
          hitX: slotStart,
          hitWidth: dual ? slot / 2 : slot,
        }),
      ];

      if (dual) {
        bars.push(
          this.buildBar(
            item.label,
            amount(item.secondaryValue),
            1,
            firstX + barWidth + BAR_GAP,
            barWidth,
            max,
            { hitX: slotStart + slot / 2, hitWidth: slot / 2 },
          ),
        );
      }

      return {
        label: item.label,
        short: abbreviate(item.label, data.length),
        centerX,
        bars,
      };
    });
  });

  /** Etiqueta flotante sobre la barra tocada. */
  readonly callout = computed(() => {
    const current = this.selected();
    if (!current) return null;

    const group = this.groups()[current[0]];
    const bar = group?.bars.find(b => b.series === current[1]);
    if (!bar) return null;

    // Cerca de los bordes la etiqueta se ancla al lado para no salirse.
    const anchor = bar.centerX < 34 ? 'start' : bar.centerX > W - 34 ? 'end' : 'middle';
    const x = anchor === 'start' ? PAD_X : anchor === 'end' ? W - PAD_X : bar.centerX;

    return {
      x,
      y: Math.max(bar.top - 7, 12),
      anchor,
      text: `${group.label}: ${bar.text}`,
    };
  });

  readonly maxLabel = computed(() => this.format(this.max()));

  readonly rotateLabels = computed(() => this.data().length > 6);

  readonly ariaLabel = computed(() => {
    const groups = this.groups();
    if (!groups.length) return 'Gráfica de barras sin datos';

    const series = this.hasSecondary()
      ? `${this.primaryLabel()} e ${this.secondaryLabel()}`
      : this.primaryLabel();
    const detail = groups
      .map(g => `${g.label} ${g.bars.map(b => b.text).join(' y ')}`)
      .join('; ');
    return `${series} por periodo. ${detail}`;
  });

  isSelected(groupIndex: number, series: 0 | 1): boolean {
    const current = this.selected();
    return !!current && current[0] === groupIndex && current[1] === series;
  }

  /** `true` en cuanto hay algo resaltado: el resto de barras se atenúa. */
  hasSelection(): boolean {
    return this.selected() !== null;
  }

  toggle(groupIndex: number, series: 0 | 1) {
    this.selected.update(current =>
      current && current[0] === groupIndex && current[1] === series
        ? null
        : [groupIndex, series],
    );
  }

  private buildBar(
    groupLabel: string,
    value: number,
    series: 0 | 1,
    x: number,
    width: number,
    max: number,
    hit: { hitX: number; hitWidth: number },
  ): Bar {
    const height = value > 0 ? Math.max((value / max) * PLOT_HEIGHT, MIN_BAR) : 0;
    const top = BASELINE - height;
    const text = this.format(value);
    const seriesName = series === 0 ? this.primaryLabel() : this.secondaryLabel();

    return {
      series,
      path: barPath(x, top, width, height),
      color: series === 0 ? this.primaryColor() : this.secondaryColor(),
      top,
      centerX: x + width / 2,
      hitX: hit.hitX,
      hitWidth: hit.hitWidth,
      text,
      aria: `${seriesName} de ${groupLabel}: ${text}`,
    };
  }

  private format(value: number): string {
    const custom = this.formatValue();
    return custom ? custom(value) : abbreviateNumber(value);
  }
}

function amount(value: number | null | undefined): number {
  return typeof value === 'number' && isFinite(value) && value > 0 ? value : 0;
}

/** Rectángulo con las dos esquinas de arriba redondeadas y la base plana. */
function barPath(x: number, y: number, width: number, height: number): string {
  if (height <= 0) return '';
  const r = Math.min(4, width / 2, height);
  const right = x + width;
  const bottom = y + height;
  return [
    `M${round(x)},${round(bottom)}`,
    `V${round(y + r)}`,
    `Q${round(x)},${round(y)} ${round(x + r)},${round(y)}`,
    `H${round(right - r)}`,
    `Q${round(right)},${round(y)} ${round(right)},${round(y + r)}`,
    `V${round(bottom)}`,
    'Z',
  ].join(' ');
}

/** Recorta la etiqueta del eje X cuando hay demasiados grupos para tanto texto. */
function abbreviate(label: string, groupCount: number): string {
  const max = groupCount >= 8 ? 3 : groupCount >= 6 ? 4 : 7;
  return label.length > max ? label.slice(0, max) : label;
}

/** Formato por defecto: "1,2 M". */
function abbreviateNumber(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (abs >= 1_000_000_000) return `${sign}${trim(abs / 1_000_000_000)} MM`;
  if (abs >= 1_000_000) return `${sign}${trim(abs / 1_000_000)} M`;
  if (abs >= 1_000) return `${sign}${trim(abs / 1_000)} K`;
  return `${Math.round(value)}`;
}

function trim(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? `${rounded}` : `${rounded}`.replace('.', ',');
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
