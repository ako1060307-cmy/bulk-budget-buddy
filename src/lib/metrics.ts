export const CATEGORIES = [
  "Clean Bulk Groceries",
  "Supplements",
  "Dining Out / Cheat Meals",
  "General Living",
] as const;
export type Category = (typeof CATEGORIES)[number];

export const NUTRITION_CATEGORIES: Category[] = ["Clean Bulk Groceries", "Supplements"];

export type Expense = {
  id: string;
  title: string;
  amount: number;
  category: Category;
  expense_date: string; // YYYY-MM-DD
  protein_g: number | null;
};

export function monthInfo(today: Date) {
  const y = today.getFullYear();
  const m = today.getMonth();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const daysElapsed = today.getDate();
  // remaining includes today
  const daysRemaining = daysInMonth - daysElapsed + 1;
  const prefix = `${y}-${String(m + 1).padStart(2, "0")}-`;
  return { daysInMonth, daysElapsed, daysRemaining, prefix };
}

export function currentMonthExpenses(expenses: Expense[], today: Date) {
  const { prefix } = monthInfo(today);
  return expenses.filter((e) => e.expense_date.startsWith(prefix));
}

export function totalSpend(expenses: Expense[]) {
  return expenses.reduce((s, e) => s + Number(e.amount), 0);
}

export function dailyBurnRate(monthSpend: number, daysElapsed: number) {
  return daysElapsed > 0 ? monthSpend / daysElapsed : 0;
}

export function safeDailyAllowance(budget: number, monthSpend: number, daysRemaining: number) {
  if (daysRemaining <= 0) return 0;
  return (budget - monthSpend) / daysRemaining;
}

export type Threshold = "green" | "amber" | "red";
export function thresholdStatus(spent: number, limit: number): Threshold {
  if (limit <= 0) return spent > 0 ? "red" : "green";
  const pct = (spent / limit) * 100;
  if (pct >= 100) return "red";
  if (pct >= 75) return "amber";
  return "green";
}

/** Category budgets: bulk target is split across nutrition categories (70/30); remainder of
 * monthly budget is split across discretionary categories (40/60). */
export function categoryLimits(budget: number, bulkTarget: number): Record<Category, number> {
  const rest = Math.max(budget - bulkTarget, 0);
  return {
    "Clean Bulk Groceries": bulkTarget * 0.7,
    Supplements: bulkTarget * 0.3,
    "Dining Out / Cheat Meals": rest * 0.4,
    "General Living": rest * 0.6,
  };
}

export function splitNutrition(expenses: Expense[]) {
  let nutrition = 0;
  let discretionary = 0;
  for (const e of expenses) {
    if (NUTRITION_CATEGORIES.includes(e.category)) nutrition += Number(e.amount);
    else discretionary += Number(e.amount);
  }
  return { nutrition, discretionary };
}

export const inr = (n: number) =>
  "₹" + n.toLocaleString("en-IN", { maximumFractionDigits: 0 });
