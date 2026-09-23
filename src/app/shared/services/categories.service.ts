import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ExpenseCategory } from '../models';

/** Icono y traducción al español de cada categoría sembrada por el backend. */
const CATEGORY_META: Record<string, { label: string; icon: string }> = {
  Food: { label: 'Alimentación', icon: '🍽️' },
  Housing: { label: 'Vivienda', icon: '🏠' },
  Transportation: { label: 'Transporte', icon: '🚌' },
  Health: { label: 'Salud', icon: '💊' },
  Education: { label: 'Educación', icon: '📚' },
  Entertainment: { label: 'Entretenimiento', icon: '🎬' },
  Debts: { label: 'Deudas', icon: '💳' },
  Savings: { label: 'Ahorro', icon: '🐷' },
  Others: { label: 'Otros', icon: '📦' },
};

@Injectable({ providedIn: 'root' })
export class CategoriesService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/expense-categories`;

  /** Las categorías son fijas: se cachean tras la primera petición. */
  private cache: ExpenseCategory[] | null = null;

  readonly categories = signal<ExpenseCategory[]>([]);

  findAll(): Observable<ExpenseCategory[]> {
    if (this.cache) return of(this.cache);
    return this.http.get<ExpenseCategory[]>(this.base).pipe(
      tap(list => {
        this.cache = list;
        this.categories.set(list);
      }),
    );
  }

  /** Nombre en español; si es una categoría propia, devuelve su nombre tal cual. */
  label(name: string | undefined | null): string {
    if (!name) return 'Sin categoría';
    return CATEGORY_META[name]?.label ?? name;
  }

  /** Emoji representativo; genérico para categorías que no son de la semilla. */
  icon(name: string | undefined | null): string {
    if (!name) return '📦';
    return CATEGORY_META[name]?.icon ?? '🏷️';
  }

  /** Busca el id de la categoría "Debts", usada al registrar pagos de deuda. */
  findIdByName(name: string): string | null {
    return this.categories().find(c => c.name === name)?._id ?? null;
  }
}
