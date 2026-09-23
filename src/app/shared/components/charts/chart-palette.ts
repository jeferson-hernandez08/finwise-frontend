/**
 * Orden fijo en el que las gráficas reparten la paleta categórica
 * (`--fw-c1` … `--fw-c9`, definidas en `styles.css`).
 *
 * El orden no es 1…9: el lima (`--fw-c7`) se adelanta al violeta porque, con
 * el orden natural, lima y naranja quedaban contiguos y en deuteranopía son
 * casi el mismo color. Así ningún par vecino resulta indistinguible.
 * El gris (`--fw-c9`) va al final: es el único tono sin saturación suficiente
 * para leerse como categoría, y se reserva para el grupo "Otras".
 */
export const CHART_PALETTE: readonly string[] = [
  'var(--fw-c1)',
  'var(--fw-c2)',
  'var(--fw-c3)',
  'var(--fw-c4)',
  'var(--fw-c5)',
  'var(--fw-c7)',
  'var(--fw-c6)',
  'var(--fw-c8)',
  'var(--fw-c9)',
];

/**
 * Color de la serie número `index`.
 *
 * La paleta no se cicla: repetir colores haría que dos categorías distintas
 * se vieran igual. A partir de la novena serie todo cae en el gris neutro,
 * que es justo el que se usa para agrupar el resto.
 */
export function paletteColor(index: number): string {
  const safe = Math.min(Math.max(index, 0), CHART_PALETTE.length - 1);
  return CHART_PALETTE[safe];
}
