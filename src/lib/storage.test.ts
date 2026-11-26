import { describe, expect, it } from 'vitest';
import { DEFAULT_PROFILE, defaultState, sanitizeState } from './storage';

describe('sanitizeState', () => {
  it('geeft standaardwaarden bij onbruikbare data', () => {
    expect(sanitizeState(null)).toEqual(defaultState());
    expect(sanitizeState('kapot')).toEqual(defaultState());
  });

  it('standaard: netto en 4 vakantieweken', () => {
    expect(DEFAULT_PROFILE.wageType).toBe('netto');
    expect(DEFAULT_PROFILE.vacationWeeks).toBe(4);
  });

  it('behoudt geldige waarden en vervangt ongeldige', () => {
    const s = sanitizeState({
      profile: { hourlyWage: 18.5, wageType: 'bruto', hoursPerWeek: -3, daysPerWeek: 9, vacationWeeks: 'veel' },
      theme: 'dark',
      expenses: 'geen lijst',
    });
    expect(s.profile.hourlyWage).toBe(18.5);
    expect(s.profile.wageType).toBe('bruto');
    expect(s.profile.hoursPerWeek).toBe(DEFAULT_PROFILE.hoursPerWeek);
    expect(s.profile.daysPerWeek).toBe(DEFAULT_PROFILE.daysPerWeek);
    expect(s.profile.vacationWeeks).toBe(DEFAULT_PROFILE.vacationWeeks);
    expect(s.theme).toBe('dark');
    expect(s.expenses).toEqual([]);
  });

  it('valideert inkomsten en uitgaven per item', () => {
    const s = sanitizeState({
      incomes: [{ id: 'a', name: 'Salaris', amount: 1600, frequency: 'maand' }, { amount: 'veel' }, null],
      expenses: [
        { id: 'b', name: '  Huur  ', amount: 800, category: 'wonen', frequency: 'maand' },
        { id: 'b', amount: 5, category: 'raar', frequency: 'soms' },
        { amount: -10 },
      ],
    });
    expect(s.incomes).toEqual([{ id: 'a', name: 'Salaris', amount: 1600, frequency: 'maand' }]);
    expect(s.expenses).toHaveLength(2);
    expect(s.expenses[0]).toEqual({ id: 'b', name: 'Huur', amount: 800, category: 'wonen', frequency: 'maand' });
    expect(s.expenses[1]).toMatchObject({ name: 'Uitgave', amount: 5, category: 'overig', frequency: 'maand' });
    expect(s.expenses[1].id).not.toBe('b');
  });

  it('standaard in werkmodus, met leeg zakgeld', () => {
    const s = sanitizeState({});
    expect(s.mode).toBe('werk');
    expect(s.kid).toEqual({ allowance: 0, allowanceFrequency: 'maand', choreRate: 0, choresPerMonth: 0, savings: 0 });
  });

  it('valideert de zakgeldmodus', () => {
    const s = sanitizeState({
      mode: 'zakgeld',
      kid: { allowance: 5, allowanceFrequency: 'week', choreRate: 'veel', choresPerMonth: 4, savings: -3 },
    });
    expect(s.mode).toBe('zakgeld');
    expect(s.kid).toEqual({ allowance: 5, allowanceFrequency: 'week', choreRate: 0, choresPerMonth: 4, savings: 0 });
    expect(sanitizeState({ mode: 'raar' }).mode).toBe('werk');
  });

  it('valideert het winkelmandje', () => {
    const s = sanitizeState({
      cart: [
        { id: 'c', name: 'Koffie', price: 3.5, frequency: 'week', times: 3, selected: false, category: 'eten', budgetExpenseId: 'e1' },
        { price: 20, times: 9999 },
        { name: 'kapot' },
      ],
    });
    expect(s.cart).toHaveLength(2);
    expect(s.cart[0]).toEqual({ id: 'c', name: 'Koffie', price: 3.5, frequency: 'week', times: 3, selected: false, category: 'eten', budgetExpenseId: 'e1' });
    expect(s.cart[1]).toMatchObject({ name: 'Item', price: 20, frequency: 'eenmalig', times: 1, selected: true, category: 'overig' });
  });
});
