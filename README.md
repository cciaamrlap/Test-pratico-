# Pre-Check Composizione Negoziata — Test Pratico Ministeriale

Applicazione web istituzionale (100% client-side, anonima e riservata) per la simulazione del **Test Pratico Ministeriale di sostenibilità del debito** (Decreto Dirigenziale — Sezione I, Codice della Crisi d'Impresa e dell'Insolvenza).

## Pubblicazione su GitHub Pages

Sono supportate tutte le modalità di pubblicazione su GitHub Pages (**Settings → Pages**):

- **Opzione 1 (Consigliata) — GitHub Actions**: imposta **Source: GitHub Actions**. Il workflow [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) compila automaticamente `dist/` ad ogni push su `main`/`master`.
- **Opzione 2 — Deploy from a branch (`/docs`)**: imposta **Source: Deploy from a branch**, branch `main` e cartella `/docs`. La build statica già compilata è presente nella cartella `docs/`.
- **Opzione 3 — Deploy from a branch (`/root`)**: anche lasciando la cartella radice `/ (root)`, la pagina reindirizza automaticamente alla versione compilata in `./docs/`.

## Sviluppo locale

```bash
npm install
npm run dev
```

Per aggiornare sia `dist/` sia la build statica in `docs/`:

```bash
npm run build
npx vite build --outDir docs
```
