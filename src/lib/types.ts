export type WageType = 'netto' | 'bruto';

export interface Profile {
  /** Uurloon in euro's. 0 = nog niet ingevuld. */
  hourlyWage: number;
  wageType: WageType;
  hoursPerWeek: number;
  daysPerWeek: number;
  vacationWeeks: number;
  /** Reistijd per werkdag in minuten, heen + terug samen. */
  commuteMinutesPerDay: number;
  /** Reken werktijd uit met het "echte" uurloon (inclusief reistijd). */
  useRealWage: boolean;
}

export type Frequency = 'eenmalig' | 'dag' | 'week' | 'maand' | 'kwartaal' | 'jaar';

export type Category =
  | 'wonen'
  | 'eten'
  | 'vervoer'
  | 'abonnementen'
  | 'kleding'
  | 'uitgaan'
  | 'sparen'
  | 'overig';

export interface Income {
  id: string;
  name: string;
  amount: number;
  frequency: Frequency;
}

export interface Expense {
  id: string;
  name: string;
  amount: number;
  category: Category;
  frequency: Frequency;
}

export interface CartItem {
  id: string;
  name: string;
  price: number;
  frequency: Frequency;
  /** Aantal keer per periode, bijv. 3× per week. */
  times: number;
  selected: boolean;
  /** Categorie als het naar het budget gaat. */
  category: Category;
  /** Id van de uitgave in het budget, als het item daar al is toegevoegd. */
  budgetExpenseId?: string;
}

export type ThemePref = 'system' | 'light' | 'dark';

export interface AppState {
  version: 1;
  profile: Profile;
  incomes: Income[];
  expenses: Expense[];
  cart: CartItem[];
  theme: ThemePref;
}
