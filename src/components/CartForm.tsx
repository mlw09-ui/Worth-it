import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { CATEGORIES, FREQUENCIES } from '../lib/budget';
import { describeFrequency, itemPerPeriod } from '../lib/cart';
import { formatEuro, parseAmount } from '../lib/format';
import type { CartItem, Category, Frequency } from '../lib/types';
import { useWorkTime } from '../hooks';

export type CartDraft = Omit<CartItem, 'id' | 'selected' | 'budgetExpenseId'>;

interface Props {
  onSubmit: (draft: CartDraft) => void;
  /** Prijs uit de snelle check; `key` verandert bij elke nieuwe prefill. */
  prefill?: { price: number; key: number };
}

function amountText(n: number): string {
  return new Intl.NumberFormat('nl-NL', { maximumFractionDigits: 2, useGrouping: false }).format(n);
}

export function CartForm({ onSubmit, prefill }: Props) {
  const id = useId();
  const work = useWorkTime();
  const nameRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [frequency, setFrequency] = useState<Frequency>('eenmalig');
  const [times, setTimes] = useState('1');
  const [category, setCategory] = useState<Category>('overig');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!prefill) return;
    setAmount(amountText(prefill.price));
    setFrequency('eenmalig');
    setTimes('1');
    nameRef.current?.focus();
  }, [prefill]);

  const price = parseAmount(amount);
  const timesN = Math.max(1, Math.round(Number(times) || 1));
  const perPeriod = price && price > 0 ? itemPerPeriod({ price, times: timesN }) : 0;
  const live = perPeriod > 0 ? work.format(perPeriod) : null;

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return setError('Geef het een naam');
    if (price === null || price <= 0) return setError('Vul een prijs groter dan € 0 in');
    if (price > 100_000_000) return setError('Dat bedrag is te groot');
    if (!/^\d+$/.test(times.trim()) || Number(times) < 1 || Number(times) > 1000) return setError('Aantal keer: een heel getal van 1 tot 1000');
    setError(null);
    onSubmit({ name: name.trim(), price, frequency, times: timesN, category });
    setName('');
    setAmount('');
    setTimes('1');
  }

  return (
    <form className="item-form" onSubmit={submit} noValidate>
      <div className="item-form-grid cart-form-grid">
        <div className="field f-name">
          <label htmlFor={`${id}-name`}>Wat wil je kopen?</label>
          <div className="input-wrap">
            <input
              ref={nameRef}
              id={`${id}-name`}
              type="text"
              value={name}
              maxLength={80}
              autoComplete="off"
              placeholder="bijv. Koptelefoon"
              onChange={(e) => setName(e.target.value)}
            />
          </div>
        </div>
        <div className="field f-amount">
          <label htmlFor={`${id}-price`}>Prijs</label>
          <div className="input-wrap">
            <span className="affix">€</span>
            <input
              id={`${id}-price`}
              type="text"
              inputMode="decimal"
              autoComplete="off"
              value={amount}
              placeholder="0,00"
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
        </div>
        <div className="field f-times">
          <label htmlFor={`${id}-times`}>Aantal keer</label>
          <div className="input-wrap">
            <input
              id={`${id}-times`}
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={times}
              onChange={(e) => setTimes(e.target.value)}
            />
            <span className="affix">×</span>
          </div>
        </div>
        <div className="field f-freq">
          <label htmlFor={`${id}-freq`}>Hoe vaak</label>
          <div className="input-wrap select-wrap">
            <select id={`${id}-freq`} value={frequency} onChange={(e) => setFrequency(e.target.value as Frequency)}>
              {FREQUENCIES.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="field f-cat">
          <label htmlFor={`${id}-cat`}>Categorie</label>
          <div className="input-wrap select-wrap">
            <select id={`${id}-cat`} value={category} onChange={(e) => setCategory(e.target.value as Category)}>
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
      <div className="item-form-footer">
        <p className={error ? 'field-error' : live ? 'field-hint live' : 'field-hint'} aria-live="polite">
          {error ??
            (perPeriod > 0
              ? `${formatEuro(price!)} ${describeFrequency(frequency, timesN)}${live ? ` = ${live} werk${frequency === 'eenmalig' ? '' : ` per ${frequency}`}` : ''}`
              : 'Bijvoorbeeld: koffie, € 3,50, 3× per week.')}
        </p>
        <div className="btn-row">
          <button type="submit" className="btn btn-primary">
            In mandje
          </button>
        </div>
      </div>
    </form>
  );
}
