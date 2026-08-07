/**
 * voice-rx.ts - protocol, patient-reported instruments, alerting and storage for
 * post-operative voice recovery monitoring.
 *
 * React-free and alias-free so scripts/test-voice-rx.mjs can import it directly,
 * matching vestibular-rx.ts and tinnitus-rx.ts.
 *
 * Framing, which is deliberate and must not drift: this module tracks POST-OP
 * VOICE RECOVERY AND DYSPHONIA SEVERITY. It does not detect, predict or grade
 * cancer recurrence. Its alerts are a prompt for clinician review, never a
 * determination. Every patient-facing string is written to that limit.
 *
 * Cohort scope is partial laryngectomy / cordectomy and organ-preservation
 * chemoradiation. Total laryngectomy is out of scope - see COHORTS.
 */

import type { DdkResult, CppsResult, PhonationResult } from './voice-dsp';

/* ------------------------------------------------------------------ cohorts */

export type VoiceCohort = 'partial_laryngectomy' | 'chemoradiation';

export interface CohortDescriptor {
  id: VoiceCohort;
  label: string;
  labelHi: string;
  note: string;
  noteHi: string;
}

/**
 * Only cohorts that retain a glottal source are supported. Total laryngectomy is
 * excluded on purpose: tracheoesophageal and oesophageal speech have absent or
 * meaningless F0, maximum phonation times around 8 s and 2-3 s respectively, and
 * cepstral distributions that share no scale with these. Running this protocol
 * on a laryngectomee would produce confident, meaningless numbers.
 */
export const COHORTS: CohortDescriptor[] = [
  {
    id: 'partial_laryngectomy',
    label: 'Partial laryngectomy / cordectomy',
    labelHi: 'आंशिक लैरिंजेक्टोमी / कॉर्डेक्टोमी',
    note: 'Voice is present but altered. Expect maximum phonation time to build gradually over the first months.',
    noteHi: 'आवाज़ मौजूद है पर बदली हुई है। पहले कुछ महीनों में अधिकतम स्वर समय धीरे-धीरे बढ़ने की अपेक्षा करें।',
  },
  {
    id: 'chemoradiation',
    label: 'Chemoradiation (organ preservation)',
    labelHi: 'कीमोरेडिएशन (अंग सुरक्षा)',
    note: 'The larynx is intact. Swelling and dryness drive most early change, so scores often dip during treatment before recovering.',
    noteHi: 'स्वरयंत्र सुरक्षित है। शुरुआती बदलाव अधिकतर सूजन और सूखेपन से होते हैं, इसलिए उपचार के दौरान स्कोर गिरकर बाद में सुधर सकते हैं।',
  },
];

export function cohortFor(id: VoiceCohort): CohortDescriptor {
  return COHORTS.find((c) => c.id === id) || COHORTS[0];
}

/* ----------------------------------------------------------------- protocol */

export type VoiceTaskId = 'calibration' | 'cpps_phonation' | 'mpt' | 'ddk_amr' | 'ddk_smr';

export interface VoiceTask {
  id: VoiceTaskId;
  label: string;
  labelHi: string;
  instruction: string;
  instructionHi: string;
  /** Fixed-length takes record for this long. MPT runs until the patient stops. */
  durationSec: number | null;
  trials: number;
}

/**
 * Task order matters.
 *
 * The comfortable-effort phonation comes BEFORE maximum phonation time. CPPS
 * must never be computed from an MPT take: maximum phonation drives the patient
 * to residual lung volume and voice quality collapses over the final seconds, so
 * a CPPS measured there tracks respiratory effort rather than voice quality.
 * Running MPT first would also fatigue the patient into a worse CPPS.
 *
 * /pa/ alternating motion rate precedes /pa-ta-ka/ because single-syllable
 * repetition is far more robust to count and gives a usable number even when the
 * sequential take is too degraded to score.
 */
export const VOICE_PROTOCOL: VoiceTask[] = [
  {
    id: 'calibration',
    label: 'Room check',
    labelHi: 'कमरे की जाँच',
    instruction: 'Stay silent for a moment so the app can measure the background noise in your room.',
    instructionHi: 'कुछ क्षण चुप रहें ताकि ऐप आपके कमरे की पृष्ठभूमि ध्वनि माप सके।',
    durationSec: 2,
    trials: 1,
  },
  {
    id: 'cpps_phonation',
    label: 'Steady "aaa"',
    labelHi: 'स्थिर "आ"',
    instruction: 'Say "aaa" at your normal comfortable pitch and loudness for about four seconds. Do not push.',
    instructionHi: 'लगभग चार सेकंड तक अपनी सामान्य, आरामदायक आवाज़ में "आ" बोलें। ज़ोर न लगाएं।',
    durationSec: 5,
    trials: 1,
  },
  {
    id: 'mpt',
    label: 'Longest "aaa"',
    labelHi: 'सबसे लंबी "आ"',
    instruction: 'Take the deepest breath you can, then say "aaa" steadily for as long as you can until you run out of air.',
    instructionHi: 'जितनी गहरी सांस ले सकें लें, फिर हवा खत्म होने तक लगातार "आ" बोलते रहें।',
    durationSec: null,
    trials: 3,
  },
  {
    id: 'ddk_amr',
    label: 'Repeat "pa-pa-pa"',
    labelHi: '"पा-पा-पा" दोहराएं',
    instruction: 'Say "pa-pa-pa" as fast and as evenly as you can for five seconds.',
    instructionHi: 'पांच सेकंड तक जितनी तेज़ और एकसमान हो सके "पा-पा-पा" बोलें।',
    durationSec: 5,
    trials: 1,
  },
  {
    id: 'ddk_smr',
    label: 'Repeat "pa-ta-ka"',
    labelHi: '"पा-टा-का" दोहराएं',
    instruction: 'Say "pa-ta-ka" over and over, as fast and as clearly as you can, for five seconds.',
    instructionHi: 'पांच सेकंड तक जितनी तेज़ और स्पष्ट हो सके बार-बार "पा-टा-का" बोलें।',
    durationSec: 5,
    trials: 1,
  },
];

/** Recording is refused above this room level: below roughly 15 dB SNR nothing here is trustworthy. */
export const MAX_USABLE_NOISE_FLOOR_DB = -35;

/* ------------------------------------------------------------------- VHI-10 */

export interface PromItem {
  id: string;
  text: string;
  textHi: string;
}

export interface PromOption {
  label: string;
  labelHi: string;
  score: number;
}

export const VHI10_OPTIONS: PromOption[] = [
  { label: 'Never', labelHi: 'कभी नहीं', score: 0 },
  { label: 'Almost never', labelHi: 'लगभग कभी नहीं', score: 1 },
  { label: 'Sometimes', labelHi: 'कभी-कभी', score: 2 },
  { label: 'Almost always', labelHi: 'लगभग हमेशा', score: 3 },
  { label: 'Always', labelHi: 'हमेशा', score: 4 },
];

/** Voice Handicap Index-10 - Rosen, Lee, Osborne, Zullo & Murry (2004). Max 40. */
export const VHI10_ITEMS: PromItem[] = [
  { id: 'v1', text: 'My voice makes it difficult for people to hear me.', textHi: 'मेरी आवाज़ के कारण लोगों को मुझे सुनने में कठिनाई होती है।' },
  { id: 'v2', text: 'People have difficulty understanding me in a noisy room.', textHi: 'शोरगुल वाले कमरे में लोगों को मुझे समझने में कठिनाई होती है।' },
  { id: 'v3', text: 'My voice difficulties restrict my personal and social life.', textHi: 'आवाज़ की परेशानी मेरे निजी और सामाजिक जीवन को सीमित करती है।' },
  { id: 'v4', text: 'I feel left out of conversations because of my voice.', textHi: 'आवाज़ के कारण मैं बातचीत से बाहर छूटा हुआ महसूस करता/करती हूँ।' },
  { id: 'v5', text: 'My voice problem causes me to lose income.', textHi: 'आवाज़ की समस्या के कारण मेरी आमदनी का नुकसान होता है।' },
  { id: 'v6', text: 'I feel as though I have to strain to produce voice.', textHi: 'मुझे लगता है कि आवाज़ निकालने के लिए मुझे ज़ोर लगाना पड़ता है।' },
  { id: 'v7', text: 'The clarity of my voice is unpredictable.', textHi: 'मेरी आवाज़ की स्पष्टता का कोई भरोसा नहीं रहता।' },
  { id: 'v8', text: 'My voice problem upsets me.', textHi: 'आवाज़ की समस्या मुझे परेशान करती है।' },
  { id: 'v9', text: 'My voice makes me feel handicapped.', textHi: 'आवाज़ के कारण मैं खुद को अक्षम महसूस करता/करती हूँ।' },
  { id: 'v10', text: 'People ask, "What is wrong with your voice?"', textHi: 'लोग पूछते हैं, "आपकी आवाज़ को क्या हुआ है?"' },
];

export type PromTone = 'routine' | 'clinic' | 'emergency';

export interface PromBand {
  max: number;
  grade: number;
  tone: PromTone;
  label: string;
  labelHi: string;
  guidance: string;
  guidanceHi: string;
}

export const VHI10_BANDS: PromBand[] = [
  {
    max: 11,
    grade: 0,
    tone: 'routine',
    label: 'Within normal limits',
    labelHi: 'सामान्य सीमा में',
    guidance:
      'Your voice is not restricting daily life. Keep recording weekly so any later change stands out clearly against this baseline.',
    guidanceHi:
      'आपकी आवाज़ दैनिक जीवन को सीमित नहीं कर रही। साप्ताहिक रिकॉर्डिंग जारी रखें ताकि बाद का कोई बदलाव इस आधार रेखा के मुकाबले साफ़ दिखे।',
  },
  {
    max: 20,
    grade: 1,
    tone: 'routine',
    label: 'Mild voice handicap',
    labelHi: 'हल्की स्वर अक्षमता',
    guidance:
      'You are noticing your voice in specific situations. This is common after treatment. Mention it at your next follow-up.',
    guidanceHi:
      'कुछ विशेष स्थितियों में आपको अपनी आवाज़ महसूस होती है। उपचार के बाद यह सामान्य है। अगली फ़ॉलो-अप पर इसका ज़िक्र करें।',
  },
  {
    max: 30,
    grade: 2,
    tone: 'clinic',
    label: 'Moderate voice handicap',
    labelHi: 'मध्यम स्वर अक्षमता',
    guidance:
      'Your voice is shaping how you work and socialise. Ask about speech and language therapy at your next ENT appointment - it helps most at this level.',
    guidanceHi:
      'आपकी आवाज़ आपके काम और मेलजोल को प्रभावित कर रही है। अगली ईएनटी विज़िट पर स्पीच थेरेपी के बारे में पूछें - इस स्तर पर यह सबसे अधिक लाभ देती है।',
  },
  {
    max: 40,
    grade: 3,
    tone: 'clinic',
    label: 'Severe voice handicap',
    labelHi: 'गंभीर स्वर अक्षमता',
    guidance:
      'This level of difficulty needs review rather than self-management. Bring this score to your ENT team and ask for a speech therapy referral.',
    guidanceHi:
      'इस स्तर की कठिनाई के लिए स्वयं प्रबंधन नहीं, समीक्षा चाहिए। यह स्कोर अपनी ईएनटी टीम को दिखाएं और स्पीच थेरेपी रेफरल मांगें।',
  },
];

export function scoreVhi10(answers: Record<string, number>): number {
  return VHI10_ITEMS.reduce((sum, item) => sum + (answers[item.id] ?? 0), 0);
}

export function vhi10BandFor(score: number): PromBand {
  return VHI10_BANDS.find((b) => score <= b.max) || VHI10_BANDS[VHI10_BANDS.length - 1];
}

/** Scores above this are outside the normal range (Rosen et al. 2004). */
export const VHI10_ABNORMAL_ABOVE = 11;

/**
 * Minimal clinically important difference. A swing smaller than this is
 * measurement noise, not change - worth saying out loud so a patient does not
 * over-read a three-point move in either direction.
 */
export const VHI10_MCID = 6;

/* -------------------------------------------------------------------- EAT-10 */

export const EAT10_OPTIONS: PromOption[] = [
  { label: 'No problem', labelHi: 'कोई समस्या नहीं', score: 0 },
  { label: '1', labelHi: '1', score: 1 },
  { label: '2', labelHi: '2', score: 2 },
  { label: '3', labelHi: '3', score: 3 },
  { label: 'Severe problem', labelHi: 'गंभीर समस्या', score: 4 },
];

/**
 * Eating Assessment Tool-10 - Belafsky et al. (2008). Max 40.
 * Reproduced with attribution; EAT-10 is the property of Nestle Health Science.
 *
 * Included because swallowing, not voice, is often the dominant complaint after
 * chemoradiation, and aspiration is the higher-consequence failure mode.
 */
export const EAT10_ITEMS: PromItem[] = [
  { id: 'e1', text: 'My swallowing problem has caused me to lose weight.', textHi: 'निगलने की समस्या से मेरा वज़न घटा है।' },
  { id: 'e2', text: 'My swallowing problem interferes with my ability to go out for meals.', textHi: 'निगलने की समस्या के कारण मैं बाहर खाने जाने में कठिनाई महसूस करता/करती हूँ।' },
  { id: 'e3', text: 'Swallowing liquids takes extra effort.', textHi: 'तरल पदार्थ निगलने में अतिरिक्त प्रयास लगता है।' },
  { id: 'e4', text: 'Swallowing solids takes extra effort.', textHi: 'ठोस भोजन निगलने में अतिरिक्त प्रयास लगता है।' },
  { id: 'e5', text: 'Swallowing pills takes extra effort.', textHi: 'गोलियाँ निगलने में अतिरिक्त प्रयास लगता है।' },
  { id: 'e6', text: 'Swallowing is painful.', textHi: 'निगलने में दर्द होता है।' },
  { id: 'e7', text: 'The pleasure of eating is affected by my swallowing.', textHi: 'निगलने की समस्या से खाने का आनंद प्रभावित होता है।' },
  { id: 'e8', text: 'When I swallow, food sticks in my throat.', textHi: 'निगलते समय भोजन गले में अटक जाता है।' },
  { id: 'e9', text: 'I cough when I eat.', textHi: 'खाते समय मुझे खांसी आती है।' },
  { id: 'e10', text: 'Swallowing is stressful.', textHi: 'निगलना तनावपूर्ण लगता है।' },
];

export function scoreEat10(answers: Record<string, number>): number {
  return EAT10_ITEMS.reduce((sum, item) => sum + (answers[item.id] ?? 0), 0);
}

/** Three or more is abnormal and warrants a swallowing assessment (Belafsky et al. 2008). */
export const EAT10_ABNORMAL_AT_OR_ABOVE = 3;

export const EAT10_BANDS: PromBand[] = [
  {
    max: 2,
    grade: 0,
    tone: 'routine',
    label: 'Swallowing within normal limits',
    labelHi: 'निगलना सामान्य सीमा में',
    guidance: 'No significant swallowing difficulty reported. Re-check if eating starts to change.',
    guidanceHi: 'निगलने में कोई विशेष कठिनाई नहीं बताई गई। खाने में बदलाव लगे तो दोबारा जाँचें।',
  },
  {
    max: 14,
    grade: 1,
    tone: 'clinic',
    label: 'Swallowing difficulty present',
    labelHi: 'निगलने में कठिनाई मौजूद',
    guidance:
      'Your answers suggest real swallowing difficulty. Raise this at your next appointment and ask whether a swallowing assessment is needed.',
    guidanceHi:
      'आपके उत्तर वास्तविक निगलने की कठिनाई दर्शाते हैं। अगली विज़िट पर यह बताएं और पूछें कि क्या निगलने की जाँच ज़रूरी है।',
  },
  {
    max: 40,
    grade: 2,
    tone: 'clinic',
    label: 'Marked swallowing difficulty',
    labelHi: 'स्पष्ट निगलने की कठिनाई',
    guidance:
      'This level carries a real risk of food or liquid entering the airway and of weight loss. Contact your ENT or speech therapy team rather than waiting for the next scheduled visit.',
    guidanceHi:
      'इस स्तर पर भोजन या तरल के श्वासनली में जाने और वज़न घटने का वास्तविक जोखिम है। अगली निर्धारित विज़िट का इंतज़ार न करें, अपनी ईएनटी या स्पीच थेरेपी टीम से संपर्क करें।',
  },
];

export function eat10BandFor(score: number): PromBand {
  return EAT10_BANDS.find((b) => score <= b.max) || EAT10_BANDS[EAT10_BANDS.length - 1];
}

/* ---------------------------------------------------------- red-flag symptoms */

export type SymptomId =
  | 'stridor' | 'hemoptysis' | 'rest_dyspnoea'
  | 'odynophagia' | 'neck_lump' | 'aspiration' | 'weight_loss';

export interface SymptomItem {
  id: SymptomId;
  text: string;
  textHi: string;
  severity: 'urgent' | 'review';
}

/**
 * These seven questions carry most of the safety value in the whole module and
 * need no signal processing at all. They are asked every session, before any
 * recording, and they are the reason the acoustic work is worth building rather
 * than the other way round.
 *
 * 'urgent' items concern the airway and are escalated immediately with a
 * same-day instruction to the patient. 'review' items are queued for the ENT
 * team. Neither is a diagnosis.
 */
export const SYMPTOM_ITEMS: SymptomItem[] = [
  {
    id: 'stridor',
    severity: 'urgent',
    text: 'Noisy or whistling breathing that is new or getting worse',
    textHi: 'सांस लेते समय नई या बढ़ती हुई सीटी जैसी आवाज़',
  },
  {
    id: 'rest_dyspnoea',
    severity: 'urgent',
    text: 'Shortness of breath while sitting still',
    textHi: 'बैठे-बैठे सांस फूलना',
  },
  {
    id: 'hemoptysis',
    severity: 'urgent',
    text: 'Coughing up blood or blood-stained phlegm',
    textHi: 'खांसी में खून या खून मिला बलगम आना',
  },
  {
    id: 'aspiration',
    severity: 'review',
    text: 'Choking or coughing on food or drink',
    textHi: 'खाने या पीने पर दम घुटना या खांसी आना',
  },
  {
    id: 'odynophagia',
    severity: 'review',
    text: 'Pain on swallowing that is new or getting worse',
    textHi: 'निगलते समय नया या बढ़ता हुआ दर्द',
  },
  {
    id: 'neck_lump',
    severity: 'review',
    text: 'A new lump or swelling in the neck',
    textHi: 'गर्दन में नई गांठ या सूजन',
  },
  {
    id: 'weight_loss',
    severity: 'review',
    text: 'Losing weight without trying',
    textHi: 'बिना प्रयास के वज़न घटना',
  },
];

/* -------------------------------------------------------------------- types */

export interface VoiceSession {
  id: string;
  date: string;
  cohort: VoiceCohort;

  mptSec: number | null;
  mptTrials: number[];
  cppsDb: number | null;
  cppsVoicedRatio: number | null;
  ddkAmrRate: number | null;
  ddkSmrRate: number | null;
  ddkIntervalCvPct: number | null;

  noiseFloorDb: number;
  deviceFingerprint: string;
  processingDisabled: boolean;
  qualityFlags: string[];

  symptoms: SymptomId[];
  createdAt: string;
}

export interface VoiceProfile {
  cohort: VoiceCohort;
  treatmentDate: string | null;
  updatedAt: string;
}

export interface PromResult {
  id: string;
  date: string;
  instrument: 'VHI-10' | 'EAT-10';
  score: number;
  answers: Record<string, number>;
  createdAt: string;
}

/* ------------------------------------------------------- session assembly */

export interface TakeInputs {
  cohort: VoiceCohort;
  noiseFloorDb: number;
  deviceFingerprint: string;
  processingDisabled: boolean;
  cpps: CppsResult | null;
  mptTrials: PhonationResult[];
  amr: DdkResult | null;
  smr: DdkResult | null;
  symptoms: SymptomId[];
  clippedFractions?: number[];
}

/** Minimum fraction of frames that must pass the voicing gate for CPPS to count. */
const MIN_CPPS_VOICED_RATIO = 0.25;

/**
 * Fold raw analysis output into a stored session, attaching quality flags.
 *
 * A metric that fails its quality check is stored as null rather than as a
 * plausible-looking number. Alerting treats null as "no observation", which is
 * the honest behaviour: a bad take should never be able to trigger or suppress
 * a clinical flag.
 */
export function buildVoiceSession(input: TakeInputs): VoiceSession {
  const flags: string[] = [];

  if (input.noiseFloorDb > MAX_USABLE_NOISE_FLOOR_DB) flags.push('noisy_room');
  if (!input.processingDisabled) flags.push('device_processing_on');
  if ((input.clippedFractions ?? []).some((f) => f > 0.001)) flags.push('clipping');

  const usableTrials = input.mptTrials.filter((t) => t.detected).map((t) => t.durationSec);
  if (input.mptTrials.length > 0 && usableTrials.length < input.mptTrials.length) {
    flags.push('mpt_trial_missing');
  }

  const cppsUsable =
    input.cpps !== null &&
    input.cpps.voicedFrameRatio >= MIN_CPPS_VOICED_RATIO &&
    !flags.includes('clipping');
  if (input.cpps !== null && !cppsUsable) flags.push('cpps_unreliable');

  return {
    id: newId(),
    date: new Date().toISOString().slice(0, 10),
    cohort: input.cohort,
    // Best of three: single-trial MPT is dominated by inspiratory effort.
    mptSec: usableTrials.length ? Math.max(...usableTrials) : null,
    mptTrials: usableTrials,
    cppsDb: cppsUsable ? (input.cpps as CppsResult).cppsDb : null,
    cppsVoicedRatio: input.cpps ? input.cpps.voicedFrameRatio : null,
    ddkAmrRate: input.amr && input.amr.count >= 3 ? input.amr.ratePerSec : null,
    ddkSmrRate: input.smr && input.smr.count >= 3 ? input.smr.ratePerSec : null,
    ddkIntervalCvPct: input.amr && input.amr.count >= 3 ? input.amr.intervalCvPct : null,
    noiseFloorDb: input.noiseFloorDb,
    deviceFingerprint: input.deviceFingerprint,
    processingDisabled: input.processingDisabled,
    qualityFlags: flags,
    symptoms: input.symptoms,
    createdAt: new Date().toISOString(),
  };
}

/* ------------------------------------------------------------------ alerting */

export type AlertKind =
  | SymptomId
  | 'mpt_decline' | 'cpps_decline' | 'ddk_decline';

export interface VoiceAlert {
  kind: AlertKind;
  source: 'symptom' | 'acoustic';
  severity: 'urgent' | 'review';
  message: string;
  messageHi: string;
  detail?: string;
}

/** Sessions used to establish the patient's own baseline. */
export const BASELINE_SESSIONS = 3;

/** Acoustic alerting stays silent until a baseline exists. */
export const MIN_SESSIONS_FOR_ACOUSTIC = BASELINE_SESSIONS + 1;

/** A single dip is noise. Two consecutive breaches are a signal. */
export const CONSECUTIVE_BREACHES = 2;

/**
 * Provisional minimal detectable change per metric.
 *
 * THESE ARE PLACEHOLDERS. They are rough figures from the literature and from
 * the synthetic test bench, not measurements from this tool on these patients.
 * They must be replaced with locally measured within-session test-retest values
 * before any clinical reliance - see the bench-test in the module README. Until
 * then they exist to stop the alerting being more confident than the data.
 */
export const VOICE_MDC = {
  mptSec: 3.0,
  cppsDb: 1.5,
  ddkRate: 0.8,
};

interface MetricSpec {
  key: 'mptSec' | 'cppsDb' | 'ddkAmrRate';
  kind: AlertKind;
  mdc: number;
  label: string;
  labelHi: string;
}

const TRACKED_METRICS: MetricSpec[] = [
  { key: 'mptSec', kind: 'mpt_decline', mdc: VOICE_MDC.mptSec, label: 'how long you can hold a note', labelHi: 'आप कितनी देर स्वर बनाए रख पाते हैं' },
  { key: 'cppsDb', kind: 'cpps_decline', mdc: VOICE_MDC.cppsDb, label: 'voice steadiness', labelHi: 'आवाज़ की स्थिरता' },
  { key: 'ddkAmrRate', kind: 'ddk_decline', mdc: VOICE_MDC.ddkRate, label: 'how quickly you can repeat syllables', labelHi: 'आप कितनी तेज़ी से अक्षर दोहरा पाते हैं' },
];

export interface MetricBaseline {
  median: number;
  sd: number;
  /** Alert threshold: below this counts as a breach. */
  controlLimit: number;
  n: number;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function sd(values: number[]): number {
  if (values.length < 2) return 0;
  const m = values.reduce((a, b) => a + b, 0) / values.length;
  return Math.sqrt(values.reduce((a, b) => a + (b - m) * (b - m), 0) / (values.length - 1));
}

/**
 * Baseline and control limit for one metric, from the patient's own first
 * sessions. Median rather than mean, so one bad early take does not drag the
 * reference down for the rest of the patient's monitoring.
 *
 * The limit is two within-patient standard deviations below baseline, but never
 * tighter than the metric's minimal detectable change. With only three sessions
 * the SD estimate is unstable, and the MDC floor is what stops that instability
 * turning into false alarms.
 */
export function computeBaseline(values: number[], mdc: number): MetricBaseline | null {
  if (values.length < BASELINE_SESSIONS) return null;
  const window = values.slice(0, BASELINE_SESSIONS);
  const m = median(window);
  const s = sd(window);
  return { median: m, sd: s, controlLimit: m - Math.max(2 * s, mdc), n: window.length };
}

/**
 * Decide what, if anything, needs a clinician's attention.
 *
 * Symptoms fire immediately and unconditionally. Acoustic decline must clear
 * four separate bars: a baseline must exist, the metric must be present in the
 * last two sessions, both must fall below the within-patient control limit, and
 * the recordings must be comparable to the baseline.
 *
 * The naive rule this replaces - "MPT dropped more than 40 percent over two
 * tests" - fires on any patient who forgets to take a full breath, which in this
 * cohort is most of them some of the time. Alarm fatigue would make the whole
 * dashboard worthless.
 */
export function evaluateRedFlags(sessions: VoiceSession[]): VoiceAlert[] {
  const alerts: VoiceAlert[] = [];
  if (sessions.length === 0) return alerts;

  // Sessions are stored newest-first.
  const latest = sessions[0];

  for (const id of latest.symptoms) {
    const item = SYMPTOM_ITEMS.find((s) => s.id === id);
    if (!item) continue;
    alerts.push({
      kind: item.id,
      source: 'symptom',
      severity: item.severity,
      message:
        item.severity === 'urgent'
          ? `Reported: ${item.text.toLowerCase()}. This needs to be seen today.`
          : `Reported: ${item.text.toLowerCase()}. Flagged for ENT review.`,
      messageHi:
        item.severity === 'urgent'
          ? `बताया गया: ${item.textHi} इसे आज ही दिखाना ज़रूरी है।`
          : `बताया गया: ${item.textHi} ईएनटी समीक्षा के लिए चिह्नित।`,
    });
  }

  if (sessions.length < MIN_SESSIONS_FOR_ACOUSTIC) return alerts;

  const chronological = [...sessions].reverse();
  const recent = sessions.slice(0, CONSECUTIVE_BREACHES);

  // Comparability gate. A different phone or a noisy room changes the numbers by
  // more than disease does, so a breach measured under those conditions is not
  // evidence of anything.
  const baselineDevice = chronological[0].deviceFingerprint;
  const comparable = recent.every(
    (s) => s.deviceFingerprint === baselineDevice && !s.qualityFlags.includes('noisy_room'),
  );
  if (!comparable) return alerts;

  for (const spec of TRACKED_METRICS) {
    const history = chronological
      .map((s) => s[spec.key])
      .filter((v): v is number => v !== null);
    const baseline = computeBaseline(history, spec.mdc);
    if (!baseline) continue;

    const recentValues = recent.map((s) => s[spec.key]);
    if (recentValues.some((v) => v === null)) continue;

    const breached = (recentValues as number[]).every((v) => v < baseline.controlLimit);
    if (!breached) continue;

    const current = recentValues[0] as number;
    alerts.push({
      kind: spec.kind,
      source: 'acoustic',
      severity: 'review',
      message: `A sustained fall in ${spec.label} across the last ${CONSECUTIVE_BREACHES} recordings. Flagged for ENT review.`,
      messageHi: `पिछली ${CONSECUTIVE_BREACHES} रिकॉर्डिंग में ${spec.labelHi} में लगातार गिरावट। ईएनटी समीक्षा के लिए चिह्नित।`,
      detail: `${current.toFixed(1)} vs baseline ${baseline.median.toFixed(1)} (limit ${baseline.controlLimit.toFixed(1)}, n=${baseline.n})`,
    });
  }

  return alerts;
}

/* ------------------------------------------------------------------- trends */

export interface VoiceTrend {
  sessionCount: number;
  latest: VoiceSession | null;
  baselineMpt: MetricBaseline | null;
  baselineCpps: MetricBaseline | null;
  /** Direction of the most recent third of sessions against the baseline. */
  direction: 'improving' | 'stable' | 'declining' | 'unknown';
}

export function summariseVoiceTrend(sessions: VoiceSession[]): VoiceTrend {
  if (sessions.length === 0) {
    return { sessionCount: 0, latest: null, baselineMpt: null, baselineCpps: null, direction: 'unknown' };
  }
  const chronological = [...sessions].reverse();
  const mptHistory = chronological.map((s) => s.mptSec).filter((v): v is number => v !== null);
  const cppsHistory = chronological.map((s) => s.cppsDb).filter((v): v is number => v !== null);

  const baselineMpt = computeBaseline(mptHistory, VOICE_MDC.mptSec);

  let direction: VoiceTrend['direction'] = 'unknown';
  if (baselineMpt && mptHistory.length >= MIN_SESSIONS_FOR_ACOUSTIC) {
    const recent = mptHistory.slice(-CONSECUTIVE_BREACHES);
    const recentMean = recent.reduce((a, b) => a + b, 0) / recent.length;
    const delta = recentMean - baselineMpt.median;
    if (delta > VOICE_MDC.mptSec) direction = 'improving';
    else if (delta < -VOICE_MDC.mptSec) direction = 'declining';
    else direction = 'stable';
  }

  return {
    sessionCount: sessions.length,
    latest: sessions[0],
    baselineMpt,
    baselineCpps: computeBaseline(cppsHistory, VOICE_MDC.cppsDb),
    direction,
  };
}

/**
 * One plain sentence for the patient.
 *
 * Says nothing about cancer, recurrence or prognosis, and never converts an
 * acoustic number into a diagnosis. Where there is not enough data to say
 * anything, it says that instead of inventing reassurance.
 */
export function generateVoiceInsight(trend: VoiceTrend, locale: 'en' | 'hi' = 'en'): string {
  const hi = locale === 'hi';

  if (trend.sessionCount === 0) {
    return hi
      ? 'अभी कोई रिकॉर्डिंग नहीं है। पहली रिकॉर्डिंग आपकी आधार रेखा बनेगी।'
      : 'No recordings yet. Your first one becomes the baseline everything else is compared against.';
  }
  if (trend.sessionCount < MIN_SESSIONS_FOR_ACOUSTIC) {
    const remaining = MIN_SESSIONS_FOR_ACOUSTIC - trend.sessionCount;
    return hi
      ? `आधार रेखा बनने में ${remaining} और रिकॉर्डिंग बाकी हैं। तब तक बदलाव की तुलना करना भरोसेमंद नहीं होगा।`
      : `${remaining} more recording${remaining === 1 ? '' : 's'} until your baseline is set. Until then, comparing changes is not reliable.`;
  }

  if (trend.direction === 'improving') {
    return hi
      ? 'पिछली रिकॉर्डिंग में आप पहले से लंबे समय तक स्वर बनाए रख पा रहे हैं। यह ठीक होने का अपेक्षित संकेत है।'
      : 'You are holding a note longer than at baseline. That is the expected direction during recovery.';
  }
  if (trend.direction === 'declining') {
    return hi
      ? 'पिछली रिकॉर्डिंग में स्वर बनाए रखने का समय आपकी आधार रेखा से कम है। यह आपकी ईएनटी टीम को दिखाया गया है - यह अपने आप में निदान नहीं है।'
      : 'Your recent recordings hold a note for less time than your baseline. This has been flagged to your ENT team - on its own it is not a diagnosis.';
  }
  return hi
    ? 'आपके माप आधार रेखा के आसपास स्थिर हैं। साप्ताहिक रिकॉर्डिंग जारी रखें।'
    : 'Your measurements are holding steady around your baseline. Keep recording weekly.';
}

/* ------------------------------------------------------------------ storage */

export const STORAGE_KEYS = {
  sessions: 'id-voice-sessions',
  profile: 'id-voice-profile',
  vhi: 'id-voice-vhi10',
  eat: 'id-voice-eat10',
  symptomLog: 'id-symptom-log',
};

const MAX_SESSIONS = 120;
const MAX_PROM_RESULTS = 60;

function newId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `v-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Quota exceeded. Drop the oldest half rather than losing the write, the
    // same fallback gaze-tracking.ts uses.
    if (Array.isArray(value) && value.length > 1) {
      try {
        window.localStorage.setItem(key, JSON.stringify(value.slice(0, Math.floor(value.length / 2))));
      } catch {
        /* nothing more to do */
      }
    }
  }
}

export function loadVoiceSessions(): VoiceSession[] {
  return readJson<VoiceSession[]>(STORAGE_KEYS.sessions, []);
}

export function saveVoiceSession(session: VoiceSession): VoiceSession[] {
  const next = [session, ...loadVoiceSessions()].slice(0, MAX_SESSIONS);
  writeJson(STORAGE_KEYS.sessions, next);
  return next;
}

export function loadVoiceProfile(): VoiceProfile {
  return readJson<VoiceProfile>(STORAGE_KEYS.profile, {
    cohort: 'partial_laryngectomy',
    treatmentDate: null,
    updatedAt: new Date().toISOString(),
  });
}

export function saveVoiceProfile(profile: VoiceProfile): void {
  writeJson(STORAGE_KEYS.profile, { ...profile, updatedAt: new Date().toISOString() });
}

export function loadPromHistory(instrument: 'VHI-10' | 'EAT-10'): PromResult[] {
  return readJson<PromResult[]>(instrument === 'VHI-10' ? STORAGE_KEYS.vhi : STORAGE_KEYS.eat, []);
}

export function savePromResult(
  instrument: 'VHI-10' | 'EAT-10',
  score: number,
  answers: Record<string, number>,
): PromResult[] {
  const result: PromResult = {
    id: newId(),
    date: new Date().toISOString().slice(0, 10),
    instrument,
    score,
    answers,
    createdAt: new Date().toISOString(),
  };
  const key = instrument === 'VHI-10' ? STORAGE_KEYS.vhi : STORAGE_KEYS.eat;
  const next = [result, ...loadPromHistory(instrument)].slice(0, MAX_PROM_RESULTS);
  writeJson(key, next);
  return next;
}

/**
 * Mirror a PROM score into the shared symptom log, downscaled to the 0-10 range
 * the log uses, the same way saveDhiToSymptomLog does for the DHI.
 */
export function savePromToSymptomLog(
  instrument: 'VHI-10' | 'EAT-10',
  score: number,
  gradeLabel: string,
): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.symptomLog);
    const entries = raw ? (JSON.parse(raw) as unknown[]) : [];
    const entry = {
      id: newId(),
      date: new Date().toISOString().slice(0, 10),
      note: `${instrument}: ${score}/40 - ${gradeLabel}`,
      severity: Math.round((score / 40) * 10),
      createdAt: new Date().toISOString(),
    };
    window.localStorage.setItem(STORAGE_KEYS.symptomLog, JSON.stringify([entry, ...entries]));
  } catch {
    /* symptom log is best-effort */
  }
}
