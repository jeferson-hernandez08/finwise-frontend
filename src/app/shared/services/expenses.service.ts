import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Expense, ExpensePayload } from '../models';

@Injectable({ providedIn: 'root' })
export class ExpensesService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/expenses`;

  /** Todos los gastos del usuario, sin filtrar por fecha. */
  findAll(): Observable<Expense[]> {
    return this.http.get<Expense[]>(this.base);
  }

  /** Gastos de un mes concreto. Si se omite el mes, devuelve el año completo. */
  findByPeriod(year: number, month?: number): Observable<Expense[]> {
    let params = new HttpParams().set('year', year);
    if (month) params = params.set('month', month);
    return this.http.get<Expense[]>(`${this.base}/filter`, { params });
  }

  findOne(id: string): Observable<Expense> {
    return this.http.get<Expense>(`${this.base}/${id}`);
  }

  create(payload: ExpensePayload): Observable<Expense> {
    return this.http.post<Expense>(this.base, clean(payload));
  }

  update(id: string, payload: Partial<ExpensePayload>): Observable<Expense> {
    return this.http.patch<Expense>(`${this.base}/${id}`, clean(payload));
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}

/**
 * El backend corre con `forbidNonWhitelisted`, así que una propiedad con
 * `undefined` o cadena vacía provoca un 400. Se eliminan antes de enviar.
 */
function clean<T extends object>(payload: T): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (value === undefined || value === '') continue;
    out[key] = value;
  }
  return out as Partial<T>;
}
