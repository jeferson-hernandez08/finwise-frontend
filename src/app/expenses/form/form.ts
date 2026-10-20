import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ExpensesService } from '../expenses.service';

@Component({
  selector: 'app-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './form.html',
  styleUrl: './form.css'
})
export class Form implements OnInit {
  private fb = inject(FormBuilder);
  private expensesService = inject(ExpensesService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  // Formulario con los campos exactos del DTO de NestJS
  expenseForm = this.fb.group({
    amount: ['', [Validators.required, Validators.min(0.01)]],
    description: [''],
    date: [new Date().toISOString().split('T')[0], Validators.required], // YYYY-MM-DD
    category_id: ['', Validators.required],
    debt_id: [null] // Opcional por ahora
  });

  isEditMode = signal<boolean>(false);
  expenseId = signal<string | null>(null);
  isLoading = signal<boolean>(false);
  errorMessage = signal<string>('');

  // Signal para guardar las categorías de la BD
  categories = signal<any[]>([]);

  ngOnInit() {
    this.loadCategories();
    this.checkEditMode();
  }

  loadCategories() {
    this.expensesService.getCategories().subscribe({
      next: (data) => this.categories.set(data),
      error: (err) => console.error('Error cargando categorías', err)
    });
  }

  checkEditMode() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode.set(true);
      this.expenseId.set(id);
      this.loadExpenseData(id);
    }
  }

  loadExpenseData(id: string) {
    this.isLoading.set(true);
    this.expensesService.getExpense(id).subscribe({
      next: (data) => {
        // Formateamos la fecha a YYYY-MM-DD para el input type="date"
        const formattedDate = new Date(data.date).toISOString().split('T')[0];
        
        this.expenseForm.patchValue({
          amount: data.amount,
          description: data.description,
          date: formattedDate,
          // Si viene populado, extraemos el ID, si no, lo usamos directo
          category_id: data.category_id?._id || data.category_id,
          debt_id: data.debt_id?._id || data.debt_id
        });
        this.isLoading.set(false);
      },
      error: (err) => {
        this.errorMessage.set('No se pudo cargar el gasto.');
        this.isLoading.set(false);
      }
    });
  }

  onSubmit() {
    if (this.expenseForm.invalid) return;

    this.isLoading.set(true);
    this.errorMessage.set('');

    const formData = {
      ...this.expenseForm.value,
      amount: Number(this.expenseForm.value.amount)
    };

    const request = this.isEditMode()
      ? this.expensesService.updateExpense(this.expenseId()!, formData)
      : this.expensesService.createExpense(formData);

    request.subscribe({
      next: () => this.router.navigate(['/expenses']),
      error: (err) => {
        this.isLoading.set(false);
        // Aquí atrapamos si intenta pagar más de lo que debe en una deuda, etc.
        this.errorMessage.set(err.error?.message || 'Error al guardar el gasto.');
      }
    });
  }
}