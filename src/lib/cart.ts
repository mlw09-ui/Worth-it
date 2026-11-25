import { toMonthly, toYearly } from './calc';
import type { CartItem, Frequency } from './types';
import type { WorkRhythm } from './format';

/** Bedrag per keer dat de frequentie voorkomt: prijs × aantal. */
export function itemPerPeriod(item: Pick<CartItem, 'price' | 'times'>): number {
  return item.price * Math.max(1, item.times);
}

export interface CartSummary {
  count: number;
  oneOffTotal: number;
  recurringYearly: number;
  recurringMonthly: number;
}

export function summarizeCart(items: CartItem[]): CartSummary {
  const selected = items.filter((i) => i.selected);
  let oneOffTotal = 0;
  let recurringYearly = 0;
  for (const i of selected) {
    if (i.frequency === 'eenmalig') oneOffTotal += itemPerPeriod(i);
    else recurringYearly += toYearly(i.price, i.frequency, Math.max(1, i.times));
  }
  return { count: selected.length, oneOffTotal, recurringYearly, recurringMonthly: recurringYearly / 12 };
}

export function itemMonthly(item: Pick<CartItem, 'price' | 'times' | 'frequency'>): number {
  return toMonthly(item.price, item.frequency, Math.max(1, item.times));
}

/** "3× per week", "per maand", "eenmalig", "2× eenmalig" */
export function describeFrequency(frequency: Frequency, times: number): string {
  const prefix = times > 1 ? `${times}× ` : '';
  return frequency === 'eenmalig' ? `${prefix}eenmalig`.trim() : `${prefix}per ${frequency}`;
}

const DAY_NAMES = ['maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag', 'zondag'];

/** Naam van je laatste werkdag van de week, uitgaande van een week die op maandag begint. */
export function lastWorkday(daysPerWeek: number): string {
  const i = Math.min(7, Math.max(1, Math.ceil(daysPerWeek))) - 1;
  return DAY_NAMES[i];
}

export interface ComparisonContext extends WorkRhythm {
  daysPerWeek: number;
  /** Werkweken per jaar (52 − vakantie). */
  workWeeksPerYear: number;
}

/**
 * Menselijke vergelijking voor een hoeveelheid werktijd, bijv.
 * "Dit is je hele vrijdag" of "Bijna een halve werkweek".
 */
export function humanComparison(hours: number, ctx: ComparisonContext): string {
  const { hoursPerDay, hoursPerWeek, daysPerWeek, workWeeksPerYear } = ctx;
  if (!Number.isFinite(hours) || hours <= 0 || hoursPerDay <= 0 || hoursPerWeek <= 0) return '';

  const minutes = hours * 60;
  if (minutes < 15) return 'Minder dan een kwartiertje werk';
  if (hours < 1) return 'Minder dan een uur werk';

  const days = hours / hoursPerDay;
  if (days < 0.35) return 'Een paar uur van je werkdag';
  if (days < 0.65) return 'Ongeveer een halve werkdag: een ochtend werken';
  if (days < 0.9) return 'Bijna een hele werkdag';
  if (days < 0.98) return `Bijna je hele ${lastWorkday(daysPerWeek)}`;
  if (days <= 1.1) return `Dit is je hele ${lastWorkday(daysPerWeek)}`;

  const weeks = hours / hoursPerWeek;
  const wholeDays = Math.round(days);
  if (Math.abs(days - wholeDays) < 0.15 && wholeDays < daysPerWeek) {
    const last = DAY_NAMES[wholeDays - 1];
    return wholeDays === 2 ? 'Je hele maandag en dinsdag' : `Je hele maandag tot en met ${last}`;
  }
  if (weeks < 0.4) return 'Meer dan een hele werkdag';
  if (weeks < 0.5) return 'Bijna een halve werkweek';
  if (weeks < 0.6) return 'Ruim een halve werkweek';
  if (weeks < 0.8) return 'Het grootste deel van een werkweek';
  if (weeks < 0.98) return 'Bijna een hele werkweek';
  if (weeks <= 1.1) return 'Een hele werkweek';

  const weeksPerMonth = workWeeksPerYear > 0 ? workWeeksPerYear / 12 : 52 / 12;
  const months = weeks / weeksPerMonth;
  if (months < 0.9) return `Ruim ${Math.floor(weeks)} werkweken`;
  if (months <= 1.15) return 'Ongeveer een maand werken';

  const years = workWeeksPerYear > 0 ? weeks / workWeeksPerYear : 0;
  if (years >= 0.9 && years <= 1.1) return 'Ongeveer een heel jaar werken';
  if (years > 1.1) return `Meer dan ${Math.floor(years) === 1 ? 'een jaar' : `${Math.floor(years)} jaar`} werken`;
  return `Ruim ${Math.floor(months)} ${Math.floor(months) === 1 ? 'maand' : 'maanden'} werken`;
}

/** Aantal weken sparen voor een bedrag met het maandelijkse overschot. Null als er geen overschot is. */
export function weeksToSave(amount: number, leftoverMonthly: number): number | null {
  if (leftoverMonthly <= 0 || amount <= 0) return null;
  const perWeek = (leftoverMonthly * 12) / 52;
  return Math.ceil(amount / perWeek);
}

/** "3 weken", "1 week", "ongeveer 5 maanden", "ruim 2 jaar". */
export function formatWeeks(weeks: number): string {
  if (weeks <= 1) return '1 week';
  if (weeks < 9) return `${weeks} weken`;
  const months = Math.round(weeks / (52 / 12));
  if (weeks < 104) return `ongeveer ${months} ${months === 1 ? 'maand' : 'maanden'}`;
  const years = Math.floor(weeks / 52);
  return `ruim ${years} jaar`;
}
