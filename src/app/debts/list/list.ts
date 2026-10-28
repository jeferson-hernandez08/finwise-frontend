import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { DebtsService } from '../debts.service';

@Component({
  selector: 'app-list',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './list.html',
  styleUrl: './list.css'
})
export class List implements OnInit {
  private debtsService = inject(DebtsService);

  debts = signal<any[]>([]);
  isLoading = signal<boolean>(true);

  ngOnInit() {
    this.loadDebts();
  }

  loadDebts() {
    this.isLoading.set(true);
    this.debtsService.getDebts().subscribe({
      next: (data) => {
        this.debts.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error(err);
        this.isLoading.set(false);
      }
    });
  }

  deleteDebt(id: string) {
    if (confirm('¿Estás seguro de eliminar esta deuda? Esta acción no se puede deshacer.')) {
      this.debtsService.deleteDebt(id).subscribe({
        next: () => this.loadDebts(),
        error: (err) => console.error(err)
      });
    }
  }

  // Calcula el porcentaje pagado de la deuda
  calculateProgress(total: number, remaining: number): number {
    if (total === 0) return 0;
    const paid = total - remaining;
    return (paid / total) * 100;
  }
}