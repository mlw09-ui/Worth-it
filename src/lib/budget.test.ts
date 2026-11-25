import { describe, expect, it } from 'vitest';
import { paidHoursPerMonth, summarizeBudget, workTimeSlices } from './budget';
import { DEFAULT_PROFILE } from './storage';
import type { Expense, Income, Profile } from './types';

const profile: Profile = { ...DEFAULT_PROFILE, hourlyWage: 10 }; // 160 werkuren per maand

const income = (amount: number, frequency: Income['frequency'] = 'maand'): Income => ({
  id: String(Math.random()),
  name: 'x',
  amount,
  frequency,
});

const expense = (amount: number, category: Expense['category'], frequency: Expense['frequency'] = 'maand'): Expense => ({
  id: String(Math.random()),
  name: 'x',
  amount,
  category,
  frequency,
});

describe('summarizeBudget', () => {
  it('telt inkomsten en uitgaven op per maand en per jaar', () => {
    const s = summarizeBudget(
      [income(1600), income(1200, 'jaar')],
      [expense(800, 'wonen'), expense(25, 'eten', 'week'), expense(120, 'vervoer', 'kwartaal')],
    );
    expect(s.incomeYearly).toBe(1600 * 12 + 1200);
    expect(s.incomeMonthly).toBe(1700);
    expect(s.expensesYearly).toBe(800 * 12 + 25 * 52 + 120 * 4);
    expect(s.expensesMonthly).toBeCloseTo((9600 + 1300 + 480) / 12, 10);
    expect(s.leftoverMonthly).toBeCloseTo(1700 - 11380 / 12, 10);
  });

  it('houdt eenmalige uitgaven buiten het maandbudget', () => {
    const s = summarizeBudget([income(1000)], [expense(500, 'kleding', 'eenmalig'), expense(100, 'kleding')]);
    expect(s.expensesMonthly).toBe(100);
    expect(s.oneOffTotal).toBe(500);
    expect(s.byCategory).toEqual([{ category: 'kleding', monthly: 100, yearly: 1200, count: 1 }]);
  });

  it('geeft categorieën in vaste volgorde en laat lege weg', () => {
    const s = summarizeBudget([], [expense(10, 'overig'), expense(20, 'wonen'), expense(5, 'eten', 'eenmalig')]);
    expect(s.byCategory.map((c) => c.category)).toEqual(['wonen', 'overig']);
  });

  it('kan een tekort tonen', () => {
    const s = summarizeBudget([income(500)], [expense(800, 'wonen')]);
    expect(s.leftoverMonthly).toBe(-300);
  });
});

describe('werktijd per categorie', () => {
  it('betaalde uren per maand = werkuren per maand', () => {
    expect(paidHoursPerMonth(profile)).toBe(160);
  });

  it('telt reistijd mee bij het echte uurloon', () => {
    const p = { ...profile, commuteMinutesPerDay: 60, useRealWage: true };
    expect(paidHoursPerMonth(p)).toBeCloseTo(180, 10); // (1920 + 240) / 12
  });

  it('verdeelt de maand over categorieën plus vrije tijd', () => {
    const { byCategory } = summarizeBudget([], [expense(800, 'wonen'), expense(160, 'eten')]);
    const slices = workTimeSlices(byCategory, profile);
    expect(slices).toEqual([
      { key: 'wonen', hours: 80, share: 0.5 },
      { key: 'eten', hours: 16, share: 0.1 },
      { key: 'vrij', hours: 64, share: 0.4 },
    ]);
  });

  it('bij te veel uitgaven is de balk het totaal van de uitgaven', () => {
    const { byCategory } = summarizeBudget([], [expense(2400, 'wonen'), expense(800, 'eten')]);
    const slices = workTimeSlices(byCategory, profile);
    expect(slices.map((s) => s.key)).toEqual(['wonen', 'eten']);
    expect(slices[0].share).toBe(0.75);
  });

  it('geeft niets zonder compleet profiel', () => {
    const { byCategory } = summarizeBudget([], [expense(100, 'wonen')]);
    expect(workTimeSlices(byCategory, { ...profile, hourlyWage: 0 })).toEqual([]);
  });
});
