import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { STORAGE_KEY, defaultState, loadState, newId, saveState } from './lib/storage';
import type { AppState, Profile, ThemePref } from './lib/types';

type ListKey = 'incomes' | 'expenses' | 'cart';
type ItemOf<K extends ListKey> = AppState[K][number];
type AnyItem = ItemOf<ListKey>;

interface Store {
  state: AppState;
  saved: boolean;
  updateProfile: (patch: Partial<Profile>) => void;
  setTheme: (theme: ThemePref) => void;
  /** Voegt een item toe en geeft het nieuwe id terug. */
  addItem: <K extends ListKey>(key: K, item: Omit<ItemOf<K>, 'id'>) => string;
  updateItem: <K extends ListKey>(key: K, id: string, patch: Partial<ItemOf<K>>) => void;
  /** Past een wijziging toe op alle items van een lijst. */
  updateAll: <K extends ListKey>(key: K, patch: Partial<ItemOf<K>>) => void;
  /** Verwijdert een item en geeft een functie terug die het terugzet. */
  removeItem: (key: ListKey, id: string) => () => void;
  /** Vervangt alle gegevens (import). */
  replaceState: (next: AppState) => void;
  /** Wist alles en begint opnieuw. Het thema blijft staan. */
  resetAll: () => void;
}

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(loadState);
  const [saved, setSaved] = useState(true);

  useEffect(() => {
    setSaved(saveState(state));
  }, [state]);

  const updateProfile = useCallback((patch: Partial<Profile>) => {
    setState((s) => ({ ...s, profile: { ...s.profile, ...patch } }));
  }, []);

  const setTheme = useCallback((theme: ThemePref) => {
    setState((s) => ({ ...s, theme }));
  }, []);

  const addItem = useCallback(<K extends ListKey>(key: K, item: Omit<ItemOf<K>, 'id'>) => {
    const id = newId();
    setState((s) => ({ ...s, [key]: [...s[key], { ...item, id }] }));
    return id;
  }, []);

  const updateItem = useCallback(<K extends ListKey>(key: K, id: string, patch: Partial<ItemOf<K>>) => {
    setState((s) => ({
      ...s,
      [key]: (s[key] as AnyItem[]).map((it) => (it.id === id ? { ...it, ...patch } : it)),
    }));
  }, []);

  const updateAll = useCallback(<K extends ListKey>(key: K, patch: Partial<ItemOf<K>>) => {
    setState((s) => ({ ...s, [key]: (s[key] as AnyItem[]).map((it) => ({ ...it, ...patch })) }));
  }, []);

  const removeItem = useCallback((key: ListKey, id: string) => {
    let removed: { item: AnyItem; index: number } | null = null;
    setState((s) => {
      const list = s[key] as AnyItem[];
      const index = list.findIndex((it) => it.id === id);
      if (index < 0) return s;
      removed = { item: list[index], index };
      return { ...s, [key]: list.filter((it) => it.id !== id) };
    });
    return () => {
      const r = removed;
      if (!r) return;
      setState((s) => {
        const list = [...(s[key] as AnyItem[])];
        if (list.some((it) => it.id === r.item.id)) return s;
        list.splice(Math.min(r.index, list.length), 0, r.item);
        return { ...s, [key]: list };
      });
    };
  }, []);

  const replaceState = useCallback((next: AppState) => setState(next), []);

  const resetAll = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Opslag niet beschikbaar: de state hieronder wordt toch leeggemaakt.
    }
    setState((s) => ({ ...defaultState(), theme: s.theme }));
  }, []);

  const value = useMemo(
    () => ({ state, saved, updateProfile, setTheme, addItem, updateItem, updateAll, removeItem, replaceState, resetAll }),
    [state, saved, updateProfile, setTheme, addItem, updateItem, updateAll, removeItem, replaceState, resetAll],
  );
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const store = useContext(StoreContext);
  if (!store) throw new Error('useStore buiten StoreProvider');
  return store;
}
