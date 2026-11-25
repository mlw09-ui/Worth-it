import { useMemo, useRef, useState, type ChangeEvent } from 'react';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { backupFileName, buildBackup, parseBackup } from '../lib/backup';
import { FREQUENCY_PER, summarizeBudget } from '../lib/budget';
import { isProfileComplete, toYearly, workHoursPerYear } from '../lib/calc';
import { formatEuro, formatNumber } from '../lib/format';
import { runScenario, yearOverview } from '../lib/scenario';
import type { AppState } from '../lib/types';
import { useWorkTime } from '../hooks';
import { useStore } from '../state';

export function ExtrasPage() {
  const { state } = useStore();
  const complete = isProfileComplete(state.profile);

  return (
    <div className="extras">
      {!complete && (
        <p className="notice">
          Vul eerst <a href="#werk">je uurloon</a> in om de scenario's en het jaaroverzicht te zien.
        </p>
      )}
      <div className="page-grid">
        {complete && <Scenarios />}
        <div className="stack">
          {complete && <YearOverview />}
          <DataCard />
        </div>
      </div>
    </div>
  );
}

/* ---------- Scenario's ---------- */

function Scenarios() {
  const { state } = useStore();
  const { expenses, profile } = state;
  const work = useWorkTime();
  const [delta, setDelta] = useState(0);
  const [cancelled, setCancelled] = useState<Set<string>>(new Set());
  const [showAll, setShowAll] = useState(false);

  const recurring = expenses.filter((e) => e.frequency !== 'eenmalig');
  const subs = recurring.filter((e) => e.category === 'abonnementen');
  const others = recurring.filter((e) => e.category !== 'abonnementen');
  const visible = showAll || subs.length === 0 ? [...subs, ...others] : subs;

  const result = runScenario(expenses, profile, delta, cancelled);

  function toggle(id: string) {
    setCancelled((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const newWage = Math.max(0, profile.hourlyWage + delta);

  return (
    <section className="card" aria-labelledby="scenario-title">
      <h2 id="scenario-title">Wat als…?</h2>
      <p className="muted">Speel met je uurloon of zeg iets op en zie hoeveel uur per jaar dat scheelt. Er verandert niets aan je gegevens.</p>

      <div className="field">
        <label htmlFor="wage-delta">Uurloon</label>
        <div className="range-row">
          <input
            id="wage-delta"
            type="range"
            min={-2}
            max={5}
            step={0.25}
            value={delta}
            onChange={(e) => setDelta(Number(e.target.value))}
            aria-valuetext={`${delta >= 0 ? 'plus' : 'min'} ${formatEuro(Math.abs(delta))} per uur`}
          />
          <span className="range-value">
            {delta > 0 ? '+' : delta < 0 ? '−' : '±'} {formatEuro(Math.abs(delta))}
          </span>
        </div>
        <div className="chips" role="group" aria-label="Snel kiezen">
          {[0, 1, 2].map((d) => (
            <button key={d} type="button" className={`chip${delta === d ? ' active' : ''}`} onClick={() => setDelta(d)}>
              {d === 0 ? 'Huidig' : `+ ${formatEuro(d)}`}
            </button>
          ))}
        </div>
        <p className="field-hint">
          {formatEuro(profile.hourlyWage)} → <strong>{formatEuro(newWage)}</strong> per uur ({profile.wageType})
        </p>
      </div>

      <div className="field">
        <span className="label">Opzeggen</span>
        {recurring.length === 0 ? (
          <p className="muted small">
            Voeg eerst terugkerende uitgaven toe in <a href="#budget">je budget</a>.
          </p>
        ) : (
          <>
            {subs.length === 0 && <p className="muted small">Je hebt geen abonnementen in je budget; hieronder staan je andere vaste uitgaven.</p>}
            <ul className="cancel-list">
              {visible.map((e) => {
                const yearly = toYearly(e.amount, e.frequency);
                return (
                  <li key={e.id}>
                    <label className={`cancel-item${cancelled.has(e.id) ? ' on' : ''}`}>
                      <span className="check">
                        <input type="checkbox" checked={cancelled.has(e.id)} onChange={() => toggle(e.id)} />
                        <span className="check-box" aria-hidden="true" />
                      </span>
                      <span className="cancel-name">
                        {e.name}
                        <span className="muted">
                          {' '}
                          {formatEuro(e.amount)} per {FREQUENCY_PER[e.frequency]}
                        </span>
                      </span>
                      <span className="cancel-hours">{work.format(yearly)} per jaar</span>
                    </label>
                  </li>
                );
              })}
            </ul>
            {subs.length > 0 && others.length > 0 && (
              <button type="button" className="link-btn" onClick={() => setShowAll((v) => !v)}>
                {showAll ? 'Alleen abonnementen tonen' : `Ook andere vaste uitgaven tonen (${others.length})`}
              </button>
            )}
          </>
        )}
      </div>

      {result && recurring.length > 0 && (
        <div className="scenario-result" aria-live="polite">
          {Math.abs(result.savedHours) < 1 / 60 ? (
            <p className="muted">Verschuif het uurloon of vink iets aan om het verschil te zien.</p>
          ) : (
            <>
              <span className="verdict-label">{result.savedHours > 0 ? 'Minder werken' : 'Meer werken'}</span>
              <p className="verdict-time">
                {work.formatHours(Math.abs(result.savedHours))}
                <span className="verdict-pre suffix">per jaar</span>
              </p>
              <p className="small">
                {formatNumber(Math.abs(result.savedHours), 0)} uur {result.savedHours > 0 ? 'minder' : 'meer'}: je vaste uitgaven kosten je nu{' '}
                {formatNumber(result.baseHours, 0)} uur per jaar, in dit scenario {formatNumber(result.newHours, 0)} uur.
                {result.savedEuros > 0 && <> Je bespaart {formatEuro(result.savedEuros)} per jaar.</>}
              </p>
            </>
          )}
        </div>
      )}
    </section>
  );
}

/* ---------- Jaaroverzicht ---------- */

function YearOverview() {
  const { state } = useStore();
  const work = useWorkTime();
  const summary = useMemo(() => summarizeBudget(state.incomes, state.expenses), [state.incomes, state.expenses]);
  const rows = yearOverview(summary.byCategory, state.profile);
  const total = rows.reduce((s, r) => s + r.hours, 0);
  const max = rows[0]?.hours ?? 0;
  const yearHours = workHoursPerYear(state.profile);

  return (
    <section className="card" aria-labelledby="jaar-overzicht-title">
      <h2 id="jaar-overzicht-title">Jaaroverzicht</h2>
      {rows.length === 0 ? (
        <p className="muted">
          Voeg terugkerende uitgaven toe in <a href="#budget">je budget</a> om te zien hoeveel van je werkjaar ernaartoe gaat.
        </p>
      ) : (
        <>
          <p className="muted">
            Van je {work.formatHours(yearHours)} werk per jaar gaat {work.formatHours(total)} naar vaste uitgaven.
          </p>
          <ul className="year-list">
            {rows.map((r) => (
              <li key={r.category}>
                <p>
                  Je werkt <strong>{work.formatHours(r.hours)}</strong> per jaar voor {r.label}
                </p>
                <div className="year-bar" aria-hidden="true">
                  <span style={{ width: `${Math.max(1, (r.hours / max) * 100)}%`, background: `var(--cat-${r.category})` }} />
                </div>
                <span className="muted small">
                  {formatEuro(r.yearly)} per jaar · {formatNumber(r.hours, 0)} uur
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

/* ---------- Gegevens ---------- */

function DataCard() {
  const { state, replaceState, resetAll } = useStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [pending, setPending] = useState<AppState | null>(null);
  const [confirmWipe, setConfirmWipe] = useState(false);

  function exportData() {
    try {
      const blob = new Blob([buildBackup(state)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = backupFileName();
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMessage({ kind: 'ok', text: 'Backup gedownload. Bewaar het bestand op een veilige plek.' });
    } catch {
      setMessage({ kind: 'error', text: 'Exporteren lukte niet in deze browser.' });
    }
  }

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const result = parseBackup(await file.text());
      if (!result.ok) return setMessage({ kind: 'error', text: result.error });
      setMessage(null);
      setPending(result.state);
    } catch {
      setMessage({ kind: 'error', text: 'Het bestand kon niet worden gelezen.' });
    }
  }

  const count = (s: AppState) =>
    `${s.incomes.length} ${s.incomes.length === 1 ? 'inkomen' : 'inkomsten'}, ${s.expenses.length} ${s.expenses.length === 1 ? 'uitgave' : 'uitgaven'} en ${s.cart.length} ${s.cart.length === 1 ? 'item' : 'items'} in je mandje`;

  return (
    <section className="card" aria-labelledby="data-title">
      <h2 id="data-title">Je gegevens</h2>
      <p className="muted">
        Alles staat alleen in deze browser. Maak een backup als je wilt overstappen naar een ander apparaat, of voordat je je browsergegevens wist.
      </p>
      <div className="data-actions">
        <button type="button" className="btn btn-primary" onClick={exportData}>
          Backup downloaden
        </button>
        <button type="button" className="btn btn-ghost" onClick={() => fileRef.current?.click()}>
          Backup terugzetten
        </button>
        <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={onFile} />
      </div>
      {message && (
        <p className={message.kind === 'ok' ? 'data-msg ok' : 'data-msg field-error'} role="status">
          {message.text}
        </p>
      )}

      <div className="danger-zone">
        <div>
          <strong>Alles wissen</strong>
          <p className="muted small">Verwijdert je profiel, budget en mandje van dit apparaat.</p>
        </div>
        <button type="button" className="btn btn-danger-ghost" onClick={() => setConfirmWipe(true)}>
          Alles wissen
        </button>
      </div>

      <ConfirmDialog
        open={pending !== null}
        title="Backup terugzetten?"
        confirmLabel="Terugzetten"
        onCancel={() => setPending(null)}
        onConfirm={() => {
          if (pending) replaceState(pending);
          setPending(null);
          setMessage({ kind: 'ok', text: 'Backup teruggezet.' });
        }}
      >
        {pending && (
          <>
            <p>De backup bevat {count(pending)}.</p>
            <p>Dit vervangt al je huidige gegevens ({count(state)}).</p>
          </>
        )}
      </ConfirmDialog>

      <ConfirmDialog
        open={confirmWipe}
        title="Alles wissen?"
        confirmLabel="Ja, alles wissen"
        danger
        onCancel={() => setConfirmWipe(false)}
        onConfirm={() => {
          resetAll();
          setConfirmWipe(false);
          setMessage({ kind: 'ok', text: 'Alles is gewist.' });
        }}
      >
        <p>Je profiel, {count(state)} worden van dit apparaat verwijderd.</p>
        <p>
          <strong>Dit kun je niet ongedaan maken.</strong> Download eerst een backup als je de gegevens wilt bewaren.
        </p>
      </ConfirmDialog>
    </section>
  );
}
