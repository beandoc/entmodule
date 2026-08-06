'use client';

/**
 * AIGazeAnalyticsEngine — Premium AI analytics dashboard for vestibular gaze tracking.
 *
 * Three tabs:
 *  1. Live Gaze Studio   – real-time camera + gaze crosshair + VOR ring
 *  2. Session Analytics  – post-session scanpath, saccade histogram, VOR breakdown
 *  3. Longitudinal       – multi-session VOR trend, adherence heatmap
 *
 * All processing is on-device using the existing MediaPipe FaceLandmarker
 * (with refineLandmarks: true enabling iris landmark indices 468–477).
 */

import React, {
  useCallback, useEffect, useMemo, useRef, useState,
} from 'react';
import {
  Eye, EyeOff, Camera, Activity, TrendingUp, Brain,
  AlertTriangle, CheckCircle2, Zap, Target, BarChart3,
  ChevronRight, Play, Pause, RefreshCw, Download,
  Crosshair, Gauge, Info, Sparkles, WifiOff,
} from 'lucide-react';
import { useAppData } from '@/lib/app-data-context';
import {
  createFaceTracker, openCamera, cameraErrorKey,
  type FaceTracker, type CameraHandle,
} from '@/lib/vestibular-tracking';
import {
  detectFixations, detectSaccades, scoreVOR, detectNystagmusHeuristic,
  computeAntiSaccadeErrorRate, generateInsight, scoreSmoothPursuit,
  loadGazeSessions, saveGazeSession, summariseGazeAdherence,
  solve5PointCalibration, GazeStabilizer,
  type GazePoint, type GazeAnalytics, type GazeSession,
  type VORScore, type Fixation, type Saccade, type NystagmusFlag,
  type PursuitTargetPoint, type PursuitScore,
  type CalibrationCoefficients, type CalibrationPointSample,
} from '@/lib/gaze-tracking';

/* ============================================================ types */

type Tab = 'live' | 'pursuit' | 'session' | 'longitudinal';
type CameraState = 'idle' | 'starting' | 'live' | 'error';

interface LiveData {
  gazeX: number;
  gazeY: number;
  hasIris: boolean;
  leftIris: { x: number; y: number } | null;
  rightIris: { x: number; y: number } | null;
  faceVisible: boolean;
  fps: number;
  rawOffsetX?: number;
  rawOffsetY?: number;
  confidence?: number;
  isBlink?: boolean;
  is5PointCalibrated?: boolean;
}

interface SessionData {
  gazeHistory: GazePoint[];
  headHistory: Array<{ t: number; yaw: number }>;
  analytics: GazeAnalytics | null;
  durationMs: number;
}

const EMPTY_LIVE: LiveData = {
  gazeX: 0.5, gazeY: 0.5, hasIris: false,
  leftIris: null, rightIris: null,
  faceVisible: false, fps: 0,
  rawOffsetX: 0, rawOffsetY: 0,
  confidence: 0, isBlink: false, is5PointCalibrated: false,
};

const EMPTY_SESSION: SessionData = {
  gazeHistory: [], headHistory: [], analytics: null, durationMs: 0,
};

/* ============================================================ colour helpers */
const VOR_COLOUR = (gain: number) =>
  gain >= 0.9 ? '#10b981' : gain >= 0.7 ? '#22c55e' : gain >= 0.5 ? '#f59e0b' : '#ef4444';

/* ============================================================ component */
export const AIGazeAnalyticsEngine: React.FC = () => {
  const { locale } = useAppData();
  const hi = locale === 'hi';

  const [tab, setTab] = useState<Tab>('live');
  const [cameraState, setCameraState] = useState<CameraState>('idle');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [modelReady, setModelReady] = useState(false);
  const [modelFailed, setModelFailed] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [liveData, setLiveData] = useState<LiveData>(EMPTY_LIVE);
  const [session, setSession] = useState<SessionData>(EMPTY_SESSION);
  const [nystagmus, setNystagmus] = useState<NystagmusFlag>({ detected: false, frequencyHz: 0, direction: 'none', amplitude: 0 });
  const [liveVOR, setLiveVOR] = useState<VORScore | null>(null);
  const [historySessions, setHistorySessions] = useState<GazeSession[]>([]);
  const [isWizardOpen, setIsWizardOpen] = useState(false);

  /* refs — hot path */
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gazeCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const trackerRef = useRef<FaceTracker | null>(null);
  const cameraRef = useRef<CameraHandle | null>(null);
  const neutralGazeRef = useRef<{ x: number; y: number } | null>(null);
  const calibration5PtRef = useRef<CalibrationCoefficients | null>(null);
  const stabilizerRef = useRef(new GazeStabilizer());
  const gazeHistoryRef = useRef<GazePoint[]>([]);
  const headHistoryRef = useRef<Array<{ t: number; yaw: number }>>([]);
  const recordingRef = useRef(false);
  const sessionStartRef = useRef(0);

  /* ---------------------------------------------------------- load sessions & calibration */
  useEffect(() => {
    setHistorySessions(loadGazeSessions());
    try {
      const savedGaze = localStorage.getItem('dhanwantari-neutral-gaze');
      if (savedGaze) neutralGazeRef.current = JSON.parse(savedGaze);

      const saved5Pt = localStorage.getItem('dhanwantari-5point-calibration');
      if (saved5Pt) {
        const cal = JSON.parse(saved5Pt);
        calibration5PtRef.current = cal;
        stabilizerRef.current.setCalibration(cal);
      }
    } catch {
      // fallback
    }
  }, []);

  const calibrateNeutralGaze = useCallback(() => {
    if (liveData.hasIris) {
      // Record current raw offset as zero baseline
      const rawX = liveData.rawOffsetX ?? 0;
      const rawY = liveData.rawOffsetY ?? 0;
      const offset = { x: rawX, y: rawY };
      neutralGazeRef.current = offset;
      try {
        localStorage.setItem('dhanwantari-neutral-gaze', JSON.stringify(offset));
      } catch {
        // quota
      }
    }
  }, [liveData]);

  const handleSave5PointCalibration = useCallback((samples: CalibrationPointSample[]) => {
    const cal = solve5PointCalibration(samples);
    calibration5PtRef.current = cal;
    stabilizerRef.current.setCalibration(cal);
    try {
      localStorage.setItem('dhanwantari-5point-calibration', JSON.stringify(cal));
    } catch {
      // quota
    }
  }, []);

  /* ---------------------------------------------------------- model */
  const ensureModel = useCallback(async (): Promise<FaceTracker | null> => {
    if (trackerRef.current) return trackerRef.current;
    try {
      const tracker = await createFaceTracker();
      trackerRef.current = tracker;
      setModelReady(true);
      return tracker;
    } catch {
      setModelFailed(true);
      return null;
    }
  }, []);

  /* ---------------------------------------------------------- camera */
  const startCamera = useCallback(async () => {
    if (cameraState === 'starting' || cameraState === 'live') return;
    setCameraState('starting');
    setCameraError(null);
    const video = videoRef.current;
    if (!video) { setCameraState('error'); return; }
    try {
      cameraRef.current = await openCamera(video);
    } catch (err) {
      setCameraError(cameraErrorKey(err));
      setCameraState('error');
      return;
    }
    setCameraState('live');
    void ensureModel();
  }, [cameraState, ensureModel]);

  const stopCamera = useCallback(() => {
    if (rafRef.current !== null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    cameraRef.current?.stop();
    cameraRef.current = null;
    setCameraState('idle');
    setIsRecording(false);
    recordingRef.current = false;
    setLiveData(EMPTY_LIVE);
  }, []);

  /* ---------------------------------------------------------- recording */
  const startRecording = useCallback(() => {
    gazeHistoryRef.current = [];
    headHistoryRef.current = [];
    sessionStartRef.current = performance.now();
    recordingRef.current = true;
    setIsRecording(true);
    setSession(EMPTY_SESSION);
    setLiveVOR(null);
  }, []);

  const stopRecording = useCallback(() => {
    recordingRef.current = false;
    setIsRecording(false);

    const gaze = [...gazeHistoryRef.current];
    const head = [...headHistoryRef.current];
    const durationMs = performance.now() - sessionStartRef.current;

    if (gaze.length < 10) {
      setSession(prev => ({ ...prev, analytics: null, durationMs }));
      return;
    }

    // Run analytics pipeline
    const fixations = detectFixations(gaze);
    const saccades = detectSaccades(gaze);
    const vorScore = head.length > 4 ? scoreVOR(gaze, head) : null;
    const nyst = detectNystagmusHeuristic(gaze);
    const antiSaccadeErrorRate = computeAntiSaccadeErrorRate(saccades, head);

    const meanFixationDuration = fixations.length > 0
      ? fixations.reduce((s, f) => s + f.duration, 0) / fixations.length : 0;
    const meanSaccadeVelocity = saccades.length > 0
      ? saccades.reduce((s, sa) => s + sa.peakVelocityDeg, 0) / saccades.length : 0;
    const totalDuration = gaze.length > 1 ? gaze[gaze.length - 1].t - gaze[0].t : 0;
    const fixationFraction = totalDuration > 0
      ? fixations.reduce((s, f) => s + f.duration, 0) / totalDuration : 0;

    const analytics: GazeAnalytics = {
      fixations, saccades, vorScore, nystagmus: nyst,
      meanFixationDuration, meanSaccadeVelocity,
      antiSaccadeErrorRate, fixationFraction, insight: '',
    };
    analytics.insight = generateInsight(analytics, hi ? 'hi' : 'en');

    setNystagmus(nyst);
    setLiveVOR(vorScore);
    setSession({ gazeHistory: gaze, headHistory: head, analytics, durationMs });

    // Persist
    const saved: GazeSession = {
      id: crypto.randomUUID(),
      date: new Date().toISOString().slice(0, 10),
      exerciseId: 'gaze-session',
      analytics,
      durationMs,
      createdAt: new Date().toISOString(),
    };
    const all = saveGazeSession(saved);
    setHistorySessions(all);

    // Auto-switch to session tab
    setTab('session');
  }, [hi]);

  /* ---------------------------------------------------------- frame loop */
  useEffect(() => {
    if (cameraState !== 'live') return;

    let cancelled = false;
    let frameCount = 0;
    let fpsWindowStart = performance.now();
    let fpsVal = 0;
    let hudTimer = 0;

    // Rolling buffer for live VOR computation (last 3 s)
    const LIVE_VOR_WINDOW_MS = 3000;

    const loop = () => {
      if (cancelled) return;
      rafRef.current = requestAnimationFrame(loop);

      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState < 2) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const w = video.videoWidth || 640;
      const h = video.videoHeight || 480;
      if (canvas.width !== w) canvas.width = w;
      if (canvas.height !== h) canvas.height = h;

      const now = performance.now();
      frameCount++;
      if (now - fpsWindowStart >= 1000) {
        fpsVal = Math.round(frameCount * 1000 / (now - fpsWindowStart));
        frameCount = 0;
        fpsWindowStart = now;
      }

      // Mirror video
      ctx.save();
      ctx.scale(-1, 1);
      ctx.drawImage(video, -w, 0, w, h);
      ctx.restore();

      // Track face with zero-point gaze calibration
      const face = trackerRef.current?.detect(video, now, w, h, neutralGazeRef.current ?? undefined) ?? null;

      if (face) {
        const rawGp = face.gazePoint;
        // Pass through One Euro Filter + Blink Rejection + Outlier Suppressor pipeline
        const gp = stabilizerRef.current.process(rawGp);

        // Record if active
        if (recordingRef.current) {
          gazeHistoryRef.current.push(gp);
          headHistoryRef.current.push({ t: now, yaw: face.pose.yaw });
        }

        // Draw gaze overlay on camera canvas
        drawGazeOverlay(ctx, w, h, face, gp);

        // Update live VOR every 30 frames
        if (now - hudTimer > 1000 && recordingRef.current) {
          hudTimer = now;
          const cutoff = now - LIVE_VOR_WINDOW_MS;
          const recentGaze = gazeHistoryRef.current.filter(g => g.t > cutoff);
          const recentHead = headHistoryRef.current.filter(h => h.t > cutoff);
          if (recentGaze.length > 4 && recentHead.length > 4) {
            setLiveVOR(scoreVOR(recentGaze, recentHead));
            setNystagmus(detectNystagmusHeuristic(recentGaze));
          }
        }

        setLiveData({
          gazeX: gp.x,
          gazeY: gp.y,
          hasIris: gp.hasIris,
          leftIris: gp.leftIris ?? null,
          rightIris: gp.rightIris ?? null,
          faceVisible: true,
          fps: fpsVal,
          rawOffsetX: gp.rawOffsetX,
          rawOffsetY: gp.rawOffsetY,
          confidence: gp.confidence ?? 0.9,
          isBlink: gp.isBlink ?? false,
          is5PointCalibrated: Boolean(calibration5PtRef.current?.isCalibrated),
        });
      } else {
        drawSearching(ctx, w, h);
        setLiveData(prev => ({ ...prev, faceVisible: false, fps: fpsVal }));
      }
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      cancelled = true;
      if (rafRef.current !== null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    };
  }, [cameraState]);

  /* ---------------------------------------------------------- cleanup */
  useEffect(() => () => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    cameraRef.current?.stop();
    trackerRef.current?.close();
  }, []);

  /* ---------------------------------------------------------- derived */
  const adherence = useMemo(() => summariseGazeAdherence(historySessions), [historySessions]);

  /* ============================================================ render */
  return (
    <div className="min-h-screen bg-[#0a0d14] text-white font-sans">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#0a0d14] via-[#0e1829] to-[#0a1a1a] border-b border-white/5">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-teal-500/5 blur-3xl" />
          <div className="absolute -bottom-16 -left-16 w-64 h-64 rounded-full bg-cyan-500/5 blur-3xl" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 py-6 sm:px-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-300 text-xs font-bold tracking-widest uppercase">
                <Brain className="w-3.5 h-3.5" />
                {hi ? 'एआई गेज़ विश्लेषण इंजन' : 'AI Gaze Analytics Engine'}
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-teal-100 to-cyan-300 bg-clip-text text-transparent">
                {hi ? 'वेस्टिबुलर गेज़ ट्रैकिंग' : 'Vestibular Gaze Tracking'}
              </h1>
              <p className="text-sm text-slate-400 max-w-xl leading-relaxed">
                {hi
                  ? 'आँखों की गति, VOR लाभ, फिक्सेशन और सैकेड का वास्तविक समय विश्लेषण। सब कुछ आपके डिवाइस पर — कोई वीडियो अपलोड नहीं।'
                  : 'Real-time eye movement, VOR gain, fixation & saccade analysis for vestibular rehabilitation. All on-device — no video leaves your browser.'}
              </p>
            </div>
            {/* Adherence badges */}
            <div className="flex gap-3 flex-wrap">
              <StatBadge label={hi ? 'कुल सत्र' : 'Sessions'} value={String(adherence.totalSessions)} icon={<Activity className="w-3.5 h-3.5" />} />
              <StatBadge label={hi ? 'VOR लाभ' : 'VOR Gain'} value={adherence.meanVORGain > 0 ? adherence.meanVORGain.toFixed(2) : '—'} icon={<Gauge className="w-3.5 h-3.5" />} accent />
              <StatBadge label={hi ? 'रुझान' : 'Trend'} value={adherence.trend === 'improving' ? '↑' : adherence.trend === 'declining' ? '↓' : '→'} icon={<TrendingUp className="w-3.5 h-3.5" />} />
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-6 bg-white/5 rounded-xl p-1 w-fit border border-white/5 flex-wrap">
            {(['live', 'pursuit', 'session', 'longitudinal'] as Tab[]).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                  tab === t
                    ? 'bg-teal-600 text-white shadow-lg shadow-teal-900/50'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {t === 'live' ? (hi ? '🎥 लाइव स्टूडियो' : '🎥 Live Studio')
                  : t === 'pursuit' ? (hi ? '🔴 रेड-डॉट परस्यूट टेस्ट (VRT)' : '🔴 Red-Dot Pursuit & VOR x2 Test')
                  : t === 'session' ? (hi ? '📊 सत्र विश्लेषण' : '📊 Session Analytics')
                  : (hi ? '📈 दीर्घकालिक' : '📈 Longitudinal')}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Tab Content ─────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6">
        {tab === 'live' && (
          <LiveStudioTab
            hi={hi}
            cameraState={cameraState}
            cameraError={cameraError}
            modelReady={modelReady}
            modelFailed={modelFailed}
            isRecording={isRecording}
            liveData={liveData}
            liveVOR={liveVOR}
            nystagmus={nystagmus}
            videoRef={videoRef}
            canvasRef={canvasRef}
            onStartCamera={startCamera}
            onStopCamera={stopCamera}
            onStartRecording={startRecording}
            onStopRecording={stopRecording}
            onCalibrateGaze={calibrateNeutralGaze}
            onOpen5PointWizard={() => setIsWizardOpen(true)}
          />
        )}
        {tab === 'pursuit' && (
          <RedDotPursuitTab
            hi={hi}
            cameraState={cameraState}
            liveData={liveData}
            videoRef={videoRef}
            canvasRef={canvasRef}
            onStartCamera={startCamera}
            onStopCamera={stopCamera}
            onCalibrateGaze={calibrateNeutralGaze}
          />
        )}
        {tab === 'session' && (
          <SessionAnalyticsTab hi={hi} session={session} />
        )}
        {tab === 'longitudinal' && (
          <LongitudinalTab hi={hi} sessions={historySessions} adherence={adherence} />
        )}
      </div>

      {/* 5-Point Calibration Wizard Modal */}
      {isWizardOpen && (
        <Calibration5PointModal
          hi={hi}
          liveData={liveData}
          onSave={handleSave5PointCalibration}
          onClose={() => setIsWizardOpen(false)}
        />
      )}
    </div>
  );
};

/* ============================================================ StatBadge */
const StatBadge: React.FC<{
  label: string; value: string; icon: React.ReactNode; accent?: boolean;
}> = ({ label, value, icon, accent }) => (
  <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs ${
    accent
      ? 'bg-teal-500/10 border-teal-500/30 text-teal-200'
      : 'bg-white/5 border-white/10 text-slate-300'
  }`}>
    {icon}
    <div>
      <div className="text-[10px] text-slate-500 uppercase tracking-widest">{label}</div>
      <div className="font-extrabold text-sm">{value}</div>
    </div>
  </div>
);

/* ============================================================ LiveStudioTab */
const LiveStudioTab: React.FC<{
  hi: boolean;
  cameraState: CameraState;
  cameraError: string | null;
  modelReady: boolean;
  modelFailed: boolean;
  isRecording: boolean;
  liveData: LiveData;
  liveVOR: VORScore | null;
  nystagmus: NystagmusFlag;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  onStartCamera: () => void;
  onStopCamera: () => void;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onCalibrateGaze?: () => void;
  onOpen5PointWizard?: () => void;
}> = ({
  hi, cameraState, cameraError, modelReady, modelFailed,
  isRecording, liveData, liveVOR, nystagmus,
  videoRef, canvasRef,
  onStartCamera, onStopCamera, onStartRecording, onStopRecording, onCalibrateGaze, onOpen5PointWizard,
}) => {
  const vorGain = liveVOR?.gain ?? 0;
  const vorColor = VOR_COLOUR(vorGain);
  const vorPct = Math.min(vorGain / 1.2, 1);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      {/* Camera + gaze view */}
      <div className="xl:col-span-2 space-y-4">
        {/* Controls bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-bold text-white">
            {hi ? 'लाइव गेज़ दृश्य' : 'Live Gaze View'}
          </h2>
          <div className="flex flex-wrap gap-2">
            {cameraState === 'live' ? (
              <>
                <button
                  onClick={onCalibrateGaze}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500/20 border border-amber-400/40 hover:bg-amber-500/30 text-amber-200 text-xs font-bold transition-all shadow-md"
                  title={hi ? 'स्क्रीन के केंद्र में देखकर इसे दबाएं' : 'Look at center of screen and click to calibrate zero point'}
                >
                  <Crosshair className="w-3.5 h-3.5" />
                  {hi ? '🎯 गेज़ कैलिब्रेट (सेंटर)' : '🎯 Calibrate Gaze (Center)'}
                </button>

                <button
                  onClick={onOpen5PointWizard}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-cyan-500/20 border border-cyan-400/40 hover:bg-cyan-500/30 text-cyan-200 text-xs font-bold transition-all shadow-md"
                  title={hi ? '5-बिंदु कैलिब्रेशन विजार्ड शुरू करें' : 'Start 5-Point Calibration Wizard for high precision'}
                >
                  <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
                  {hi ? '✨ 5-पॉइंट कैलिब्रेशन' : '✨ 5-Point Wizard'}
                </button>
                {!isRecording ? (
                  <button onClick={onStartRecording}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition-all shadow-lg shadow-teal-900/30">
                    <Play className="w-3.5 h-3.5" />
                    {hi ? 'सत्र शुरू करें' : 'Start Session'}
                  </button>
                ) : (
                  <button onClick={onStopRecording}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all shadow-lg shadow-rose-900/30 animate-pulse">
                    <Pause className="w-3.5 h-3.5" />
                    {hi ? 'सत्र समाप्त करें' : 'Stop & Analyse'}
                  </button>
                )}
                <button onClick={onStopCamera}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300 text-xs font-semibold transition-all">
                  <EyeOff className="w-3.5 h-3.5" />
                  {hi ? 'बंद करें' : 'Stop Camera'}
                </button>
              </>
            ) : (
              <button onClick={onStartCamera} disabled={cameraState === 'starting'}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-lg shadow-teal-900/30">
                <Camera className="w-3.5 h-3.5" />
                {cameraState === 'starting' ? (hi ? 'शुरू हो रहा है…' : 'Starting…') : (hi ? 'कैमरा शुरू करें' : 'Start Camera')}
              </button>
            )}
          </div>
        </div>

        {/* Camera canvas */}
        <div className="relative bg-black rounded-2xl overflow-hidden border border-white/10 aspect-video flex items-center justify-center">
          <video ref={videoRef as React.RefObject<HTMLVideoElement>} className="hidden" playsInline muted aria-hidden="true" />
          <canvas
            ref={canvasRef as React.RefObject<HTMLCanvasElement>}
            className={`w-full h-full object-cover ${cameraState === 'live' ? '' : 'hidden'}`}
          />

          {cameraState !== 'live' && (
            <div className="text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-teal-400">
                <Eye className="w-8 h-8" />
              </div>
              <p className="text-sm text-slate-400">{hi ? 'कैमरा तैयार है' : 'Camera standby'}</p>
              <p className="text-xs text-slate-600 max-w-xs mx-auto">
                {hi ? 'अच्छी रोशनी में बैठें और कैमरा शुरू करें' : 'Sit in even lighting and start the camera'}
              </p>
            </div>
          )}

          {cameraState === 'live' && (
            <>
              {/* Status bar top-left */}
              <div className="absolute top-3 left-3 flex flex-wrap items-center gap-2">
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-mono border backdrop-blur-md ${
                  modelReady && liveData.faceVisible
                    ? 'bg-emerald-900/80 border-emerald-500/40 text-emerald-200'
                    : 'bg-slate-900/80 border-slate-600/40 text-slate-300'
                }`}>
                  {modelReady && liveData.faceVisible
                    ? (liveData.hasIris ? '👁 IRIS ACTIVE' : '😐 FACE LOCKED')
                    : modelFailed ? '⚠ MODEL FAILED'
                    : modelReady ? '🔍 SEARCHING…'
                    : '⏳ LOADING…'}
                </span>

                {/* Quality Indicator HUD */}
                {liveData.faceVisible && (
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-mono border backdrop-blur-md font-bold ${
                    liveData.isBlink
                      ? 'bg-purple-900/80 border-purple-500/40 text-purple-200'
                      : (liveData.confidence ?? 0) >= 0.8
                      ? 'bg-teal-900/80 border-teal-400/40 text-teal-200'
                      : (liveData.confidence ?? 0) >= 0.5
                      ? 'bg-amber-900/80 border-amber-400/40 text-amber-200'
                      : 'bg-rose-900/80 border-rose-400/40 text-rose-200'
                  }`}>
                    {liveData.isBlink
                      ? '👁 BLINK DETECTED'
                      : (liveData.confidence ?? 0) >= 0.8
                      ? `🟢 QUALITY: HIGH (${Math.round((liveData.confidence ?? 0) * 100)}%)`
                      : (liveData.confidence ?? 0) >= 0.5
                      ? `🟡 QUALITY: MED (${Math.round((liveData.confidence ?? 0) * 100)}%)`
                      : `🔴 QUALITY: LOW (${Math.round((liveData.confidence ?? 0) * 100)}%)`}
                  </span>
                )}

                {liveData.is5PointCalibrated && (
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-mono bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 backdrop-blur-md">
                    🎯 5-POINT CALIBRATED
                  </span>
                )}

                {isRecording && (
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-mono bg-rose-900/80 border border-rose-500/40 text-rose-200 backdrop-blur-md animate-pulse">
                    ● REC
                  </span>
                )}
              </div>
              {/* FPS */}
              <span className="absolute top-3 right-3 px-2.5 py-1 rounded-full text-[10px] font-mono bg-slate-900/80 border border-slate-600/40 text-slate-300 backdrop-blur-md">
                {liveData.fps} FPS
              </span>
              {/* Gaze crosshair overlay on canvas */}
              {liveData.faceVisible && (
                <div
                  className="absolute w-6 h-6 pointer-events-none"
                  style={{
                    left: `calc(${liveData.gazeX * 100}% - 12px)`,
                    top: `calc(${liveData.gazeY * 100}% - 12px)`,
                    transition: 'left 0.05s, top 0.05s',
                  }}
                >
                  <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
                    <circle cx="12" cy="12" r="8" stroke="#22d3ee" strokeWidth="1.5" opacity="0.8" />
                    <circle cx="12" cy="12" r="2" fill="#22d3ee" opacity="0.9" />
                    <line x1="12" y1="0" x2="12" y2="7" stroke="#22d3ee" strokeWidth="1.5" opacity="0.7" />
                    <line x1="12" y1="17" x2="12" y2="24" stroke="#22d3ee" strokeWidth="1.5" opacity="0.7" />
                    <line x1="0" y1="12" x2="7" y2="12" stroke="#22d3ee" strokeWidth="1.5" opacity="0.7" />
                    <line x1="17" y1="12" x2="24" y2="12" stroke="#22d3ee" strokeWidth="1.5" opacity="0.7" />
                  </svg>
                </div>
              )}
            </>
          )}
        </div>

        {/* Nystagmus alert */}
        {nystagmus.detected && (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-950/60 border border-amber-500/40 text-amber-200">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-amber-100">
                {hi ? 'आँखों में अनैच्छिक कंपन' : 'Involuntary Eye Oscillation Detected'}
              </p>
              <p className="text-xs text-amber-300 mt-0.5">
                {`${nystagmus.frequencyHz} Hz, ${nystagmus.direction} — `}
                {hi ? 'कृपया इसे अपने चिकित्सक को बताएं।' : 'Please report this to your clinician.'}
              </p>
            </div>
          </div>
        )}

        {/* Camera error */}
        {cameraError && (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-200">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <p className="text-xs">{cameraError}</p>
          </div>
        )}
        {modelFailed && (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-950/60 border border-amber-500/40 text-amber-200">
            <WifiOff className="w-4 h-4 shrink-0 mt-0.5" />
            <p className="text-xs">{hi ? 'AI मॉडल लोड नहीं हुआ।' : 'AI model failed to load. Check your connection and refresh.'}</p>
          </div>
        )}
      </div>

      {/* Right metrics panel */}
      <div className="space-y-4">
        {/* VOR Ring */}
        <div className="bg-gradient-to-br from-white/5 to-white/2 rounded-2xl border border-white/10 p-5 space-y-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">{hi ? 'VOR लाभ (लाइव)' : 'VOR Gain (Live)'}</h3>
          <div className="flex flex-col items-center gap-3">
            <VORRing gain={vorGain} color={vorColor} />
            <div className="text-center">
              <div className="text-3xl font-extrabold" style={{ color: vorColor }}>
                {vorGain > 0 ? vorGain.toFixed(2) : '—'}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                {liveVOR ? (hi ? `स्तर: ${liveVOR.label}` : `Level: ${liveVOR.label}`) : (hi ? 'सत्र शुरू करें' : 'Start session to measure')}
              </div>
            </div>
          </div>
          {liveVOR && (
            <div className="grid grid-cols-2 gap-2 text-center">
              <MiniMetric label={hi ? 'सिर गति' : 'Head vel.'} value={`${liveVOR.meanHeadVelocityDeg.toFixed(0)}°/s`} />
              <MiniMetric label={hi ? 'गेज़ गति' : 'Gaze vel.'} value={`${liveVOR.meanGazeVelocityDeg.toFixed(0)}°/s`} />
              <MiniMetric label={hi ? 'चक्र' : 'Cycles'} value={String(liveVOR.cycles)} />
              <MiniMetric label={hi ? 'फेज़ त्रुटि' : 'Phase err.'} value={`${liveVOR.phaseErrorDeg.toFixed(0)}°`} />
            </div>
          )}
        </div>

        {/* Live gaze metrics */}
        <div className="bg-gradient-to-br from-white/5 to-white/2 rounded-2xl border border-white/10 p-5 space-y-3">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">{hi ? 'गेज़ स्थिति' : 'Gaze Position'}</h3>
          <GazeRadar x={liveData.gazeX} y={liveData.gazeY} active={liveData.faceVisible} />
          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <div className="bg-white/5 rounded-lg p-2">
              <span className="text-cyan-400">X</span>
              <span className="text-white ml-2">{(liveData.gazeX * 100).toFixed(1)}%</span>
            </div>
            <div className="bg-white/5 rounded-lg p-2">
              <span className="text-violet-400">Y</span>
              <span className="text-white ml-2">{(liveData.gazeY * 100).toFixed(1)}%</span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <div className={`w-2 h-2 rounded-full ${liveData.hasIris ? 'bg-teal-400' : 'bg-slate-600'}`} />
            {liveData.hasIris
              ? (hi ? 'आईरिस ट्रैकिंग सक्रिय' : 'Iris tracking active')
              : (hi ? 'आँख केंद्र अनुमान' : 'Eye centre estimate')}
          </div>
        </div>

        {/* How to use */}
        <div className="bg-white/3 rounded-2xl border border-white/5 p-4 space-y-2">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">{hi ? 'उपयोग कैसे करें' : 'How to use'}</h3>
          {[
            hi ? '1. कैमरा शुरू करें' : '1. Start camera',
            hi ? '2. अपनी नज़र कार्ड पर टिकाएं' : '2. Fix gaze on your target card',
            hi ? '3. सत्र शुरू करें → व्यायाम करें' : '3. Start session → do exercises',
            hi ? '4. सत्र समाप्त → विश्लेषण देखें' : '4. Stop session → view analytics',
          ].map((s, i) => (
            <p key={i} className="text-xs text-slate-400">{s}</p>
          ))}
        </div>
      </div>
    </div>
  );
};

/* ============================================================ SessionAnalyticsTab */
const SessionAnalyticsTab: React.FC<{ hi: boolean; session: SessionData }> = ({ hi, session }) => {
  const scanpathRef = useRef<HTMLCanvasElement | null>(null);
  const { analytics, gazeHistory, durationMs } = session;

  // Draw scanpath on canvas
  useEffect(() => {
    const canvas = scanpathRef.current;
    if (!canvas || gazeHistory.length < 2) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // Background
    ctx.fillStyle = '#0d1117';
    ctx.fillRect(0, 0, w, h);

    // Grid
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    for (let gx = 0; gx <= 10; gx++) {
      ctx.beginPath(); ctx.moveTo(gx * w / 10, 0); ctx.lineTo(gx * w / 10, h); ctx.stroke();
    }
    for (let gy = 0; gy <= 6; gy++) {
      ctx.beginPath(); ctx.moveTo(0, gy * h / 6); ctx.lineTo(w, gy * h / 6); ctx.stroke();
    }

    // Scanpath line
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(34,211,238,0.5)';
    ctx.lineWidth = 1.5;
    gazeHistory.forEach((p, i) => {
      const x = p.x * w;
      const y = p.y * h;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Fixation circles
    analytics?.fixations.forEach(f => {
      const x = f.centroid.x * w;
      const y = f.centroid.y * h;
      const r = Math.min(Math.max(f.duration / 40, 4), 20);
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(16,185,129,0.3)';
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 1.5;
      ctx.fill();
      ctx.stroke();
    });

    // Saccade arrows
    analytics?.saccades.forEach(s => {
      const x1 = s.from.x * w; const y1 = s.from.y * h;
      const x2 = s.to.x * w;   const y2 = s.to.y * h;
      ctx.beginPath();
      ctx.strokeStyle = `rgba(251,146,60,${Math.min(s.peakVelocityDeg / 200, 0.9)})`;
      ctx.lineWidth = 1.5;
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    });

    // Start / End markers
    const first = gazeHistory[0];
    const last = gazeHistory[gazeHistory.length - 1];
    ctx.beginPath(); ctx.arc(first.x * w, first.y * h, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#22d3ee'; ctx.fill();
    ctx.beginPath(); ctx.arc(last.x * w, last.y * h, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#f43f5e'; ctx.fill();
  }, [gazeHistory, analytics]);

  if (!analytics) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4 text-center">
        <BarChart3 className="w-12 h-12 text-slate-700" />
        <p className="text-slate-400">{hi ? 'अभी कोई सत्र नहीं है।' : 'No session recorded yet.'}</p>
        <p className="text-xs text-slate-600">
          {hi ? 'Live Studio में सत्र रिकॉर्ड करें, फिर यहाँ विश्लेषण देखें।' : 'Go to Live Studio, record a session, then view analytics here.'}
        </p>
      </div>
    );
  }

  const vor = analytics.vorScore;
  const vorColor = vor ? VOR_COLOUR(vor.gain) : '#64748b';

  return (
    <div className="space-y-6">
      {/* AI Insight */}
      <div className="p-5 rounded-2xl border border-teal-500/30 bg-gradient-to-br from-teal-950/50 to-cyan-950/30 space-y-2">
        <div className="flex items-center gap-2 text-teal-300 text-xs font-bold uppercase tracking-widest">
          <Sparkles className="w-4 h-4" />
          {hi ? 'AI अंतर्दृष्टि' : 'AI Insight'}
        </div>
        <p className="text-sm text-slate-200 leading-relaxed">{analytics.insight}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricCard
          icon={<Gauge className="w-5 h-5" />}
          label={hi ? 'VOR लाभ' : 'VOR Gain'}
          value={vor ? (vor.isHeadStationary ? 'N/A' : vor.gain.toFixed(2)) : '—'}
          sub={vor ? (vor.isHeadStationary ? (hi ? 'सिर स्थिर था' : 'Head stationary') : vor.label) : ''}
          color={vor?.isHeadStationary ? '#94a3b8' : vorColor}
        />
        <MetricCard
          icon={<Target className="w-5 h-5" />}
          label={hi ? 'फिक्सेशन' : 'Fixations'}
          value={String(analytics.fixations.length)}
          sub={`~${Math.round(analytics.meanFixationDuration)} ms avg`}
          color="#22d3ee"
        />
        <MetricCard
          icon={<Zap className="w-5 h-5" />}
          label={hi ? 'सैकेड' : 'Saccades'}
          value={String(analytics.saccades.length)}
          sub={`~${Math.round(analytics.meanSaccadeVelocity)}°/s avg`}
          color="#f59e0b"
        />
        <MetricCard
          icon={<Activity className="w-5 h-5" />}
          label={hi ? 'फिक्सेशन अनुपात' : 'Fixation %'}
          value={`${(analytics.fixationFraction * 100).toFixed(0)}%`}
          sub={`${Math.round(durationMs / 1000)}s session`}
          color="#10b981"
        />
      </div>

      {/* Scanpath */}
      <div className="bg-[#0d1117] rounded-2xl border border-white/10 p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white">{hi ? 'गेज़ स्कैनपथ' : 'Gaze Scanpath'}</h3>
          <div className="flex items-center gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-teal-400 inline-block" /> {hi ? 'शुरुआत' : 'Start'}</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-400 inline-block" /> {hi ? 'अंत' : 'End'}</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full border border-emerald-500 inline-block" /> {hi ? 'फिक्सेशन' : 'Fixation'}</span>
            <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-orange-400 inline-block" /> {hi ? 'सैकेड' : 'Saccade'}</span>
          </div>
        </div>
        <canvas
          ref={scanpathRef}
          width={800}
          height={450}
          className="w-full rounded-xl"
          style={{ imageRendering: 'crisp-edges' }}
        />
      </div>

      {/* VOR detail */}
      {vor && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white/5 rounded-2xl border border-white/10 p-5 space-y-3">
            <h3 className="text-sm font-bold text-white">{hi ? 'VOR विवरण' : 'VOR Detail'}</h3>
            {vor.isHeadStationary && (
              <div className="p-3 bg-amber-950/40 border border-amber-500/30 text-amber-200 text-xs rounded-xl flex items-start gap-2">
                <Info className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                <p className="leading-relaxed">
                  {hi
                    ? 'सत्र के दौरान सिर स्थिर था (0.6°/s)। सच्चा VOR लाभ मापने के लिए सिर को 1-2 Hz की गति से बाएं-दाएं घुमाएं।'
                    : 'Head was stationary (<15°/s). True VOR Gain requires active head motion (1–2 Hz). This session evaluated Visual Fixation / Pursuit.'}
                </p>
              </div>
            )}
            <div className="space-y-2">
              {[
                { label: hi ? 'लाभ' : 'Gain', value: vor.isHeadStationary ? 'N/A (Head stationary)' : vor.gain.toFixed(3), bar: vor.isHeadStationary ? 0 : Math.min(vor.gain, 1.2) / 1.2, color: vor.isHeadStationary ? '#94a3b8' : vorColor },
                { label: hi ? 'चरण त्रुटि' : 'Phase error', value: `${vor.phaseErrorDeg.toFixed(1)}°`, bar: Math.min(Math.abs(vor.phaseErrorDeg) / 30, 1), color: '#f59e0b' },
                { label: hi ? 'सिर गति (औसत)' : 'Head vel. (mean)', value: `${vor.meanHeadVelocityDeg}°/s`, bar: Math.min(vor.meanHeadVelocityDeg / 100, 1), color: '#22d3ee' },
                { label: hi ? 'गेज़ गति (औसत)' : 'Gaze vel. (mean)', value: `${vor.meanGazeVelocityDeg}°/s`, bar: Math.min(vor.meanGazeVelocityDeg / 100, 1), color: '#a78bfa' },
              ].map(item => (
                <div key={item.label} className="space-y-1">
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>{item.label}</span><span className="font-mono text-white">{item.value}</span>
                  </div>
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${item.bar * 100}%`, background: item.color }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white/5 rounded-2xl border border-white/10 p-5 space-y-3">
            <h3 className="text-sm font-bold text-white">{hi ? 'नैदानिक संदर्भ' : 'Clinical Reference'}</h3>
            <div className="space-y-2 text-xs text-slate-400">
              {[
                { range: '≥ 0.9', label: hi ? 'उत्कृष्ट VOR' : 'Excellent VOR', color: '#10b981' },
                { range: '0.7–0.9', label: hi ? 'अच्छा VOR' : 'Good VOR', color: '#22c55e' },
                { range: '0.5–0.7', label: hi ? 'मध्यम — व्यायाम जारी रखें' : 'Fair — continue exercises', color: '#f59e0b' },
                { range: '< 0.5', label: hi ? 'कमज़ोर — चिकित्सक से मिलें' : 'Impaired — see clinician', color: '#ef4444' },
              ].map(r => (
                <div key={r.range} className={`flex items-center gap-2 p-2 rounded-lg ${vor.gain >= parseFloat(r.range.split('–')[0].replace('≥', '').replace('<', '').trim()) ? 'bg-white/5 ring-1' : ''}`}>
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ background: r.color }} />
                  <span className="font-mono" style={{ color: r.color }}>{r.range}</span>
                  <span className="text-slate-400">{r.label}</span>
                </div>
              ))}
            </div>
            <div className="pt-2 border-t border-white/5 text-xs text-slate-600">
              {hi ? '* VOR लाभ &lt; 0.6 नैदानिक रूप से महत्वपूर्ण माना जाता है।' : '* VOR gain < 0.6 is considered clinically significant.'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ============================================================ LongitudinalTab */
const LongitudinalTab: React.FC<{
  hi: boolean;
  sessions: GazeSession[];
  adherence: ReturnType<typeof summariseGazeAdherence>;
}> = ({ hi, sessions, adherence }) => {
  const trendCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = trendCanvasRef.current;
    if (!canvas || sessions.length < 2) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#0d1117';
    ctx.fillRect(0, 0, w, h);

    const gains = sessions.map(s => s.analytics.vorScore?.gain ?? 0);
    const maxGain = 1.2;
    const pad = { l: 40, r: 20, t: 20, b: 30 };
    const cw = w - pad.l - pad.r;
    const ch = h - pad.t - pad.b;

    // Y grid
    [0, 0.3, 0.6, 0.9, 1.2].forEach(val => {
      const y = pad.t + ch - (val / maxGain) * ch;
      ctx.strokeStyle = 'rgba(255,255,255,0.05)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(pad.l + cw, y); ctx.stroke();
      ctx.fillStyle = '#4b5563';
      ctx.font = '10px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(val.toFixed(1), pad.l - 4, y + 3);
    });

    // Reference line at 0.6 (clinical threshold)
    const refY = pad.t + ch - (0.6 / maxGain) * ch;
    ctx.strokeStyle = 'rgba(239,68,68,0.4)';
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(pad.l, refY); ctx.lineTo(pad.l + cw, refY); ctx.stroke();
    ctx.setLineDash([]);

    // Gradient fill under VOR gain curve
    const gradient = ctx.createLinearGradient(0, pad.t, 0, pad.t + ch);
    gradient.addColorStop(0, 'rgba(20,184,166,0.3)');
    gradient.addColorStop(1, 'rgba(20,184,166,0)');

    ctx.beginPath();
    gains.forEach((g, i) => {
      const x = pad.l + (i / (gains.length - 1)) * cw;
      const y = pad.t + ch - (g / maxGain) * ch;
      i === 0 ? ctx.moveTo(x, pad.t + ch) : void 0;
      if (i === 0) ctx.lineTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.lineTo(pad.l + cw, pad.t + ch);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    // VOR line
    ctx.beginPath();
    ctx.strokeStyle = '#14b8a6';
    ctx.lineWidth = 2;
    gains.forEach((g, i) => {
      const x = pad.l + (i / (gains.length - 1)) * cw;
      const y = pad.t + ch - (g / maxGain) * ch;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Dots
    gains.forEach((g, i) => {
      const x = pad.l + (i / (gains.length - 1)) * cw;
      const y = pad.t + ch - (g / maxGain) * ch;
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fillStyle = VOR_COLOUR(g);
      ctx.fill();
    });
  }, [sessions]);

  if (sessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4 text-center">
        <TrendingUp className="w-12 h-12 text-slate-700" />
        <p className="text-slate-400">{hi ? 'अभी कोई इतिहास नहीं।' : 'No history yet.'}</p>
        <p className="text-xs text-slate-600">{hi ? 'पहला सत्र पूरा करें।' : 'Complete your first session to see trends.'}</p>
      </div>
    );
  }

  const last5 = sessions.slice(-5).reverse();

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <MetricCard icon={<Activity className="w-5 h-5" />} label={hi ? 'कुल सत्र' : 'Total sessions'} value={String(adherence.totalSessions)} sub="" color="#22d3ee" />
        <MetricCard icon={<Gauge className="w-5 h-5" />} label={hi ? 'औसत VOR' : 'Mean VOR gain'} value={adherence.meanVORGain.toFixed(2)} sub="" color={VOR_COLOUR(adherence.meanVORGain)} />
        <MetricCard icon={<Target className="w-5 h-5" />} label={hi ? 'औसत फिक्सेशन' : 'Mean fixation'} value={`${Math.round(adherence.meanFixationMs)} ms`} sub="" color="#a78bfa" />
        <MetricCard icon={<TrendingUp className="w-5 h-5" />} label={hi ? 'रुझान' : 'Trend'}
          value={adherence.trend === 'improving' ? '↑' : adherence.trend === 'declining' ? '↓' : adherence.trend === 'stable' ? '→' : '?'}
          sub={adherence.trend}
          color={adherence.trend === 'improving' ? '#10b981' : adherence.trend === 'declining' ? '#ef4444' : '#94a3b8'}
        />
      </div>

      {/* VOR trend chart */}
      <div className="bg-[#0d1117] rounded-2xl border border-white/10 p-5 space-y-3">
        <h3 className="text-sm font-bold text-white">{hi ? 'VOR लाभ प्रवृत्ति' : 'VOR Gain Trend'}</h3>
        {sessions.length >= 2 ? (
          <canvas ref={trendCanvasRef} width={800} height={200} className="w-full rounded-xl" />
        ) : (
          <p className="text-xs text-slate-600 py-8 text-center">{hi ? 'रुझान के लिए कम से कम 2 सत्र चाहिए।' : 'Need at least 2 sessions for trend.'}</p>
        )}
      </div>

      {/* Recent sessions table */}
      <div className="bg-white/3 rounded-2xl border border-white/8 overflow-hidden">
        <div className="px-5 py-4 border-b border-white/5">
          <h3 className="text-sm font-bold text-white">{hi ? 'हाल के सत्र' : 'Recent Sessions'}</h3>
        </div>
        <div className="divide-y divide-white/5">
          {last5.map((s, i) => {
            const vor = s.analytics.vorScore;
            const color = vor ? VOR_COLOUR(vor.gain) : '#64748b';
            return (
              <div key={s.id} className="px-5 py-3 flex items-center justify-between gap-4 hover:bg-white/3 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold" style={{ background: `${color}20`, color }}>
                    {i + 1}
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-white">{s.date}</div>
                    <div className="text-[10px] text-slate-500">{Math.round(s.durationMs / 1000)}s</div>
                  </div>
                </div>
                <div className="flex items-center gap-6 text-xs font-mono">
                  <div className="text-right">
                    <div className="text-slate-500">{hi ? 'VOR' : 'VOR'}</div>
                    <div style={{ color }}>{vor ? vor.gain.toFixed(2) : '—'}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-slate-500">{hi ? 'फिक्सेशन' : 'Fix.'}</div>
                    <div className="text-cyan-300">{s.analytics.fixations.length}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-slate-500">{hi ? 'सैकेड' : 'Sacc.'}</div>
                    <div className="text-amber-300">{s.analytics.saccades.length}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Export */}
      <div className="flex justify-end">
        <button
          onClick={() => {
            const blob = new Blob([JSON.stringify(sessions, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = 'gaze-sessions.json'; a.click();
            URL.revokeObjectURL(url);
          }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300 text-xs font-semibold transition-all"
        >
          <Download className="w-3.5 h-3.5" />
          {hi ? 'JSON निर्यात' : 'Export JSON'}
        </button>
      </div>
    </div>
  );
};

/* ============================================================ Mini sub-components */

const MiniMetric: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="bg-white/5 rounded-lg p-2 text-center">
    <div className="text-[9px] text-slate-600 uppercase tracking-widest">{label}</div>
    <div className="text-xs font-bold text-slate-200 font-mono mt-0.5">{value}</div>
  </div>
);

const MetricCard: React.FC<{
  icon: React.ReactNode; label: string; value: string; sub: string; color: string;
}> = ({ icon, label, value, sub, color }) => (
  <div className="bg-white/3 rounded-2xl border border-white/8 p-4 space-y-2 hover:bg-white/5 transition-colors">
    <div className="flex items-center gap-2" style={{ color }}>
      {icon}
      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{label}</span>
    </div>
    <div className="text-2xl font-extrabold" style={{ color }}>{value}</div>
    {sub && <div className="text-[11px] text-slate-500">{sub}</div>}
  </div>
);

/** VOR gain ring SVG */
const VORRing: React.FC<{ gain: number; color: string }> = ({ gain, color }) => {
  const r = 42;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(gain / 1.2, 1);
  const dash = pct * circ;
  return (
    <svg viewBox="0 0 100 100" className="w-28 h-28 -rotate-90">
      <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
      <circle
        cx="50" cy="50" r={r} fill="none"
        stroke={color} strokeWidth="8"
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 0.4s ease' }}
      />
    </svg>
  );
};

/** Gaze radar — small 2D position indicator */
const GazeRadar: React.FC<{ x: number; y: number; active: boolean }> = ({ x, y, active }) => (
  <div className="relative w-full aspect-video bg-white/3 rounded-xl border border-white/8 overflow-hidden">
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="w-px h-full bg-white/5" />
    </div>
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="w-full h-px bg-white/5" />
    </div>
    {active && (
      <div
        className="absolute w-4 h-4 rounded-full border-2 border-cyan-400 bg-cyan-400/30"
        style={{
          left: `calc(${x * 100}% - 8px)`,
          top: `calc(${y * 100}% - 8px)`,
          transition: 'left 0.08s, top 0.08s',
          boxShadow: '0 0 10px rgba(34,211,238,0.6)',
        }}
      />
    )}
  </div>
);

/* ============================================================ canvas helpers */

function drawGazeOverlay(
  ctx: CanvasRenderingContext2D,
  w: number, h: number,
  face: { points: Array<{ x: number; y: number }> },
  gp: GazePoint,
) {
  // Draw sparse face mesh
  ctx.fillStyle = 'rgba(20,184,166,0.35)';
  for (const pt of face.points) {
    ctx.fillRect(pt.x - 1, pt.y - 1, 2.5, 2.5);
  }

  // Draw iris circles
  if (gp.leftIris) {
    drawIrisCircle(ctx, gp.leftIris.x, gp.leftIris.y, '#22d3ee');
  }
  if (gp.rightIris) {
    drawIrisCircle(ctx, gp.rightIris.x, gp.rightIris.y, '#22d3ee');
  }
}

function drawIrisCircle(ctx: CanvasRenderingContext2D, x: number, y: number, color: string) {
  ctx.beginPath();
  ctx.arc(x, y, 8, 0, Math.PI * 2);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(x, y, 2, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
}

function drawSearching(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = 'rgba(15,23,42,0.7)';
  ctx.fillRect(0, 0, w, h);
}

/* ============================================================ Red-Dot Pursuit & VOR x2 Studio */

const RedDotPursuitTab: React.FC<{
  hi: boolean;
  cameraState: CameraState;
  liveData: LiveData;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  onStartCamera: () => void;
  onStopCamera: () => void;
  onCalibrateGaze?: () => void;
}> = ({
  hi, cameraState, liveData, videoRef, canvasRef, onStartCamera, onStopCamera, onCalibrateGaze,
}) => {
  const targetCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const [pattern, setPattern] = useState<'horizontal' | 'vertical' | 'circular' | 'vor-x2'>('horizontal');
  const [speedHz, setSpeedHz] = useState<number>(0.4);
  const [isTesting, setIsTesting] = useState(false);

  // 2-Point Rule Symptom VAS (0-10)
  const [symptomBefore, setSymptomBefore] = useState<number>(2);
  const [symptomAfter, setSymptomAfter] = useState<number>(2);

  // Live real-time error & score
  const [liveErrorPct, setLiveErrorPct] = useState<number>(0);
  const [resultScore, setResultScore] = useState<PursuitScore | null>(null);

  const targetHistoryRef = useRef<PursuitTargetPoint[]>([]);
  const gazeHistoryRef = useRef<GazePoint[]>([]);
  const testStartRef = useRef<number>(0);
  const animFrameRef = useRef<number | null>(null);

  const liveDataRef = useRef(liveData);
  const isTestingRef = useRef(isTesting);
  const startTimeRef = useRef<number>(performance.now());

  useEffect(() => { liveDataRef.current = liveData; }, [liveData]);
  useEffect(() => { isTestingRef.current = isTesting; }, [isTesting]);

  // Animated Target Loop (60 FPS smooth motion)
  useEffect(() => {
    const canvas = targetCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    startTimeRef.current = performance.now();

    const render = () => {
      animFrameRef.current = requestAnimationFrame(render);
      const w = canvas.width = canvas.parentElement?.clientWidth || 640;
      const h = canvas.height = canvas.parentElement?.clientHeight || 360;

      const now = performance.now();
      const elapsed = (now - startTimeRef.current) / 1000; // seconds

      // Background grid
      ctx.fillStyle = '#0b0f19';
      ctx.fillRect(0, 0, w, h);

      ctx.strokeStyle = 'rgba(255,255,255,0.05)';
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
      for (let y = 0; y < h; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }

      // Compute moving red dot target position (normalised 0-1)
      let tx = 0.5;
      let ty = 0.5;

      const freq = speedHz * Math.PI * 2;
      if (pattern === 'horizontal') {
        tx = 0.5 + 0.35 * Math.sin(elapsed * freq);
        ty = 0.5;
      } else if (pattern === 'vertical') {
        tx = 0.5;
        ty = 0.5 + 0.30 * Math.sin(elapsed * freq);
      } else if (pattern === 'circular') {
        tx = 0.5 + 0.30 * Math.cos(elapsed * freq);
        ty = 0.5 + 0.25 * Math.sin(elapsed * freq);
      } else if (pattern === 'vor-x2') {
        tx = 0.5 - 0.35 * Math.sin(elapsed * freq);
        ty = 0.5;
      }

      const dotX = tx * w;
      const dotY = ty * h;

      // Draw moving red dot target
      ctx.beginPath();
      ctx.arc(dotX, dotY, 18, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(239, 68, 68, 0.25)';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(dotX, dotY, 10, 0, Math.PI * 2);
      ctx.fillStyle = '#ef4444';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Inner white cross
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(dotX - 2, dotY - 2, 4, 4);

      // Label next to Red Dot
      ctx.fillStyle = '#f87171';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText('🔴 Target (Look Here)', dotX + 16, dotY + 4);

      // If testing & camera live: draw patient's gaze position on target canvas & record
      const curLiveData = liveDataRef.current;
      const curTesting = isTestingRef.current;

      if (curTesting && curLiveData.faceVisible) {
        const gazeX = curLiveData.gazeX * w;
        const gazeY = curLiveData.gazeY * h;

        // Draw patient gaze ring
        ctx.beginPath();
        ctx.arc(gazeX, gazeY, 12, 0, Math.PI * 2);
        ctx.strokeStyle = '#22d3ee';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Label next to Gaze Ring
        ctx.fillStyle = '#22d3ee';
        ctx.font = 'bold 11px sans-serif';
        ctx.fillText('👁 Your Gaze', gazeX + 16, gazeY + 4);

        // Distance line between target and gaze
        ctx.beginPath();
        ctx.moveTo(dotX, dotY);
        ctx.lineTo(gazeX, gazeY);
        ctx.strokeStyle = 'rgba(34, 211, 238, 0.4)';
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Record target point & compute real-time error (throttled to ~30 Hz)
        const lastGaze = gazeHistoryRef.current[gazeHistoryRef.current.length - 1];
        if (!lastGaze || now - lastGaze.t >= 25) {
          const tPoint: PursuitTargetPoint = { x: tx, y: ty, t: now, mode: pattern };
          const gPoint: GazePoint = { x: curLiveData.gazeX, y: curLiveData.gazeY, t: now, hasIris: curLiveData.hasIris };

          targetHistoryRef.current.push(tPoint);
          gazeHistoryRef.current.push(gPoint);
        }

        const dx = curLiveData.gazeX - tx;
        const dy = curLiveData.gazeY - ty;
        const errPct = Math.sqrt(dx * dx + dy * dy) * 100;
        setLiveErrorPct(parseFloat(errPct.toFixed(1)));
      }
    };

    render();
    return () => {
      if (animFrameRef.current !== null) cancelAnimationFrame(animFrameRef.current);
    };
  }, [pattern, speedHz]);


  const startTest = () => {
    targetHistoryRef.current = [];
    gazeHistoryRef.current = [];
    testStartRef.current = performance.now();
    setResultScore(null);
    setIsTesting(true);
    if (cameraState !== 'live') onStartCamera();
  };

  const stopTest = () => {
    setIsTesting(false);
    const targets = targetHistoryRef.current;
    const gazes = gazeHistoryRef.current;
    const saccades = detectSaccades(gazes);
    const score = scoreSmoothPursuit(targets, gazes, saccades, hi ? 'hi' : 'en');
    setResultScore(score);
  };

  const symptomEscalation = symptomAfter - symptomBefore;
  const isRuleViolated = symptomEscalation > 2;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-red-950/60 via-slate-900 to-teal-950/60 rounded-2xl border border-red-500/20 p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-red-400 uppercase tracking-widest">
            <Target className="w-4 h-4" />
            {hi ? 'न्यूरोइक्विलिब्रियम VRT मॉड्यूल 1 व 2' : 'NeuroEquilibrium™ VRT Module 1 & 2'}
          </div>
          <h2 className="text-lg font-bold text-white">
            {hi ? 'रेड-डॉट स्मूथ परस्यूट और VOR x2 गेज़ ट्रैकिंग टेस्ट' : 'Red-Dot Smooth Pursuit & VOR x2 Gaze Test'}
          </h2>
          <p className="text-xs text-slate-300">
            {hi
              ? 'परस्यूट बिंदु का पीछा करते समय कैमरे से आंखों की गति को ट्रैक करें। VOR x1 और VOR x2 अभ्यासों का लाइव मूल्यांकन।'
              : 'Track eye movements via camera while following the animated red target on screen. Measures Smooth Pursuit & VOR x2 Gain.'}
          </p>
        </div>

        {/* 2-Point Safety Rule Status */}
        <div className={`px-4 py-2 rounded-xl border text-xs flex items-center gap-2 ${
          isRuleViolated ? 'bg-rose-950/80 border-rose-500 text-rose-200' : 'bg-white/5 border-white/10 text-slate-300'
        }`}>
          <AlertTriangle className={`w-4 h-4 ${isRuleViolated ? 'text-rose-400 animate-bounce' : 'text-slate-400'}`} />
          <div>
            <div className="text-[10px] text-slate-400 uppercase font-bold">{hi ? '2-पॉइंट नियम जांच' : '2-Point Safety Rule'}</div>
            <div className="font-bold">
              {symptomEscalation > 0 ? `+${symptomEscalation}` : symptomEscalation} VAS {isRuleViolated ? (hi ? '⚠ सीमा से अधिक!' : '⚠ Exceeded!') : (hi ? '✓ सुरक्षित' : '✓ Safe')}
            </div>
          </div>
        </div>
      </div>

      {/* Step-by-Step Clinical Patient Instruction Banner */}
      <div className="bg-[#0e1626] rounded-2xl border border-teal-500/20 p-4 sm:p-5 space-y-3 shadow-lg">
        <div className="flex items-center gap-2 text-teal-300 font-bold text-sm">
          <Info className="w-4 h-4 text-teal-400" />
          <span>{hi ? '📋 टेस्ट कैसे करें: चरण-दर-चरण निर्देश (NeuroEquilibrium™ गाइड)' : '📋 Step-by-Step Patient Test Instructions (NeuroEquilibrium™ Protocol)'}</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
          <div className="bg-white/5 p-3 rounded-xl border border-white/5 space-y-1">
            <span className="font-bold text-teal-300 block">1. {hi ? 'बैठने की स्थिति' : 'Seating & Light'}</span>
            <p className="text-slate-300 leading-relaxed">
              {hi ? 'स्क्रीन से 50-70 सेमी दूर बैठें। रोशनी चेहरे पर बराबर होनी चाहिए ताकि आईरिस स्पष्ट दिखे।' : 'Sit 50–70 cm in front of screen in good light so camera captures both eyes clearly.'}
            </p>
          </div>
          <div className="bg-white/5 p-3 rounded-xl border border-white/5 space-y-1">
            <span className="font-bold text-teal-300 block">2. {hi ? 'पैटर्न चुनें' : 'Select Pattern'}</span>
            <p className="text-slate-300 leading-relaxed">
              {hi ? 'Smooth Pursuit (क्षैतिज/लंबवत): सिर स्थिर रखें, केवल आँखों से पीछा करें। VOR x2: सिर बिंदु के विपरीत घुमाएं।' : 'Smooth Pursuit: Hold head STILL, move eyes only. VOR x2: Move head in OPPOSITE direction of dot.'}
            </p>
          </div>
          <div className="bg-white/5 p-3 rounded-xl border border-white/5 space-y-1">
            <span className="font-bold text-teal-300 block">3. {hi ? 'ट्रैकिंग शुरू करें' : 'Follow Red Dot'}</span>
            <p className="text-slate-300 leading-relaxed">
              {hi ? '"Start Pursuit Test" दबाएं। चलती लाल बिंदु पर नज़र टिकाए रखें (30-60 सेकंड)।' : 'Click "Start Pursuit Test". Keep eyes locked onto the moving red dot for 30–60 seconds.'}
            </p>
          </div>
          <div className="bg-white/5 p-3 rounded-xl border border-white/5 space-y-1">
            <span className="font-bold text-teal-300 block">4. {hi ? 'सुरक्षा नियम' : '2-Point Rule'}</span>
            <p className="text-slate-300 leading-relaxed">
              {hi ? '"Stop & Score" दबाएं। यदि चक्कर 2 अंक से अधिक बढे तो 15 मिनट विश्राम करें।' : 'Click "Stop & Score". If dizziness increases by >2 points, halt test & rest 15 minutes.'}
            </p>
          </div>
        </div>
      </div>


      {/* Main Test Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Interactive Red Dot Canvas */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Pattern Controls */}
            <div className="flex gap-1 bg-white/5 p-1 rounded-xl border border-white/10 text-xs font-semibold">
              {(['horizontal', 'vertical', 'circular', 'vor-x2'] as const).map(p => (
                <button
                  key={p}
                  onClick={() => setPattern(p)}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    pattern === p ? 'bg-red-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {p === 'horizontal' ? (hi ? '↔ क्षैतिज' : '↔ Horizontal')
                    : p === 'vertical' ? (hi ? '↕ लंबवत' : '↕ Vertical')
                    : p === 'circular' ? (hi ? '🔄 वृत्ताकार' : '🔄 Circular')
                    : (hi ? '🔀 VOR x2' : '🔀 VOR x2')}
                </button>
              ))}
            </div>

            {/* Test Start / Stop & Calibrate */}
            <div className="flex gap-2">
              {cameraState === 'live' && (
                <button
                  onClick={onCalibrateGaze}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500/20 border border-amber-400/40 hover:bg-amber-500/30 text-amber-200 text-xs font-bold transition-all shadow-md"
                  title={hi ? 'स्क्रीन के केंद्र में देखकर इसे दबाएं' : 'Look at center of screen and click to calibrate zero point'}
                >
                  <Crosshair className="w-3.5 h-3.5" />
                  {hi ? '🎯 गेज़ कैलिब्रेट (सेंटर)' : '🎯 Calibrate Gaze (Center)'}
                </button>
              )}
              {!isTesting ? (
                <button
                  onClick={startTest}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-all shadow-lg shadow-red-900/30"
                >
                  <Play className="w-3.5 h-3.5" />
                  {hi ? 'टेस्ट शुरू करें' : 'Start Pursuit Test'}
                </button>
              ) : (
                <button
                  onClick={stopTest}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all shadow-lg shadow-rose-900/30 animate-pulse"
                >
                  <Pause className="w-3.5 h-3.5" />
                  {hi ? 'समीक्षा और स्कोर' : 'Stop & Score'}
                </button>
              )}
            </div>
          </div>

          {/* Animated Target Canvas */}
          <div className="relative bg-[#0b0f19] rounded-2xl overflow-hidden border border-white/10 aspect-video flex items-center justify-center shadow-2xl">
            <canvas ref={targetCanvasRef} className="w-full h-full object-cover" />

            {/* Live Distance Error Badge */}
            {isTesting && (
              <div className="absolute top-3 left-3 bg-slate-900/90 border border-teal-500/50 px-3 py-1.5 rounded-xl backdrop-blur-md flex items-center gap-2 text-xs font-mono">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                <span className="text-slate-400">{hi ? 'लाइव ट्रैकिंग त्रुटि:' : 'Tracking Error:'}</span>
                <span className="font-bold text-cyan-300">{liveErrorPct}%</span>
              </div>
            )}
          </div>

          {/* Speed & Stage Hierarchy Slider */}
          <div className="bg-white/3 rounded-2xl border border-white/8 p-4 space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-slate-400">{hi ? 'गति / आवृत्ति (Stage Hierarchy):' : 'Target Speed / Frequency:'}</span>
              <span className="font-mono text-cyan-300 font-bold">{speedHz} Hz ({speedHz < 0.5 ? (hi ? 'स्टेज 1 बेसिक' : 'Stage 1 Basic') : speedHz < 0.8 ? (hi ? 'स्टेज 2 इंटरमीडिएट' : 'Stage 2 Intermediate') : (hi ? 'स्टेज 3 एडवांस्ड' : 'Stage 3 Advanced')})</span>
            </div>
            <input
              type="range"
              min="0.2"
              max="1.0"
              step="0.1"
              value={speedHz}
              onChange={(e) => setSpeedHz(parseFloat(e.target.value))}
              className="w-full accent-red-500 cursor-pointer"
            />
          </div>
        </div>

        {/* Right Col: PIP Webcam & Clinical Dosage Check */}
        <div className="space-y-4">
          {/* Patient Webcam Camera PIP */}
          <div className="bg-white/3 rounded-2xl border border-white/8 p-4 space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-slate-400">
              <span className="flex items-center gap-1.5"><Camera className="w-4 h-4 text-teal-400" /> {hi ? 'पेशेंट कैमरा फीड' : 'Patient Camera Feed'}</span>
              {cameraState !== 'live' ? (
                <button onClick={onStartCamera} className="text-teal-400 hover:underline">{hi ? 'कैमरा चालू करें' : 'Turn On'}</button>
              ) : (
                <span className="text-emerald-400">{hi ? '● लाइव' : '● Live'}</span>
              )}
            </div>

            <div className="relative bg-black rounded-xl overflow-hidden aspect-video border border-white/10 flex items-center justify-center">
              <video ref={videoRef as React.RefObject<HTMLVideoElement>} className="hidden" playsInline muted aria-hidden="true" />
              <canvas ref={canvasRef as React.RefObject<HTMLCanvasElement>} className={`w-full h-full object-cover ${cameraState === 'live' ? '' : 'hidden'}`} />
              {cameraState !== 'live' && (
                <p className="text-xs text-slate-500 text-center p-4">{hi ? 'कैमरा चालू करें' : 'Camera turned off'}</p>
              )}
            </div>
          </div>

          {/* 2-Point Rule Dosage & Symptom Checker */}
          <div className="bg-white/3 rounded-2xl border border-white/8 p-4 space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">{hi ? 'सुरक्षा और लक्षण जांच (2-Point Rule)' : 'Symptom Exacerbation Checker'}</h3>

            <div className="space-y-3 text-xs">
              <div>
                <div className="flex justify-between text-slate-400 mb-1">
                  <span>{hi ? 'टेस्ट से पहले चक्कर का स्तर:' : 'Baseline VAS (Before Test):'}</span>
                  <span className="font-bold text-white">{symptomBefore} / 10</span>
                </div>
                <input
                  type="range" min="0" max="10" value={symptomBefore}
                  onChange={e => setSymptomBefore(parseInt(e.target.value))}
                  className="w-full accent-teal-500 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-slate-400 mb-1">
                  <span>{hi ? 'टेस्ट के बाद चक्कर का स्तर:' : 'Post-Test VAS (After Test):'}</span>
                  <span className="font-bold text-white">{symptomAfter} / 10</span>
                </div>
                <input
                  type="range" min="0" max="10" value={symptomAfter}
                  onChange={e => setSymptomAfter(parseInt(e.target.value))}
                  className="w-full accent-rose-500 cursor-pointer"
                />
              </div>
            </div>

            {isRuleViolated && (
              <div className="p-3 bg-rose-950/60 border border-rose-500/40 text-rose-200 text-xs rounded-xl space-y-1">
                <p className="font-bold text-rose-100">{hi ? '⚠️ 2-पॉइंट सुरक्षा नियम उल्लंघन!' : '⚠️ 2-Point Rule Threshold Exceeded!'}</p>
                <p className="text-[11px] leading-relaxed">
                  {hi
                    ? 'लक्षणों में 2 अंक से अधिक की वृद्धि हुई है। अभ्यास तुरंत रोकें और 15 मिनट विश्राम करें।'
                    : 'Symptom score increased by >2 points. Halt test immediately and rest for 15 minutes.'}
                </p>
              </div>
            )}
          </div>

          {/* Test Results Card */}
          {resultScore && (
            <div className="bg-gradient-to-br from-teal-950/60 to-slate-900 rounded-2xl border border-teal-500/30 p-4 space-y-3">
              <h3 className="text-xs font-bold text-teal-300 uppercase tracking-widest">{hi ? 'परस्यूट परिणाम स्कोर' : 'Pursuit Evaluation Score'}</h3>
              <div className="grid grid-cols-2 gap-2 text-center">
                <MiniMetric label={hi ? 'परस्यूट गेन' : 'Pursuit Gain'} value={resultScore.pursuitGain.toFixed(2)} />
                <MiniMetric label={hi ? 'औसत त्रुटि' : 'Avg Error'} value={`${resultScore.meanTrackingErrorPct}%`} />
                <MiniMetric label={hi ? 'कैच-अप सैकेड' : 'Catch-up Saccades'} value={String(resultScore.catchUpSaccadeCount)} />
                <MiniMetric label={hi ? 'गुणवत्ता' : 'Quality'} value={resultScore.quality.toUpperCase()} />
              </div>
              <p className="text-xs text-slate-200 bg-white/5 p-2.5 rounded-xl border border-white/5">{resultScore.guidance}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/* ============================================================ 5-Point Calibration Modal */
const CALIBRATION_POINTS = [
  { name: 'Center', x: 0.50, y: 0.50 },
  { name: 'Top-Left', x: 0.15, y: 0.15 },
  { name: 'Top-Right', x: 0.85, y: 0.15 },
  { name: 'Bottom-Left', x: 0.15, y: 0.85 },
  { name: 'Bottom-Right', x: 0.85, y: 0.85 },
];

const Calibration5PointModal: React.FC<{
  hi: boolean;
  liveData: LiveData;
  onSave: (samples: CalibrationPointSample[]) => void;
  onClose: () => void;
}> = ({ hi, liveData, onSave, onClose }) => {
  const [step, setStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const samplesRef = useRef<CalibrationPointSample[]>([]);
  const currentAccumulatorRef = useRef<Array<{ x: number; y: number }>>([]);

  const currentPoint = CALIBRATION_POINTS[step];

  useEffect(() => {
    currentAccumulatorRef.current = [];
    setProgress(0);

    const interval = setInterval(() => {
      if (liveData.hasIris && liveData.rawOffsetX !== undefined && liveData.rawOffsetY !== undefined) {
        currentAccumulatorRef.current.push({ x: liveData.rawOffsetX, y: liveData.rawOffsetY });
      }

      setProgress(prev => {
        const next = prev + 5;
        if (next >= 100) {
          clearInterval(interval);

          const accum = currentAccumulatorRef.current;
          const meanRawX = accum.length > 0 ? accum.reduce((s, v) => s + v.x, 0) / accum.length : (liveData.rawOffsetX ?? 0);
          const meanRawY = accum.length > 0 ? accum.reduce((s, v) => s + v.y, 0) / accum.length : (liveData.rawOffsetY ?? 0);

          samplesRef.current.push({
            target: { x: currentPoint.x, y: currentPoint.y },
            rawOffset: { x: meanRawX, y: meanRawY },
          });

          if (step < CALIBRATION_POINTS.length - 1) {
            setStep(s => s + 1);
          } else {
            onSave(samplesRef.current);
            onClose();
          }
          return 0;
        }
        return next;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [step, currentPoint, liveData, onSave, onClose]);

  return (
    <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-2xl flex flex-col justify-between p-6 sm:p-10 select-none">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-cyan-400" />
            {hi ? '5-बिंदु सटीक गेज़ कैलिब्रेशन' : '5-Point Precision Gaze Calibration'}
          </h2>
          <p className="text-xs text-slate-400">
            {hi ? 'बिंदु ' : 'Point '}{step + 1} / 5: <span className="text-cyan-300 font-bold">{currentPoint.name}</span>
          </p>
        </div>
        <button
          onClick={onClose}
          className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-slate-300"
        >
          {hi ? 'रद्द करें' : 'Cancel'}
        </button>
      </div>

      {/* Target Marker */}
      <div className="relative w-full h-full my-6 flex items-center justify-center">
        <div
          className="absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-2 transition-all duration-300"
          style={{
            left: `${currentPoint.x * 100}%`,
            top: `${currentPoint.y * 100}%`,
          }}
        >
          <div className="relative w-16 h-16 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border-2 border-cyan-400 animate-ping opacity-75" />
            <div className="w-12 h-12 rounded-full bg-cyan-500/30 border-2 border-cyan-300 flex items-center justify-center backdrop-blur-sm shadow-xl shadow-cyan-500/50">
              <div className="w-4 h-4 rounded-full bg-white shadow-inner" />
            </div>
          </div>
          <span className="text-[11px] font-bold text-cyan-200 bg-black/80 px-2 py-0.5 rounded-full border border-cyan-500/30 backdrop-blur-md">
            {Math.round(progress)}%
          </span>
        </div>
      </div>

      {/* Footer Instructions */}
      <div className="max-w-md mx-auto text-center space-y-3">
        <p className="text-sm font-semibold text-slate-200">
          {hi
            ? 'चमकते हुए नीले बिंदु पर नज़र टिकाए रखें।'
            : 'Keep your eyes steadily locked on the glowing target.'}
        </p>
        <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-teal-400 to-cyan-400 transition-all duration-100 rounded-full"
            style={{ width: `${((step * 100 + progress) / 500) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
};

