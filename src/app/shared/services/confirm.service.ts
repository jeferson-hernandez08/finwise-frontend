import { Injectable, signal } from '@angular/core';

export interface ConfirmRequest {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  danger: boolean;
}

/**
 * Diálogo de confirmación. Se usa en lugar de `window.confirm` porque el
 * nativo se ve fuera de lugar en móvil y no se puede traducir ni estilizar.
 *
 * Uso: `if (await this.confirm.ask({ title: '…', message: '…' })) { … }`
 */
@Injectable({ providedIn: 'root' })
export class ConfirmService {
  readonly request = signal<ConfirmRequest | null>(null);
  private resolver: ((value: boolean) => void) | null = null;

  ask(options: {
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    danger?: boolean;
  }): Promise<boolean> {
    // Si ya había un diálogo abierto, se resuelve como cancelado.
    this.resolver?.(false);

    this.request.set({
      title: options.title,
      message: options.message,
      confirmLabel: options.confirmLabel ?? 'Eliminar',
      cancelLabel: options.cancelLabel ?? 'Cancelar',
      danger: options.danger ?? true,
    });

    return new Promise<boolean>(resolve => {
      this.resolver = resolve;
    });
  }

  resolve(value: boolean) {
    this.request.set(null);
    const resolver = this.resolver;
    this.resolver = null;
    resolver?.(value);
  }
}
