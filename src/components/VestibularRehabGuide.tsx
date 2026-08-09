'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  RotateCcw, Play, Pause, RefreshCw, CheckCircle2, AlertTriangle, Camera,
  ClipboardCheck, Footprints, SkipForward, Volume2, VolumeX, Save, Check, Ear, Activity,
} from 'lucide-react';
import { useAppData } from '@/lib/app-data-context';
import { AIVertigoRehabCoach } from './AIVertigoRehabCoach';
import { VestibularDhiInventory } from './VestibularDhiInventory';
import { VertigoExerciseLibrary } from './VertigoExerciseLibrary';
import {
  MANOEUVRES, renderInstruction, manoeuvreDuration,
  loadProfile, saveProfile, loadSessions, saveSession, summariseAdherence,
  type Manoeuvre, type Side, type VestibularSession,
} from '@/lib/vestibular-rx';

type Tab = 'exercises' | 'coach' | 'manoeuvre' | 'balance' | 'assessment';

const TABS: Array<{ id: Tab; icon: React.ElementType; en: string; hi: string }> = [
  { id: 'exercises', icon: Activity, en: 'Vertigo exercises', hi: 'चक्कर अभ्यास' },
  { id: 'coach', icon: Camera, en: 'AI camera coach', hi: 'एआई कैमरा कोच' },
  { id: 'manoeuvre', icon: Ear, en: 'BPPV manoeuvres', hi: 'बीपीपीवी पैंतरे' },
  { id: 'balance', icon: Footprints, en: 'Balance & gait', hi: 'संतुलन व चाल' },
  { id: 'assessment', icon: ClipboardCheck, en: 'DHI-25 assessment', hi: 'DHI-25 आकलन' },
];

/** Standing balance work the camera cannot judge — a timed checklist instead. */
const BALANCE_DRILLS = [
  {
    id: 'bal-romberg',
    seconds: 30,
    titleEn: 'Feet together, eyes open',
    titleHi: 'पैर मिलाकर, आंखें खुली',
    textEn: 'Stand with feet touching, arms by your sides, near a wall or worktop you can reach.',
    textHi: 'पैर आपस में सटाकर, हाथ बगल में रखकर, ऐसी दीवार या मेज़ के पास खड़े हों जिसे पकड़ सकें।',
  },
  {
    id: 'bal-romberg-closed',
    seconds: 30,
    titleEn: 'Feet together, eyes closed',
    titleHi: 'पैर मिलाकर, आंखें बंद',
    textEn: 'Same stance with eyes closed. This removes vision, forcing the balance organ to work.',
    textHi: 'वही स्थिति, आंखें बंद। दृष्टि हट जाने से संतुलन अंग को काम करना पड़ता है।',
  },
  {
    id: 'bal-foam',
    seconds: 30,
    titleEn: 'Stand on a cushion',
    titleHi: 'गद्दी पर खड़े हों',
    textEn: 'Stand on a firm cushion or folded blanket with arms crossed. Unstable ground removes the foot\'s position sense.',
    textHi: 'मोटी गद्दी या मुड़े कंबल पर हाथ बांधकर खड़े हों। अस्थिर सतह पैरों की स्थिति-बोध हटा देती है।',
  },
  {
    id: 'bal-tandem',
    seconds: 45,
    titleEn: 'Tandem walk, 10 steps',
    titleHi: 'टैंडम वॉक, 10 कदम',
    textEn: 'Walk heel-to-toe along a straight line, looking ahead rather than at your feet.',
    textHi: 'एड़ी से पंजा मिलाकर सीधी रेखा पर चलें, पैरों की जगह सामने देखें।',
  },
  {
    id: 'bal-gaze-walk',
    seconds: 45,
    titleEn: 'Walk with head turns',
    titleHi: 'सिर घुमाते हुए चलें',
    textEn: 'Walk forward turning your head left and right every second step. Have someone nearby the first few times.',
    textHi: 'हर दूसरे कदम पर सिर दाएं-बाएं घुमाते हुए आगे चलें। पहली कुछ बार कोई पास रहे।',
  },
];

export const VestibularRehabGuide: React.FC = () => {
  const { locale } = useAppData();
  const hi = locale === 'hi';

  const [tab, setTab] = useState<Tab>('exercises');

  const handleLaunchCoach = (exId: string) => {
    setTab('coach');
  };

  return (
    <div className="space-y-6 page-enter">
      <header className="bg-gradient-to-r from-teal-900 via-navy-900 to-emerald-900 rounded-2xl p-6 md:p-8 text-white shadow-elevated relative overflow-hidden">
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 border border-teal-400/30 text-teal-100 text-xs font-semibold backdrop-blur-sm">
            <RotateCcw className="w-4 h-4 text-teal-300" />
            {hi ? 'चक्कर व संतुलन पुनर्वास' : 'Vestibular & balance rehabilitation'}
          </div>
          <h1 className="font-display text-2xl md:text-3xl font-extrabold tracking-tight">
            {hi ? 'वेस्टिबुलर पुनर्वास स्टूडियो' : 'Vestibular Rehabilitation Studio'}
          </h1>
          <p className="text-teal-50/90 text-xs md:text-sm leading-relaxed">
            {hi
              ? 'बीपीपीवी, वेस्टिबुलर न्यूराइटिस और लगातार चक्कर के लिए: भारतीय मॉडल आधारित चक्कर अभ्यास, कैमरा-आधारित गेज़ स्टेबिलाइजेशन कोच, समयबद्ध एपली व ब्रांट-डैरोफ पैंतरे और DHI-25 आकलन।'
              : 'For BPPV, vestibular neuritis and persistent dizziness: an Indian female subject exercise guide, camera-based gaze-stabilisation coach, timed Epley & Brandt-Daroff manoeuvres, and the DHI-25.'}
          </p>
        </div>
      </header>

      {/* Section tabs */}
      <div role="tablist" aria-label={hi ? 'पुनर्वास अनुभाग' : 'Rehabilitation sections'} className="flex flex-wrap items-center gap-2 bg-slate-100 dark:bg-ink-950 p-1.5 rounded-xl border border-slate-200 dark:border-ink-800">
        {TABS.map(({ id, icon: Icon, en, hi: labelHi }) => {
          const active = tab === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              id={`vrt-tab-${id}`}
              aria-selected={active}
              aria-controls={`vrt-panel-${id}`}
              onClick={() => setTab(id)}
              className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs md:text-sm font-bold transition-all ${
                active
                  ? 'bg-navy-800 text-white shadow-sm'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-ink-900'
              }`}
            >
              <Icon className="w-4 h-4" aria-hidden="true" />
              {hi ? labelHi : en}
            </button>
          );
        })}
      </div>

      <div role="tabpanel" id={`vrt-panel-${tab}`} aria-labelledby={`vrt-tab-${tab}`}>
        {tab === 'exercises' && <VertigoExerciseLibrary onLaunchCoach={handleLaunchCoach} />}
        {tab === 'coach' && <AIVertigoRehabCoach />}
        {tab === 'manoeuvre' && <ManoeuvrePlayer />}
        {tab === 'balance' && <BalanceDrills />}
        {tab === 'assessment' && (
          <div className="bg-white dark:bg-ink-900 rounded-2xl border border-slate-200 dark:border-ink-800 p-5 md:p-6 shadow-card max-w-3xl">
            <VestibularDhiInventory />
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------- manoeuvre player */

const ManoeuvrePlayer: React.FC = () => {
  const { locale } = useAppData();
  const hi = locale === 'hi';

  const [manoeuvreId, setManoeuvreId] = useState<string>(MANOEUVRES[0].id);
  const [side, setSide] = useState<Side>('right');
  const [stepIndex, setStepIndex] = useState(0);
  const [remaining, setRemaining] = useState(MANOEUVRES[0].steps[0].seconds);
  const [running, setRunning] = useState(false);
  const [cycle, setCycle] = useState(1);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [finished, setFinished] = useState(false);

  const manoeuvre: Manoeuvre = useMemo(
    () => MANOEUVRES.find((m) => m.id === manoeuvreId) || MANOEUVRES[0],
    [manoeuvreId]
  );
  const step = manoeuvre.steps[stepIndex];

  const hiRef = useRef(hi);
  const audioRef = useRef(audioEnabled);
  hiRef.current = hi;
  audioRef.current = audioEnabled;

  const speak = useCallback((text: string) => {
    if (!audioRef.current || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = hiRef.current ? 'hi-IN' : 'en-US';
    window.speechSynthesis.speak(utterance);
  }, []);

  // Restore the affected ear the patient (or their clinician) recorded earlier.
  useEffect(() => {
    setSide(loadProfile().affectedSide);
  }, []);

  const chooseSide = (next: Side) => {
    setSide(next);
    saveProfile({ ...loadProfile(), affectedSide: next });
  };

  // Guards the auto-advance so a completed hold fires exactly once. Cleared on
  // every deliberate move, or a Reset back to step 1 would match the stale key
  // and the sequence would stall there.
  const advancedForRef = useRef<string | null>(null);

  const goToStep = useCallback(
    (index: number, autoplay: boolean) => {
      advancedForRef.current = null;
      setStepIndex(index);
      setRemaining(manoeuvre.steps[index].seconds);
      setRunning(autoplay);
    },
    [manoeuvre]
  );

  const resetSequence = useCallback(() => {
    setCycle(1);
    setFinished(false);
    goToStep(0, false);
  }, [goToStep]);

  // Switching manoeuvre must reset the whole sequence, not just the label.
  useEffect(() => {
    setCycle(1);
    setFinished(false);
    advancedForRef.current = null;
    setStepIndex(0);
    setRemaining(manoeuvre.steps[0].seconds);
    setRunning(false);
  }, [manoeuvre]);

  /**
   * The countdown. `running` is the only gate — the previous version also fired
   * on `remaining === 0`, which re-entered the effect after the state settled and
   * announced completion twice.
   */
  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      setRemaining((prev) => {
        if (prev > 1) return prev - 1;
        window.clearInterval(id);
        setRunning(false);
        return 0;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [running]);

  // Advance when a hold finishes. Keyed on the step so it fires exactly once.
  useEffect(() => {
    if (remaining !== 0 || running) return;
    const key = `${manoeuvre.id}-${cycle}-${stepIndex}`;
    if (advancedForRef.current === key) return;
    advancedForRef.current = key;

    const isLastStep = stepIndex === manoeuvre.steps.length - 1;
    if (!isLastStep) {
      const next = stepIndex + 1;
      speak(
        renderInstruction(
          hiRef.current ? manoeuvre.steps[next].instructionHi : manoeuvre.steps[next].instructionEn,
          side,
          hiRef.current
        )
      );
      goToStep(next, true);
      return;
    }

    if (cycle < manoeuvre.cyclesPerSession) {
      setCycle((c) => c + 1);
      speak(hiRef.current ? 'अगला चक्र शुरू करें।' : 'Beginning the next cycle.');
      goToStep(0, true);
      return;
    }

    setFinished(true);
    speak(hiRef.current ? 'सत्र पूरा हुआ। दो मिनट सीधे बैठे रहें।' : 'Session complete. Stay sitting upright for two minutes.');
  }, [remaining, running, stepIndex, cycle, manoeuvre, side, goToStep, speak]);

  // Stop the voice if the patient navigates away mid-manoeuvre.
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
    };
  }, []);

  const toggle = () => {
    if (!running && remaining > 0) {
      speak(renderInstruction(hi ? step.instructionHi : step.instructionEn, side, hi));
    }
    setRunning((r) => !r);
  };

  const totalSeconds = manoeuvreDuration(manoeuvre) * manoeuvre.cyclesPerSession;
  const elapsedInCycle =
    manoeuvre.steps.slice(0, stepIndex).reduce((sum, s) => sum + s.seconds, 0) + (step.seconds - remaining);
  const elapsed = (cycle - 1) * manoeuvreDuration(manoeuvre) + elapsedInCycle;
  const progress = Math.min(100, (elapsed / totalSeconds) * 100);
  const holdProgress = step.seconds > 0 ? ((step.seconds - remaining) / step.seconds) * 100 : 0;

  return (
    <div className="space-y-5">
      {/* Manoeuvre + side selection */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white dark:bg-ink-900 rounded-2xl border border-slate-200 dark:border-ink-800 p-5 space-y-4">
          <fieldset>
            <legend className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
              {hi ? 'पैंतरा चुनें' : 'Choose a manoeuvre'}
            </legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {MANOEUVRES.map((m) => {
                const active = m.id === manoeuvreId;
                return (
                  <button
                    key={m.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setManoeuvreId(m.id)}
                    className={`text-left p-4 rounded-xl border transition-all ${
                      active
                        ? 'bg-navy-800 text-white border-navy-800 shadow-sm'
                        : 'bg-slate-50 dark:bg-ink-950 border-slate-200 dark:border-ink-800 text-slate-800 dark:text-slate-200 hover:border-navy-300'
                    }`}
                  >
                    <span className="block font-bold text-sm">{hi ? m.nameHi : m.nameEn}</span>
                    <span className={`block text-xs mt-1 leading-relaxed ${active ? 'text-teal-100' : 'text-slate-600 dark:text-slate-400'}`}>
                      {hi ? m.indicationHi : m.indicationEn}
                    </span>
                    <span className={`block text-[11px] font-mono mt-2 ${active ? 'text-teal-200' : 'text-slate-500 dark:text-slate-400'}`}>
                      {m.steps.length} {hi ? 'चरण' : 'steps'} · {m.cyclesPerSession} {hi ? 'चक्र' : 'cycles'} ·{' '}
                      {Math.round((manoeuvreDuration(m) * m.cyclesPerSession) / 60)} min
                    </span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
              {hi ? 'प्रभावित कान' : 'Affected ear'}
            </legend>
            <div className="flex gap-2">
              {(['left', 'right'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  aria-pressed={side === s}
                  onClick={() => chooseSide(s)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-bold border transition-all ${
                    side === s
                      ? 'bg-teal-600 text-white border-teal-600'
                      : 'bg-white dark:bg-ink-950 border-slate-200 dark:border-ink-800 text-slate-700 dark:text-slate-300 hover:border-teal-300'
                  }`}
                >
                  {s === 'left' ? (hi ? 'बायां कान' : 'Left ear') : hi ? 'दायां कान' : 'Right ear'}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
              {hi
                ? 'यह वह कान है जिस ओर लेटने पर चक्कर शुरू होता है — डिक्स-हॉलपाइक परीक्षण में जो पक्ष सकारात्मक निकला हो। पक्का न हो तो अपने ईएनटी से पूछें और तब तक ब्रांट-डैरोफ करें।'
                : 'This is the ear you turn towards when the spinning starts — the side that was positive on Dix-Hallpike. If you are not sure, ask your ENT and use Brandt-Daroff meanwhile.'}
            </p>
          </fieldset>
        </div>

        {/* Timer */}
        <div className="bg-gradient-to-b from-navy-900 to-navy-950 text-white rounded-2xl p-6 shadow-card flex flex-col items-center justify-between gap-5">
          <div className="w-full flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-widest text-teal-400">
              {hi ? 'चरण' : 'Step'} {stepIndex + 1}/{manoeuvre.steps.length} · {hi ? 'चक्र' : 'cycle'} {cycle}/{manoeuvre.cyclesPerSession}
            </span>
            <button
              type="button"
              onClick={() => setAudioEnabled((v) => !v)}
              aria-pressed={audioEnabled}
              aria-label={audioEnabled ? (hi ? 'आवाज़ बंद करें' : 'Mute voice') : (hi ? 'आवाज़ चालू करें' : 'Unmute voice')}
              className="p-1.5 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800"
            >
              {audioEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Countdown ring */}
          <div className="relative w-40 h-40">
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90" aria-hidden="true">
              <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(20,184,166,0.18)" strokeWidth="8" />
              <circle
                cx="50" cy="50" r="44" fill="none"
                stroke="#2dd4bf" strokeWidth="8" strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 44}
                strokeDashoffset={2 * Math.PI * 44 * (1 - holdProgress / 100)}
                style={{ transition: 'stroke-dashoffset 1s linear' }}
              />
            </svg>
            <div
              className="absolute inset-0 flex flex-col items-center justify-center"
              role="timer"
              aria-live="off"
              aria-label={hi ? 'शेष सेकंड' : 'Seconds remaining'}
            >
              <span className="text-5xl font-black font-mono tabular-nums">
                {String(remaining).padStart(2, '0')}
              </span>
              <span className="text-[10px] text-teal-300 font-bold uppercase tracking-wider">
                {hi ? 'सेकंड शेष' : 'seconds left'}
              </span>
            </div>
          </div>

          <div className="w-full space-y-2.5">
            <button
              type="button"
              onClick={toggle}
              disabled={finished}
              className={`w-full py-3 rounded-xl font-extrabold text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50 ${
                running ? 'bg-amber-500 hover:bg-amber-400 text-navy-950' : 'bg-teal-500 hover:bg-teal-400 text-navy-950'
              }`}
            >
              {running ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 fill-current" />}
              {running ? (hi ? 'रोकें' : 'Pause') : hi ? 'शुरू करें' : 'Start hold'}
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => goToStep(Math.min(stepIndex + 1, manoeuvre.steps.length - 1), false)}
                disabled={stepIndex >= manoeuvre.steps.length - 1}
                className="py-2 rounded-xl border border-slate-700 hover:bg-slate-800 disabled:opacity-40 text-slate-300 text-xs font-semibold flex items-center justify-center gap-1.5"
              >
                <SkipForward className="w-3.5 h-3.5" />
                {hi ? 'अगला' : 'Skip'}
              </button>
              <button
                type="button"
                onClick={resetSequence}
                className="py-2 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-semibold flex items-center justify-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                {hi ? 'रीसेट' : 'Reset'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Session progress */}
      <div>
        <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
          <span>{hi ? 'पूरे सत्र की प्रगति' : 'Whole-session progress'}</span>
          <span className="font-mono">{Math.round(progress)}%</span>
        </div>
        <div
          className="h-2.5 bg-slate-100 dark:bg-ink-950 rounded-full overflow-hidden"
          role="progressbar"
          aria-valuenow={Math.round(progress)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={hi ? 'सत्र की प्रगति' : 'Session progress'}
        >
          <div className="h-full bg-teal-600 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Step list */}
      <ol className="space-y-3">
        {manoeuvre.steps.map((s, index) => {
          const active = index === stepIndex;
          const done = index < stepIndex;
          return (
            <li
              key={s.id}
              aria-current={active ? 'step' : undefined}
              className={`p-4 rounded-xl border flex items-start gap-3 transition-all ${
                active
                  ? 'bg-teal-50 dark:bg-teal-950/50 border-teal-500 ring-2 ring-teal-500/20'
                  : done
                  ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900'
                  : 'bg-white dark:bg-ink-900 border-slate-200 dark:border-ink-800'
              }`}
            >
              <span
                className={`w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-xs font-extrabold ${
                  done
                    ? 'bg-emerald-600 text-white'
                    : active
                    ? 'bg-teal-600 text-white'
                    : 'bg-slate-100 dark:bg-ink-950 text-slate-500 dark:text-slate-400'
                }`}
              >
                {done ? <CheckCircle2 className="w-4 h-4" aria-label="done" /> : index + 1}
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <span className="font-bold text-sm text-slate-900 dark:text-white">
                    {hi ? s.titleHi : s.titleEn}
                  </span>
                  <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">{s.seconds}s</span>
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-300 mt-1 leading-relaxed">
                  {renderInstruction(hi ? s.instructionHi : s.instructionEn, side, hi)}
                </p>
              </div>
            </li>
          );
        })}
      </ol>

      {finished && (
        <div role="status" className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-sm flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <strong className="block font-bold">{hi ? 'सत्र पूरा हुआ' : 'Session complete'}</strong>
            {hi
              ? 'दो मिनट सीधे बैठे रहें। आज रात सिर थोड़ा ऊंचा रखकर सोएं और प्रभावित कान के बल लेटने से बचें। लक्षण बने रहें तो अगले 24 घंटे बाद दोहराएं।'
              : 'Stay sitting upright for two minutes. Sleep propped up tonight and avoid lying on the affected ear. If symptoms persist, repeat after 24 hours.'}
          </div>
        </div>
      )}

      <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-900 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" aria-hidden="true" />
        <div>
          <strong className="font-bold block mb-0.5">{hi ? 'सुरक्षा' : 'Safety'}</strong>
          {hi
            ? 'यह पैंतरा केवल पुष्ट पोस्टीरियर कैनाल बीपीपीवी के लिए है। गर्दन की चोट, सर्वाइकल स्टेनोसिस, रेटिनल डिटैचमेंट या कैरोटिड रोग हो तो पहले डॉक्टर से पूछें। लेटने की जगह गद्देदार हो और पहली बार कोई साथ हो।'
            : 'Use these only for confirmed posterior-canal BPPV. Ask your clinician first if you have neck injury, cervical stenosis, retinal detachment, or carotid disease. Work on a padded surface, and have someone with you the first time.'}
        </div>
      </div>
    </div>
  );
};

/* ---------------------------------------------------------- balance drills */

const BalanceDrills: React.FC = () => {
  const { locale } = useAppData();
  const hi = locale === 'hi';

  const [activeId, setActiveId] = useState(BALANCE_DRILLS[0].id);
  const [remaining, setRemaining] = useState(BALANCE_DRILLS[0].seconds);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState<Record<string, boolean>>({});
  const [dizzinessBefore, setDizzinessBefore] = useState(4);
  const [dizzinessAfter, setDizzinessAfter] = useState(2);
  const [saved, setSaved] = useState(false);
  const [adherence, setAdherence] = useState(() => summariseAdherence([]));

  const drill = BALANCE_DRILLS.find((d) => d.id === activeId) || BALANCE_DRILLS[0];
  const hiRef = useRef(hi);
  hiRef.current = hi;

  useEffect(() => {
    setAdherence(summariseAdherence(loadSessions()));
  }, []);

  // Countdown. Only `running` drives it, so reaching zero cannot re-trigger itself.
  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      setRemaining((prev) => {
        if (prev > 1) return prev - 1;
        window.clearInterval(id);
        setRunning(false);
        return 0;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [running]);

  // Announce and tick off exactly once per completion.
  const announcedForRef = useRef<string | null>(null);
  useEffect(() => {
    if (remaining !== 0 || running) return;
    if (announcedForRef.current === activeId) return;
    announcedForRef.current = activeId;

    setDone((prev) => ({ ...prev, [activeId]: true }));
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(
        hiRef.current ? 'यह अभ्यास पूरा हुआ' : 'Drill complete'
      );
      utterance.lang = hiRef.current ? 'hi-IN' : 'en-US';
      window.speechSynthesis.speak(utterance);
    }
  }, [remaining, running, activeId]);

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
    };
  }, []);

  const selectDrill = (id: string) => {
    const next = BALANCE_DRILLS.find((d) => d.id === id);
    if (!next) return;
    announcedForRef.current = null;
    setActiveId(id);
    setRemaining(next.seconds);
    setRunning(false);
  };

  const restart = () => {
    announcedForRef.current = null;
    setRemaining(drill.seconds);
    setRunning(false);
  };

  const completedCount = BALANCE_DRILLS.filter((d) => done[d.id]).length;

  const handleSave = () => {
    const session: VestibularSession = {
      id: crypto.randomUUID(),
      date: new Date().toISOString().slice(0, 10),
      exerciseId: 'balance-circuit',
      reps: completedCount,
      targetReps: BALANCE_DRILLS.length,
      meanPeakAngle: 0,
      meanPeakVelocity: 0,
      qualityScore: Math.round((completedCount / BALANCE_DRILLS.length) * 100),
      dizzinessBefore,
      dizzinessAfter,
      mode: 'manual',
      createdAt: new Date().toISOString(),
    };
    setAdherence(summariseAdherence(saveSession(session)));
    setSaved(true);
  };

  const holdProgress = drill.seconds > 0 ? ((drill.seconds - remaining) / drill.seconds) * 100 : 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Footprints className="w-5 h-5 text-teal-600 dark:text-teal-400" />
            {hi ? 'संतुलन प्रगति' : 'Balance progression'}
          </h2>
          <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400">
            {completedCount}/{BALANCE_DRILLS.length}
          </span>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
          {hi
            ? 'क्रम से करें — हर अभ्यास पिछले से थोड़ा कठिन है। हमेशा किसी ऐसी चीज़ के पास खड़े हों जिसे पकड़ सकें।'
            : 'Work down the list — each drill removes one more source of balance information. Always stand within reach of something solid.'}
        </p>

        <ol className="space-y-3">
          {BALANCE_DRILLS.map((d, index) => {
            const active = d.id === activeId;
            const complete = !!done[d.id];
            return (
              <li key={d.id}>
                <button
                  type="button"
                  onClick={() => selectDrill(d.id)}
                  aria-pressed={active}
                  className={`w-full text-left p-4 rounded-xl border flex items-start gap-3 transition-all ${
                    active
                      ? 'bg-teal-50 dark:bg-teal-950/50 border-teal-500 ring-2 ring-teal-500/20'
                      : complete
                      ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900'
                      : 'bg-white dark:bg-ink-900 border-slate-200 dark:border-ink-800 hover:border-teal-300'
                  }`}
                >
                  <span
                    className={`w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-xs font-extrabold ${
                      complete ? 'bg-emerald-600 text-white' : active ? 'bg-teal-600 text-white' : 'bg-slate-100 dark:bg-ink-950 text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {complete ? <CheckCircle2 className="w-4 h-4" aria-label="done" /> : index + 1}
                  </span>
                  <span className="min-w-0 block">
                    <span className="flex flex-wrap items-baseline gap-x-2">
                      <span className="font-bold text-sm text-slate-900 dark:text-white">
                        {hi ? d.titleHi : d.titleEn}
                      </span>
                      <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">{d.seconds}s</span>
                    </span>
                    <span className="block text-xs text-slate-700 dark:text-slate-300 mt-1 leading-relaxed">
                      {hi ? d.textHi : d.textEn}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>

        <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-900 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <strong className="font-bold block mb-0.5">{hi ? 'सुरक्षा' : 'Safety'}</strong>
            {hi
              ? 'गिरने से बचाव पहले। आंखें बंद करने वाले अभ्यास किसी के सामने ही करें। अचानक तेज़ उल्टी, धुंधलापन या बेहोशी जैसा लगे तो तुरंत रुककर बैठ जाएं।'
              : 'Fall prevention comes first. Do the eyes-closed drills only with someone present. If severe nausea, blurring, or faintness comes on, stop and sit down at once.'}
          </div>
        </div>
      </div>

      {/* Timer + logging */}
      <div className="space-y-4">
        <div className="bg-gradient-to-b from-navy-900 to-navy-950 text-white rounded-2xl p-6 shadow-card flex flex-col items-center gap-5">
          <div className="text-center">
            <span className="text-[11px] font-extrabold uppercase tracking-widest text-teal-400 block">
              {hi ? 'होल्ड टाइमर' : 'Hold timer'}
            </span>
            <span className="text-sm font-bold text-slate-200">{hi ? drill.titleHi : drill.titleEn}</span>
          </div>

          <div className="relative w-36 h-36">
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90" aria-hidden="true">
              <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(20,184,166,0.18)" strokeWidth="8" />
              <circle
                cx="50" cy="50" r="44" fill="none"
                stroke="#2dd4bf" strokeWidth="8" strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 44}
                strokeDashoffset={2 * Math.PI * 44 * (1 - holdProgress / 100)}
                style={{ transition: 'stroke-dashoffset 1s linear' }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-4xl font-black font-mono tabular-nums">
                {String(remaining).padStart(2, '0')}
              </span>
            </div>
          </div>

          <div className="w-full space-y-2.5">
            <button
              type="button"
              onClick={() => setRunning((r) => !r)}
              disabled={remaining === 0}
              className={`w-full py-3 rounded-xl font-extrabold text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50 ${
                running ? 'bg-amber-500 hover:bg-amber-400 text-navy-950' : 'bg-teal-500 hover:bg-teal-400 text-navy-950'
              }`}
            >
              {running ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 fill-current" />}
              {running ? (hi ? 'रोकें' : 'Pause') : hi ? 'शुरू करें' : 'Start'}
            </button>
            <button
              type="button"
              onClick={restart}
              className="w-full py-2 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-semibold flex items-center justify-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              {hi ? 'फिर से' : 'Restart drill'}
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-ink-900 rounded-2xl border border-slate-200 dark:border-ink-800 p-5 space-y-4">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
            {hi ? 'सत्र दर्ज करें' : 'Log this session'}
          </h3>
          {[
            { id: 'balance-before', label: hi ? 'पहले चक्कर (0-10)' : 'Dizziness before (0-10)', value: dizzinessBefore, set: setDizzinessBefore, accent: 'accent-teal-600' },
            { id: 'balance-after', label: hi ? 'बाद में चक्कर (0-10)' : 'Dizziness after (0-10)', value: dizzinessAfter, set: setDizzinessAfter, accent: 'accent-emerald-600' },
          ].map((field) => (
            <div key={field.id}>
              <label htmlFor={field.id} className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider block mb-1.5">
                {field.label}
              </label>
              <div className="flex items-center gap-3">
                <input
                  id={field.id}
                  type="range"
                  min={0}
                  max={10}
                  step={1}
                  value={field.value}
                  onChange={(e) => field.set(Number(e.target.value))}
                  className={`w-full cursor-pointer ${field.accent}`}
                />
                <span className="font-mono font-extrabold text-sm w-9 text-center px-2 py-0.5 rounded border bg-slate-50 dark:bg-ink-950 border-slate-200 dark:border-ink-800 text-slate-900 dark:text-slate-100">
                  {field.value}
                </span>
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={handleSave}
            disabled={completedCount === 0 || saved}
            className="btn-navy w-full inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {saved
              ? hi ? 'सहेजा गया' : 'Saved'
              : completedCount === 0
              ? hi ? 'कम से कम एक अभ्यास पूरा करें' : 'Complete a drill first'
              : hi ? 'सत्र सहेजें' : 'Save session'}
          </button>

          <p className="text-[11px] text-slate-500 dark:text-slate-400 text-center">
            {hi ? 'लगातार' : 'Streak'} {adherence.streak} · {hi ? 'इस हफ्ते' : 'this week'} {adherence.daysThisWeek}/7
          </p>
        </div>
      </div>
    </div>
  );
};
