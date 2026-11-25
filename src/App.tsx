import { useEffect, useState } from 'react';
import { BudgetPage } from './pages/BudgetPage';
import { CartPage } from './pages/CartPage';
import { ExtrasPage } from './pages/ExtrasPage';
import { ProfilePage } from './pages/ProfilePage';
import { useStore } from './state';
import type { ThemePref } from './lib/types';

type Tab = 'werk' | 'budget' | 'mandje' | 'extra';

const TABS: { id: Tab; label: string }[] = [
  { id: 'werk', label: 'Mijn werk' },
  { id: 'budget', label: 'Budget' },
  { id: 'mandje', label: 'Is het het waard?' },
  { id: 'extra', label: "Extra's" },
];

function tabFromHash(): Tab {
  const h = window.location.hash.replace('#', '');
  return TABS.some((t) => t.id === h) ? (h as Tab) : 'werk';
}

export function App() {
  const { state, saved, setTheme } = useStore();
  const [tab, setTab] = useState<Tab>(tabFromHash);

  useEffect(() => {
    const onHash = () => setTab(tabFromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useResolvedTheme(state.theme);

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-inner">
          <a className="brand" href="#werk" aria-label="Worth It, naar Mijn werk">
            <span className="brand-mark" aria-hidden="true">W</span>
            Worth It
          </a>
          <nav className="tabs" aria-label="Hoofdmenu">
            {TABS.map((t) => (
              <a key={t.id} href={`#${t.id}`} className={t.id === tab ? 'active' : ''} aria-current={t.id === tab ? 'page' : undefined}>
                {t.label}
              </a>
            ))}
          </nav>
          <ThemeButton theme={state.theme} onChange={setTheme} />
        </div>
      </header>

      <main className="main">
        {!saved && (
          <p className="banner" role="alert">
            Je gegevens kunnen niet worden opgeslagen in deze browser (bijv. privémodus). Ze verdwijnen als je de pagina sluit.
          </p>
        )}
        {tab === 'werk' ? (
          <ProfilePage />
        ) : tab === 'budget' ? (
          <BudgetPage />
        ) : tab === 'mandje' ? (
          <CartPage />
        ) : (
          <ExtrasPage />
        )}
      </main>

      <footer className="footer muted">Je gegevens blijven op dit apparaat. Geen account, geen server.</footer>
    </div>
  );
}

function useResolvedTheme(pref: ThemePref) {
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const dark = pref === 'dark' || (pref === 'system' && mq.matches);
      document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    };
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [pref]);
}

const NEXT_THEME: Record<ThemePref, ThemePref> = { system: 'light', light: 'dark', dark: 'system' };
const THEME_LABEL: Record<ThemePref, string> = { system: 'Systeem', light: 'Licht', dark: 'Donker' };

function ThemeButton({ theme, onChange }: { theme: ThemePref; onChange: (t: ThemePref) => void }) {
  return (
    <button
      type="button"
      className="icon-btn"
      onClick={() => onChange(NEXT_THEME[theme])}
      aria-label={`Thema: ${THEME_LABEL[theme]}. Klik voor ${THEME_LABEL[NEXT_THEME[theme]]}.`}
      title={`Thema: ${THEME_LABEL[theme]}`}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {theme === 'light' && (
          <>
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
          </>
        )}
        {theme === 'dark' && <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />}
        {theme === 'system' && (
          <>
            <rect x="3" y="4" width="18" height="12" rx="2" />
            <path d="M8 20h8M12 16v4" />
          </>
        )}
      </svg>
      <span className="icon-btn-label">{THEME_LABEL[theme]}</span>
    </button>
  );
}
