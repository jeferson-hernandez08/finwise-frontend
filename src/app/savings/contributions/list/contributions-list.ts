import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { SavingsService } from '../../savings.service';

@Component({
  selector: 'app-contributions-list',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './contributions-list.html',
  styleUrl: './contributions-list.css'
})
export class ContributionsList implements OnInit {
  private savingsService = inject(SavingsService);
  private route = inject(ActivatedRoute);

  contributions = signal<any[]>([]);
  goalInfo = signal<any>(null); // Para mostrar el nombre de la meta
  goalId = signal<string>('');
  isLoading = signal<boolean>(true);

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.goalId.set(id);
      this.loadData(id);
    }
  }

  loadData(id: string) {
    this.isLoading.set(true);
    
    // Obtenemos la info de la meta
    this.savingsService.getSavingsGoal(id).subscribe({
      next: (goal) => this.goalInfo.set(goal)
    });

    // Obtenemos los aportes
    this.savingsService.getContributions(id).subscribe({
      next: (data) => {
        this.contributions.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error(err);
        this.isLoading.set(false);
      }
    });
  }

  deleteContribution(contributionId: string) {
    if (confirm('¿Estás seguro de eliminar este aporte? El saldo de la meta disminuirá.')) {
      this.savingsService.deleteContribution(contributionId).subscribe({
        next: () => {
          // Recargamos los datos para ver el saldo actualizado
          this.loadData(this.goalId());
        },
        error: (err) => console.error(err)
      });
    }
  }
}