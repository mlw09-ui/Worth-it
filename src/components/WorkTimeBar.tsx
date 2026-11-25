import { useState } from 'react';
import { CATEGORY_LABEL, paidHoursPerMonth, workTimeSlices, type CategoryTotal } from '../lib/budget';
import { formatPercent, formatWorkTime } from '../lib/format';
import { hoursPerDay } from '../lib/calc';
import type { Profile } from '../lib/types';

interface Props {
  byCategory: CategoryTotal[];
  profile: Profile;
}

/**
 * Eén gestapelde balk = je werkmaand. Elk segment is een categorie, het grijze deel is
 * werktijd die niet naar vaste uitgaven gaat. De tabel eronder is legenda en datatabel tegelijk.
 */
export function WorkTimeBar({ byCategory, profile }: Props) {
  const [active, setActive] = useState<string | null>(null);
  const slices = workTimeSlices(byCategory, profile);
  const rhythm = { hoursPerDay: hoursPerDay(profile), hoursPerWeek: profile.hoursPerWeek };
  const worked = paidHoursPerMonth(profile);
  const spent = slices.filter((s) => s.key !== 'vrij').reduce((sum, s) => sum + s.hours, 0);
  const over = spent > worked;

  const label = (key: string) => (key === 'vrij' ? 'Niet vastgelegd' : CATEGORY_LABEL[key as keyof typeof CATEGORY_LABEL]);
  const activeSlice = slices.find((s) => s.key === active);

  return (
    <div className="wtb">
      <p className="wtb-lead">
        <strong>{formatWorkTime(spent, rhythm)}</strong> van je {formatWorkTime(worked, rhythm)} werk per maand gaat naar vaste uitgaven
        {worked > 0 && <> ({formatPercent(spent / worked)})</>}.
      </p>
      {over && <p className="wtb-warning">Je uitgaven kosten meer werktijd dan je per maand werkt.</p>}

      <div className="wtb-readout" aria-hidden="true">
        {activeSlice ? (
          <>
            <strong>{label(activeSlice.key)}</strong> · {formatWorkTime(activeSlice.hours, rhythm)} per maand ·{' '}
            {formatPercent(worked > 0 ? activeSlice.hours / worked : activeSlice.share)}
          </>
        ) : (
          <span className="muted">Wijs een deel van de balk aan voor details</span>
        )}
      </div>

      <div className="wtb-bar" role="img" aria-label="Verdeling van je werktijd per maand; zie de tabel hieronder.">
        {slices.map((s) => (
          <div
            key={s.key}
            className={`wtb-seg${active && active !== s.key ? ' dim' : ''}`}
            style={{ flexGrow: s.share, background: `var(--cat-${s.key})` }}
            onMouseEnter={() => setActive(s.key)}
            onMouseLeave={() => setActive(null)}
            onClick={() => setActive((a) => (a === s.key ? null : s.key))}
          />
        ))}
      </div>

      <table className="wtb-table">
        <caption className="sr-only">Werktijd per categorie per maand</caption>
        <thead>
          <tr>
            <th scope="col">Categorie</th>
            <th scope="col">Werk per maand</th>
            <th scope="col">Deel</th>
          </tr>
        </thead>
        <tbody>
          {slices.map((s) => (
            <tr
              key={s.key}
              className={active === s.key ? 'active' : ''}
              onMouseEnter={() => setActive(s.key)}
              onMouseLeave={() => setActive(null)}
            >
              <th scope="row">
                <span className={`swatch${s.key === 'vrij' ? ' swatch-free' : ''}`} style={{ background: `var(--cat-${s.key})` }} aria-hidden="true" />
                {label(s.key)}
              </th>
              <td>{formatWorkTime(s.hours, rhythm)}</td>
              <td>{formatPercent(worked > 0 ? s.hours / worked : s.share)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
