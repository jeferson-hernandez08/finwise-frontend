import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ExpensesService } from '../expenses.service';

@Component({
  selector: 'app-list',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './list.html',
  styleUrl: './list.css'
})
export class List implements OnInit {
  private expensesService = inject(ExpensesService);

  expenses = signal<any[]>([]);
  isLoading = signal<boolean>(true);

  ngOnInit() {
    this.loadExpenses();
  }

  loadExpenses() {
    this.isLoading.set(true);
    this.expensesService.getExpenses().subscribe({
      next: (data) => {
        this.expenses.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error(err);
        this.isLoading.set(false);
      }
    });
  }

  deleteExpense(id: string) {
    if (confirm('¿Estás seguro de eliminar este gasto?')) {
      this.expensesService.deleteExpense(id).subscribe({
        next: () => this.loadExpenses(),
        error: (err) => console.error(err)
      });
    }
  }
}