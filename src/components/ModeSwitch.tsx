import { useStore } from '../state';

/** Kies tussen de gewone modus (werk en uurloon) en de simpele zakgeldmodus. */
export function ModeSwitch() {
  const { state, setMode } = useStore();
  return (
    <div className="mode-switch">
      <span className="label" id="mode-label">
        Hoe krijg jij je geld?
      </span>
      <div className="segmented" role="radiogroup" aria-labelledby="mode-label">
        <button type="button" role="radio" aria-checked={state.mode === 'werk'} className={state.mode === 'werk' ? 'active' : ''} onClick={() => setMode('werk')}>
          Ik werk
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={state.mode === 'zakgeld'}
          className={state.mode === 'zakgeld' ? 'active' : ''}
          onClick={() => setMode('zakgeld')}
        >
          Zakgeld en klusjes
        </button>
      </div>
    </div>
  );
}
