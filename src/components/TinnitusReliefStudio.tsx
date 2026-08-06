'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  type NoiseColor, type EngineMode,
} from '@/lib/tinnitus-audio';
import {
  decodeRx, encodeRx, loadRx, saveRx, loadSessions, saveSession, loadThiHistory, totalMinutes,
  type TinnitusRx, type TinnitusSession, type ThiResult, type RxEngine,
} from '@/lib/tinnitus-rx';

type TabId = 'setup' | 'therapy' | 'track' | 'learn';
type SetupStep = 'headphones' | 'pitch' | 'octave' | 'level';

const OCTAVE_ANCHORS = [250, 500, 1000, 2000, 4000, 6000, 8000, 10000, 12000];
const SESSION_PRESETS = [15, 30, 60, 120];

const ENGINE_TO_MODE: Record<RxEngine, Exclude<EngineMode, 'idle' | 'pitch'>> = {
  ACRN: 'acrn',
  NOTCH: 'notched',
  BROAD: 'broadband',
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
}> = ({ label, readout, min, max, step = 1, value, onChange, hint, accent = 'accent-navy-700' }) => (
  <div className="space-y-2">
    <div className="flex items-center justify-between gap-3">
      <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</label>
      <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-navy-50 text-navy-700 border border-navy-200 dark:bg-ink-900 dark:text-navy-200 dark:border-ink-700">
        {readout}
      </span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className={`w-full h-2 rounded-lg bg-slate-200 dark:bg-ink-800 cursor-pointer ${accent}`}
    />
    {hint && <p className="text-[11px] text-slate-400 leading-relaxed">{hint}</p>}
  </div>
);

export const TinnitusReliefStudio: React.FC = () => {
  const { locale } = useAppData();
  const hi = locale === 'hi';

  const [activeTab, setActiveTab] = useState<TabId>('setup');
  const [setupStep, setSetupStep] = useState<SetupStep>('headphones');

  const [frequency, setFrequency] = useState(8000);
  const [levelDb, setLevelDb] = useState(AUDIO_LIMITS.DEFAULT_LEVEL_DB);
  const [pan, setPan] = useState(0);
  const [noiseColor, setNoiseColor] = useState<NoiseColor>('pink');
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
    };
  }, [stopAll]);

  // Live parameter updates while sound is playing.
  useEffect(() => { engineRef.current?.setFrequency(frequency); }, [frequency]);
  useEffect(() => { engineRef.current?.setLevelDb(levelDb); }, [levelDb]);
  useEffect(() => { engineRef.current?.setPan(pan); }, [pan]);
  useEffect(() => { engineRef.current?.setNoiseColor(noiseColor); }, [noiseColor]);
  useEffect(() => { engineRef.current?.setAcrnOptions({ loopRepeat, restLength }); }, [loopRepeat, restLength]);

  // Session countdown — announces completion the way the other rehab timers do.
  const isTherapyPlaying = playingMode !== 'idle' && playingMode !== 'pitch';
  useEffect(() => {
    if (!isTherapyPlaying) return;
    if (remainingSeconds <= 0) {
      stopAll();
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        const msg = new SpeechSynthesisUtterance(
          hi ? 'साउंड थेरेपी सत्र पूरा हुआ' : 'Sound therapy session complete'
        );
        msg.lang = hi ? 'hi-IN' : 'en-US';
        window.speechSynthesis.speak(msg);
      }
      return;
    }
    const id = setInterval(() => setRemainingSeconds((prev) => prev - 1), 1000);
    return () => clearInterval(id);
  }, [isTherapyPlaying, remainingSeconds, hi, stopAll]);

  const play = async (mode: Exclude<EngineMode, 'idle'>) => {
    const engine = getEngine();
    await engine.start(mode, {
      frequency,
      levelDb,
      pan,
      noiseColor,
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
    if (remainingSeconds <= 0) setRemainingSeconds(sessionMinutes * 60);
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
    const minutesRun = Math.max(1, Math.round((sessionMinutes * 60 - remainingSeconds) / 60));
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
    setTimeout(() => setSessionSaved(false), 2500);
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
              ? 'अपनी टिनिटस की आवृत्ति खोजें या ऑडियोलॉजिस्ट द्वारा दिया गया कोड डालें, फिर अपने हेडफोन पर आरामदायक तीव्रता पर ACRN, नॉच्ड या ब्रॉडबैंड साउंड थेरेपी चलाएं।'
              : 'Find your tinnitus pitch or load the code your audiologist gave you, then play ACRN, notched, or broadband sound therapy through your own headphones at a level you set yourself.'}
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {tabs.map((tab) => {
          const active = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
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
            {/* Prescription code */}
            <div className="card p-6 space-y-4">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-navy-700 dark:text-navy-300" />
                <h2 className="font-bold text-slate-900 dark:text-white">
                  {hi ? 'ऑडियोलॉजिस्ट का प्रिस्क्रिप्शन कोड' : 'Audiologist prescription code'}
                </h2>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                {hi
                  ? 'यदि ऑडियोलॉजी लैब ने पिच-मैचिंग के बाद आपको एक कोड दिया है, तो उसे यहाँ डालें। इससे आवृत्ति, स्तर और प्रोटोकॉल स्वतः सेट हो जाएंगे।'
                  : 'If the Audiology lab gave you a code after pitch-matching, enter it here. It sets your frequency, level and protocol in one step.'}
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  value={rxCode}
                  onChange={(e) => { setRxCode(e.target.value); setRxError(''); }}
                  placeholder="RX-8000-45-ACRN-3x8"
                  className="input-field font-mono uppercase flex-1"
                  aria-label={hi ? 'प्रिस्क्रिप्शन कोड' : 'Prescription code'}
                />
                <button onClick={applyRxCode} disabled={!rxCode.trim()} className="btn-navy disabled:opacity-50 whitespace-nowrap">
                  {hi ? 'कोड लागू करें' : 'Apply code'}
                </button>
              </div>
              {rxError && <p className="text-xs font-semibold text-red-600 dark:text-red-400">{rxError}</p>}
            </div>

            {/* Guided self match */}
            <div className="card p-6 space-y-5">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <Ear className="w-5 h-5 text-navy-700 dark:text-navy-300" />
                  <h2 className="font-bold text-slate-900 dark:text-white">
                    {hi ? 'या स्वयं अपनी टिनिटस पिच खोजें' : 'Or find your tinnitus pitch yourself'}
                  </h2>
                </div>
                <div className="flex gap-1.5">
                  {(['headphones', 'pitch', 'octave', 'level'] as SetupStep[]).map((step, i) => (
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

                  <div className="flex flex-col sm:flex-row gap-3">
                    <button onClick={togglePitchTone} className="btn-navy flex-1 inline-flex items-center justify-center gap-2">
                      {playingMode === 'pitch' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
                      {playingMode === 'pitch' ? (hi ? 'टोन रोकें' : 'Stop tone') : (hi ? 'टोन चलाएं' : 'Play tone')}
                    </button>
                    <button onClick={() => setSetupStep('octave')} className="btn-outline flex-1">
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
                        ? 'ऑक्टेव भ्रम की जांच: लोग अक्सर असली पिच से एक ऑक्टेव ऊपर या नीचे चुन लेते हैं। नीचे दोनों टोन सुनें और जो बेहतर मेल खाए उसे चुनें।'
                        : 'Octave confusion check: people often pick a tone one octave above or below their true pitch. Listen to both and keep whichever matches better.'}
                    </p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button onClick={() => previewFrequency(frequency)} className="p-4 rounded-xl border border-slate-200 dark:border-ink-800 bg-white dark:bg-ink-900 text-left hover:border-navy-300 transition-all">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">{hi ? 'विकल्प A' : 'Option A'}</span>
                      <span className="font-mono font-bold text-lg text-navy-800 dark:text-navy-200">{frequency} Hz</span>
                    </button>
                    <button onClick={() => previewFrequency(Math.round(frequency / 2))} className="p-4 rounded-xl border border-slate-200 dark:border-ink-800 bg-white dark:bg-ink-900 text-left hover:border-navy-300 transition-all">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">{hi ? 'विकल्प B (एक ऑक्टेव नीचे)' : 'Option B (one octave down)'}</span>
                      <span className="font-mono font-bold text-lg text-navy-800 dark:text-navy-200">{Math.round(frequency / 2)} Hz</span>
                    </button>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button onClick={togglePitchTone} className="btn-outline flex-1 inline-flex items-center justify-center gap-2">
                      {playingMode === 'pitch' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
                      {playingMode === 'pitch' ? (hi ? 'रोकें' : 'Stop') : (hi ? 'सुनें' : 'Listen')}
                    </button>
                    <button onClick={() => setSetupStep('level')} className="btn-navy flex-1">
                      {hi ? 'पिच तय — तीव्रता सेट करें' : 'Pitch confirmed — set level'}
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
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {([
                  { id: 'ACRN' as RxEngine, name: hi ? 'ACRN 4-टोन' : 'ACRN 4-tone', desc: hi ? 'आपकी पिच के चारों ओर चार टोन, हर चक्र में क्रम बदलता है' : 'Four tones bracketing your pitch, re-ordered every cycle' },
                  { id: 'NOTCH' as RxEngine, name: hi ? 'नॉच्ड शोर' : 'Notched noise', desc: hi ? 'आपकी आवृत्ति पर कटा हुआ शोर' : 'Noise with your frequency filtered out' },
                  { id: 'BROAD' as RxEngine, name: hi ? 'ब्रॉडबैंड मास्कर' : 'Broadband masker', desc: hi ? 'सादा शोर जो टिनिटस को ढकता है' : 'Plain noise that covers the tinnitus' },
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
                  {engineChoice === 'ACRN' ? 'ACRN' : engineChoice === 'NOTCH' ? (hi ? 'नॉच्ड शोर' : 'Notched noise') : (hi ? 'ब्रॉडबैंड' : 'Broadband')} · {frequency} Hz
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
