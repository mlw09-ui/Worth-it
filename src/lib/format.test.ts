import { describe, expect, it } from 'vitest';
import {
  formatEuro,
  formatHoursMinutes,
  formatNumber,
  formatPercent,
  formatWorkTime,
  parseAmount,
} from './format';

describe('formatEuro', () => {
  // Leesbaar vergelijken: harde spatie → gewone spatie.
  const eur = (n: number) => formatEuro(n).replace(/ /g, ' ');

  it('gebruikt Nederlandse notatie', () => {
    expect(eur(1234.56)).toBe('€ 1.234,56');
    expect(eur(11.99)).toBe('€ 11,99');
    expect(eur(1_000_000)).toBe('€ 1.000.000,00');
    expect(eur(0)).toBe('€ 0,00');
  });

  it('gebruikt een harde spatie, zodat € en bedrag bij elkaar blijven', () => {
    expect(formatEuro(5)).toBe('€ 5,00');
  });

  it('rondt af op centen en toont nooit "-0,00"', () => {
    expect(eur(2.005)).toMatch(/^€ 2,0[01]$/);
    expect(eur(-0.001)).toBe('€ 0,00');
  });

  it('kan negatieve bedragen tonen', () => {
    expect(eur(-12.5)).toBe('€ -12,50');
  });

  it('valt terug op 0 bij ongeldige getallen', () => {
    expect(eur(NaN)).toBe('€ 0,00');
  });
});

describe('formatNumber en formatPercent', () => {
  it('gebruikt komma als decimaalteken en punt voor duizendtallen', () => {
    expect(formatNumber(1920)).toBe('1.920');
    expect(formatNumber(2.34)).toBe('2,3');
    expect(formatNumber(2.0)).toBe('2');
    expect(formatPercent(0.111)).toBe('11%');
    expect(formatPercent(0.1111, 1)).toBe('11,1%');
  });
});

describe('parseAmount', () => {
  it.each([
    ['11,99', 11.99],
    ['1.234,56', 1234.56],
    ['€ 12', 12],
    ['€12,50', 12.5],
    ['11.99', 11.99],
    ['1.234', 1234],
    ['1.234.567', 1234567],
    ['0,5', 0.5],
    [',5', 0.5],
    ['  42  ', 42],
    ['-3,5', -3.5],
  ])('leest "%s" als %d', (input, expected) => {
    expect(parseAmount(input)).toBeCloseTo(expected, 10);
  });

  it.each(['', 'abc', '1,2,3', '12a', '.', '€'])('geeft null bij "%s"', (input) => {
    expect(parseAmount(input)).toBeNull();
  });
});

describe('formatHoursMinutes', () => {
  it('€ 11,99 bij € 10/uur = 1u 12m', () => {
    expect(formatHoursMinutes(11.99 / 10)).toBe('1u 12m');
  });

  it('toont minuten, hele uren en combinaties', () => {
    expect(formatHoursMinutes(0.75)).toBe('45m');
    expect(formatHoursMinutes(3)).toBe('3u');
    expect(formatHoursMinutes(2.5)).toBe('2u 30m');
    expect(formatHoursMinutes(1234)).toBe('1.234u');
  });

  it('rondt af naar het dichtstbijzijnde hele minuut, zonder "60m"', () => {
    expect(formatHoursMinutes(1.9999)).toBe('2u');
  });

  it('heel kleine bedragen worden "< 1m", nul of negatief "0m"', () => {
    expect(formatHoursMinutes(0.005)).toBe('< 1m');
    expect(formatHoursMinutes(0)).toBe('0m');
    expect(formatHoursMinutes(-1)).toBe('0m');
  });
});

describe('formatWorkTime', () => {
  const fulltime = { hoursPerDay: 8, hoursPerWeek: 40 };
  const parttime = { hoursPerDay: 6, hoursPerWeek: 24 };

  it('minder dan een werkdag: uren en minuten', () => {
    expect(formatWorkTime(0.75, fulltime)).toBe('45m');
    expect(formatWorkTime(3.5, fulltime)).toBe('3u 30m');
  });

  it('minder dan een werkweek: werkdagen', () => {
    expect(formatWorkTime(8, fulltime)).toBe('1 werkdag');
    expect(formatWorkTime(20, fulltime)).toBe('2,5 werkdagen');
  });

  it('daarboven: werkweken', () => {
    expect(formatWorkTime(40, fulltime)).toBe('1 werkweek');
    expect(formatWorkTime(92, fulltime)).toBe('2,3 werkweken');
  });

  it('gaat uit van het eigen werkritme', () => {
    expect(formatWorkTime(7, parttime)).toBe('1,2 werkdagen');
    expect(formatWorkTime(12, parttime)).toBe('2 werkdagen');
    expect(formatWorkTime(48, parttime)).toBe('2 werkweken');
  });

  it('valt terug op uren als het werkritme onbekend is', () => {
    expect(formatWorkTime(50, { hoursPerDay: 0, hoursPerWeek: 0 })).toBe('50u');
  });
});
