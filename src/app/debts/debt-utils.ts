import { Debt } from '../shared/models';
import { parseLocalDate } from '../shared/pipes/fecha.pipe';

/** Situación de una deuda según su saldo y su fecha de vencimiento. */
export type DebtStatus = 'paid' | 'overdue' | 'soon' | 'ok';

/** Deuda con los cálculos que repiten la lista y el detalle. */
export interface DebtView {
  debt: Debt;
  paid: number;
  percentage: number;
  status: DebtStatus;
  /** Días hasta el vencimiento; negativo si ya pasó, `null` si no hay fecha. */
  daysLeft: number | null;
}

const MS_PER_DAY = 86_400_000;

/** A partir de cuántos días antes del vencimiento se avisa al usuario. */
const SOON_DAYS = 7;

export function buildDebtView(debt: Debt): DebtView {
  const total = Math.max(debt.total_amount ?? 0, 0);
  const remaining = Math.max(debt.remaining_amount ?? 0, 0);
  const paid = Math.max(total - remaining, 0);
  const daysLeft = daysUntil(debt.due_date);

  let status: DebtStatus = 'ok';
  if (remaining <= 0) {
    status = 'paid';
  } else if (daysLeft !== null && daysLeft < 0) {
    status = 'overdue';
  } else if (daysLeft !== null && daysLeft <= SOON_DAYS) {
    status = 'soon';
  }

  // Una deuda saldada marca 100% aunque su monto total sea 0, para que la
  // barra y el chip "Pagada" no se contradigan.
  const percentage = remaining <= 0 ? 100 : percentagePaid(paid, total);

  return { debt, paid, percentage, status, daysLeft };
}

/** Porcentaje pagado, acotado a 0–100 para que la barra nunca se desborde. */
export function percentagePaid(paid: number, total: number): number {
  if (total <= 0) return paid > 0 ? 100 : 0;
  return Math.min(Math.max(Math.round((paid / total) * 100), 0), 100);
}

/** Días que faltan para una fecha. Se compara a medianoche para que "hoy" sea 0. */
export function daysUntil(value: string | null | undefined): number | null {
  const date = parseLocalDate(value);
  if (!date) return null;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const target = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  ).getTime();

  return Math.round((target - today) / MS_PER_DAY);
}

/** Vencidas arriba, luego lo que vence antes, y lo ya pagado al final. */
const STATUS_RANK: Record<DebtStatus, number> = {
  overdue: 0,
  soon: 1,
  ok: 1,
  paid: 2,
};

export function sortDebtViews(views: DebtView[]): DebtView[] {
  return [...views].sort((a, b) => {
    const byStatus = STATUS_RANK[a.status] - STATUS_RANK[b.status];
    if (byStatus !== 0) return byStatus;

    // Sin fecha de vencimiento no hay urgencia: van después de las que sí la tienen.
    const left = a.daysLeft ?? Number.POSITIVE_INFINITY;
    const right = b.daysLeft ?? Number.POSITIVE_INFINITY;
    if (left !== right) return left - right;

    return a.debt.name.localeCompare(b.debt.name, 'es');
  });
}
