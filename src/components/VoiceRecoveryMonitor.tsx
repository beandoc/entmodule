'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Mic, MicOff, Play, Square, CheckCircle2, AlertTriangle, ShieldAlert,
  Activity, ClipboardList, LineChart, Download, Info, Stethoscope,
} from 'lucide-react';
import { useAppData } from '@/lib/app-data-context';
import { VoiceAnalysisRecorder } from './gaze/VoiceAnalysisRecorder';
import {
  openMicrophone, micErrorKey, describeDevice, recordFor, recordForWithStop, encodeWav,
  type MicHandle, type MicErrorKey,
} from '@/lib/voice-capture';
import { submitVoiceSampleForAnalysis, type VoiceQualityFlag } from '@/lib/voice-analysis-service';
import { getCurrentPatientId } from '@/lib/patient-context';
import {
  estimateNoiseFloorDb, computeCPPS, detectPhonation, countDdkSyllables, clippedFraction,
  type CppsResult, type PhonationResult, type DdkResult,
} from '@/lib/voice-dsp';
import {
  VOICE_PROTOCOL, COHORTS, SYMPTOM_ITEMS, MAX_USABLE_NOISE_FLOOR_DB, MIN_PASSAGE_DURATION_SEC,
  buildVoiceSession, evaluateRedFlags, summariseVoiceTrend, generateVoiceInsight,
  loadVoiceSessions, saveVoiceSession, loadVoiceProfile, saveVoiceProfile,
  MIN_SESSIONS_FOR_ACOUSTIC,
  type VoiceSession, type VoiceCohort, type SymptomId, type VoiceAlert, type PraatParams,
} from '@/lib/voice-rx';
import { VoicePromInventory } from './VoicePromInventory';

type Tab = 'record' | 'history' | 'questionnaires' | 'send_sample';
type Stage = 'intro' | 'symptoms' | 'tasks' | 'results';

const MIC_ERROR_COPY: Record<MicErrorKey, { en: string; hi: string }> = {
  denied: {
    en: 'Microphone permission was refused. Enable it for this site in your browser settings, then try again.',
    hi: 'माइक्रोफ़ोन की अनुमति नहीं मिली। ब्राउज़र सेटिंग्स में इस साइट के लिए इसे चालू करें, फिर दोबारा कोशिश करें।',
  },
  'not-found': {
    en: 'No microphone was found on this device.',
    hi: 'इस डिवाइस पर कोई माइक्रोफ़ोन नहीं मिला।',
  },
  'in-use': {
    en: 'The microphone is being used by another app. Close it and try again.',
    hi: 'माइक्रोफ़ोन किसी दूसरे ऐप में चल रहा है। उसे बंद करके दोबारा कोशिश करें।',
  },
  insecure: {
    en: 'Recording needs a secure (https) connection.',
    hi: 'रिकॉर्डिंग के लिए सुरक्षित (https) कनेक्शन ज़रूरी है।',
  },
  unsupported: {
    en: 'This browser cannot record audio. Try Chrome on Android or Safari on iPhone.',
    hi: 'यह ब्राउज़र ऑडियो रिकॉर्ड नहीं कर सकता। Android पर Chrome या iPhone पर Safari आज़माएं।',
  },
  unknown: {
    en: 'The microphone could not be opened.',
    hi: 'माइक्रोफ़ोन नहीं खुल सका।',
  },
};

export const VoiceRecoveryMonitor: React.FC = () => {
  const { locale } = useAppData();
  const hi = locale === 'hi';

  const [tab, setTab] = useState<Tab>('record');
  const [stage, setStage] = useState<Stage>('intro');
  const [cohort, setCohort] = useState<VoiceCohort>('partial_laryngectomy');
  const [sessions, setSessions] = useState<VoiceSession[]>([]);
  const [symptoms, setSymptoms] = useState<SymptomId[]>([]);
  const [micError, setMicError] = useState<MicErrorKey | null>(null);
  const [taskIndex, setTaskIndex] = useState(0);
  const [trialIndex, setTrialIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [level, setLevel] = useState(-120);
  const [noiseFloor, setNoiseFloor] = useState<number | null>(null);
  const [lastSession, setLastSession] = useState<VoiceSession | null>(null);
  const [alerts, setAlerts] = useState<VoiceAlert[]>([]);
  const [promTab, setPromTab] = useState<'VHI-10' | 'EAT-10'>('VHI-10');
  // Gates whether each take's WAV is uploaded for the audiologist to listen to
  // (see runTake's auto-save block below). The DSP protocol itself - MPT,
  // CPPS, DDK, and the alerting built from them - runs entirely on-device and
  // does not depend on this; only audio leaving the device does.
  const [audioUploadConsent, setAudioUploadConsent] = useState(false);

  // High-frequency values live in refs; only the throttled meter reaches state.
  // Same discipline as AIGazeAnalyticsEngine's rAF loop.
  const micRef = useRef<MicHandle | null>(null);
  const rafRef = useRef<number | null>(null);
  const resultsRef = useRef<{
    cpps: CppsResult | null;
    mptTrials: PhonationResult[];
    amr: DdkResult | null;
    smr: DdkResult | null;
    clipped: number[];
    praat: PraatParams | null;
  }>({ cpps: null, mptTrials: [], amr: null, smr: null, clipped: [], praat: null });

  useEffect(() => {
    const stored = loadVoiceSessions();
    setSessions(stored);
    const profile = loadVoiceProfile();
    setCohort(profile.cohort);
  }, []);

  const stopMic = useCallback(() => {
    if (rafRef.current !== null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    micRef.current?.stop();
    micRef.current = null;
    setLevel(-120);
  }, []);

  useEffect(() => stopMic, [stopMic]);
  const stopRequestedRef = useRef(false);

  const pumpMeter = useCallback(() => {
    const tick = () => {
      if (micRef.current) setLevel(micRef.current.level());
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const beginSession = async () => {
    setMicError(null);
    try {
      const handle = await openMicrophone();
      micRef.current = handle;
      pumpMeter();
      resultsRef.current = { cpps: null, mptTrials: [], amr: null, smr: null, clipped: [], praat: null };
      setTaskIndex(0);
      setTrialIndex(0);
      setNoiseFloor(null);
      setStage('tasks');
    } catch (err) {
      setMicError(micErrorKey(err));
    }
  };

  const task = VOICE_PROTOCOL[taskIndex];

  /**
   * Send the passage take to services/voice-analysis (via the proxy route) for
   * Praat-native CPPS/HNR/shimmer/LTAS. Never throws - a network failure or a
   * down sidecar must not block the protocol, it just leaves these measures
   * null (see PraatParams and buildVoiceSession's handling of `praat`).
   */
  const analysePassageWithSidecar = async (pcm: Float32Array, sampleRate: number): Promise<PraatParams | null> => {
    try {
      const wav = encodeWav(pcm, sampleRate);
      const form = new FormData();
      form.append('file', wav, 'passage.wav');
      const res = await fetch('/api/voice-analysis-praat', { method: 'POST', body: form });
      if (!res.ok) return null;
      const body = await res.json();
      if (!body.success) return null;
      const { success, ...praat } = body;
      return praat as PraatParams;
    } catch (err) {
      console.warn('Praat sidecar call failed:', err);
      return null;
    }
  };

  /** Run one take of the current task and fold the result into resultsRef. */
  const runTake = async () => {
    const mic = micRef.current;
    if (!mic || busy) return;
    stopRequestedRef.current = false;
    setBusy(true);
    try {
      const seconds = task.durationSec ?? 30; // MPT is capped, not open-ended
      const pcm = await recordForWithStop(mic, seconds, () => stopRequestedRef.current);
      const sr = mic.sampleRate;
      const store = resultsRef.current;
      const device = describeDevice(mic);

      if (task.id === 'calibration') {
        setNoiseFloor(estimateNoiseFloorDb(pcm, sr));
      } else {
        store.clipped.push(clippedFraction(pcm));
        const floor = noiseFloor ?? -60;
        if (task.id === 'cpps_phonation') store.cpps = computeCPPS(pcm, sr);
        else if (task.id === 'mpt') store.mptTrials.push(detectPhonation(pcm, sr, floor));
        else if (task.id === 'ddk_amr') store.amr = countDdkSyllables(pcm, sr, floor);
        else if (task.id === 'ddk_smr') store.smr = countDdkSyllables(pcm, sr, floor);
        // Both branches below send this take's audio off-device - to the Praat
        // sidecar for scoring, or to the audiologist queue for a human to hear.
        // Neither runs without audioUploadConsent; the on-device DSP above
        // (MPT/CPPS/DDK and the alerting built from it) is unaffected either way.
        else if (task.id === 'passage' && audioUploadConsent) store.praat = await analysePassageWithSidecar(pcm, sr);

        // Auto-save WAV voice sample to backend for audiologist portal hearing.
        // Metrics attached here must be the same measurements buildVoiceSession
        // uses below, scoped to what this task actually produced - not the
        // recording's raw duration relabelled as MPT, and never a fixed pitch
        // that was never computed at all.
        if (pcm && pcm.length > 100 && audioUploadConsent) {
          try {
            const wavBlob = encodeWav(pcm, sr);
            const reader = new FileReader();
            const latestMpt = store.mptTrials.length > 0 ? store.mptTrials[store.mptTrials.length - 1] : null;
            const takeDurationSec = pcm.length / sr;
            const recordingType =
              task.id === 'mpt' ? 'mpt' : task.id === 'cpps_phonation' ? 'phonation_aaa'
                : task.id === 'passage' ? 'passage' : 'custom_voice_note';
            const qualityFlags: VoiceQualityFlag[] = [];
            if (floor > MAX_USABLE_NOISE_FLOOR_DB) qualityFlags.push('room_too_noisy');
            // AVQI-style scoring of the passage is not wired up yet (Phase 3) - this
            // flag is what will gate it once it is, so a short take is caught now
            // rather than silently scored later.
            if (task.id === 'passage' && takeDurationSec < MIN_PASSAGE_DURATION_SEC) qualityFlags.push('too_short');
            reader.onloadend = async () => {
              const base64Url = reader.result as string;
              await submitVoiceSampleForAnalysis({
                patientId: getCurrentPatientId(),
                patientName: 'Sachin Srivastava',
                patientMrn: 'MRN: 88491',
                audioDataUrl: base64Url,
                durationSec: takeDurationSec,
                recordingType,
                patientNote: `Protocol Task: ${task.label}. Auto-saved audio take.`,
                autoDspMetrics: {
                  cppsDb: task.id === 'cpps_phonation' && store.cpps ? store.cpps.cppsDb : null,
                  cppsVoicedRatio: task.id === 'cpps_phonation' && store.cpps ? store.cpps.voicedFrameRatio : null,
                  mptSec: task.id === 'mpt' && latestMpt?.detected ? latestMpt.durationSec : null,
                  phonationDropouts: task.id === 'mpt' && latestMpt?.detected ? latestMpt.dropoutCount : null,
                  noiseFloorDb: floor,
                  clippedFraction: store.clipped[store.clipped.length - 1] ?? 0,
                  durationSec: takeDurationSec,
                  sampleRate: sr,
                  deviceFingerprint: device?.fingerprint ?? 'unknown',
                  processingDisabled: device?.processingDisabled ?? false,
                  qualityFlags,
                  computedBy: 'device-dsp-v1',
                },
              });
            };
            reader.readAsDataURL(wavBlob);
          } catch (err) {
            console.warn('Auto WAV upload warning:', err);
          }
        }
      }

      const nextTrial = trialIndex + 1;
      if (nextTrial < task.trials) {
        setTrialIndex(nextTrial);
      } else if (taskIndex + 1 < VOICE_PROTOCOL.length) {
        setTaskIndex(taskIndex + 1);
        setTrialIndex(0);
      } else {
        finishSession();
      }
    } finally {
      setBusy(false);
    }
  };

  const finishSession = () => {
    const mic = micRef.current;
    const store = resultsRef.current;
    const device = mic ? describeDevice(mic) : null;

    const session = buildVoiceSession({
      cohort,
      noiseFloorDb: noiseFloor ?? -60,
      deviceFingerprint: device?.fingerprint ?? 'unknown',
      processingDisabled: device?.processingDisabled ?? false,
      cpps: store.cpps,
      mptTrials: store.mptTrials,
      amr: store.amr,
      smr: store.smr,
      symptoms,
      clippedFractions: store.clipped,
      praat: store.praat,
    });

    const next = saveVoiceSession(session);
    setSessions(next);
    setLastSession(session);
    setAlerts(evaluateRedFlags(next));
    stopMic();
    setStage('results');
  };

  const trend = useMemo(() => summariseVoiceTrend(sessions), [sessions]);
  const roomTooNoisy = noiseFloor !== null && noiseFloor > MAX_USABLE_NOISE_FLOOR_DB;

  return (
    <div className="space-y-6">
      <div className="page-title-block">
        <div className="page-title-icon"><Activity className="w-6 h-6" aria-hidden /></div>
        <div>
          <h1 className="text-2xl font-semibold">
            {hi ? 'स्वर सुधार निगरानी' : 'Voice Recovery Monitor'}
          </h1>
          <p className="text-sm opacity-70">
            {hi
              ? 'ऑपरेशन के बाद आवाज़ और निगलने की रिकवरी को समय के साथ ट्रैक करें'
              : 'Track post-operative voice and swallowing recovery over time'}
          </p>
        </div>
      </div>

      {/*
        Scope statement, shown before anything else. This tool does not detect
        recurrence, and saying so plainly is a design requirement rather than a
        disclaimer bolted on at the end.
      */}
      <div className="clinical-card bg-slate-50 dark:bg-slate-900/60">
        <div className="flex items-start gap-3 text-sm">
          <Info className="w-5 h-5 shrink-0 mt-0.5 text-slate-500" aria-hidden />
          <p className="leading-relaxed opacity-85">
            {hi
              ? 'यह उपकरण आवाज़ की रिकवरी और कर्कशता की गंभीरता को ट्रैक करता है। यह कैंसर या उसके दोबारा होने की जाँच नहीं करता। यह आपकी ईएनटी टीम की जगह नहीं लेता।'
              : 'This tool tracks voice recovery and hoarseness severity. It does not screen for cancer or its return, and it does not replace your ENT team.'}
          </p>
        </div>
      </div>

      <nav className="tab-nav" role="tablist">
        {([
          ['record', hi ? 'रिकॉर्ड' : 'Record', Mic],
          ['send_sample', hi ? 'ऑडियोलॉजिस्ट विश्लेषण' : 'Audiologist Review', Stethoscope],
          ['history', hi ? 'इतिहास' : 'History', LineChart],
          ['questionnaires', hi ? 'प्रश्नावली' : 'Questionnaires', ClipboardList],
        ] as const).map(([id, label, Icon]) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            className={`tab-btn ${tab === id ? 'active' : ''}`}
            onClick={() => setTab(id as any)}
          >
            <Icon className="w-4 h-4" aria-hidden /> {label}
          </button>
        ))}
      </nav>

      {tab === 'record' && (
        <>
          {stage === 'intro' && (
            <div className="space-y-4">
              <div className="clinical-card">
                <h2 className="font-semibold mb-3">{hi ? 'आपका इलाज' : 'Your treatment'}</h2>
                <div className="space-y-2">
                  {COHORTS.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      aria-pressed={cohort === c.id}
                      onClick={() => { setCohort(c.id); saveVoiceProfile({ cohort: c.id, treatmentDate: null, updatedAt: '' }); }}
                      className={`w-full text-left p-3 rounded-lg border transition-colors ${
                        cohort === c.id
                          ? 'border-clinical-600 bg-clinical-50 dark:bg-clinical-950/40'
                          : 'border-slate-200 dark:border-slate-700 hover:border-clinical-400'
                      }`}
                    >
                      <div className="font-medium text-sm">{hi ? c.labelHi : c.label}</div>
                      <div className="text-xs opacity-70 mt-1">{hi ? c.noteHi : c.note}</div>
                    </button>
                  ))}
                </div>
                {/*
                  Total laryngectomy is excluded rather than silently mishandled:
                  without vocal folds these measures have no shared scale with
                  the cohorts above and would produce confident nonsense.
                */}
                <p className="mt-3 text-xs opacity-70">
                  {hi
                    ? 'यदि आपकी पूरी लैरिंजेक्टोमी हुई है, तो यह जाँच आप पर लागू नहीं होती। कृपया अपनी स्पीच थेरेपी टीम से बात करें।'
                    : 'If you have had a total laryngectomy, this assessment does not apply to you - please speak to your speech therapy team instead.'}
                </p>
              </div>

              <div className="clinical-card">
                <h2 className="font-semibold mb-2">{hi ? 'तैयारी' : 'Before you start'}</h2>
                <ul className="text-sm space-y-1.5 opacity-85 list-disc pl-5">
                  <li>{hi ? 'शांत कमरे में बैठें, पंखा और टीवी बंद कर दें।' : 'Sit in a quiet room. Turn off fans and the TV.'}</li>
                  <li>{hi ? 'फ़ोन को मुंह से लगभग 15 सेमी दूर रखें।' : 'Hold the phone about 15 cm from your mouth.'}</li>
                  <li>{hi ? 'हर बार वही फ़ोन इस्तेमाल करें - अलग फ़ोन के नतीजों की तुलना नहीं हो सकती।' : 'Use the same phone every time - results from different phones cannot be compared.'}</li>
                  <li>{hi ? 'इसमें लगभग तीन मिनट लगेंगे।' : 'This takes about three minutes.'}</li>
                </ul>
                <button type="button" onClick={() => setStage('symptoms')} className="btn-primary mt-4">
                  <Play className="w-4 h-4" aria-hidden /> {hi ? 'शुरू करें' : 'Start'}
                </button>
              </div>
            </div>
          )}

          {stage === 'symptoms' && (
            <div className="clinical-card space-y-4">
              <div>
                <h2 className="font-semibold">{hi ? 'क्या आपको इनमें से कुछ हो रहा है?' : 'Are you having any of these?'}</h2>
                <p className="text-sm opacity-70 mt-1">
                  {hi ? 'जो भी लागू हो चुनें। कुछ नहीं है तो खाली छोड़ दें।' : 'Select any that apply. Leave blank if none.'}
                </p>
              </div>
              <div className="space-y-2">
                {SYMPTOM_ITEMS.map((item) => {
                  const on = symptoms.includes(item.id);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      aria-pressed={on}
                      onClick={() => setSymptoms((s) => (on ? s.filter((x) => x !== item.id) : [...s, item.id]))}
                      className={`w-full text-left p-3 rounded-lg border text-sm transition-colors flex items-start gap-3 ${
                        on
                          ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40'
                          : 'border-slate-200 dark:border-slate-700 hover:border-amber-300'
                      }`}
                    >
                      <span className={`mt-0.5 w-4 h-4 rounded border shrink-0 ${on ? 'bg-amber-600 border-amber-600' : 'border-slate-400'}`} />
                      <span>{hi ? item.textHi : item.text}</span>
                    </button>
                  );
                })}
              </div>
              <label className="flex items-start gap-2.5 p-3 rounded-lg border border-slate-200 dark:border-slate-700 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={audioUploadConsent}
                  onChange={(e) => setAudioUploadConsent(e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-teal-600"
                />
                <span className="opacity-80">
                  {hi
                    ? 'मैं सहमति देता/देती हूं कि मेरी आवाज़ की रिकॉर्डिंग विश्लेषण के लिए भेजी जाए और मेरी ईएनटी/ऑडियोलॉजी टीम द्वारा सुनी जाए। यदि सहमति नहीं दी जाती, तो केवल ऑन-डिवाइस माप सहेजे जाएंगे, ऑडियो कहीं नहीं भेजा जाएगा।'
                    : 'I consent to my voice recordings being sent for analysis and heard by my ENT/audiology team. Without this, only on-device measurements are saved and no audio leaves this device.'}
                </span>
              </label>
              <button type="button" onClick={beginSession} className="btn-primary">
                <Mic className="w-4 h-4" aria-hidden /> {hi ? 'रिकॉर्डिंग शुरू करें' : 'Start recording'}
              </button>
              {micError && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/60 text-red-900 dark:text-red-200 text-sm flex items-start gap-2">
                  <MicOff className="w-4 h-4 shrink-0 mt-0.5" aria-hidden />
                  <span>{hi ? MIC_ERROR_COPY[micError].hi : MIC_ERROR_COPY[micError].en}</span>
                </div>
              )}
            </div>
          )}

          {stage === 'tasks' && task && (
            <div className="clinical-card space-y-5">
              <div className="flex items-center justify-between text-xs opacity-70">
                <span>{hi ? `चरण ${taskIndex + 1}/${VOICE_PROTOCOL.length}` : `Step ${taskIndex + 1} of ${VOICE_PROTOCOL.length}`}</span>
                {task.trials > 1 && (
                  <span>{hi ? `प्रयास ${trialIndex + 1}/${task.trials}` : `Trial ${trialIndex + 1} of ${task.trials}`}</span>
                )}
              </div>

              <div>
                <h2 className="text-lg font-semibold">{hi ? task.labelHi : task.label}</h2>
                <p className="mt-2 leading-relaxed">{hi ? task.instructionHi : task.instruction}</p>
                {task.id === 'mpt' && (
                  <p className="mt-2 text-xs opacity-70">
                    {hi
                      ? 'हम तीनों में से सबसे लंबा प्रयास गिनते हैं, इसलिए हर बार पूरी सांस लें।'
                      : 'We keep the longest of the three, so take a full breath each time.'}
                  </p>
                )}
              </div>

              <LevelMeter db={level} />

              {roomTooNoisy && (
                <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 text-sm flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden />
                  <span>
                    {hi
                      ? 'यह कमरा बहुत शोरगुल वाला है। नतीजे भरोसेमंद नहीं होंगे - किसी शांत जगह जाकर दोबारा शुरू करें।'
                      : 'This room is too noisy for reliable results. Move somewhere quieter and start again.'}
                  </span>
                </div>
              )}

              {!busy ? (
                <button type="button" onClick={runTake} className="btn-primary w-full justify-center">
                  <Mic className="w-4 h-4" aria-hidden /> {hi ? 'रिकॉर्ड शुरू करें' : 'Start Recording'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => { stopRequestedRef.current = true; }}
                  className="btn-primary w-full justify-center bg-rose-600 hover:bg-rose-500 border-rose-500 text-white animate-pulse"
                >
                  <Square className="w-4 h-4 fill-current" aria-hidden />
                  <span>{hi ? '⏹ रिकॉर्डिंग रोकें और नमुना सहेजें' : '⏹ Stop Recording & Save Sample'}</span>
                </button>
              )}

              <button type="button" onClick={() => { stopMic(); setStage('intro'); }} className="btn-outline w-full justify-center">
                {hi ? 'रद्द करें' : 'Cancel'}
              </button>
            </div>
          )}

          {stage === 'results' && lastSession && (
            <SessionResults
              session={lastSession}
              alerts={alerts}
              trend={trend}
              hi={hi}
              onDone={() => { setStage('intro'); setSymptoms([]); }}
            />
          )}
        </>
      )}

      {tab === 'history' && <HistoryTab sessions={sessions} trend={trend} hi={hi} />}

      {tab === 'send_sample' && (
        <VoiceAnalysisRecorder hi={hi} />
      )}

      {tab === 'questionnaires' && (
        <div className="space-y-4">
          <div className="tab-nav" role="tablist">
            {(['VHI-10', 'EAT-10'] as const).map((id) => (
              <button
                key={id}
                role="tab"
                aria-selected={promTab === id}
                className={`tab-btn ${promTab === id ? 'active' : ''}`}
                onClick={() => setPromTab(id)}
              >
                {id === 'VHI-10' ? (hi ? 'आवाज़' : 'Voice') : (hi ? 'निगलना' : 'Swallowing')}
              </button>
            ))}
          </div>
          <VoicePromInventory instrument={promTab} />
        </div>
      )}
    </div>
  );
};

/* ------------------------------------------------------------------ pieces */

const LevelMeter: React.FC<{ db: number }> = ({ db }) => {
  // -60 dBFS to 0 dBFS mapped across the bar.
  const pct = Math.max(0, Math.min(100, ((db + 60) / 60) * 100));
  const hot = db > -3;
  return (
    <div>
      <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
        <div
          className={`h-full transition-[width] duration-75 ${hot ? 'bg-red-500' : 'bg-emerald-500'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="mt-1 text-xs opacity-60 tabular-nums">{db > -119 ? `${db.toFixed(0)} dBFS` : '--'}</div>
    </div>
  );
};

const Metric: React.FC<{ label: string; value: number | null; unit: string; digits?: number }> = ({
  label, value, unit, digits = 1,
}) => (
  <div className="stat-tile">
    <div className="text-xs opacity-70">{label}</div>
    <div className="text-xl font-semibold tabular-nums mt-1">
      {value === null ? <span className="opacity-40">--</span> : value.toFixed(digits)}
      {value !== null && <span className="text-xs opacity-60 ml-1">{unit}</span>}
    </div>
  </div>
);

const SessionResults: React.FC<{
  session: VoiceSession;
  alerts: VoiceAlert[];
  trend: ReturnType<typeof summariseVoiceTrend>;
  hi: boolean;
  onDone: () => void;
}> = ({ session, alerts, trend, hi, onDone }) => {
  const urgent = alerts.filter((a) => a.severity === 'urgent');
  const review = alerts.filter((a) => a.severity === 'review');

  return (
    <div className="space-y-4">
      {urgent.length > 0 && (
        <div className="clinical-card border bg-red-50 dark:bg-red-950/60 text-red-900 dark:text-red-200 border-red-300 dark:border-red-800">
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-6 h-6 shrink-0 mt-0.5" aria-hidden />
            <div>
              <h3 className="font-semibold">{hi ? 'आज ही दिखाएं' : 'Get seen today'}</h3>
              <ul className="mt-2 space-y-1 text-sm list-disc pl-4">
                {urgent.map((a) => <li key={a.kind}>{hi ? a.messageHi : a.message}</li>)}
              </ul>
              {/*
                An alert with no route to a human is not a safety feature. The
                escalation path is named here rather than left to a dashboard
                that may not be staffed when this fires.
              */}
              <p className="mt-3 text-sm font-medium">
                {hi
                  ? 'अपने ईएनटी विभाग को अभी फ़ोन करें। सांस लेने में कठिनाई बढ़े तो सीधे आपातकालीन विभाग जाएं।'
                  : 'Call your ENT department now. If breathing gets harder, go straight to the emergency department.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {review.length > 0 && (
        <div className="clinical-card border bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 border-amber-200 dark:border-amber-800">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" aria-hidden />
            <div>
              <h3 className="font-semibold text-sm">{hi ? 'ईएनटी समीक्षा के लिए चिह्नित' : 'Flagged for ENT review'}</h3>
              <ul className="mt-2 space-y-1 text-sm list-disc pl-4">
                {review.map((a) => <li key={a.kind}>{hi ? a.messageHi : a.message}</li>)}
              </ul>
            </div>
          </div>
        </div>
      )}

      {alerts.length === 0 && (
        <div className="clinical-card border bg-emerald-50 dark:bg-[#122443] text-emerald-900 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" aria-hidden />
            <p className="text-sm">{hi ? 'इस रिकॉर्डिंग में कुछ भी चिह्नित नहीं हुआ।' : 'Nothing was flagged in this recording.'}</p>
          </div>
        </div>
      )}

      <div className="clinical-card">
        <h3 className="font-semibold mb-3">{hi ? 'आज के माप' : "Today's measurements"}</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Metric label={hi ? 'सबसे लंबा स्वर' : 'Longest note'} value={session.mptSec} unit="s" />
          <Metric label={hi ? 'आवाज़ की स्थिरता' : 'Voice steadiness'} value={session.cppsDb} unit="dB" />
          <Metric label={hi ? 'अक्षर गति' : 'Syllable rate'} value={session.ddkAmrRate} unit="/s" />
          <Metric label={hi ? 'एकरूपता' : 'Evenness'} value={session.ddkIntervalCvPct} unit="%" digits={0} />
        </div>

        <p className="mt-4 text-sm leading-relaxed opacity-85">{generateVoiceInsight(trend, hi ? 'hi' : 'en')}</p>

        {session.qualityFlags.length > 0 && (
          <p className="mt-3 text-xs opacity-70">
            {hi ? 'रिकॉर्डिंग की गुणवत्ता संबंधी नोट: ' : 'Recording quality notes: '}
            {session.qualityFlags.join(', ')}
          </p>
        )}
      </div>

      <button type="button" onClick={onDone} className="btn-primary">
        {hi ? 'पूरा हुआ' : 'Done'}
      </button>
    </div>
  );
};

const HistoryTab: React.FC<{
  sessions: VoiceSession[];
  trend: ReturnType<typeof summariseVoiceTrend>;
  hi: boolean;
}> = ({ sessions, trend, hi }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || sessions.length < 2) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    const pad = 28;
    ctx.clearRect(0, 0, W, H);

    const points = [...sessions].reverse()
      .map((s, i) => ({ i, v: s.mptSec }))
      .filter((p): p is { i: number; v: number } => p.v !== null);
    if (points.length < 2) return;

    const maxV = Math.max(...points.map((p) => p.v), (trend.baselineMpt?.median ?? 0) + 2);
    const x = (i: number) => pad + (i / Math.max(1, sessions.length - 1)) * (W - pad * 2);
    const y = (v: number) => H - pad - (v / maxV) * (H - pad * 2);

    ctx.strokeStyle = 'rgba(148,163,184,0.25)';
    ctx.lineWidth = 1;
    for (let g = 0; g <= 4; g += 1) {
      const gy = pad + (g / 4) * (H - pad * 2);
      ctx.beginPath(); ctx.moveTo(pad, gy); ctx.lineTo(W - pad, gy); ctx.stroke();
    }

    // The reference line is this patient's own control limit, never a
    // population cutoff - absolute values are not portable across devices.
    if (trend.baselineMpt) {
      ctx.save();
      ctx.setLineDash([5, 4]);
      ctx.strokeStyle = 'rgba(239,68,68,0.7)';
      ctx.beginPath();
      ctx.moveTo(pad, y(trend.baselineMpt.controlLimit));
      ctx.lineTo(W - pad, y(trend.baselineMpt.controlLimit));
      ctx.stroke();
      ctx.restore();
    }

    ctx.strokeStyle = '#0f766e';
    ctx.lineWidth = 2;
    ctx.beginPath();
    points.forEach((p, idx) => (idx === 0 ? ctx.moveTo(x(p.i), y(p.v)) : ctx.lineTo(x(p.i), y(p.v))));
    ctx.stroke();

    for (const p of points) {
      const below = trend.baselineMpt ? p.v < trend.baselineMpt.controlLimit : false;
      ctx.fillStyle = below ? '#ef4444' : '#0f766e';
      ctx.beginPath(); ctx.arc(x(p.i), y(p.v), 3.5, 0, Math.PI * 2); ctx.fill();
    }
  }, [sessions, trend]);

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(sessions, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `voice-sessions-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (sessions.length === 0) {
    return (
      <div className="clinical-card text-sm opacity-75">
        {hi ? 'अभी कोई रिकॉर्डिंग नहीं है।' : 'No recordings yet.'}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="clinical-card">
        <p className="text-sm leading-relaxed">{generateVoiceInsight(trend, hi ? 'hi' : 'en')}</p>
      </div>

      <div className="clinical-card">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm">{hi ? 'सबसे लंबा स्वर, समय के साथ' : 'Longest note, over time'}</h3>
          <button type="button" onClick={exportJson} className="btn-outline text-xs">
            <Download className="w-3.5 h-3.5" aria-hidden /> {hi ? 'निर्यात' : 'Export'}
          </button>
        </div>
        {sessions.length < 2 ? (
          <p className="text-sm opacity-70">
            {hi ? 'ग्राफ़ के लिए कम से कम दो रिकॉर्डिंग चाहिए।' : 'At least two recordings are needed to draw a chart.'}
          </p>
        ) : (
          <>
            <canvas ref={canvasRef} width={800} height={200} className="w-full rounded-xl" />
            {trend.baselineMpt && (
              <p className="mt-2 text-xs opacity-70">
                {hi
                  ? `लाल रेखा आपकी अपनी सीमा है (${trend.baselineMpt.controlLimit.toFixed(1)}s), आपकी पहली ${trend.baselineMpt.n} रिकॉर्डिंग से निकाली गई।`
                  : `The red line is your own limit (${trend.baselineMpt.controlLimit.toFixed(1)}s), derived from your first ${trend.baselineMpt.n} recordings.`}
              </p>
            )}
          </>
        )}
        {sessions.length < MIN_SESSIONS_FOR_ACOUSTIC && (
          <p className="mt-2 text-xs opacity-70">
            {hi
              ? 'आधार रेखा बनने तक बदलावों पर नज़र नहीं रखी जाती।'
              : 'Changes are not tracked until your baseline is established.'}
          </p>
        )}
      </div>

      <div className="clinical-card overflow-x-auto thin-scroll">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left opacity-60 text-xs">
              <th className="pb-2 pr-4">{hi ? 'तारीख' : 'Date'}</th>
              <th className="pb-2 pr-4">{hi ? 'स्वर (s)' : 'Note (s)'}</th>
              <th className="pb-2 pr-4">{hi ? 'स्थिरता (dB)' : 'Steadiness (dB)'}</th>
              <th className="pb-2 pr-4">{hi ? 'गति (/s)' : 'Rate (/s)'}</th>
              <th className="pb-2">{hi ? 'नोट' : 'Notes'}</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((s) => (
              <tr key={s.id} className="border-t border-slate-100 dark:border-slate-800">
                <td className="py-2 pr-4 whitespace-nowrap">{s.date}</td>
                <td className="py-2 pr-4 tabular-nums">{s.mptSec?.toFixed(1) ?? '--'}</td>
                <td className="py-2 pr-4 tabular-nums">{s.cppsDb?.toFixed(1) ?? '--'}</td>
                <td className="py-2 pr-4 tabular-nums">{s.ddkAmrRate?.toFixed(1) ?? '--'}</td>
                <td className="py-2 text-xs opacity-70">
                  {s.symptoms.length > 0 && <span className="badge badge-amber mr-1">{s.symptoms.length}</span>}
                  {s.qualityFlags.join(', ')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
