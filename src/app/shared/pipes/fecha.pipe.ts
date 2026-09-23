import { Pipe, PipeTransform } from '@angular/core';
import { MONTH_NAMES, MONTH_NAMES_SHORT } from '../services/period.service';

/**
 * Fechas en español sin depender del registro de locales de Angular.
 *
 * Las fechas del backend llegan como `YYYY-MM-DD` o ISO completo. Se parsean
 * a mano porque `new Date('2026-03-05')` se interpreta como UTC y, en una
 * zona horaria negativa como la de Colombia, mostraría el día anterior.
 */
@Pipe({ name: 'fecha', standalone: true })
export class FechaPipe implements PipeTransform {
  transform(
    value: string | Date | null | undefined,
    format: 'short' | 'long' | 'day' | 'monthYear' = 'short',
  ): string {
    const date = parseLocalDate(value);
    if (!date) return '—';

    const day = date.getDate();
    const month = date.getMonth();
    const year = date.getFullYear();

    switch (format) {
      case 'long':
        return `${day} de ${MONTH_NAMES[month].toLowerCase()} de ${year}`;
      case 'day':
        // Compacto para listas: "5 mar".
        return `${day} ${MONTH_NAMES_SHORT[month].toLowerCase()}`;
      case 'monthYear':
        return `${MONTH_NAMES[month]} ${year}`;
      default:
        return `${pad(day)}/${pad(month + 1)}/${year}`;
    }
  }
}

export function parseLocalDate(
  value: string | Date | null | undefined,
): Date | null {
  if (!value) return null;
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : value;
  }

  // `YYYY-MM-DD` y el prefijo de un ISO completo: se construye en hora local.
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (match) {
    return new Date(+match[1], +match[2] - 1, +match[3]);
  }

  const parsed = new Date(value);
  return isNaN(parsed.getTime()) ? null : parsed;
}

/** Convierte cualquier fecha del backend al `YYYY-MM-DD` que pide `<input type="date">`. */
export function toDateInputValue(
  value: string | Date | null | undefined,
): string {
  const date = parseLocalDate(value);
  if (!date) return '';
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}
