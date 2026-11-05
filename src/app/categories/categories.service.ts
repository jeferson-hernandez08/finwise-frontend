import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class CategoriesService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/expense-categories`;

  getCategories() { return this.http.get<any[]>(this.apiUrl); }
  getCategory(id: string) { return this.http.get<any>(`${this.apiUrl}/${id}`); }
  createCategory(data: any) { return this.http.post<any>(this.apiUrl, data); }
  updateCategory(id: string, data: any) { return this.http.patch<any>(`${this.apiUrl}/${id}`, data); }
  deleteCategory(id: string) { return this.http.delete(`${this.apiUrl}/${id}`); }
}