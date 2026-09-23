import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../shared/services/auth.service';
import { ToastHost } from '../../shared/components/toast-host/toast-host';
import { ConfirmHost } from '../../shared/components/confirm-host/confirm-host';

interface NavItem {
  path: string;
  label: string;
  icon: string;
}

/**
 * Armazón de la zona privada: cabecera fija, contenido desplazable y barra
 * de navegación inferior al estilo de una app nativa.
 */
@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, ToastHost, ConfirmHost],
  templateUrl: './shell.html',
  styleUrl: './shell.css',
})
export class Shell {
  private auth = inject(AuthService);

  readonly initials = this.auth.initials;
  readonly displayName = this.auth.displayName;

  menuOpen = false;

  readonly nav: NavItem[] = [
    { path: '/dashboard', label: 'Resumen', icon: '◎' },
    { path: '/expenses', label: 'Gastos', icon: '▤' },
    { path: '/incomes', label: 'Ingresos', icon: '↓' },
    { path: '/debts', label: 'Deudas', icon: '▰' },
    { path: '/savings', label: 'Ahorros', icon: '★' },
  ];

  toggleMenu() {
    this.menuOpen = !this.menuOpen;
  }

  closeMenu() {
    this.menuOpen = false;
  }

  logout() {
    this.closeMenu();
    this.auth.logout();
  }
}
