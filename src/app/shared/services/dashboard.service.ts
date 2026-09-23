import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { DashboardSummary } from '../models';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/dashboard`;

  /**
   * Resumen del mes: ingreso, gastos, saldo, desglose por categoría,
   * evolución de los últimos meses y estado de deudas y ahorros.
   * Todo en una sola petición para que el dashboard cargue de una vez.
   */
  summary(year: number, month: number): Observable<DashboardSummary> {
    const params = new HttpParams().set('year', year).set('month', month);
    return this.http.get<DashboardSummary>(`${this.base}/summary`, { params });
  }
}
