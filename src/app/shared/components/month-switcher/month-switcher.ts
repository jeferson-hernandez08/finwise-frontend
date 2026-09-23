import { Component, inject } from '@angular/core';
import { MONTH_NAMES, PeriodService } from '../../services/period.service';

/**
 * Selector de mes. Al cambiarlo se actualiza `PeriodService`, del que leen
 * el dashboard y las listas de gastos e ingresos.
 *
 * No permite avanzar más allá del mes actual: registrar el futuro no aporta
 * nada y confunde el cálculo del saldo.
 */
@Component({
  selector: 'app-month-switcher',
  standalone: true,
  template: `
    <div class="switcher">
      <button
        type="button"
        class="arrow"
        (click)="period.previous()"
        aria-label="Mes anterior"
      >
        ‹
      </button>

      <div class="center">
        <select
          class="month-select"
          [value]="period.month()"
          (change)="onMonthChange($event)"
          aria-label="Mes"
        >
          @for (name of months; track $index) {
            <option [value]="$index + 1">{{ name }}</option>
          }
        </select>
        <select
          class="year-select"
          [value]="period.year()"
          (change)="onYearChange($event)"
          aria-label="Año"
        >
          @for (y of years; track y) {
            <option [value]="y">{{ y }}</option>
          }
        </select>
      </div>

      <button
        type="button"
        class="arrow"
        (click)="period.next()"
        [disabled]="period.isCurrentMonth() || period.isFuture()"
        aria-label="Mes siguiente"
      >
        ›
      </button>
    </div>

    @if (!period.isCurrentMonth()) {
      <button type="button" class="today-link" (click)="period.goToCurrentMonth()">
        Volver al mes actual
      </button>
    }
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .switcher {
        display: flex;
        align-items: center;
        gap: 8px;
        background: var(--fw-surface);
        border-radius: var(--fw-radius-pill);
        box-shadow: var(--fw-shadow);
        padding: 5px;
      }

      .arrow {
        flex: 0 0 auto;
        width: 38px;
        height: 38px;
        border: none;
        border-radius: 50%;
        background: var(--fw-surface-alt);
        color: var(--fw-text);
        font-size: 22px;
        line-height: 1;
        cursor: pointer;
      }

      .arrow:disabled {
        opacity: 0.35;
        cursor: not-allowed;
      }

      .center {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 4px;
        min-width: 0;
      }

      /* Selects sin apariencia nativa: se integran con la píldora. */
      .month-select,
      .year-select {
        border: none;
        background: transparent;
        font-family: inherit;
        font-size: 15px;
        font-weight: 700;
        color: var(--fw-text);
        text-align: center;
        cursor: pointer;
        padding: 4px 2px;
        appearance: none;
        -webkit-appearance: none;
      }

      .month-select:focus,
      .year-select:focus {
        outline: 2px solid var(--fw-primary-light);
        border-radius: 6px;
      }

      .today-link {
        display: block;
        margin: 8px auto 0;
        border: none;
        background: transparent;
        color: var(--fw-primary);
        font-family: inherit;
        font-size: 12.5px;
        font-weight: 600;
        cursor: pointer;
      }
    `,
  ],
})
export class MonthSwitcher {
  readonly period = inject(PeriodService);
  readonly months = MONTH_NAMES;

  /** Rango de años seleccionables: cuatro atrás y el actual. */
  readonly years: number[] = (() => {
    const current = new Date().getFullYear();
    return [current - 4, current - 3, current - 2, current - 1, current];
  })();

  onMonthChange(event: Event) {
    const month = +(event.target as HTMLSelectElement).value;
    this.period.set(this.period.year(), month);
    this.clampToPresent();
  }

  onYearChange(event: Event) {
    const year = +(event.target as HTMLSelectElement).value;
    this.period.set(year, this.period.month());
    this.clampToPresent();
  }

  /** Si la combinación elegida cae en el futuro, se vuelve al mes actual. */
  private clampToPresent() {
    if (this.period.isFuture()) {
      this.period.goToCurrentMonth();
    }
  }
}
