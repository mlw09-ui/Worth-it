import { useId, useState, type FormEvent } from 'react';
import { CATEGORIES, FREQUENCIES } from '../lib/budget';
import { formatEuro, parseAmount } from '../lib/format';
import type { Category, Frequency } from '../lib/types';

export interface ItemDraft {
  name: string;
  amount: number;
  frequency: Frequency;
  category?: Category;
}

interface Props {
  kind: 'income' | 'expense';
  initial?: ItemDraft;
  submitLabel: string;
  onSubmit: (draft: ItemDraft) => void;
  onCancel?: () => void;
  /** Toon live hoeveel werk het bedrag kost. */
  preview?: (draft: ItemDraft) => string | null;
}

function amountText(n: number | undefined): string {
  if (!n) return '';
  return new Intl.NumberFormat('nl-NL', { maximumFractionDigits: 2, useGrouping: false }).format(n);
}

export function ItemForm({ kind, initial, submitLabel, onSubmit, onCancel, preview }: Props) {
  const id = useId();
  const [name, setName] = useState(initial?.name ?? '');
  const [amount, setAmount] = useState(amountText(initial?.amount));
  const [frequency, setFrequency] = useState<Frequency>(initial?.frequency ?? 'maand');
  const [category, setCategory] = useState<Category>(initial?.category ?? 'wonen');
  const [error, setError] = useState<string | null>(null);

  const parsed = parseAmount(amount);
  const draft: ItemDraft = { name: name.trim(), amount: parsed ?? 0, frequency, ...(kind === 'expense' ? { category } : {}) };
  const live = parsed && parsed > 0 && preview ? preview(draft) : null;

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!draft.name) return setError('Geef het een naam');
    if (parsed === null || parsed <= 0) return setError('Vul een bedrag groter dan € 0 in');
    if (parsed > 100_000_000) return setError('Dat bedrag is te groot');
    setError(null);
    onSubmit(draft);
    if (!initial) {
      setName('');
      setAmount('');
    }
  }

  return (
    <form className="item-form" onSubmit={submit} noValidate>
      <div className="item-form-grid">
        <div className="field f-name">
          <label htmlFor={`${id}-name`}>Naam</label>
          <div className="input-wrap">
            <input
              id={`${id}-name`}
              type="text"
              value={name}
              maxLength={80}
              autoComplete="off"
              placeholder={kind === 'income' ? 'bijv. Salaris' : 'bijv. Huur'}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
        </div>
        <div className="field f-amount">
          <label htmlFor={`${id}-amount`}>Bedrag</label>
          <div className="input-wrap">
            <span className="affix">€</span>
            <input
              id={`${id}-amount`}
              type="text"
              inputMode="decimal"
              autoComplete="off"
              value={amount}
              placeholder="0,00"
              onChange={(e) => setAmount(e.target.value)}
            />
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
        {kind === 'expense' && (
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
        )}
      </div>
      <div className="item-form-footer">
        <p className={error ? 'field-error' : parsed ? 'field-hint live' : 'field-hint'} aria-live="polite">
          {error ??
            (parsed !== null && parsed > 0
              ? live ?? `${formatEuro(parsed)}`
              : kind === 'expense'
                ? 'Je ziet direct hoeveel werk het kost.'
                : '')}
        </p>
        <div className="btn-row">
          {onCancel && (
            <button type="button" className="btn btn-ghost" onClick={onCancel}>
              Annuleren
            </button>
          )}
          <button type="submit" className="btn btn-primary">
            {submitLabel}
          </button>
        </div>
      </div>
    </form>
  );
}
