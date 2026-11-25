import { CATEGORIES, type CategoryTotal } from './budget';
import { effectiveHourlyWage, isProfileComplete, toYearly } from './calc';
import type { Category, Expense, Profile } from './types';

export interface ScenarioResult {
  /** Uren per jaar die je vaste uitgaven nu kosten. */
  baseHours: number;
  /** Uren per jaar in het scenario. */
  newHours: number;
  /** Verschil (positief = minder werken). */
  savedHours: number;
  /** Bespaarde euro's per jaar door opzeggen. */
  savedEuros: number;
  baseWage: number;
  newWage: number;
}

/**
 * Wat als je meer verdient en/of uitgaven opzegt?
 * Rekent met hetzelfde uurloon als de rest van de app (dus met reistijd als dat aan staat).
 */
export function runScenario(
  expenses: Expense[],
  profile: Profile,
  wageDelta: number,
  cancelledIds: ReadonlySet<string>,
): ScenarioResult | null {
  if (!isProfileComplete(profile)) return null;
  const baseWage = effectiveHourlyWage(profile);
  const newWage = effectiveHourlyWage({ ...profile, hourlyWage: Math.max(0, profile.hourlyWage + wageDelta) });
  if (baseWage <= 0 || newWage <= 0) return null;

  const recurring = expenses.filter((e) => e.frequency !== 'eenmalig');
  const yearly = recurring.reduce((s, e) => s + toYearly(e.amount, e.frequency), 0);
  const savedEuros = recurring.filter((e) => cancelledIds.has(e.id)).reduce((s, e) => s + toYearly(e.amount, e.frequency), 0);

  const baseHours = yearly / baseWage;
  const newHours = (yearly - savedEuros) / newWage;
  return { baseHours, newHours, savedHours: baseHours - newHours, savedEuros, baseWage, newWage };
}

export interface YearCategory {
  category: Category;
  label: string;
  yearly: number;
  hours: number;
}

/** Werkuren per jaar per categorie, van groot naar klein. */
export function yearOverview(byCategory: CategoryTotal[], profile: Profile): YearCategory[] {
  const wage = effectiveHourlyWage(profile);
  if (!isProfileComplete(profile) || wage <= 0) return [];
  const label = Object.fromEntries(CATEGORIES.map((c) => [c.id, c.label.toLowerCase()]));
  return byCategory
    .map((c) => ({ category: c.category, label: label[c.category], yearly: c.yearly, hours: c.yearly / wage }))
    .sort((a, b) => b.hours - a.hours);
}
