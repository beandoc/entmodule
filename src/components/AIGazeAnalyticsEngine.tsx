'use client';

/**
 * AIGazeAnalyticsEngine — Premium AI analytics dashboard for vestibular gaze tracking.
 *
 * Modularized Architecture:
 *  1. Live Studio Tab         – Real-time camera + gaze crosshair + VOR ring
 *  2. Red-Dot Pursuit & VOR x2 – Animated stimulus, distance HUD, VNG Report Card & Waveform graph
 *  3. Session Analytics       – Post-session scanpath, saccade histogram, VOR breakdown
 *  4. Longitudinal            – Multi-session VOR trend, adherence heatmap
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Eye, EyeOff, Camera, Activity, TrendingUp, Brain,
  AlertTriangle, Zap, Target, Crosshair, Gauge, Info, Sparkles, WifiOff,
  Play, Pause,
} from 'lucide-react';
import { useAppData } from '@/lib/app-data-context';
import {
  createFaceTracker, openCamera, cameraErrorKey,
  type FaceTracker, type CameraHandle,
} from '@/lib/vestibular-tracking';
import {
  detectFixations, detectSaccades, scoreVOR, detectNystagmusHeuristic,
  computeAntiSaccadeErrorRate, generateInsight,
  loadGazeSessions, saveGazeSession, summariseGazeAdherence,
  solve5PointCalibration, GazeStabilizer, evaluateCalibrationQuality,
  downsampleSeries, syncGazeSessionToBackend, fetchGazeSessionsFromBackend, mergeGazeSessions,
  TELEMETRY_ROUTINE_SAMPLES, TELEMETRY_CALIBRATION_SAMPLES,
  type GazePoint, type GazeAnalytics, type GazeSession,
  type VORScore, type NystagmusFlag,
  type CalibrationCoefficients, type CalibrationPointSample,
  type TelemetryGazeSample, type TelemetryHeadSample,
} from '@/lib/gaze-tracking';
import { getCurrentPatientId } from '@/lib/patient-context';
import {
  Tab, CameraState, LiveData, SessionData, EMPTY_LIVE, EMPTY_SESSION, HUD_SYNC_INTERVAL_MS, VOR_COLOUR,
  drawGazeOverlay, drawSearching,
} from './gaze/GazeCanvasHelpers';
import { RedDotPursuitTab } from './gaze/RedDotPursuitStudio';
import { Calibration5PointModal } from './gaze/Calibration5PointWizard';
import { SessionHistoryTab, LongitudinalTab } from './gaze/GazeSessionHistory';
import { VngBatteryReport } from './gaze/VngBatteryReport';

/* ============================================================ Main Component */
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
  const [nystagmus, setNystagmus] = useState<NystagmusFlag>({
    detected: false, frequencyHz: 0, direction: 'none', amplitude: 0,
    slowPhaseVelocityDegPerSec: 0, fastPhaseDirection: 'none', beatsPerMinute: 0,
  });
  const [liveVOR, setLiveVOR] = useState<VORScore | null>(null);
  const [historySessions, setHistorySessions] = useState<GazeSession[]>([]);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [referenceTag, setReferenceTag] = useState('');
  const [syncMarkerT, setSyncMarkerT] = useState<number | null>(null);

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
    const local = loadGazeSessions();
    setHistorySessions(local);
    fetchGazeSessionsFromBackend(getCurrentPatientId()).then((remote) => {
      if (remote.length > 0) {
        setHistorySessions((prev) => mergeGazeSessions(prev, remote));
      }
    }).catch(() => {});

    try {
      const saved5Pt = localStorage.getItem('dhanwantari-5point-calibration');
      if (saved5Pt) {
        const cal = JSON.parse(saved5Pt);
        calibration5PtRef.current = cal;
        stabilizerRef.current.setCalibration(cal);
      }
    } catch {}
  }, []);

  const calibrateNeutralGaze = useCallback(() => {
    if (liveData.hasIris && liveData.rawOffsetX !== undefined && liveData.rawOffsetY !== undefined) {
      neutralGazeRef.current = { x: liveData.rawOffsetX, y: liveData.rawOffsetY };
    }
  }, [liveData]);

  const handleSave5PointCalibration = useCallback((samples: CalibrationPointSample[]) => {
    const cal = solve5PointCalibration(samples);
    if (cal) {
      calibration5PtRef.current = cal;
      stabilizerRef.current.setCalibration(cal);
      try {
        localStorage.setItem('dhanwantari-5point-calibration', JSON.stringify(cal));
      } catch {}
    }
  }, []);

  /* ---------------------------------------------------------- camera loop */
  const loop = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let fpsFrames = 0;
    let fpsLastT = performance.now();
    let hudTimer = performance.now();

    const onFrame = () => {
      rafRef.current = requestAnimationFrame(onFrame);

      if (video.readyState < 2) return;
      const w = video.videoWidth || 640;
      const h = video.videoHeight || 360;
      if (canvas.width !== w) canvas.width = w;
      if (canvas.height !== h) canvas.height = h;

      const now = performance.now();
      fpsFrames++;
      let currentFps = liveData.fps;
      if (now - fpsLastT >= 1000) {
        currentFps = Math.round((fpsFrames * 1000) / (now - fpsLastT));
        fpsFrames = 0;
        fpsLastT = now;
      }

      ctx.save();
      ctx.scale(-1, 1);
      ctx.drawImage(video, -w, 0, w, h);
      ctx.restore();

      const face = trackerRef.current?.detect(video, now, w, h, neutralGazeRef.current ?? undefined) ?? null;

      if (face) {
        const rawGp = face.gazePoint;
        // `displayGaze` (One-Euro filtered + outlier-held) is right for the
        // on-screen crosshair; scoring must use `analyticsGaze` instead — it
        // is the strict, un-smoothed stream, since the filter otherwise smears
        // or drops the fast transients saccade/nystagmus detection needs.
        const { displayGaze: gp, analyticsGaze } = stabilizerRef.current.processDual(rawGp);

        if (recordingRef.current && !analyticsGaze.isBlink && (analyticsGaze.confidence ?? 1) >= 0.3) {
          gazeHistoryRef.current.push(analyticsGaze);
          headHistoryRef.current.push({ t: now, yaw: face.pose.yaw });
        }

        drawGazeOverlay(ctx, w, h, face, gp);

        if (now - hudTimer > HUD_SYNC_INTERVAL_MS) {
          hudTimer = now;

          let distanceCm = 55;
          let distanceStatus: 'optimal' | 'too_far' | 'too_close' | 'searching' = 'searching';

          if (gp.leftIris && gp.rightIris) {
            const dx = gp.leftIris.x - gp.rightIris.x;
            const dy = gp.leftIris.y - gp.rightIris.y;
            const pupilDistancePx = Math.hypot(dx, dy);

            if (pupilDistancePx > 10) {
              const estimatedCm = Math.round((6.3 * w * 0.85) / pupilDistancePx);
              distanceCm = Math.min(Math.max(estimatedCm, 20), 120);

              if (distanceCm >= 50 && distanceCm <= 60) {
                distanceStatus = 'optimal';
              } else if (distanceCm > 60) {
                distanceStatus = 'too_far';
              } else {
                distanceStatus = 'too_close';
              }
            }
          }

          setLiveData({
            gazeX: gp.x,
            gazeY: gp.y,
            hasIris: gp.hasIris,
            leftIris: gp.leftIris ?? null,
            rightIris: gp.rightIris ?? null,
            faceVisible: true,
            fps: currentFps,
            rawOffsetX: gp.rawOffsetX,
            rawOffsetY: gp.rawOffsetY,
            confidence: gp.confidence,
            isBlink: gp.isBlink,
            is5PointCalibrated: Boolean(calibration5PtRef.current?.isCalibrated),
            gazeT: gp.t,
            headYaw: face.pose.yaw,
            leftEyeX: gp.leftEyeX ?? gp.x,
            leftEyeY: gp.leftEyeY ?? gp.y,
            rightEyeX: gp.rightEyeX ?? gp.x,
            rightEyeY: gp.rightEyeY ?? gp.y,
            analyticsGazeX: analyticsGaze.x,
            analyticsGazeY: analyticsGaze.y,
            analyticsLeftEyeX: analyticsGaze.leftEyeX ?? analyticsGaze.x,
            analyticsLeftEyeY: analyticsGaze.leftEyeY ?? analyticsGaze.y,
            analyticsRightEyeX: analyticsGaze.rightEyeX ?? analyticsGaze.x,
            analyticsRightEyeY: analyticsGaze.rightEyeY ?? analyticsGaze.y,
            distanceCm,
            distanceStatus,
          });

          if (recordingRef.current && gazeHistoryRef.current.length > 30) {
            const windowData = gazeHistoryRef.current.slice(-120);
            const nys = detectNystagmusHeuristic(windowData);
            setNystagmus(nys);

            const heads = headHistoryRef.current.slice(-120);
            const vor = scoreVOR(windowData, heads);
            setLiveVOR(vor);
          }
        }
      } else {
        drawSearching(ctx, w, h);
        if (now - hudTimer > HUD_SYNC_INTERVAL_MS) {
          hudTimer = now;
          setLiveData((prev) => ({
            ...prev,
            hasIris: false,
            faceVisible: false,
            fps: currentFps,
            distanceStatus: 'searching',
          }));
        }
      }
    };

    onFrame();
  }, [hi, liveData.fps]);

  /* ---------------------------------------------------------- ensure model ready */
  const ensureModelReady = useCallback(async (): Promise<boolean> => {
    if (trackerRef.current) return true;
    try {
      setModelFailed(false);
      const tracker = await createFaceTracker();
      trackerRef.current = tracker;
      setModelReady(true);
      return true;
    } catch {
      setModelFailed(true);
      return false;
    }
  }, []);

  /* ---------------------------------------------------------- start camera */
  const startCamera = useCallback(async () => {
    setCameraState('starting');
    setCameraError(null);
    try {
      await ensureModelReady();
      const video = videoRef.current;
      if (!video) throw new Error('Video element unavailable');

      const handle = await openCamera(video);
      cameraRef.current = handle;
      setCameraState('live');
      loop();
    } catch (err: unknown) {
      setCameraState('error');
      setCameraError(cameraErrorKey(err));
    }
  }, [ensureModelReady, loop]);

  /* ---------------------------------------------------------- stop camera */
  const stopCamera = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (cameraRef.current) {
      cameraRef.current.stop();
      cameraRef.current = null;
    }
    setCameraState('idle');
    setLiveData(EMPTY_LIVE);
  }, []);

  /* ---------------------------------------------------------- recording controls */
  const startRecording = useCallback(() => {
    gazeHistoryRef.current = [];
    headHistoryRef.current = [];
    sessionStartRef.current = performance.now();
    recordingRef.current = true;
    setIsRecording(true);
    setSession(EMPTY_SESSION);
    setSyncMarkerT(null);
  }, []);

  const markSyncPoint = useCallback(() => {
    if (!recordingRef.current) return;
    const elapsedMs = performance.now() - sessionStartRef.current;
    setSyncMarkerT(elapsedMs);
  }, []);

  const stopRecording = useCallback(() => {
    recordingRef.current = false;
    setIsRecording(false);

    const durationMs = performance.now() - sessionStartRef.current;
    const gazes = gazeHistoryRef.current;
    const heads = headHistoryRef.current;

    if (gazes.length < 10) return;

    const fixations = detectFixations(gazes);
    const saccades = detectSaccades(gazes);
    const vorScore = scoreVOR(gazes, heads);
    const nystagmus = detectNystagmusHeuristic(gazes);
    const antiSaccadeErrorRate = computeAntiSaccadeErrorRate(saccades, heads);

    const totalFixationTime = fixations.reduce((sum, f) => sum + f.duration, 0);
    const fixationFraction = durationMs > 0 ? totalFixationTime / durationMs : 0;
    const meanFixationDuration = fixations.length ? totalFixationTime / fixations.length : 0;
    const meanSaccadeVelocity = saccades.length
      ? saccades.reduce((sum, s) => sum + s.peakVelocityDeg, 0) / saccades.length
      : 0;

    const analytics: GazeAnalytics = {
      fixations,
      saccades,
      fixationFraction,
      meanFixationDuration,
      meanSaccadeVelocity,
      vorScore,
      nystagmus,
      antiSaccadeErrorRate,
      clinicalGuidance: '',
      centralPeripheralLoc: 'normal',
      insight: generateInsight(
        {
          fixations, saccades, vorScore, nystagmus, antiSaccadeErrorRate,
          clinicalGuidance: '', centralPeripheralLoc: 'normal',
          fixationFraction, meanFixationDuration, meanSaccadeVelocity, insight: '',
        },
        hi ? 'hi' : 'en',
      ),
    };

    setSession({ gazeHistory: gazes, headHistory: heads, analytics, durationMs });

    const newSession: GazeSession = {
      id: `gaze-${Date.now()}`,
      date: new Date().toISOString(),
      exerciseId: 'gaze-analytics',
      analytics,
      durationMs,
      createdAt: new Date().toISOString(),
      referenceTag: referenceTag.trim() || undefined,
      syncMarkerT: syncMarkerT ?? undefined,
    };

    saveGazeSession(newSession);
    setHistorySessions((prev) => [newSession, ...prev]);

    syncGazeSessionToBackend(newSession);

    setTab('session');
  }, [hi, referenceTag, syncMarkerT]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  const adherence = useMemo(() => summariseGazeAdherence(historySessions), [historySessions]);

  return (
    <div className="min-h-screen bg-[#070a12] text-slate-100 font-sans pb-16">
      {/* ── Top Header ───────────────────────────────────────────── */}
      <div className="border-b border-white/10 bg-[#0b0f19]/80 backdrop-blur-xl sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-teal-400 uppercase tracking-widest">
              <Brain className="w-4 h-4 text-teal-400" />
              i-Dhanwantari VRT Gaze Analytics Engine v2.0
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight mt-1">
              {hi ? 'एआई गेज़ एवं वेस्टिबुलर रीहैब एनालिटिक्स' : 'AI Gaze & Vestibular Rehab Analytics'}
            </h1>
          </div>

          <div className="flex gap-3 flex-wrap">
            <StatBadge label={hi ? 'कुल सत्र' : 'Sessions'} value={String(adherence.totalSessions)} icon={<Activity className="w-3.5 h-3.5" />} />
            <StatBadge label={hi ? 'VOR लाभ' : 'VOR Gain'} value={adherence.meanVORGain > 0 ? adherence.meanVORGain.toFixed(2) : '—'} icon={<Gauge className="w-3.5 h-3.5" />} accent />
            <StatBadge label={hi ? 'रुझान' : 'Trend'} value={adherence.trend === 'improving' ? '↑' : adherence.trend === 'declining' ? '↓' : '→'} icon={<TrendingUp className="w-3.5 h-3.5" />} />
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-3">
          <div className="flex gap-1 bg-white/5 rounded-xl p-1 w-fit border border-white/5 flex-wrap">
            {(['live', 'pursuit', 'session', 'longitudinal', 'report'] as Tab[]).map(t => (
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
                  : t === 'longitudinal' ? (hi ? '📈 दीर्घकालिक' : '📈 Longitudinal')
                  : (hi ? '🧾 VNG रिपोर्ट' : '🧾 VNG Report')}
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
            canvasRef={canvasRef}
            onStartCamera={startCamera}
            onStopCamera={stopCamera}
            onStartRecording={startRecording}
            onStopRecording={stopRecording}
            onCalibrateGaze={calibrateNeutralGaze}
            onOpen5PointWizard={() => setIsWizardOpen(true)}
            referenceTag={referenceTag}
            onReferenceTagChange={setReferenceTag}
            syncMarkerT={syncMarkerT}
            onMarkSyncPoint={markSyncPoint}
          />
        )}
        {tab === 'pursuit' && (
          <RedDotPursuitTab
            hi={hi}
            cameraState={cameraState}
            liveData={liveData}
            canvasRef={canvasRef}
            onStartCamera={startCamera}
            onStopCamera={stopCamera}
            onCalibrateGaze={calibrateNeutralGaze}
            onEnsureModelReady={ensureModelReady}
            modelFailed={modelFailed}
            onSaveSession={(newSession, gazes, heads) => {
              setHistorySessions(prev => [newSession, ...prev]);
              setSession({
                gazeHistory: gazes,
                headHistory: heads,
                analytics: newSession.analytics,
                durationMs: newSession.durationMs,
              });
            }}
          />
        )}
        {tab === 'session' && (
          <SessionHistoryTab
            hi={hi}
            gazeHistory={session.gazeHistory}
            analytics={session.analytics}
            durationMs={session.durationMs}
          />
        )}
        {tab === 'longitudinal' && (
          <LongitudinalTab hi={hi} sessions={historySessions} adherence={adherence} />
        )}
        {tab === 'report' && (
          <VngBatteryReport hi={hi} sessions={historySessions} />
        )}
      </div>

      <video ref={videoRef} className="hidden" playsInline muted aria-hidden="true" />

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
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  onStartCamera: () => void;
  onStopCamera: () => void;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onCalibrateGaze?: () => void;
  onOpen5PointWizard?: () => void;
  referenceTag: string;
  onReferenceTagChange: (v: string) => void;
  syncMarkerT: number | null;
  onMarkSyncPoint: () => void;
}> = ({
  hi, cameraState, cameraError, modelReady, modelFailed,
  isRecording, liveData, liveVOR, nystagmus,
  canvasRef,
  onStartCamera, onStopCamera, onStartRecording, onStopRecording, onCalibrateGaze, onOpen5PointWizard,
  referenceTag, onReferenceTagChange, syncMarkerT, onMarkSyncPoint,
}) => {
  const vorGain = liveVOR?.gain ?? 0;
  const vorColor = VOR_COLOUR(vorGain);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <div className="xl:col-span-2 space-y-4">
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

        {cameraState === 'live' && (
          <div className="flex flex-wrap items-center gap-2 p-3 rounded-xl bg-white/3 border border-white/8">
            <Info className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <input
              type="text"
              value={referenceTag}
              onChange={(e) => onReferenceTagChange(e.target.value)}
              placeholder={hi ? 'रेफरेंस टैग (जैसे "VNG ICS Impulse #4") — कैलिब्रेशन सत्र के लिए' : 'Reference tag (e.g. "VNG ICS Impulse run #4") — for a paired calibration session'}
              className="flex-1 min-w-[200px] bg-transparent text-xs text-slate-200 placeholder:text-slate-600 outline-none"
            />
            {isRecording && (
              <button
                onClick={onMarkSyncPoint}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-500/20 border border-violet-400/40 hover:bg-violet-500/30 text-violet-200 text-[11px] font-bold transition-all shrink-0"
              >
                <Zap className="w-3 h-3" />
                {hi ? 'सिंक पॉइंट मार्क करें' : 'Mark Sync Point'}
                {syncMarkerT !== null && ` (${(syncMarkerT / 1000).toFixed(1)}s)`}
              </button>
            )}
          </div>
        )}

        <div className="relative bg-black rounded-2xl overflow-hidden border border-white/10 aspect-video flex items-center justify-center">
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

              <span className="absolute top-3 right-3 px-2.5 py-1 rounded-full text-[10px] font-mono bg-slate-900/80 border border-slate-600/40 text-slate-300 backdrop-blur-md">
                {liveData.fps} FPS
              </span>

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

        {nystagmus.detected && (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-950/60 border border-amber-500/40 text-amber-200">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-amber-100">
                {hi ? 'आँखों में अनैच्छिक कंपन' : 'Involuntary Eye Oscillation Detected'}
              </p>
              <p className="text-xs text-amber-300 mt-0.5">
                {`SPV ${nystagmus.slowPhaseVelocityDegPerSec.toFixed(1)}°/s`}
                {nystagmus.fastPhaseDirection !== 'none' && `, ${nystagmus.fastPhaseDirection}-beating`}
                {` · ${nystagmus.frequencyHz} Hz · ${Math.round(nystagmus.beatsPerMinute)} ${hi ? 'बीट/मिनट' : 'beats/min'}`}
              </p>
            </div>
          </div>
        )}

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

      <div className="space-y-4">
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
              <MiniMetric
                label={hi ? 'फेज़ त्रुटि' : 'Phase err.'}
                value={liveVOR.phaseLagMs !== 0 ? `${liveVOR.phaseErrorDeg.toFixed(0)}° / ${liveVOR.phaseLagMs}ms` : '—'}
              />
            </div>
          )}
        </div>

        <div className="bg-gradient-to-br from-white/5 to-white/2 rounded-2xl border border-white/10 p-5 space-y-3">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">{hi ? 'गेज़ स्थिति' : 'Gaze Position'}</h3>
          <GazeRadar x={liveData.gazeX} y={liveData.gazeY} active={liveData.faceVisible} />
          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <div className="bg-white/5 rounded-lg p-2">
              <span className="text-cyan-400">X</span>
              <span className="text-white ml-2">{(liveData.gazeX * 100).toFixed(1)}%</span>
            </div>
            <div className="bg-white/5 rounded-lg p-2">
              <span className="text-cyan-400">Y</span>
              <span className="text-white ml-2">{(liveData.gazeY * 100).toFixed(1)}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ============================================================ Helper Components */
function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white/5 p-2 rounded-xl border border-white/5 text-center">
      <span className="text-[10px] text-slate-400 font-medium block">{label}</span>
      <span className="text-sm font-bold text-white font-mono">{value}</span>
    </div>
  );
}

function VORRing({ gain, color }: { gain: number; color: string }) {
  const pct = Math.min(gain / 1.2, 1);
  const r = 44;
  const circ = 2 * Math.PI * r;
  const strokeDashoffset = circ * (1 - pct);

  return (
    <div className="relative w-28 h-28 flex items-center justify-center">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={r} stroke="rgba(255,255,255,0.06)" strokeWidth="8" fill="none" />
        <circle
          cx="50" cy="50" r={r}
          stroke={color} strokeWidth="8" fill="none"
          strokeDasharray={circ}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-300"
        />
      </svg>
    </div>
  );
}

function GazeRadar({ x, y, active }: { x: number; y: number; active: boolean }) {
  return (
    <div className="relative aspect-video bg-[#0d1117] rounded-xl border border-white/10 overflow-hidden flex items-center justify-center">
      <div className="absolute inset-0 border-t border-white/5 top-1/2" />
      <div className="absolute inset-0 border-l border-white/5 left-1/2" />
      <div className="absolute w-16 h-16 rounded-full border border-white/5" />
      <div className="absolute w-32 h-32 rounded-full border border-white/5" />
      {active ? (
        <div
          className="absolute w-3.5 h-3.5 rounded-full bg-cyan-400 border-2 border-white shadow-lg shadow-cyan-500/50 transition-all duration-75"
          style={{
            left: `calc(${x * 100}% - 7px)`,
            top: `calc(${y * 100}% - 7px)`,
          }}
        />
      ) : (
        <div className="text-[10px] text-slate-600 font-mono">SEARCHING…</div>
      )}
    </div>
  );
}
