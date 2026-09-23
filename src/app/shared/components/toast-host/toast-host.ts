import { Component, inject } from '@angular/core';
import { ToastService } from '../../services/toast.service';

/** Pila de avisos breves. Se monta una sola vez, dentro del shell. */
@Component({
  selector: 'app-toast-host',
  standalone: true,
  template: `
    <div class="toast-stack" role="status" aria-live="polite">
      @for (toast of toasts(); track toast.id) {
        <div class="toast" [class]="'toast--' + toast.kind" (click)="dismiss(toast.id)">
          {{ toast.message }}
        </div>
      }
    </div>
  `,
  styles: [
    `
      .toast-stack {
        position: fixed;
        left: 50%;
        transform: translateX(-50%);
        /* Por encima de la barra inferior y del botón flotante. */
        bottom: calc(var(--fw-nav-height) + var(--fw-safe-bottom) + 80px);
        z-index: 60;
        width: min(calc(100vw - 32px), 460px);
        display: flex;
        flex-direction: column;
        gap: 8px;
        pointer-events: none;
      }

      .toast {
        pointer-events: auto;
        padding: 12px 16px;
        border-radius: var(--fw-radius-sm);
        box-shadow: var(--fw-shadow-lg);
        font-size: 14px;
        font-weight: 500;
        color: #fff;
        background: #1f2937;
        cursor: pointer;
        animation: toast-in 0.2s ease;
      }

      .toast--success {
        background: #15803d;
      }

      .toast--error {
        background: #be123c;
      }

      @keyframes toast-in {
        from {
          opacity: 0;
          transform: translateY(10px);
        }
      }
    `,
  ],
})
export class ToastHost {
  private service = inject(ToastService);
  readonly toasts = this.service.toasts;

  dismiss(id: number) {
    this.service.dismiss(id);
  }
}
