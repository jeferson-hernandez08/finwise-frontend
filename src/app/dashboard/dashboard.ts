import { Component, inject, computed, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../shared/services/auth.service';
import { DashboardService } from './dashboard.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class Dashboard implements OnInit {
  private authService = inject(AuthService);
  private dashboardService = inject(DashboardService);

  user = this.authService.user;
  userRole = computed(() => this.user()?.role);

  // Signals para guardar los datos crudos
  incomesData = signal<any[]>([]);
  expensesData = signal<any[]>([]);
  savingsData = signal<any[]>([]);
  debtsData = signal<any[]>([]);

  // Signals computados (se calculan automáticamente cuando los datos cambian)
  totalIncomes = computed(() => this.incomesData().reduce((acc, curr) => acc + curr.amount, 0));
  totalExpenses = computed(() => this.expensesData().reduce((acc, curr) => acc + curr.amount, 0));
  
  // Para ahorros sumamos el "current_amount" (lo que llevamos ahorrado)
  totalSavings = computed(() => this.savingsData().reduce((acc, curr) => acc + curr.current_amount, 0));
  
  // Para deudas sumamos el "remaining_amount" (lo que debemos)
  totalDebts = computed(() => this.debtsData().reduce((acc, curr) => acc + curr.remaining_amount, 0));

  ngOnInit() {
    this.loadDashboardData();
  }

  loadDashboardData() {
    this.dashboardService.getDashboardData().subscribe({
      next: (data) => {
        this.incomesData.set(data.incomes);
        this.expensesData.set(data.expenses);
        this.savingsData.set(data.savings);
        this.debtsData.set(data.debts);
      },
      error: (err) => console.error('Error cargando datos del dashboard', err)
    });
  }

  logout() {
    this.authService.logout();
  }
}