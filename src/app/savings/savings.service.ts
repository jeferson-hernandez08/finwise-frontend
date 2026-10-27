import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class SavingsService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/savings-goals`;

  getSavingsGoals() {
    return this.http.get<any[]>(this.apiUrl);
  }

  getSavingsGoal(id: string) {
    return this.http.get<any>(`${this.apiUrl}/${id}`);
  }

  createSavingsGoal(data: any) {
    return this.http.post<any>(this.apiUrl, data);
  }

  updateSavingsGoal(id: string, data: any) {
    return this.http.patch<any>(`${this.apiUrl}/${id}`, data);
  }

  deleteSavingsGoal(id: string) {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  // --- CONTRIBUCIONES (Aportes) ---
  // Obtener aportes de una meta específica
  getContributions(goalId: string) {
    return this.http.get<any[]>(`${environment.apiUrl}/savings-contributions/goal/${goalId}`);
  }

  // Crear un nuevo aporte
  createContribution(data: any) {
    return this.http.post<any>(`${environment.apiUrl}/savings-contributions`, data);
  }

  // Eliminar un aporte
  deleteContribution(id: string) {
    return this.http.delete(`${environment.apiUrl}/savings-contributions/${id}`);
  }

  // Editar nota del aporte
  // Obtener un aporte por ID (necesario para llenar el formulario de edición)
  getContribution(id: string) {
    return this.http.get<any>(`${environment.apiUrl}/savings-contributions/${id}`);
  }

  // Actualizar un aporte (El backend solo permite cambiar la nota)
  updateContribution(id: string, data: any) {
    return this.http.patch<any>(`${environment.apiUrl}/savings-contributions/${id}`, data);
  }
  
}