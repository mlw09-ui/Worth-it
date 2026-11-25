import { describe, expect, it } from 'vitest';
import {
  commuteHoursPerYear,
  effectiveHourlyWage,
  hoursForAmount,
  hoursPerDay,
  realHourlyWage,
  toMonthly,
  toYearly,
  workHoursPerMonth,
  workHoursPerYear,
} from './calc';
import type { Profile } from './types';
import { DEFAULT_PROFILE } from './storage';

const profile = (over: Partial<Profile> = {}): Profile => ({
  ...DEFAULT_PROFILE,
  hourlyWage: 20,
  ...over,
});

describe('omrekenen naar jaar en maand', () => {
  it('gebruikt vaste factoren: dag 365, week 52, maand 12, kwartaal 4, jaar 1', () => {
    expect(toYearly(10, 'dag')).toBe(3650);
    expect(toYearly(10, 'week')).toBe(520);
    expect(toYearly(10, 'maand')).toBe(120);
    expect(toYearly(10, 'kwartaal')).toBe(40);
    expect(toYearly(10, 'jaar')).toBe(10);
  });

  it('maand = jaar / 12', () => {
    expect(toMonthly(10, 'dag')).toBeCloseTo(304.1667, 4);
    expect(toMonthly(10, 'week')).toBeCloseTo(43.3333, 4);
    expect(toMonthly(11.99, 'maand')).toBeCloseTo(11.99, 10);
    expect(toMonthly(30, 'kwartaal')).toBe(10);
    expect(toMonthly(120, 'jaar')).toBe(10);
  });

  it('eenmalig telt niet mee in maand- of jaarbudget', () => {
    expect(toYearly(999, 'eenmalig')).toBe(0);
    expect(toMonthly(999, 'eenmalig')).toBe(0);
  });

  it('houdt rekening met aantal keer per periode', () => {
    // 3× per week een koffie van € 4
    expect(toYearly(4, 'week', 3)).toBe(624);
    expect(toMonthly(4, 'week', 3)).toBe(52);
  });
});

describe('werkuren uit profiel', () => {
  it('werkuren per jaar = uren per week × (52 − vakantieweken)', () => {
    expect(workHoursPerYear(profile())).toBe(40 * 48);
    expect(workHoursPerYear(profile({ hoursPerWeek: 32, vacationWeeks: 6 }))).toBe(32 * 46);
  });

  it('gemiddelde per maand = jaar / 12', () => {
    expect(workHoursPerMonth(profile())).toBe(160);
  });

  it('uren per dag = uren per week / dagen per week', () => {
    expect(hoursPerDay(profile({ hoursPerWeek: 36, daysPerWeek: 4 }))).toBe(9);
    expect(hoursPerDay(profile({ daysPerWeek: 0 }))).toBe(0);
  });
});

describe('echte uurloon met reistijd', () => {
  it('zonder reistijd is het echte uurloon gelijk aan het uurloon', () => {
    expect(realHourlyWage(profile())).toBe(20);
  });

  it('deelt het loon door werkuren + reisuren', () => {
    const p = profile({ commuteMinutesPerDay: 60 }); // 1 uur per dag, 5 dagen, 48 weken
    expect(commuteHoursPerYear(p)).toBe(240);
    // 20 × 1920 / (1920 + 240)
    expect(realHourlyWage(p)).toBeCloseTo(17.7778, 4);
  });

  it('gebruikt het echte uurloon alleen als dat aan staat', () => {
    const p = profile({ commuteMinutesPerDay: 60 });
    expect(effectiveHourlyWage(p)).toBe(20);
    expect(effectiveHourlyWage({ ...p, useRealWage: true })).toBeCloseTo(17.7778, 4);
  });
});

describe('werktijd voor een bedrag', () => {
  it('bedrag / uurloon', () => {
    expect(hoursForAmount(50, profile())).toBe(2.5);
  });

  it('geeft null als het profiel niet compleet is', () => {
    expect(hoursForAmount(50, profile({ hourlyWage: 0 }))).toBeNull();
    expect(hoursForAmount(50, profile({ hoursPerWeek: 0 }))).toBeNull();
  });
});
