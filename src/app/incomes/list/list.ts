import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { IncomesService } from '../incomes.service';

@Component({
  selector: 'app-list',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './list.html',
  styleUrl: './list.css'
})
export class List implements OnInit {
  private incomesService = inject(IncomesService);

  // Signal para guardar la lista de ingresos
  incomes = signal<any[]>([]);
  isLoading = signal<boolean>(true);
  errorMessage = signal<string>('');

  ngOnInit() {
    this.loadIncomes();
  }

  loadIncomes() {
    this.isLoading.set(true);
    this.incomesService.getIncomes().subscribe({
      next: (data) => {
        this.incomes.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.errorMessage.set('Error al cargar los ingresos. Revisa la consola.');
        this.isLoading.set(false);
        console.error(err);
      }
    });
  }

  deleteIncome(id: string) {
    if (confirm('¿Estás seguro de eliminar este ingreso?')) {
      this.incomesService.deleteIncome(id).subscribe({
        next: () => {
          // Recargamos la lista después de eliminar
          this.loadIncomes();
        },
        error: (err) => console.error('Error al eliminar', err)
      });
    }
  }

  // Función auxiliar para mostrar el nombre del mes
  getMonthName(monthNumber: number): string {
    const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    return months[monthNumber - 1] || 'Desconocido';
  }
}