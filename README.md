# Worth It

Budgetplanner en calculator die laat zien hoeveel uur je moet werken voor je uitgaven. Nederlandstalig, met euro's en Nederlandse notatie (€ 1.234,56).

Geen backend en geen accounts: alle gegevens staan in `localStorage`, op het apparaat van de gebruiker.

## Onderdelen

- **Mijn werk**: uurloon (netto/bruto), uren en dagen per week, vakantieweken en reistijd. Berekent werkuren per jaar/maand en het "echte uurloon" inclusief reistijd.
- **Budget**: inkomsten en uitgaven per categorie en frequentie, alles omgerekend naar maand/jaar én naar werktijd, met een overzicht van waar je werktijd heen gaat.
- **Is het het waard?**: snelle check (prijs → werktijd) en een winkelmandje met aan/uit-vinkjes, menselijke vergelijkingen, spaardoel en "naar budget".
- **Extra's**: scenario's (meer verdienen, abonnementen opzeggen), jaaroverzicht per categorie, backup downloaden/terugzetten (JSON) en alles wissen.

### Zakgeldmodus (voor kinderen)

Bovenaan **Mijn werk** kies je "Zakgeld en klusjes". De app wordt dan simpeler:

- **Mijn geld**: zakgeld (per week of maand), geld per klusje, klusjes per maand en wat al in de spaarpot zit. Niets is verplicht.
- **Kan ik het kopen?**: typ een prijs en zie hoe lang je moet sparen, hoeveel klusjes het is en rond welke datum je het kunt kopen. Met een verlanglijstje om dingen aan en uit te vinken, ook voor dingen die je elke maand betaalt.
- Geen budget, scenario's of jaaroverzicht; backup en wissen blijven.

## Ontwikkelen

Vereist Node.js 20 of nieuwer.

```powershell
npm install
npm run dev      # ontwikkelserver op http://localhost:5173
npm test         # unit tests (Vitest)
npm run build    # productiebuild in dist/
```

`dist/` is een statische site en kan op elke statische host (Netlify, Vercel, GitHub Pages) worden gezet.

## Structuur

- `src/lib/` — rekenlogica, formattering, opslag en backup (met unit tests, `*.test.ts`)
- `src/pages/` — de vier tabbladen
- `src/components/` — formulieren, werktijdbalk, dialoog
- `src/styles.css` — design (licht/donker, één accentkleur)

## Rekenregels

- Werkuren per jaar = uren per week × (52 − vakantieweken); per maand = jaar / 12.
- Omrekenfactoren per jaar: dag 365, week 52, maand 12, kwartaal 4, jaar 1. Eenmalig telt niet mee in het maandbudget.
- Echte uurloon = loon / (werkuren + reisuren).
