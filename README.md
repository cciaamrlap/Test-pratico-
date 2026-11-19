# Pre-Check Composizione Negoziata — Test Pratico Ministeriale

Applicazione web istituzionale (100% client-side, anonima e riservata) per la simulazione del **Test Pratico Ministeriale di sostenibilità del debito** (Decreto Dirigenziale — Sezione I, Codice della Crisi d'Impresa e dell'Insolvenza).

## Pubblicazione su GitHub Pages

Il repository include il workflow automatico [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) che compila l'applicazione React/Vite e pubblica la cartella `dist/` su GitHub Pages.

1. Apri le impostazioni del repository su GitHub: **Settings → Pages**.
2. Alla voce **Build and deployment → Source**, seleziona **GitHub Actions** (non *Deploy from a branch*).
3. Esegui un push sul branch `main` (oppure avvia manualmente il workflow dalla scheda **Actions → Pubblica su GitHub Pages → Run workflow**).

> **Nota tecnica**: Non pubblicare direttamente il branch sorgente senza compilazione (`Deploy from a branch / root`), poiché il browser non può eseguire direttamente i sorgenti TypeScript/React (`.tsx`) e GitHub Pages mostrerebbe il `README.md` anziché l'applicazione compilata.

## Sviluppo locale

```bash
npm install
npm run dev
```

Per generare il pacchetto statico di produzione nella cartella `dist/`:

```bash
npm run build
```
