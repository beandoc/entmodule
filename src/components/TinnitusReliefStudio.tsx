'use client';

import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  AudioWaveform, Play, Pause, Headphones, Ear, Activity, ShieldAlert, AlertTriangle,
  CheckCircle2, RotateCcw, Clock, Volume2, Save, Check, Sparkles, BookOpenText,
  Building2, ArrowRight, KeyRound, Waves, Timer, Info,
} from 'lucide-react';
import { useAppData } from '@/lib/app-data-context';
import { TinnitusThiInventory } from './TinnitusThiInventory';
import {
  TinnitusEngine, AUDIO_LIMITS, ACRN_DEFAULTS, ACRN_LIMITS,
  generateAcrnFrequencies, clampFrequency,
  type NoiseColor, type EngineMode, type SoundscapePreset, type BinauralPreset, type EqGains,
  BINAURAL_PRESETS, EQ_FREQUENCIES, DEFAULT_EQ_GAINS,
} from '@/lib/tinnitus-audio';
import {
  decodeRx, encodeRx, loadRx, saveRx, loadSessions, saveSession, loadThiHistory, totalMinutes,
  type TinnitusRx, type TinnitusSession, type ThiResult, type RxEngine,
} from '@/lib/tinnitus-rx';

type TabId = 'setup' | 'therapy' | 'track' | 'learn';
type SetupStep = 'triage' | 'headphones' | 'pitch' | 'octave' | 'level';

const OCTAVE_ANCHORS = [250, 500, 1000, 2000, 4000, 6000, 8000, 10000, 12000];
const SESSION_PRESETS = [15, 30, 60, 120];

const ENGINE_TO_MODE: Record<RxEngine, Exclude<EngineMode, 'idle' | 'pitch'>> = {
  ACRN: 'acrn',
  NOTCH: 'notched',
  BROAD: 'broadband',
  BINAURAL: 'binaural',
  SOUNDSCAPE: 'soundscape',
};

/** Log-scaled slider position so the low frequencies are not crushed into a few pixels. */
const SLIDER_STEPS = 1000;
function freqToSlider(hz: number): number {
  const { MIN_FREQUENCY: lo, MAX_FREQUENCY: high } = AUDIO_LIMITS;
  return Math.round((SLIDER_STEPS * Math.log(clampFrequency(hz) / lo)) / Math.log(high / lo));
}
function sliderToFreq(position: number): number {
  const { MIN_FREQUENCY: lo, MAX_FREQUENCY: high } = AUDIO_LIMITS;
  return Math.round(lo * Math.pow(high / lo, position / SLIDER_STEPS));
}

function formatClock(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

const RangeRow: React.FC<{
  label: string;
  readout: string;
  min: number;
  max: number;
  step?: number;
  value: number;
  onChange: (v: number) => void;
  hint?: string;
  accent?: string;
  ariaLabel?: string;
}> = ({ label, readout, min, max, step = 1, value, onChange, hint, accent = 'accent-navy-700', ariaLabel }) => {
  const id = useId();
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={id} className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</label>
        <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-navy-50 text-navy-700 border border-navy-200 dark:bg-ink-900 dark:text-navy-200 dark:border-ink-700">
          {readout}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={ariaLabel ?? label}
        aria-valuetext={readout}
        className={`w-full h-2 rounded-lg bg-slate-200 dark:bg-ink-800 cursor-pointer ${accent}`}
      />
      {hint && <p className="text-[11px] text-slate-400 leading-relaxed">{hint}</p>}
    </div>
  );
};

export const TinnitusReliefStudio: React.FC = () => {
  const { locale } = useAppData();
  const hi = locale === 'hi';

  const [activeTab, setActiveTab] = useState<TabId>('setup');
  const [setupStep, setSetupStep] = useState<SetupStep>('triage');

  const [triageSide, setTriageSide] = useState<'both' | 'left' | 'right'>('both');
  const [isPulsatile, setIsPulsatile] = useState(false);
  const [hasSuddenLoss, setHasSuddenLoss] = useState(false);
  const [hasVertigo, setHasVertigo] = useState(false);
  /** Patient has explicitly acknowledged the red-flag escalation before proceeding. */
  const [triageAck, setTriageAck] = useState(false);
  /**
   * Frequency captured on entering the octave-confusion step. The three octave
   * choices are derived from this anchor, not from the live `frequency` state, so
   * clicking an option cannot shift the choices on the next click.
   */
  const [octaveBase, setOctaveBase] = useState<number | null>(null);

  const [frequency, setFrequency] = useState(8000);
  const [levelDb, setLevelDb] = useState(AUDIO_LIMITS.DEFAULT_LEVEL_DB);
  const [pan, setPan] = useState(0);
  const [noiseColor, setNoiseColor] = useState<NoiseColor>('pink');
  const [bgNoiseColor, setBgNoiseColor] = useState<NoiseColor | 'none'>('none');
  const [soundscape, setSoundscape] = useState<SoundscapePreset>('ocean');
  const [binauralPreset, setBinauralPreset] = useState<BinauralPreset>('alpha');
  const [eqGains, setEqGainsState] = useState<EqGains>([...DEFAULT_EQ_GAINS]);
  const [engineChoice, setEngineChoice] = useState<RxEngine>('ACRN');
  const [loopRepeat, setLoopRepeat] = useState(ACRN_DEFAULTS.loopRepeat);
  const [restLength, setRestLength] = useState(ACRN_DEFAULTS.restLength);

  const [playingMode, setPlayingMode] = useState<EngineMode>('idle');
  const [cycleTones, setCycleTones] = useState<number[]>([]);

  const [rx, setRx] = useState<TinnitusRx | null>(null);
  const [rxCode, setRxCode] = useState('');
  const [rxError, setRxError] = useState('');

  const [sessionMinutes, setSessionMinutes] = useState(AUDIO_LIMITS.DEFAULT_SESSION_MINUTES);
  const [remainingSeconds, setRemainingSeconds] = useState(AUDIO_LIMITS.DEFAULT_SESSION_MINUTES * 60);
  /**
   * Absolute ms timestamp at which the current therapy session will complete.
   * Stored as a ref (not state) so the timer interval does not rebuild every tick.
   */
  const sessionDeadlineRef = useRef<number | null>(null);
  /** Timestamp when the most recent therapy session started, for accurate minutesRun. */
  const sessionStartRef = useRef<number | null>(null);
  /** Handle for the sessionSaved flash timeout, cleared on unmount. */
  const savedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [loudnessBefore, setLoudnessBefore] = useState(6);
  const [loudnessAfter, setLoudnessAfter] = useState(4);
  const [sessions, setSessions] = useState<TinnitusSession[]>([]);
  const [thiHistory, setThiHistory] = useState<ThiResult[]>([]);
  const [sessionSaved, setSessionSaved] = useState(false);

  const engineRef = useRef<TinnitusEngine | null>(null);
  const getEngine = () => {
    if (!engineRef.current) {
      engineRef.current = new TinnitusEngine();
      engineRef.current.onCycle = (tones) => setCycleTones(tones);
    }
    return engineRef.current;
  };

  const acrnTones = useMemo(() => generateAcrnFrequencies(frequency), [frequency]);

  const stopAll = useCallback(() => {
    engineRef.current?.stop();
    setPlayingMode('idle');
  }, []);

  // Load stored prescription and history once on mount.
  useEffect(() => {
    const stored = loadRx();
    if (stored) {
      setRx(stored);
      setFrequency(stored.fT);
      setLevelDb(stored.levelDb);
      setEngineChoice(stored.engine);
      setLoopRepeat(stored.loopRepeat);
      setRestLength(stored.restLength);
      setActiveTab('therapy');
    }
    setSessions(loadSessions());
    setThiHistory(loadThiHistory());
  }, []);

  // Sound must never outlive the page: tear down on unmount, and stop when the tab is
  // hidden or the app is backgrounded.
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) stopAll();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('pagehide', stopAll);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('pagehide', stopAll);
      engineRef.current?.dispose();
      engineRef.current = null;
      // Clear the saved-flash timeout so it cannot fire after unmount.
      if (savedTimeoutRef.current !== null) {
        clearTimeout(savedTimeoutRef.current);
        savedTimeoutRef.current = null;
      }
    };
  }, [stopAll]);

  // Live parameter updates while sound is playing.
  useEffect(() => { engineRef.current?.setFrequency(frequency); }, [frequency]);
  useEffect(() => { engineRef.current?.setLevelDb(levelDb); }, [levelDb]);
  useEffect(() => { engineRef.current?.setPan(pan); }, [pan]);
  useEffect(() => { engineRef.current?.setNoiseColor(noiseColor); }, [noiseColor]);
  useEffect(() => { engineRef.current?.setSoundscape(soundscape); }, [soundscape]);
  useEffect(() => { engineRef.current?.setAcrnOptions({ loopRepeat, restLength }); }, [loopRepeat, restLength]);

  // Session countdown — deadline-based so it does not drift over a 60-minute session.
  // The interval reads the deadline timestamp on each tick rather than decrementing state,
  // which avoids the effect teardown / rebuild every second that causes measurable drift.
  const isTherapyPlaying = playingMode !== 'idle' && playingMode !== 'pitch';
  useEffect(() => {
    if (!isTherapyPlaying) return;
    const id = setInterval(() => {
      if (sessionDeadlineRef.current === null) return;
      const secs = Math.round((sessionDeadlineRef.current - Date.now()) / 1000);
      if (secs <= 0) {
        setRemainingSeconds(0);
        clearInterval(id);
        stopAll();
        sessionDeadlineRef.current = null;
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
          const msg = new SpeechSynthesisUtterance(
            hi ? 'साउंड थेरेपी सत्र पूरा हुआ' : 'Sound therapy session complete'
          );
          msg.lang = hi ? 'hi-IN' : 'en-US';
          window.speechSynthesis.speak(msg);
        }
      } else {
        setRemainingSeconds(secs);
      }
    }, 1000);
    return () => clearInterval(id);
  // Only depend on isTherapyPlaying and stable callbacks — not on remainingSeconds.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTherapyPlaying, hi, stopAll]);

  useEffect(() => { engineRef.current?.setEqGains(eqGains); }, [eqGains]);

  const play = async (mode: Exclude<EngineMode, 'idle'>) => {
    const engine = getEngine();
    // Binaural beats require both oscillators to be hard-panned L/R internally.
    // A non-zero pan on the master StereoPanner destroys the interaural phase difference,
    // collapsing the beat. Always pass pan=0 for binaural mode.
    const effectivePan = mode === 'binaural' ? 0 : pan;
    await engine.start(mode, {
      frequency,
      levelDb,
      pan: effectivePan,
      noiseColor,
      bgNoiseColor,
      soundscape,
      binaural: binauralPreset,
      eqGains,
      acrn: { bpm: ACRN_DEFAULTS.bpm, loopRepeat, restLength },
    });
    setPlayingMode(mode);
  };

  const togglePitchTone = async () => {
    if (playingMode === 'pitch') { stopAll(); return; }
    await play('pitch');
  };

  const toggleTherapy = async () => {
    if (isTherapyPlaying) { stopAll(); return; }
    // Set deadline before starting so the timer effect can read it immediately.
    const totalMs = (remainingSeconds > 0 ? remainingSeconds : sessionMinutes * 60) * 1000;
    sessionDeadlineRef.current = Date.now() + totalMs;
    if (remainingSeconds <= 0) setRemainingSeconds(sessionMinutes * 60);
    sessionStartRef.current = Date.now();
    await play(ENGINE_TO_MODE[engineChoice]);
  };

  const nudgeFrequency = async (factor: number) => {
    const next = clampFrequency(Math.round(frequency * factor));
    setFrequency(next);
    if (playingMode !== 'pitch') await play('pitch');
  };

  const previewFrequency = async (hz: number) => {
    setFrequency(clampFrequency(hz));
    if (playingMode !== 'pitch') await play('pitch');
  };

  const runChannelCheck = async (side: 'left' | 'right') => {
    stopAll();
    await getEngine().playChannelCheck(side);
  };

  const persistRx = (source: 'clinician' | 'self', extra?: Partial<TinnitusRx>) => {
    const next: TinnitusRx = {
      fT: frequency,
      levelDb,
      engine: engineChoice,
      loopRepeat,
      restLength,
      source,
      updatedAt: new Date().toISOString(),
      ...extra,
    };
    saveRx(next);
    setRx(next);
    return next;
  };

  const applyRxCode = () => {
    const decoded = decodeRx(rxCode);
    if (!decoded) {
      setRxError(hi ? 'यह कोड मान्य नहीं है। उदाहरण: RX-8000-45-ACRN-3x8' : 'That code is not valid. Example: RX-8000-45-ACRN-3x8');
      return;
    }
    stopAll();
    setRxError('');
    setFrequency(decoded.fT);
    setLevelDb(decoded.levelDb);
    setEngineChoice(decoded.engine);
    setLoopRepeat(decoded.loopRepeat);
    setRestLength(decoded.restLength);
    const next: TinnitusRx = {
      ...decoded,
      source: 'clinician',
      updatedAt: new Date().toISOString(),
    };
    saveRx(next);
    setRx(next);
    setActiveTab('therapy');
  };

  const finishSelfMatch = () => {
    stopAll();
    persistRx('self');
    setActiveTab('therapy');
  };

  const handleSaveSession = () => {
    // Use the wall-clock start timestamp if available for accuracy.
    // Fall back to the remaining-seconds calculation, but floor at 0 (not 1)
    // so a session that never actually played does not record false minutes.
    const minutesRun = sessionStartRef.current !== null
      ? Math.max(0, Math.round((Date.now() - sessionStartRef.current) / 60000))
      : Math.max(0, Math.round((sessionMinutes * 60 - remainingSeconds) / 60));
    const session: TinnitusSession = {
      id: crypto.randomUUID(),
      date: new Date().toISOString().slice(0, 10),
      engine: engineChoice,
      fT: frequency,
      levelDb,
      minutes: minutesRun,
      loudnessBefore,
      loudnessAfter,
      createdAt: new Date().toISOString(),
    };
    setSessions(saveSession(session));
    setSessionSaved(true);
    if (savedTimeoutRef.current !== null) clearTimeout(savedTimeoutRef.current);
    savedTimeoutRef.current = setTimeout(() => {
      setSessionSaved(false);
      savedTimeoutRef.current = null;
    }, 2500);
  };

  const weeklyMinutes = useMemo(() => {
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    return totalMinutes(sessions.filter((s) => s.date >= cutoff));
  }, [sessions]);

  const tabs: { id: TabId; label: string; labelHi: string; icon: typeof Ear }[] = [
    { id: 'setup', label: 'Setup & Pitch Match', labelHi: 'सेटअप और पिच मिलान', icon: Ear },
    { id: 'therapy', label: 'Sound Therapy', labelHi: 'साउंड थेरेपी', icon: AudioWaveform },
    { id: 'track', label: 'Track Progress', labelHi: 'प्रगति ट्रैक करें', icon: Activity },
    { id: 'learn', label: 'How It Works', labelHi: 'यह कैसे काम करता है', icon: BookOpenText },
  ];

  return (
    <div className="space-y-6 page-enter">
      {/* Hero */}
      <div className="bg-gradient-to-r from-navy-900 via-navy-800 to-[#2b518c] rounded-2xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-navy-100 text-xs font-semibold backdrop-blur-sm">
            <AudioWaveform className="w-4 h-4" />
            {hi ? 'ऑडियोलॉजी · साउंड थेरेपी स्टूडियो' : 'Audiology · Sound Therapy Studio'}
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight font-display">
            {hi ? 'टिनिटस राहत स्टूडियो' : 'Tinnitus Relief Studio'}
          </h1>
          <p className="text-navy-100 text-xs md:text-sm leading-relaxed">
            {hi
              ? 'अपनी ऑडियोलॉजी पर्ची से निर्धारित आवृत्ति (Hz) दर्ज करें या स्वयं पिच खोजें, फिर अपने हेडफोन पर आरामदायक तीव्रता पर ACRN, नॉच्ड या ब्रॉडबैंड साउंड थेरेपी चलाएं।'
              : 'Enter your prescribed pitch frequency (Hz) or RX code from your Audiology slip, or find your pitch yourself, then play ACRN, notched, or broadband sound therapy through your own headphones.'}
          </p>
          {rx && (
            <div className="inline-flex flex-wrap items-center gap-2 pt-1">
              <span className="badge badge-navy bg-white/15 text-white border-white/25 font-mono">
                {encodeRx({ fT: rx.fT, levelDb: rx.levelDb, engine: rx.engine, loopRepeat: rx.loopRepeat, restLength: rx.restLength })}
              </span>
              <span className="text-[11px] text-navy-200">
                {rx.source === 'clinician'
                  ? (hi ? 'ऑडियोलॉजिस्ट द्वारा निर्धारित' : 'Prescribed by audiologist')
                  : (hi ? 'स्वयं मिलान किया गया' : 'Self-matched')}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Persistent red-flag banner */}
      <div className="rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 p-4 flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
        <div className="text-xs text-red-900 dark:text-red-200 leading-relaxed space-y-1">
          <strong className="font-bold block">
            {hi ? 'पहले यह जांचें — तुरंत ईएनटी दिखाएं यदि:' : 'Check this first — see ENT urgently if your tinnitus is:'}
          </strong>
          <p>
            {hi
              ? 'केवल एक कान में हो और साथ में सुनने की कमी हो · दिल की धड़कन के साथ धकधक करे (पल्सेटाइल) · अचानक शुरू हुआ हो · चक्कर, उल्टी या चेहरे की कमजोरी के साथ हो।'
              : 'in one ear only with hearing loss · pulsatile (in time with your heartbeat) · sudden in onset · accompanied by vertigo, vomiting or facial weakness.'}
          </p>
          <div className="flex flex-wrap gap-3 pt-1">
            <Link href="/emergency" className="inline-flex items-center gap-1 font-bold underline underline-offset-2">
              {hi ? 'आपातकालीन कार्ड' : 'Emergency Card'} <ArrowRight className="w-3 h-3" />
            </Link>
            <Link href="/schemes" className="inline-flex items-center gap-1 font-bold underline underline-offset-2">
              <Building2 className="w-3 h-3" />
              {hi ? 'ऑडियोलॉजी लैब, कक्ष 108' : 'Audiology Lab, Room 108'}
            </Link>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div role="tablist" aria-label={hi ? 'मुख्य अनुभाग' : 'Main sections'} className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {tabs.map((tab) => {
          const active = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={active}
              aria-controls={`tabpanel-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={`p-4 rounded-xl border text-left transition-all space-y-2 ${
                active
                  ? 'bg-navy-900 text-white border-navy-900 shadow-md ring-2 ring-navy-900/20'
                  : 'bg-white dark:bg-ink-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-ink-800 hover:border-navy-300'
              }`}
            >
              <Icon className={`w-4 h-4 ${active ? 'text-navy-200' : 'text-slate-400'}`} />
              <span className="font-bold text-xs md:text-sm block">{hi ? tab.labelHi : tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ------------------------------------------------------------ SETUP */}
      {activeTab === 'setup' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Prescription & Frequency Entry */}
            <div className="card p-6 space-y-4">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-navy-700 dark:text-navy-300" />
                <h2 className="font-bold text-slate-900 dark:text-white">
                  {hi ? 'ऑडियोलॉजिस्ट प्रिस्क्रिप्शन या आवृत्ति दर्ज करें' : 'Audiologist Prescription & Frequency Entry'}
                </h2>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                {hi
                  ? 'अपनी ऑडियोलॉजी रिपोर्ट या ओपीडी पर्ची में लिखी गई आवृत्ति (Hz) या प्रिस्क्रिप्शन कोड दर्ज करें (जैसे 8000 Hz, 6000 Hz या RX-8000-45-ACRN-3x8)।'
                  : 'Enter the pitch frequency (Hz) or prescription code written on your Audiology OPD slip (e.g. 8000 Hz, 6000 Hz or RX-8000-45-ACRN-3x8).'}
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  value={rxCode}
                  onChange={(e) => { setRxCode(e.target.value); setRxError(''); }}
                  placeholder={hi ? 'उदा: 8000 Hz, 6000 या RX-8000-45-ACRN-3x8' : 'e.g. 8000 Hz, 6000 or RX-8000-45-ACRN-3x8'}
                  className="input-field font-mono uppercase flex-1"
                  aria-label={hi ? 'प्रिस्क्रिप्शन या आवृत्ति' : 'Prescription or frequency'}
                />
                <button onClick={applyRxCode} disabled={!rxCode.trim()} className="btn-navy disabled:opacity-50 whitespace-nowrap">
                  {hi ? 'प्रिस्क्रिप्शन लागू करें' : 'Apply prescription'}
                </button>
              </div>
              {/* Quick prescription frequency presets */}
              <div className="flex items-center gap-2 flex-wrap pt-1">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  {hi ? 'सामान्य प्रिस्क्राइब आवृत्तियां:' : 'Common prescribed frequencies:'}
                </span>
                {[4000, 6000, 8000, 10000, 12000].map((hz) => (
                  <button
                    key={hz}
                    type="button"
                    onClick={() => {
                      setRxCode(`${hz} Hz`);
                      setRxError('');
                    }}
                    className="px-2.5 py-1 text-xs font-mono font-bold rounded-md bg-slate-100 dark:bg-ink-800 text-slate-700 dark:text-slate-200 hover:bg-navy-50 hover:text-navy-700 dark:hover:bg-navy-900 dark:hover:text-navy-200 border border-slate-200 dark:border-ink-700 transition-colors"
                  >
                    {hz} Hz
                  </button>
                ))}
              </div>
              {rxError && <p className="text-xs font-semibold text-red-600 dark:text-red-400">{rxError}</p>}
            </div>

            {/* Guided self match */}
            <div className="card p-6 space-y-5">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <Ear className="w-5 h-5 text-navy-700 dark:text-navy-300" />
                  <h2 className="font-bold text-slate-900 dark:text-white">
                    {hi ? 'स्वयं टिनिटस मैपिंग और स्क्रीनिंग' : 'Tinnitus Self-Mapping & Clinical Screening'}
                  </h2>
                </div>
                <div className="flex gap-1.5">
                  {(['triage', 'headphones', 'pitch', 'octave', 'level'] as SetupStep[]).map((step, i) => (
                    <span
                      key={step}
                      className={`w-7 h-7 rounded-full text-[11px] font-bold flex items-center justify-center border ${
                        setupStep === step
                          ? 'bg-navy-700 text-white border-navy-700'
                          : 'bg-slate-100 dark:bg-ink-900 text-slate-500 border-slate-200 dark:border-ink-800'
                      }`}
                    >
                      {i + 1}
                    </span>
                  ))}
                </div>
              </div>

              {setupStep === 'triage' && (
                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-4 rounded-xl bg-navy-50 dark:bg-ink-950 border border-navy-100 dark:border-ink-800">
                    <ShieldAlert className="w-5 h-5 text-navy-700 dark:text-navy-300 shrink-0 mt-0.5" />
                    <div className="space-y-1 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                      <p className="font-bold text-navy-900 dark:text-navy-100">
                        {hi ? 'चरणात्मक लक्षण स्क्रीनिंग (Clinical Safety Screen)' : 'Step 1: Clinical Safety Screen'}
                      </p>
                      <p>
                        {hi
                          ? 'सटीक और सुरक्षित मैपिंग के लिए पहले अपने टिनिटस के प्रकार की जांच करें:'
                          : 'Before mapping your tinnitus pitch, confirm your symptom characteristics:'}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-xl border border-slate-200 dark:border-ink-800 bg-white dark:bg-ink-900 space-y-2">
                      <span id="triage-location-label" className="font-bold block text-slate-700 dark:text-slate-300">
                        {hi ? 'ध्वनि किस कान में है?' : 'Tinnitus Location:'}
                      </span>
                      <div role="group" aria-labelledby="triage-location-label" className="flex gap-2">
                        {(['both', 'left', 'right'] as const).map((side) => (
                          <button
                            key={side}
                            onClick={() => setTriageSide(side)}
                            aria-pressed={triageSide === side}
                            className={`flex-1 py-1.5 rounded-lg font-semibold border text-center transition-all ${
                              triageSide === side
                                ? 'bg-navy-700 text-white border-navy-700'
                                : 'bg-slate-50 dark:bg-ink-950 border-slate-200 dark:border-ink-800 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            {side === 'both' ? (hi ? 'दोनों' : 'Both') : side === 'left' ? (hi ? 'बायाँ' : 'Left') : (hi ? 'दायाँ' : 'Right')}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="p-3 rounded-xl border border-slate-200 dark:border-ink-800 bg-white dark:bg-ink-900 space-y-2">
                      <span id="triage-pulsatile-label" className="font-bold block text-slate-700 dark:text-slate-300">
                        {hi ? 'क्या आवाज़ दिल की धड़कन जैसी है?' : 'Pulsatile (Heartbeat rhythm)?'}
                      </span>
                      <div role="group" aria-labelledby="triage-pulsatile-label" className="flex gap-2">
                        <button
                          onClick={() => setIsPulsatile(true)}
                          aria-pressed={isPulsatile}
                          className={`flex-1 py-1.5 rounded-lg font-semibold border text-center transition-all ${
                            isPulsatile ? 'bg-amber-600 text-white border-amber-600' : 'bg-slate-50 dark:bg-ink-950 border-slate-200 text-slate-700'
                          }`}
                        >
                          {hi ? 'हाँ (Pulsatile)' : 'Yes'}
                        </button>
                        <button
                          onClick={() => setIsPulsatile(false)}
                          aria-pressed={!isPulsatile}
                          className={`flex-1 py-1.5 rounded-lg font-semibold border text-center transition-all ${
                            !isPulsatile ? 'bg-navy-700 text-white border-navy-700' : 'bg-slate-50 dark:bg-ink-950 border-slate-200 text-slate-700'
                          }`}
                        >
                          {hi ? 'नहीं' : 'No'}
                        </button>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl border border-slate-200 dark:border-ink-800 bg-white dark:bg-ink-900 space-y-2">
                      <span id="triage-suddenloss-label" className="font-bold block text-slate-700 dark:text-slate-300">
                        {hi ? '72 घंटे में अचानक सुनने में कमी?' : 'Sudden hearing loss (<72 hrs)?'}
                      </span>
                      <div role="group" aria-labelledby="triage-suddenloss-label" className="flex gap-2">
                        <button
                          onClick={() => { setHasSuddenLoss(true); setTriageAck(false); }}
                          aria-pressed={hasSuddenLoss}
                          className={`flex-1 py-1.5 rounded-lg font-semibold border text-center transition-all ${
                            hasSuddenLoss ? 'bg-red-600 text-white border-red-600' : 'bg-slate-50 dark:bg-ink-950 border-slate-200 text-slate-700'
                          }`}
                        >
                          {hi ? 'हाँ' : 'Yes'}
                        </button>
                        <button
                          onClick={() => setHasSuddenLoss(false)}
                          aria-pressed={!hasSuddenLoss}
                          className={`flex-1 py-1.5 rounded-lg font-semibold border text-center transition-all ${
                            !hasSuddenLoss ? 'bg-navy-700 text-white border-navy-700' : 'bg-slate-50 dark:bg-ink-950 border-slate-200 text-slate-700'
                          }`}
                        >
                          {hi ? 'नहीं' : 'No'}
                        </button>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl border border-slate-200 dark:border-ink-800 bg-white dark:bg-ink-900 space-y-2">
                      <span id="triage-vertigo-label" className="font-bold block text-slate-700 dark:text-slate-300">
                        {hi ? 'चक्कर या सन्तुलन बिगड़ना?' : 'Associated Dizziness / Vertigo?'}
                      </span>
                      <div role="group" aria-labelledby="triage-vertigo-label" className="flex gap-2">
                        <button
                          onClick={() => { setHasVertigo(true); setTriageAck(false); }}
                          aria-pressed={hasVertigo}
                          className={`flex-1 py-1.5 rounded-lg font-semibold border text-center transition-all ${
                            hasVertigo ? 'bg-amber-600 text-white border-amber-600' : 'bg-slate-50 dark:bg-ink-950 border-slate-200 text-slate-700'
                          }`}
                        >
                          {hi ? 'हाँ' : 'Yes'}
                        </button>
                        <button
                          onClick={() => setHasVertigo(false)}
                          aria-pressed={!hasVertigo}
                          className={`flex-1 py-1.5 rounded-lg font-semibold border text-center transition-all ${
                            !hasVertigo ? 'bg-navy-700 text-white border-navy-700' : 'bg-slate-50 dark:bg-ink-950 border-slate-200 text-slate-700'
                          }`}
                        >
                          {hi ? 'नहीं' : 'No'}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* ---- Red-flag escalation (sudden loss or pulsatile) ---- */}
                  {(isPulsatile || hasSuddenLoss) && (
                    <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border-2 border-red-400 dark:border-red-700 text-red-900 dark:text-red-200 text-xs space-y-3">
                      <p className="font-bold flex items-center gap-1.5 text-sm">
                        <ShieldAlert className="w-5 h-5 text-red-600 shrink-0" />
                        {hi ? 'तत्काल ईएनटी जांच आवश्यक' : 'Urgent ENT Review Required'}
                      </p>
                      {hasSuddenLoss && (
                        <p className="leading-relaxed">
                          {hi
                            ? 'अचानक श्रवण हानि एक आपातकालीन स्थिति है — स्टेरॉयड उपचार की सफलता 72 घंटे की खिड़की पर निर्भर करती है। अभी ईएनटी विभाग, कक्ष 108 से संपर्क करें। स्व-निर्देशित साउंड थेरेपी शुरू करने से पहले ईएनटी से परामर्श आवश्यक है।'
                            : 'Sudden sensorineural hearing loss is a medical emergency — steroid therapy is most effective within a 72-hour window. Contact the ENT department (Room 108) immediately. Self-directed sound therapy must not be started before an ENT assessment.'}
                        </p>
                      )}
                      {isPulsatile && !hasSuddenLoss && (
                        <p className="leading-relaxed">
                          {hi
                            ? 'पल्सेटाइल टिनिटस (दिल की धड़कन जैसी आवाज़) के लिए ड्यूरल AV फिस्टुला, कैरोटिड स्टेनोसिस या ICP वृद्धि को रद्द करने के लिए तुरंत ईएनटी और इमेजिंग जांच कराएं।'
                            : 'Pulsatile tinnitus warrants urgent ENT referral and imaging to exclude dural AV fistula, carotid stenosis, or raised intracranial pressure.'}
                        </p>
                      )}
                      <label className="flex items-start gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={triageAck}
                          onChange={(e) => setTriageAck(e.target.checked)}
                          className="mt-0.5 accent-red-600"
                          aria-label={hi ? 'मैंने समझ लिया और ईएनटी से संपर्क किया है' : 'I understand and have contacted ENT / will do so before starting therapy'}
                        />
                        <span className="leading-relaxed">
                          {hi
                            ? 'मैंने यह जानकारी पढ़ ली है और ईएनटी विभाग से संपर्क करने / करवाने की प्रक्रिया में हूँ। मैं समझता/समझती हूँ कि यह थेरेपी चिकित्सकीय मूल्यांकन का विकल्प नहीं है।'
                            : 'I have read this information and have contacted ENT, or will do so before starting therapy. I understand this app is not a substitute for clinical evaluation.'}
                        </span>
                      </label>
                    </div>
                  )}

                  {/* ---- Amber advisory (unilateral / vertigo only, no red flag) ---- */}
                  {!isPulsatile && !hasSuddenLoss && (triageSide !== 'both' || hasVertigo) && (
                    <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs space-y-1">
                      <p className="font-bold flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                        {hi ? 'ईएनटी परामर्श सलाह:' : 'ENT Referral Recommended:'}
                      </p>
                      <p className="leading-relaxed">
                        {hi ? 'एकतरफ़ा टिनिटस या चक्कर के लक्षणों के लिए ईएनटी ऑडियोलॉजी जांच कराने की सलाह दी जाती है।' : 'Unilateral tinnitus or dizziness warrants clinical ENT & audiometric assessment.'}
                      </p>
                    </div>
                  )}

                  <button
                    onClick={() => setSetupStep('headphones')}
                    disabled={(isPulsatile || hasSuddenLoss) && !triageAck}
                    className="btn-navy w-full inline-flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {hi ? 'आगे बढ़ें — हेडफोन जांचें' : 'Continue — Test Headphones'}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}

              {setupStep === 'headphones' && (
                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-4 rounded-xl bg-navy-50 dark:bg-ink-950 border border-navy-100 dark:border-ink-800">
                    <Headphones className="w-5 h-5 text-navy-700 dark:text-navy-300 shrink-0 mt-0.5" />
                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                      {hi
                        ? 'हेडफोन पहनें और अपने फोन/लैपटॉप का वॉल्यूम कम रखें। नीचे दिए बटन दबाकर जांचें कि बायाँ और दायाँ सही तरफ हैं — टिनिटस अक्सर एक ही कान में होता है, इसलिए यह ज़रूरी है।'
                        : 'Put your headphones on and turn your device volume down first. Use the buttons below to confirm left and right are the right way round — tinnitus is often one-sided, so this matters.'}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => runChannelCheck('left')} className="btn-outline inline-flex items-center justify-center gap-2">
                      <Volume2 className="w-4 h-4" />
                      {hi ? 'बायाँ कान जांचें' : 'Test left ear'}
                    </button>
                    <button onClick={() => runChannelCheck('right')} className="btn-outline inline-flex items-center justify-center gap-2">
                      {hi ? 'दायाँ कान जांचें' : 'Test right ear'}
                      <Volume2 className="w-4 h-4" />
                    </button>
                  </div>
                  <button onClick={() => setSetupStep('pitch')} className="btn-navy w-full">
                    {hi ? 'दोनों सही हैं — आगे बढ़ें' : 'Both correct — continue'}
                  </button>
                </div>
              )}

              {setupStep === 'pitch' && (
                <div className="space-y-5">
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    {hi
                      ? 'टोन चलाएं और स्लाइडर तब तक घुमाएं जब तक यह आपके कान की आवाज़ से मेल न खा जाए।'
                      : 'Start the tone and move the slider until it matches the sound you hear in your ear.'}
                  </p>

                  <div className="flex flex-wrap gap-2">
                    {OCTAVE_ANCHORS.map((hz) => (
                      <button
                        key={hz}
                        onClick={() => previewFrequency(hz)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono border transition-all ${
                          Math.abs(frequency - hz) < 1
                            ? 'bg-navy-700 text-white border-navy-700'
                            : 'bg-slate-50 dark:bg-ink-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-ink-800 hover:border-navy-300'
                        }`}
                      >
                        {hz >= 1000 ? `${hz / 1000}k` : hz}
                      </button>
                    ))}
                  </div>

                  <RangeRow
                    label={hi ? 'आवृत्ति (पिच)' : 'Frequency (pitch)'}
                    readout={`${frequency} Hz`}
                    min={0}
                    max={SLIDER_STEPS}
                    value={freqToSlider(frequency)}
                    onChange={(v) => setFrequency(sliderToFreq(v))}
                    hint={hi ? 'लघुगणकीय पैमाना — 100 Hz से 14 kHz तक।' : 'Logarithmic scale — 100 Hz to 14 kHz.'}
                  />

                  <div className="grid grid-cols-4 gap-2">
                    <button onClick={() => nudgeFrequency(0.5)} className="btn-outline text-xs py-2">{hi ? 'बहुत नीचे' : 'Much lower'}</button>
                    <button onClick={() => nudgeFrequency(1 / 1.1)} className="btn-outline text-xs py-2">{hi ? 'थोड़ा नीचे' : 'Bit lower'}</button>
                    <button onClick={() => nudgeFrequency(1.1)} className="btn-outline text-xs py-2">{hi ? 'थोड़ा ऊपर' : 'Bit higher'}</button>
                    <button onClick={() => nudgeFrequency(2)} className="btn-outline text-xs py-2">{hi ? 'बहुत ऊपर' : 'Much higher'}</button>
                  </div>

                  <RangeRow
                    label={hi ? 'ध्वनि तीव्रता (डेसिबल)' : 'Sound intensity (dB)'}
                    readout={`${levelDb} dB`}
                    min={AUDIO_LIMITS.MIN_LEVEL_DB}
                    max={AUDIO_LIMITS.MAX_LEVEL_DB}
                    value={levelDb}
                    onChange={setLevelDb}
                    hint={hi ? 'सापेक्ष पैमाना — केवल इतना तेज़ रखें कि टोन आराम से सुनाई दे।' : 'Relative scale — keep it just loud enough to hear the tone comfortably.'}
                  />

                  <div className="flex flex-col sm:flex-row gap-3">
                    <button onClick={togglePitchTone} className="btn-navy flex-1 inline-flex items-center justify-center gap-2">
                      {playingMode === 'pitch' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
                      {playingMode === 'pitch' ? (hi ? 'टोन रोकें' : 'Stop tone') : (hi ? 'टोन चलाएं' : 'Play tone')}
                    </button>
                    <button
                      onClick={() => {
                        // Anchor the octave base NOW so the confusion-check options
                        // stay fixed regardless of what the patient clicks next.
                        setOctaveBase(frequency);
                        setSetupStep('octave');
                      }}
                      className="btn-outline flex-1"
                    >
                      {hi ? 'यह मेल खाता है — आगे' : 'This matches — next'}
                    </button>
                  </div>
                </div>
              )}

              {setupStep === 'octave' && (
                <div className="space-y-5">
                  <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900">
                    <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
                      {hi
                        ? 'ऑक्टेव भ्रम परीक्षण (Octave Confusion Check): लोग अक्सर वास्तविक पिच से एक ऑक्टेव ऊपर या नीचे का टोन चुन लेते हैं। नीचे दिए 3 टोन सुनकर पुष्टि करें कि कौन सी पिच आपके टिनिटस से सबसे बेहतर मेल खाती है:'
                        : 'Octave Confusion Challenge: People often misidentify their pitch by one octave. Listen to all 3 choices and press \"This matches\" only on the one that best matches your tinnitus:'}
                    </p>
                  </div>

                  {/* Derive all three choices from the anchored base, not from live frequency.
                      Without anchoring, clicking option 1 would halve `frequency`, making
                      all three options shift — the patient could spiral an octave down. */}
                  {(() => {
                    const base = octaveBase ?? frequency;
                    const opts = [
                      { label: hi ? 'विकल्प 1 (एक ऑक्टेव नीचे)' : 'Option 1 (−1 Octave)', hz: clampFrequency(Math.round(base / 2)) },
                      { label: hi ? 'विकल्प 2 (वर्तमान पिच)' : 'Option 2 (Current Pitch)', hz: clampFrequency(Math.round(base)) },
                      { label: hi ? 'विकल्प 3 (एक ऑक्टेव ऊपर)' : 'Option 3 (+1 Octave)', hz: clampFrequency(Math.round(base * 2)) },
                    ];
                    return (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {opts.map((opt) => {
                          // Preview plays the tone without committing; isSelected tracks which
                          // one the user is currently hearing.
                          const isSelected = Math.abs(frequency - opt.hz) < 1;
                          return (
                            <div key={opt.hz} className="space-y-2">
                              <button
                                onClick={async () => {
                                  // Preview only — do not commit to frequency yet.
                                  const eng = getEngine();
                                  await eng.start('pitch', { frequency: opt.hz, levelDb, pan });
                                  setPlayingMode('pitch');
                                }}
                                className={`w-full p-4 rounded-xl border text-left transition-all ${
                                  isSelected
                                    ? 'border-navy-700 bg-navy-50 dark:bg-navy-950/60 ring-2 ring-navy-700/20'
                                    : 'border-slate-200 dark:border-ink-800 bg-white dark:bg-ink-900 hover:border-navy-300'
                                }`}
                              >
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                                  {opt.label}
                                </span>
                                <span className="font-mono font-bold text-lg text-navy-800 dark:text-navy-200 block">
                                  {opt.hz} Hz
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  {hi ? 'सुनने के लिए दबाएं' : 'Tap to preview'}
                                </span>
                              </button>
                              {/* Explicit commit — only this button sets the therapy frequency */}
                              <button
                                onClick={() => {
                                  stopAll();
                                  setFrequency(opt.hz);
                                  setSetupStep('level');
                                }}
                                className="w-full py-1.5 rounded-lg text-xs font-bold border border-navy-300 bg-navy-50 dark:bg-navy-900 dark:border-navy-700 text-navy-700 dark:text-navy-200 hover:bg-navy-100 dark:hover:bg-navy-800 transition-colors"
                              >
                                {hi ? 'यह मेल खाता है ✓' : 'This matches ✓'}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}

                  <div className="flex gap-3">
                    <button onClick={togglePitchTone} className="btn-outline flex-1 inline-flex items-center justify-center gap-2">
                      {playingMode === 'pitch' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
                      {playingMode === 'pitch' ? (hi ? 'रोकें' : 'Stop') : (hi ? 'सुनें' : 'Listen')}
                    </button>
                  </div>
                </div>
              )}

              {setupStep === 'level' && (
                <div className="space-y-5">
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    {hi
                      ? 'टोन चलाकर तीव्रता को सबसे कम से धीरे-धीरे तब तक बढ़ाएं जब तक यह आपकी टिनिटस जितनी तेज़ न लगे — फिर उससे थोड़ा कम कर दें। यही आपका आरामदायक थेरेपी स्तर है।'
                      : 'With the tone playing, raise the level slowly from the bottom until it is just as loud as your tinnitus — then bring it back down slightly. That is your comfortable therapy level.'}
                  </p>
                  <RangeRow
                    label={hi ? 'आरामदायक तीव्रता' : 'Comfortable level'}
                    readout={`${levelDb} dB`}
                    min={AUDIO_LIMITS.MIN_LEVEL_DB}
                    max={AUDIO_LIMITS.MAX_LEVEL_DB}
                    value={levelDb}
                    onChange={setLevelDb}
                    hint={hi ? 'सापेक्ष पैमाना — वास्तविक ध्वनि स्तर आपके हेडफोन और डिवाइस वॉल्यूम पर निर्भर करता है।' : 'Relative scale — real loudness depends on your headphones and device volume.'}
                  />
                  <RangeRow
                    label={hi ? 'संतुलन (बायाँ / दायाँ)' : 'Balance (left / right)'}
                    readout={pan === 0 ? (hi ? 'मध्य' : 'Centre') : pan < 0 ? `L ${Math.round(-pan * 100)}%` : `R ${Math.round(pan * 100)}%`}
                    min={-100}
                    max={100}
                    value={Math.round(pan * 100)}
                    onChange={(v) => setPan(v / 100)}
                    hint={hi ? 'एकतरफा टिनिटस के लिए प्रभावित कान की ओर झुकाएं।' : 'For one-sided tinnitus, shift towards the affected ear.'}
                  />
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button onClick={togglePitchTone} className="btn-outline flex-1 inline-flex items-center justify-center gap-2">
                      {playingMode === 'pitch' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
                      {playingMode === 'pitch' ? (hi ? 'रोकें' : 'Stop') : (hi ? 'सुनें' : 'Listen')}
                    </button>
                    <button onClick={finishSelfMatch} className="btn-navy flex-1 inline-flex items-center justify-center gap-2">
                      <CheckCircle2 className="w-4 h-4" />
                      {hi ? 'सहेजें और थेरेपी शुरू करें' : 'Save and start therapy'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Setup sidebar */}
          <div className="space-y-4">
            <div className="bg-gradient-to-b from-navy-900 to-navy-950 text-white rounded-xl p-6 shadow-md space-y-4">
              <span className="text-[11px] font-extrabold uppercase tracking-widest text-navy-300">
                {hi ? 'वर्तमान सेटिंग' : 'Current setting'}
              </span>
              <div>
                <span className="text-4xl font-black font-mono tracking-tight">{frequency}</span>
                <span className="text-sm font-bold text-navy-300 ml-1">Hz</span>
              </div>
              <div className="text-xs text-navy-200 space-y-1 font-mono">
                <div>{hi ? 'स्तर' : 'Level'}: {levelDb} dB</div>
                <div>{hi ? 'संतुलन' : 'Pan'}: {pan.toFixed(2)}</div>
              </div>
              <div className="pt-3 border-t border-white/10 space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-navy-300 block">
                  {hi ? 'ACRN उपचार टोन' : 'ACRN treatment tones'}
                </span>
                {acrnTones.map((f, i) => (
                  <div key={f} className="flex items-center justify-between text-xs font-mono">
                    <span className="text-navy-400">f{i + 1}</span>
                    <span className="font-bold">{f} Hz</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/40 p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
                <strong className="font-bold block mb-0.5">{hi ? 'सुरक्षा' : 'Safety'}</strong>
                {hi
                  ? 'यह एक नैदानिक ऑडियोमीटर नहीं है। कभी भी असहज या दर्दनाक स्तर तक न बढ़ाएं। यदि आवाज़ से कान में दर्द हो (हाइपरएक्यूसिस), तुरंत रोकें और ऑडियोलॉजी से संपर्क करें।'
                  : 'This is not a diagnostic audiometer. Never raise the level to anything uncomfortable or painful. If sound causes ear pain (hyperacusis), stop and contact Audiology.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------- THERAPY */}
      {activeTab === 'therapy' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="card p-6 space-y-5">
              <h2 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Waves className="w-5 h-5 text-navy-700 dark:text-navy-300" />
                {hi ? 'थेरेपी चुनें' : 'Choose your therapy'}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {([
                  { id: 'TONE' as RxEngine, name: hi ? 'एकल शुद्ध टोन' : 'Pure Tone Masker', desc: hi ? 'आपकी सटीक टिनिटस आवृत्ति पर निरंतर एकल टोन' : 'Continuous single tone matching your exact tinnitus pitch' },
                  { id: 'ACRN' as RxEngine, name: hi ? 'ACRN 4-टोन' : 'ACRN 4-tone', desc: hi ? 'आपकी पिच के चारों ओर चार टोन' : 'Four tones bracketing your pitch' },
                  { id: 'NOTCH' as RxEngine, name: hi ? 'नॉच्ड शोर' : 'Notched noise', desc: hi ? 'आपकी आवृत्ति पर कटा हुआ शोर' : 'Noise with your frequency filtered out' },
                  { id: 'BROAD' as RxEngine, name: hi ? 'ब्रॉडबैंड मास्कर' : 'Broadband masker', desc: hi ? 'सादा शोर जो टिनिटस को ढकता है' : 'Plain noise that covers the tinnitus' },
                  { id: 'BINAURAL' as RxEngine, name: hi ? 'बायनौरल बीट्स (नींद)' : 'Binaural Beats (Sleep & Relaxation)', desc: hi ? 'नींद और आराम के लिए कम-आवृत्ति ध्वनि — ACRN/नॉच से अलग साक्ष्य आधार' : 'Low-frequency tones for sleep & relaxation — distinct evidence base from ACRN/Notch therapy' },
                  { id: 'SOUNDSCAPE' as RxEngine, name: hi ? 'प्राकृतिक ध्वनियां' : 'Natural Soundscapes', desc: hi ? 'समुद्र की लहरें, बारिश व झरने का मास्क' : 'Ocean waves, rainfall & stream soundscapes' },
                ]).map((option) => {
                  const active = engineChoice === option.id;
                  return (
                    <button
                      key={option.id}
                      onClick={() => { stopAll(); setEngineChoice(option.id); }}
                      className={`p-4 rounded-xl border text-left transition-all space-y-1.5 ${
                        active
                          ? 'bg-navy-900 text-white border-navy-900 shadow-md ring-2 ring-navy-900/20'
                          : 'bg-white dark:bg-ink-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-ink-800 hover:border-navy-300'
                      }`}
                    >
                      <span className="font-bold text-sm block">{option.name}</span>
                      <span className={`text-[11px] leading-relaxed block ${active ? 'text-navy-200' : 'text-slate-500 dark:text-slate-400'}`}>
                        {option.desc}
                      </span>
                    </button>
                  );
                })}
              </div>

              {(engineChoice as string) === 'TONE' && (
                <div className="rounded-xl bg-slate-50 dark:bg-ink-950 border border-slate-200 dark:border-ink-800 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                      {hi ? 'सक्रिय शुद्ध टोन आवृत्ति' : 'Active Pure Tone Frequency'}
                    </span>
                    <span className="font-mono text-sm font-bold text-navy-700 dark:text-navy-300">
                      {frequency} Hz
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    {hi
                      ? 'निरंतर शुद्ध टोन आपकी सटीक टिनिटस आवृत्ति पर बजता है। वॉल्यूम लेवल को ऐसा रखें कि वह आपकी टिनिटस आवाज़ के ठीक नीचे रहे।'
                      : 'Plays a continuous pure tone at your matched pitch. Adjust the level slider below so it stays just below your tinnitus pitch.'}
                  </p>
                </div>
              )}

              {engineChoice === 'ACRN' && (
                <div className="rounded-xl bg-slate-50 dark:bg-ink-950 border border-slate-200 dark:border-ink-800 p-4 space-y-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                    {hi ? 'उपचार टोन (आपकी पिच से गणना)' : 'Treatment tones (derived from your pitch)'}
                  </span>
                  <div className="grid grid-cols-4 gap-2">
                    {acrnTones.map((f, i) => {
                      const sounding = cycleTones.includes(f) && isTherapyPlaying;
                      return (
                        <div
                          key={f}
                          className={`rounded-lg border p-2 text-center transition-colors ${
                            sounding
                              ? 'bg-navy-700 text-white border-navy-700'
                              : 'bg-white dark:bg-ink-900 border-slate-200 dark:border-ink-800'
                          }`}
                        >
                          <span className="text-[10px] font-bold opacity-60 block">f{i + 1}</span>
                          <span className="font-mono font-bold text-xs">{f}</span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                    <RangeRow
                      label={hi ? 'चक्र (चालू)' : 'Cycles on'}
                      readout={`${loopRepeat}`}
                      min={ACRN_LIMITS.MIN_LOOP_REPEAT}
                      max={ACRN_LIMITS.MAX_LOOP_REPEAT}
                      value={loopRepeat}
                      onChange={setLoopRepeat}
                    />
                    <RangeRow
                      label={hi ? 'विश्राम स्लॉट' : 'Rest slots'}
                      readout={`${restLength}`}
                      min={ACRN_LIMITS.MIN_REST_LENGTH}
                      max={32}
                      value={restLength}
                      onChange={setRestLength}
                    />
                  </div>
                  <div className="pt-2 border-t border-slate-200 dark:border-ink-800 space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                      {hi ? 'पृष्ठभूमि शोर मास्कर (वैकल्पिक)' : 'Background Noise Masker (Optional)'}
                    </span>
                    <div className="grid grid-cols-4 gap-2">
                      {([
                        { id: 'none', label: hi ? 'कोई नहीं' : 'None' },
                        { id: 'white', label: hi ? 'सफेद' : 'White' },
                        { id: 'pink', label: hi ? 'गुलाबी' : 'Pink' },
                        { id: 'brown', label: hi ? 'भूरा' : 'Brown' },
                      ] as { id: NoiseColor | 'none'; label: string }[]).map((option) => (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => {
                            stopAll();
                            setBgNoiseColor(option.id);
                          }}
                          className={`py-1.5 rounded-lg text-xs font-bold border transition-all ${
                            bgNoiseColor === option.id
                              ? 'bg-navy-700 text-white border-navy-700'
                              : 'bg-white dark:bg-ink-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-ink-800 hover:border-navy-300'
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {engineChoice === 'BINAURAL' && (
                <div className="rounded-xl bg-slate-50 dark:bg-ink-950 border border-slate-200 dark:border-ink-800 p-4 space-y-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                    {hi ? 'बायनौरल एंट्रेनमेंट वेव' : 'Binaural Entrainment Wave'}
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {(Object.entries(BINAURAL_PRESETS) as [BinauralPreset, typeof BINAURAL_PRESETS.alpha][]).map(([key, config]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => { stopAll(); setBinauralPreset(key); }}
                        className={`p-3 rounded-lg border text-left transition-all space-y-1 ${
                          binauralPreset === key
                            ? 'bg-navy-700 text-white border-navy-700'
                            : 'bg-white dark:bg-ink-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-ink-800 hover:border-navy-300'
                        }`}
                      >
                        <div className="font-bold text-xs">{hi ? config.nameHi : config.name}</div>
                        <div className="text-[10px] opacity-80 leading-relaxed">{hi ? config.descHi : config.desc}</div>
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    {hi
                      ? 'नोट: बायनौरल बीट्स केवल स्टीरियो हेडफोन पर ही सही काम करते हैं।'
                      : 'Note: Binaural beats require stereo headphones for phase entrainment.'}
                  </p>
                </div>
              )}

              {engineChoice === 'SOUNDSCAPE' && (
                <div className="rounded-xl bg-slate-50 dark:bg-ink-950 border border-slate-200 dark:border-ink-800 p-4 space-y-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                    {hi ? 'प्राकृतिक माहौल' : 'Natural Ambient Soundscape'}
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    {([
                      { id: 'ocean' as SoundscapePreset, label: hi ? 'समुद्र की लहरें' : 'Ocean Waves', desc: hi ? '10-सेकंड चक्र स्वाइल' : '10s swell cycles' },
                      { id: 'rain' as SoundscapePreset, label: hi ? 'हल्की बारिश' : 'Rainfall', desc: hi ? 'निरंतर हल्की बूंदें' : 'Steady raindrops' },
                      { id: 'stream' as SoundscapePreset, label: hi ? 'पहाड़ी झरना' : 'Forest Stream', desc: hi ? 'बहते पानी का स्वर' : 'Babbling brook' },
                    ]).map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => { stopAll(); setSoundscape(option.id); }}
                        className={`p-3 rounded-lg text-left border transition-all space-y-1 ${
                          soundscape === option.id
                            ? 'bg-navy-700 text-white border-navy-700'
                            : 'bg-white dark:bg-ink-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-ink-800 hover:border-navy-300'
                        }`}
                      >
                        <div className="font-bold text-xs">{option.label}</div>
                        <div className="text-[10px] opacity-75">{option.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {(engineChoice === 'NOTCH' || engineChoice === 'BROAD') && (
                <div className="rounded-xl bg-slate-50 dark:bg-ink-950 border border-slate-200 dark:border-ink-800 p-4 space-y-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                    {hi ? 'शोर का रंग' : 'Noise colour'}
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    {([
                      { id: 'white' as NoiseColor, label: hi ? 'सफेद' : 'White' },
                      { id: 'pink' as NoiseColor, label: hi ? 'गुलाबी' : 'Pink' },
                      { id: 'brown' as NoiseColor, label: hi ? 'भूरा' : 'Brown' },
                    ]).map((option) => (
                      <button
                        key={option.id}
                        onClick={() => setNoiseColor(option.id)}
                        className={`py-2 rounded-lg text-xs font-bold border transition-all ${
                          noiseColor === option.id
                            ? 'bg-navy-700 text-white border-navy-700'
                            : 'bg-white dark:bg-ink-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-ink-800 hover:border-navy-300'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                  {engineChoice === 'NOTCH' && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                      {hi
                        ? `शोर से ${frequency} Hz के आसपास का बैंड हटा दिया गया है।`
                        : `The band around ${frequency} Hz is filtered out of the noise.`}
                    </p>
                  )}
                </div>
              )}

              {/* Graphic Equalizer Panel — cut-only for clinical safety.
                  Boosting 6-12 kHz at this level and duration (4-6 h/day) in noise-exposed
                  and presbycusic patients is hearing-aid prescription logic applied to
                  uncalibrated hardware — clinically inadvisable. Cut-only is safe. */}
              <div className="rounded-xl bg-slate-50 dark:bg-ink-950 border border-slate-200 dark:border-ink-800 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                    {hi ? '6-बैंड इक्वेलाइज़र (आराम शेपिंग — केवल कट)' : '6-Band EQ — Comfort Shaping (Cut Only)'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setEqGainsState([...DEFAULT_EQ_GAINS])}
                    className="text-[10px] font-bold text-navy-700 dark:text-navy-300 hover:underline"
                  >
                    {hi ? 'रीसेट करें' : 'Reset EQ'}
                  </button>
                </div>
                <div className="grid grid-cols-6 gap-2 pt-1">
                  {EQ_FREQUENCIES.map((freqHz, index) => (
                    <div key={freqHz} className="flex flex-col items-center space-y-1.5">
                      <span className="text-[10px] font-mono font-bold text-slate-600 dark:text-slate-300">
                        {eqGains[index]} dB
                      </span>
                      <input
                        type="range"
                        min={-12}
                        max={0}
                        step={1}
                        value={eqGains[index]}
                        onChange={(e) => {
                          const next = [...eqGains] as EqGains;
                          next[index] = Number(e.target.value);
                          setEqGainsState(next);
                        }}
                        className="w-full h-24 accent-navy-700 cursor-pointer text-center [writing-mode:vertical-lr] [direction:rtl]"
                        aria-label={`${freqHz >= 1000 ? `${freqHz / 1000}k` : freqHz} Hz EQ cut`}
                      />
                      <span className="text-[10px] font-mono font-bold text-slate-400">
                        {freqHz >= 1000 ? `${freqHz / 1000}k` : freqHz}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed pt-1">
                  {hi
                    ? 'कठोर या असुविधाजनक आवृत्तियों को कम करें। इस EQ को केवल काटने (cut) के लिए डिज़ाइन किया गया है — बढ़ाने (boost) की सुविधा जानबूझकर उपलब्ध नहीं है।'
                    : 'Reduce bands that sound harsh or uncomfortable. This EQ is cut-only by design — boosting is intentionally unavailable as uncalibrated gain at 6–12 kHz for hours a day is not clinically appropriate.'}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-1">
                <RangeRow
                  label={hi ? 'तीव्रता' : 'Level'}
                  readout={`${levelDb} dB`}
                  min={AUDIO_LIMITS.MIN_LEVEL_DB}
                  max={AUDIO_LIMITS.MAX_LEVEL_DB}
                  value={levelDb}
                  onChange={setLevelDb}
                  hint={hi ? 'टिनिटस से थोड़ा नीचे रखें — ढकें नहीं, मिलाएं।' : 'Keep it just below your tinnitus — blend, do not drown.'}
                />
                <RangeRow
                  label={hi ? 'संतुलन' : 'Balance'}
                  readout={pan === 0 ? (hi ? 'मध्य' : 'Centre') : pan < 0 ? `L ${Math.round(-pan * 100)}%` : `R ${Math.round(pan * 100)}%`}
                  min={-100}
                  max={100}
                  value={Math.round(pan * 100)}
                  onChange={(v) => setPan(v / 100)}
                />
              </div>

              <div className="rounded-xl bg-navy-50 dark:bg-ink-950 border border-navy-100 dark:border-ink-800 p-4 flex items-start gap-3">
                <Ear className="w-4 h-4 text-navy-700 dark:text-navy-300 shrink-0 mt-0.5" />
                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                  {hi
                    ? 'पिच बदलनी है? सेटअप टैब पर लौटें।'
                    : 'Need to change the pitch? Go back to the Setup tab.'}{' '}
                  <button onClick={() => { stopAll(); setActiveTab('setup'); setSetupStep('pitch'); }} className="font-bold underline underline-offset-2">
                    {hi ? 'पिच मिलान खोलें' : 'Open pitch match'}
                  </button>
                </p>
              </div>
            </div>
          </div>

          {/* Transport */}
          <div className="space-y-4">
            <div className="bg-gradient-to-b from-navy-900 to-navy-950 text-white rounded-xl p-6 shadow-md flex flex-col items-center space-y-6">
              <div className="w-full text-center space-y-1">
                <span className="text-[11px] font-extrabold uppercase tracking-widest text-navy-300">
                  {hi ? 'सत्र टाइमर' : 'Session timer'}
                </span>
                <h3 className="font-bold text-sm text-slate-200">
                  {engineChoice === 'ACRN'
                    ? 'ACRN'
                    : engineChoice === 'NOTCH'
                    ? (hi ? 'नॉच्ड शोर' : 'Notched noise')
                    : engineChoice === 'BROAD'
                    ? (hi ? 'ब्रॉडबैंड' : 'Broadband')
                    : engineChoice === 'BINAURAL'
                    ? (hi ? 'बायनौरल बीट्स' : 'Binaural Beats')
                    : (hi ? 'प्राकृतिक ध्वनियां' : 'Natural Soundscape')}
                  {/* Only show fT for modes where it is clinically relevant */}
                  {(engineChoice === 'ACRN' || engineChoice === 'NOTCH' || engineChoice === 'BROAD') && ` · ${frequency} Hz`}
                </h3>
              </div>

              <div className={`relative w-40 h-40 rounded-full border-4 flex items-center justify-center bg-navy-900/80 shadow-inner transition-colors ${
                isTherapyPlaying ? 'border-navy-400/60' : 'border-white/10'
              }`}>
                <div className="text-center space-y-0.5">
                  <span className="text-4xl font-black tracking-tight font-mono">{formatClock(Math.max(0, remainingSeconds))}</span>
                  <span className="text-[10px] text-navy-300 block font-bold uppercase tracking-wider">
                    {hi ? 'शेष' : 'Remaining'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2 w-full">
                {SESSION_PRESETS.map((minutes) => (
                  <button
                    key={minutes}
                    onClick={() => { setSessionMinutes(minutes); setRemainingSeconds(minutes * 60); }}
                    className={`py-2 rounded-lg text-[11px] font-bold border transition-all ${
                      sessionMinutes === minutes
                        ? 'bg-white/15 text-white border-white/30'
                        : 'border-white/10 text-navy-300 hover:bg-white/5'
                    }`}
                  >
                    {minutes}m
                  </button>
                ))}
              </div>

              <div className="w-full space-y-3">
                <button
                  onClick={toggleTherapy}
                  className={`w-full py-3.5 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-md ${
                    isTherapyPlaying
                      ? 'bg-amber-500 hover:bg-amber-600 text-navy-950'
                      : 'bg-white hover:bg-navy-50 text-navy-900 font-extrabold'
                  }`}
                >
                  {isTherapyPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 fill-current" />}
                  {isTherapyPlaying ? (hi ? 'रोकें' : 'Pause') : (hi ? 'थेरेपी शुरू करें' : 'Start therapy')}
                </button>
                <button
                  onClick={() => { stopAll(); setRemainingSeconds(sessionMinutes * 60); }}
                  className="w-full py-2.5 px-4 rounded-xl border border-white/15 hover:bg-white/5 text-navy-200 text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                  {hi ? 'टाइमर रीसेट' : 'Reset timer'}
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-ink-800 bg-white dark:bg-ink-900 p-4 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Timer className="w-3.5 h-3.5" />
                {hi ? 'इस सप्ताह' : 'This week'}
              </span>
              <span className="text-2xl font-black font-mono text-navy-800 dark:text-navy-200">
                {Math.floor(weeklyMinutes / 60)}h {weeklyMinutes % 60}m
              </span>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                {hi ? 'लक्ष्य: प्रतिदिन 4–6 घंटे, कई महीनों तक।' : 'Target: 4–6 hours a day, sustained over months.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------ TRACK */}
      {activeTab === 'track' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="card p-6">
              <TinnitusThiInventory onSaved={(result) => setThiHistory((prev) => [result, ...prev])} />
            </div>
          </div>

          <div className="space-y-4">
            <div className="card p-5 space-y-4">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Save className="w-4 h-4 text-navy-700 dark:text-navy-300" />
                {hi ? 'यह सत्र दर्ज करें' : 'Log this session'}
              </h3>
              <RangeRow
                label={hi ? 'पहले टिनिटस की तेज़ी' : 'Tinnitus loudness before'}
                readout={`${loudnessBefore}/10`}
                min={0}
                max={10}
                value={loudnessBefore}
                onChange={setLoudnessBefore}
              />
              <RangeRow
                label={hi ? 'बाद में टिनिटस की तेज़ी' : 'Tinnitus loudness after'}
                readout={`${loudnessAfter}/10`}
                min={0}
                max={10}
                value={loudnessAfter}
                onChange={setLoudnessAfter}
                accent="accent-emerald-600"
              />
              <button onClick={handleSaveSession} className="btn-navy w-full inline-flex items-center justify-center gap-2">
                {sessionSaved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                {sessionSaved ? (hi ? 'सहेजा गया' : 'Saved') : (hi ? 'सत्र सहेजें' : 'Save session')}
              </button>
            </div>

            <div className="card p-5 space-y-3">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">{hi ? 'हाल के सत्र' : 'Recent sessions'}</h3>
              {sessions.length === 0 ? (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {hi ? 'अभी तक कोई सत्र दर्ज नहीं।' : 'No sessions logged yet.'}
                </p>
              ) : (
                <div className="space-y-2.5 max-h-72 overflow-y-auto thin-scroll pr-1">
                  {sessions.slice(0, 12).map((session) => (
                    <div key={session.id} className="rounded-lg border border-slate-200 dark:border-ink-800 p-3 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-700 dark:text-slate-300">{session.date}</span>
                        <span className="font-mono text-slate-500">{session.engine} · {session.minutes}m</span>
                      </div>
                      <div className="h-2 bg-slate-100 dark:bg-ink-950 rounded-full overflow-hidden">
                        <div
                          className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.max(0, ((session.loudnessBefore - session.loudnessAfter) / 10) * 100)}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {session.loudnessBefore} → {session.loudnessAfter} / 10 · {session.fT} Hz
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {thiHistory.length > 0 && (
              <div className="card p-5 space-y-3">
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">{hi ? 'THI रुझान' : 'THI trend'}</h3>
                <div className="space-y-2">
                  {thiHistory.slice(0, 8).map((entry) => (
                    <div key={entry.id} className="space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-500 font-mono">{entry.date}</span>
                        <span className="font-bold text-navy-800 dark:text-navy-200">{entry.score}/100 · G{entry.grade}</span>
                      </div>
                      <div className="h-2 bg-slate-100 dark:bg-ink-950 rounded-full overflow-hidden">
                        <div className="bg-navy-700 h-full rounded-full transition-all duration-500" style={{ width: `${entry.score}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------ LEARN */}
      {activeTab === 'learn' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="card p-6 space-y-4">
              <h2 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-navy-700 dark:text-navy-300" />
                {hi ? 'आपकी थेरेपी को समझें' : 'Understanding your therapy'}
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                {hi
                  ? 'टिनिटस में श्रवण कॉर्टेक्स की तंत्रिका कोशिकाओं का एक समूह असामान्य रूप से एक साथ (सिंक्रोनस) सक्रिय हो जाता है। ACRN आपकी टिनिटस आवृत्ति के चारों ओर चार धीमी टोन बजाता है — दो नीचे, दो ऊपर — और हर चक्र में उनका क्रम बदल देता है। यह बेतरतीब क्रम उन कोशिकाओं को अलग-अलग उपसमूहों में बांटकर उनकी समकालिक सक्रियता को तोड़ता है।'
                  : 'In tinnitus, a patch of neurons in the auditory cortex fires abnormally in synchrony. ACRN plays four quiet tones bracketing your tinnitus frequency — two below, two above — and randomises their order every cycle. That randomised sequence breaks the neurons into separate subgroups and desynchronises the firing.'}
              </p>
            </div>

            <div className="card p-6 space-y-3">
              <h2 className="font-bold text-slate-900 dark:text-white">{hi ? 'इसका उपयोग कैसे करें' : 'How to use it'}</h2>
              <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-2.5 leading-relaxed">
                {(hi
                  ? [
                      'रोज़ 4–6 घंटे सुनें — इसे पढ़ते, काम करते या आराम करते समय पृष्ठभूमि में चलाया जा सकता है।',
                      'लाभ हफ्तों से महीनों में आता है, दिनों में नहीं। धैर्य रखें।',
                      'तीव्रता ऐसी रखें कि टिनिटस पूरी तरह न ढके — दोनों एक साथ सुनाई देने चाहिए।',
                      'हर 2 सप्ताह में THI-25 दोबारा भरें और स्कोर अपने ऑडियोलॉजिस्ट को दिखाएं।',
                      'ओवर-ईयर या इन-ईयर हेडफोन का उपयोग करें; स्पीकर से पैनिंग काम नहीं करेगी।',
                    ]
                  : [
                      'Listen 4–6 hours a day — it can run in the background while you read, work or rest.',
                      'Benefit builds over weeks to months, not days. Give it time.',
                      'Set the level so it does not completely cover the tinnitus — you should hear both together.',
                      'Repeat the THI-25 every 2 weeks and show the scores to your audiologist.',
                      'Use over-ear or in-ear headphones; panning will not work through speakers.',
                    ]
                ).map((line) => (
                  <li key={line} className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/40 p-5 space-y-2">
              <h3 className="font-bold text-sm text-amber-950 dark:text-amber-200 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                {hi ? 'महत्वपूर्ण सीमाएं' : 'Important limits'}
              </h3>
              <p className="text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
                {hi
                  ? 'यह ऐप एक नैदानिक ऑडियोमीटर नहीं है और इसका आउटपुट कैलिब्रेटेड नहीं है — असली ध्वनि स्तर आपके हेडफोन और डिवाइस वॉल्यूम पर निर्भर करता है। यह ऑडियोलॉजिकल जांच, PTA या चिकित्सकीय सलाह का विकल्प नहीं है। यदि आवाज़ से दर्द हो, तुरंत रोकें।'
                  : 'This app is not a diagnostic audiometer and its output is uncalibrated — real ear level depends on your headphones and device volume. It does not replace an audiological assessment, PTA, or clinical advice. Stop immediately if sound causes pain.'}
              </p>
            </div>

            <Link href="/guides" className="card p-5 block hover:border-navy-300 transition-colors space-y-2">
              <BookOpenText className="w-5 h-5 text-navy-700 dark:text-navy-300" />
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                {hi ? 'टिनिटस क्लिनिकल गाइड पढ़ें' : 'Read the Tinnitus clinical guide'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                {hi ? 'कारण, जांच, TRT और नींद प्रबंधन का विस्तृत विवरण।' : 'Causes, evaluation, TRT and sleep management in detail.'}
              </p>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};
