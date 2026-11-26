import { describe, expect, it } from 'vitest';
import {
  allowancePerMonth,
  choresFor,
  dateAfterWeeks,
  kidDuration,
  moneyPerMonth,
  moneyPerWeek,
  moneyTimeFor,
  weeksUntilAffordable,
} from './kids';
import { DEFAULT_KID } from './storage';
import type { KidMoney } from './types';

const kid = (over: Partial<KidMoney> = {}): KidMoney => ({ ...DEFAULT_KID, ...over });

describe('geld per maand', () => {
  it('zakgeld per maand blijft gelijk', () => {
    expect(allowancePerMonth(kid({ allowance: 20 }))).toBe(20);
  });

  it('zakgeld per week × 52 / 12', () => {
    expect(allowancePerMonth(kid({ allowance: 3, allowanceFrequency: 'week' }))).toBe(13);
  });

  it('zakgeld + klusjes', () => {
    expect(moneyPerMonth(kid({ allowance: 20, choreRate: 2, choresPerMonth: 5 }))).toBe(30);
  });

  it('per week = per maand × 12 / 52', () => {
    expect(moneyPerWeek(kid({ allowance: 26 }))).toBeCloseTo(6, 10);
  });
});

describe('choresFor', () => {
  it('rondt naar boven af', () => {
    expect(choresFor(10, kid({ choreRate: 2 }))).toBe(5);
    expect(choresFor(11, kid({ choreRate: 2 }))).toBe(6);
    expect(choresFor(0.3, kid({ choreRate: 0.1 }))).toBe(3);
  });

  it('null zonder bedrag per klusje', () => {
    expect(choresFor(10, kid())).toBeNull();
  });
});

describe('kidDuration', () => {
  it.each([
    [0.5, 'minder dan een week'],
    [1, '1 week'],
    [1.3, '1 week'],
    [3.4, 'ongeveer 3 weken'],
    [7.9, 'ongeveer 8 weken'],
    [17, 'ongeveer 4 maanden'],
    [104, 'ongeveer 2 jaar'],
  ])('%d weken → "%s"', (weeks, text) => {
    expect(kidDuration(weeks)).toBe(text);
  });
});

describe('moneyTimeFor', () => {
  it('prijs in weken geld', () => {
    // € 26 per maand = € 6 per week
    expect(moneyTimeFor(18, kid({ allowance: 26 }))).toBe('ongeveer 3 weken');
  });

  it('null zonder geld per maand', () => {
    expect(moneyTimeFor(18, kid())).toBeNull();
  });
});

describe('weeksUntilAffordable', () => {
  const k = kid({ allowance: 26 }); // € 6 per week

  it('weken sparen, naar boven afgerond', () => {
    expect(weeksUntilAffordable(30, k)).toBe(5);
    expect(weeksUntilAffordable(31, k)).toBe(6);
  });

  it('telt de spaarpot mee', () => {
    expect(weeksUntilAffordable(30, { ...k, savings: 18 })).toBe(2);
    expect(weeksUntilAffordable(30, { ...k, savings: 40 })).toBe(0);
  });

  it('vaste kosten per maand gaan eraf', () => {
    // € 26 − € 13 = € 13 per maand = € 3 per week
    expect(weeksUntilAffordable(30, k, 13)).toBe(10);
  });

  it('null als er niets overblijft', () => {
    expect(weeksUntilAffordable(30, kid())).toBeNull();
    expect(weeksUntilAffordable(30, k, 26)).toBeNull();
  });
});

describe('dateAfterWeeks', () => {
  it('zelfde jaar zonder jaartal, anders met', () => {
    const today = new Date(2026, 10, 26);
    expect(dateAfterWeeks(2, today)).toBe('10 december');
    expect(dateAfterWeeks(6, today)).toBe('7 januari 2027');
  });
});
