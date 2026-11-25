import { describe, expect, it } from 'vitest';
import { buildBackup, backupFileName, parseBackup } from './backup';
import { summarizeBudget } from './budget';
import { runScenario, yearOverview } from './scenario';
import { DEFAULT_PROFILE, defaultState } from './storage';
import type { Expense, Profile } from './types';

const profile: Profile = { ...DEFAULT_PROFILE, hourlyWage: 10 };

const expenses: Expense[] = [
  { id: 'huur', name: 'Huur', amount: 900, category: 'wonen', frequency: 'maand' },
  { id: 'netflix', name: 'Netflix', amount: 12, category: 'abonnementen', frequency: 'maand' },
  { id: 'sport', name: 'Sportschool', amount: 30, category: 'abonnementen', frequency: 'maand' },
  { id: 'tv', name: 'Televisie', amount: 500, category: 'overig', frequency: 'eenmalig' },
];

describe('runScenario', () => {
  it('zonder wijzigingen: niets bespaard', () => {
    const r = runScenario(expenses, profile, 0, new Set())!;
    expect(r.baseHours).toBeCloseTo((900 + 42) * 12 / 10, 10); // eenmalig telt niet mee
    expect(r.savedHours).toBe(0);
  });

  it('€ 2 meer per uur: minder uren voor dezelfde uitgaven', () => {
    const r = runScenario(expenses, profile, 2, new Set())!;
    const yearly = 942 * 12;
    expect(r.newWage).toBe(12);
    expect(r.newHours).toBeCloseTo(yearly / 12, 10);
    expect(r.savedHours).toBeCloseTo(yearly / 10 - yearly / 12, 10);
  });

  it('abonnement opzeggen: bespaarde euro\'s en uren', () => {
    const r = runScenario(expenses, profile, 0, new Set(['netflix']))!;
    expect(r.savedEuros).toBe(144);
    expect(r.savedHours).toBeCloseTo(14.4, 10);
  });

  it('eenmalige uitgaven opzeggen doet niets', () => {
    expect(runScenario(expenses, profile, 0, new Set(['tv']))!.savedEuros).toBe(0);
  });

  it('combineert loonsverhoging en opzeggen', () => {
    const r = runScenario(expenses, profile, 1, new Set(['netflix', 'sport']))!;
    expect(r.newHours).toBeCloseTo((900 * 12) / 11, 10);
  });

  it('gebruikt het echte uurloon als dat aan staat', () => {
    const p = { ...profile, commuteMinutesPerDay: 60, useRealWage: true };
    const r = runScenario(expenses, p, 0, new Set())!;
    expect(r.baseWage).toBeCloseTo(10 * 1920 / 2160, 10);
  });

  it('null zonder compleet profiel of bij uurloon 0', () => {
    expect(runScenario(expenses, { ...profile, hourlyWage: 0 }, 2, new Set())).toBeNull();
    expect(runScenario(expenses, profile, -10, new Set())).toBeNull();
  });
});

describe('yearOverview', () => {
  it('werkuren per jaar per categorie, groot naar klein', () => {
    const { byCategory } = summarizeBudget([], expenses);
    const y = yearOverview(byCategory, profile);
    expect(y.map((c) => c.category)).toEqual(['wonen', 'abonnementen']);
    expect(y[1]).toEqual({ category: 'abonnementen', label: 'abonnementen', yearly: 504, hours: 50.4 });
  });
});

describe('backup', () => {
  it('export en import geven dezelfde gegevens terug', () => {
    const state = { ...defaultState(), profile, expenses };
    const r = parseBackup(buildBackup(state));
    expect(r).toEqual({ ok: true, state });
  });

  it('accepteert ook een kale state', () => {
    const r = parseBackup(JSON.stringify({ profile, expenses: [] }));
    expect(r.ok && r.state.profile.hourlyWage).toBe(10);
  });

  it('weigert ongeldige bestanden met een duidelijke melding', () => {
    expect(parseBackup('{kapot')).toEqual({ ok: false, error: 'Dit is geen geldig JSON-bestand.' });
    expect(parseBackup('{"foo": 1}')).toEqual({ ok: false, error: 'Dit bestand bevat geen Worth It-gegevens.' });
    expect(parseBackup('42').ok).toBe(false);
  });

  it('bestandsnaam met datum', () => {
    expect(backupFileName(new Date(2026, 10, 5))).toBe('worth-it-backup-2026-11-05.json');
  });
});
