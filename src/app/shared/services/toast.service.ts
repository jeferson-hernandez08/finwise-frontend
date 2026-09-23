import { Injectable, signal } from '@angular/core';

export interface Toast {
  id: number;
  message: string;
  kind: 'success' | 'error' | 'info';
}

/**
 * Avisos breves en la parte inferior de la pantalla.
 * Se usa para confirmar guardados y mostrar errores del backend sin robar
 * el foco con un diálogo.
 */
@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly toasts = signal<Toast[]>([]);
  private nextId = 1;

  success(message: string) {
    this.push(message, 'success');
  }

  error(message: string) {
    this.push(message, 'error');
  }

  info(message: string) {
    this.push(message, 'info');
  }

  dismiss(id: number) {
    this.toasts.update(list => list.filter(t => t.id !== id));
  }

  private push(message: string, kind: Toast['kind']) {
    const id = this.nextId++;
    this.toasts.update(list => [...list, { id, message, kind }]);
    setTimeout(() => this.dismiss(id), kind === 'error' ? 5000 : 3000);
  }
}

/**
 * Extrae un mensaje legible de un `HttpErrorResponse` de Nest.
 * `message` puede ser una cadena o un arreglo (errores de class-validator).
 */
export function errorMessage(err: unknown, fallback = 'Ocurrió un error'): string {
  const e = err as { status?: number; error?: { message?: string | string[] } };
  if (e?.status === 0) {
    return 'No se pudo conectar con el servidor. ¿Está encendido el backend?';
  }
  const message = e?.error?.message;
  if (Array.isArray(message)) return message[0] ?? fallback;
  if (typeof message === 'string') return message;
  return fallback;
}
