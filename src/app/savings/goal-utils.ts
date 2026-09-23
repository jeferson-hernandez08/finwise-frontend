import { SavingsGoal } from '../shared/models';
import { parseLocalDate } from '../shared/pipes/fecha.pipe';

/**
 * Emoji deducido del nombre de la meta. Se busca por palabra clave sobre el
 * nombre sin tildes, así "Vacación" y "vacacion" caen en la misma regla.
 */
const EMOJI_RULES: ReadonlyArray<readonly [RegExp, string]> = [
  [/moto|carro|auto|vehiculo|camioneta/, '🏍️'],
  [/casa|apto|apartamento|vivienda|hogar/, '🏠'],
  [/viaje|vacacion|vuelo|europa|playa/, '✈️'],
  [/estudio|universidad|curso|carrera|maestria/, '📚'],
  [/emergencia|imprevisto|colchon/, '🛡️'],
];

const DEFAULT_EMOJI = '🐷';

/** Datos derivados de una meta: lo que pintan la lista y el detalle. */
export interface GoalView {
  goal: SavingsGoal;
  emoji: string;
  /** Porcentaje acumulado, entero y acotado a 100. */
  percentage: number;
  remaining: number;
  completed: boolean;
  /** Días hasta la fecha límite; negativo si ya pasó. `null` si no hay plazo. */
  daysLeft: number | null;
  /** Plazo vencido con la meta aún sin cumplir. */
  expired: boolean;
  /** Cuánto habría que aportar cada mes para llegar a tiempo. */
  monthlyTarget: number | null;
}

export function goalEmoji(name: string): string {
  const normalized = name
    .normalize('NFD')
    // Marcas diacríticas combinantes (U+0300–U+036F), escritas con escapes:
    // en literal son caracteres invisibles que cualquier reformateo rompería.
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

  for (const [pattern, emoji] of EMOJI_RULES) {
    if (pattern.test(normalized)) return emoji;
  }
  return DEFAULT_EMOJI;
}

export function buildGoalView(goal: SavingsGoal): GoalView {
  const target = goal.target_amount > 0 ? goal.target_amount : 0;
  const current = Math.max(0, goal.current_amount);
  const remaining = Math.max(0, target - current);
  const completed = target > 0 && remaining === 0;

  const percentage = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;

  const daysLeft = goal.deadline ? daysUntil(goal.deadline) : null;
  const expired = !completed && daysLeft !== null && daysLeft < 0;

  return {
    goal,
    emoji: goalEmoji(goal.name),
    percentage,
    remaining,
    completed,
    daysLeft,
    expired,
    monthlyTarget: monthlyTarget(remaining, daysLeft, completed),
  };
}

/** Texto del plazo, ya en español y contemplando el día de hoy. */
export function deadlineLabel(view: GoalView): string | null {
  const days = view.daysLeft;
  if (days === null) return null;
  if (days < 0) return `Venció hace ${plural(-days, 'día', 'días')}`;
  if (days === 0) return 'El plazo vence hoy';
  return `Faltan ${plural(days, 'día', 'días')}`;
}

/**
 * Reparte lo que falta entre los meses que quedan. Se redondea hacia arriba
 * para que la suma de las cuotas nunca se quede corta.
 */
function monthlyTarget(
  remaining: number,
  daysLeft: number | null,
  completed: boolean,
): number | null {
  if (completed || remaining <= 0 || daysLeft === null || daysLeft < 0) return null;
  const months = Math.max(1, Math.ceil(daysLeft / 30));
  return Math.ceil(remaining / months);
}

function daysUntil(deadline: string): number | null {
  const target = parseLocalDate(deadline);
  if (!target) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);

  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

function plural(value: number, one: string, many: string): string {
  return `${value} ${value === 1 ? one : many}`;
}
