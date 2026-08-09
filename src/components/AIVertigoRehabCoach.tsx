'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Camera, Pause, RefreshCw, AlertTriangle, Sparkles, Volume2, VolumeX,
  Crosshair, Save, Check, Gauge, Flame, ArrowRightLeft, ArrowUpDown, CornerUpRight,
  Activity, ShieldAlert, CircleDot, WifiOff, Info, Maximize2, Minimize2,
} from 'lucide-react';
import Link from 'next/link';
import { useAppData } from '@/lib/app-data-context';
import {
  EXERCISES, exerciseById, repConfigFor, createRepState, stepRepCounter,
  scoreSession, coachingCue, relativePose, smoothPose, clamp,
  createPoseSmoothingState,
  CERVICAL_ROM_LIMIT, VOR_MIN_VELOCITY, VOR_TARGET_VELOCITY,
  RED_FLAGS, hasRedFlags,
  loadProfile, saveProfile, loadSessions, saveSession, summariseAdherence,
  type HeadPose, type HeadAxis, type RepCounterState, type CoachCue,
  type VestibularExercise, type VestibularSession, type AdherenceSummary,
  type PoseSmoothingState,
} from '@/lib/vestibular-rx';
import {
  createFaceTracker, openCamera, cameraErrorKey,
  type FaceTracker, type CameraHandle, type TrackedFace,
} from '@/lib/vestibular-tracking';
import { type GazePoint } from '@/lib/gaze-tracking';

type CameraState = 'idle' | 'starting' | 'live' | 'error';
type ModelState = 'idle' | 'loading' | 'ready' | 'failed';

const AXIS_ICON: Record<HeadAxis, React.ElementType> = {
  yaw: ArrowRightLeft,
  pitch: ArrowUpDown,
  roll: CornerUpRight,
};

const AXIS_LABEL: Record<HeadAxis, { en: string; hi: string }> = {
  yaw: { en: 'Yaw · turn', hi: 'यॉ · घुमाव' },
  pitch: { en: 'Pitch · nod', hi: 'पिच · झुकाव' },
  roll: { en: 'Roll · tilt', hi: 'रोल · तिरछा' },
};

const CUE_TEXT: Record<CoachCue, { en: string; hi: string }> = {
  'go-further': {
    en: 'Smooth turn... try moving your head just a little further if comfortable.',
    hi: 'बहुत सुंदर! यदि आरामदायक हो, तो सिर को थोड़ा और आगे घुमाएं।',
  },
  'go-faster': {
    en: 'Keep your eyes locked on the target and speed up your head movement slightly.',
    hi: 'नज़र कार्ड पर बनाए रखें और सिर के घुमाव की गति थोड़ी बढ़ाएं।',
  },
  'slow-down': {
    en: 'Smooth and steady... slow down your head movement just a bit.',
    hi: 'आराम से और स्थिर... सिर की गति को थोड़ा धीमा करें।',
  },
  'return-to-centre': {
    en: 'Now return smoothly back to the centre position.',
    hi: 'अब केंद्र स्थिति में सहजता से वापस आएं।',
  },
  hold: {
    en: 'Hold still right here, excellent stability.',
    hi: 'यहीं स्थिर रहें, बहुत बढ़िया संतुलन।',
  },
  good: {
    en: 'Great rhythm! Keep your gaze locked sharp on the target.',
    hi: 'शानदार लय! नज़र कार्ड पर स्थिर बनाए रखें।',
  },
};

const CAMERA_ERROR_TEXT: Record<string, { en: string; hi: string }> = {
  denied: {
    en: 'Camera permission was refused. Allow camera access for this site in your browser settings, then try again.',
    hi: 'कैमरा अनुमति अस्वीकृत हो गई। ब्राउज़र सेटिंग्स में इस साइट के लिए कैमरा चालू करें और फिर प्रयास करें।',
  },
  'not-found': {
    en: 'No camera was found on this device. The Classic Guide works without one.',
    hi: 'इस डिवाइस पर कोई कैमरा नहीं मिला। क्लासिक गाइड बिना कैमरे के काम करती है।',
  },
  'in-use': {
    en: 'The camera is already in use by another application. Close it and try again.',
    hi: 'कैमरा किसी अन्य ऐप द्वारा उपयोग में है। उसे बंद करके फिर प्रयास करें।',
  },
  insecure: {
    en: 'Browsers only allow camera access over HTTPS or on localhost.',
    hi: 'ब्राउज़र केवल HTTPS या localhost पर ही कैमरा चलाने देते हैं।',
  },
  unknown: {
    en: 'The camera could not be started. Check that no other app is using it.',
    hi: 'कैमरा शुरू नहीं हो सका। जांचें कि कोई अन्य ऐप उसका उपयोग तो नहीं कर रहा।',
  },
};

/** How much of a face's absence we tolerate before saying tracking is lost. */
const FACE_LOST_MS = 700;
/** HUD refresh rate. The tracking loop runs at full frame rate underneath. */
const HUD_HZ = 12;
/** Frames of a still, level head that make up a neutral-pose calibration. */
const CALIBRATION_SAMPLES = 45;
/** Give up rather than leaving the calibration overlay on screen forever. */
const CALIBRATION_TIMEOUT_MS = 10000;

interface Hud {
  pose: HeadPose;
  reps: number;
  peaks: number[];
  velocities: number[];
  phase: RepCounterState['phase'];
  cue: CoachCue;
  fps: number;
  faceVisible: boolean;
  source: TrackedFace['source'] | null;
  /** Live gaze point from iris landmarks (null when no face detected). */
  gazePoint: GazePoint | null;
}

const EMPTY_HUD: Hud = {
  pose: { yaw: 0, pitch: 0, roll: 0 },
  reps: 0,
  peaks: [],
  velocities: [],
  phase: 'neutral',
  cue: 'good',
  fps: 0,
  faceVisible: false,
  source: null,
  gazePoint: null,
};

export const AIVertigoRehabCoach: React.FC = () => {
  const { locale, vestibularMode } = useAppData();
  const hi = locale === 'hi';
  const calm = vestibularMode; // motion sensitivity: suppress looping animations

  const [activeExId, setActiveExId] = useState<string>(EXERCISES[0].id);
  const [targetReps, setTargetReps] = useState<number>(EXERCISES[0].targetReps);
  const [audioEnabled, setAudioEnabled] = useState<boolean>(true);
  const [wideStudio, setWideStudio] = useState<boolean>(true);
  const [cameraState, setCameraState] = useState<CameraState>('idle');
  const [cameraErrorText, setCameraErrorText] = useState<string | null>(null);
  const [modelState, setModelState] = useState<ModelState>('idle');
  const [delegate, setDelegate] = useState<'gpu' | 'cpu' | null>(null);

  const [hud, setHud] = useState<Hud>(EMPTY_HUD);
  const [calibrating, setCalibrating] = useState(false);
  const [calibrationFailed, setCalibrationFailed] = useState(false);
  const [neutralPose, setNeutralPose] = useState<HeadPose | null>(null);

  const [dizzinessBefore, setDizzinessBefore] = useState(4);
  const [dizzinessAfter, setDizzinessAfter] = useState(2);
  const [savedSessionId, setSavedSessionId] = useState<string | null>(null);
  const [adherence, setAdherence] = useState<AdherenceSummary>({
    totalSessions: 0, daysThisWeek: 0, streak: 0, meanRelief: 0, meanQuality: 0,
  });

  const [flagsChecked, setFlagsChecked] = useState<Record<string, boolean>>({});
  const [safetyAcknowledged, setSafetyAcknowledged] = useState(false);

  const exercise = useMemo(() => exerciseById(activeExId), [activeExId]);
  const repConfig = useMemo(() => repConfigFor(exercise), [exercise]);
  const axis: HeadAxis = exercise.axis ?? 'yaw';

  /* ------------------------------------------------------------------ refs */
  // Everything the per-frame loop reads lives in a ref, so the loop is created
  // once per camera session instead of once per React render.
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const trackerRef = useRef<FaceTracker | null>(null);
  const cameraRef = useRef<CameraHandle | null>(null);

  const poseRef = useRef<HeadPose | null>(null);
  const repRef = useRef<RepCounterState>(createRepState());
  const cueRef = useRef<CoachCue>('good');
  const fpsRef = useRef(0);
  const lastFaceAtRef = useRef(0);
  const sourceRef = useRef<TrackedFace['source'] | null>(null);
  const gazePointRef = useRef<GazePoint | null>(null);
  const neutralRef = useRef<HeadPose | null>(null);
  const calibrationSamplesRef = useRef<HeadPose[] | null>(null);
  const calibrationDeadlineRef = useRef(0);

  const exerciseRef = useRef(exercise);
  const configRef = useRef(repConfig);
  const hiRef = useRef(hi);
  const audioRef = useRef(audioEnabled);
  const lastSpokenRef = useRef({ cue: '' as string, at: 0 });

  exerciseRef.current = exercise;
  configRef.current = repConfig;
  hiRef.current = hi;
  audioRef.current = audioEnabled;

  /* --------------------------------------------------------------- speech */
  const speak = useCallback((text: string) => {
    if (!audioRef.current || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = hiRef.current ? 'hi-IN' : 'en-US';
    utterance.rate = 0.92; // Warm, unhurried natural speaking pace
    utterance.pitch = 1.02; // Warm encouraging pitch

    try {
      const voices = window.speechSynthesis.getVoices();
      const naturalVoice = voices.find(
        (v) =>
          v.lang.startsWith(hiRef.current ? 'hi' : 'en') &&
          (v.name.includes('Natural') ||
            v.name.includes('Google') ||
            v.name.includes('Neural') ||
            v.name.includes('Samantha') ||
            v.name.includes('Karen') ||
            v.name.includes('Rishi') ||
            v.name.includes('Heera'))
      );
      if (naturalVoice) utterance.voice = naturalVoice;
    } catch {
      // Fallback to browser synthesis
    }

    window.speechSynthesis.speak(utterance);
  }, []);

  /* ------------------------------------------------------- initial load */
  useEffect(() => {
    const profile = loadProfile();
    if (profile.neutralPose) {
      setNeutralPose(profile.neutralPose);
      neutralRef.current = profile.neutralPose;
    }
    setAdherence(summariseAdherence(loadSessions()));
  }, []);

  /* ------------------------------------------------- load the vision model */
  const ensureModel = useCallback(async (): Promise<FaceTracker | null> => {
    if (trackerRef.current) return trackerRef.current;
    setModelState('loading');
    try {
      const tracker = await createFaceTracker();
      trackerRef.current = tracker;
      setDelegate(tracker.status.delegate);
      setModelState('ready');
      return tracker;
    } catch (err) {
      console.error('[vestibular] face landmarker failed to load', err);
      setModelState('failed');
      return null;
    }
  }, []);

  /* ------------------------------------------------------ session controls */
  const resetReps = useCallback(() => {
    repRef.current = createRepState();
    cueRef.current = 'good';
    setSavedSessionId(null);
    setHud((prev) => ({ ...prev, reps: 0, peaks: [], velocities: [], phase: 'neutral', cue: 'good' }));
  }, []);

  const stopCamera = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    cameraRef.current?.stop();
    cameraRef.current = null;
    calibrationSamplesRef.current = null;
    setCalibrating(false);
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
    setCameraState('idle');
    setHud((prev) => ({ ...prev, faceVisible: false, fps: 0 }));
  }, []);

  const startCamera = useCallback(async () => {
    if (cameraState === 'starting' || cameraState === 'live') return;
    setCameraState('starting');
    setCameraErrorText(null);

    const video = videoRef.current;
    if (!video) {
      setCameraState('error');
      return;
    }

    try {
      cameraRef.current = await openCamera(video);
    } catch (err) {
      const key = cameraErrorKey(err);
      setCameraErrorText(hi ? CAMERA_ERROR_TEXT[key].hi : CAMERA_ERROR_TEXT[key].en);
      setCameraState('error');
      return;
    }

    lastFaceAtRef.current = performance.now();
    setCameraState('live');
    // The model download can run while the patient is still getting framed up.
    void ensureModel();
    speak(
      hi
        ? 'आपका कैमरा तैयार है। आराम से सामने बैठें और कैलिब्रेट करने के लिए स्थिर रहें।'
        : 'Your camera is ready. Sit comfortably facing forward and hold still to calibrate.'
    );
  }, [cameraState, ensureModel, hi, speak]);

  /* --------------------------------------------------------- calibration */
  const startCalibration = useCallback(() => {
    calibrationSamplesRef.current = [];
    calibrationDeadlineRef.current = performance.now() + CALIBRATION_TIMEOUT_MS;
    setCalibrationFailed(false);
    setCalibrating(true);
    speak(hi ? 'सिर सीधा रखें और दो सेकंड स्थिर रहें।' : 'Hold your head level and still for two seconds.');
  }, [hi, speak]);

  const clearCalibration = useCallback(() => {
    neutralRef.current = null;
    setNeutralPose(null);
    saveProfile({ ...loadProfile(), neutralPose: null });
  }, []);

  /* ------------------------------------------------------- the frame loop */
  useEffect(() => {
    if (cameraState !== 'live') return;

    let cancelled = false;
    let frameCount = 0;
    let fpsWindowStart = performance.now();
    let smoothed: HeadPose | null = null;
    let smoothState: PoseSmoothingState = createPoseSmoothingState();

    const loop = () => {
      if (cancelled) return;
      rafRef.current = requestAnimationFrame(loop);

      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState < 2) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const width = video.videoWidth || 640;
      const height = video.videoHeight || 480;
      if (canvas.width !== width) canvas.width = width;
      if (canvas.height !== height) canvas.height = height;

      const now = performance.now();
      frameCount++;
      if (now - fpsWindowStart >= 1000) {
        fpsRef.current = Math.round((frameCount * 1000) / (now - fpsWindowStart));
        frameCount = 0;
        fpsWindowStart = now;
      }

      // 1. Mirrored video, so the patient sees themselves the right way round.
      ctx.save();
      ctx.scale(-1, 1);
      ctx.drawImage(video, -width, 0, width, height);
      ctx.restore();

      // 2. Track.
      const face = trackerRef.current?.detect(video, now, width, height) ?? null;

      if (face) {
        lastFaceAtRef.current = now;
        sourceRef.current = face.source;
        // Store latest gaze point for HUD
        gazePointRef.current = face.gazePoint ?? null;

        if (calibrationSamplesRef.current) {
          calibrationSamplesRef.current.push(face.pose);
          if (calibrationSamplesRef.current.length >= CALIBRATION_SAMPLES) {
            const samples = calibrationSamplesRef.current;
            const avg: HeadPose = {
              yaw: samples.reduce((s, p) => s + p.yaw, 0) / samples.length,
              pitch: samples.reduce((s, p) => s + p.pitch, 0) / samples.length,
              roll: samples.reduce((s, p) => s + p.roll, 0) / samples.length,
            };
            calibrationSamplesRef.current = null;
            neutralRef.current = avg;
            // Angles measured before and after a re-zero are not comparable, so
            // the count starts again rather than mixing two baselines.
            repRef.current = createRepState();
            smoothed = null;
            smoothState = createPoseSmoothingState();
            setNeutralPose(avg);
            setCalibrating(false);
            saveProfile({ ...loadProfile(), neutralPose: avg });
            speak(
              hiRef.current
                ? 'बहुत बढ़िया! कैलिब्रेशन पूरा हुआ। अब आप अपना अभ्यास शुरू कर सकते हैं।'
                : 'Perfect! Baseline calibrated. You are ready to start your exercise.'
            );
          }
        }

        const relative = neutralRef.current ? relativePose(face.pose, neutralRef.current) : face.pose;
        const smoothResult = smoothPose(smoothState, relative, now);
        smoothState = smoothResult.state;
        smoothed = smoothResult.pose;
        poseRef.current = smoothed;

        // 3. Count, but never while calibrating — the patient is holding still.
        if (!calibrationSamplesRef.current) {
          const ex = exerciseRef.current;
          const trackedAxis: HeadAxis = ex.axis ?? 'yaw';
          const value = smoothed[trackedAxis];
          const result = stepRepCounter(repRef.current, configRef.current, value, now);
          repRef.current = result.state;

          if (result.event === 'rep-counted') {
            const reps = result.state.reps;
            if (reps >= ex.targetReps) {
              speak(
                hiRef.current
                  ? `शाबाश! आपने पूरे ${reps} रेप्स का सेट पूरा कर लिया है। थोड़ा विश्राम करें।`
                  : `Wonderful job! You completed the full set of ${reps} repetitions. Take a moment to rest.`
              );
            } else if (reps % 5 === 0) {
              speak(
                hiRef.current
                  ? `${reps} रेप्स पूरे हो गए हैं। इसी लय में आगे बढ़ते रहें!`
                  : `${reps} repetitions done. Keep up that smooth, steady motion!`
              );
            }
          }

          const cue = coachingCue(result.state, configRef.current, ex.velocitySensitive);
          cueRef.current = cue;
          // Only speak a *changed* cue, and never more than once every six seconds.
          if (
            (cue === 'go-further' || cue === 'go-faster' || cue === 'slow-down') &&
            cue !== lastSpokenRef.current.cue &&
            now - lastSpokenRef.current.at > 6000
          ) {
            lastSpokenRef.current = { cue, at: now };
            speak(hiRef.current ? CUE_TEXT[cue].hi : CUE_TEXT[cue].en);
          }
        }

        drawOverlay(ctx, width, height, face, smoothed, exerciseRef.current);
      } else {
        poseRef.current = null;
        drawSearching(ctx, width, height, now - lastFaceAtRef.current > FACE_LOST_MS);

        // Without a face there is nothing to average, so a calibration started
        // off-camera would otherwise leave the overlay up indefinitely.
        if (calibrationSamplesRef.current && now > calibrationDeadlineRef.current) {
          calibrationSamplesRef.current = null;
          setCalibrating(false);
          setCalibrationFailed(true);
        }
      }
    };

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      cancelled = true;
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [cameraState, speak]);

  /* ---------------------------------------------- publish the HUD at 12 Hz */
  useEffect(() => {
    if (cameraState !== 'live') return;
    const id = window.setInterval(() => {
      const state = repRef.current;
      setHud({
        pose: poseRef.current ?? { yaw: 0, pitch: 0, roll: 0 },
        reps: state.reps,
        peaks: state.peaks,
        velocities: state.velocities,
        phase: state.phase,
        cue: cueRef.current,
        fps: fpsRef.current,
        faceVisible: poseRef.current !== null,
        source: sourceRef.current,
        gazePoint: gazePointRef.current,
      });
    }, Math.round(1000 / HUD_HZ));
    return () => window.clearInterval(id);
  }, [cameraState]);

  /* ------------------------------------- pause tracking on a hidden tab */
  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden && typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  /* ----------------------- release the camera and the model on unmount */
  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      cameraRef.current?.stop();
      cameraRef.current = null;
      trackerRef.current?.close();
      trackerRef.current = null;
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
    };
  }, []);

  /* ----------------------------------------------- selecting an exercise */
  const selectExercise = useCallback((id: string) => {
    setActiveExId(id);
    repRef.current = createRepState();
    cueRef.current = 'good';
    lastSpokenRef.current = { cue: '', at: 0 };
    setSavedSessionId(null);
    setHud((prev) => ({ ...prev, reps: 0, peaks: [], velocities: [], phase: 'neutral', cue: 'good' }));
  }, []);

  /* ---------------------------------------------------------- save session */
  const quality = useMemo(
    () =>
      scoreSession(
        { ...createRepState(), peaks: hud.peaks, velocities: hud.velocities },
        exercise.targetAngle,
        exercise.velocitySensitive
      ),
    [hud.peaks, hud.velocities, exercise]
  );

  const handleSaveSession = useCallback(() => {
    const session: VestibularSession = {
      id: crypto.randomUUID(),
      date: new Date().toISOString().slice(0, 10),
      exerciseId: exercise.id,
      reps: hud.reps,
      targetReps: exercise.targetReps,
      meanPeakAngle: quality.meanPeakAngle,
      meanPeakVelocity: quality.meanPeakVelocity,
      qualityScore: quality.score,
      dizzinessBefore,
      dizzinessAfter,
      mode: 'coach',
      createdAt: new Date().toISOString(),
    };
    setAdherence(summariseAdherence(saveSession(session)));
    setSavedSessionId(session.id);
  }, [exercise, hud.reps, quality, dizzinessBefore, dizzinessAfter]);

  const redFlagsPresent = hasRedFlags(flagsChecked);
  const setComplete = hud.reps >= exercise.targetReps;
  const progress = clamp((hud.reps / exercise.targetReps) * 100, 0, 100);
  const limit = CERVICAL_ROM_LIMIT[axis];
  const liveValue = hud.pose[axis];

  /* ------------------------------------------------------------- safety gate */
  if (!safetyAcknowledged) {
    return (
      <div className="max-w-3xl space-y-5">
        <div className="rounded-2xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/50 p-6 space-y-4">
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-6 h-6 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h2 className="font-display font-bold text-lg text-amber-950 dark:text-amber-100">
                {hi ? 'शुरू करने से पहले सुरक्षा जांच' : 'Safety check before you begin'}
              </h2>
              <p className="text-sm text-amber-900 dark:text-amber-200/90 mt-1 leading-relaxed">
                {hi
                  ? 'वेस्टिबुलर व्यायाम केवल तभी सुरक्षित हैं जब चक्कर का कारण भीतरी कान हो। नीचे में से कोई भी लक्षण हो तो पहले डॉक्टर को दिखाएं।'
                  : 'Vestibular exercises are safe only when the dizziness comes from the inner ear. Tick anything that applies to you right now.'}
              </p>
            </div>
          </div>

          <fieldset className="space-y-2">
            <legend className="sr-only">{hi ? 'चेतावनी लक्षण' : 'Red flag symptoms'}</legend>
            {RED_FLAGS.map((flag) => (
              <label
                key={flag.id}
                className="flex items-start gap-3 p-3 rounded-xl bg-white/70 dark:bg-ink-950/50 border border-amber-200 dark:border-amber-900 cursor-pointer hover:border-amber-400 transition-colors"
              >
                <input
                  type="checkbox"
                  checked={!!flagsChecked[flag.id]}
                  onChange={(e) => setFlagsChecked((prev) => ({ ...prev, [flag.id]: e.target.checked }))}
                  className="mt-0.5 w-4 h-4 accent-amber-600 shrink-0"
                />
                <span className="text-sm text-amber-950 dark:text-amber-100">{hi ? flag.hi : flag.en}</span>
              </label>
            ))}
          </fieldset>

          {redFlagsPresent ? (
            <div className="rounded-xl bg-red-600 text-white p-4 space-y-3">
              <p className="text-sm font-semibold leading-relaxed">
                {hi
                  ? 'ये लक्षण भीतरी कान के अलावा किसी और कारण की ओर इशारा कर सकते हैं। कोई व्यायाम या एपली पैंतरा न करें — तुरंत चिकित्सकीय सलाह लें।'
                  : 'These symptoms can point to a cause outside the inner ear. Do not attempt exercises or the Epley manoeuvre — seek medical review now.'}
              </p>
              <Link
                href="/emergency"
                className="inline-flex items-center gap-2 bg-white text-red-700 font-bold text-sm px-4 py-2.5 rounded-xl hover:bg-red-50 transition-colors"
              >
                <ShieldAlert className="w-4 h-4" />
                {hi ? 'आपातकालीन कार्ड खोलें' : 'Open Emergency Card'}
              </Link>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setSafetyAcknowledged(true)}
              className="btn-navy w-full sm:w-auto inline-flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" />
              {hi ? 'इनमें से कोई नहीं — अभ्यास शुरू करें' : 'None of these apply — start the coach'}
            </button>
          )}
        </div>
      </div>
    );
  }

  /* ------------------------------------------------------------------- UI */
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-950 via-navy-900 to-emerald-950 rounded-2xl p-6 md:p-8 text-white shadow-elevated relative overflow-hidden border border-teal-800/40">
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 border border-teal-400/30 text-teal-100 text-xs font-semibold backdrop-blur-sm">
            <Sparkles className={`w-4 h-4 text-teal-300 ${calm ? '' : 'animate-pulse'}`} />
            {hi ? 'एआई वेस्टिबुलर रिहैब कोच' : 'AI Vestibular Rehabilitation Coach'}
          </div>
          <h1 className="font-display text-2xl md:text-3xl font-extrabold tracking-tight">
            {hi ? 'कैमरा-आधारित सिर गति ट्रैकर' : 'Camera head-motion coach'}
          </h1>
          <p className="text-teal-100/90 text-xs md:text-sm leading-relaxed">
            {hi
              ? 'कैमरा आपके सिर के यॉ, पिच और रोल कोण मापता है, गिनती करता है और गति व दायरे पर तुरंत सुधार बताता है। सारा विश्लेषण आपके डिवाइस पर ही होता है — कोई वीडियो अपलोड नहीं होता।'
              : 'The camera measures your head yaw, pitch and roll, counts repetitions, and corrects your range and speed as you go. All analysis runs on this device — no video ever leaves it.'}
          </p>
          {/* AI Gaze Analytics link */}
          <div className="pt-1">
            <Link
              href="/rehab/vestibular/analytics"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-500/20 hover:bg-teal-500/30 border border-teal-400/30 text-teal-100 text-xs font-bold transition-all"
            >
              <Activity className="w-3.5 h-3.5" />
              {hi ? 'AI गेज़ एनालिटिक्स इंजन खोलें →' : 'Open AI Gaze Analytics Engine →'}
            </Link>
          </div>
        </div>
      </div>

      {/* Main Studio Viewport */}
      <div className={wideStudio ? 'space-y-6' : 'grid grid-cols-1 lg:grid-cols-12 gap-6'}>
        {/* Camera studio - Wide Prominent Hero Card */}
        <div className={wideStudio ? 'w-full space-y-5' : 'lg:col-span-7 space-y-5'}>
          <div className="bg-white dark:bg-ink-900 rounded-2xl border border-slate-200 dark:border-ink-800 p-5 shadow-elevated space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 dark:border-ink-800 pb-3">
              <div className="min-w-0">
                <span className="text-xs font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wider block">
                  {exercise.code}
                </span>
                <h2 className="font-display text-lg md:text-xl font-extrabold text-slate-900 dark:text-white">
                  {hi ? exercise.titleHi : exercise.titleEn}
                </h2>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setWideStudio((v) => !v)}
                  title={wideStudio ? (hi ? 'विभाजित दृश्य' : 'Split View') : (hi ? 'चौड़ा दृश्य' : 'Wide Studio')}
                  className={`p-2 rounded-lg border transition-colors ${
                    wideStudio
                      ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
                      : 'bg-slate-100 dark:bg-ink-950 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-ink-800'
                  }`}
                >
                  {wideStudio ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>

                <button
                  type="button"
                  onClick={() => setAudioEnabled((v) => !v)}
                  aria-pressed={audioEnabled}
                  aria-label={
                    audioEnabled
                      ? hi ? 'आवाज़ मार्गदर्शन बंद करें' : 'Mute voice guidance'
                      : hi ? 'आवाज़ मार्गदर्शन चालू करें' : 'Unmute voice guidance'
                  }
                  className={`p-2 rounded-lg border transition-colors ${
                    audioEnabled
                      ? 'bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border-teal-300 dark:border-teal-800'
                      : 'bg-slate-100 dark:bg-ink-950 text-slate-500 border-slate-200 dark:border-ink-800'
                  }`}
                >
                  {audioEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                </button>

                {cameraState === 'live' ? (
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm transition-colors"
                  >
                    <Pause className="w-4 h-4" />
                    {hi ? 'कैमरा बंद करें' : 'Stop camera'}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={startCamera}
                    disabled={cameraState === 'starting'}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white font-bold text-xs shadow-sm transition-colors"
                  >
                    <Camera className="w-4 h-4" />
                    {cameraState === 'starting'
                      ? hi ? 'शुरू हो रहा है…' : 'Starting…'
                      : hi ? 'कैमरा शुरू करें' : 'Start camera'}
                  </button>
                )}
              </div>
            </div>

            {/* Viewport */}
            <div
              className={`relative bg-slate-950 rounded-xl overflow-hidden border border-slate-800 flex items-center justify-center transition-all ${
                wideStudio ? 'aspect-[16/9] md:aspect-[21/9] max-h-[580px] w-full' : 'aspect-video'
              }`}
            >
              {/* The video element is only ever a texture source; the canvas is what the patient sees. */}
              <video ref={videoRef} className="hidden" playsInline muted aria-hidden="true" />
              <canvas
                ref={canvasRef}
                className={`w-full h-full object-cover ${cameraState === 'live' ? '' : 'hidden'}`}
                aria-label={hi ? 'लाइव सिर ट्रैकिंग दृश्य' : 'Live head tracking view'}
              />

              {cameraState !== 'live' && (
                <div className="text-center p-6 space-y-3 max-w-sm">
                  <div className="w-14 h-14 rounded-full bg-slate-800/80 border border-slate-700 flex items-center justify-center mx-auto text-teal-400">
                    <Camera className="w-7 h-7" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-200">
                    {hi ? 'कैमरा तैयार है' : 'Camera standby'}
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {hi
                      ? 'अच्छी रोशनी में बैठें, चेहरा फ्रेम के बीच में रखें और कैमरा शुरू करें।'
                      : 'Sit in even light with your face centred in frame, then start the camera.'}
                  </p>
                </div>
              )}

              {/* HUD */}
              {cameraState === 'live' && (
                <div className="absolute inset-0 pointer-events-none p-3 sm:p-4 flex flex-col justify-between">
                  <div className="flex items-start justify-between gap-2">
                    <span className="px-2.5 py-1 bg-slate-900/85 border border-emerald-500/40 text-emerald-200 text-[11px] font-mono rounded-full backdrop-blur-md">
                      {modelState === 'ready' && hud.faceVisible
                        ? (hi ? 'सक्रिय ट्रैकिंग' : 'TRACKING ACTIVE')
                        : modelState === 'loading'
                        ? (hi ? 'शुरू हो रहा है…' : 'Initializing…')
                        : modelState === 'failed'
                        ? (hi ? 'ट्रैकिंग उपलब्ध नहीं' : 'Tracking unavailable')
                        : (hi ? 'चेहरा खोज रहे हैं…' : 'Searching for face…')}
                    </span>
                    <span className="px-2.5 py-1 bg-slate-900/85 border border-slate-600 text-slate-200 text-[11px] font-mono rounded-full backdrop-blur-md">
                      {hud.fps} FPS
                    </span>
                  </div>

                  <div className="flex items-end justify-between gap-2">
                    <div className="bg-slate-900/90 border border-teal-500/50 px-3 py-2 rounded-xl backdrop-blur-md text-center">
                      <span className="text-[10px] font-bold text-teal-400 uppercase tracking-widest block">
                        {hi ? 'रेप' : 'Reps'}
                      </span>
                      <span className="text-3xl font-extrabold text-teal-300 font-mono">
                        {hud.reps}
                        <span className="text-sm font-normal text-slate-400"> / {exercise.targetReps}</span>
                      </span>
                    </div>

                    <div className="bg-slate-900/90 border border-slate-700 px-2.5 py-2 rounded-xl backdrop-blur-md text-[11px] font-mono space-y-0.5 text-right text-slate-300">
                      <div>
                        Yaw <span className={`font-bold ${axis === 'yaw' ? 'text-teal-300' : 'text-slate-400'}`}>{hud.pose.yaw.toFixed(0)}°</span>
                      </div>
                      <div>
                        Pitch <span className={`font-bold ${axis === 'pitch' ? 'text-teal-300' : 'text-slate-400'}`}>{hud.pose.pitch.toFixed(0)}°</span>
                      </div>
                      <div>
                        Roll <span className={`font-bold ${axis === 'roll' ? 'text-teal-300' : 'text-slate-400'}`}>{hud.pose.roll.toFixed(0)}°</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {calibrating && (
                <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center text-center p-6">
                  <div className="space-y-2">
                    <Crosshair className={`w-8 h-8 text-teal-300 mx-auto ${calm ? '' : 'animate-pulse'}`} />
                    <p className="text-sm font-bold text-white">
                      {hi ? 'सिर सीधा रखकर स्थिर रहें' : 'Hold your head level and still'}
                    </p>
                    <p className="text-xs text-slate-300">
                      {hi ? 'यही स्थिति आपका शून्य बिंदु बनेगी।' : 'This position becomes your zero point.'}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Camera / model problems */}
            {cameraErrorText && (
              <div role="alert" className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 text-xs rounded-xl flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                <span>{cameraErrorText}</span>
              </div>
            )}

            {modelState === 'failed' && (
              <div role="alert" className="p-3 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-900 text-amber-900 dark:text-amber-200 text-xs rounded-xl flex items-start gap-2">
                <WifiOff className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                <span>
                  {hi
                    ? 'फेस ट्रैकिंग मॉडल डाउनलोड नहीं हो सका (इसे इंटरनेट चाहिए)। कोण मापे बिना गिनती दिखाना भ्रामक होगा, इसलिए ट्रैकिंग बंद है — क्लासिक गाइड का टाइमर और चेकलिस्ट उपयोग करें।'
                    : 'The face-tracking model could not be downloaded — it needs internet on first use. Showing repetition counts without real angle measurement would be misleading, so tracking stays off. Use the Classic Guide timer and checklist instead.'}
                </span>
              </div>
            )}

            {calibrationFailed && (
              <div role="alert" className="p-3 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-900 text-amber-900 dark:text-amber-200 text-xs rounded-xl flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                <span>
                  {hi
                    ? 'कैलिब्रेशन नहीं हो सका — पूरे समय चेहरा फ्रेम में नहीं रहा। रोशनी बेहतर करके फिर प्रयास करें।'
                    : 'Calibration timed out — your face was not in frame throughout. Improve the lighting, centre your face, and try again.'}
                </span>
              </div>
            )}

            {/* Calibration + reset */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={startCalibration}
                disabled={cameraState !== 'live' || calibrating}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-teal-300 dark:border-teal-800 bg-teal-50 dark:bg-teal-950/50 text-teal-800 dark:text-teal-200 font-bold text-xs disabled:opacity-50 transition-colors hover:bg-teal-100 dark:hover:bg-teal-900/60"
              >
                <Crosshair className="w-3.5 h-3.5" />
                {hi ? 'शून्य बिंदु सेट करें' : 'Calibrate neutral'}
              </button>

              {neutralPose && (
                <span className="inline-flex items-center gap-1.5 text-[11px] font-mono text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-ink-950 border border-slate-200 dark:border-ink-800 px-2.5 py-1.5 rounded-lg">
                  <CircleDot className="w-3 h-3 text-emerald-500" />
                  {hi ? 'शून्य' : 'zero'} {neutralPose.yaw.toFixed(0)}/{neutralPose.pitch.toFixed(0)}/{neutralPose.roll.toFixed(0)}°
                  <button
                    type="button"
                    onClick={clearCalibration}
                    className="ml-1 underline hover:text-rose-600"
                  >
                    {hi ? 'हटाएं' : 'clear'}
                  </button>
                </span>
              )}

              <button
                type="button"
                onClick={resetReps}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 dark:border-ink-800 bg-slate-100 dark:bg-ink-950 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-200 dark:hover:bg-ink-800 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                {hi ? 'गिनती रीसेट' : 'Reset count'}
              </button>
            </div>

            {/* Progress + live gauge */}
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                  <span>{hi ? 'सेट की प्रगति' : 'Set progress'}</span>
                  <span className="font-mono">{hud.reps}/{exercise.targetReps}</span>
                </div>
                <div
                  className="h-2.5 bg-slate-100 dark:bg-ink-950 rounded-full overflow-hidden"
                  role="progressbar"
                  aria-valuenow={hud.reps}
                  aria-valuemin={0}
                  aria-valuemax={exercise.targetReps}
                  aria-label={hi ? 'सेट की प्रगति' : 'Set progress'}
                >
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${setComplete ? 'bg-emerald-500' : 'bg-teal-600'}`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              {/* Live axis meter — the target band is what the patient is aiming at */}
              <div>
                <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                  <span>{hi ? AXIS_LABEL[axis].hi : AXIS_LABEL[axis].en}</span>
                  <span className="font-mono">
                    {liveValue.toFixed(0)}° {hi ? 'लक्ष्य' : 'target'} ±{exercise.targetAngle}°
                  </span>
                </div>
                <div className="relative h-8 bg-slate-100 dark:bg-ink-950 rounded-lg border border-slate-200 dark:border-ink-800 overflow-hidden">
                  {/* Target zones: everything beyond ±targetAngle, on both sides. */}
                  {([-1, 1] as const).map((sign) => (
                    <div
                      key={sign}
                      className="absolute inset-y-0 bg-emerald-500/25"
                      style={{
                        left: sign === -1 ? '0%' : `${(exercise.targetAngle / (2 * limit) + 0.5) * 100}%`,
                        width: `${((limit - exercise.targetAngle) / (2 * limit)) * 100}%`,
                      }}
                    />
                  ))}
                  {/* centre line */}
                  <div className="absolute inset-y-0 left-1/2 w-px bg-slate-400/60 dark:bg-slate-600" />
                  {/* needle */}
                  <div
                    className="absolute inset-y-1 w-1.5 rounded-full bg-teal-600 dark:bg-teal-400 transition-[left] duration-75"
                    style={{ left: `calc(${(clamp(liveValue, -limit, limit) / (2 * limit) + 0.5) * 100}% - 3px)` }}
                  />
                </div>
              </div>
            </div>

            {/* Coaching cue */}
            <div
              aria-live="polite"
              className={`p-3 rounded-xl border flex items-center gap-3 ${
                setComplete
                  ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-800'
                  : 'bg-teal-50/70 dark:bg-teal-950/40 border-teal-200 dark:border-teal-900'
              }`}
            >
              <Sparkles className="w-5 h-5 text-teal-600 dark:text-teal-400 shrink-0" aria-hidden="true" />
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700 dark:text-teal-400 block">
                  {hi ? 'कोच' : 'Coach'}
                </span>
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  {setComplete
                    ? hi ? 'सेट पूरा हुआ — नीचे सत्र सहेजें।' : 'Set complete — log the session below.'
                    : cameraState !== 'live'
                    ? hi ? 'शुरू करने के लिए कैमरा चालू करें।' : 'Start the camera to begin.'
                    : !hud.faceVisible
                    ? hi ? 'चेहरा फ्रेम में लाएं।' : 'Bring your face into frame.'
                    : hi ? CUE_TEXT[hud.cue].hi : CUE_TEXT[hud.cue].en}
                </span>
              </div>
            </div>

            {/* Live quality metrics */}
            <dl className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { label: hi ? 'गुणवत्ता' : 'Quality', value: `${quality.score}`, suffix: '/100' },
                { label: hi ? 'औसत दायरा' : 'Mean range', value: `${quality.meanPeakAngle}`, suffix: '°' },
                {
                  label: hi ? 'औसत गति' : 'Mean speed',
                  value: `${quality.meanPeakVelocity}`,
                  suffix: '°/s',
                  warn: exercise.velocitySensitive && quality.meanPeakVelocity > 0 && quality.meanPeakVelocity < VOR_MIN_VELOCITY,
                },
                { label: hi ? 'एकरूपता' : 'Consistency', value: `${quality.consistency}`, suffix: '%' },
              ].map((metric) => (
                <div
                  key={metric.label}
                  className={`rounded-xl border p-2.5 text-center ${
                    metric.warn
                      ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-900'
                      : 'bg-slate-50 dark:bg-ink-950 border-slate-200 dark:border-ink-800'
                  }`}
                >
                  <dd className="font-mono font-bold text-lg text-navy-800 dark:text-teal-300">
                    {metric.value}
                    <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400">{metric.suffix}</span>
                  </dd>
                  <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {metric.label}
                  </dt>
                </div>
              ))}
            </dl>

            {exercise.velocitySensitive && (
              <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-start gap-1.5">
                <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" aria-hidden="true" />
                {hi
                  ? `गेज़ स्टेबिलाइजेशन तभी असर करता है जब सिर की गति लगभग ${VOR_MIN_VELOCITY}°/सेकंड से ऊपर हो — लक्ष्य ${VOR_TARGET_VELOCITY}°/सेकंड है, बशर्ते अक्षर स्पष्ट रहे।`
                  : `Gaze stabilisation only drives adaptation above roughly ${VOR_MIN_VELOCITY}°/s — aim for ${VOR_TARGET_VELOCITY}°/s, but never past the speed at which the target blurs.`}
              </p>
            )}

            {/* Session log */}
            <div className="pt-4 border-t border-slate-100 dark:border-ink-800 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <DizzinessSlider
                  id="coach-dizziness-before"
                  label={hi ? 'सत्र से पहले चक्कर (0-10)' : 'Dizziness before (0-10)'}
                  value={dizzinessBefore}
                  onChange={setDizzinessBefore}
                  accent="teal"
                />
                <DizzinessSlider
                  id="coach-dizziness-after"
                  label={hi ? 'सत्र के बाद चक्कर (0-10)' : 'Dizziness after (0-10)'}
                  value={dizzinessAfter}
                  onChange={setDizzinessAfter}
                  accent="emerald"
                />
              </div>

              <button
                type="button"
                onClick={handleSaveSession}
                disabled={hud.reps === 0 || savedSessionId !== null}
                className="btn-navy w-full inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {savedSessionId ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                {savedSessionId
                  ? hi ? 'सत्र सहेजा गया' : 'Session saved'
                  : hud.reps === 0
                  ? hi ? 'सहेजने के लिए कम से कम एक रेप करें' : 'Complete at least one rep to save'
                  : hi ? 'सत्र सहेजें' : 'Save this session'}
              </button>
            </div>
          </div>

          {/* Privacy note — patients ask, and they deserve a straight answer */}
          <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-start gap-1.5 px-1">
            <Gauge className="w-3.5 h-3.5 shrink-0 mt-0.5" aria-hidden="true" />
            {hi
              ? 'वीडियो केवल इसी ब्राउज़र में प्रोसेस होता है और कहीं नहीं भेजा जाता। केवल गिने हुए अंक (रेप, कोण, गति) इसी डिवाइस पर सहेजे जाते हैं।'
              : 'Video is processed entirely inside this browser and is never uploaded. Only the derived numbers — reps, angles, speed — are stored, and only on this device.'}
          </p>
        </div>

        {/* Prescribed Drills Catalogue & Adherence (Rendered below in Wide Mode, or side-by-side in Split View) */}
        <div className={wideStudio ? 'grid grid-cols-1 lg:grid-cols-12 gap-6 pt-4' : 'lg:col-span-5 space-y-4'}>
          <div className={wideStudio ? 'lg:col-span-8 space-y-4' : 'space-y-4'}>
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Activity className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                {hi ? 'निर्धारित अभ्यास' : 'Prescribed drills'}
              </h2>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-ink-900 px-2.5 py-1 rounded-full border border-slate-200 dark:border-ink-800">
                {EXERCISES.length} {hi ? 'अभ्यास' : 'drills'}
              </span>
            </div>

            <ul className={wideStudio ? 'grid grid-cols-1 sm:grid-cols-2 gap-3' : 'space-y-3'} role="list">
              {EXERCISES.map((ex) => {
                const selected = ex.id === activeExId;
                const Icon = ex.axis ? AXIS_ICON[ex.axis] : Crosshair;
                return (
                  <li key={ex.id}>
                    <button
                      type="button"
                      onClick={() => selectExercise(ex.id)}
                      aria-pressed={selected}
                      className={`w-full text-left p-4 rounded-xl border transition-all ${
                        selected
                          ? 'bg-gradient-to-r from-teal-50 to-emerald-50 dark:from-teal-950/60 dark:to-emerald-950/40 border-teal-500 shadow-card ring-2 ring-teal-500/20'
                          : 'bg-white dark:bg-ink-900 border-slate-200 dark:border-ink-800 hover:border-teal-300 dark:hover:border-teal-700'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span
                          className={`p-3 rounded-lg shrink-0 ${
                            selected
                              ? 'bg-teal-600 text-white'
                              : 'bg-slate-100 dark:bg-ink-950 text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          <Icon className="w-5 h-5" aria-hidden="true" />
                        </span>

                        <span className="flex-1 min-w-0 block">
                          <span className="flex items-center justify-between gap-2">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-teal-700 dark:text-teal-400">
                              {ex.code}
                            </span>
                            {ex.axis && (
                              <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-ink-950 px-2 py-0.5 rounded">
                                {hi ? AXIS_LABEL[ex.axis].hi : AXIS_LABEL[ex.axis].en}
                              </span>
                            )}
                          </span>

                          <span className="block text-sm font-bold text-slate-900 dark:text-white mt-1">
                            {hi ? ex.titleHi : ex.titleEn}
                          </span>
                          <span className="block text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed line-clamp-2">
                            {hi ? ex.descHi : ex.descEn}
                          </span>

                          <span className="mt-2.5 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-200/70 dark:border-ink-800">
                            <span className="font-mono">
                              ±{ex.targetAngle}° · {ex.targetReps} {hi ? 'रेप' : 'reps'}
                              {ex.velocitySensitive ? ` · ≥${VOR_MIN_VELOCITY}°/s` : ''}
                            </span>
                            {selected && (
                              <span className="font-bold text-teal-700 dark:text-teal-400">
                                {hi ? 'चयनित' : 'Active'}
                              </span>
                            )}
                          </span>
                        </span>
                      </div>

                      {ex.cautionEn && (
                        <span className="mt-3 flex items-start gap-2 text-[11px] text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-lg p-2">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" aria-hidden="true" />
                          {hi ? ex.cautionHi : ex.cautionEn}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Adherence */}
          <div className={wideStudio ? 'lg:col-span-4 space-y-4' : 'space-y-4'}>
            <div className="bg-white dark:bg-ink-900 rounded-2xl border border-slate-200 dark:border-ink-800 p-5 space-y-3">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Flame className="w-4 h-4 text-orange-500" />
                {hi ? 'आपकी नियमितता' : 'Your adherence'}
              </h3>
              <dl className="grid grid-cols-2 gap-2 text-center">
                {[
                  { label: hi ? 'लगातार दिन' : 'Day streak', value: adherence.streak },
                  { label: hi ? 'इस हफ्ते' : 'This week', value: `${adherence.daysThisWeek}/7` },
                  { label: hi ? 'कुल सत्र' : 'Sessions', value: adherence.totalSessions },
                  { label: hi ? 'औसत राहत' : 'Mean relief', value: `${adherence.meanRelief > 0 ? '−' : ''}${Math.abs(adherence.meanRelief)}` },
                ].map((stat) => (
                  <div key={stat.label} className="rounded-xl bg-slate-50 dark:bg-ink-950 border border-slate-200 dark:border-ink-800 p-2.5">
                    <dd className="font-mono font-bold text-lg text-navy-800 dark:text-teal-300">{stat.value}</dd>
                    <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mt-0.5">
                      {stat.label}
                    </dt>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ----------------------------------------------------------- sub-components */

const DizzinessSlider: React.FC<{
  id: string;
  label: string;
  value: number;
  onChange: (v: number) => void;
  accent: 'teal' | 'emerald';
}> = ({ id, label, value, onChange, accent }) => (
  <div>
    <label htmlFor={id} className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider block mb-1.5">
      {label}
    </label>
    <div className="flex items-center gap-3">
      <input
        id={id}
        type="range"
        min={0}
        max={10}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={`w-full cursor-pointer ${accent === 'teal' ? 'accent-teal-600' : 'accent-emerald-600'}`}
      />
      <span
        className={`font-mono font-extrabold text-sm w-9 text-center px-2 py-0.5 rounded border ${
          accent === 'teal'
            ? 'bg-teal-50 dark:bg-teal-950/60 border-teal-200 dark:border-teal-800 text-teal-900 dark:text-teal-200'
            : 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
        }`}
      >
        {value}
      </span>
    </div>
  </div>
);

/* --------------------------------------------------------- canvas painting */

function drawSearching(ctx: CanvasRenderingContext2D, width: number, height: number, lost: boolean) {
  if (!lost) return;
  const boxW = Math.min(width * 0.45, 420);
  const boxH = boxW * 1.25;
  ctx.strokeStyle = 'rgba(250, 204, 21, 0.85)';
  ctx.lineWidth = 3;
  ctx.setLineDash([14, 10]);
  ctx.strokeRect((width - boxW) / 2, (height - boxH) / 2, boxW, boxH);
  ctx.setLineDash([]);
}

function drawOverlay(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  face: TrackedFace,
  pose: HeadPose,
  exercise: VestibularExercise
) {
  const { anchors, points } = face;

  // Landmark cloud — enough to show the mesh is locked on, not so much it hides the face.
  ctx.fillStyle = 'rgba(45, 212, 191, 0.55)';
  for (const p of points) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 1.6, 0, Math.PI * 2);
    ctx.fill();
  }

  // Key structural lines.
  ctx.strokeStyle = '#10b981';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(anchors.leftContour.x, anchors.leftContour.y);
  ctx.lineTo(anchors.nose.x, anchors.nose.y);
  ctx.lineTo(anchors.rightContour.x, anchors.rightContour.y);
  ctx.moveTo(anchors.leftEye.x, anchors.leftEye.y);
  ctx.lineTo(anchors.rightEye.x, anchors.rightEye.y);
  ctx.moveTo(anchors.forehead.x, anchors.forehead.y);
  ctx.lineTo(anchors.chin.x, anchors.chin.y);
  ctx.stroke();

  for (const [point, colour] of [
    [anchors.nose, '#f43f5e'],
    [anchors.leftEye, '#38bdf8'],
    [anchors.rightEye, '#38bdf8'],
    [anchors.chin, '#f59e0b'],
  ] as const) {
    ctx.fillStyle = colour;
    ctx.beginPath();
    ctx.arc(point.x, point.y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  drawPoseGizmo(ctx, anchors.nose, pose, Math.abs(anchors.rightContour.x - anchors.leftContour.x) * 0.55);
  drawAxisDial(ctx, width, height, pose, exercise);
}

/** A three-axis gizmo pinned to the nose, so the measured pose is visibly the head's pose. */
function drawPoseGizmo(ctx: CanvasRenderingContext2D, origin: { x: number; y: number }, pose: HeadPose, size: number) {
  const rad = Math.PI / 180;
  const cy = Math.cos(pose.yaw * rad);
  const sy = Math.sin(pose.yaw * rad);
  const cp = Math.cos(pose.pitch * rad);
  const sp = Math.sin(pose.pitch * rad);
  const cr = Math.cos(pose.roll * rad);
  const sr = Math.sin(pose.roll * rad);

  // Columns of the YXZ rotation matrix, projected orthographically onto the canvas.
  const axes: Array<[number, number, string]> = [
    [cy * cr + sy * sp * sr, cp * sr, '#f43f5e'], // X — through the ears
    [sy * sp * cr - cy * sr, cp * cr, '#22c55e'], // Y — through the crown
    [sy * cp, -sp, '#3b82f6'], // Z — out of the nose
  ];

  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  for (const [dx, dy, colour] of axes) {
    ctx.strokeStyle = colour;
    ctx.beginPath();
    ctx.moveTo(origin.x, origin.y);
    // Canvas y grows downward, so the projected y is negated.
    ctx.lineTo(origin.x + dx * size, origin.y - dy * size);
    ctx.stroke();
  }
  ctx.lineCap = 'butt';
}

/** A dial along the bottom showing the tracked axis, its target zones, and the live needle. */
function drawAxisDial(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  pose: HeadPose,
  exercise: VestibularExercise
) {
  const axis: HeadAxis = exercise.axis ?? 'yaw';
  const limit = CERVICAL_ROM_LIMIT[axis];
  const value = clamp(pose[axis], -limit, limit);

  const trackW = Math.min(width * 0.72, 620);
  const x0 = (width - trackW) / 2;
  const y = height - Math.max(34, height * 0.08);
  const toX = (deg: number) => x0 + ((deg + limit) / (2 * limit)) * trackW;

  // Track
  ctx.strokeStyle = 'rgba(15, 23, 42, 0.55)';
  ctx.lineWidth = 14;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x0, y);
  ctx.lineTo(x0 + trackW, y);
  ctx.stroke();

  // Target zones, one either side of centre
  ctx.strokeStyle = 'rgba(16, 185, 129, 0.65)';
  ctx.lineWidth = 14;
  for (const sign of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(toX(sign * exercise.targetAngle), y);
    ctx.lineTo(toX(sign * limit), y);
    ctx.stroke();
  }
  ctx.lineCap = 'butt';

  // Centre tick
  ctx.strokeStyle = 'rgba(226, 232, 240, 0.9)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(toX(0), y - 12);
  ctx.lineTo(toX(0), y + 12);
  ctx.stroke();

  // Needle — green once inside the target zone
  const inTarget = Math.abs(value) >= exercise.targetAngle;
  ctx.fillStyle = inTarget ? '#22c55e' : '#f43f5e';
  ctx.beginPath();
  ctx.arc(toX(value), y, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Readout
  ctx.font = 'bold 15px ui-monospace, monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#e2e8f0';
  ctx.fillText(`${axis.toUpperCase()} ${value.toFixed(0)}°`, width / 2, y - 22);
  ctx.textAlign = 'left';
}
