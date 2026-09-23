import { Component, computed, effect, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { MonthSwitcher } from '../../shared/components/month-switcher/month-switcher';
import { MoneyPipe } from '../../shared/pipes/money.pipe';
import {
  parseLocalDate,
  toDateInputValue,
} from '../../shared/pipes/fecha.pipe';
import {
  MONTH_NAMES,
  PeriodService,
  toISODate,
} from '../../shared/services/period.service';
import { CategoriesService } from '../../shared/services/categories.service';
import { ConfirmService } from '../../shared/services/confirm.service';
import { ExpensesService } from '../../shared/services/expenses.service';
import {
  ToastService,
  errorMessage,
} from '../../shared/services/toast.service';
import { Expense, categoryName, refId } from '../../shared/models';

/** Clave para los gastos cuya categoría fue eliminada o no llegó populada. */
const NO_CATEGORY = 'sin-categoria';

/** Chip de filtro: una categoría presente en los gastos del mes. */
interface CategoryChip {
  id: string;
  label: string;
  icon: string;
  count: number;
}

/** Bloque de un día con su encabezado y subtotal. */
interface DayGroup {
  key: string;
  label: string;
  total: number;
  items: Expense[];
}

@Component({
  selector: 'app-list',
  imports: [MonthSwitcher, MoneyPipe],
  styleUrl: './list.css',
  templateUrl: './list.html',
})
export class List {
  private readonly expensesApi = inject(ExpensesService);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  readonly period = inject(PeriodService);
  readonly categories = inject(CategoriesService);

  readonly expenses = signal<Expense[]>([]);
  readonly loading = signal(true);
  readonly failed = signal(false);
  readonly deletingId = signal<string | null>(null);

  readonly selectedCategory = signal<string | null>(null);
  readonly search = signal('');

  /** Filas del esqueleto de carga; fija para no recrearla en cada ciclo. */
  readonly skeletonRows = [1, 2, 3, 4];

  /** Formatea montos fuera de la plantilla (mensajes de confirmación). */
  private readonly money = new MoneyPipe();

  /**
   * Identifica la petición en curso: al cambiar de mes rápido, una respuesta
   * atrasada no debe pisar la del mes que se está viendo.
   */
  private requestId = 0;

  readonly total = computed(() =>
    this.expenses().reduce((sum, e) => sum + e.amount, 0),
  );

  readonly count = computed(() => this.expenses().length);

  /** Solo las categorías que aparecen en el mes: filtros que siempre dan resultado. */
  readonly chips = computed<CategoryChip[]>(() => {
    const map = new Map<string, CategoryChip>();

    for (const expense of this.expenses()) {
      const id = refId(expense.category_id) ?? NO_CATEGORY;
      const existing = map.get(id);
      if (existing) {
        existing.count++;
        continue;
      }
      const name = this.categoryNameOf(expense);
      map.set(id, {
        id,
        label: this.categories.label(name),
        icon: this.categories.icon(name),
        count: 1,
      });
    }

    return [...map.values()].sort((a, b) =>
      a.label.localeCompare(b.label, 'es'),
    );
  });

  readonly filtered = computed(() => {
    const category = this.selectedCategory();
    const term = this.search().trim().toLowerCase();
    if (!category && !term) return this.expenses();

    return this.expenses().filter(expense => {
      if (
        category &&
        (refId(expense.category_id) ?? NO_CATEGORY) !== category
      ) {
        return false;
      }
      if (!term) return true;
      const haystack = `${expense.description ?? ''} ${this.categoryLabel(expense)}`;
      return haystack.toLowerCase().includes(term);
    });
  });

  readonly filteredTotal = computed(() =>
    this.filtered().reduce((sum, e) => sum + e.amount, 0),
  );

  readonly isFiltered = computed(
    () => this.selectedCategory() !== null || this.search().trim() !== '',
  );

  /** Gastos agrupados por día, del más reciente al más antiguo. */
  readonly groups = computed<DayGroup[]>(() => {
    const byDay = new Map<string, Expense[]>();

    for (const expense of this.filtered()) {
      const key = toDateInputValue(expense.date);
      const bucket = byDay.get(key);
      if (bucket) bucket.push(expense);
      else byDay.set(key, [expense]);
    }

    return [...byDay.entries()]
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([key, items]) => ({
        key,
        label: this.dayLabel(key),
        total: items.reduce((sum, e) => sum + e.amount, 0),
        items: [...items].sort(compareByRecency),
      }));
  });

  constructor() {
    // Recarga sola cada vez que cambia el mes en la cabecera.
    effect(() => {
      const year = this.period.year();
      const month = this.period.month();
      this.load(year, month);
    });

    // Necesarias para resolver el nombre cuando el backend devuelve
    // `category_id` como id suelto en vez de populado.
    this.categories.findAll().subscribe({
      error: () => {
        // Si falla, los gastos con la categoría populada se siguen viendo bien.
      },
    });
  }

  // ---- Datos --------------------------------------------------------------

  private load(year: number, month: number) {
    const id = ++this.requestId;
    this.loading.set(true);
    this.failed.set(false);

    this.expensesApi.findByPeriod(year, month).subscribe({
      next: list => {
        if (id !== this.requestId) return;
        this.expenses.set(list);
        this.loading.set(false);
        // Un filtro de categoría que ya no existe en el mes dejaría la lista vacía.
        const selected = this.selectedCategory();
        if (selected && !this.chips().some(c => c.id === selected)) {
          this.selectedCategory.set(null);
        }
      },
      error: err => {
        if (id !== this.requestId) return;
        this.expenses.set([]);
        this.loading.set(false);
        this.failed.set(true);
        this.toast.error(errorMessage(err, 'No se pudieron cargar los gastos'));
      },
    });
  }

  reload() {
    this.load(this.period.year(), this.period.month());
  }

  // ---- Acciones -----------------------------------------------------------

  selectCategory(id: string | null) {
    this.selectedCategory.set(id);
  }

  onSearch(event: Event) {
    this.search.set((event.target as HTMLInputElement).value);
  }

  clearFilters() {
    this.selectedCategory.set(null);
    this.search.set('');
  }

  open(expense: Expense) {
    this.router.navigate(['/expenses/edit', expense._id]);
  }

  goToNew() {
    this.router.navigate(['/expenses/new']);
  }

  async onDelete(expense: Expense, event: Event) {
    // El item entero navega al detalle: el botón de borrar no debe propagarse.
    event.stopPropagation();

    const isDebtPayment = this.isDebtPayment(expense);
    const ok = await this.confirm.ask({
      title: 'Eliminar gasto',
      message: isDebtPayment
        ? `Se eliminará el gasto de ${this.money.transform(expense.amount)} y el monto volverá al saldo de la deuda.`
        : `¿Eliminar el gasto de ${this.money.transform(expense.amount)}? Esta acción no se puede deshacer.`,
      confirmLabel: 'Eliminar',
      danger: true,
    });
    if (!ok) return;

    this.deletingId.set(expense._id);
    this.expensesApi.remove(expense._id).subscribe({
      next: () => {
        this.deletingId.set(null);
        this.toast.success('Gasto eliminado');
        this.reload();
      },
      error: err => {
        this.deletingId.set(null);
        this.toast.error(errorMessage(err, 'No se pudo eliminar el gasto'));
      },
    });
  }

  // ---- Presentación -------------------------------------------------------

  /** Título del item: la descripción o, si no la hay, la categoría. */
  title(expense: Expense): string {
    return expense.description?.trim() || this.categoryLabel(expense);
  }

  categoryLabel(expense: Expense): string {
    return this.categories.label(this.categoryNameOf(expense));
  }

  categoryIcon(expense: Expense): string {
    return this.categories.icon(this.categoryNameOf(expense));
  }

  /**
   * Nombre de la categoría del gasto. Normalmente llega populada, pero si el
   * backend devuelve solo el id se busca en las categorías ya cargadas: de lo
   * contrario toda la lista mostraría "Sin categoría".
   */
  private categoryNameOf(expense: Expense): string {
    const value = expense.category_id;
    if (value && typeof value === 'object') return categoryName(value);

    const match = this.categories.categories().find(c => c._id === value);
    return match ? match.name : '';
  }

  isDebtPayment(expense: Expense): boolean {
    return refId(expense.debt_id) !== null;
  }

  /** "Hoy", "Ayer" o "5 de marzo". */
  private dayLabel(key: string): string {
    const today = new Date();
    if (key === toISODate(today)) return 'Hoy';

    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    if (key === toISODate(yesterday)) return 'Ayer';

    const date = parseLocalDate(key);
    if (!date) return 'Sin fecha';
    return `${date.getDate()} de ${MONTH_NAMES[date.getMonth()].toLowerCase()}`;
  }
}

/** Dentro de un día, primero lo registrado más recientemente. */
function compareByRecency(a: Expense, b: Expense): number {
  if (a.created_at && b.created_at)
    return b.created_at.localeCompare(a.created_at);
  return b.amount - a.amount;
}
