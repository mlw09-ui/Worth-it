import { useEffect, useMemo, useRef, useState } from 'react';
import { ItemForm, type ItemDraft } from '../components/ItemForm';
import { WorkTimeBar } from '../components/WorkTimeBar';
import { CATEGORIES, FREQUENCY_PER, monthlyOf, summarizeBudget } from '../lib/budget';
import { isProfileComplete, yearlyEarnings } from '../lib/calc';
import { formatEuro } from '../lib/format';
import type { Expense, Income } from '../lib/types';
import { useWorkTime } from '../hooks';
import { useStore } from '../state';

export function BudgetPage() {
  const { state, addItem, updateItem, removeItem } = useStore();
  const { incomes, expenses, profile } = state;
  const work = useWorkTime();
  const summary = useMemo(() => summarizeBudget(incomes, expenses), [incomes, expenses]);
  const complete = isProfileComplete(profile);

  const [editing, setEditing] = useState<string | null>(null);
  const [undo, setUndo] = useState<{ label: string; restore: () => void } | null>(null);
  const undoTimer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(undoTimer.current), []);

  function remove(key: 'incomes' | 'expenses', item: Income | Expense) {
    const restore = removeItem(key, item.id);
    if (editing === item.id) setEditing(null);
    window.clearTimeout(undoTimer.current);
    setUndo({ label: `"${item.name}" verwijderd`, restore });
    undoTimer.current = window.setTimeout(() => setUndo(null), 6000);
  }

  const salaryMonthly = yearlyEarnings(profile) / 12;
  const showSalaryShortcut = complete && incomes.length === 0;

  const preview = (d: ItemDraft) => {
    const t = work.format(d.amount);
    if (!t) return null;
    const per = FREQUENCY_PER[d.frequency];
    return `${formatEuro(d.amount)}${per ? ` per ${per}` : ''} = ${t} werk${per ? ` per ${per}` : ''}`;
  };

  const grouped = CATEGORIES.map((c) => ({
    ...c,
    items: expenses.filter((e) => e.category === c.id).sort((a, b) => monthlyOf(b) - monthlyOf(a)),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="page-grid budget-grid">
      <div className="stack">
        {!complete && (
          <p className="notice">
            Vul eerst <a href="#werk">je uurloon</a> in, dan zie je bij elk bedrag hoeveel werk het kost.
          </p>
        )}

        <section className="card" aria-labelledby="inkomsten-title">
          <div className="card-head">
            <h2 id="inkomsten-title">Inkomsten</h2>
            <span className="card-head-total">{formatEuro(summary.incomeMonthly)} <span className="muted">per maand</span></span>
          </div>

          {showSalaryShortcut && (
            <button
              type="button"
              className="shortcut"
              onClick={() => addItem('incomes', { name: `Loon (${profile.wageType})`, amount: Math.round(salaryMonthly * 100) / 100, frequency: 'maand' })}
            >
              <span>
                <strong>Loon toevoegen uit je profiel</strong>
                <span className="muted"> · {formatEuro(salaryMonthly)} per maand, gemiddeld</span>
              </span>
              <span aria-hidden="true">+</span>
            </button>
          )}

          {incomes.length > 0 && (
            <ul className="items">
              {incomes.map((i) =>
                editing === i.id ? (
                  <li key={i.id} className="item editing">
                    <ItemForm
                      kind="income"
                      initial={i}
                      submitLabel="Opslaan"
                      onSubmit={(d) => {
                        updateItem('incomes', i.id, { name: d.name, amount: d.amount, frequency: d.frequency });
                        setEditing(null);
                      }}
                      onCancel={() => setEditing(null)}
                    />
                  </li>
                ) : (
                  <li key={i.id} className="item">
                    <div className="item-main">
                      <span className="item-name">{i.name}</span>
                      <span className="item-amount">
                        {formatEuro(i.amount)}
                        <span className="muted"> {i.frequency === 'eenmalig' ? 'eenmalig' : `per ${FREQUENCY_PER[i.frequency]}`}</span>
                      </span>
                    </div>
                    <div className="item-sub">
                      <span className="muted">
                        {i.frequency === 'eenmalig'
                          ? 'Telt niet mee in je maandbudget'
                          : i.frequency === 'maand'
                            ? `${formatEuro(i.amount * 12)} per jaar`
                            : `${formatEuro(monthlyOf(i))} per maand`}
                      </span>
                      <ItemActions name={i.name} onEdit={() => setEditing(i.id)} onRemove={() => remove('incomes', i)} />
                    </div>
                  </li>
                ),
              )}
            </ul>
          )}

          <details className="add" open={incomes.length === 0 && !showSalaryShortcut}>
            <summary>Inkomen toevoegen</summary>
            <ItemForm kind="income" submitLabel="Toevoegen" onSubmit={(d) => addItem('incomes', { name: d.name, amount: d.amount, frequency: d.frequency })} />
          </details>
        </section>

        <section className="card" aria-labelledby="uitgaven-title">
          <div className="card-head">
            <h2 id="uitgaven-title">Uitgaven</h2>
            <span className="card-head-total">{formatEuro(summary.expensesMonthly)} <span className="muted">per maand</span></span>
          </div>

          <ItemForm
            kind="expense"
            submitLabel="Toevoegen"
            preview={preview}
            onSubmit={(d) => addItem('expenses', { name: d.name, amount: d.amount, frequency: d.frequency, category: d.category ?? 'overig' })}
          />

          {grouped.length === 0 ? (
            <p className="empty muted">Nog geen uitgaven. Begin met de grote vaste lasten: huur, boodschappen, verzekeringen.</p>
          ) : (
            grouped.map((g) => {
              const total = summary.byCategory.find((c) => c.category === g.id);
              return (
                <div key={g.id} className="group">
                  <div className="group-head">
                    <span className="group-title">
                      <span className="swatch" style={{ background: `var(--cat-${g.id})` }} aria-hidden="true" />
                      {g.label}
                    </span>
                    {total && (
                      <span className="muted">
                        {formatEuro(total.monthly)} per maand
                        {work.format(total.monthly) && <> · {work.format(total.monthly)} werk</>}
                      </span>
                    )}
                  </div>
                  <ul className="items">
                    {g.items.map((e) =>
                      editing === e.id ? (
                        <li key={e.id} className="item editing">
                          <ItemForm
                            kind="expense"
                            initial={e}
                            submitLabel="Opslaan"
                            preview={preview}
                            onSubmit={(d) => {
                              updateItem('expenses', e.id, { name: d.name, amount: d.amount, frequency: d.frequency, category: d.category ?? 'overig' });
                              setEditing(null);
                            }}
                            onCancel={() => setEditing(null)}
                          />
                        </li>
                      ) : (
                        <ExpenseRow key={e.id} expense={e} onEdit={() => setEditing(e.id)} onRemove={() => remove('expenses', e)} />
                      ),
                    )}
                  </ul>
                </div>
              );
            })
          )}
        </section>
      </div>

      <aside className="stack sticky-col" aria-label="Overzicht">
        <section className="card" aria-labelledby="overzicht-title">
          <h2 id="overzicht-title">Overzicht</h2>
          <div className={`leftover${summary.leftoverMonthly < 0 ? ' negative' : ''}`}>
            <span className="leftover-label">{summary.leftoverMonthly < 0 ? 'Tekort per maand' : 'Over per maand'}</span>
            <span className="leftover-value">{formatEuro(Math.abs(summary.leftoverMonthly))}</span>
            <span className="muted">
              {summary.leftoverYearly < 0 ? 'Tekort' : 'Over'} per jaar: {formatEuro(Math.abs(summary.leftoverYearly))}
            </span>
          </div>
          <table className="totals">
            <thead>
              <tr>
                <th scope="col"><span className="sr-only">Post</span></th>
                <th scope="col">Per maand</th>
                <th scope="col">Per jaar</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">Inkomsten</th>
                <td>{formatEuro(summary.incomeMonthly)}</td>
                <td>{formatEuro(summary.incomeYearly)}</td>
              </tr>
              <tr>
                <th scope="row">Uitgaven</th>
                <td>{formatEuro(summary.expensesMonthly)}</td>
                <td>{formatEuro(summary.expensesYearly)}</td>
              </tr>
            </tbody>
          </table>
          {summary.oneOffTotal > 0 && (
            <p className="muted small">
              Eenmalige uitgaven: {formatEuro(summary.oneOffTotal)}
              {work.format(summary.oneOffTotal) && <> ({work.format(summary.oneOffTotal)} werk)</>}. Die tellen niet mee in je maandbudget.
            </p>
          )}
        </section>

        <section className="card" aria-labelledby="werktijd-title">
          <h2 id="werktijd-title">Waar je werktijd heen gaat</h2>
          {!complete ? (
            <p className="muted">Vul je profiel in om je uitgaven in werktijd te zien.</p>
          ) : summary.byCategory.length === 0 ? (
            <p className="muted">Voeg terugkerende uitgaven toe om te zien hoeveel van je werkmaand ze kosten.</p>
          ) : (
            <WorkTimeBar byCategory={summary.byCategory} profile={profile} />
          )}
        </section>
      </aside>

      {undo && (
        <div className="toast" role="status">
          <span>{undo.label}</span>
          <button
            type="button"
            onClick={() => {
              undo.restore();
              setUndo(null);
            }}
          >
            Ongedaan maken
          </button>
        </div>
      )}
    </div>
  );
}

function ExpenseRow({ expense: e, onEdit, onRemove }: { expense: Expense; onEdit: () => void; onRemove: () => void }) {
  const work = useWorkTime();
  const per = FREQUENCY_PER[e.frequency];
  const t = work.format(e.amount);
  const monthly = monthlyOf(e);
  const tMonth = work.format(monthly);

  let sub: string;
  if (e.frequency === 'eenmalig') {
    sub = t ? `${t} werk · telt niet mee in je maandbudget` : 'Telt niet mee in je maandbudget';
  } else if (e.frequency === 'maand') {
    sub = t ? `${t} werk per maand` : `${formatEuro(e.amount * 12)} per jaar`;
  } else {
    sub = t
      ? `${t} werk per ${per} · ${formatEuro(monthly)} per maand = ${tMonth}`
      : `${formatEuro(monthly)} per maand`;
  }

  return (
    <li className="item">
      <div className="item-main">
        <span className="item-name">{e.name}</span>
        <span className="item-amount">
          {formatEuro(e.amount)}
          <span className="muted"> {e.frequency === 'eenmalig' ? 'eenmalig' : `per ${per}`}</span>
        </span>
      </div>
      <div className="item-sub">
        <span className={t ? 'worktime-sub' : 'muted'}>{sub}</span>
        <ItemActions name={e.name} onEdit={onEdit} onRemove={onRemove} />
      </div>
    </li>
  );
}

function ItemActions({ name, onEdit, onRemove }: { name: string; onEdit: () => void; onRemove: () => void }) {
  return (
    <span className="item-actions">
      <button type="button" className="link-btn" onClick={onEdit} aria-label={`${name} bewerken`}>
        Bewerken
      </button>
      <button type="button" className="link-btn danger" onClick={onRemove} aria-label={`${name} verwijderen`}>
        Verwijderen
      </button>
    </span>
  );
}
