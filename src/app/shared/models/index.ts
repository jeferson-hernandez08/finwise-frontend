/**
 * Modelos de dominio de FinWise.
 *
 * Los nombres de campo replican exactamente los documentos de MongoDB que
 * devuelve el backend (snake_case), para no tener que mapear en cada servicio.
 */

/** Usuario autenticado, tal como viaja dentro del JWT. */
export interface JwtPayload {
  sub: string;
  email: string;
  iat?: number;
  exp?: number;
}

/** Perfil completo del usuario (GET /auth/me). */
export interface UserProfile {
  _id: string;
  email: string;
  full_name?: string;
  google_id?: string;
  created_at?: string;
}

export interface AuthResponse {
  access_token: string;
  user?: UserProfile;
}

/** Categoría de gasto (semilla fija del backend). */
export interface ExpenseCategory {
  _id: string;
  name: string;
}

/** Ingreso fijo de un mes concreto. Único por (usuario, año, mes). */
export interface MonthlyIncome {
  _id: string;
  user_id: string;
  amount: number;
  month: number;
  year: number;
  created_at?: string;
}

export interface MonthlyIncomePayload {
  amount: number;
  month: number;
  year: number;
}

/**
 * Gasto. `category_id` y `debt_id` llegan populados como objeto cuando se
 * listan, pero se envían como string al crear o actualizar.
 */
export interface Expense {
  _id: string;
  user_id: string;
  category_id: ExpenseCategory | string;
  description?: string;
  amount: number;
  date: string;
  debt_id?: Debt | string | null;
  created_at?: string;
}

export interface ExpensePayload {
  category_id: string;
  description?: string;
  amount: number;
  date: string;
  debt_id?: string | null;
}

export interface Debt {
  _id: string;
  user_id: string;
  name: string;
  total_amount: number;
  remaining_amount: number;
  minimum_monthly_payment?: number;
  interest_rate?: number;
  due_date?: string;
  created_at?: string;
}

export interface DebtPayload {
  name: string;
  total_amount: number;
  remaining_amount: number;
  minimum_monthly_payment?: number;
  interest_rate?: number;
  due_date?: string;
}

export interface DebtPayment {
  _id: string;
  debt_id: Debt | string;
  amount: number;
  payment_date: string;
  note?: string;
}

export interface DebtPaymentPayload {
  debt_id: string;
  amount: number;
  payment_date: string;
  note?: string;
}

export interface SavingsGoal {
  _id: string;
  user_id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  deadline?: string;
  created_at?: string;
}

export interface SavingsGoalPayload {
  name: string;
  target_amount: number;
  current_amount?: number;
  deadline?: string;
}

export interface SavingsContribution {
  _id: string;
  savings_goal_id: SavingsGoal | string;
  amount: number;
  date: string;
  note?: string;
}

export interface SavingsContributionPayload {
  savings_goal_id: string;
  amount: number;
  date: string;
  note?: string;
}

/** Gasto agrupado por categoría, para la gráfica de dona del dashboard. */
export interface CategoryBreakdown {
  category_id: string;
  category_name: string;
  total: number;
  count: number;
  percentage: number;
}

/** Un punto de la gráfica de evolución mensual. */
export interface MonthlyTrendPoint {
  year: number;
  month: number;
  income: number;
  expenses: number;
  balance: number;
}

/** Respuesta de GET /dashboard/summary — todo lo que pinta la pantalla principal. */
export interface DashboardSummary {
  year: number;
  month: number;
  income: number;
  total_expenses: number;
  balance: number;
  spent_percentage: number;
  expense_count: number;
  by_category: CategoryBreakdown[];
  trend: MonthlyTrendPoint[];
  debts: {
    count: number;
    total_amount: number;
    remaining_amount: number;
    paid_amount: number;
    paid_percentage: number;
    paid_this_month: number;
  };
  savings: {
    count: number;
    target_amount: number;
    current_amount: number;
    progress_percentage: number;
    saved_this_month: number;
  };
  top_expenses: Expense[];
}

/** Resuelve el nombre de la categoría venga populada o no. */
export function categoryName(
  value: ExpenseCategory | string | null | undefined,
): string {
  if (value && typeof value === 'object') return value.name;
  return 'Sin categoría';
}

/** Resuelve el id de un campo que puede llegar populado o como string. */
export function refId(
  value: { _id: string } | string | null | undefined,
): string | null {
  if (!value) return null;
  return typeof value === 'object' ? value._id : value;
}
