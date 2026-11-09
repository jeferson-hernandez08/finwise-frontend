import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { forkJoin } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  // forkJoin nos permite hacer múltiples peticiones HTTP a la vez y esperar a que todas terminen
  getDashboardData() {
    return forkJoin({
      incomes: this.http.get<any[]>(`${this.apiUrl}/monthly-incomes`),
      expenses: this.http.get<any[]>(`${this.apiUrl}/expenses`),
      savings: this.http.get<any[]>(`${this.apiUrl}/savings-goals`),
      debts: this.http.get<any[]>(`${this.apiUrl}/debts`)
    });
  }
}