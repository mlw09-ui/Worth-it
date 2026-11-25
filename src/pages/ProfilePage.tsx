import { NumberField } from '../components/NumberField';
import {
  commuteHoursPerYear,
  hoursForAmount,
  hoursPerDay,
  isProfileComplete,
  realHourlyWage,
  workHoursPerMonth,
  workHoursPerYear,
  workWeeksPerYear,
  yearlyEarnings,
} from '../lib/calc';
import { formatEuro, formatHoursMinutes, formatNumber, formatPercent, formatWorkTime } from '../lib/format';
import { useStore } from '../state';

const EXAMPLES = [
  { label: 'Koffie onderweg', amount: 3.8 },
  { label: 'Streamingabonnement', amount: 11.99 },
  { label: 'Boodschappen voor een week', amount: 85 },
  { label: 'Nieuwe telefoon', amount: 999 },
];

export function ProfilePage() {
  const { state, updateProfile } = useStore();
  const p = state.profile;
  const complete = isProfileComplete(p);
  const rhythm = { hoursPerDay: hoursPerDay(p), hoursPerWeek: p.hoursPerWeek };

  const commuteYear = commuteHoursPerYear(p);
  const realWage = realHourlyWage(p);
  const realDrop = p.hourlyWage > 0 ? 1 - realWage / p.hourlyWage : 0;
  const hasCommute = p.commuteMinutesPerDay > 0;

  return (
    <div className="page-grid">
      <section className="card" aria-labelledby="werk-title">
        <h2 id="werk-title">Mijn werk</h2>
        <p className="muted">Hiermee rekent Worth It elk bedrag om naar werktijd. Alles blijft op dit apparaat.</p>

        <div className="field">
          <span className="label" id="wage-type-label">Soort uurloon</span>
          <div className="segmented" role="radiogroup" aria-labelledby="wage-type-label">
            {(['netto', 'bruto'] as const).map((t) => (
              <button
                key={t}
                type="button"
                role="radio"
                aria-checked={p.wageType === t}
                className={p.wageType === t ? 'active' : ''}
                onClick={() => updateProfile({ wageType: t })}
              >
                {t === 'netto' ? 'Netto' : 'Bruto'}
              </button>
            ))}
          </div>
          <p className="field-hint">
            {p.wageType === 'netto'
              ? 'Netto is eerlijker: je betaalt je uitgaven van wat er echt op je rekening komt, na belasting.'
              : 'Let op: met bruto lijkt alles goedkoper dan het is, want van elk bruto uur gaat een deel naar belasting.'}
          </p>
        </div>

        <NumberField
          label={`Uurloon (${p.wageType})`}
          prefix="€"
          suffix="per uur"
          value={p.hourlyWage}
          max={10_000}
          placeholder="bijv. 16,50"
          onChange={(hourlyWage) => updateProfile({ hourlyWage })}
        />

        <div className="field-row">
          <NumberField
            label="Uren per week"
            suffix="uur"
            value={p.hoursPerWeek}
            max={168}
            decimals={1}
            onChange={(hoursPerWeek) => updateProfile({ hoursPerWeek })}
          />
          <NumberField
            label="Dagen per week"
            suffix="dagen"
            value={p.daysPerWeek}
            max={7}
            decimals={1}
            onChange={(daysPerWeek) => updateProfile({ daysPerWeek })}
          />
        </div>

        <NumberField
          label="Vakantieweken per jaar"
          suffix="weken"
          value={p.vacationWeeks}
          max={51}
          decimals={1}
          hint="Inclusief feestdagen. In Nederland is 4 weken het wettelijk minimum bij een fulltime baan."
          onChange={(vacationWeeks) => updateProfile({ vacationWeeks })}
        />

        <NumberField
          label="Reistijd per werkdag (optioneel)"
          suffix="min heen + terug"
          value={p.commuteMinutesPerDay}
          max={1440}
          decimals={0}
          placeholder="bijv. 50"
          hint="Woon-werkverkeer kost ook tijd. Vul het in om je echte uurloon te zien."
          onChange={(commuteMinutesPerDay) => updateProfile({ commuteMinutesPerDay })}
        />

        <label className={`toggle${hasCommute ? '' : ' disabled'}`}>
          <input
            type="checkbox"
            checked={p.useRealWage && hasCommute}
            disabled={!hasCommute}
            onChange={(e) => updateProfile({ useRealWage: e.target.checked })}
          />
          <span className="toggle-track" aria-hidden="true" />
          <span>
            Reken met mijn echte uurloon
            <small>Werktijd voor uitgaven telt dan je reistijd mee.</small>
          </span>
        </label>
      </section>

      <div className="stack">
        <section className="card" aria-labelledby="jaar-title">
          <h2 id="jaar-title">Jouw werkjaar</h2>
          <dl className="stats">
            <div className="stat stat-lg">
              <dt>Werkuren per jaar</dt>
              <dd>{formatNumber(workHoursPerYear(p), 0)}</dd>
              <span className="stat-note">
                {formatNumber(p.hoursPerWeek, 1)} uur × {formatNumber(workWeeksPerYear(p), 1)} werkweken
              </span>
            </div>
            <div className="stat">
              <dt>Gemiddeld per maand</dt>
              <dd>{formatNumber(workHoursPerMonth(p), 1)} uur</dd>
            </div>
            <div className="stat">
              <dt>Per werkdag</dt>
              <dd>{formatHoursMinutes(rhythm.hoursPerDay)}</dd>
            </div>
            {p.hourlyWage > 0 && (
              <div className="stat">
                <dt>Verdiensten per jaar</dt>
                <dd>{formatEuro(yearlyEarnings(p))}</dd>
                <span className="stat-note">{p.wageType}</span>
              </div>
            )}
            {p.hourlyWage > 0 && (
              <div className="stat">
                <dt>Per maand</dt>
                <dd>{formatEuro(yearlyEarnings(p) / 12)}</dd>
                <span className="stat-note">{p.wageType}, gemiddeld</span>
              </div>
            )}
          </dl>
        </section>

        {hasCommute && p.hourlyWage > 0 && (
          <section className="card card-accent" aria-labelledby="echt-title">
            <h2 id="echt-title">Je echte uurloon</h2>
            <p className="big-figure">
              {formatEuro(realWage)} <span className="muted">per uur</span>
            </p>
            <p>
              Dat is <strong>{formatPercent(realDrop, realDrop < 0.1 ? 1 : 0)} lager</strong> dan je {formatEuro(p.hourlyWage)}, omdat je{' '}
              {formatNumber(commuteYear, 0)} uur per jaar onderweg bent. Dat is {formatWorkTime(commuteYear, rhythm)} extra.
            </p>
          </section>
        )}

        <section className="card" aria-labelledby="voorbeeld-title">
          <h2 id="voorbeeld-title">Zo voelt het</h2>
          {complete ? (
            <ul className="examples">
              {EXAMPLES.map((ex) => {
                const h = hoursForAmount(ex.amount, p) ?? 0;
                return (
                  <li key={ex.label}>
                    <span>
                      {ex.label}
                      <span className="muted"> {formatEuro(ex.amount)}</span>
                    </span>
                    <strong className="worktime">{formatWorkTime(h, rhythm)}</strong>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="muted">Vul je uurloon in om te zien hoeveel werk een uitgave je kost.</p>
          )}
        </section>
      </div>
    </div>
  );
}
