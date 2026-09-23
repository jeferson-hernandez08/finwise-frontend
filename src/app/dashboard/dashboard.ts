import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';

import { DashboardSummary, categoryName } from '../shared/models';
import { AuthService } from '../shared/services/auth.service';
import { CategoriesService } from '../shared/services/categories.service';
import { DashboardService } from '../shared/services/dashboard.service';
import { MONTH_NAMES_SHORT, PeriodService } from '../shared/services/period.service';
import { ToastService, errorMessage } from '../shared/services/toast.service';
import { MoneyPipe } from '../shared/pipes/money.pipe';
import { FechaPipe } from '../shared/pipes/fecha.pipe';
import { MonthSwitcher } from '../shared/components/month-switcher/month-switcher';
import { BarChart, BarDatum } from '../shared/components/charts/bar-chart/bar-chart';
import {
  DonutChart,
  DonutDatum,
} from '../shared/components/charts/donut-chart/donut-chart';
import { ProgressRing } from '../shared/components/charts/progress-ring/progress-ring';
import { paletteColor } from '../shared/components/charts/chart-palette';

/** Tono del consejo: decide el color del aviso. */
type Tono = 'info' | 'exito' | 'alerta';

interface Consejo {
  texto: string;
  tono: Tono;
}

interface TopExpenseRow {
  id: string;
  icon: string;
  title: string;
  date: string;
  amount: number;
}

/** Categorías que caben en la dona antes de agrupar el resto. */
const MAX_DONUT_SLICES = 8;

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    RouterLink,
    MoneyPipe,
    FechaPipe,
    MonthSwitcher,
    DonutChart,
    BarChart,
    ProgressRing,
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Dashboard {
  private readonly api = inject(DashboardService);
  private readonly categories = inject(CategoriesService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  readonly auth = inject(AuthService);
  readonly period = inject(PeriodService);

  readonly summary = signal<DashboardSummary | null>(null);
  readonly loading = signal(true);
  readonly failed = signal(false);

  /** Petición en curso: se cancela al cambiar de mes para no pisar la nueva. */
  private request: Subscription | null = null;

  /** Formateador reutilizable para los textos que no pasan por la plantilla. */
  private readonly money = new MoneyPipe();

  constructor() {
    // Las categorías vienen cacheadas: se piden una vez para traducir e iconizar.
    // Si fallan no se avisa: la traducción es un mapa local y el resumen sigue
    // mostrándose; un segundo aviso solo taparía el error que sí importa.
    this.categories
      .findAll()
      .pipe(takeUntilDestroyed())
      .subscribe({ error: () => undefined });

    // Un solo efecto para los dos signals del periodo: cambiarlos a la vez
    // (año y mes) dispara una única ejecución, no dos peticiones.
    effect(() => {
      this.load(this.period.year(), this.period.month());
    });

    this.destroyRef.onDestroy(() => this.request?.unsubscribe());
  }

  reintentar() {
    this.load(this.period.year(), this.period.month());
  }

  /** Recorta a 0-100 lo que venga del backend antes de pintar una barra. */
  pct(value: number | null | undefined): number {
    if (typeof value !== 'number' || !isFinite(value)) return 0;
    return Math.min(100, Math.max(0, value));
  }

  /** Formato compacto para las etiquetas de la gráfica de barras. */
  readonly formatCompact = (value: number): string =>
    this.money.transform(value, 'compact');

  readonly donutData = computed<DonutDatum[]>(() => {
    const summary = this.summary();
    if (!summary) return [];

    const sorted = (summary.by_category ?? [])
      .filter(item => item.total > 0)
      .sort((a, b) => b.total - a.total);

    const slices: DonutDatum[] = sorted
      .slice(0, MAX_DONUT_SLICES)
      .map((item, index) => ({
        label: this.categories.label(item.category_name),
        value: item.total,
        icon: this.categories.icon(item.category_name),
        color: paletteColor(index),
      }));

    // El resto se agrupa en vez de repetir colores: dos porciones iguales
    // en la dona serían imposibles de distinguir.
    const rest = sorted.slice(MAX_DONUT_SLICES);
    if (rest.length) {
      slices.push({
        label: `Otras (${rest.length})`,
        value: rest.reduce((sum, item) => sum + item.total, 0),
        icon: '📦',
        color: 'var(--fw-c9)',
      });
    }

    return slices;
  });

  readonly trendData = computed<BarDatum[]>(() =>
    (this.summary()?.trend ?? []).map(point => ({
      label: MONTH_NAMES_SHORT[point.month - 1] ?? `${point.month}`,
      value: point.expenses,
      secondaryValue: point.income,
    })),
  );

  readonly topExpenses = computed<TopExpenseRow[]>(() =>
    (this.summary()?.top_expenses ?? []).map(expense => {
      const raw = expense.category_id;
      // La categoría llega populada al listar, pero puede venir como id suelto.
      const name = typeof raw === 'object' && raw ? categoryName(raw) : null;
      return {
        id: expense._id,
        icon: this.categories.icon(name),
        title: expense.description?.trim() || this.categories.label(name),
        date: expense.date,
        amount: expense.amount,
      };
    }),
  );

  /** Consejo corto calculado en el cliente a partir del resumen del mes. */
  readonly consejo = computed<Consejo | null>(() => {
    const s = this.summary();
    if (!s) return null;

    const mes = this.period.label().toLowerCase();

    if (s.expense_count === 0 && s.income === 0) {
      return {
        texto: `Todavía no hay movimientos en ${mes}. Empieza registrando tu sueldo del mes.`,
        tono: 'info',
      };
    }

    if (s.expense_count === 0) {
      return {
        texto: `Aún no registras gastos en ${mes}. Anota el primero y verás en qué se va tu dinero.`,
        tono: 'info',
      };
    }

    if (s.balance < 0) {
      return {
        texto: `Este mes gastaste ${this.money.transform(Math.abs(s.balance))} más de lo que ingresaste. Revisa tus gastos más altos.`,
        tono: 'alerta',
      };
    }

    if (s.spent_percentage > 80) {
      return {
        texto: `Llevas el ${Math.round(s.spent_percentage)}% de tu sueldo gastado; te quedan ${this.money.transform(s.balance)} para el resto del mes.`,
        tono: 'alerta',
      };
    }

    if (s.savings.saved_this_month > 0) {
      return {
        texto: `Bien hecho: este mes apartaste ${this.money.transform(s.savings.saved_this_month)} para tus metas de ahorro.`,
        tono: 'exito',
      };
    }

    if (s.income > 0 && s.spent_percentage <= 50) {
      return {
        texto: `Vas con el ${Math.round(s.spent_percentage)}% del sueldo gastado. Buen ritmo: te quedan ${this.money.transform(s.balance)}.`,
        tono: 'exito',
      };
    }

    return {
      texto: `Te quedan ${this.money.transform(s.balance)} disponibles en ${mes}.`,
      tono: 'info',
    };
  });

  private load(year: number, month: number) {
    this.request?.unsubscribe();
    this.loading.set(true);
    this.failed.set(false);

    this.request = this.api.summary(year, month).subscribe({
      next: data => {
        this.summary.set(data);
        this.loading.set(false);
      },
      error: err => {
        this.summary.set(null);
        this.failed.set(true);
        this.loading.set(false);
        this.toast.error(errorMessage(err, 'No se pudo cargar tu resumen'));
      },
    });
  }
}
