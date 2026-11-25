import { useId, useState } from 'react';
import { humanComparison, type ComparisonContext } from '../lib/cart';
import { formatEuro, parseAmount } from '../lib/format';
import { useWorkTime } from '../hooks';

interface Props {
  ctx: ComparisonContext;
  onAddToCart: (price: number) => void;
}

/** Typ een prijs en zie meteen de werktijd. Slaat niets op. */
export function QuickCheck({ ctx, onAddToCart }: Props) {
  const id = useId();
  const work = useWorkTime();
  const [text, setText] = useState('');
  const price = parseAmount(text);
  const valid = price !== null && price > 0 && price <= 100_000_000;
  const hours = valid ? work.hours(price) : null;

  return (
    <section className="card quick" aria-labelledby={`${id}-title`}>
      <h2 id={`${id}-title`}>Snelle check</h2>
      <p className="muted">Typ een prijs. Er wordt niets opgeslagen.</p>
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
          {valid && hours !== null ? (
            <>
              <span className="quick-time">{work.formatHours(hours)}</span>
              <span className="quick-sub">{humanComparison(hours, ctx)}</span>
            </>
          ) : valid ? (
            <span className="quick-sub">
              {formatEuro(price)}. <a href="#werk">Vul je uurloon in</a> om de werktijd te zien.
            </span>
          ) : text.trim() && price === null ? (
            <span className="field-error">Dat is geen geldig bedrag</span>
          ) : (
            <span className="quick-sub muted">werk</span>
          )}
        </div>
      </div>
      {valid && (
        <button
          type="button"
          className="link-btn quick-add"
          onClick={() => {
            onAddToCart(price);
            setText('');
          }}
        >
          + In het mandje leggen
        </button>
      )}
    </section>
  );
}
