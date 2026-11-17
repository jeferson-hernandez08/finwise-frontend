import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class UsersService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/users`;
  private rolesUrl = `${environment.apiUrl}/roles`;

  getUsers() { return this.http.get<any[]>(this.apiUrl); }
  getRoles() { return this.http.get<any[]>(this.rolesUrl); }
  getUser(id: string) { return this.http.get<any>(`${this.apiUrl}/${id}`); }
  createUser(data: any) { return this.http.post<any>(this.apiUrl, data); }
  updateUser(id: string, data: any) { return this.http.put<any>(`${this.apiUrl}/${id}`, data); } 
  deleteUser(id: string) { return this.http.delete(`${this.apiUrl}/${id}`); }
}