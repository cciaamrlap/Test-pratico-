import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  ShieldCheck,
  BookOpen,
  AlertTriangle,
  HelpCircle,
  ArrowRight,
  ArrowLeft,
  Printer,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
  MinusCircle,
  RotateCcw,
  FileText,
  CheckSquare,
  Square,
  X,
  Landmark,
  Info,
  Building2,
} from 'lucide-react';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface TestInputs {
  c5: number;  // Debito scaduto (+)
  c6: number;  // di cui relativo ad iscrizioni a ruolo (solo informativo, non somma)
  c7: number;  // Debito riscadenziato o oggetto di moratorie (+)
  c8: number;  // Linee di credito bancarie utilizzate delle quali non ci si attende il rinnovo (+)
  c9: number;  // Rate di mutui e finanziamenti in scadenza nei successivi 2 anni (+)
  c10: number; // Investimenti relativi alle iniziative industriali che si intendono adottare (+)
  c11: number; // Risorse ritraibili da dismissione cespiti o rami d'azienda (-)
  c12: number; // Nuovi conferimenti e finanziamenti, anche postergati, previsti (-)
  c13: number; // Stima margine operativo netto negativo nel primo anno (+ valore assoluto)
  c18: number; // Stima del MOL prospettico normalizzato annuo, a regime (+)
  c19: number; // Investimenti di mantenimento annui a regime (-)
  c20: number; // Imposte sul reddito annue che dovranno essere assolte (-)
}

type SemaforoColor = 'grigio' | 'verde' | 'giallo' | 'arancione' | 'rosso';

interface BandInfo {
  fascia: number;
  semaforoColor: SemaforoColor;
  semaforoLabel: string;
  fasciaTitle: string;
  ministerialText: string;
  pointReference: string;
  guidanceTitle: string;
  guidanceBody: string;
  recommendedActions: string[];
  urgencyLevel: 'neutral' | 'low' | 'medium' | 'high' | 'critical';
}

type WizardStep = 1 | 2 | 3;
type WorkspaceMode = 'wizard' | 'worksheet';

// ============================================================================
// INITIAL STATE & SAMPLE SCENARIOS
// ============================================================================

const INITIAL_INPUTS: TestInputs = {
  c5: 0,
  c6: 0,
  c7: 0,
  c8: 0,
  c9: 0,
  c10: 0,
  c11: 0,
  c12: 0,
  c13: 0,
  c18: 0,
  c19: 0,
  c20: 0,
};

const SAMPLE_SCENARIOS: Array<{
  id: string;
  label: string;
  description: string;
  inputs: TestInputs;
}> = [
  {
    id: 'verde',
    label: 'Tensione temporanea (Verde)',
    description: 'Rapporto ~1,6 · Fascia 2',
    inputs: {
      c5: 140000,
      c6: 25000,
      c7: 40000,
      c8: 30000,
      c9: 95000,
      c10: 25000,
      c11: 45000,
      c12: 50000,
      c13: 0,
      c18: 220000,
      c19: 35000,
      c20: 40000,
    },
  },
  {
    id: 'giallo',
    label: 'Squilibrio intermedio (Giallo)',
    description: 'Rapporto ~3,2 · Fascia 4',
    inputs: {
      c5: 320000,
      c6: 85000,
      c7: 110000,
      c8: 60000,
      c9: 160000,
      c10: 80000,
      c11: 90000,
      c12: 60000,
      c13: -35000,
      c18: 280000,
      c19: 45000,
      c20: 42000,
    },
  },
  {
    id: 'arancione',
    label: 'Elevata complessità (Arancione/Rosso)',
    description: 'Rapporto ~5,4 · Fascia 6',
    inputs: {
      c5: 540000,
      c6: 180000,
      c7: 150000,
      c8: 95000,
      c9: 240000,
      c10: 120000,
      c11: 110000,
      c12: 50000,
      c13: -95000,
      c18: 310000,
      c19: 60000,
      c20: 50000,
    },
  },
  {
    id: 'rosso',
    label: 'Disequilibrio critico (Rosso)',
    description: 'Rapporto > 6 o flussi negativi',
    inputs: {
      c5: 680000,
      c6: 290000,
      c7: 190000,
      c8: 120000,
      c9: 280000,
      c10: 90000,
      c11: 40000,
      c12: 0,
      c13: -160000,
      c18: 150000,
      c19: 85000,
      c20: 25000,
    },
  },
];

const DOCUMENT_CHECKLIST_ITEMS = [
  {
    id: 'bilanci',
    title: 'Ultimi tre bilanci approvati',
    detail:
      'Oppure, per gli imprenditori non tenuti al deposito, le dichiarazioni dei redditi e dell’IVA degli ultimi tre periodi di imposta e una situazione patrimoniale ed economica aggiornata.',
  },
  {
    id: 'situazione_aggiornata',
    title: 'Situazione patrimoniale e finanziaria aggiornata',
    detail:
      'Redatta in forma analitica a una data non anteriore a sessanta giorni rispetto alla presentazione dell’istanza, con il dettaglio della posizione finanziaria netta.',
  },
  {
    id: 'elenco_creditori',
    title: 'Elenco completo dei creditori',
    detail:
      'Con indicazione dei rispettivi crediti scaduti e a scadere, della natura del credito e dell’esistenza di eventuali diritti reali o personali di garanzia.',
  },
  {
    id: 'certificati_fiscali',
    title: 'Certificato unico dei debiti tributari e contributivi',
    detail:
      'Certificato unico dei debiti tributari (art. 364 CCII), situazione debitoria complessiva dell’Agente della Riscossione, certificato INPS/INAIL e visura della Centrale dei Rischi.',
  },
  {
    id: 'piano_bozza',
    title: 'Progetto di piano di risanamento e relazione sintetica',
    detail:
      'Relazione chiara e sintetica sull’attività in concreto esercitata, accompagnata da un piano finanziario per i successivi 6 mesi e dalle iniziative industriali (Check-List Sezione II).',
  },
  {
    id: 'pendenze',
    title: 'Dichiarazione sulle procedure pendenti',
    detail:
      'Dichiarazione sulla eventuale pendenza di ricorsi per l’apertura della liquidazione giudiziale o per l’accertamento dello stato di insolvenza.',
  },
];

// ============================================================================
// FORMATTING HELPERS
// ============================================================================

const eurFormatter = new Intl.NumberFormat('it-IT', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const numberFormatter = new Intl.NumberFormat('it-IT', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const ratioFormatter = new Intl.NumberFormat('it-IT', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function formatEUR(value: number): string {
  return eurFormatter.format(Number.isFinite(value) ? value : 0);
}

// ============================================================================
// MINISTERIAL CLASSIFICATION ENGINE
// ============================================================================

function getBandInfo(fascia: number, totaleA: number, totaleB: number): BandInfo {
  if (fascia === 0) {
    return {
      fascia: 0,
      semaforoColor: 'grigio',
      semaforoLabel: 'IN ATTESA DI DATI',
      fasciaTitle: 'Esito non ancora calcolabile',
      ministerialText:
        'Inserisci i dati debitori e i flussi prospettici per calcolare il grado di difficoltà.',
      pointReference: 'Sezione I — Test Pratico preliminare',
      guidanceTitle: 'Compila le sezioni Totale A e Totale B per avviare la valutazione',
      guidanceBody:
        'Il test mette a confronto il debito che richiede ristrutturazione (Aggregato A) con i flussi di cassa annui che l’impresa è in grado di generare a regime (Aggregato B).',
      recommendedActions: [
        'Inserisci le esposizioni debitorie scadute, riscadenziate e in scadenza nel Passo 1.',
        'Indica il Margine Operativo Lordo normalizzato, gli investimenti di mantenimento e le imposte nel Passo 2.',
      ],
      urgencyLevel: 'neutral',
    };
  }

  if (fascia === 1) {
    return {
      fascia: 1,
      semaforoColor: 'verde',
      semaforoLabel: 'SEMAFORO VERDE',
      fasciaTitle: 'Fascia 1 — Difficoltà contenute',
      ministerialText:
        "Difficoltà contenute. L'andamento corrente dell'impresa è sufficiente ad individuare il percorso di risanamento (Punto 6 Sez. I).",
      pointReference: 'Punto 6, Sezione I — Decreto Dirigenziale',
      guidanceTitle: 'Sostenibilità ordinaria elevata — Monitoraggio consigliato',
      guidanceBody:
        'Il rapporto tra debito da ristrutturare e flussi annui a regime è pari o inferiore a 1 anno. La capacità di generazione di cassa ordinaria consente di assorbire la tensione finanziaria mediante accordi bilaterali o gestione corrente.',
      recommendedActions: [
        'Presidia la tesoreria a 6 mesi per prevenire nuovi ritardi su fornitori strategici, fisco ed enti previdenziali.',
        'Valuta accordi stragiudiziali diretti o piani di rientro ordinari con i principali creditori.',
        'Puoi comunque contattare lo Sportello informativo della Camera di Commercio per orientamento preventivo sugli adeguati assetti (art. 2086 c.c.).',
      ],
      urgencyLevel: 'low',
    };
  }

  if (fascia === 2) {
    return {
      fascia: 2,
      semaforoColor: 'verde',
      semaforoLabel: 'SEMAFORO VERDE',
      fasciaTitle: 'Fascia 2 — Difficoltà contenute',
      ministerialText:
        "Difficoltà contenute (livello attorno a 2). L'andamento corrente dell'impresa può essere sufficiente ad individuare il percorso di risanamento senza necessità di un complesso piano d'impresa (Punto 6 Sez. I).",
      pointReference: 'Punto 6, Sezione I — Decreto Dirigenziale',
      guidanceTitle: 'Risanamento perseguibile in continuità ordinaria',
      guidanceBody:
        'Il rapporto tra debito da ristrutturare e flussi a regime si colloca tra 1 e 2. La gestione caratteristica conserva una solidità idonea a sostenere un rientro ordinato senza interventi industriali straordinari.',
      recommendedActions: [
        'Predisponi un budget di tesoreria semestrale per verificare eventuali picchi di fabbisogno nel breve periodo.',
        'Qualora i creditori sollecitino garanzie o azioni esecutive, valuta l’accesso alla Composizione Negoziata per condurre trattative protette.',
        'Verifica la regolarità delle eventuali posizioni verso Agenzia delle Entrate e INPS per evitare l’emersione di segnalazioni ex art. 25-novies CCII.',
      ],
      urgencyLevel: 'low',
    };
  }

  if (fascia === 3 || fascia === 4) {
    return {
      fascia,
      semaforoColor: 'giallo',
      semaforoLabel: 'SEMAFORO GIALLO',
      fasciaTitle: `Fascia ${fascia} — Squilibrio intermedio`,
      ministerialText:
        "Squilibrio intermedio. Il risanamento dipende dall'efficacia e dall'esito delle iniziative industriali che si intendono adottare. Assume precipua rilevanza la redazione del piano d'impresa secondo la check-list della Sezione II (Punto 7 Sez. I).",
      pointReference: 'Punto 7, Sezione I — Decreto Dirigenziale',
      guidanceTitle: 'Consigliato accesso allo Sportello Camerale e Nomina Esperto Indipendente',
      guidanceBody:
        'Il debito da ristrutturare richiede tra 2 e 4 anni di flussi di cassa a regime. Il superamento dello squilibrio non è automatico e dipende dalla credibilità delle azioni industriali e finanziarie negoziate con i creditori.',
      recommendedActions: [
        'Accedi alla Piattaforma Nazionale della Camera di Commercio per avviare la Composizione Negoziata e richiedere la nomina di un Esperto Indipendente.',
        'Valuta la richiesta di misure protettive del patrimonio (art. 18 CCII) per sospendere eventuali azioni esecutive o cautelari durante le trattative.',
        'Redigi un piano industriale ed economico-finanziario dettagliato seguendo la Lista di Controllo della Sezione II del Decreto Dirigenziale.',
      ],
      urgencyLevel: 'medium',
    };
  }

  if (fascia === 5 || fascia === 6) {
    return {
      fascia,
      semaforoColor: 'arancione',
      semaforoLabel: 'SEMAFORO ARANCIONE / ROSSO',
      fasciaTitle: `Fascia ${fascia} — Elevata complessità`,
      ministerialText:
        "Elevata complessità. La presenza di un MOL positivo non è sufficiente a consentire il risanamento; può rendersi necessaria la cessione dell'azienda o di rami di essa (continuità indiretta - Punto 8 Sez. I).",
      pointReference: 'Punto 8, Sezione I — Decreto Dirigenziale',
      guidanceTitle: 'Intervento urgente tramite Piattaforma Nazionale e Misure Protettive',
      guidanceBody:
        'Con un rapporto compreso tra 4 e 6, la sola prosecuzione dell’attività nella configurazione attuale non garantisce la sostenibilità del debito nei tempi fisiologici di mercato. Occorre valutare manovre straordinarie o cessioni in continuità.',
      recommendedActions: [
        'Presenta tempestivamente istanza sulla Piattaforma Nazionale presso la Camera di Commercio competente per la nomina dell’Esperto Indipendente.',
        'Richiedi immediatamente le misure protettive ex art. 18 CCII per proteggere il valore aziendale e prevenire la decadenza dai benefici o la perdita di continuità.',
        'Esamina insieme ai tuoi consulenti e all’Esperto ipotesi di continuità indiretta (cessione d’azienda o di rami d’azienda ex art. 22 CCII) o accordi di ristrutturazione con stralci significativi.',
      ],
      urgencyLevel: 'high',
    };
  }

  // fascia === 99
  const isNegativeCashFlow = totaleA > 0 && totaleB <= 0;
  return {
    fascia: 99,
    semaforoColor: 'rosso',
    semaforoLabel: 'SEMAFORO ROSSO',
    fasciaTitle: isNegativeCashFlow
      ? 'Oltre Fascia 6 — Flussi a regime nulli o negativi'
      : 'Oltre Fascia 6 — Rapporto superiore a 6',
    ministerialText:
      'Disequilibrio economico a regime o debito eccessivo rispetto ai flussi. Si rendono necessarie iniziative in forte discontinuità rispetto alla normale conduzione (interventi sui processi, cambio modello di business, cessione rami d\'azienda o aggregazioni - Punti 7 e 8 Sez. I).',
    pointReference: 'Punti 7 e 8, Sezione I — Decreto Dirigenziale',
    guidanceTitle: 'Azione immediata richiesta — Attivazione percorso protetto in Camera di Commercio',
    guidanceBody: isNegativeCashFlow
      ? 'I flussi annui al servizio del debito (TOTALE B) risultano pari a zero o negativi: la gestione corrente non genera risorse per servire l’esposizione debitoria accumulata. È prioritario intervenire subito per evitare l’aggravamento del dissesto.'
      : 'Il rapporto tra debito da ristrutturare e flussi annui supera la soglia massima di 6. La prosecuzione inerziale espone l’organo amministrativo a responsabilità e rende indispensabili misure di forte discontinuità.',
    recommendedActions: [
      'Contatta con urgenza un consulente legale/aziendale specializzato in crisi d’impresa e prepara i documenti per accedere alla Piattaforma Nazionale presso la Camera di Commercio.',
      'Valuta l’attivazione della Composizione Negoziata con misure protettive (art. 18 CCII) e la sospensione degli obblighi di ricapitalizzazione (art. 20 CCII).',
      'Considera operazioni straordinarie di discontinuità: cessione dell’azienda o rami produttivi, aggregazioni industriali, apporto di nuova finanza o accesso agli strumenti di regolazione della crisi (art. 25-sexies CCII concordato semplificato, ove applicabile).',
    ],
    urgencyLevel: 'critical',
  };
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface InfoTooltipProps {
  title: string;
  content: string;
  note?: string;
}

function InfoTooltip({ title, content, note }: InfoTooltipProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative inline-flex items-center no-print">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        aria-label={`Informazioni su: ${title}`}
        aria-expanded={open}
        className="inline-flex items-center justify-center w-6 h-6 rounded text-slate-400 hover:text-slate-900 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 transition-colors cursor-pointer"
      >
        <HelpCircle className="w-4 h-4" />
      </button>

      {open && (
        <div
          role="tooltip"
          className="absolute left-0 sm:left-auto sm:right-0 top-full mt-2 z-40 w-72 sm:w-80 rounded-lg bg-slate-900 text-slate-100 p-3.5 shadow-xl border border-slate-700 text-xs leading-relaxed pointer-events-auto"
        >
          <div className="font-semibold text-white mb-1">{title}</div>
          <p className="text-slate-300">{content}</p>
          {note && (
            <div className="mt-2 pt-2 border-t border-slate-700 text-slate-200 font-medium">
              {note}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface CurrencyInputProps {
  id: string;
  value: number;
  onChange: (val: number) => void;
  allowNegative?: boolean;
  hasWarning?: boolean;
  ariaLabel: string;
}

function CurrencyInput({
  id,
  value,
  onChange,
  allowNegative = false,
  hasWarning = false,
  ariaLabel,
}: CurrencyInputProps) {
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState<string>('');

  const handleFocus = () => {
    setFocused(true);
    setDraft(value === 0 ? '' : String(value).replace('.', ','));
  };

  const parseDraft = (raw: string): number => {
    const cleaned = raw.trim().replace(/\s+/g, '');
    if (!cleaned || cleaned === '-') return 0;

    // Normalize Italian decimal comma vs dots
    // If both '.' and ',' exist, assume '.' is thousand separator and ',' is decimal
    let normalized = cleaned;
    if (cleaned.includes(',') && cleaned.includes('.')) {
      normalized = cleaned.replace(/\./g, '').replace(',', '.');
    } else if (cleaned.includes(',')) {
      normalized = cleaned.replace(',', '.');
    }

    const parsed = parseFloat(normalized);
    if (!Number.isFinite(parsed)) return 0;
    return allowNegative ? parsed : Math.max(0, parsed);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value;
    // Allow digits, optional leading minus (if allowNegative), comma, dot
    const regex = allowNegative ? /^-?[0-9.,]*$/ : /^[0-9.,]*$/;
    if (!regex.test(next)) return;
    setDraft(next);
    onChange(parseDraft(next));
  };

  const handleBlur = () => {
    setFocused(false);
    const parsed = parseDraft(draft);
    onChange(parsed);
  };

  const displayValue = focused
    ? draft
    : value === 0
      ? '0'
      : numberFormatter.format(value);

  return (
    <div
      className={`flex items-center rounded-md border bg-white transition-colors ${
        hasWarning
          ? 'border-amber-500 ring-1 ring-amber-500/30'
          : focused
            ? 'border-slate-900 ring-2 ring-slate-900/15'
            : 'border-slate-300 hover:border-slate-400'
      }`}
    >
      <span className="pl-3 pr-2 py-2.5 text-xs font-mono font-medium text-slate-500 select-none border-r border-slate-200 bg-slate-50 rounded-l-md">
        €
      </span>
      <input
        id={id}
        type="text"
        inputMode={allowNegative ? 'text' : 'decimal'}
        value={displayValue}
        onFocus={handleFocus}
        onChange={handleChange}
        onBlur={handleBlur}
        aria-label={ariaLabel}
        placeholder="0"
        className="w-full px-3 py-2.5 text-right font-mono text-sm font-medium text-slate-900 tabular-nums bg-transparent focus:outline-none rounded-r-md"
      />
    </div>
  );
}

interface TrafficLightVisualProps {
  color: SemaforoColor;
  compact?: boolean;
}

function TrafficLightVisual({ color, compact = false }: TrafficLightVisualProps) {
  const isRed = color === 'rosso' || color === 'arancione';
  const isOrange = color === 'arancione';
  const isYellow = color === 'giallo';
  const isGreen = color === 'verde';

  if (compact) {
    return (
      <div
        className="inline-flex items-center gap-1.5 px-2.5 py-2 rounded-lg bg-slate-900 border border-slate-800"
        aria-hidden="true"
      >
        <span
          className={`w-3.5 h-3.5 rounded-full transition-all duration-200 ${
            isRed
              ? isOrange
                ? 'bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.85)]'
                : 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.85)]'
              : 'bg-slate-700/80'
          }`}
        />
        <span
          className={`w-3.5 h-3.5 rounded-full transition-all duration-200 ${
            isYellow
              ? 'bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.85)]'
              : 'bg-slate-700/80'
          }`}
        />
        <span
          className={`w-3.5 h-3.5 rounded-full transition-all duration-200 ${
            isGreen
              ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.85)]'
              : 'bg-slate-700/80'
          }`}
        />
      </div>
    );
  }

  return (
    <div
      className="flex flex-col items-center gap-3 p-3.5 rounded-xl bg-slate-900 border border-slate-800 shadow-inner w-20 shrink-0"
      aria-hidden="true"
    >
      {/* Rosso / Arancione */}
      <div
        className={`w-11 h-11 rounded-full border-2 transition-all duration-200 ${
          color === 'rosso'
            ? 'bg-red-500 border-red-300 shadow-[0_0_22px_rgba(239,68,68,0.8)]'
            : color === 'arancione'
              ? 'bg-orange-500 border-orange-300 shadow-[0_0_22px_rgba(249,115,22,0.8)]'
              : 'bg-slate-800 border-slate-700'
        }`}
      />
      {/* Giallo */}
      <div
        className={`w-11 h-11 rounded-full border-2 transition-all duration-200 ${
          color === 'giallo'
            ? 'bg-amber-400 border-amber-200 shadow-[0_0_22px_rgba(251,191,36,0.8)]'
            : 'bg-slate-800 border-slate-700'
        }`}
      />
      {/* Verde */}
      <div
        className={`w-11 h-11 rounded-full border-2 transition-all duration-200 ${
          color === 'verde'
            ? 'bg-emerald-500 border-emerald-300 shadow-[0_0_22px_rgba(16,185,129,0.8)]'
            : 'bg-slate-800 border-slate-700'
        }`}
      />
    </div>
  );
}

function getStatusIcon(color: SemaforoColor, className = 'w-5 h-5') {
  switch (color) {
    case 'verde':
      return <CheckCircle2 className={className} />;
    case 'giallo':
      return <AlertCircle className={className} />;
    case 'arancione':
      return <AlertTriangle className={className} />;
    case 'rosso':
      return <ShieldAlert className={className} />;
    default:
      return <MinusCircle className={className} />;
  }
}

function getBandColors(color: SemaforoColor) {
  switch (color) {
    case 'verde':
      return {
        surface: 'bg-emerald-50 border-emerald-200',
        headerBg: 'bg-emerald-900 text-white',
        label: 'text-emerald-800',
        badge: 'bg-emerald-100 text-emerald-900 border-emerald-300',
        accentText: 'text-emerald-700',
      };
    case 'giallo':
      return {
        surface: 'bg-amber-50 border-amber-200',
        headerBg: 'bg-amber-800 text-white',
        label: 'text-amber-900',
        badge: 'bg-amber-100 text-amber-950 border-amber-300',
        accentText: 'text-amber-800',
      };
    case 'arancione':
      return {
        surface: 'bg-orange-50 border-orange-200',
        headerBg: 'bg-orange-800 text-white',
        label: 'text-orange-950',
        badge: 'bg-orange-100 text-orange-950 border-orange-300',
        accentText: 'text-orange-800',
      };
    case 'rosso':
      return {
        surface: 'bg-red-50 border-red-200',
        headerBg: 'bg-red-900 text-white',
        label: 'text-red-950',
        badge: 'bg-red-100 text-red-950 border-red-300',
        accentText: 'text-red-800',
      };
    default:
      return {
        surface: 'bg-slate-100 border-slate-200',
        headerBg: 'bg-slate-800 text-white',
        label: 'text-slate-700',
        badge: 'bg-slate-200 text-slate-800 border-slate-300',
        accentText: 'text-slate-600',
      };
  }
}

// ============================================================================
// MAIN APPLICATION COMPONENT
// ============================================================================

export default function App() {
  const [inputs, setInputs] = useState<TestInputs>(INITIAL_INPUTS);
  const [currentStep, setCurrentStep] = useState<WizardStep>(1);
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>('wizard');
  const [instructionsOpen, setInstructionsOpen] = useState(false);
  const [checkedDocs, setCheckedDocs] = useState<Record<string, boolean>>({});
  const [logoError, setLogoError] = useState(false);

  // Close drawer with Escape
  useEffect(() => {
    if (!instructionsOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setInstructionsOpen(false);
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [instructionsOpen]);

  const updateField = (field: keyof TestInputs, value: number) => {
    setInputs((prev) => ({ ...prev, [field]: value }));
  };

  const resetAll = () => {
    setInputs(INITIAL_INPUTS);
    setCheckedDocs({});
  };

  const loadScenario = (scenarioInputs: TestInputs) => {
    setInputs(scenarioInputs);
  };

  const toggleDoc = (id: string) => {
    setCheckedDocs((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // --------------------------------------------------------------------------
  // EXACT MINISTERIAL MATHEMATICAL ENGINE
  // --------------------------------------------------------------------------
  const calculations = useMemo(() => {
    const { c5, c6, c7, c8, c9, c10, c11, c12, c13, c18, c19, c20 } = inputs;

    // Validation rule: c6 does not enter the sum of TOTALE A
    const c6Warning = c6 > c5;

    // Formula TOTALE A: =C5+SUM(C7:C10)-SUM(C11:C12)+ABS(C13)
    const rawTotaleA = c5 + c7 + c8 + c9 + c10 - c11 - c12 + Math.abs(c13);
    const totaleA = Math.max(0, rawTotaleA);
    const deductionsExceedDebt = rawTotaleA < 0;

    // Formula TOTALE B: =C18-C19-C20
    const totaleB = c18 - c19 - c20;

    // Ratio (c23)
    const ratio = totaleA > 0 && totaleB > 0 ? totaleA / totaleB : 0;

    // Fascia (c24)
    let fascia = 0;
    if (totaleA === 0) {
      fascia = 0;
    } else if (totaleB <= 0) {
      fascia = 99;
    } else {
      // Round to 10 decimals to prevent IEEE-754 float artifact on exact integers (e.g. 1.0000000000000002 -> 1)
      const ceilRatio = Math.ceil(Number(ratio.toFixed(10)));
      fascia = ceilRatio > 6 ? 99 : ceilRatio;
    }

    const bandInfo = getBandInfo(fascia, totaleA, totaleB);
    const colors = getBandColors(bandInfo.semaforoColor);

    return {
      c6Warning,
      rawTotaleA,
      totaleA,
      deductionsExceedDebt,
      totaleB,
      ratio,
      fascia,
      bandInfo,
      colors,
    };
  }, [inputs]);

  const {
    c6Warning,
    totaleA,
    deductionsExceedDebt,
    totaleB,
    ratio,
    fascia,
    bandInfo,
    colors,
  } = calculations;

  const hasAnyInput = Object.values(inputs).some((v) => v !== 0);

  const formattedRatioDisplay =
    totaleA === 0
      ? '—'
      : totaleB <= 0
        ? 'Flussi negativi o nulli'
        : `${ratioFormatter.format(ratio)} anni`;

  const completedChecklistCount = DOCUMENT_CHECKLIST_ITEMS.filter(
    (item) => checkedDocs[item.id]
  ).length;

  // --------------------------------------------------------------------------
  // FIELD DEFINITIONS (EXACT MINISTERIAL WORDING + PLAIN ITALIAN TOOLTIPS)
  // --------------------------------------------------------------------------
  const aggregateARows: Array<{
    key: keyof TestInputs;
    code: string;
    sign: '+' | '-' | 'info' | '|+|';
    label: string;
    tooltipTitle: string;
    tooltipText: string;
    tooltipNote?: string;
    allowNegative?: boolean;
  }> = [
    {
      key: 'c5',
      code: 'C5',
      sign: '+',
      label: 'Debito scaduto',
      tooltipTitle: 'Debito già scaduto alla data del test',
      tooltipText:
        'Comprende tutti i debiti già scaduti verso fornitori, banche, erario, enti previdenziali e lavoratori dipendenti.',
      tooltipNote:
        'Punto 2 Istruzioni Ministeriali: è possibile dedurre figurativamente dal debito scaduto l’ammontare degli stralci o delle riduzioni che l’imprenditore ritiene ragionevolmente di poter ottenere in trattativa.',
    },
    {
      key: 'c6',
      code: 'C6',
      sign: 'info',
      label: '(di cui relativo ad iscrizioni a ruolo)',
      tooltipTitle: 'Quota parte del debito scaduto iscritta a ruolo',
      tooltipText:
        'Dato informativo relativo alle cartelle esattoriali o avvisi affidati all’Agente della Riscossione già compresi nel debito scaduto (C5).',
      tooltipNote:
        'Questa voce non viene sommata nuovamente nel TOTALE A, ma serve per verificare l’incidenza del debito fiscale/previdenziale a ruolo.',
    },
    {
      key: 'c7',
      code: 'C7',
      sign: '+',
      label: 'Debito riscadenziato o oggetto di moratorie',
      tooltipTitle: 'Debiti oggetto di dilazione o sospensione',
      tooltipText:
        'Include debiti per i quali sono già stati accordati piani di rientro, rateazioni fiscali/previdenziali in corso o moratorie temporanee.',
    },
    {
      key: 'c8',
      code: 'C8',
      sign: '+',
      label:
        'Linee di credito bancarie utilizzate delle quali non ci si attende il rinnovo',
      tooltipTitle: 'Affidamenti bancari a revoca o non rinnovabili',
      tooltipText:
        'Ammontare degli utilizzi di fidi di cassa, anticipi fatture o linee autoliquidanti per i quali si prevede la revoca o il mancato rinnovo da parte degli istituti di credito.',
    },
    {
      key: 'c9',
      code: 'C9',
      sign: '+',
      label:
        'Rate di mutui e finanziamenti in scadenza nei successivi 2 anni (per cooperative: rimborso prestito sociale stimato)',
      tooltipTitle: 'Quota capitale/rate in scadenza nel biennio successivo',
      tooltipText:
        'Rate di ammortamento di mutui, finanziamenti bancari e leasing in scadenza nei prossimi 24 mesi. Per le società cooperative va inserito il rimborso stimato del prestito sociale.',
    },
    {
      key: 'c10',
      code: 'C10',
      sign: '+',
      label:
        'Investimenti relativi alle iniziative industriali che si intendono adottare',
      tooltipTitle: 'Capex di rilancio o riorganizzazione',
      tooltipText:
        'Fabbisogno finanziario legato agli investimenti straordinari o di riconversione previsti per attuare le iniziative di risanamento industriale.',
    },
    {
      key: 'c11',
      code: 'C11',
      sign: '-',
      label:
        "Ammontare risorse ritraibili dalla dismissione di cespiti o rami d'azienda compatibili con il fabbisogno industriale",
      tooltipTitle: 'Liquidità attesa da cessione di asset non strategici',
      tooltipText:
        'Incassi netti ragionevolmente realizzabili dalla vendita di immobili, macchinari non essenziali, partecipazioni o rami d’azienda la cui cessione non compromette il piano industriale.',
    },
    {
      key: 'c12',
      code: 'C12',
      sign: '-',
      label: 'Nuovi conferimenti e finanziamenti, anche postergati, previsti',
      tooltipTitle: 'Nuova finanza e apporti dei soci o terzi',
      tooltipText:
        'Aumenti di capitale, versamenti dei soci in conto capitale o finanziamenti postergati/nuova finanza già deliberati o concretamente disponibili per sostenere il risanamento.',
    },
    {
      key: 'c13',
      code: 'C13',
      sign: '|+|',
      label:
        "Stima dell'eventuale margine operativo netto negativo nel primo anno, comprensivo dei componenti non ricorrenti",
      tooltipTitle: 'Perdita operativa prevista nel primo anno di transizione',
      tooltipText:
        'Se nel primo anno di attuazione del piano si stima una perdita operativa (anche per costi straordinari di ristrutturazione o liquidazione scorte), l’importo aumenta il fabbisogno da ristrutturare.',
      tooltipNote:
        'Puoi inserire il valore con segno positivo o negativo: secondo la formula ministeriale (=…+ABS(C13)), il suo valore assoluto viene sommato al debito da ristrutturare.',
      allowNegative: true,
    },
  ];

  const aggregateBRows: Array<{
    key: keyof TestInputs;
    code: string;
    sign: '+' | '-';
    label: string;
    tooltipTitle: string;
    tooltipText: string;
    tooltipNote?: string;
  }> = [
    {
      key: 'c18',
      code: 'C18',
      sign: '+',
      label:
        'Stima del Margine Operativo Lordo (MOL) prospettico normalizzato annuo, prima delle componenti non ricorrenti, a regime',
      tooltipTitle: 'EBITDA / MOL normalizzato annuo a regime',
      tooltipText:
        'Differenza tra ricavi e costi operativi monetari (prima di ammortamenti, accantonamenti, oneri finanziari e imposte) che l’impresa prevede di generare stabilmente a regime, depurata da eventi eccezionali.',
      tooltipNote:
        'Se sono presenti iniziative industriali inserite in C10, il MOL può rifletterne i benefici attesi a regime purché ragionevolmente dimostrabili.',
    },
    {
      key: 'c19',
      code: 'C19',
      sign: '-',
      label: 'Investimenti di mantenimento annui a regime',
      tooltipTitle: 'Investimenti ordinari di rinnovo (Capex di mantenimento)',
      tooltipText:
        'Spesa annua media necessaria per mantenere invariata la capacità produttiva e l’efficienza operativa degli impianti, attrezzature e software aziendali.',
    },
    {
      key: 'c20',
      code: 'C20',
      sign: '-',
      label: 'Imposte sul reddito annue che dovranno essere assolte',
      tooltipTitle: 'Carico fiscale annuo stimato (IRES / IRAP / IRPEF)',
      tooltipText:
        'Imposte dirette sul reddito che l’impresa dovrà versare annualmente a regime, tenuto conto di eventuali perdite fiscali pregresse compensabili.',
    },
  ];

  // --------------------------------------------------------------------------
  // RENDER HELPERS FOR FORM TABLES
  // --------------------------------------------------------------------------
  const renderAggregateASection = () => (
    <section
      aria-labelledby="section-totale-a"
      className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden print-break-inside-avoid"
    >
      <div className="px-5 py-4 border-b border-slate-200 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-xs font-mono font-medium text-slate-500 uppercase tracking-wider">
            Aggregato A · Sezione I
          </div>
          <h2 id="section-totale-a" className="text-lg font-semibold text-slate-900 mt-0.5">
            L’entità del debito che deve essere ristrutturato (TOTALE A)
          </h2>
        </div>
        <div className="text-right">
          <div className="text-xs text-slate-500">Subtotale Aggregato A</div>
          <div className="font-mono text-lg font-semibold text-slate-900 tabular-nums">
            {formatEUR(totaleA)}
          </div>
        </div>
      </div>

      <div className="divide-y divide-slate-100">
        {aggregateARows.map((row) => {
          const isC6 = row.key === 'c6';
          const showC6Warning = isC6 && c6Warning;
          return (
            <div
              key={row.key}
              className={`px-5 py-4 transition-colors ${
                isC6 ? 'bg-slate-50/60' : 'hover:bg-slate-50/40'
              }`}
            >
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-4 items-start md:items-center">
                {/* Operator + Row Label */}
                <div className="md:col-span-7 flex items-start gap-3">
                  <span
                    title={
                      row.sign === '+'
                        ? 'Voce in aumento del debito'
                        : row.sign === '-'
                          ? 'Voce in diminuzione del debito'
                          : row.sign === '|+|'
                            ? 'Valore assoluto sommato al debito'
                            : 'Voce informativa non sommata'
                    }
                    className={`mt-0.5 w-7 h-7 rounded-md font-mono text-xs font-semibold flex items-center justify-center shrink-0 border ${
                      row.sign === '+'
                        ? 'bg-slate-900 text-white border-slate-900'
                        : row.sign === '-'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : row.sign === '|+|'
                            ? 'bg-slate-800 text-white border-slate-800'
                            : 'bg-slate-100 text-slate-500 border-slate-200'
                    }`}
                  >
                    {row.sign === 'info' ? 'di cui' : row.sign}
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start gap-1.5">
                      <label
                        htmlFor={`input-${row.key}`}
                        className={`text-sm leading-snug cursor-pointer ${
                          isC6 ? 'text-slate-600 italic' : 'font-medium text-slate-800'
                        }`}
                      >
                        <span className="font-mono text-xs text-slate-400 mr-1.5 not-italic">
                          {row.code}
                        </span>
                        {row.label}
                      </label>
                      <InfoTooltip
                        title={row.tooltipTitle}
                        content={row.tooltipText}
                        note={row.tooltipNote}
                      />
                    </div>
                  </div>
                </div>

                {/* Numeric Input */}
                <div className="md:col-span-5">
                  <CurrencyInput
                    id={`input-${row.key}`}
                    value={inputs[row.key]}
                    onChange={(val) => updateField(row.key, val)}
                    allowNegative={row.allowNegative}
                    hasWarning={showC6Warning}
                    ariaLabel={`${row.code} - ${row.label}`}
                  />
                </div>
              </div>

              {/* Validation Alert for c6 > c5 */}
              {showC6Warning && (
                <div
                  role="alert"
                  className="mt-3 flex items-start gap-2.5 px-3.5 py-2.5 rounded-lg bg-amber-50 border border-amber-300 text-amber-950 text-xs font-medium"
                >
                  <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <span>
                    Attenzione: Iscrizioni a ruolo superiori al debito scaduto. Verificare il dato.
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Subtotal Bar TOTALE A */}
      <div className="px-5 py-4 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-xs font-mono text-slate-300 uppercase tracking-wider">
            TOTALE A · Debito netto da ristrutturare
          </div>
          <div className="text-xs text-slate-400 mt-0.5">
            Formula: C5 + (C7 + C8 + C9 + C10) − (C11 + C12) + |C13|
          </div>
          {deductionsExceedDebt && (
            <div className="text-xs text-emerald-300 mt-1">
              Le risorse da dismissioni e nuovi apporti coprono interamente il fabbisogno: TOTALE A
              azzerato a € 0,00.
            </div>
          )}
        </div>
        <div className="font-mono text-xl sm:text-2xl font-semibold tabular-nums">
          {formatEUR(totaleA)}
        </div>
      </div>
    </section>
  );

  const renderAggregateBSection = () => (
    <section
      aria-labelledby="section-totale-b"
      className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden print-break-inside-avoid"
    >
      <div className="px-5 py-4 border-b border-slate-200 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-xs font-mono font-medium text-slate-500 uppercase tracking-wider">
            Aggregato B · Sezione I
          </div>
          <h2 id="section-totale-b" className="text-lg font-semibold text-slate-900 mt-0.5">
            I flussi annui al servizio del debito a regime (TOTALE B)
          </h2>
        </div>
        <div className="text-right">
          <div className="text-xs text-slate-500">Free Cash Flow Operativo</div>
          <div
            className={`font-mono text-lg font-semibold tabular-nums ${
              totaleB < 0 ? 'text-red-700' : 'text-slate-900'
            }`}
          >
            {formatEUR(totaleB)}
          </div>
        </div>
      </div>

      <div className="divide-y divide-slate-100">
        {aggregateBRows.map((row) => (
          <div key={row.key} className="px-5 py-4 hover:bg-slate-50/40 transition-colors">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-4 items-start md:items-center">
              <div className="md:col-span-7 flex items-start gap-3">
                <span
                  title={
                    row.sign === '+'
                      ? 'Flusso positivo annuo'
                      : 'Deflusso annuo in diminuzione'
                  }
                  className={`mt-0.5 w-7 h-7 rounded-md font-mono text-xs font-semibold flex items-center justify-center shrink-0 border ${
                    row.sign === '+'
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-slate-100 text-slate-700 border-slate-300'
                  }`}
                >
                  {row.sign}
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start gap-1.5">
                    <label
                      htmlFor={`input-${row.key}`}
                      className="text-sm font-medium text-slate-800 leading-snug cursor-pointer"
                    >
                      <span className="font-mono text-xs text-slate-400 mr-1.5">
                        {row.code}
                      </span>
                      {row.label}
                    </label>
                    <InfoTooltip
                      title={row.tooltipTitle}
                      content={row.tooltipText}
                      note={row.tooltipNote}
                    />
                  </div>
                </div>
              </div>

              <div className="md:col-span-5">
                <CurrencyInput
                  id={`input-${row.key}`}
                  value={inputs[row.key]}
                  onChange={(val) => updateField(row.key, val)}
                  ariaLabel={`${row.code} - ${row.label}`}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Subtotal Bar TOTALE B */}
      <div className="px-5 py-4 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-xs font-mono text-slate-300 uppercase tracking-wider">
            TOTALE B · Flussi annui al servizio del debito
          </div>
          <div className="text-xs text-slate-400 mt-0.5">Formula: C18 − C19 − C20</div>
        </div>
        <div
          className={`font-mono text-xl sm:text-2xl font-semibold tabular-nums ${
            totaleB <= 0 && hasAnyInput ? 'text-red-300' : 'text-white'
          }`}
        >
          {formatEUR(totaleB)}
        </div>
      </div>
    </section>
  );

  // --------------------------------------------------------------------------
  // STEP 3: FULL TRAFFIC LIGHT RESULT & ACTION HUB
  // --------------------------------------------------------------------------
  const renderStep3Results = () => (
    <div className="space-y-6">
      {/* Main Traffic Light Diagnostic Card */}
      <section
        aria-labelledby="esito-test-heading"
        className={`rounded-xl border overflow-hidden shadow-xs print-break-inside-avoid ${colors.surface}`}
      >
        <div className={`px-6 py-4 flex flex-wrap items-center justify-between gap-3 ${colors.headerBg}`}>
          <div className="flex items-center gap-2.5">
            {getStatusIcon(bandInfo.semaforoColor, 'w-5 h-5')}
            <span className="font-mono text-sm font-semibold tracking-wide uppercase">
              {bandInfo.semaforoLabel}
            </span>
          </div>
          <span className="text-xs font-mono opacity-90">{bandInfo.pointReference}</span>
        </div>

        <div className="p-6 bg-white/90">
          <div className="flex flex-col md:flex-row gap-6 items-start">
            {/* Traffic Light Housing */}
            <div className="flex items-center gap-4 md:block">
              <TrafficLightVisual color={bandInfo.semaforoColor} />
              <div className="md:hidden">
                <div className={`text-sm font-semibold ${colors.label}`}>
                  {bandInfo.semaforoLabel}
                </div>
                <div className="text-base font-bold text-slate-900">{bandInfo.fasciaTitle}</div>
              </div>
            </div>

            {/* Key Metrics & Ministerial Text */}
            <div className="flex-1 min-w-0 space-y-5">
              <div className="hidden md:block">
                <div className="text-xs font-mono uppercase tracking-wider text-slate-500">
                  Esito Test Pratico Ministeriale
                </div>
                <h2
                  id="esito-test-heading"
                  className="text-2xl font-bold text-slate-900 mt-1"
                >
                  {bandInfo.fasciaTitle}
                </h2>
              </div>

              {/* 4 KPI Strip */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
                <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="text-xs text-slate-500">TOTALE A (Debito)</div>
                  <div className="font-mono text-base font-semibold text-slate-900 tabular-nums mt-1">
                    {formatEUR(totaleA)}
                  </div>
                </div>
                <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="text-xs text-slate-500">TOTALE B (Flussi annui)</div>
                  <div
                    className={`font-mono text-base font-semibold tabular-nums mt-1 ${
                      totaleB <= 0 && totaleA > 0 ? 'text-red-700' : 'text-slate-900'
                    }`}
                  >
                    {formatEUR(totaleB)}
                  </div>
                </div>
                <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="text-xs text-slate-500">Rapporto A/B (C23)</div>
                  <div className="font-mono text-base font-semibold text-slate-900 tabular-nums mt-1">
                    {formattedRatioDisplay}
                  </div>
                </div>
                <div className={`p-3.5 rounded-lg border ${colors.badge}`}>
                  <div className="text-xs opacity-80">Fascia Ministeriale (C24)</div>
                  <div className="font-mono text-base font-bold tabular-nums mt-1">
                    {fascia === 0
                      ? 'Non calcolata'
                      : fascia === 99
                        ? 'Oltre Fascia 6'
                        : `Fascia ${fascia}`}
                  </div>
                </div>
              </div>

              {/* Diagnosi Ufficiale */}
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
                <div className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                  Diagnosi Ufficiale Ministeriale
                </div>
                <p className="text-sm sm:text-base text-slate-900 leading-relaxed font-medium">
                  “{bandInfo.ministerialText}”
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Action Hub: Orientamento al Servizio Camerale + Checklist Documenti */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Orientamento al Servizio Camerale */}
        <section
          aria-labelledby="orientamento-heading"
          className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-5 print-break-inside-avoid"
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-slate-900 text-white flex items-center justify-center shrink-0">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-mono uppercase tracking-wider text-slate-500">
                Orientamento al Servizio Camerale
              </div>
              <h3 id="orientamento-heading" className="text-lg font-semibold text-slate-900 mt-0.5">
                {bandInfo.guidanceTitle}
              </h3>
            </div>
          </div>

          <p className="text-sm text-slate-700 leading-relaxed">{bandInfo.guidanceBody}</p>

          <div className="space-y-2.5 pt-1">
            <div className="text-xs font-mono uppercase tracking-wider text-slate-500">
              Prossimi passi operativi consigliati
            </div>
            <ul className="space-y-2.5">
              {bandInfo.recommendedActions.map((action, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200 text-sm text-slate-800"
                >
                  <span className="font-mono text-xs font-semibold text-slate-500 mt-0.5 shrink-0">
                    0{idx + 1}.
                  </span>
                  <span className="leading-relaxed">{action}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* CTA Buttons */}
          <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center gap-3 no-print">
            <a
              href="https://composizionenegoziata.camcom.it/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 transition-colors whitespace-nowrap"
            >
              <span>Vai alla Piattaforma Nazionale Composizione Negoziata</span>
              <ExternalLink className="w-4 h-4 shrink-0" />
            </a>

            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-800 text-sm font-medium hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Printer className="w-4 h-4 shrink-0" />
              <span>Stampa / Salva Riepilogo Simulazione</span>
            </button>
          </div>
        </section>

        {/* Checklist Documenti Piattaforma Nazionale */}
        <section
          aria-labelledby="checklist-heading"
          className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4 print-break-inside-avoid"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs font-mono uppercase tracking-wider text-slate-500">
                Art. 17, comma 3 CCII
              </div>
              <h3 id="checklist-heading" className="text-lg font-semibold text-slate-900 mt-0.5">
                Documenti per l’istanza ufficiale
              </h3>
            </div>
            <span className="font-mono text-xs font-medium text-slate-600 tabular-nums shrink-0 mt-1">
              {completedChecklistCount}/{DOCUMENT_CHECKLIST_ITEMS.length}
            </span>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            Verifica di avere a disposizione la documentazione obbligatoria prima di accedere alla
            Piattaforma Telematica Nazionale con SPID, CIE o CNS del legale rappresentante.
          </p>

          <ul className="divide-y divide-slate-100 border-t border-slate-200">
            {DOCUMENT_CHECKLIST_ITEMS.map((item) => {
              const checked = Boolean(checkedDocs[item.id]);
              return (
                <li key={item.id} className="py-3 first:pt-3 last:pb-0">
                  <button
                    type="button"
                    onClick={() => toggleDoc(item.id)}
                    aria-pressed={checked}
                    className="w-full text-left flex items-start gap-3 group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 rounded"
                  >
                    <span className="mt-0.5 text-slate-500 group-hover:text-slate-900 shrink-0">
                      {checked ? (
                        <CheckSquare className="w-4 h-4 text-emerald-700" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </span>
                    <div>
                      <div
                        className={`text-sm font-medium leading-snug ${
                          checked ? 'text-slate-500 line-through' : 'text-slate-900'
                        }`}
                      >
                        {item.title}
                      </div>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">{item.detail}</p>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </div>
  );

  // --------------------------------------------------------------------------
  // STICKY LIVE DIAGNOSTIC SIDEBAR (FOR STEPS 1 & 2 AND WORKSHEET MODE)
  // --------------------------------------------------------------------------
  const renderLiveSidebar = () => (
    <aside className="lg:sticky lg:top-6 space-y-4 no-print">
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between gap-2">
          <span className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-600">
            Riepilogo in tempo reale
          </span>
          <TrafficLightVisual color={bandInfo.semaforoColor} compact />
        </div>

        <div className="p-5 space-y-4">
          {/* Status Indicator */}
          <div className={`p-3.5 rounded-lg border ${colors.surface}`}>
            <div className="flex items-center gap-2">
              <span className={colors.accentText}>
                {getStatusIcon(bandInfo.semaforoColor, 'w-4 h-4')}
              </span>
              <span className={`font-mono text-xs font-bold uppercase ${colors.label}`}>
                {bandInfo.semaforoLabel}
              </span>
            </div>
            <div className="text-sm font-semibold text-slate-900 mt-1">{bandInfo.fasciaTitle}</div>
          </div>

          {/* Numeric Summary */}
          <dl className="divide-y divide-slate-100 text-sm">
            <div className="py-2.5 flex items-center justify-between gap-2">
              <dt className="text-slate-600">TOTALE A (Debito)</dt>
              <dd className="font-mono font-semibold text-slate-900 tabular-nums">
                {formatEUR(totaleA)}
              </dd>
            </div>
            <div className="py-2.5 flex items-center justify-between gap-2">
              <dt className="text-slate-600">TOTALE B (Flussi annui)</dt>
              <dd
                className={`font-mono font-semibold tabular-nums ${
                  totaleB <= 0 && totaleA > 0 ? 'text-red-700' : 'text-slate-900'
                }`}
              >
                {formatEUR(totaleB)}
              </dd>
            </div>
            <div className="py-2.5 flex items-center justify-between gap-2">
              <dt className="text-slate-600">Rapporto A / B (C23)</dt>
              <dd className="font-mono font-semibold text-slate-900 tabular-nums">
                {formattedRatioDisplay}
              </dd>
            </div>
            <div className="py-2.5 flex items-center justify-between gap-2">
              <dt className="text-slate-600">Fascia attribuita (C24)</dt>
              <dd className="font-mono font-semibold text-slate-900 tabular-nums">
                {fascia === 0
                  ? '—'
                  : fascia === 99
                    ? 'Oltre 6'
                    : `Fascia ${fascia}`}
              </dd>
            </div>
          </dl>

          {/* Scale Visualizer (1 to 6+) */}
          <div>
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
              <span>Scala Ministeriale</span>
              <span className="font-mono">Fasce 1–6+</span>
            </div>
            <div className="grid grid-cols-7 gap-1" aria-hidden="true">
              {[
                { f: 1, cls: 'bg-emerald-500' },
                { f: 2, cls: 'bg-emerald-500' },
                { f: 3, cls: 'bg-amber-400' },
                { f: 4, cls: 'bg-amber-400' },
                { f: 5, cls: 'bg-orange-500' },
                { f: 6, cls: 'bg-orange-600' },
                { f: 99, cls: 'bg-red-600' },
              ].map((cell) => {
                const active = fascia === cell.f;
                return (
                  <div
                    key={cell.f}
                    className={`h-2 rounded-xs transition-opacity ${cell.cls} ${
                      active ? 'opacity-100 ring-2 ring-slate-900 ring-offset-1' : 'opacity-25'
                    }`}
                  />
                );
              })}
            </div>
            <div className="flex justify-between text-[11px] font-mono text-slate-400 mt-1">
              <span>1 (Contenute)</span>
              <span>3–4</span>
              <span>6+ (Critico)</span>
            </div>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed pt-2 border-t border-slate-100">
            {bandInfo.ministerialText}
          </p>

          {workspaceMode === 'wizard' && currentStep !== 3 && (
            <button
              type="button"
              onClick={() => setCurrentStep(3)}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <span>Visualizza Esito e Orientamento</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="p-4 rounded-xl bg-slate-100 border border-slate-200 text-xs text-slate-600 leading-relaxed">
        <div className="font-semibold text-slate-800 mb-1 flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-slate-500" />
          <span>Nota sul calcolo preliminare</span>
        </div>
        Il presente strumento riproduce fedelmente la formula della Sezione I del Test Pratico
        Ministeriale. Non sostituisce la valutazione dell’organo amministrativo né dell’Esperto
        Indipendente.
      </div>
    </aside>
  );

  // --------------------------------------------------------------------------
  // MAIN RENDER
  // --------------------------------------------------------------------------
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* TOP BAR (3-Zone Institutional Header) */}
      <header className="bg-slate-900 text-white border-b border-slate-800 no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap lg:flex-nowrap items-center justify-between gap-4 lg:gap-8">
          {/* Zone 1: Institutional Brand */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="shrink-0 flex items-center">
              {!logoError ? (
                <img
                  src={`${import.meta.env.BASE_URL}assets/aistudio/logo_camera_f159ed72.png`}
                  alt="Camera di Commercio Monte Rosa Laghi Alto Piemonte"
                  referrerPolicy="no-referrer"
                  onError={() => setLogoError(true)}
                  className="h-9 sm:h-10 w-auto object-contain rounded-sm"
                />
              ) : (
                <div className="w-9 h-9 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
                  <Landmark className="w-5 h-5 text-slate-100" />
                </div>
              )}
            </div>
          </div>

          {/* Zone 2: Clean single-line step navigation */}
          <nav
            aria-label="Navigazione passi del test"
            className="hidden xl:flex items-center gap-6 text-sm text-slate-300"
          >
            <button
              type="button"
              onClick={() => {
                setWorkspaceMode('wizard');
                setCurrentStep(1);
              }}
              className={`hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                workspaceMode === 'wizard' && currentStep === 1
                  ? 'text-white font-semibold underline underline-offset-4'
                  : ''
              }`}
            >
              1. Debito (Totale A)
            </button>
            <button
              type="button"
              onClick={() => {
                setWorkspaceMode('wizard');
                setCurrentStep(2);
              }}
              className={`hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                workspaceMode === 'wizard' && currentStep === 2
                  ? 'text-white font-semibold underline underline-offset-4'
                  : ''
              }`}
            >
              2. Flussi (Totale B)
            </button>
            <button
              type="button"
              onClick={() => {
                setWorkspaceMode('wizard');
                setCurrentStep(3);
              }}
              className={`hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                workspaceMode === 'wizard' && currentStep === 3
                  ? 'text-white font-semibold underline underline-offset-4'
                  : ''
              }`}
            >
              3. Esito e Semaforo
            </button>
          </nav>

          {/* Zone 3: 1 Primary Header Action */}
          <div className="shrink-0">
            <button
              type="button"
              onClick={() => setInstructionsOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white text-slate-900 text-xs sm:text-sm font-semibold hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <BookOpen className="w-4 h-4 shrink-0" />
              <span>Leggi le Istruzioni Ministeriali</span>
            </button>
          </div>
        </div>
      </header>

      {/* CONFIDENTIALITY & PRIVACY BANNER */}
      <div className="bg-slate-100 border-b border-slate-200 no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center gap-2.5 text-xs sm:text-sm text-slate-700">
          <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
          <p className="font-medium">
            Simulazione 100% Anonima e Riservata. Nessun dato viene salvato o trasmesso alla Camera
            di Commercio. Basato sul Test Pratico Ministeriale (Sezione I).
          </p>
        </div>
      </div>

      {/* PRINT-ONLY INSTITUTIONAL HEADER */}
      <div className="hidden print-only border-b-2 border-slate-900 pb-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-mono uppercase tracking-wider text-slate-500">
              Camera di Commercio · Sportello Composizione Negoziata della Crisi
            </div>
            <h1 className="text-xl font-bold text-slate-900 mt-1">
              Riepilogo Simulazione — Test Pratico Ministeriale (Sezione I)
            </h1>
          </div>
          <div className="text-right text-xs text-slate-600">
            <div>Simulazione locale anonima</div>
            <div>Data stampa: {new Date().toLocaleDateString('it-IT')}</div>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Hero / Intro Title + Mode Toolbar */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pb-5 border-b border-slate-200 no-print">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-slate-500">
              <span>Pre-Check Sostenibilità del Debito</span>
              <span aria-hidden="true">·</span>
              <span>Decreto Dirigenziale — Sezione I</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight mt-1.5 [text-wrap:balance]">
              Verifica preliminare della sostenibilità del risanamento aziendale
            </h1>
            <p className="text-sm sm:text-base text-slate-600 mt-2 leading-relaxed">
              Calcola in autonomia il grado di difficoltà dell’impresa confrontando il debito da
              ristrutturare con i flussi annui generabili a regime.
            </p>
          </div>

          {/* Workspace Controls: Mode Segmented Toggle + Scenario Loader + Reset */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <div
              role="tablist"
              aria-label="Modalità di visualizzazione"
              className="inline-flex items-center p-1 rounded-lg bg-slate-200/80 border border-slate-200"
            >
              <button
                type="button"
                role="tab"
                aria-selected={workspaceMode === 'wizard'}
                onClick={() => setWorkspaceMode('wizard')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                  workspaceMode === 'wizard'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Percorso Guidato
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={workspaceMode === 'worksheet'}
                onClick={() => setWorkspaceMode('worksheet')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                  workspaceMode === 'worksheet'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Foglio Unico
              </button>
            </div>

            {hasAnyInput && (
              <button
                type="button"
                onClick={resetAll}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs font-medium hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer whitespace-nowrap"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Azzera</span>
              </button>
            )}
          </div>
        </div>

        {/* Quick Example Scenarios Bar (helpful for testing and entrepreneur orientation) */}
        <div className="flex flex-wrap items-center gap-2 text-xs no-print">
          <span className="text-slate-500 font-medium mr-1">Casi illustrativi:</span>
          {SAMPLE_SCENARIOS.map((sc) => (
            <button
              key={sc.id}
              type="button"
              onClick={() => {
                loadScenario(sc.inputs);
                if (workspaceMode === 'wizard') setCurrentStep(3);
              }}
              className="px-2.5 py-1.5 rounded-md border border-slate-200 bg-white text-slate-700 hover:border-slate-400 hover:text-slate-900 transition-colors cursor-pointer whitespace-nowrap"
            >
              {sc.label}
            </button>
          ))}
        </div>

        {/* WIZARD STEPPER BAR */}
        {workspaceMode === 'wizard' && (
          <div
            aria-label="Avanzamento procedura guidata"
            className="grid grid-cols-1 sm:grid-cols-3 gap-3 no-print"
          >
            {[
              {
                step: 1 as WizardStep,
                title: 'Passo 1 · Calcolo TOTALE A',
                subtitle: 'Debito da ristrutturare (C5–C13)',
                metric: formatEUR(totaleA),
              },
              {
                step: 2 as WizardStep,
                title: 'Passo 2 · Calcolo TOTALE B',
                subtitle: 'Flussi annui a regime (C18–C20)',
                metric: formatEUR(totaleB),
              },
              {
                step: 3 as WizardStep,
                title: 'Passo 3 · Esito & Semaforo',
                subtitle: 'Fascia Ministeriale e Azioni',
                metric: bandInfo.semaforoLabel,
              },
            ].map((item) => {
              const isActive = currentStep === item.step;
              return (
                <button
                  key={item.step}
                  type="button"
                  onClick={() => setCurrentStep(item.step)}
                  className={`text-left p-4 rounded-xl border transition-all cursor-pointer ${
                    isActive
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                      : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-xs font-mono font-semibold uppercase ${
                        isActive ? 'text-slate-300' : 'text-slate-500'
                      }`}
                    >
                      {item.title}
                    </span>
                    <span
                      className={`font-mono text-xs font-semibold tabular-nums ${
                        isActive ? 'text-white' : 'text-slate-700'
                      }`}
                    >
                      {item.metric}
                    </span>
                  </div>
                  <div
                    className={`text-sm font-medium mt-1 ${
                      isActive ? 'text-slate-100' : 'text-slate-600'
                    }`}
                  >
                    {item.subtitle}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* WORKSPACE CONTENT */}
        {workspaceMode === 'wizard' ? (
          currentStep === 3 ? (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3 no-print">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Modifica i dati (Passo 2)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <span>Torna al Passo 1 (Debito)</span>
                </button>
              </div>

              {renderStep3Results()}

              {/* Print-only Full Data Breakdown */}
              <div className="hidden print-only space-y-6 pt-4">
                {renderAggregateASection()}
                {renderAggregateBSection()}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Active Step Form */}
              <div className="lg:col-span-8 space-y-5">
                {currentStep === 1 && (
                  <>
                    {renderAggregateASection()}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-1 no-print">
                      <span className="text-xs text-slate-500">
                        Puoi lasciare a 0 € le voci non applicabili alla tua impresa.
                      </span>
                      <button
                        type="button"
                        onClick={() => setCurrentStep(2)}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors cursor-pointer"
                      >
                        <span>Prosegui al Passo 2 (Flussi B)</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </>
                )}

                {currentStep === 2 && (
                  <>
                    {renderAggregateBSection()}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-1 no-print">
                      <button
                        type="button"
                        onClick={() => setCurrentStep(1)}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors cursor-pointer"
                      >
                        <ArrowLeft className="w-4 h-4" />
                        <span>Torna al Passo 1</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setCurrentStep(3)}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors cursor-pointer"
                      >
                        <span>Vai all’Esito del Test (Passo 3)</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* Right Column: Live Diagnostic Panel */}
              <div className="lg:col-span-4">{renderLiveSidebar()}</div>
            </div>
          )
        ) : (
          /* FULL WORKSHEET MODE ("Foglio Unico") */
          <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <div className="lg:col-span-8 space-y-6">
                {renderAggregateASection()}
                {renderAggregateBSection()}
              </div>
              <div className="lg:col-span-4">{renderLiveSidebar()}</div>
            </div>

            {renderStep3Results()}
          </div>
        )}
      </main>

      {/* INSTITUTIONAL FOOTER */}
      <footer className="border-t border-slate-200 bg-white mt-12 no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
            <span>
              Camera di Commercio · Sportello Informativo Composizione Negoziata della Crisi
              d’Impresa (D.Lgs. 14/2019 — CCII)
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span>Elaborazione 100% locale nel browser</span>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={() => setInstructionsOpen(true)}
              className="text-slate-700 hover:text-slate-900 underline underline-offset-2 cursor-pointer"
            >
              Istruzioni Ministeriali Sez. I
            </button>
          </div>
        </div>
      </footer>

      {/* ==================================================================== */}
      {/* MODAL / DRAWER: ISTRUZIONI MINISTERIALI (SEZIONE I)                  */}
      {/* ==================================================================== */}
      {instructionsOpen && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-slate-950/50 backdrop-blur-[1px] no-print"
          role="dialog"
          aria-modal="true"
          aria-labelledby="drawer-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setInstructionsOpen(false);
          }}
        >
          <div className="w-full max-w-2xl bg-white h-full overflow-y-auto shadow-2xl border-l border-slate-200 flex flex-col">
            {/* Drawer Header */}
            <div className="sticky top-0 z-10 bg-slate-900 text-white px-6 py-4 flex items-center justify-between gap-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <FileText className="w-5 h-5 text-slate-200 shrink-0" />
                <div>
                  <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
                    Decreto Dirigenziale · Sezione I
                  </div>
                  <h2 id="drawer-title" className="text-base sm:text-lg font-semibold">
                    Istruzioni Ministeriali per il Test Pratico
                  </h2>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setInstructionsOpen(false)}
                aria-label="Chiudi istruzioni"
                className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="p-6 space-y-6 text-sm text-slate-700 leading-relaxed">
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
                <h3 className="font-semibold text-slate-900 mb-1">
                  Finalità del Test Pratico Preliminare (Punto 1)
                </h3>
                <p>
                  Il test consente all’imprenditore di svolgere una verifica preliminare sulla
                  ragionevole perseguibilità del risanamento prima ancora di predisporre un piano
                  completo. Esso si fonda sul rapporto tra l’entità del debito che deve essere
                  ristrutturato (<strong>TOTALE A</strong>) e l’entità dei flussi finanziari
                  liberi annui che l’impresa è in grado di porre al servizio del debito a regime (
                  <strong>TOTALE B</strong>).
                </p>
              </div>

              <div className="space-y-2">
                <h3 className="text-base font-semibold text-slate-900">
                  1. Determinazione del debito da ristrutturare (Punti 2–3)
                </h3>
                <ul className="list-disc pl-5 space-y-2">
                  <li>
                    <strong>Stralci ipotetici (Punto 2):</strong> Dal debito scaduto (voce{' '}
                    <span className="font-mono text-xs bg-slate-100 px-1 py-0.5 rounded">C5</span>)
                    è consentito dedurre figurativamente l’ammontare delle riduzioni/stralci che
                    l’imprenditore ritiene ragionevolmente di poter ottenere all’esito delle
                    trattative con i creditori.
                  </li>
                  <li>
                    <strong>Iscrizioni a ruolo (voce C6):</strong> Ha carattere puramente
                    informativo ed è già compresa nel debito scaduto; per tale ragione non entra
                    nuovamente nella somma algebrica del TOTALE A.
                  </li>
                  <li>
                    <strong>Dismissioni e nuova finanza (C11–C12):</strong> Le risorse ritraibili
                    dalla vendita di cespiti o rami non essenziali e i nuovi conferimenti o
                    finanziamenti postergati riducono direttamente l’entità del debito da
                    ristrutturare.
                  </li>
                  <li>
                    <strong>Margine operativo negativo nel primo anno (C13):</strong> L’eventuale
                    perdita operativa stimata per il primo anno, comprensiva di oneri non
                    ricorrenti, incrementa in valore assoluto il fabbisogno complessivo.
                  </li>
                </ul>
              </div>

              <div className="space-y-2">
                <h3 className="text-base font-semibold text-slate-900">
                  2. Depurazione del MOL e flussi annui a regime (Punti 4–5)
                </h3>
                <ul className="list-disc pl-5 space-y-2">
                  <li>
                    <strong>Normalizzazione del MOL (voce C18):</strong> Il Margine Operativo
                    Lordo prospettico a regime deve essere depurato da tutti i componenti{' '}
                    <em>non ricorrenti</em> (es. contributi straordinari una tantum, plusvalenze o
                    minusvalenze da cessioni, costi eccezionali di ristrutturazione, picchi anomali
                    di mercato) per rappresentare la reale redditività operativa sostenibile.
                  </li>
                  <li>
                    <strong>Investimenti di mantenimento e imposte (C19–C20):</strong> Dal MOL
                    normalizzato vanno sottratti gli investimenti ordinari indispensabili per
                    mantenere la continuità aziendale e le imposte sul reddito annue stimate,
                    ottenendo così il Free Cash Flow Operativo annuo a regime (
                    <strong>TOTALE B</strong>).
                  </li>
                </ul>
              </div>

              <div className="space-y-3">
                <h3 className="text-base font-semibold text-slate-900">
                  3. Interpretazione dei risultati (Punti 6–8)
                </h3>
                <div className="divide-y divide-slate-200 border border-slate-200 rounded-lg overflow-hidden">
                  <div className="p-3.5 bg-emerald-50/60">
                    <div className="font-semibold text-emerald-900 text-xs uppercase font-mono">
                      Punto 6 · Rapporto ≤ 2 (Fasce 1 e 2 — Semaforo Verde)
                    </div>
                    <p className="text-xs text-slate-700 mt-1">
                      Difficoltà contenute: l’andamento corrente dell’impresa è di norma sufficiente
                      ad individuare il percorso di risanamento senza necessità di un complesso piano
                      d’impresa.
                    </p>
                  </div>
                  <div className="p-3.5 bg-amber-50/60">
                    <div className="font-semibold text-amber-900 text-xs uppercase font-mono">
                      Punto 7 · Rapporto &gt; 2 e ≤ 4 (Fasce 3 e 4 — Semaforo Giallo)
                    </div>
                    <p className="text-xs text-slate-700 mt-1">
                      Squilibrio intermedio: il risanamento dipende dall’efficacia delle iniziative
                      industriali. È fondamentale redigere il piano d’impresa secondo la Lista di
                      Controllo (Sezione II).
                    </p>
                  </div>
                  <div className="p-3.5 bg-orange-50/60">
                    <div className="font-semibold text-orange-950 text-xs uppercase font-mono">
                      Punto 8 · Rapporto &gt; 4 e ≤ 6 (Fasce 5 e 6 — Semaforo Arancione/Rosso)
                    </div>
                    <p className="text-xs text-slate-700 mt-1">
                      Elevata complessità: un MOL positivo non basta da solo; può rendersi
                      necessaria la cessione dell’azienda o di rami di essa (continuità indiretta).
                    </p>
                  </div>
                  <div className="p-3.5 bg-red-50/60">
                    <div className="font-semibold text-red-950 text-xs uppercase font-mono">
                      Punti 7–8 · Rapporto &gt; 6 o TOTALE B ≤ 0 (Oltre Fascia 6 — Semaforo Rosso)
                    </div>
                    <p className="text-xs text-slate-700 mt-1">
                      Disequilibrio economico a regime o debito eccessivo rispetto ai flussi: sono
                      necessarie iniziative in forte discontinuità (cambio modello di business,
                      interventi sui processi, cessione di rami d’azienda o aggregazioni).
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-auto p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button
                type="button"
                onClick={() => setInstructionsOpen(false)}
                className="px-5 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Chiudi e torna alla simulazione
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
