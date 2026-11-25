import { useMemo } from 'react';
import { hoursForAmount, hoursPerDay } from './lib/calc';
import { formatWorkTime } from './lib/format';
import { useStore } from './state';

/** Rekent bedragen om naar werktijd met het profiel van de gebruiker. */
export function useWorkTime() {
  const { state } = useStore();
  const p = state.profile;
  return useMemo(() => {
    const rhythm = { hoursPerDay: hoursPerDay(p), hoursPerWeek: p.hoursPerWeek };
    return {
      rhythm,
      /** Uren werk voor een bedrag, of null als het profiel nog niet compleet is. */
      hours: (amount: number) => hoursForAmount(amount, p),
      /** "1u 12m", "2,5 werkdagen" of null. */
      format: (amount: number) => {
        const h = hoursForAmount(amount, p);
        return h === null ? null : formatWorkTime(h, rhythm);
      },
      formatHours: (h: number) => formatWorkTime(h, rhythm),
    };
  }, [p]);
}
