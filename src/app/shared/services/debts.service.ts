import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Debt, DebtPayload, DebtPayment, DebtPaymentPayload } from '../models';

@Injectable({ providedIn: 'root' })
export class DebtsService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/debts`;
  private paymentsBase = `${environment.apiUrl}/debt-payments`;

  findAll(): Observable<Debt[]> {
    return this.http.get<Debt[]>(this.base);
  }

  findOne(id: string): Observable<Debt> {
    return this.http.get<Debt>(`${this.base}/${id}`);
  }

  create(payload: DebtPayload): Observable<Debt> {
    return this.http.post<Debt>(this.base, clean(payload));
  }

  update(id: string, payload: Partial<DebtPayload>): Observable<Debt> {
    return this.http.patch<Debt>(`${this.base}/${id}`, clean(payload));
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  // ---- Pagos ------------------------------------------------------------

  /** Todos los pagos del usuario, de todas sus deudas. */
  findAllPayments(): Observable<DebtPayment[]> {
    return this.http.get<DebtPayment[]>(this.paymentsBase);
  }

  /** Historial de pagos de una deuda concreta. */
  findPayments(debtId: string): Observable<DebtPayment[]> {
    return this.http.get<DebtPayment[]>(`${this.paymentsBase}/debt/${debtId}`);
  }

  /** Registra un abono. El backend descuenta el saldo restante de la deuda. */
  addPayment(payload: DebtPaymentPayload): Observable<DebtPayment> {
    return this.http.post<DebtPayment>(this.paymentsBase, clean(payload));
  }

  /** Elimina un abono. El backend devuelve el importe al saldo de la deuda. */
  removePayment(id: string): Observable<void> {
    return this.http.delete<void>(`${this.paymentsBase}/${id}`);
  }
}

function clean<T extends object>(payload: T): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (value === undefined || value === '' || value === null) continue;
    out[key] = value;
  }
  return out as Partial<T>;
}
