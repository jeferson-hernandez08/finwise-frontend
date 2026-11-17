import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { UsersService } from '../users.service';

@Component({
  selector: 'app-list',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './list.html'
})
export class List implements OnInit {
  private usersService = inject(UsersService);
  users = signal<any[]>([]);
  isLoading = signal<boolean>(true);

  ngOnInit() { this.loadUsers(); }

  loadUsers() {
    this.isLoading.set(true);
    this.usersService.getUsers().subscribe({
      next: (data) => {
        this.users.set(data);
        this.isLoading.set(false);
      }
    });
  }

  deleteUser(id: string) {
    if (confirm('¿Seguro que deseas eliminar este usuario del sistema?')) {
      this.usersService.deleteUser(id).subscribe(() => this.loadUsers());
    }
  }
}