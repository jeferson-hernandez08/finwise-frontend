import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-incomes-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  template: `
    <div class="container mt-4">
      <h2>{{ isEdit ? 'Editar' : 'Crear' }} Ingreso Mensual</h2>
      <hr>
      <form [formGroup]="incomeForm" (ngSubmit)="onSubmit()" class="mt-4">
        <div class="row">
          <div class="col-md-4">
            <div class="mb-3">
              <label for="month" class="form-label">Mes</label>
              <select id="month" class="form-select" formControlName="month">
                @for (m of months; track m.value) {
                  <option [value]="m.value">{{ m.label }}</option>
                }
              </select>
            </div>
          </div>
          <div class="col-md-4">
            <div class="mb-3">
              <label for="year" class="form-label">Año</label>
              <input id="year" type="number" class="form-control" formControlName="year" [min]="2000" [max]="2099">
            </div>
          </div>
          <div class="col-md-4">
            <div class="mb-3">
              <label for="amount" class="form-label">Monto</label>
              <input id="amount" type="number" class="form-control" formControlName="amount" step="0.01" min="0">
            </div>
          </div>
        </div>
        <div class="d-flex gap-2">
          <button type="submit" class="btn btn-primary" [disabled]="incomeForm.invalid">
            {{ isEdit ? 'Actualizar' : 'Guardar' }}
          </button>
          <a routerLink="/incomes" class="btn btn-secondary">Cancelar</a>
        </div>
      </form>
    </div>
  `,
  styles: ``
})
export class IncomesFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private apiUrl = environment.apiUrl;

  isEdit = false;
  incomeId: string | null = null;

  months = [
    { value: 1, label: 'Enero' },
    { value: 2, label: 'Febrero' },
    { value: 3, label: 'Marzo' },
    { value: 4, label: 'Abril' },
    { value: 5, label: 'Mayo' },
    { value: 6, label: 'Junio' },
    { value: 7, label: 'Julio' },
    { value: 8, label: 'Agosto' },
    { value: 9, label: 'Septiembre' },
    { value: 10, label: 'Octubre' },
    { value: 11, label: 'Noviembre' },
    { value: 12, label: 'Diciembre' }
  ];

  incomeForm = this.fb.group({
    month: ['', Validators.required],
    year: [new Date().getFullYear(), [Validators.required, Validators.min(2000), Validators.max(2099)]],
    amount: ['', [Validators.required, Validators.min(0)]]
  });

  ngOnInit() {
    this.route.params.subscribe(params => {
      if (params['id']) {
        this.isEdit = true;
        this.incomeId = params['id'];
        this.loadIncome();
      }
    });
  }

  loadIncome() {
    this.http.get<any>(`${this.apiUrl}/monthly-incomes/${this.incomeId}`).subscribe({
      next: (data) => {
        this.incomeForm.patchValue({
          month: data.month,
          year: data.year,
          amount: data.amount
        });
      },
      error: (err) => console.error('Error loading income:', err)
    });
  }

  onSubmit() {
    if (this.incomeForm.invalid) return;
    const data = this.incomeForm.value;

    if (this.isEdit && this.incomeId) {
      this.http.patch(`${this.apiUrl}/monthly-incomes/${this.incomeId}`, data).subscribe({
        next: () => this.router.navigate(['/incomes']),
        error: (err) => console.error('Error updating income:', err)
      });
    } else {
      this.http.post(`${this.apiUrl}/monthly-incomes`, data).subscribe({
        next: () => this.router.navigate(['/incomes']),
        error: (err) => console.error('Error creating income:', err)
      });
    }
  }
}