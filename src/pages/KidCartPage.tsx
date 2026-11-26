import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { itemMonthly, itemPerPeriod, summarizeCart } from '../lib/cart';
import { formatEuro, parseAmount } from '../lib/format';
import { choresFor, dateAfterWeeks, kidDuration, moneyPerMonth, moneyTimeFor, weeksUntilAffordable } from '../lib/kids';
import type { KidMoney } from '../lib/types';
import { useStore } from '../state';

/** Zinnetjes over één bedrag: hoe lang sparen, hoeveel klusjes, wanneer kopen. */
function describePrice(price: number, k: KidMoney, monthlyCosts = 0) {
  const time = moneyTimeFor(price, k);
  const chores = choresFor(price, k);
  const weeks = weeksUntilAffordable(price, k, monthlyCosts);
  let when: string | null = null;
  if (weeks === 0) when = k.savings > 0 ? 'Je hebt al genoeg in je spaarpot!' : null;
  else if (weeks !== null) when = `Als je alles spaart, kun je het kopen rond ${dateAfterWeeks(weeks)}.`;
  /** Hoe lang je nog moet wachten, met je spaarpot meegeteld. */
  const wait = weeks === null ? null : weeks === 0 ? 'Nu al!' : kidDuration(weeks);
  return { time, chores, when, weeks, wait };
}

export function KidCartPage() {
  const { state, addItem, updateItem, updateAll, removeItem } = useStore();
  const { cart, kid } = state;
  const hasMoney = moneyPerMonth(kid) > 0 || kid.choreRate > 0 || kid.savings > 0;

  const [prefill, setPrefill] = useState<{ price: number; key: number } | undefined>();
  const [toast, setToast] = useState<{ label: string; restore: () => void } | null>(null);
  const toastTimer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(toastTimer.current), []);

  const summary = summarizeCart(cart);
  const allSelected = cart.length > 0 && cart.every((i) => i.selected);

  return (
    <div className="cart-grid">
      <div className="cart-quick">
        <KidQuickCheck kid={kid} hasMoney={hasMoney} onAdd={(price) => setPrefill({ price, key: Date.now() })} />
      </div>

      <section className="card cart-list" aria-labelledby="lijst-title">
        <div className="card-head">
          <h2 id="lijst-title">Mijn verlanglijstje</h2>
          {cart.length > 0 && (
            <button type="button" className="link-btn" onClick={() => updateAll('cart', { selected: !allSelected })}>
              {allSelected ? 'Niets aanvinken' : 'Alles aanvinken'}
            </button>
          )}
        </div>

        <KidItemForm prefill={prefill} onSubmit={(d) => addItem('cart', { ...d, times: 1, selected: true, category: 'overig' })} />

        {cart.length === 0 ? (
          <p className="empty muted">Zet hier wat je graag wilt hebben. Vink dingen aan om te zien of je ze kunt kopen.</p>
        ) : (
          <ul className="items cart-items">
            {cart.map((i) => {
              const monthly = i.frequency !== 'eenmalig';
              const amount = monthly ? itemMonthly(i) : itemPerPeriod(i);
              const { time, chores } = describePrice(amount, kid);
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
                        {formatEuro(amount)}
                        {monthly && <span className="muted"> per maand</span>}
                      </span>
                    </div>
                    <div className="item-sub">
                      <span className={time || chores ? 'worktime-sub' : 'muted'}>
                        {[time && (monthly ? `je geld van ${time}, elke maand` : `je geld van ${time}`), chores !== null && `${chores} ${chores === 1 ? 'klusje' : 'klusjes'}`]
                          .filter(Boolean)
                          .join(' · ') || (monthly ? 'Elke maand' : 'Eén keer')}
                      </span>
                      <span className="item-actions">
                        <button
                          type="button"
                          className="link-btn danger"
                          aria-label={`${i.name} verwijderen`}
                          onClick={() => {
                            const restore = removeItem('cart', i.id);
                            window.clearTimeout(toastTimer.current);
                            setToast({ label: `"${i.name}" verwijderd`, restore });
                            toastTimer.current = window.setTimeout(() => setToast(null), 6000);
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

      <aside className="cart-summary sticky-col" aria-label="Kan ik het kopen?">
        <section className="card verdict" aria-live="polite">
          <h2>Kan ik het kopen?</h2>
          {summary.count === 0 ? (
            <p className="muted">{cart.length === 0 ? 'Zet iets op je verlanglijstje om te beginnen.' : 'Vink iets aan op je verlanglijstje.'}</p>
          ) : (
            <KidVerdict kid={kid} oneOff={summary.oneOffTotal} monthly={summary.recurringMonthly} hasMoney={hasMoney} />
          )}
        </section>
      </aside>

      {toast && (
        <div className="toast" role="status">
          <span>{toast.label}</span>
          <button
            type="button"
            onClick={() => {
              toast.restore();
              setToast(null);
            }}
          >
            Ongedaan maken
          </button>
        </div>
      )}
    </div>
  );
}

function KidVerdict({ kid, oneOff, monthly, hasMoney }: { kid: KidMoney; oneOff: number; monthly: number; hasMoney: boolean }) {
  const perMonth = moneyPerMonth(kid);
  const d = describePrice(oneOff, kid, monthly);

  return (
    <>
      {oneOff > 0 && (
        <div className="verdict-block">
          <span className="verdict-label">Samen kost het</span>
          <p className="verdict-time">{formatEuro(oneOff)}</p>
          {d.time && <p className="verdict-compare">Dat is al je geld van {d.time}</p>}
          {d.chores !== null && (
            <p className="muted small">
              Of {d.chores} {d.chores === 1 ? 'klusje' : 'klusjes'}
            </p>
          )}
        </div>
      )}

      {monthly > 0 && (
        <div className="verdict-block">
          <span className="verdict-label">Elke maand</span>
          <p className="verdict-time">{formatEuro(monthly)}</p>
          {perMonth > 0 && (
            <p className="verdict-compare">
              {monthly > perMonth
                ? `Dat is meer dan je per maand krijgt (${formatEuro(perMonth)}).`
                : `Dan houd je elke maand ${formatEuro(perMonth - monthly)} over.`}
            </p>
          )}
        </div>
      )}

      <div className="verdict-block savings">
        <span className="verdict-label">Sparen</span>
        {!hasMoney ? (
          <p>
            Vul bij <a href="#werk">Mijn geld</a> je zakgeld in, dan zie je wanneer je het kunt kopen.
          </p>
        ) : oneOff <= 0 ? (
          <p className="muted">Je hoeft hier niet voor te sparen, je betaalt het elke maand.</p>
        ) : d.weeks === 0 ? (
          <p>
            <strong>Ja, dat kan!</strong> In je spaarpot zit {formatEuro(kid.savings)}. Daarna houd je {formatEuro(kid.savings - oneOff)} over.
          </p>
        ) : d.weeks === null ? (
          <p>
            Je hebt nog {formatEuro(oneOff - kid.savings)} nodig, maar je houdt nu niets over om te sparen.
            {monthly > 0 && ' Misschien kun je iets van elke maand weglaten?'}
          </p>
        ) : (
          <>
            <p>
              {kid.savings > 0 && <>In je spaarpot zit {formatEuro(kid.savings)}. </>}
              Je hebt nog <strong>{formatEuro(oneOff - kid.savings)}</strong> nodig.
            </p>
            <p>{d.when}</p>
          </>
        )}
      </div>
    </>
  );
}

function KidQuickCheck({ kid, hasMoney, onAdd }: { kid: KidMoney; hasMoney: boolean; onAdd: (price: number) => void }) {
  const [text, setText] = useState('');
  const price = parseAmount(text);
  const valid = price !== null && price > 0 && price <= 100_000_000;
  const d = valid ? describePrice(price, kid) : null;

  return (
    <section className="card quick" aria-labelledby="kid-quick-title">
      <h2 id="kid-quick-title">Hoeveel kost het?</h2>
      <p className="muted">Typ een prijs en kijk hoe lang je moet sparen.</p>
      <div className="quick-row">
        <div className="input-wrap quick-input">
          <span className="affix">€</span>
          <input
            type="text"
            inputMode="decimal"
            autoComplete="off"
            aria-label="Prijs"
            placeholder="0,00"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </div>
        <div className="quick-result" aria-live="polite">
          {d && d.wait && hasMoney && (d.weeks === 0 || d.time) ? (
            <>
              <span className="quick-time">{d.wait}</span>
              <span className="quick-sub">
                {d.weeks === 0 ? 'Je kunt het kopen' : 'sparen'}
                {d.chores !== null && d.weeks !== 0 && (
                  <>
                    {' '}
                    · of {d.chores} {d.chores === 1 ? 'klusje' : 'klusjes'}
                  </>
                )}
              </span>
            </>
          ) : d && d.chores !== null ? (
            <>
              <span className="quick-time">
                {d.chores} {d.chores === 1 ? 'klusje' : 'klusjes'}
              </span>
            </>
          ) : valid && !hasMoney ? (
            <span className="quick-sub">
              <a href="#werk">Vul je zakgeld in</a> om te zien hoe lang je moet sparen.
            </span>
          ) : text.trim() && price === null ? (
            <span className="field-error">Dat is geen geldig bedrag</span>
          ) : (
            <span className="quick-sub muted">sparen</span>
          )}
        </div>
      </div>
      {d?.when && d.weeks !== 0 && (
        <p className="kid-when">
          {d.when}
          {kid.savings > 0 && <span className="muted"> Je spaarpot van {formatEuro(kid.savings)} telt al mee.</span>}
        </p>
      )}
      {valid && (
        <button
          type="button"
          className="link-btn quick-add"
          onClick={() => {
            onAdd(price);
            setText('');
          }}
        >
          + Op mijn verlanglijstje
        </button>
      )}
    </section>
  );
}

function KidItemForm({ onSubmit, prefill }: { onSubmit: (d: { name: string; price: number; frequency: 'eenmalig' | 'maand' }) => void; prefill?: { price: number; key: number } }) {
  const id = useId();
  const nameRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [monthly, setMonthly] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!prefill) return;
    setAmount(new Intl.NumberFormat('nl-NL', { maximumFractionDigits: 2, useGrouping: false }).format(prefill.price));
    setMonthly(false);
    nameRef.current?.focus();
  }, [prefill]);

  function submit(e: FormEvent) {
    e.preventDefault();
    const price = parseAmount(amount);
    if (!name.trim()) return setError('Wat wil je hebben? Typ een naam.');
    if (price === null || price <= 0) return setError('Typ een prijs, bijvoorbeeld 12,50');
    if (price > 100_000_000) return setError('Dat bedrag is te groot');
    setError(null);
    onSubmit({ name: name.trim(), price, frequency: monthly ? 'maand' : 'eenmalig' });
    setName('');
    setAmount('');
    setMonthly(false);
  }

  return (
    <form className="item-form" onSubmit={submit} noValidate>
      <div className="item-form-grid kid-form-grid">
        <div className="field f-name">
          <label htmlFor={`${id}-name`}>Wat wil je hebben?</label>
          <div className="input-wrap">
            <input ref={nameRef} id={`${id}-name`} type="text" value={name} maxLength={80} autoComplete="off" placeholder="bijv. Lego-set" onChange={(e) => setName(e.target.value)} />
          </div>
        </div>
        <div className="field f-amount">
          <label htmlFor={`${id}-price`}>Prijs</label>
          <div className="input-wrap">
            <span className="affix">€</span>
            <input id={`${id}-price`} type="text" inputMode="decimal" autoComplete="off" value={amount} placeholder="0,00" onChange={(e) => setAmount(e.target.value)} />
          </div>
        </div>
      </div>
      <label className="toggle kid-monthly">
        <input type="checkbox" checked={monthly} onChange={(e) => setMonthly(e.target.checked)} />
        <span className="toggle-track" aria-hidden="true" />
        <span>
          Moet je elke maand betalen?
          <small>Zoals een abonnement op een game of app.</small>
        </span>
      </label>
      <div className="item-form-footer">
        <p className={error ? 'field-error' : 'field-hint'} aria-live="polite">
          {error ?? ''}
        </p>
        <div className="btn-row">
          <button type="submit" className="btn btn-primary">
            Toevoegen
          </button>
        </div>
      </div>
    </form>
  );
}
