import { NumberField } from '../components/NumberField';
import { allowancePerMonth, choresFor, choresPerMonthMoney, moneyPerMonth, moneyPerWeek, moneyTimeFor } from '../lib/kids';
import { formatEuro } from '../lib/format';
import { useStore } from '../state';

const EXAMPLES = [
  { label: 'Zak snoep', amount: 1.5 },
  { label: 'Stripboek', amount: 7.99 },
  { label: 'Nieuwe game', amount: 59.99 },
  { label: 'Fiets', amount: 249 },
];

export function KidProfilePage() {
  const { state, updateKid } = useStore();
  const k = state.kid;
  const perMonth = moneyPerMonth(k);

  return (
    <div className="page-grid">
      <section className="card" aria-labelledby="geld-title">
        <h2 id="geld-title">Mijn geld</h2>
        <p className="muted">Vul in wat je weet. Je hoeft niet alles in te vullen.</p>

        <div className="field">
          <span className="label" id="zakgeld-freq">
            Hoe vaak krijg je zakgeld?
          </span>
          <div className="segmented" role="radiogroup" aria-labelledby="zakgeld-freq">
            {(['week', 'maand'] as const).map((f) => (
              <button
                key={f}
                type="button"
                role="radio"
                aria-checked={k.allowanceFrequency === f}
                className={k.allowanceFrequency === f ? 'active' : ''}
                onClick={() => updateKid({ allowanceFrequency: f })}
              >
                Elke {f}
              </button>
            ))}
          </div>
        </div>

        <NumberField
          label="Zakgeld"
          prefix="€"
          suffix={`per ${k.allowanceFrequency}`}
          value={k.allowance}
          max={10_000}
          placeholder="bijv. 5"
          onChange={(allowance) => updateKid({ allowance })}
        />

        <div className="field-row">
          <NumberField
            label="Geld per klusje"
            prefix="€"
            value={k.choreRate}
            max={10_000}
            placeholder="bijv. 1"
            onChange={(choreRate) => updateKid({ choreRate })}
          />
          <NumberField
            label="Klusjes per maand"
            suffix="keer"
            value={k.choresPerMonth}
            max={1000}
            decimals={0}
            placeholder="bijv. 4"
            onChange={(choresPerMonth) => updateKid({ choresPerMonth })}
          />
        </div>
        <p className="field-hint kid-hint">Zoals de afwas doen, de auto wassen of de hond uitlaten.</p>

        <NumberField
          label="Al gespaard"
          prefix="€"
          suffix="in je spaarpot"
          value={k.savings}
          max={100_000_000}
          placeholder="bijv. 20"
          hint="Dit geld telt mee als je kijkt wanneer je iets kunt kopen."
          onChange={(savings) => updateKid({ savings })}
        />
      </section>

      <div className="stack">
        <section className="card" aria-labelledby="per-maand-title">
          <h2 id="per-maand-title">Zo veel krijg je</h2>
          {perMonth > 0 ? (
            <dl className="stats">
              <div className="stat stat-lg">
                <dt>Per maand</dt>
                <dd>{formatEuro(perMonth)}</dd>
                <span className="stat-note">Ongeveer {formatEuro(moneyPerWeek(k))} per week</span>
              </div>
              <div className="stat">
                <dt>Zakgeld</dt>
                <dd>{formatEuro(allowancePerMonth(k))}</dd>
                <span className="stat-note">per maand</span>
              </div>
              <div className="stat">
                <dt>Klusjes</dt>
                <dd>{formatEuro(choresPerMonthMoney(k))}</dd>
                <span className="stat-note">per maand</span>
              </div>
              {k.savings > 0 && (
                <div className="stat">
                  <dt>Spaarpot</dt>
                  <dd>{formatEuro(k.savings)}</dd>
                </div>
              )}
            </dl>
          ) : (
            <p className="muted">Vul je zakgeld of klusjes in, dan zie je hier hoeveel geld je per maand krijgt.</p>
          )}
        </section>

        <section className="card" aria-labelledby="kid-voorbeeld-title">
          <h2 id="kid-voorbeeld-title">Hoe lang moet je ervoor sparen?</h2>
          {perMonth > 0 || k.choreRate > 0 ? (
            <ul className="examples">
              {EXAMPLES.map((ex) => {
                const time = moneyTimeFor(ex.amount, k);
                const chores = choresFor(ex.amount, k);
                return (
                  <li key={ex.label}>
                    <span>
                      {ex.label}
                      <span className="muted"> {formatEuro(ex.amount)}</span>
                    </span>
                    <span className="kid-example-value">
                      {time && <strong className="worktime">{time}</strong>}
                      {chores !== null && (
                        <span className="muted small">
                          {chores} {chores === 1 ? 'klusje' : 'klusjes'}
                        </span>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="muted">Vul je zakgeld in om te zien hoe lang je moet sparen voor dingen.</p>
          )}
          <p className="muted small kid-footnote">
            Wil je kijken of je iets kunt kopen? Ga naar <a href="#mandje">Kan ik het kopen?</a>
          </p>
        </section>
      </div>
    </div>
  );
}
