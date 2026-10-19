import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { IncomesService } from '../incomes.service';

@Component({
  selector: 'app-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './form.html',
  styleUrl: './form.css'
})
export class Form implements OnInit {
  private fb = inject(FormBuilder);
  private incomesService = inject(IncomesService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  incomeForm = this.fb.group({
    amount: ['', [Validators.required, Validators.min(0.01)]],
    month: ['', [Validators.required, Validators.min(1), Validators.max(12)]],
    year: [new Date().getFullYear(), [Validators.required, Validators.min(2000)]]
  });

  isEditMode = signal<boolean>(false);
  incomeId = signal<string | null>(null);
  isLoading = signal<boolean>(false);
  errorMessage = signal<string>('');

  // Lista de meses para el select
  months = [
    { value: 1, name: 'Enero' }, { value: 2, name: 'Febrero' },
    { value: 3, name: 'Marzo' }, { value: 4, name: 'Abril' },
    { value: 5, name: 'Mayo' }, { value: 6, name: 'Junio' },
    { value: 7, name: 'Julio' }, { value: 8, name: 'Agosto' },
    { value: 9, name: 'Septiembre' }, { value: 10, name: 'Octubre' },
    { value: 11, name: 'Noviembre' }, { value: 12, name: 'Diciembre' }
  ];

  ngOnInit() {
    // Verificamos si estamos en la ruta de edición (/incomes/edit/:id)
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode.set(true);
      this.incomeId.set(id);
      this.loadIncomeData(id);
    }
  }

  loadIncomeData(id: string) {
    this.isLoading.set(true);
    this.incomesService.getIncome(id).subscribe({
      next: (data) => {
        // Llenamos el formulario con los datos existentes
        this.incomeForm.patchValue({
          amount: data.amount,
          month: data.month,
          year: data.year
        });
        this.isLoading.set(false);
      },
      error: (err) => {
        this.errorMessage.set('No se pudo cargar el ingreso.');
        this.isLoading.set(false);
      }
    });
  }

  onSubmit() {
    if (this.incomeForm.invalid) return;

    this.isLoading.set(true);
    this.errorMessage.set('');

    // Convertimos los valores a números (los selects a veces devuelven strings)
    const formData = {
      amount: Number(this.incomeForm.value.amount),
      month: Number(this.incomeForm.value.month),
      year: Number(this.incomeForm.value.year)
    };

    const request = this.isEditMode()
      ? this.incomesService.updateIncome(this.incomeId()!, formData)
      : this.incomesService.createIncome(formData);

    request.subscribe({
      next: () => {
        // Al terminar, volvemos a la lista
        this.router.navigate(['/incomes']);
      },
      error: (err) => {
        this.isLoading.set(false);
        // Aquí atrapamos el error si intentas crear dos ingresos del mismo mes/año
        this.errorMessage.set(err.error?.message || 'Error al guardar el ingreso.');
      }
    });
  }
}