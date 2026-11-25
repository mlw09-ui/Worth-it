import { sanitizeState } from './storage';
import type { AppState } from './types';

export const BACKUP_APP = 'worth-it';

/** JSON-backup met wat metadata erbij. */
export function buildBackup(state: AppState, now = new Date()): string {
  return JSON.stringify({ app: BACKUP_APP, exportedAt: now.toISOString(), data: state }, null, 2);
}

export function backupFileName(now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `worth-it-backup-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.json`;
}

export type ParseResult = { ok: true; state: AppState } | { ok: false; error: string };

/** Leest een backup. Accepteert ook een kale state (zonder metadata). */
export function parseBackup(text: string): ParseResult {
  if (text.length > 5_000_000) return { ok: false, error: 'Dit bestand is te groot voor een Worth It-backup.' };
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: 'Dit is geen geldig JSON-bestand.' };
  }
  if (!raw || typeof raw !== 'object') return { ok: false, error: 'Dit bestand bevat geen Worth It-gegevens.' };
  const r = raw as Record<string, unknown>;
  const data = r.app === BACKUP_APP && r.data ? r.data : r;
  if (!data || typeof data !== 'object' || !('profile' in data || 'expenses' in data || 'incomes' in data || 'cart' in data)) {
    return { ok: false, error: 'Dit bestand bevat geen Worth It-gegevens.' };
  }
  return { ok: true, state: sanitizeState(data) };
}
