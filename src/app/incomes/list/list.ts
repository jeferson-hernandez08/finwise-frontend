import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { MonthSwitcher } from '../../shared/components/month-switcher/month-switcher';
import { MoneyPipe } from '../../shared/pipes/money.pipe';
import { ConfirmService } from '../../shared/services/confirm.service';
import { IncomesService } from '../../shared/services/incomes.service';
import {
  MONTH_NAMES,
  MONTH_NAMES_SHORT,
  PeriodService,
} from '../../shared/services/period.service';
import { ToastService, errorMessage } from '../../shared/services/toast.service';
import { MonthlyIncome } from '../../shared/models';

/** Fila del historial con la variación ya resuelta, para no calcular en la plantilla. */
interface IncomeRow {
  income: MonthlyIncome;
  monthName: string;
  monthShort: string;
  changeLabel: string | null;
  changeTone: 'up' | 'down' | 'flat' | null;
  changeTitle: string | null;
}

/** Bloque del historial: un año con sus meses y el total acumulado. */
interface YearGroup {
  year: number;
  total: number;
  rows: IncomeRow[];
}

@Component({
  selector: 'app-incomes-list',
  standalone: true,
  imports: [RouterLink, MonthSwitcher, MoneyPipe],
  templateUrl: './list.html',
  styleUrl: './list.css',
})
export class IncomesList {
  private api = inject(IncomesService);
  private toast = inject(ToastService);
  private confirm = inject(ConfirmService);
  private destroyRef = inject(DestroyRef);
  readonly period = inject(PeriodService);

  readonly incomes = signal<MonthlyIncome[]>([]);
  readonly loading = signal(true);
  readonly deletingId = signal<string | null>(null);

  /** Placeholders mientras carga el historial. */
  readonly skeletons = [1, 2, 3, 4];

  /** Nombre del mes del periodo, para los textos de la tarjeta destacada. */
  readonly monthName = computed(() => MONTH_NAMES[this.period.month() - 1]);

  /** Ingreso del mes seleccionado en la cabecera, si ya está registrado. */
  readonly currentIncome = computed(
    () =>
      this.incomes().find(
        i => i.year === this.period.year() && i.month === this.period.month(),
      ) ?? null,
  );

  readonly average = computed(() => {
    const list = this.incomes();
    if (!list.length) return 0;
    return list.reduce((sum, i) => sum + i.amount, 0) / list.length;
  });

  private readonly incomesOfYear = computed(() =>
    this.incomes().filter(i => i.year === this.period.year()),
  );

  readonly yearTotal = computed(() =>
    this.incomesOfYear().reduce((sum, i) => sum + i.amount, 0),
  );

  readonly yearCount = computed(() => this.incomesOfYear().length);

  /**
   * Historial agrupado por año, de lo más reciente a lo más antiguo.
   * La variación se mide contra el mes registrado inmediatamente anterior,
   * así que se recorre primero en orden cronológico.
   */
  readonly groups = computed<YearGroup[]>(() => {
    const chronological = [...this.incomes()].sort(
      (a, b) => a.year - b.year || a.month - b.month,
    );

    const rows = chronological.map((income, index) =>
      this.toRow(income, index > 0 ? chronological[index - 1] : null),
    );

    const byYear = new Map<number, IncomeRow[]>();
    for (const row of rows) {
      const list = byYear.get(row.income.year);
      if (list) {
        list.push(row);
      } else {
        byYear.set(row.income.year, [row]);
      }
    }

    return [...byYear.entries()]
      .map(([year, list]) => ({
        year,
        total: list.reduce((sum, row) => sum + row.income.amount, 0),
        // Dentro del año, el mes más reciente primero.
        rows: [...list].reverse(),
      }))
      .sort((a, b) => b.year - a.year);
  });

  constructor() {
    this.load();
  }

  async remove(row: IncomeRow) {
    if (this.deletingId()) return;

    const label = `${row.monthName} ${row.income.year}`;
    const confirmed = await this.confirm.ask({
      title: 'Eliminar ingreso',
      message:
        `Se borrará el ingreso de ${label}. Ese mes quedará sin sueldo ` +
        'registrado y su saldo se calculará como si no hubieras recibido nada.',
      confirmLabel: 'Eliminar',
    });
    if (!confirmed) return;

    const id = row.income._id;
    this.deletingId.set(id);
    this.api.remove(id).subscribe({
      next: () => {
        this.deletingId.set(null);
        this.incomes.update(list => list.filter(i => i._id !== id));
        this.toast.success('Ingreso eliminado');
      },
      error: (err: unknown) => {
        this.deletingId.set(null);
        this.toast.error(errorMessage(err, 'No se pudo eliminar el ingreso'));
      },
    });
  }

  private load() {
    this.loading.set(true);
    // Si el usuario se va antes de que responda el backend, la consulta se
    // cancela: si no, un error tardío saca un aviso en la pantalla siguiente.
    this.api.findAll().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: list => {
        this.incomes.set(list ?? []);
        this.loading.set(false);
      },
      error: (err: unknown) => {
        this.incomes.set([]);
        this.loading.set(false);
        this.toast.error(errorMessage(err, 'No se pudo cargar el historial de ingresos'));
      },
    });
  }

  private toRow(income: MonthlyIncome, previous: MonthlyIncome | null): IncomeRow {
    const monthName = MONTH_NAMES[income.month - 1] ?? '';
    const row: IncomeRow = {
      income,
      monthName,
      monthShort: MONTH_NAMES_SHORT[income.month - 1] ?? '',
      changeLabel: null,
      changeTone: null,
      changeTitle: null,
    };

    // Sin mes previo (o con sueldo cero) el porcentaje no significa nada.
    if (!previous || previous.amount <= 0) return row;

    const change = Math.round(
      ((income.amount - previous.amount) / previous.amount) * 100,
    );
    const previousLabel = `${MONTH_NAMES[previous.month - 1]} ${previous.year}`;

    if (change === 0) {
      row.changeLabel = 'Igual';
      row.changeTone = 'flat';
    } else {
      row.changeLabel = `${change > 0 ? '+' : ''}${change}%`;
      row.changeTone = change > 0 ? 'up' : 'down';
    }
    row.changeTitle = `Frente a ${previousLabel}`;

    return row;
  }
}
