import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ExpensesService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/expenses`;
  private categoriesUrl = `${environment.apiUrl}/expense-categories`;

  // --- GASTOS ---
  getExpenses() {
    return this.http.get<any[]>(this.apiUrl);
  }

  getExpense(id: string) {
    return this.http.get<any>(`${this.apiUrl}/${id}`);
  }

  createExpense(data: any) {
    return this.http.post<any>(this.apiUrl, data);
  }

  updateExpense(id: string, data: any) {
    return this.http.patch<any>(`${this.apiUrl}/${id}`, data);
  }

  deleteExpense(id: string) {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  // --- CATEGORÍAS ---
  getCategories() {
    return this.http.get<any[]>(this.categoriesUrl);
  }
}