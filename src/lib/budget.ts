import { effectiveHourlyWage, isProfileComplete, toMonthly, toYearly, yearlyEarnings } from './calc';
import type { Category, Expense, Frequency, Income, Profile } from './types';

export const CATEGORIES: { id: Category; label: string }[] = [
  { id: 'wonen', label: 'Wonen' },
  { id: 'eten', label: 'Eten' },
  { id: 'vervoer', label: 'Vervoer' },
  { id: 'abonnementen', label: 'Abonnementen' },
  { id: 'kleding', label: 'Kleding' },
  { id: 'uitgaan', label: 'Uitgaan' },
  { id: 'sparen', label: 'Sparen' },
  { id: 'overig', label: 'Overig' },
];

export const CATEGORY_LABEL = Object.fromEntries(CATEGORIES.map((c) => [c.id, c.label])) as Record<Category, string>;

export const FREQUENCIES: { id: Frequency; label: string; per: string }[] = [
  { id: 'eenmalig', label: 'Eenmalig', per: '' },
  { id: 'dag', label: 'Per dag', per: 'dag' },
  { id: 'week', label: 'Per week', per: 'week' },
  { id: 'maand', label: 'Per maand', per: 'maand' },
  { id: 'kwartaal', label: 'Per kwartaal', per: 'kwartaal' },
  { id: 'jaar', label: 'Per jaar', per: 'jaar' },
];

export const FREQUENCY_PER = Object.fromEntries(FREQUENCIES.map((f) => [f.id, f.per])) as Record<Frequency, string>;

export interface CategoryTotal {
  category: Category;
  monthly: number;
  yearly: number;
  count: number;
}

export interface BudgetSummary {
  incomeMonthly: number;
  incomeYearly: number;
  expensesMonthly: number;
  expensesYearly: number;
  leftoverMonthly: number;
  leftoverYearly: number;
  /** Eenmalige uitgaven, los van het maandbudget. */
  oneOffTotal: number;
  /** Per categorie, in vaste volgorde, alleen categorieën met terugkerende uitgaven. */
  byCategory: CategoryTotal[];
}

export function summarizeBudget(incomes: Income[], expenses: Expense[]): BudgetSummary {
  const incomeYearly = incomes.reduce((s, i) => s + toYearly(i.amount, i.frequency), 0);
  const expensesYearly = expenses.reduce((s, e) => s + toYearly(e.amount, e.frequency), 0);
  const oneOffTotal = expenses.filter((e) => e.frequency === 'eenmalig').reduce((s, e) => s + e.amount, 0);

  const byCategory: CategoryTotal[] = CATEGORIES.map(({ id }) => {
    const items = expenses.filter((e) => e.category === id && e.frequency !== 'eenmalig');
    const yearly = items.reduce((s, e) => s + toYearly(e.amount, e.frequency), 0);
    return { category: id, yearly, monthly: yearly / 12, count: items.length };
  }).filter((c) => c.count > 0);

  return {
    incomeYearly,
    incomeMonthly: incomeYearly / 12,
    expensesYearly,
    expensesMonthly: expensesYearly / 12,
    leftoverYearly: incomeYearly - expensesYearly,
    leftoverMonthly: (incomeYearly - expensesYearly) / 12,
    oneOffTotal,
    byCategory,
  };
}

/**
 * Hoeveel uur per maand je werkt voor je loon, gemeten met hetzelfde uurloon
 * waarmee uitgaven worden omgerekend. Met het "echte uurloon" telt reistijd dus mee.
 */
export function paidHoursPerMonth(p: Profile): number {
  const wage = effectiveHourlyWage(p);
  if (!isProfileComplete(p) || wage <= 0) return 0;
  return yearlyEarnings(p) / wage / 12;
}

export interface WorkTimeSlice {
  key: Category | 'vrij';
  hours: number;
  /** Aandeel van de balk (0–1). */
  share: number;
}

/**
 * Verdeling van je maandelijkse werktijd over categorieën, plus wat er overblijft ("vrij").
 * Als uitgaven meer werktijd kosten dan je werkt, is de balk het totaal van de uitgaven.
 */
export function workTimeSlices(byCategory: CategoryTotal[], p: Profile): WorkTimeSlice[] {
  const wage = effectiveHourlyWage(p);
  if (!isProfileComplete(p) || wage <= 0) return [];
  const worked = paidHoursPerMonth(p);
  const spent = byCategory.map((c) => ({ key: c.category, hours: c.monthly / wage }));
  const spentTotal = spent.reduce((s, c) => s + c.hours, 0);
  const free = Math.max(0, worked - spentTotal);
  const whole = Math.max(worked, spentTotal);
  if (whole <= 0) return [];
  const slices: WorkTimeSlice[] = spent.map((s) => ({ ...s, share: s.hours / whole }));
  if (free > 0) slices.push({ key: 'vrij', hours: free, share: free / whole });
  return slices;
}

/** Monthly bedrag van één post, handig voor weergave. */
export function monthlyOf(item: { amount: number; frequency: Frequency }): number {
  return toMonthly(item.amount, item.frequency);
}
