import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { SavingsService } from '../../savings.service';

@Component({
  selector: 'app-edit',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './edit.html',
  styleUrl: './edit.css'
})
export class Edit implements OnInit {
  private fb = inject(FormBuilder);
  private savingsService = inject(SavingsService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  goalId = signal<string>('');
  contributionId = signal<string>('');
  originalContribution = signal<any>(null);
  isLoading = signal<boolean>(false);
  errorMessage = signal<string>('');

  // Solo permitimos editar la nota por seguridad financiera
  editForm = this.fb.group({
    note: ['']
  });

  ngOnInit() {
    const gId = this.route.snapshot.paramMap.get('id');
    const cId = this.route.snapshot.paramMap.get('contribId');
    
    if (gId && cId) {
      this.goalId.set(gId);
      this.contributionId.set(cId);
      this.loadContribution(cId);
    }
  }

  loadContribution(id: string) {
    this.isLoading.set(true);
    this.savingsService.getContribution(id).subscribe({
      next: (data) => {
        this.originalContribution.set(data);
        this.editForm.patchValue({
          note: data.note
        });
        this.isLoading.set(false);
      },
      error: (err) => {
        this.errorMessage.set('No se pudo cargar el aporte.');
        this.isLoading.set(false);
      }
    });
  }

  onSubmit() {
    this.isLoading.set(true);
    const formData = {
      note: this.editForm.value.note
    };

    this.savingsService.updateContribution(this.contributionId(), formData).subscribe({
      next: () => {
        // Volvemos al historial
        this.router.navigate(['/savings', this.goalId(), 'contributions']);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set('Error al actualizar la nota.');
      }
    });
  }
}