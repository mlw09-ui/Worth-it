import type { AppState, CartItem, Category, Expense, Frequency, Income, Profile, ThemePref } from './types';

export const STORAGE_KEY = 'worth-it:v1';

export const DEFAULT_PROFILE: Profile = {
  hourlyWage: 0,
  wageType: 'netto',
  hoursPerWeek: 40,
  daysPerWeek: 5,
  vacationWeeks: 4,
  commuteMinutesPerDay: 0,
  useRealWage: false,
};

export function defaultState(): AppState {
  return {
    version: 1,
    profile: { ...DEFAULT_PROFILE },
    incomes: [],
    expenses: [],
    cart: [],
    theme: 'system',
  };
}

function num(v: unknown, fallback: number, min: number, max: number): number {
  return typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max ? v : fallback;
}

const FREQS: readonly Frequency[] = ['eenmalig', 'dag', 'week', 'maand', 'kwartaal', 'jaar'];
const CATS: readonly Category[] = ['wonen', 'eten', 'vervoer', 'abonnementen', 'kleding', 'uitgaan', 'sparen', 'overig'];
const MAX_AMOUNT = 100_000_000;

export function newId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  }
}

function list<T>(raw: unknown, fn: (item: Record<string, unknown>) => T | null): T[] {
  if (!Array.isArray(raw)) return [];
  const out: T[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const clean = fn(item as Record<string, unknown>);
    if (!clean) continue;
    const withId = clean as T & { id: string };
    if (seen.has(withId.id)) withId.id = newId();
    seen.add(withId.id);
    out.push(clean);
  }
  return out;
}

function str(v: unknown, max = 80): string {
  return typeof v === 'string' ? v.trim().slice(0, max) : '';
}

function sanitizeIncome(i: Record<string, unknown>): Income | null {
  const amount = num(i.amount, NaN, 0, MAX_AMOUNT);
  if (Number.isNaN(amount)) return null;
  return {
    id: str(i.id, 64) || newId(),
    name: str(i.name) || 'Inkomen',
    amount,
    frequency: FREQS.includes(i.frequency as Frequency) ? (i.frequency as Frequency) : 'maand',
  };
}

function sanitizeExpense(e: Record<string, unknown>): Expense | null {
  const amount = num(e.amount, NaN, 0, MAX_AMOUNT);
  if (Number.isNaN(amount)) return null;
  return {
    id: str(e.id, 64) || newId(),
    name: str(e.name) || 'Uitgave',
    amount,
    category: CATS.includes(e.category as Category) ? (e.category as Category) : 'overig',
    frequency: FREQS.includes(e.frequency as Frequency) ? (e.frequency as Frequency) : 'maand',
  };
}

function sanitizeCartItem(c: Record<string, unknown>): CartItem | null {
  const price = num(c.price, NaN, 0, MAX_AMOUNT);
  if (Number.isNaN(price)) return null;
  const budgetId = str(c.budgetExpenseId, 64);
  return {
    id: str(c.id, 64) || newId(),
    name: str(c.name) || 'Item',
    price,
    frequency: FREQS.includes(c.frequency as Frequency) ? (c.frequency as Frequency) : 'eenmalig',
    times: Math.round(num(c.times, 1, 1, 1000)),
    selected: c.selected !== false,
    category: CATS.includes(c.category as Category) ? (c.category as Category) : 'overig',
    ...(budgetId ? { budgetExpenseId: budgetId } : {}),
  };
}

/** Maakt van onbekende (opgeslagen of geïmporteerde) data een geldige state. */
export function sanitizeState(raw: unknown): AppState {
  const base = defaultState();
  if (!raw || typeof raw !== 'object') return base;
  const r = raw as Record<string, unknown>;
  const p = (r.profile && typeof r.profile === 'object' ? r.profile : {}) as Record<string, unknown>;
  const d = DEFAULT_PROFILE;

  const profile: Profile = {
    hourlyWage: num(p.hourlyWage, d.hourlyWage, 0, 100_000),
    wageType: p.wageType === 'bruto' ? 'bruto' : 'netto',
    hoursPerWeek: num(p.hoursPerWeek, d.hoursPerWeek, 0, 168),
    daysPerWeek: num(p.daysPerWeek, d.daysPerWeek, 0, 7),
    vacationWeeks: num(p.vacationWeeks, d.vacationWeeks, 0, 51),
    commuteMinutesPerDay: num(p.commuteMinutesPerDay, d.commuteMinutesPerDay, 0, 1440),
    useRealWage: p.useRealWage === true,
  };

  const theme: ThemePref = r.theme === 'light' || r.theme === 'dark' ? r.theme : 'system';

  return {
    ...base,
    profile,
    incomes: list(r.incomes, sanitizeIncome),
    expenses: list(r.expenses, sanitizeExpense),
    cart: list(r.cart, sanitizeCartItem),
    theme,
  };
}

export function loadState(): AppState {
  try {
    const json = localStorage.getItem(STORAGE_KEY);
    if (!json) return defaultState();
    return sanitizeState(JSON.parse(json));
  } catch {
    return defaultState();
  }
}

export function saveState(state: AppState): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}
