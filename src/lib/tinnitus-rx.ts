/**
 * Tinnitus Relief Studio — prescription codes, local persistence, and the THI-25.
 *
 * Kept free of React and of `@/` path aliases so it can be imported directly by
 * scripts/test-tinnitus.mjs.
 */

export type RxEngine = 'ACRN' | 'NOTCH' | 'BROAD';

export interface TinnitusRx {
  /** Matched tinnitus frequency in Hz. */
  fT: number;
  /** Therapy level, relative dB in -80..0 (stored positive in the code itself). */
  levelDb: number;
  engine: RxEngine;
  loopRepeat: number;
  restLength: number;
  /** 'clinician' when loaded from a prescription code, 'self' after a self pitch-match. */
  source: 'clinician' | 'self';
  issuedBy?: string;
  hprId?: string;
  updatedAt: string;
}

export interface TinnitusSession {
  id: string;
  date: string;
  engine: RxEngine;
  fT: number;
  levelDb: number;
  minutes: number;
  loudnessBefore: number;
  loudnessAfter: number;
  createdAt: string;
}

export interface ThiResult {
  id: string;
  date: string;
  score: number;
  grade: number;
  createdAt: string;
}

export const STORAGE_KEYS = {
  rx: 'id-tinnitus-rx',
  sessions: 'id-tinnitus-sessions',
  thi: 'id-tinnitus-thi',
  symptomLog: 'id-symptom-log',
};

/**
 * Human-typeable prescription code, in the spirit of the CH-ENT-#### OPD tokens.
 * Example: RX-8000-45-ACRN-3x8 — 8000 Hz, -45 dB, ACRN, 3 cycles on / 8 rest.
 */
export const RX_PATTERN = /^RX-(\d{3,5})-(\d{1,2})-(ACRN|NOTCH|BROAD)-(\d{1,2})x(\d{1,2})$/i;

export function encodeRx(rx: Pick<TinnitusRx, 'fT' | 'levelDb' | 'engine' | 'loopRepeat' | 'restLength'>): string {
  const level = Math.abs(Math.round(rx.levelDb));
  return `RX-${Math.round(rx.fT)}-${level}-${rx.engine}-${rx.loopRepeat}x${rx.restLength}`;
}

/** Returns null for anything malformed or out of clinical range. */
export function decodeRx(code: string): Omit<TinnitusRx, 'source' | 'updatedAt'> | null {
  const trimmed = code.trim().toUpperCase();
  const match = RX_PATTERN.exec(trimmed);
  if (match) {
    const fT = Number(match[1]);
    const levelDb = -Number(match[2]);
    const engine = match[3].toUpperCase() as RxEngine;
    const loopRepeat = Number(match[4]);
    const restLength = Number(match[5]);

    if (fT < 100 || fT > 14000) return null;
    if (levelDb < -80 || levelDb > 0) return null;
    if (loopRepeat < 1 || loopRepeat > 10) return null;
    if (restLength > 64) return null;

    return { fT, levelDb, engine, loopRepeat, restLength };
  }

  // Direct prescribed frequency input (e.g., "8000", "8000 Hz", "6kHz", "8k", "4000")
  const freqMatch = /^(\d{1,5})\s*(KHZ|HZ|K)?$/i.exec(trimmed);
  if (freqMatch) {
    let num = Number(freqMatch[1]);
    const unit = freqMatch[2]?.toUpperCase();
    if (unit === 'K' || unit === 'KHZ') num = num * 1000;
    if (num >= 100 && num <= 14000) {
      return {
        fT: num,
        levelDb: -45,
        engine: 'ACRN',
        loopRepeat: 3,
        restLength: 8,
      };
    }
  }

  return null;
}

/* ------------------------------------------------------------------ storage */

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Quota exceeded or storage disabled — the session still works in memory.
  }
}

export function loadRx(): TinnitusRx | null {
  return readJson<TinnitusRx | null>(STORAGE_KEYS.rx, null);
}

export function saveRx(rx: TinnitusRx): void {
  writeJson(STORAGE_KEYS.rx, rx);
}

export function loadSessions(): TinnitusSession[] {
  return readJson<TinnitusSession[]>(STORAGE_KEYS.sessions, []);
}

export function saveSession(session: TinnitusSession): TinnitusSession[] {
  const next = [session, ...loadSessions()].slice(0, 200);
  writeJson(STORAGE_KEYS.sessions, next);
  return next;
}

export function loadThiHistory(): ThiResult[] {
  return readJson<ThiResult[]>(STORAGE_KEYS.thi, []);
}

export function saveThiResult(result: ThiResult): ThiResult[] {
  const next = [result, ...loadThiHistory()].slice(0, 60);
  writeJson(STORAGE_KEYS.thi, next);
  return next;
}

/**
 * Push a THI score into the shared symptom log so it appears alongside daily entries,
 * mirroring how SelfAssessment writes its results.
 */
export function saveThiToSymptomLog(score: number, gradeLabel: string): void {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.symptomLog);
    const entries = raw ? JSON.parse(raw) : [];
    const entry = {
      id: crypto.randomUUID(),
      date: new Date().toISOString().slice(0, 10),
      pain: 0,
      // THI runs 0-100; the symptom log runs 0-10.
      hearing: Math.min(10, Math.round((score / 100) * 10)),
      dizziness: 0,
      notes: `Tinnitus Handicap Inventory (THI-25): ${score}/100 — ${gradeLabel}`,
      createdAt: new Date().toISOString(),
    };
    window.localStorage.setItem(STORAGE_KEYS.symptomLog, JSON.stringify([entry, ...entries]));
  } catch {
    // ignore local storage error
  }
}

export function totalMinutes(sessions: TinnitusSession[]): number {
  return sessions.reduce((sum, s) => sum + s.minutes, 0);
}

/* -------------------------------------------------------------------- THI-25 */

export type ThiSubscale = 'F' | 'E' | 'C';

export interface ThiItem {
  id: string;
  subscale: ThiSubscale;
  text: string;
  textHi: string;
}

export interface ThiOption {
  label: string;
  labelHi: string;
  score: number;
}

export const THI_OPTIONS: ThiOption[] = [
  { label: 'No', labelHi: 'नहीं', score: 0 },
  { label: 'Sometimes', labelHi: 'कभी-कभी', score: 2 },
  { label: 'Yes', labelHi: 'हाँ', score: 4 },
];

/** Newman, Jacobson & Spitzer (1996). F = functional, E = emotional, C = catastrophic. */
export const THI_ITEMS: ThiItem[] = [
  { id: 't1', subscale: 'F', text: 'Because of your tinnitus, is it difficult for you to concentrate?', textHi: 'क्या टिनिटस के कारण आपको ध्यान केंद्रित करने में कठिनाई होती है?' },
  { id: 't2', subscale: 'F', text: 'Does the loudness of your tinnitus make it difficult for you to hear people?', textHi: 'क्या टिनिटस की तेज़ आवाज़ के कारण लोगों की बात सुनना कठिन हो जाता है?' },
  { id: 't3', subscale: 'E', text: 'Does your tinnitus make you angry?', textHi: 'क्या टिनिटस के कारण आपको गुस्सा आता है?' },
  { id: 't4', subscale: 'F', text: 'Does your tinnitus make you feel confused?', textHi: 'क्या टिनिटस से आप भ्रमित महसूस करते हैं?' },
  { id: 't5', subscale: 'C', text: 'Because of your tinnitus, do you feel desperate?', textHi: 'क्या टिनिटस के कारण आप हताश महसूस करते हैं?' },
  { id: 't6', subscale: 'E', text: 'Do you complain a great deal about your tinnitus?', textHi: 'क्या आप अपने टिनिटस के बारे में बहुत शिकायत करते हैं?' },
  { id: 't7', subscale: 'F', text: 'Because of your tinnitus, do you have trouble falling asleep at night?', textHi: 'क्या टिनिटस के कारण रात में सोने में परेशानी होती है?' },
  { id: 't8', subscale: 'C', text: 'Do you feel as though you cannot escape your tinnitus?', textHi: 'क्या आपको लगता है कि आप टिनिटस से बच नहीं सकते?' },
  { id: 't9', subscale: 'F', text: 'Does your tinnitus interfere with your ability to enjoy social activities?', textHi: 'क्या टिनिटस सामाजिक गतिविधियों का आनंद लेने में बाधा डालता है?' },
  { id: 't10', subscale: 'E', text: 'Because of your tinnitus, do you feel frustrated?', textHi: 'क्या टिनिटस के कारण आप निराश महसूस करते हैं?' },
  { id: 't11', subscale: 'C', text: 'Because of your tinnitus, do you feel that you have a terrible disease?', textHi: 'क्या टिनिटस के कारण आपको लगता है कि आपको कोई गंभीर बीमारी है?' },
  { id: 't12', subscale: 'F', text: 'Does your tinnitus make it difficult for you to enjoy life?', textHi: 'क्या टिनिटस के कारण जीवन का आनंद लेना कठिन हो जाता है?' },
  { id: 't13', subscale: 'F', text: 'Does your tinnitus interfere with your job or household responsibilities?', textHi: 'क्या टिनिटस आपके काम या घरेलू जिम्मेदारियों में बाधा डालता है?' },
  { id: 't14', subscale: 'E', text: 'Because of your tinnitus, do you find that you are often irritable?', textHi: 'क्या टिनिटस के कारण आप अक्सर चिड़चिड़े हो जाते हैं?' },
  { id: 't15', subscale: 'F', text: 'Because of your tinnitus, is it difficult for you to read?', textHi: 'क्या टिनिटस के कारण पढ़ना कठिन हो जाता है?' },
  { id: 't16', subscale: 'E', text: 'Does your tinnitus make you upset?', textHi: 'क्या टिनिटस से आप परेशान हो जाते हैं?' },
  { id: 't17', subscale: 'E', text: 'Do you feel that your tinnitus has placed stress on your relationships with family and friends?', textHi: 'क्या टिनिटस ने परिवार और मित्रों के साथ आपके संबंधों पर तनाव डाला है?' },
  { id: 't18', subscale: 'F', text: 'Do you find it difficult to focus your attention away from your tinnitus and on other things?', textHi: 'क्या टिनिटस से ध्यान हटाकर अन्य चीज़ों पर लगाना कठिन लगता है?' },
  { id: 't19', subscale: 'C', text: 'Do you feel that you have no control over your tinnitus?', textHi: 'क्या आपको लगता है कि टिनिटस पर आपका कोई नियंत्रण नहीं है?' },
  { id: 't20', subscale: 'F', text: 'Because of your tinnitus, do you often feel tired?', textHi: 'क्या टिनिटस के कारण आप अक्सर थका हुआ महसूस करते हैं?' },
  { id: 't21', subscale: 'E', text: 'Because of your tinnitus, do you feel depressed?', textHi: 'क्या टिनिटस के कारण आप उदास महसूस करते हैं?' },
  { id: 't22', subscale: 'E', text: 'Does your tinnitus make you feel anxious?', textHi: 'क्या टिनिटस से आपको चिंता महसूस होती है?' },
  { id: 't23', subscale: 'C', text: 'Do you feel that you can no longer cope with your tinnitus?', textHi: 'क्या आपको लगता है कि अब आप टिनिटस को सहन नहीं कर सकते?' },
  { id: 't24', subscale: 'F', text: 'Does your tinnitus get worse when you are under stress?', textHi: 'क्या तनाव में रहने पर आपका टिनिटस बढ़ जाता है?' },
  { id: 't25', subscale: 'E', text: 'Does your tinnitus make you feel insecure?', textHi: 'क्या टिनिटस से आप असुरक्षित महसूस करते हैं?' },
];

export type ThiTone = 'routine' | 'clinic' | 'emergency';

export interface ThiBand {
  max: number;
  grade: number;
  tone: ThiTone;
  label: string;
  labelHi: string;
  guidance: string;
  guidanceHi: string;
}

/** Bands are ascending; the first whose `max` is >= the score wins. */
export const THI_BANDS: ThiBand[] = [
  {
    max: 16,
    grade: 1,
    tone: 'routine',
    label: 'Grade 1 — Slight',
    labelHi: 'ग्रेड 1 — बहुत हल्का',
    guidance: 'Heard only in quiet surroundings and easily masked. Sound therapy is optional; protect your ears from loud noise.',
    guidanceHi: 'केवल शांत वातावरण में सुनाई देता है और आसानी से ढक जाता है। साउंड थेरेपी वैकल्पिक है; तेज़ आवाज़ से कान बचाएं।',
  },
  {
    max: 36,
    grade: 2,
    tone: 'routine',
    label: 'Grade 2 — Mild',
    labelHi: 'ग्रेड 2 — हल्का',
    guidance: 'Masked by everyday sound and forgotten during activity. Daily sound therapy sessions are worth continuing.',
    guidanceHi: 'रोज़मर्रा की आवाज़ों से ढक जाता है और काम के दौरान भूल जाता है। दैनिक साउंड थेरेपी जारी रखना उपयोगी है।',
  },
  {
    max: 56,
    grade: 3,
    tone: 'clinic',
    label: 'Grade 3 — Moderate',
    labelHi: 'ग्रेड 3 — मध्यम',
    guidance: 'Noticed even in background noise and interfering with daily activity. Show this score at your next Audiology visit.',
    guidanceHi: 'पृष्ठभूमि शोर में भी महसूस होता है और दैनिक कार्यों में बाधा डालता है। अगली ऑडियोलॉजी विज़िट पर यह स्कोर दिखाएं।',
  },
  {
    max: 76,
    grade: 4,
    tone: 'clinic',
    label: 'Grade 4 — Severe',
    labelHi: 'ग्रेड 4 — गंभीर',
    guidance: 'Heard almost always, disturbing sleep and daily activity. Book an Audiology review — TRT or counselling may be indicated.',
    guidanceHi: 'लगभग हमेशा सुनाई देता है, नींद और दिनचर्या बाधित होती है। ऑडियोलॉजी समीक्षा बुक करें — TRT या परामर्श आवश्यक हो सकता है।',
  },
  {
    max: 100,
    grade: 5,
    tone: 'emergency',
    label: 'Grade 5 — Catastrophic',
    labelHi: 'ग्रेड 5 — अत्यंत गंभीर',
    guidance: 'Distress at this level needs prompt clinical support. Contact the ENT department, and use the emergency card if you feel unsafe.',
    guidanceHi: 'इस स्तर की परेशानी के लिए शीघ्र चिकित्सकीय सहायता आवश्यक है। ईएनटी विभाग से संपर्क करें, और असुरक्षित महसूस होने पर आपातकालीन कार्ड का उपयोग करें।',
  },
];

export function scoreThi(answers: Record<string, number>): number {
  return THI_ITEMS.reduce((sum, item) => sum + (answers[item.id] ?? 0), 0);
}

export function thiBandFor(score: number): ThiBand {
  return THI_BANDS.find((b) => score <= b.max) ?? THI_BANDS[THI_BANDS.length - 1];
}

export function scoreThiSubscale(answers: Record<string, number>, subscale: ThiSubscale): number {
  return THI_ITEMS.filter((i) => i.subscale === subscale).reduce((sum, item) => sum + (answers[item.id] ?? 0), 0);
}
