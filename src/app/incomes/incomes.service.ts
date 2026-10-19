import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class IncomesService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/monthly-incomes`;

  // Obtener todos los ingresos del usuario autenticado
  getIncomes() {
    return this.http.get<any[]>(this.apiUrl);
  }

  // Obtener un solo ingreso por su ID
  getIncome(id: string) {
    return this.http.get<any>(`${this.apiUrl}/${id}`);
  }

  // Crear un nuevo ingreso
  createIncome(data: any) {
    return this.http.post<any>(this.apiUrl, data);
  }

  // Actualizar un ingreso existente (Usamos PATCH porque así lo configuraste en NestJS)
  updateIncome(id: string, data: any) {
    return this.http.patch<any>(`${this.apiUrl}/${id}`, data);
  }

  // Eliminar un ingreso
  deleteIncome(id: string) {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}