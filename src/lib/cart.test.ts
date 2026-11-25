import { describe, expect, it } from 'vitest';
import {
  describeFrequency,
  formatWeeks,
  humanComparison,
  itemMonthly,
  lastWorkday,
  summarizeCart,
  weeksToSave,
  type ComparisonContext,
} from './cart';
import type { CartItem } from './types';

const item = (over: Partial<CartItem>): CartItem => ({
  id: String(Math.random()),
  name: 'x',
  price: 10,
  frequency: 'eenmalig',
  times: 1,
  selected: true,
  category: 'overig',
  ...over,
});

describe('summarizeCart', () => {
  it('telt alleen geselecteerde items', () => {
    const s = summarizeCart([item({ price: 100 }), item({ price: 50, selected: false })]);
    expect(s.count).toBe(1);
    expect(s.oneOffTotal).toBe(100);
  });

  it('splitst eenmalig en terugkerend, met aantal keer', () => {
    const s = summarizeCart([
      item({ price: 250, times: 2 }), // 2 tickets
      item({ price: 4, frequency: 'week', times: 3 }), // 3× per week koffie
      item({ price: 12.99, frequency: 'maand' }),
    ]);
    expect(s.oneOffTotal).toBe(500);
    expect(s.recurringYearly).toBeCloseTo(4 * 3 * 52 + 12.99 * 12, 10);
    expect(s.recurringMonthly).toBeCloseTo((624 + 155.88) / 12, 10);
  });

  it('aantal keer onder 1 telt als 1', () => {
    expect(summarizeCart([item({ price: 10, times: 0 })]).oneOffTotal).toBe(10);
  });

  it('maandbedrag van één item', () => {
    expect(itemMonthly({ price: 4, frequency: 'week', times: 3 })).toBe(52);
  });
});

describe('describeFrequency', () => {
  it('beschrijft frequentie en aantal', () => {
    expect(describeFrequency('week', 3)).toBe('3× per week');
    expect(describeFrequency('maand', 1)).toBe('per maand');
    expect(describeFrequency('eenmalig', 1)).toBe('eenmalig');
    expect(describeFrequency('eenmalig', 2)).toBe('2× eenmalig');
  });
});

describe('humanComparison', () => {
  // 40 uur, 5 dagen, 48 werkweken
  const ctx: ComparisonContext = { hoursPerDay: 8, hoursPerWeek: 40, daysPerWeek: 5, workWeeksPerYear: 48 };

  it.each([
    [0.1, 'Minder dan een kwartiertje werk'],
    [0.5, 'Minder dan een uur werk'],
    [2, 'Een paar uur van je werkdag'],
    [4, 'Ongeveer een halve werkdag: een ochtend werken'],
    [6.5, 'Bijna een hele werkdag'],
    [7.5, 'Bijna je hele vrijdag'],
    [8, 'Dit is je hele vrijdag'],
    [16, 'Je hele maandag en dinsdag'],
    [12, 'Meer dan een hele werkdag'],
    [18, 'Bijna een halve werkweek'],
    [22, 'Ruim een halve werkweek'],
    [30, 'Het grootste deel van een werkweek'],
    [36.4, 'Bijna een hele werkweek'],
    [40, 'Een hele werkweek'],
    [100, 'Ruim 2 werkweken'],
    [160, 'Ongeveer een maand werken'],
    [400, 'Ruim 2 maanden werken'],
    [1920, 'Ongeveer een heel jaar werken'],
    [5000, 'Meer dan 2 jaar werken'],
  ])('%d uur → "%s"', (hours, expected) => {
    expect(humanComparison(hours, ctx)).toBe(expected);
  });

  it('noemt de laatste werkdag van iemands eigen week', () => {
    const fourDays = { ...ctx, hoursPerDay: 9, hoursPerWeek: 36, daysPerWeek: 4 };
    expect(humanComparison(9, fourDays)).toBe('Dit is je hele donderdag');
    expect(humanComparison(27, fourDays)).toBe('Je hele maandag tot en met woensdag');
  });

  it('geeft niets zonder werkritme of bij 0', () => {
    expect(humanComparison(0, ctx)).toBe('');
    expect(humanComparison(5, { ...ctx, hoursPerDay: 0 })).toBe('');
  });

  it('lastWorkday', () => {
    expect(lastWorkday(5)).toBe('vrijdag');
    expect(lastWorkday(4.5)).toBe('vrijdag');
    expect(lastWorkday(3)).toBe('woensdag');
    expect(lastWorkday(0)).toBe('maandag');
  });
});

describe('sparen', () => {
  it('weken sparen = bedrag / (overschot per maand × 12 / 52), naar boven afgerond', () => {
    // € 520/maand over = € 120 per week
    expect(weeksToSave(600, 520)).toBe(5);
    expect(weeksToSave(601, 520)).toBe(6);
  });

  it('null zonder overschot', () => {
    expect(weeksToSave(100, 0)).toBeNull();
    expect(weeksToSave(100, -50)).toBeNull();
  });

  it('formatWeeks', () => {
    expect(formatWeeks(1)).toBe('1 week');
    expect(formatWeeks(5)).toBe('5 weken');
    expect(formatWeeks(13)).toBe('ongeveer 3 maanden');
    expect(formatWeeks(130)).toBe('ruim 2 jaar');
  });
});
