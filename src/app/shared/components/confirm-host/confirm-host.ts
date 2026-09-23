import { Component, inject } from '@angular/core';
import { ConfirmService } from '../../services/confirm.service';

/** Hoja inferior de confirmación. Se monta una sola vez, dentro del shell. */
@Component({
  selector: 'app-confirm-host',
  standalone: true,
  template: `
    @if (request(); as req) {
      <div class="backdrop" (click)="cancel()"></div>
      <div class="sheet" role="alertdialog" aria-modal="true">
        <h3 class="sheet-title">{{ req.title }}</h3>
        <p class="sheet-message">{{ req.message }}</p>
        <div class="sheet-actions">
          <button type="button" class="fw-btn fw-btn--ghost fw-btn--block" (click)="cancel()">
            {{ req.cancelLabel }}
          </button>
          <button
            type="button"
            class="fw-btn fw-btn--block"
            [class.fw-btn--danger]="req.danger"
            (click)="accept()"
          >
            {{ req.confirmLabel }}
          </button>
        </div>
      </div>
    }
  `,
  styles: [
    `
      .backdrop {
        position: fixed;
        inset: 0;
        z-index: 70;
        background: rgba(17, 24, 39, 0.45);
        animation: fade-in 0.15s ease;
      }

      .sheet {
        position: fixed;
        z-index: 71;
        left: 0;
        right: 0;
        bottom: 0;
        margin: 0 auto;
        width: min(100%, 460px);
        background: var(--fw-surface);
        border-radius: 20px 20px 0 0;
        padding: 22px 20px calc(20px + var(--fw-safe-bottom));
        box-shadow: var(--fw-shadow-lg);
        animation: slide-up 0.2s ease;
      }

      .sheet-title {
        font-size: 17px;
        margin-bottom: 6px;
      }

      .sheet-message {
        margin: 0 0 18px;
        font-size: 14px;
        color: var(--fw-text-muted);
      }

      .sheet-actions {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
      }

      @keyframes fade-in {
        from {
          opacity: 0;
        }
      }

      @keyframes slide-up {
        from {
          transform: translateY(100%);
        }
      }

      /* En escritorio se centra como un diálogo clásico. */
      @media (min-width: 768px) {
        .sheet {
          top: 50%;
          bottom: auto;
          transform: translateY(-50%);
          border-radius: var(--fw-radius);
          animation: fade-in 0.15s ease;
        }
      }
    `,
  ],
})
export class ConfirmHost {
  private service = inject(ConfirmService);
  readonly request = this.service.request;

  accept() {
    this.service.resolve(true);
  }

  cancel() {
    this.service.resolve(false);
  }
}
