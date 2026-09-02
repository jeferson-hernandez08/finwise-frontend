import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-incomes-list',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="container mt-4">
      <div class="d-flex justify-content-between align-items-center">
        <h2>📊 Ingresos Mensuales</h2>
        <a routerLink="/incomes/new" class="btn btn-primary">+ Agregar Ingreso</a>
      </div>
      <hr>
      <div class="table-responsive">
        <table class="table table-striped">
          <thead>
            <tr>
              <th>Mes</th>
              <th>Año</th>
              <th>Monto</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            @for (income of incomes(); track income._id) {
              <tr>
                <td>{{ income.month }}</td>
                <td>{{ income.year }}</td>
                <td>${{ income.amount | number: '1.2-2' }}</td>
                <td>
                  <a [routerLink]="['/incomes/edit', income._id]" class="btn btn-sm btn-warning me-2">Editar</a>
                  <button class="btn btn-sm btn-danger" (click)="deleteIncome(income._id)">Eliminar</button>
                </td>
              </tr>
            } @empty {
              <tr><td colspan="4" class="text-center">No hay ingresos registrados</td></tr>
            }
          </tbody>
        </table>
      </div>
    </div>
  `,
  styles: ``
})
export class IncomesListComponent implements OnInit {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  incomes = signal<any[]>([]);

  ngOnInit() {
    this.loadIncomes();
  }

  loadIncomes() {
    this.http.get<any[]>(`${this.apiUrl}/monthly-incomes`).subscribe({
      next: (data) => this.incomes.set(data),
      error: (err) => console.error('Error loading incomes:', err)
    });
  }

  deleteIncome(id: string) {
    if (confirm('¿Estás seguro de eliminar este ingreso?')) {
      this.http.delete(`${this.apiUrl}/monthly-incomes/${id}`).subscribe({
        next: () => this.loadIncomes(),
        error: (err) => console.error('Error deleting income:', err)
      });
    }
  }
}