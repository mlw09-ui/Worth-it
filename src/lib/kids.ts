import type { KidMoney } from './types';

const WEEKS_PER_MONTH = 52 / 12;

export function allowancePerMonth(k: KidMoney): number {
  return k.allowanceFrequency === 'week' ? k.allowance * WEEKS_PER_MONTH : k.allowance;
}

export function choresPerMonthMoney(k: KidMoney): number {
  return k.choreRate * k.choresPerMonth;
}

/** Al je geld per maand: zakgeld + klusjes. */
export function moneyPerMonth(k: KidMoney): number {
  return allowancePerMonth(k) + choresPerMonthMoney(k);
}

export function moneyPerWeek(k: KidMoney): number {
  return moneyPerMonth(k) / WEEKS_PER_MONTH;
}

/** Hoeveel klusjes je moet doen voor een bedrag (naar boven afgerond). Null als je niets per klusje krijgt. */
export function choresFor(price: number, k: KidMoney): number | null {
  if (k.choreRate <= 0 || price <= 0) return null;
  return Math.ceil(price / k.choreRate - 1e-9);
}

/**
 * Een duur in weken, in woorden die een kind snapt:
 * "minder dan een week", "ongeveer 3 weken", "ongeveer 4 maanden", "ongeveer 2 jaar".
 */
export function kidDuration(weeks: number): string {
  if (!Number.isFinite(weeks) || weeks <= 0) return 'niets';
  if (weeks < 1) return 'minder dan een week';
  const w = Math.round(weeks);
  if (weeks < 8) return w === 1 ? '1 week' : `ongeveer ${w} weken`;
  const months = Math.round(weeks / WEEKS_PER_MONTH);
  if (months < 24) return `ongeveer ${months} maanden`;
  return `ongeveer ${Math.round(months / 12)} jaar`;
}

/** "Dat is al je geld van ongeveer 3 weken". Null als er geen geld per maand is ingevuld. */
export function moneyTimeFor(price: number, k: KidMoney): string | null {
  const perWeek = moneyPerWeek(k);
  if (perWeek <= 0 || price <= 0) return null;
  return kidDuration(price / perWeek);
}

/**
 * Hoeveel weken sparen tot je het kunt kopen, als je al je geld opspaart.
 * 0 = je hebt al genoeg. Null = je krijgt (na vaste kosten) niets per week.
 */
export function weeksUntilAffordable(price: number, k: KidMoney, monthlyCosts = 0): number | null {
  const missing = price - k.savings;
  if (missing <= 0) return 0;
  const perWeek = (moneyPerMonth(k) - monthlyCosts) / WEEKS_PER_MONTH;
  if (perWeek <= 0) return null;
  return Math.ceil(missing / perWeek - 1e-9);
}

/** "12 december" of "3 maart 2028" als het niet dit jaar is. */
export function dateAfterWeeks(weeks: number, today = new Date()): string {
  const d = new Date(today);
  d.setDate(d.getDate() + weeks * 7);
  const sameYear = d.getFullYear() === today.getFullYear();
  return new Intl.DateTimeFormat('nl-NL', { day: 'numeric', month: 'long', ...(sameYear ? {} : { year: 'numeric' }) }).format(d);
}
