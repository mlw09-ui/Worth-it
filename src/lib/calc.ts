import type { Frequency, Profile } from './types';

export const WEEKS_PER_YEAR = 52;

/** Hoe vaak iets per jaar voorkomt. Eenmalig telt niet mee in het budget. */
export const TIMES_PER_YEAR: Record<Frequency, number> = {
  eenmalig: 0,
  dag: 365,
  week: 52,
  maand: 12,
  kwartaal: 4,
  jaar: 1,
};

export function toYearly(amount: number, frequency: Frequency, times = 1): number {
  return amount * times * TIMES_PER_YEAR[frequency];
}

export function toMonthly(amount: number, frequency: Frequency, times = 1): number {
  return toYearly(amount, frequency, times) / 12;
}

export function isRecurring(frequency: Frequency): boolean {
  return frequency !== 'eenmalig';
}

/** Werkweken per jaar na aftrek van vakantie. */
export function workWeeksPerYear(p: Profile): number {
  return Math.max(0, WEEKS_PER_YEAR - p.vacationWeeks);
}

export function workHoursPerYear(p: Profile): number {
  return p.hoursPerWeek * workWeeksPerYear(p);
}

export function workHoursPerMonth(p: Profile): number {
  return workHoursPerYear(p) / 12;
}

export function hoursPerDay(p: Profile): number {
  return p.daysPerWeek > 0 ? p.hoursPerWeek / p.daysPerWeek : 0;
}

export function commuteHoursPerYear(p: Profile): number {
  return (p.commuteMinutesPerDay / 60) * p.daysPerWeek * workWeeksPerYear(p);
}

export function yearlyEarnings(p: Profile): number {
  return p.hourlyWage * workHoursPerYear(p);
}

/**
 * Echte uurloon: je loon gedeeld door werkuren + reisuren.
 * Zonder reistijd is dit gelijk aan het gewone uurloon.
 */
export function realHourlyWage(p: Profile): number {
  const work = workHoursPerYear(p);
  const total = work + commuteHoursPerYear(p);
  if (total <= 0) return 0;
  return (p.hourlyWage * work) / total;
}

/** Het uurloon waarmee werktijd wordt uitgerekend. */
export function effectiveHourlyWage(p: Profile): number {
  return p.useRealWage ? realHourlyWage(p) : p.hourlyWage;
}

export function isProfileComplete(p: Profile): boolean {
  return p.hourlyWage > 0 && p.hoursPerWeek > 0 && p.daysPerWeek > 0;
}

/** Aantal uren werk voor een bedrag. Null als het profiel nog niet compleet is. */
export function hoursForAmount(amount: number, p: Profile): number | null {
  const wage = effectiveHourlyWage(p);
  if (!isProfileComplete(p) || wage <= 0) return null;
  return amount / wage;
}
