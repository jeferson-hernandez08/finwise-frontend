import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { MonthlyIncome, MonthlyIncomePayload } from '../models';

@Injectable({ providedIn: 'root' })
export class IncomesService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/monthly-incomes`;

  /** Historial completo, ordenado del mes más reciente al más antiguo. */
  findAll(): Observable<MonthlyIncome[]> {
    return this.http.get<MonthlyIncome[]>(this.base);
  }

  /**
   * Ingreso de un mes concreto, o `null` si ese mes aún no tiene ingreso
   * registrado. No tener ingreso es un estado normal, no un error.
   */
  findByPeriod(year: number, month: number): Observable<MonthlyIncome | null> {
    const params = new HttpParams().set('year', year).set('month', month);
    return this.http
      .get<MonthlyIncome | null>(`${this.base}/filter`, { params })
      .pipe(catchError(() => of(null)));
  }

  findOne(id: string): Observable<MonthlyIncome> {
    return this.http.get<MonthlyIncome>(`${this.base}/${id}`);
  }

  create(payload: MonthlyIncomePayload): Observable<MonthlyIncome> {
    return this.http.post<MonthlyIncome>(this.base, payload);
  }

  update(
    id: string,
    payload: Partial<MonthlyIncomePayload>,
  ): Observable<MonthlyIncome> {
    return this.http.patch<MonthlyIncome>(`${this.base}/${id}`, payload);
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
