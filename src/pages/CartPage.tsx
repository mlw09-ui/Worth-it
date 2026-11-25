import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { CartForm } from '../components/CartForm';
import { QuickCheck } from '../components/QuickCheck';
import { CATEGORY_LABEL, summarizeBudget } from '../lib/budget';
import { hoursPerDay, isProfileComplete, workWeeksPerYear } from '../lib/calc';
import {
  describeFrequency,
  formatWeeks,
  humanComparison,
  itemMonthly,
  itemPerPeriod,
  summarizeCart,
  weeksToSave,
  type ComparisonContext,
} from '../lib/cart';
import { formatEuro, formatPercent } from '../lib/format';
import type { CartItem } from '../lib/types';
import { useWorkTime } from '../hooks';
import { useStore } from '../state';

export function CartPage() {
  const { state, addItem, updateItem, updateAll, removeItem } = useStore();
  const { cart, profile, incomes, expenses } = state;
  const work = useWorkTime();
  const complete = isProfileComplete(profile);

  const ctx: ComparisonContext = {
    hoursPerDay: hoursPerDay(profile),
    hoursPerWeek: profile.hoursPerWeek,
    daysPerWeek: profile.daysPerWeek,
    workWeeksPerYear: workWeeksPerYear(profile),
  };

  const [prefill, setPrefill] = useState<{ price: number; key: number } | undefined>();
  const [toast, setToast] = useState<{ label: string; action?: { label: string; run: () => void } } | null>(null);
  const toastTimer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(toastTimer.current), []);

  function showToast(t: NonNullable<typeof toast>) {
    window.clearTimeout(toastTimer.current);
    setToast(t);
    toastTimer.current = window.setTimeout(() => setToast(null), 6000);
  }

  const expenseIds = useMemo(() => new Set(expenses.map((e) => e.id)), [expenses]);
  const inBudget = (i: CartItem) => !!i.budgetExpenseId && expenseIds.has(i.budgetExpenseId);

  const summary = summarizeCart(cart);
  const budget = useMemo(() => summarizeBudget(incomes, expenses), [incomes, expenses]);
  // Items die al in het budget staan, zitten al in het overschot verwerkt.
  const notInBudget = summarizeCart(cart.filter((i) => !inBudget(i)));

  const allSelected = cart.length > 0 && cart.every((i) => i.selected);

  function addToBudget(item: CartItem) {
    const name = item.times > 1 ? `${item.name} (${item.times}×)` : item.name;
    const expenseId = addItem('expenses', { name, amount: itemPerPeriod(item), frequency: item.frequency, category: item.category });
    updateItem('cart', item.id, { budgetExpenseId: expenseId });
    showToast({ label: `"${item.name}" staat nu in je budget (${CATEGORY_LABEL[item.category]})`, action: { label: 'Bekijk', run: () => (window.location.hash = '#budget') } });
  }

  return (
    <div className="cart-grid">
      <div className="cart-quick">
        <QuickCheck ctx={ctx} onAddToCart={(price) => setPrefill({ price, key: Date.now() })} />
      </div>

      <section className="card cart-list" aria-labelledby="mandje-title">
        <div className="card-head">
          <h2 id="mandje-title">Je mandje</h2>
          {cart.length > 0 && (
            <button type="button" className="link-btn" onClick={() => updateAll('cart', { selected: !allSelected })}>
              {allSelected ? 'Niets selecteren' : 'Alles selecteren'}
            </button>
          )}
        </div>

        {!complete && (
          <p className="notice">
            Vul eerst <a href="#werk">je uurloon</a> in, dan zie je bij alles hoeveel werk het kost.
          </p>
        )}

        <CartForm prefill={prefill} onSubmit={(d) => addItem('cart', { ...d, selected: true })} />

        {cart.length === 0 ? (
          <p className="empty muted">Leg hier de dingen neer die je overweegt. Vink ze aan of uit en zie wat het je echt kost.</p>
        ) : (
          <ul className="items cart-items">
            {cart.map((i) => {
              const per = itemPerPeriod(i);
              const t = work.format(per);
              const yearT = i.frequency !== 'eenmalig' ? work.format(itemMonthly(i) * 12) : null;
              const done = inBudget(i);
              return (
                <li key={i.id} className={`item cart-item${i.selected ? '' : ' off'}`}>
                  <label className="check">
                    <input type="checkbox" checked={i.selected} onChange={(e) => updateItem('cart', i.id, { selected: e.target.checked })} />
                    <span className="check-box" aria-hidden="true" />
                    <span className="sr-only">{i.name} meetellen</span>
                  </label>
                  <div className="cart-item-body">
                    <div className="item-main">
                      <span className="item-name">{i.name}</span>
                      <span className="item-amount">
                        {formatEuro(i.price)}
                        <span className="muted"> {describeFrequency(i.frequency, i.times)}</span>
                      </span>
                    </div>
                    <div className="item-sub">
                      <span className={t ? 'worktime-sub' : 'muted'}>
                        {t
                          ? i.frequency === 'eenmalig'
                            ? `${t} werk`
                            : `${t} werk per ${i.frequency} · ${yearT} per jaar`
                          : CATEGORY_LABEL[i.category]}
                      </span>
                      <span className="item-actions">
                        {done ? (
                          <span className="in-budget">✓ In budget</span>
                        ) : (
                          <button type="button" className="link-btn accent" onClick={() => addToBudget(i)}>
                            Naar budget
                          </button>
                        )}
                        <button
                          type="button"
                          className="link-btn danger"
                          aria-label={`${i.name} verwijderen`}
                          onClick={() => {
                            const restore = removeItem('cart', i.id);
                            showToast({ label: `"${i.name}" verwijderd`, action: { label: 'Ongedaan maken', run: restore } });
                          }}
                        >
                          Verwijderen
                        </button>
                      </span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <aside className="cart-summary sticky-col" aria-label="Wat kost je selectie">
        <section className="card verdict" aria-live="polite">
          <h2>Is het het waard?</h2>
          {summary.count === 0 ? (
            <p className="muted">{cart.length === 0 ? 'Leg iets in je mandje om te beginnen.' : 'Vink items aan om te zien wat ze je kosten.'}</p>
          ) : (
            <>
              <p className="muted small">
                {summary.count} van {cart.length} {cart.length === 1 ? 'item' : 'items'} geselecteerd
              </p>

              {summary.oneOffTotal > 0 && (
                <Verdict
                  label="Eenmalig"
                  hours={work.hours(summary.oneOffTotal)}
                  euros={formatEuro(summary.oneOffTotal)}
                  ctx={ctx}
                  format={work.formatHours}
                />
              )}

              {summary.recurringYearly > 0 && (
                <Verdict
                  label="Terugkerend"
                  hours={work.hours(summary.recurringYearly)}
                  euros={`${formatEuro(summary.recurringYearly)} per jaar · ${formatEuro(summary.recurringMonthly)} per maand`}
                  ctx={ctx}
                  format={work.formatHours}
                  prefix="Dit kost je "
                  suffix=" per jaar"
                  monthly={work.format(summary.recurringMonthly)}
                />
              )}

              <Savings budgetIncome={budget.incomeMonthly} leftover={budget.leftoverMonthly} oneOff={notInBudget.oneOffTotal} monthly={notInBudget.recurringMonthly} anyInBudget={summary.count !== notInBudget.count} />
            </>
          )}
        </section>
      </aside>

      {toast && (
        <div className="toast" role="status">
          <span>{toast.label}</span>
          {toast.action && (
            <button
              type="button"
              onClick={() => {
                toast.action!.run();
                setToast(null);
              }}
            >
              {toast.action.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

interface VerdictProps {
  label: string;
  hours: number | null;
  euros: string;
  ctx: ComparisonContext;
  format: (h: number) => string;
  prefix?: string;
  suffix?: string;
  monthly?: string | null;
}

function Verdict({ label, hours, euros, ctx, format, prefix = '', suffix = '', monthly }: VerdictProps) {
  return (
    <div className="verdict-block">
      <span className="verdict-label">{label}</span>
      {hours !== null ? (
        <>
          <p className="verdict-time">
            {prefix && <span className="verdict-pre prefix">{prefix}</span>}
            {format(hours)}
            {suffix && <span className="verdict-pre suffix">{suffix}</span>}
          </p>
          <p className="verdict-compare">{humanComparison(hours, ctx)}</p>
          <p className="muted small">
            {euros}
            {monthly && <> · {monthly} werk per maand</>}
          </p>
        </>
      ) : (
        <p className="verdict-time">{euros}</p>
      )}
    </div>
  );
}

function Savings({ budgetIncome, leftover, oneOff, monthly, anyInBudget }: { budgetIncome: number; leftover: number; oneOff: number; monthly: number; anyInBudget: boolean }) {
  let body: ReactNode;
  if (budgetIncome <= 0) {
    body = (
      <>
        Vul <a href="#budget">je budget</a> in om te zien hoe snel je dit bij elkaar spaart.
      </>
    );
  } else if (leftover <= 0) {
    body = 'Je houdt nu niets over per maand. Hiervoor sparen lukt alleen als je ergens anders op bespaart.';
  } else {
    const parts: string[] = [];
    if (oneOff > 0) {
      const w = weeksToSave(oneOff, leftover)!;
      parts.push(`Met je huidige overschot van ${formatEuro(leftover)}/maand heb je ${monthly > 0 ? 'het eenmalige deel' : 'dit'} over ${formatWeeks(w)}.`);
    }
    if (monthly > 0) {
      const share = monthly / leftover;
      parts.push(
        share > 1
          ? `Het terugkerende deel (${formatEuro(monthly)}/maand) is meer dan je overhoudt (${formatEuro(leftover)}/maand).`
          : `Het terugkerende deel kost ${formatPercent(share)} van je overschot van ${formatEuro(leftover)}/maand.`,
      );
    }
    if (parts.length === 0 && anyInBudget) parts.push('Alles wat je hebt geselecteerd staat al in je budget en zit dus al in je overschot verwerkt.');
    body = parts.join(' ');
  }
  return (
    <div className="verdict-block savings">
      <span className="verdict-label">Spaardoel</span>
      <p>{body}</p>
      {anyInBudget && budgetIncome > 0 && leftover > 0 && (oneOff > 0 || monthly > 0) && (
        <p className="muted small">Items die al in je budget staan, tellen hier niet mee.</p>
      )}
    </div>
  );
}
