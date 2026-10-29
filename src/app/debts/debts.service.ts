import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class DebtsService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/debts`;

  getDebts() {
    return this.http.get<any[]>(this.apiUrl);
  }

  getDebt(id: string) {
    return this.http.get<any>(`${this.apiUrl}/${id}`);
  }

  createDebt(data: any) {
    return this.http.post<any>(this.apiUrl, data);
  }

  updateDebt(id: string, data: any) {
    return this.http.patch<any>(`${this.apiUrl}/${id}`, data);
  }

  deleteDebt(id: string) {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  // --- PAGOS DE DEUDAS ---
  // Obtener pagos de una deuda específica
  getDebtPayments(debtId: string) {
    return this.http.get<any[]>(`${environment.apiUrl}/debt-payments/debt/${debtId}`);
  }

  // Crear un nuevo pago
  createDebtPayment(data: any) {
    return this.http.post<any>(`${environment.apiUrl}/debt-payments`, data);
  }

  // Eliminar un pago
  deleteDebtPayment(id: string) {
    return this.http.delete(`${environment.apiUrl}/debt-payments/${id}`);
  }

}