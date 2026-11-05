import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CategoriesService } from '../categories.service';

@Component({
  selector: 'app-list',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './list.html'
})
export class List implements OnInit {
  private catService = inject(CategoriesService);
  categories = signal<any[]>([]);
  isLoading = signal<boolean>(true);

  ngOnInit() { this.loadCategories(); }

  loadCategories() {
    this.isLoading.set(true);
    this.catService.getCategories().subscribe({
      next: (data) => {
        this.categories.set(data);
        this.isLoading.set(false);
      }
    });
  }

  deleteCategory(id: string) {
    if (confirm('¿Seguro que deseas eliminar esta categoría? Afectará a los gastos que la usen.')) {
      this.catService.deleteCategory(id).subscribe({
        next: () => this.loadCategories(),
        error: (err) => alert(err.error.message || 'Error al eliminar')
      });
    }
  }
}