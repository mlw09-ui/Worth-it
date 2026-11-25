import { useEffect, useId, useState, type ReactNode } from 'react';
import { formatNumber, parseAmount } from '../lib/format';

interface Props {
  label: string;
  value: number;
  onChange: (value: number) => void;
  prefix?: string;
  suffix?: string;
  min?: number;
  max?: number;
  decimals?: number;
  hint?: ReactNode;
  placeholder?: string;
}

/**
 * Tekstveld voor getallen in Nederlandse notatie ("11,99").
 * Houdt de getypte tekst lokaal bij, zodat "11," niet meteen wordt weggepoetst.
 */
export function NumberField({ label, value, onChange, prefix, suffix, min = 0, max = Infinity, decimals = 2, hint, placeholder }: Props) {
  const id = useId();
  const [text, setText] = useState(() => display(value, decimals));
  const [focused, setFocused] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!focused) setText(display(value, decimals));
  }, [value, decimals, focused]);

  function handleChange(raw: string) {
    setText(raw);
    if (raw.trim() === '') {
      setError(null);
      onChange(0);
      return;
    }
    const n = parseAmount(raw);
    if (n === null) return setError('Vul een getal in');
    if (n < min) return setError(`Minimaal ${formatNumber(min, decimals)}`);
    if (n > max) return setError(`Maximaal ${formatNumber(max, decimals)}`);
    setError(null);
    onChange(n);
  }

  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className={`input-wrap${error ? ' has-error' : ''}`}>
        {prefix && <span className="affix">{prefix}</span>}
        <input
          id={id}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={text}
          placeholder={placeholder}
          aria-invalid={!!error}
          aria-describedby={hint || error ? `${id}-hint` : undefined}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            setError(null);
          }}
        />
        {suffix && <span className="affix">{suffix}</span>}
      </div>
      {(error || hint) && (
        <p id={`${id}-hint`} className={error ? 'field-error' : 'field-hint'}>
          {error ?? hint}
        </p>
      )}
    </div>
  );
}

function display(value: number, decimals: number): string {
  if (!value) return '';
  return new Intl.NumberFormat('nl-NL', { maximumFractionDigits: decimals, useGrouping: false }).format(value);
}
