const euroFmt = new Intl.NumberFormat('nl-NL', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** "€ 1.234,56", met een harde spatie zodat € en bedrag nooit over twee regels breken. */
export function formatEuro(amount: number): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  // Voorkom "€ -0,00".
  const rounded = Math.round(safe * 100) / 100 || 0;
  return euroFmt.format(rounded).replace(/\s| /g, ' ');
}

/** Getal in Nederlandse notatie met maximaal `decimals` decimalen: 1.234,5 */
export function formatNumber(n: number, decimals = 1): string {
  return new Intl.NumberFormat('nl-NL', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  })
    .format(Number.isFinite(n) ? n : 0)
    .replace(/ | /g, ' ');
}

/**
 * Leest een bedrag of getal zoals mensen het typen:
 * "11,99", "1.234,56", "€ 12", "11.99", "1.234" (= duizend tweehonderd vierendertig).
 * Geeft null bij ongeldige invoer.
 */
export function parseAmount(input: string): number | null {
  let s = input.trim().replace(/[€\s ]/g, '');
  if (s === '') return null;
  const negative = s.startsWith('-');
  if (negative) s = s.slice(1);

  if (s.includes(',')) {
    // Nederlandse notatie: punten zijn duizendtallen, komma is decimaal.
    s = s.replace(/\./g, '').replace(',', '.');
  } else {
    const dots = (s.match(/\./g) ?? []).length;
    if (dots > 1 || /^\d{1,3}\.\d{3}$/.test(s)) {
      // "1.234.567" of "1.234": duizendtallen.
      s = s.replace(/\./g, '');
    }
    // Anders: "11.99" is een decimaal (telefoontoetsenbord).
  }

  if (!/^\d*\.?\d*$/.test(s) || s === '.' || s === '') return null;
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return negative ? -n : n;
}

/** "1u 12m", "45m", "3u". Voor kleine bedragen "< 1m". */
export function formatHoursMinutes(hours: number): string {
  if (!Number.isFinite(hours) || hours <= 0) return '0m';
  let totalMinutes = Math.round(hours * 60);
  if (totalMinutes === 0) return '< 1m';
  const h = Math.floor(totalMinutes / 60);
  totalMinutes -= h * 60;
  if (h === 0) return `${totalMinutes}m`;
  if (totalMinutes === 0) return `${formatNumber(h, 0)}u`;
  return `${formatNumber(h, 0)}u ${totalMinutes}m`;
}

export interface WorkRhythm {
  hoursPerDay: number;
  hoursPerWeek: number;
}

function unit(n: number, singular: string, plural: string): string {
  const rounded = Math.round(n * 10) / 10;
  return `${formatNumber(rounded, 1)} ${rounded === 1 ? singular : plural}`;
}

/**
 * Werktijd slim geformatteerd, op basis van iemands eigen werkritme:
 * minuten → uren → werkdagen → werkweken.
 * - minder dan een werkdag:   "45m", "3u 20m"
 * - minder dan een werkweek:  "2,5 werkdagen"
 * - daarboven:                "2,3 werkweken"
 */
export function formatWorkTime(hours: number, rhythm: WorkRhythm): string {
  if (!Number.isFinite(hours) || hours <= 0) return '0m';
  const { hoursPerDay, hoursPerWeek } = rhythm;
  if (hoursPerDay <= 0 || hoursPerWeek <= 0 || hours < hoursPerDay) {
    return formatHoursMinutes(hours);
  }
  if (hours < hoursPerWeek) {
    return unit(hours / hoursPerDay, 'werkdag', 'werkdagen');
  }
  return unit(hours / hoursPerWeek, 'werkweek', 'werkweken');
}

/** Procentnotatie: "12,5%". */
export function formatPercent(fraction: number, decimals = 0): string {
  return `${formatNumber(fraction * 100, decimals)}%`;
}
