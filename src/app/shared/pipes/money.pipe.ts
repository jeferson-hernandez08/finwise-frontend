import { Pipe, PipeTransform } from '@angular/core';

/**
 * Formatea un monto en pesos colombianos: `$ 1.250.000`.
 *
 * Se implementa con `Intl` en lugar del `CurrencyPipe` de Angular para
 * controlar el espacio tras el símbolo y omitir los decimales, que en COP
 * solo añaden ruido en una pantalla de móvil.
 */
@Pipe({ name: 'money', standalone: true })
export class MoneyPipe implements PipeTransform {
  private static readonly formatter = new Intl.NumberFormat('es-CO', {
    maximumFractionDigits: 0,
  });

  private static readonly formatterCents = new Intl.NumberFormat('es-CO', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  transform(
    value: number | null | undefined,
    mode: 'full' | 'compact' | 'plain' = 'full',
  ): string {
    const amount = typeof value === 'number' && isFinite(value) ? value : 0;

    if (mode === 'compact') {
      return `$ ${MoneyPipe.compact(amount)}`;
    }

    // Los centavos solo se muestran si el monto realmente los tiene.
    const hasCents = Math.abs(amount % 1) > 0.004;
    const formatted = hasCents
      ? MoneyPipe.formatterCents.format(amount)
      : MoneyPipe.formatter.format(amount);

    return mode === 'plain' ? formatted : `$ ${formatted}`;
  }

  /** Abrevia montos grandes para que quepan en las gráficas: `1,2 M`. */
  private static compact(amount: number): string {
    const abs = Math.abs(amount);
    const sign = amount < 0 ? '-' : '';
    if (abs >= 1_000_000_000) {
      return `${sign}${trim(abs / 1_000_000_000)} MM`;
    }
    if (abs >= 1_000_000) {
      return `${sign}${trim(abs / 1_000_000)} M`;
    }
    if (abs >= 1_000) {
      return `${sign}${trim(abs / 1_000)} K`;
    }
    return MoneyPipe.formatter.format(amount);
  }
}

/** Una cifra decimal, con coma como separador y sin el `,0` innecesario. */
function trim(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded)
    ? `${rounded}`
    : `${rounded}`.replace('.', ',');
}
