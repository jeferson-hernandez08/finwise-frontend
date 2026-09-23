import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { MoneyPipe } from '../../shared/pipes/money.pipe';
import { SavingsService } from '../../shared/services/savings.service';
import { ToastService, errorMessage } from '../../shared/services/toast.service';
import { SavingsGoal } from '../../shared/models';
import { GoalView, buildGoalView, deadlineLabel } from '../goal-utils';

/** Listado de metas de ahorro con su progreso y el acumulado global. */
@Component({
  selector: 'app-savings-list',
  standalone: true,
  imports: [RouterLink, MoneyPipe],
  templateUrl: './list.html',
  styleUrl: './list.css',
})
export class List {
  private readonly savings = inject(SavingsService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  readonly goals = signal<SavingsGoal[]>([]);
  readonly loading = signal(true);
  readonly failed = signal(false);
  readonly skeletons = [1, 2, 3];

  /** Primero las metas en curso, y dentro de ellas las más avanzadas. */
  readonly rows = computed<GoalView[]>(() =>
    this.goals()
      .map(buildGoalView)
      .sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        return b.percentage - a.percentage;
      }),
  );

  readonly totalSaved = computed(() =>
    this.goals().reduce((sum, g) => sum + Math.max(0, g.current_amount), 0),
  );

  readonly totalTarget = computed(() =>
    this.goals().reduce((sum, g) => sum + Math.max(0, g.target_amount), 0),
  );

  readonly totalPercentage = computed(() => {
    const target = this.totalTarget();
    if (target <= 0) return 0;
    return Math.min(100, Math.round((this.totalSaved() / target) * 100));
  });

  readonly activeCount = computed(
    () => this.rows().filter(row => !row.completed).length,
  );

  constructor() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.failed.set(false);

    this.savings.findAll().subscribe({
      next: goals => {
        this.goals.set(goals);
        this.loading.set(false);
      },
      error: err => {
        this.goals.set([]);
        this.loading.set(false);
        this.failed.set(true);
        this.toast.error(errorMessage(err, 'No se pudieron cargar tus metas'));
      },
    });
  }

  /** El detalle enfoca solo el campo del monto cuando llega este parámetro. */
  goToContribution(goal: SavingsGoal) {
    this.router.navigate(['/savings/detail', goal._id], {
      queryParams: { aportar: 1 },
    });
  }

  deadlineLabel(row: GoalView): string | null {
    return deadlineLabel(row);
  }
}
