import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  SavingsContribution,
  SavingsContributionPayload,
  SavingsGoal,
  SavingsGoalPayload,
} from '../models';

@Injectable({ providedIn: 'root' })
export class SavingsService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/savings-goals`;
  private contributionsBase = `${environment.apiUrl}/savings-contributions`;

  findAll(): Observable<SavingsGoal[]> {
    return this.http.get<SavingsGoal[]>(this.base);
  }

  findOne(id: string): Observable<SavingsGoal> {
    return this.http.get<SavingsGoal>(`${this.base}/${id}`);
  }

  create(payload: SavingsGoalPayload): Observable<SavingsGoal> {
    return this.http.post<SavingsGoal>(this.base, clean(payload));
  }

  update(id: string, payload: Partial<SavingsGoalPayload>): Observable<SavingsGoal> {
    return this.http.patch<SavingsGoal>(`${this.base}/${id}`, clean(payload));
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  // ---- Aportes ----------------------------------------------------------

  /** Todos los aportes del usuario, de todas sus metas. */
  findAllContributions(): Observable<SavingsContribution[]> {
    return this.http.get<SavingsContribution[]>(this.contributionsBase);
  }

  /** Historial de aportes de una meta concreta. */
  findContributions(goalId: string): Observable<SavingsContribution[]> {
    return this.http.get<SavingsContribution[]>(
      `${this.contributionsBase}/goal/${goalId}`,
    );
  }

  /** Registra un aporte. El backend suma el importe al acumulado de la meta. */
  addContribution(
    payload: SavingsContributionPayload,
  ): Observable<SavingsContribution> {
    return this.http.post<SavingsContribution>(
      this.contributionsBase,
      clean(payload),
    );
  }

  /** Elimina un aporte. El backend resta el importe del acumulado de la meta. */
  removeContribution(id: string): Observable<void> {
    return this.http.delete<void>(`${this.contributionsBase}/${id}`);
  }
}

function clean<T extends object>(payload: T): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (value === undefined || value === '' || value === null) continue;
    out[key] = value;
  }
  return out as Partial<T>;
}
