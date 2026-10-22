import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SavingsService } from '../savings.service';

@Component({
  selector: 'app-list',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './list.html',
  styleUrl: './list.css'
})
export class List implements OnInit {
  private savingsService = inject(SavingsService);

  savings = signal<any[]>([]);
  isLoading = signal<boolean>(true);

  ngOnInit() {
    this.loadSavings();
  }

  loadSavings() {
    this.isLoading.set(true);
    this.savingsService.getSavingsGoals().subscribe({
      next: (data) => {
        this.savings.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error(err);
        this.isLoading.set(false);
      }
    });
  }

  deleteGoal(id: string) {
    if (confirm('¿Estás seguro de eliminar este objetivo de ahorro? Se perderá el historial.')) {
      this.savingsService.deleteSavingsGoal(id).subscribe({
        next: () => this.loadSavings(),
        error: (err) => console.error(err)
      });
    }
  }

  // Función para calcular el porcentaje de progreso
  calculateProgress(current: number, target: number): number {
    if (target === 0) return 0;
    const percent = (current / target) * 100;
    return percent > 100 ? 100 : percent; // No pasar del 100%
  }
}