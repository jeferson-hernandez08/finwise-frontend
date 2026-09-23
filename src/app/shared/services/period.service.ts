import { Injectable, computed, signal } from '@angular/core';

export const MONTH_NAMES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

export const MONTH_NAMES_SHORT = [
  'Ene',
  'Feb',
  'Mar',
  'Abr',
  'May',
  'Jun',
  'Jul',
  'Ago',
  'Sep',
  'Oct',
  'Nov',
  'Dic',
];

const STORAGE_KEY = 'finwise_period';

/**
 * Mes y año que está viendo el usuario.
 *
 * Toda la aplicación lee de aquí, así que cambiar el mes en la cabecera
 * repercute a la vez en dashboard, gastos e ingresos. La selección se
 * persiste para que recargar la página no devuelva al mes actual.
 */
@Injectable({ providedIn: 'root' })
export class PeriodService {
  private readonly today = new Date();

  readonly year = signal(this.today.getFullYear());
  readonly month = signal(this.today.getMonth() + 1);

  /** Etiqueta larga: "Marzo 2026". */
  readonly label = computed(
    () => `${MONTH_NAMES[this.month() - 1]} ${this.year()}`,
  );

  /** Etiqueta corta para espacios reducidos: "Mar 2026". */
  readonly labelShort = computed(
    () => `${MONTH_NAMES_SHORT[this.month() - 1]} ${this.year()}`,
  );

  /** `true` si el periodo seleccionado es el mes en curso. */
  readonly isCurrentMonth = computed(
    () =>
      this.year() === this.today.getFullYear() &&
      this.month() === this.today.getMonth() + 1,
  );

  /** `true` si el periodo es futuro: no tiene sentido avanzar más allá. */
  readonly isFuture = computed(() => {
    const y = this.year();
    const m = this.month();
    const cy = this.today.getFullYear();
    const cm = this.today.getMonth() + 1;
    return y > cy || (y === cy && m > cm);
  });

  constructor() {
    this.restore();
  }

  set(year: number, month: number) {
    this.year.set(year);
    this.month.set(month);
    this.persist();
  }

  previous() {
    const m = this.month();
    if (m === 1) {
      this.set(this.year() - 1, 12);
    } else {
      this.set(this.year(), m - 1);
    }
  }

  next() {
    const m = this.month();
    if (m === 12) {
      this.set(this.year() + 1, 1);
    } else {
      this.set(this.year(), m + 1);
    }
  }

  goToCurrentMonth() {
    this.set(this.today.getFullYear(), this.today.getMonth() + 1);
  }

  /**
   * Fecha por defecto para un formulario nuevo, en formato `YYYY-MM-DD`.
   * Si el usuario está viendo un mes pasado, propone el día 1 de ese mes en
   * lugar de hoy, para que el registro caiga en el periodo que está mirando.
   */
  defaultDateForForms(): string {
    if (this.isCurrentMonth()) {
      return toISODate(this.today);
    }
    return `${this.year()}-${pad(this.month())}-01`;
  }

  private persist() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ year: this.year(), month: this.month() }),
      );
    } catch {
      /* Modo privado o almacenamiento lleno: seguir sin persistir. */
    }
  }

  private restore() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (
        Number.isInteger(parsed?.year) &&
        Number.isInteger(parsed?.month) &&
        parsed.month >= 1 &&
        parsed.month <= 12
      ) {
        this.year.set(parsed.year);
        this.month.set(parsed.month);
      }
    } catch {
      /* Valor corrupto: se ignora y se queda el mes actual. */
    }
  }
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

/** Convierte un `Date` a `YYYY-MM-DD` usando la hora local, no UTC. */
export function toISODate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
