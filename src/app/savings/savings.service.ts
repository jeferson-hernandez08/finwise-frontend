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
}