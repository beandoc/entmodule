import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play, Square, RotateCcw, Camera, Info, Volume2, VolumeX,
  Mic, MicOff, Maximize2, Minimize2, Clock, Sparkles, Activity, Target, Brain
} from 'lucide-react';
import {
  CameraState, LiveData, PursuitPattern, EyeTracingPoint, targetPositionAt, HUD_SYNC_INTERVAL_MS,
  NYSTAGMUS_PATTERNS,
} from './GazeCanvasHelpers';
import { EyeTracingGraph } from './EyeTracingGraph';
import { VNGReportCard } from '../VNGReportCard';
import {
  GazePoint, PursuitTargetPoint, PursuitScore, VORScore, VorX2Validation,
  OptokineticMetrics, scoreSmoothPursuit, scoreVOR, validateVorX2Opposition,
  computeOptokineticMetrics, detectSaccades, OKN_STIMULUS_DEG_PER_SEC,
  GazeSession, GazeAnalytics, saveGazeSession, syncGazeSessionToBackend,
  detectFixations, detectNystagmusHeuristic, computeAntiSaccadeErrorRate, generateInsight,
} from '@/lib/gaze-tracking';
import {
  SmoothPursuitVNGScore, VorX1Score, VorX2Score, SaccadeScore, OknScore, NystagmusVNGScore,
  scoreSmoothPursuitVNG, scoreVorX1, scoreVorX2, scoreSaccades, scoreOKN, scoreNystagmusVNG
} from '@/lib/vng-analytics';

/** Nystagmus/gaze-hold screens follow clinical VNG convention (30s per hold); pursuit/saccade/OKN keep the existing 60s window. */
function testDurationSec(pattern: PursuitPattern): number {
  return NYSTAGMUS_PATTERNS.includes(pattern) ? 30 : 60;
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white/5 p-2 rounded-xl border border-white/5 text-center">
      <span className="text-[10px] text-slate-400 font-medium block">{label}</span>
      <span className="text-sm font-bold text-white font-mono">{value}</span>
    </div>
  );
}

export const RedDotPursuitTab: React.FC<{
  hi: boolean;
  cameraState: CameraState;
  liveData: LiveData;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  onStartCamera: () => void | Promise<void>;
  onStopCamera: () => void;
  onCalibrateGaze?: () => void;
  onEnsureModelReady: () => Promise<boolean>;
  modelFailed: boolean;
  onSaveSession?: (session: GazeSession, gazes: GazePoint[], heads: Array<{ t: number; yaw: number }>) => void;
}> = ({
  hi, cameraState, liveData, canvasRef, onStartCamera, onStopCamera, onCalibrateGaze,
  onEnsureModelReady, modelFailed, onSaveSession,
}) => {
  const targetCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const eyeTracingGraphRef = useRef<HTMLDivElement | null>(null);

  const [pattern, setPattern] = useState<PursuitPattern>('horizontal');
  const [isPreparingTest, setIsPreparingTest] = useState(false);
  const [speedHz, setSpeedHz] = useState<number>(0.4);
  const [isTesting, setIsTesting] = useState(false);

  // 60-Second Test Countdown Timer State
  const [timeLeftSec, setTimeLeftSec] = useState<number>(60);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Camera PIP Minimization Toggle
  const [isCameraMinimized, setIsCameraMinimized] = useState(false);

  // Voice Feedback & Hands-Free Voice Command States
  const [voiceFeedbackEnabled, setVoiceFeedbackEnabled] = useState(true);
  const [isVoiceCommandActive, setIsVoiceCommandActive] = useState(false);
  const [lastVoiceCommand, setLastVoiceCommand] = useState<string | null>(null);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const recognitionRef = useRef<any>(null);

  // 2-Point Rule Symptom VAS (0-10)
  const [symptomBefore, setSymptomBefore] = useState<number>(2);
  const [symptomAfter, setSymptomAfter] = useState<number>(2);

  // Live real-time error & score
  const [liveErrorPct, setLiveErrorPct] = useState<number>(0);
  const [resultScore, setResultScore] = useState<PursuitScore | null>(null);
  const [vorResult, setVorResult] = useState<VORScore | null>(null);
  const [vorOpposition, setVorOpposition] = useState<VorX2Validation | null>(null);
  const [oknResult, setOknResult] = useState<OptokineticMetrics | null>(null);

  // Mode-Specific VNG Scoring Engine State
  const [vngPursuitScore, setVngPursuitScore] = useState<SmoothPursuitVNGScore | null>(null);
  const [vngVorX1Score, setVngVorX1Score] = useState<VorX1Score | null>(null);
  const [vngVorX2Score, setVngVorX2Score] = useState<VorX2Score | null>(null);
  const [vngSaccadeScore, setVngSaccadeScore] = useState<SaccadeScore | null>(null);
  const [vngOknScore, setVngOknScore] = useState<OknScore | null>(null);
  const [vngNystagmusScore, setVngNystagmusScore] = useState<NystagmusVNGScore | null>(null);

  // ── Track 4B: Pre-session environment preflight ──────────────────────────
  type PreflightStatus = 'idle' | 'checking' | 'ready' | 'warn' | 'blocked';
  const [preflightStatus, setPreflightStatus] = useState<PreflightStatus>('idle');
  const [preflightIssues, setPreflightIssues] = useState<string[]>([]);
  const [preflightDismissed, setPreflightDismissed] = useState(false);

  // ── Track 4A: Adaptive frequency progression ─────────────────────────────
  type ProgressionSuggestion = 'advance' | 'stepdown' | null;
  const [progressionSuggestion, setProgressionSuggestion] = useState<ProgressionSuggestion>(null);
  const [progressionMsg, setProgressionMsg] = useState<string>('');
  // Ring buffer of the last 2 PQI scores for smooth-pursuit sessions
  const recentPqiRef = useRef<number[]>([]);

  // Eye Tracing Real-Time Waveform Samples
  const waveformBufferRef = useRef<EyeTracingPoint[]>([]);
  const [waveformSamples, setWaveformSamples] = useState<EyeTracingPoint[]>([]);
  const lastWaveformSyncRef = useRef<number>(0);

  const targetHistoryRef = useRef<PursuitTargetPoint[]>([]);
  const gazeHistoryRef = useRef<GazePoint[]>([]);
  const testStartRef = useRef<number>(0);
  const animFrameRef = useRef<number | null>(null);

  const liveDataRef = useRef(liveData);
  const isTestingRef = useRef(isTesting);
  const startTimeRef = useRef<number>(performance.now());
  const headHistoryRef = useRef<Array<{ t: number; yaw: number }>>([]);
  const lastErrorSyncRef = useRef<number>(0);
  // Once a test has completed, the waveform graph freezes on that recording
  // instead of continuing to scroll with post-test live camera noise (which
  // used to overwrite the just-recorded test data and made it look like the
  // test was still running).
  const everTestedRef = useRef(false);
  const [hasCompletedTest, setHasCompletedTest] = useState(false);

  // Calibration Guided States & Voice Feedback
  const [isCalibratingCenter, setIsCalibratingCenter] = useState(false);
  const [calibrationSuccessBadge, setCalibrationSuccessBadge] = useState<string | null>(null);
  const isCalibratingCenterRef = useRef(false);
  const calibrationSuccessBadgeRef = useRef<string | null>(null);

  useEffect(() => { liveDataRef.current = liveData; }, [liveData]);
  useEffect(() => { isTestingRef.current = isTesting; }, [isTesting]);
  useEffect(() => { isCalibratingCenterRef.current = isCalibratingCenter; }, [isCalibratingCenter]);
  useEffect(() => { calibrationSuccessBadgeRef.current = calibrationSuccessBadge; }, [calibrationSuccessBadge]);

  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, []);

  // ── Track 4B: Environment preflight ──────────────────────────────────────
  // Analyses a single frame from the live video to check lighting quality.
  // Sampling: take the center 40% of the canvas, compute mean luma.
  const runEnvironmentPreflight = useCallback(async (): Promise<boolean> => {
    setPreflightStatus('checking');
    const issues: string[] = [];

    // 1. Distance gate
    if (liveDataRef.current.distanceStatus !== 'optimal') {
      const dist = liveDataRef.current.distanceCm;
      issues.push(hi
        ? `दूरी ${dist}cm — 50–60cm पर बैठें`
        : `Distance ${dist} cm — sit 50–60 cm from screen`);
    }

    // 2. Lighting — sample face visibility and landmark confidence
    const canvas = canvasRef.current;
    if (canvas) {
      try {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const w = canvas.width, h = canvas.height;
          const sx = Math.floor(w * 0.3), sy = Math.floor(h * 0.3);
          const sw = Math.floor(w * 0.4), sh = Math.floor(h * 0.4);
          if (sw > 0 && sh > 0) {
            const imgData = ctx.getImageData(sx, sy, sw, sh);
            const d = imgData.data;
            let lumaSum = 0;
            for (let i = 0; i < d.length; i += 4) {
              lumaSum += 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
            }
            const meanLuma = lumaSum / (d.length / 4);
            if (meanLuma < 40) {
              issues.push(hi
                ? 'कमरे में प्रकाश बहुत कम है — अधिक रोशनी करें'
                : 'Room too dark — improve lighting before starting');
            } else if (meanLuma > 220) {
              issues.push(hi
                ? 'बैकलाइट बहुत तेज़ है — खिड़की से दूर बैठें'
                : 'Strong backlight detected — move away from window/light source');
            }
          }
        }
      } catch (_) { /* canvas tainted or unavailable — skip */ }
    }

    // 3. Face not visible
    if (!liveDataRef.current.faceVisible) {
      issues.push(hi
        ? 'चेहरा नहीं दिख रहा — कैमरे के सामने बैठें'
        : 'Face not detected — position yourself in front of the camera');
    }

    const isBlocked = issues.length >= 3;
    setPreflightIssues(issues);
    setPreflightStatus(isBlocked ? 'blocked' : issues.length > 0 ? 'warn' : 'ready');
    return isBlocked;
  }, [hi, canvasRef]);


  // Natural Voice Feedback (Text-to-Speech)
  const speakInstruction = useCallback((text: string) => {
    if (!voiceFeedbackEnabled || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.95;
      utterance.pitch = 1.0;

      const voices = window.speechSynthesis.getVoices();
      if (voices && voices.length > 0) {
        if (hi) {
          const hiVoice = voices.find(v => v.lang.includes('hi') || v.name.includes('Hindi'));
          if (hiVoice) utterance.voice = hiVoice;
        } else {
          const enVoice = voices.find(v => (v.lang.includes('en-US') || v.lang.includes('en-GB')) && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha')));
          if (enVoice) utterance.voice = enVoice;
        }
      }
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn('Speech synthesis error:', err);
    }
  }, [voiceFeedbackEnabled, hi]);

  const handleCalibrateWithVoice = useCallback(() => {
    if (isCalibratingCenter) return;
    setIsCalibratingCenter(true);

    const startMsg = hi
      ? 'सेंटर गेज़ कैलिब्रेट हो रहा है। स्क्रीन के मध्य लाल बिंदु पर सीधे देखें।'
      : 'Calibrating center gaze. Look directly at the red center target.';
    speakInstruction(startMsg);

    setTimeout(() => {
      if (onCalibrateGaze) onCalibrateGaze();
      setIsCalibratingCenter(false);

      const completeMsg = hi
        ? 'कैलिब्रेशन पूरा हुआ। जीरो पॉइंट सेट हो गया है।'
        : 'Calibration complete. Zero point centered successfully.';
      speakInstruction(completeMsg);

      setCalibrationSuccessBadge(
        hi ? '✓ गेज़ कैलिब्रेटेड (0° Center)' : '✓ Gaze Calibrated at 0° Center'
      );
      setTimeout(() => setCalibrationSuccessBadge(null), 4000);
    }, 1500);
  }, [hi, isCalibratingCenter, onCalibrateGaze, speakInstruction]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        setVoiceSupported(true);
      }
    }
  }, []);

  // Animated Target Loop (60 FPS smooth motion)
  useEffect(() => {
    const canvas = targetCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    startTimeRef.current = performance.now();
    let lastRecordedGazeT = -1;

    const render = () => {
      animFrameRef.current = requestAnimationFrame(render);

      const w = canvas.parentElement?.clientWidth || 640;
      const h = canvas.parentElement?.clientHeight || 360;
      if (canvas.width !== w) canvas.width = w;
      if (canvas.height !== h) canvas.height = h;

      const now = performance.now();
      const elapsed = (now - startTimeRef.current) / 1000;

      // Background grid
      ctx.fillStyle = '#0b0f19';
      ctx.fillRect(0, 0, w, h);

      ctx.strokeStyle = 'rgba(255,255,255,0.05)';
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
      for (let y = 0; y < h; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }

      const curTesting = isTestingRef.current;

      const { x: tx, y: ty } = curTesting
        ? targetPositionAt(elapsed, pattern, speedHz)
        : { x: 0.5, y: 0.5 };

      const dotX = tx * w;
      const dotY = ty * h;

      // Draw red dot target
      ctx.beginPath();
      ctx.arc(dotX, dotY, 18, 0, Math.PI * 2);
      ctx.fillStyle = curTesting ? 'rgba(239, 68, 68, 0.25)' : 'rgba(239, 68, 68, 0.15)';
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
      ctx.fillStyle = curTesting ? '#f87171' : '#94a3b8';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText(
        curTesting
          ? (hi ? '🔴 लक्ष्य (यहाँ देखें)' : '🔴 Target (Track With Eyes)')
          : (hi ? '🔴 लक्ष्य (स्थिर - टेस्ट शुरू करें)' : '🔴 Target (Stationary - Click Start)'),
        dotX + 16, dotY + 4
      );

      const curLiveData = liveDataRef.current;

      // Freeze waveform capture once a test has completed — only a fresh
      // "Start" resumes it — so the recorded test trace stays on screen for
      // review instead of scrolling away under post-test live camera noise.
      const captureActive = curTesting || !everTestedRef.current;

      if (captureActive && (curLiveData.gazeT !== lastRecordedGazeT || (curTesting && now - lastRecordedGazeT > 30))) {
        lastRecordedGazeT = curLiveData.gazeT || now;

        const sampleElapsed = (now - startTimeRef.current) / 1000;
        const paired = curTesting
          ? targetPositionAt(sampleElapsed, pattern, speedHz)
          : { x: 0.5, y: 0.5 };

        const sample: EyeTracingPoint = {
          t: curLiveData.gazeT || now,
          targetX: paired.x,
          targetY: paired.y,
          rightEyeX: curLiveData.rightEyeX ?? curLiveData.gazeX,
          rightEyeY: curLiveData.rightEyeY ?? curLiveData.gazeY,
          leftEyeX: curLiveData.leftEyeX ?? curLiveData.gazeX,
          leftEyeY: curLiveData.leftEyeY ?? curLiveData.gazeY,
          isBlink: curLiveData.isBlink,
        };

        waveformBufferRef.current.push(sample);
        if (waveformBufferRef.current.length > 1800) {
          waveformBufferRef.current.shift();
        }

        if (curTesting) {
          targetHistoryRef.current.push({
            x: paired.x, y: paired.y, t: curLiveData.gazeT || now, mode: pattern,
          });
          // Scoring needs the strict, un-smoothed analytics stream — `gazeX`/
          // `gazeY` are One-Euro filtered (and can hold position through an
          // outlier-rejected fast jump) for a jitter-free crosshair, which
          // smears or drops exactly the transients saccade/nystagmus/pursuit
          // scoring depends on. Falls back to the smoothed fields if a caller
          // hasn't populated the analytics ones (e.g. older LiveData shape).
          gazeHistoryRef.current.push({
            x: curLiveData.analyticsGazeX ?? curLiveData.gazeX,
            y: curLiveData.analyticsGazeY ?? curLiveData.gazeY,
            t: curLiveData.gazeT || now,
            hasIris: curLiveData.faceVisible && curLiveData.hasIris && !curLiveData.isBlink,
            isBlink: curLiveData.isBlink ?? false,
            confidence: curLiveData.faceVisible ? (curLiveData.confidence ?? 0.9) : 0.05,
            leftEyeX: curLiveData.analyticsLeftEyeX ?? curLiveData.leftEyeX,
            leftEyeY: curLiveData.analyticsLeftEyeY ?? curLiveData.leftEyeY,
            rightEyeX: curLiveData.analyticsRightEyeX ?? curLiveData.rightEyeX,
            rightEyeY: curLiveData.analyticsRightEyeY ?? curLiveData.rightEyeY,
          });
          headHistoryRef.current.push({ t: curLiveData.gazeT || now, yaw: curLiveData.headYaw });
        }

        if (now - lastWaveformSyncRef.current >= 16) {
          lastWaveformSyncRef.current = now;
          setWaveformSamples([...waveformBufferRef.current]);
        }
      }

      if (curTesting && curLiveData.faceVisible) {
        const gazeX = curLiveData.gazeX * w;
        const gazeY = curLiveData.gazeY * h;

        ctx.beginPath();
        ctx.arc(gazeX, gazeY, 12, 0, Math.PI * 2);
        ctx.strokeStyle = '#22d3ee';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(gazeX, gazeY, 3, 0, Math.PI * 2);
        ctx.fillStyle = '#22d3ee';
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(dotX, dotY);
        ctx.lineTo(gazeX, gazeY);
        ctx.strokeStyle = 'rgba(34,211,238,0.35)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.setLineDash([]);

        if (now - lastErrorSyncRef.current >= HUD_SYNC_INTERVAL_MS) {
          lastErrorSyncRef.current = now;
          const dist = Math.hypot(curLiveData.gazeX - tx, curLiveData.gazeY - ty);
          setLiveErrorPct(Math.min(Math.round(dist * 100 * 2), 100));
        }

        if (pattern === 'vor-x2' && curTesting) {
          const recentHeads = headHistoryRef.current.slice(-30);
          if (recentHeads.length > 10) {
            const dtSec = (recentHeads[recentHeads.length - 1].t - recentHeads[0].t) / 1000;
            const yawSpan = Math.abs(recentHeads[recentHeads.length - 1].yaw - recentHeads[0].yaw);
            const headVel = dtSec > 0 ? yawSpan / dtSec : 0;
            if (headVel < 12) {
              ctx.save();
              ctx.fillStyle = 'rgba(225, 29, 72, 0.9)';
              ctx.shadowColor = 'rgba(225, 29, 72, 0.5)';
              ctx.shadowBlur = 12;
              ctx.beginPath();
              ctx.roundRect(w / 2 - 210, 60, 420, 34, 10);
              ctx.fill();
              ctx.fillStyle = '#ffffff';
              ctx.font = 'bold 11px sans-serif';
              ctx.textAlign = 'center';
              ctx.fillText(
                hi
                  ? '🗣 VOR x2: कृपया सिर को लाल बिंदु की विपरीत दिशा में घुमाएं (1–2 Hz)!'
                  : '🗣 VOR x2 ACTIVE: Turn your head left & right opposite to the red dot!',
                w / 2,
                82
              );
              ctx.restore();
            }
          }
        }
      }

      if (isCalibratingCenterRef.current) {
        ctx.save();
        const pulseR = 24 + Math.sin(now / 150) * 6;
        ctx.beginPath();
        ctx.arc(w / 2, h / 2, pulseR, 0, Math.PI * 2);
        ctx.strokeStyle = '#22d3ee';
        ctx.lineWidth = 3;
        ctx.shadowColor = '#22d3ee';
        ctx.shadowBlur = 15;
        ctx.stroke();

        ctx.fillStyle = 'rgba(6, 182, 212, 0.9)';
        ctx.roundRect(w / 2 - 180, h / 2 + 40, 360, 32, 10);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(
          hi ? '🎯 कैलिब्रेट हो रहा है... लाल बिंदु पर देखें' : '🎯 CALIBRATING GAZE — Look at red dot...',
          w / 2,
          h / 2 + 60
        );
        ctx.restore();
      }

      if (calibrationSuccessBadgeRef.current) {
        ctx.save();
        ctx.fillStyle = 'rgba(16, 185, 129, 0.9)';
        ctx.shadowColor = 'rgba(16, 185, 129, 0.5)';
        ctx.shadowBlur = 10;
        ctx.roundRect(w / 2 - 160, 16, 320, 32, 10);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(calibrationSuccessBadgeRef.current, w / 2, 36);
        ctx.restore();
      }
    };

    render();

    return () => {
      if (animFrameRef.current !== null) cancelAnimationFrame(animFrameRef.current);
    };
  }, [pattern, speedHz, hi]);

  const startTest = useCallback(async () => {
    // Run environment preflight if not already dismissed / passed this session.
    // runEnvironmentPreflight returns true when conditions are hard-blocked (3+ issues).
    if (!preflightDismissed && preflightStatus === 'idle') {
      const isBlocked = await runEnvironmentPreflight();
      if (isBlocked) return;
    }

    if (cameraState !== 'live') await onStartCamera();

    setIsPreparingTest(true);
    const modelReady = await onEnsureModelReady();
    setIsPreparingTest(false);

    if (!modelReady) {
      speakInstruction(hi
        ? 'ट्रैकिंग मॉडल लोड नहीं हो सका। कृपया पेज रीफ्रेश करके दोबारा प्रयास करें।'
        : 'The tracking model failed to load. Please refresh the page and try again.');
      return;
    }

    gazeHistoryRef.current = [];
    headHistoryRef.current = [];
    targetHistoryRef.current = [];
    waveformBufferRef.current = [];
    setWaveformSamples([]);
    everTestedRef.current = false;
    setHasCompletedTest(false);

    testStartRef.current = performance.now();
    startTimeRef.current = performance.now();
    setResultScore(null);
    setOknResult(null);
    setVorOpposition(null);
    setVngPursuitScore(null);
    setVngVorX1Score(null);
    setVngVorX2Score(null);
    setVngSaccadeScore(null);
    setVngOknScore(null);
    setVngNystagmusScore(null);
    setIsTesting(true);
    setTimeLeftSec(testDurationSec(pattern));

    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    timerIntervalRef.current = setInterval(() => {
      setTimeLeftSec(prev => {
        if (prev <= 1) {
          if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
          stopTestRef.current();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    const durationSec = testDurationSec(pattern);
    const startMsg = hi
      ? (pattern === 'vor-x2'
          ? `${durationSec} सेकंड का VOR x2 गेज़ टेस्ट शुरू हो रहा है। स्क्रीन पर बिंदु के विपरीत दिशा में अपना सिर घुमाएं।`
          : pattern === 'spontaneous'
          ? `${durationSec} सेकंड की स्क्रीनिंग शुरू हो रही है। सिर स्थिर रखें और बीच के बिंदु को सहजता से देखें — किसी विशेष कार्य की आवश्यकता नहीं।`
          : NYSTAGMUS_PATTERNS.includes(pattern)
          ? `${durationSec} सेकंड की गेज़-होल्ड स्क्रीनिंग शुरू हो रही है। सिर बिल्कुल स्थिर रखें और बिंदु पर स्थिर दृष्टि बनाए रखें।`
          : pattern === 'random-saccade'
          ? `${durationSec} सेकंड का रैंडम सैकेड टेस्ट शुरू हो रहा है। सिर स्थिर रखें और बिंदु के हर उछाल को तुरंत आँखों से पकड़ें।`
          : `${durationSec} सेकंड का स्मूथ परस्यूट गेज़ टेस्ट शुरू हो रहा है। अपना सिर स्थिर रखें और लाल बिंदु को अपनी आँखों से फॉलो करें।`)
      : (pattern === 'vor-x2'
          ? `Starting ${durationSec}-second VOR x2 gaze test. Move your head in the opposite direction of the moving red dot.`
          : pattern === 'spontaneous'
          ? `Starting ${durationSec}-second screening. Keep your head still and rest your gaze softly on the center point — no active task required.`
          : NYSTAGMUS_PATTERNS.includes(pattern)
          ? `Starting ${durationSec}-second gaze-hold screening. Keep your head completely still and hold your gaze steadily on the target.`
          : pattern === 'random-saccade'
          ? `Starting ${durationSec}-second random saccade test. Keep your head still and catch each jump of the dot immediately with your eyes.`
          : `Starting ${durationSec}-second smooth pursuit gaze test. Keep your head still and track the moving red dot with your eyes.`);

    speakInstruction(startMsg);
  }, [cameraState, onStartCamera, onEnsureModelReady, hi, pattern, speakInstruction]);

  const stopTest = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    setIsTesting(false);
    everTestedRef.current = true;
    setHasCompletedTest(true);
    const targets = targetHistoryRef.current;
    const gazes = gazeHistoryRef.current;
    const heads = headHistoryRef.current;
    const saccades = detectSaccades(gazes);
    const lang = hi ? 'hi' : 'en';

    setResultScore(scoreSmoothPursuit(targets, gazes, saccades, lang));
    setVorResult(scoreVOR(gazes, heads));

    // Captured alongside the `setVng*Score` state updates (which are async) so
    // the freshly-computed score can also be persisted onto `newSession` below
    // in this same call, rather than reading stale React state.
    let vngScoreForSession:
      | SmoothPursuitVNGScore | VorX1Score | VorX2Score | SaccadeScore | OknScore | NystagmusVNGScore | null = null;

    if (pattern === 'vor-x2') {
      const opp = validateVorX2Opposition(targets, heads);
      setVorOpposition(opp);
      vngScoreForSession = scoreVorX2(targets, gazes, heads);
      setVngVorX2Score(vngScoreForSession);
    } else if (pattern === 'optokinetic') {
      setOknResult(computeOptokineticMetrics(gazes, targets));
      vngScoreForSession = scoreOKN(gazes, saccades);
      setVngOknScore(vngScoreForSession);
    } else if (pattern === 'saccadic' || pattern === 'random-saccade') {
      vngScoreForSession = scoreSaccades(targets, gazes, saccades);
      setVngSaccadeScore(vngScoreForSession);
    } else if (pattern === 'spontaneous' || NYSTAGMUS_PATTERNS.includes(pattern)) {
      const axisHint = pattern === 'gaze-up' || pattern === 'gaze-down' ? 'vertical' : 'horizontal';
      vngScoreForSession = scoreNystagmusVNG(gazes, axisHint, lang);
      setVngNystagmusScore(vngScoreForSession);
    } else if (pattern === 'vertical') {
      vngScoreForSession = scoreSmoothPursuitVNG(targets, gazes, saccades);
      setVngPursuitScore(vngScoreForSession);
    } else {
      vngScoreForSession = scoreSmoothPursuitVNG(targets, gazes, saccades);
      setVngPursuitScore(vngScoreForSession);
      setVngVorX1Score(scoreVorX1({ x: 0.5, y: 0.5 }, gazes, heads));
    }

    const durationMs = performance.now() - startTimeRef.current;
    const fixations = detectFixations(gazes);

    const analytics: GazeAnalytics = {
      fixations,
      saccades,
      fixationFraction: fixations.reduce((sum, f) => sum + f.duration, 0) / (durationMs || 1),
      meanFixationDuration: fixations.length ? fixations.reduce((sum, f) => sum + f.duration, 0) / fixations.length : 0,
      meanSaccadeVelocity: saccades.length ? saccades.reduce((sum, s) => sum + s.peakVelocityDeg, 0) / saccades.length : 0,
      vorScore: scoreVOR(gazes, heads),
      nystagmus: detectNystagmusHeuristic(gazes),
      antiSaccadeErrorRate: computeAntiSaccadeErrorRate(saccades, heads),
      clinicalGuidance: '',
      centralPeripheralLoc: 'normal',
      insight: generateInsight(
        {
          fixations, saccades, vorScore: scoreVOR(gazes, heads), nystagmus: detectNystagmusHeuristic(gazes), antiSaccadeErrorRate: 0,
          clinicalGuidance: '', centralPeripheralLoc: 'normal',
          fixationFraction: 0.8, meanFixationDuration: 300, meanSaccadeVelocity: 350, insight: '',
        },
        hi ? 'hi' : 'en'
      ),
    };

    const newSession: GazeSession = {
      id: `gaze-${Date.now()}`,
      date: new Date().toISOString(),
      exerciseId: `pursuit-${pattern}`,
      analytics,
      durationMs,
      createdAt: new Date().toISOString(),
      vngScore: vngScoreForSession,
    };

    saveGazeSession(newSession);
    syncGazeSessionToBackend(newSession);
    if (onSaveSession) {
      onSaveSession(newSession, gazes, heads);
    }

    const endMsg = hi
      ? 'टेस्ट पूरा हुआ। नीचे अपनी नैदानिक गेज़ रिपोर्ट कार्ड और वेवफॉर्म देखें।'
      : 'Test complete. Scroll down to review your VNG Clinical Report Card and eye waveforms.';

    speakInstruction(endMsg);

    // ── Track 4A: Frequency auto-progression ─────────────────────────────
    if ((pattern === 'horizontal' || pattern === 'vertical') && vngScoreForSession) {
      const pqi = (vngScoreForSession as SmoothPursuitVNGScore).pursuitQualityIndex ?? 0;
      if (typeof pqi === 'number') {
        const ring = recentPqiRef.current;
        ring.push(pqi);
        if (ring.length > 2) ring.shift(); // keep last 2

        if (ring.length === 2 && ring[0] >= 75 && ring[1] >= 75 && speedHz < 1.15) {
          const nextHz = parseFloat(Math.min(speedHz + 0.1, 1.2).toFixed(2));
          setProgressionSuggestion('advance');
          setProgressionMsg(hi
            ? `🎯 शानदार! लगातार 2 सत्रों में PQI ≥75 — ${nextHz.toFixed(1)} Hz पर आगे बढ़ने का प्रयास करें।`
            : `🎯 Excellent! PQI ≥ 75 for 2 consecutive sessions — try advancing to ${nextHz.toFixed(1)} Hz.`);
        } else if (pqi < 40 && speedHz > 0.15) {
          const prevHz = parseFloat(Math.max(speedHz - 0.1, 0.1).toFixed(2));
          setProgressionSuggestion('stepdown');
          setProgressionMsg(hi
            ? `↓ PQI ${pqi}/100 — इस स्तर पर अभ्यास जारी रखें या ${prevHz.toFixed(1)} Hz तक कम करें।`
            : `↓ PQI ${pqi}/100 — continue at this level or reduce to ${prevHz.toFixed(1)} Hz.`);
        } else {
          setProgressionSuggestion(null);
          setProgressionMsg('');
        }
      }
    }
  }, [hi, onSaveSession, pattern, speakInstruction, speedHz, preflightDismissed, preflightStatus, runEnvironmentPreflight]);


  const stopTestRef = useRef(stopTest);
  useEffect(() => { stopTestRef.current = stopTest; }, [stopTest]);

  const toggleVoiceCommands = () => {
    if (isVoiceCommandActive) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsVoiceCommandActive(false);
      setLastVoiceCommand(null);
      return;
    }

    if (typeof window === 'undefined') return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang = hi ? 'hi-IN' : 'en-US';

      recognition.onstart = () => {
        setIsVoiceCommandActive(true);
      };

      recognition.onresult = (event: any) => {
        const lastIndex = event.results.length - 1;
        const transcript = event.results[lastIndex][0].transcript.trim().toLowerCase();
        setLastVoiceCommand(transcript);

        if (transcript.includes('start') || transcript.includes('शुरू') || transcript.includes('गो') || transcript.includes('begin')) {
          if (!isTestingRef.current) startTest();
        } else if (transcript.includes('stop') || transcript.includes('रोक') || transcript.includes('हाल्ट') || transcript.includes('पॉज़')) {
          if (isTestingRef.current) stopTest();
        } else if (transcript.includes('calibrate') || transcript.includes('कैलिब्रेट')) {
          handleCalibrateWithVoice();
        } else if (transcript.includes('faster') || transcript.includes('तेज़') || transcript.includes('स्पीड बढ़ाओ')) {
          setSpeedHz(prev => Math.min(prev + 0.1, 1.2));
        } else if (transcript.includes('slower') || transcript.includes('धीरे') || transcript.includes('स्पीड कम करो')) {
          setSpeedHz(prev => Math.max(prev - 0.1, 0.1));
        }
      };

      recognition.onerror = () => {
        setIsVoiceCommandActive(false);
      };

      recognition.onend = () => {
        setIsVoiceCommandActive(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.warn('Voice recognition error:', err);
    }
  };

  const symptomEscalation = symptomAfter - symptomBefore;
  const isRuleViolated = symptomEscalation > 2;

  // ── Track 4A + 4B preflight: fix stale-state race by computing from issues array
  const preflightIsBlocked = preflightStatus === 'blocked';

  return (
    <div className="space-y-6">

      {/* ── Track 4B: Environment Preflight Panel ─────────────────────── */}
      {(preflightStatus === 'checking' || preflightStatus === 'ready' || preflightStatus === 'warn' || preflightStatus === 'blocked') && !preflightDismissed && (
        <div className={`rounded-2xl border p-4 space-y-3 ${
          preflightStatus === 'ready'
            ? 'bg-emerald-950/50 border-emerald-500/40'
            : preflightStatus === 'warn'
            ? 'bg-amber-950/50 border-amber-500/40'
            : preflightStatus === 'blocked'
            ? 'bg-rose-950/50 border-rose-500/50'
            : 'bg-slate-900/60 border-white/10'
        }`}>
          <div className="flex items-center justify-between">
            <h3 className={`text-xs font-bold uppercase tracking-widest ${
              preflightStatus === 'ready' ? 'text-emerald-300'
              : preflightStatus === 'warn' ? 'text-amber-300'
              : preflightStatus === 'blocked' ? 'text-rose-300'
              : 'text-slate-400'
            }`}>
              {preflightStatus === 'checking'
                ? (hi ? 'वातावरण जाँच हो रही है…' : '🔍 Checking Environment...')
                : preflightStatus === 'ready'
                ? (hi ? '✅ सारा ठीक है — शुरू करने के लिए तैयार' : '✅ Environment Ready — Good to Start')
                : preflightStatus === 'warn'
                ? (hi ? '⚠️ सुधार संभव — जारी रख सकते हैं' : '⚠️ Conditions Not Ideal — Can Proceed')
                : (hi ? '⛔ शुरू नहीं कर सकते — समस्या ठीक करें' : '⛔ Cannot Start — Fix Issues First')}
            </h3>
            {preflightStatus !== 'blocked' && (
              <button
                onClick={() => setPreflightDismissed(true)}
                className="text-[10px] text-slate-400 hover:text-white underline"
              >
                {hi ? 'खारिज करें' : 'Dismiss'}
              </button>
            )}
          </div>

          {preflightIssues.length > 0 && (
            <ul className="space-y-1.5">
              {preflightIssues.map((issue, i) => (
                <li key={i} className={`text-xs flex items-start gap-2 ${
                  preflightStatus === 'blocked' ? 'text-rose-200' : 'text-amber-200'
                }`}>
                  <span className="mt-0.5 flex-shrink-0">{preflightStatus === 'blocked' ? '❌' : '⚠️'}</span>
                  <span>{issue}</span>
                </li>
              ))}
            </ul>
          )}

          {preflightStatus === 'ready' && (
            <p className="text-xs text-emerald-300">
              {hi ? 'उचित दूरी, रोशनी और चेहरा दिखाई दे रहा है — डेटा गुणवत्ता उत्कृष्ट होगी।' : 'Optimal distance, lighting, and face detected — data quality will be excellent.'}
            </p>
          )}

          {preflightStatus === 'blocked' && (
            <button
              onClick={runEnvironmentPreflight}
              className="text-xs bg-rose-600 hover:bg-rose-500 text-white px-3 py-1.5 rounded-lg font-semibold transition-all"
            >
              {hi ? 'पुनः जांचें' : 'Re-check Environment'}
            </button>
          )}
        </div>
      )}

      {/* ── Track 4A: Frequency Progression Banner ───────────────────── */}
      {progressionSuggestion && progressionMsg && (
        <div className={`rounded-2xl border p-4 flex items-start justify-between gap-4 ${
          progressionSuggestion === 'advance'
            ? 'bg-emerald-950/50 border-emerald-500/40'
            : 'bg-sky-950/50 border-sky-500/40'
        }`}>
          <p className={`text-xs font-semibold ${
            progressionSuggestion === 'advance' ? 'text-emerald-200' : 'text-sky-200'
          }`}>
            {progressionMsg}
          </p>
          <div className="flex gap-2 flex-shrink-0">
            {progressionSuggestion === 'advance' && (
              <button
                onClick={() => {
                  setSpeedHz(parseFloat(Math.min(speedHz + 0.1, 1.2).toFixed(2)));
                  setProgressionSuggestion(null);
                }}
                className="text-[11px] bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap"
              >
                {hi ? 'आगे बढ़ें ↑' : 'Advance ↑'}
              </button>
            )}
            {progressionSuggestion === 'stepdown' && (
              <button
                onClick={() => {
                  setSpeedHz(parseFloat(Math.max(speedHz - 0.1, 0.1).toFixed(2)));
                  setProgressionSuggestion(null);
                }}
                className="text-[11px] bg-sky-600 hover:bg-sky-500 text-white px-3 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap"
              >
                {hi ? 'स्तर घटाएं ↓' : 'Step Down ↓'}
              </button>
            )}
            <button
              onClick={() => setProgressionSuggestion(null)}
              className="text-[11px] bg-white/10 hover:bg-white/20 text-slate-300 px-3 py-1.5 rounded-lg font-semibold transition-all"
            >
              {hi ? 'पखे पर' : 'Stay'}
            </button>
          </div>
        </div>
      )}

      <div className="bg-[#0b0f19] p-3 sm:p-4 rounded-2xl border border-white/10 flex flex-wrap items-center justify-between gap-3 shadow-xl">
        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              { id: 'horizontal', label: hi ? '↔ क्षैतिज स्मूथ परस्यूट' : '↔ Smooth Pursuit (Horizontal)' },
              { id: 'vertical', label: hi ? '↕ लंबवत स्मूथ परस्यूट' : '↕ Smooth Pursuit (Vertical)' },
              { id: 'saccadic', label: hi ? '⚡ सैकेडिक स्टेप टेस्ट' : '⚡ Saccadic Step Test' },
              { id: 'random-saccade', label: hi ? '🎲 रैंडम सैकेड टेस्ट' : '🎲 Random Saccade Test' },
              { id: 'optokinetic', label: hi ? '🌀 ऑप्टोकाइनेटिक OKN (20°/s)' : '🌀 Optokinetic OKN (20°/s)' },
              { id: 'vor-x2', label: hi ? '🔀 VOR x2' : '🔀 VOR x2' },
              { id: 'spontaneous', label: hi ? '👁 स्वतःस्फूर्त निस्टागमस' : '👁 Spontaneous Nystagmus' },
              { id: 'gaze-left', label: hi ? '← गेज़-प्रेरित (बाएं)' : '← Gaze-Induced (Left)' },
              { id: 'gaze-right', label: hi ? '→ गेज़-प्रेरित (दाएं)' : '→ Gaze-Induced (Right)' },
              { id: 'gaze-up', label: hi ? '↑ गेज़-प्रेरित (ऊपर)' : '↑ Gaze-Induced (Up)' },
              { id: 'gaze-down', label: hi ? '↓ गेज़-प्रेरित (नीचे)' : '↓ Gaze-Induced (Down)' },
            ] as const
          ).map((p) => (
            <button
              key={p.id}
              onClick={() => {
                if (isTesting) stopTest();
                setPattern(p.id);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                pattern === p.id
                  ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30 ring-2 ring-rose-400'
                  : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Action Controls & Voice Command Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setVoiceFeedbackEnabled(!voiceFeedbackEnabled)}
            className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all border ${
              voiceFeedbackEnabled
                ? 'bg-teal-500/20 text-teal-300 border-teal-500/40'
                : 'bg-white/5 text-slate-400 border-white/10'
            }`}
            title={voiceFeedbackEnabled ? (hi ? 'आवाज प्रतिक्रिया बंद करें' : 'Disable Voice Feedback') : (hi ? 'आवाज प्रतिक्रिया चालू करें' : 'Enable Voice Feedback')}
          >
            {voiceFeedbackEnabled ? <Volume2 className="w-4 h-4 text-teal-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
            <span className="hidden sm:inline">{voiceFeedbackEnabled ? (hi ? 'आवाज: चालू' : 'Voice: On') : (hi ? 'आवाज: बंद' : 'Voice: Off')}</span>
          </button>

          {voiceSupported && (
            <button
              onClick={toggleVoiceCommands}
              className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all border ${
                isVoiceCommandActive
                  ? 'bg-purple-600 text-white border-purple-400 animate-pulse'
                  : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'
              }`}
              title={hi ? 'वॉयस कमांड ("Start", "Stop", "Calibrate")' : 'Hands-free Voice Commands ("Start", "Stop", "Calibrate")'}
            >
              {isVoiceCommandActive ? <Mic className="w-4 h-4 text-white" /> : <MicOff className="w-4 h-4 text-purple-400" />}
              <span className="hidden sm:inline">{isVoiceCommandActive ? (hi ? 'सुन रहा है...' : 'Listening...') : (hi ? '🎤 वॉयस कमांड' : '🎤 Voice Cmd')}</span>
            </button>
          )}

          {onCalibrateGaze && (
            <button
              onClick={onCalibrateGaze}
              className="px-3.5 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold flex items-center gap-1.5 transition-all shadow-md"
              title={hi ? 'स्क्रीन के केंद्र में देखकर इसे दबाएं' : 'Look at center of screen and click to calibrate zero point'}
            >
              <Target className="w-4 h-4 text-amber-400" />
              <span>{hi ? '🎯 कैलिब्रेट' : '🎯 Calibrate'}</span>
            </button>
          )}

          {!isTesting ? (
            <button
              onClick={startTest}
              disabled={isPreparingTest}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-rose-600/40 transition-all disabled:opacity-50"
            >
              {isPreparingTest ? (
                <>
                  <Sparkles className="w-4 h-4 animate-spin text-rose-200" />
                  <span>{hi ? 'कैमरा व मॉडल तैयार हो रहा है...' : 'Starting camera & model...'}</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>{hi ? 'परस्यूट टेस्ट शुरू करें' : 'Start Pursuit Test'}</span>
                </>
              )}
            </button>
          ) : (
            <button
              onClick={stopTest}
              className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-amber-600/40 transition-all animate-pulse"
            >
              <Square className="w-4 h-4 fill-current" />
              <span>{hi ? 'टेस्ट रोकें' : 'Stop Test'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Grid: Main Pursuit Studio & PIP Webcam */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Col: Target Canvas Animation */}
        <div className="lg:col-span-2 space-y-4">
          {/* Active Voice Command Badge */}
          {lastVoiceCommand && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-purple-950/60 border border-purple-500/40 text-purple-200 text-xs">
              <Mic className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
              <span>{hi ? 'कमांड मिली:' : 'Command Received:'}</span>
              <span className="text-[11px] font-mono text-purple-300 bg-purple-900/60 px-2.5 py-0.5 rounded-md border border-purple-400/30">
                "{lastVoiceCommand}"
              </span>
            </div>
          )}

          {/* Animated Target Canvas */}
          <div className="relative bg-[#0b0f19] rounded-2xl overflow-hidden border border-white/10 aspect-video flex items-center justify-center shadow-2xl">
            <canvas ref={targetCanvasRef} className="w-full h-full object-cover z-0" />

            {/* Live Real-Time Face Distance Meter Badge (Top-Center) */}
            {liveData.faceVisible && (
              <div
                className={`absolute top-3 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-xl backdrop-blur-md flex items-center gap-2 text-xs font-mono z-10 shadow-lg border transition-all ${
                  liveData.distanceStatus === 'optimal'
                    ? 'bg-emerald-950/90 border-emerald-500/60 text-emerald-200'
                    : 'bg-amber-950/90 border-amber-500/60 text-amber-200 animate-bounce'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    liveData.distanceStatus === 'optimal' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                  }`}
                />
                <span>
                  {liveData.distanceStatus === 'optimal'
                    ? (hi ? `✓ दूरी: ${liveData.distanceCm || 55}cm (उत्कृष्ट)` : `✓ Distance: ${liveData.distanceCm || 55} cm (Optimal)`)
                    : liveData.distanceStatus === 'too_far'
                    ? (hi ? `↔ थोड़ा पास आएं (50-60 सेमी) [${liveData.distanceCm}cm]` : `↔ Move Closer (50-60 cm) [${liveData.distanceCm} cm]`)
                    : (hi ? `↔ थोड़ा पीछे हटें (50-60 सेमी) [${liveData.distanceCm}cm]` : `↔ Move Back (50-60 cm) [${liveData.distanceCm} cm]`)}
                </span>
              </div>
            )}

            {/* Live Distance Error Badge (Top-Left) */}
            {isTesting && (
              <div className="absolute top-3 left-3 bg-slate-900/90 border border-teal-500/50 px-3 py-1.5 rounded-xl backdrop-blur-md flex items-center gap-2 text-xs font-mono z-10 shadow-lg">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                <span className="text-slate-400">{hi ? 'लाइव त्रुटि:' : 'Tracking Error:'}</span>
                <span className="font-bold text-cyan-300">{liveErrorPct}%</span>
              </div>
            )}

            {/* 60-Second Test Countdown Timer Badge (Top-Right) */}
            {isTesting && (
              <div className="absolute top-3 right-3 bg-red-950/90 border border-red-500/60 px-3.5 py-1.5 rounded-xl backdrop-blur-md flex items-center gap-2 text-xs font-mono text-red-200 z-10 shadow-lg animate-pulse">
                <Clock className="w-4 h-4 text-red-400" />
                <span className="text-slate-400">{hi ? 'समय शेष:' : 'Time Left:'}</span>
                <span className="font-bold text-white font-mono text-sm">{timeLeftSec}s</span>
              </div>
            )}
          </div>

          {/* Speed & Stage Hierarchy Slider */}
          <div className="bg-[#0b0f19] p-4 rounded-2xl border border-white/10 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-slate-300">{hi ? 'उद्दीपन गति (आवृत्ति):' : 'Stimulus Speed (Frequency):'}</span>
              <span className="font-mono text-cyan-400 font-bold text-sm">{speedHz.toFixed(2)} Hz</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="1.2"
              step="0.05"
              value={speedHz}
              onChange={(e) => setSpeedHz(parseFloat(e.target.value))}
              className="w-full accent-rose-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>0.1 Hz ({hi ? 'धीमी गति' : 'Slow'})</span>
              <span>0.4 Hz ({hi ? 'मानक' : 'Standard'})</span>
              <span>1.2 Hz ({hi ? 'तेज़ गति' : 'Fast'})</span>
            </div>
          </div>
        </div>

        {/* Right Col: PIP Webcam & Clinical Dosage Check */}
        <div className="space-y-4">
          {/* Patient Webcam Camera PIP Card */}
          <div className="bg-white/3 rounded-2xl border border-white/8 p-4 space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-slate-400">
              <span className="flex items-center gap-1.5"><Camera className="w-4 h-4 text-teal-400" /> {hi ? 'पेशेंट कैमरा फीड' : 'Patient Camera Feed'}</span>
              <div className="flex items-center gap-2">
                {cameraState !== 'live' ? (
                  <button onClick={onStartCamera} className="text-teal-400 hover:underline">{hi ? 'कैमरा चालू करें' : 'Turn On'}</button>
                ) : (
                  <>
                    {liveData.faceVisible && (
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border transition-all ${
                        liveData.distanceStatus === 'optimal'
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse'
                      }`}>
                        {liveData.distanceStatus === 'optimal'
                          ? `✓ ${liveData.distanceCm || 55}cm`
                          : liveData.distanceStatus === 'too_far'
                          ? `↔ Closer (${liveData.distanceCm}cm)`
                          : `↔ Back (${liveData.distanceCm}cm)`}
                      </span>
                    )}
                    <span className="text-emerald-400">{hi ? '● लाइव' : '● Live'}</span>
                  </>
                )}
                <button
                  onClick={() => setIsCameraMinimized(!isCameraMinimized)}
                  className="p-1 rounded bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all"
                  title={isCameraMinimized ? (hi ? 'कैमरा फैलाएं' : 'Expand Camera') : (hi ? 'कैमरा छोटा करें' : 'Minimize Camera')}
                >
                  {isCameraMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {!isCameraMinimized && (
              <div className="relative bg-black rounded-xl overflow-hidden aspect-video border border-white/10 flex items-center justify-center">
                <canvas ref={canvasRef as React.RefObject<HTMLCanvasElement>} className={`w-full h-full object-cover ${cameraState === 'live' ? '' : 'hidden'}`} />
                {cameraState !== 'live' && (
                  <p className="text-xs text-slate-500 text-center p-4">{hi ? 'कैमरा चालू करें' : 'Camera turned off'}</p>
                )}

                {/* Real-Time Distance Overlay Banner on Patient Video Feed */}
                {cameraState === 'live' && liveData.faceVisible && (
                  <div className="absolute bottom-2 left-2 right-2 px-3 py-1.5 rounded-lg backdrop-blur-md bg-slate-950/90 border border-white/15 flex items-center justify-between text-xs font-mono z-10 shadow-lg">
                    <span className="text-slate-400 font-sans text-[11px] font-semibold">{hi ? 'दूरी:' : 'Distance:'}</span>
                    <span className={`font-bold flex items-center gap-1.5 ${
                      liveData.distanceStatus === 'optimal' ? 'text-emerald-400' : 'text-amber-400'
                    }`}>
                      <span className={`w-2 h-2 rounded-full ${liveData.distanceStatus === 'optimal' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400 animate-bounce'}`} />
                      {liveData.distanceStatus === 'optimal'
                        ? (hi ? `✓ ${liveData.distanceCm || 55} सेमी (उत्कृष्ट)` : `✓ ${liveData.distanceCm || 55} cm (Optimal)`)
                        : liveData.distanceStatus === 'too_far'
                        ? (hi ? `↔ पास आएं (${liveData.distanceCm} cm → 50-60cm)` : `↔ Move Closer (${liveData.distanceCm} cm → 50–60 cm)`)
                        : (hi ? `↔ पीछे हटें (${liveData.distanceCm} cm → 50-60cm)` : `↔ Move Back (${liveData.distanceCm} cm → 50–60 cm)`)}
                    </span>
                  </div>
                )}
              </div>
            )}
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

          {/* VNG Clinical Report Card */}
          {(vngPursuitScore || vngVorX1Score || vngVorX2Score || vngSaccadeScore || vngOknScore) && (
            <VNGReportCard
              mode={
                (pattern as string) === 'vor-x2'
                  ? 'vor_x2'
                  : (pattern as string) === 'vor-x1'
                  ? 'vor_x1'
                  : (pattern as string) === 'optokinetic'
                  ? 'okn'
                  : (pattern as string) === 'saccadic' || (pattern as string) === 'anti-saccade'
                  ? 'saccade'
                  : 'smooth_pursuit'
              }
              pursuitScore={vngPursuitScore}
              vorX1Score={vngVorX1Score}
              vorX2Score={vngVorX2Score}
              saccadeScore={vngSaccadeScore}
              oknScore={vngOknScore}
              locale={hi ? 'hi' : 'en'}
              onRetestRequested={startTest}
            />
          )}

          {/* Nystagmus / Gaze-Hold Screening Card */}
          {vngNystagmusScore && (
            <div className="bg-gradient-to-br from-indigo-950/60 to-slate-900 rounded-2xl border border-indigo-500/30 p-4 space-y-3">
              <h3 className="text-xs font-bold text-indigo-300 uppercase tracking-widest">
                {hi ? 'निस्टागमस स्क्रीनिंग (SPV / बीट्स प्रति 30 सेकंड)' : 'Nystagmus Screening (SPV / Beats per 30s)'}
              </h3>
              <div className="grid grid-cols-2 gap-2 text-center">
                <MiniMetric label={hi ? 'दायाँ नेत्र SPV' : 'Right Eye SPV'} value={`${vngNystagmusScore.rightEye.spvDegPerSec.toFixed(1)}°/s`} />
                <MiniMetric label={hi ? 'बायाँ नेत्र SPV' : 'Left Eye SPV'} value={`${vngNystagmusScore.leftEye.spvDegPerSec.toFixed(1)}°/s`} />
                <MiniMetric label={hi ? 'दायाँ नेत्र बीट्स/30s' : 'Right Eye Beats/30s'} value={String(vngNystagmusScore.rightEye.beatsPer30Sec)} />
                <MiniMetric label={hi ? 'बायाँ नेत्र बीट्स/30s' : 'Left Eye Beats/30s'} value={String(vngNystagmusScore.leftEye.beatsPer30Sec)} />
              </div>
              {!vngNystagmusScore.eyesResolvedSeparately && (
                <p className="text-[11px] text-amber-200 bg-amber-950/40 border border-amber-500/30 p-2 rounded-lg">
                  {hi
                    ? 'बाएं/दाएं नेत्र अलग से नहीं मिल पाए — दोनों स्तंभ संयुक्त गेज़ संकेत से गणना किए गए हैं।'
                    : 'Left/right eye channels were not separately available — both columns were computed from the combined gaze signal.'}
                </p>
              )}
              <p className="text-xs text-slate-200 bg-white/5 p-2.5 rounded-xl border border-white/5">{vngNystagmusScore.clinicalGuidance}</p>
              <p className="text-[11px] text-amber-200 bg-amber-950/40 border border-amber-500/30 p-2.5 rounded-xl leading-relaxed">
                {hi
                  ? '⚠️ यह स्क्रीनिंग गॉगल्स के बिना दर्ज की गई है, इसलिए दृष्टि दमन सक्रिय रहा — क्लिनिकल VNG अंधेरे में दृष्टि हटाकर परिधीय निस्टागमस को उजागर करता है। सामान्य परिणाम इसे खारिज नहीं करता; केवल सकारात्मक निष्कर्ष को चिकित्सक द्वारा समीक्षा हेतु आगे बढ़ाएं।'
                  : '⚠️ Recorded without goggles denying vision, so visual fixation suppression stayed active — clinical VNG unmasks peripheral nystagmus by removing vision in darkness. A normal result here does not rule that out; only a positive finding should be flagged for clinician review.'}
              </p>
            </div>
          )}

          {/* Test Results Card */}
          {resultScore && !NYSTAGMUS_PATTERNS.includes(pattern) && (
            <div className="bg-gradient-to-br from-teal-950/60 to-slate-900 rounded-2xl border border-teal-500/30 p-4 space-y-3">
              <h3 className="text-xs font-bold text-teal-300 uppercase tracking-widest">{hi ? 'परस्यूट परिणाम स्कोर' : 'Pursuit Evaluation Score'}</h3>
              <div className="grid grid-cols-2 gap-2 text-center">
                <MiniMetric label={hi ? 'परस्यूट गेन' : 'Pursuit Gain'} value={resultScore.pursuitGain.toFixed(2)} />
                <MiniMetric label={hi ? 'दिशात्मक सहमति' : 'Directional Agreement'} value={resultScore.directionalAgreement.toFixed(2)} />
                <MiniMetric label={hi ? 'औसत त्रुटि' : 'Avg Error'} value={`${resultScore.meanTrackingErrorPct}%`} />
                <MiniMetric label={hi ? 'कैच-अप सैकेड' : 'Catch-up Saccades'} value={String(resultScore.catchUpSaccadeCount)} />
                <MiniMetric label={hi ? 'गुणवत्ता' : 'Quality'} value={resultScore.quality.toUpperCase()} />
              </div>
              <p className="text-xs text-slate-200 bg-white/5 p-2.5 rounded-xl border border-white/5">{resultScore.guidance}</p>

              {oknResult && (
                <div className="pt-3 border-t border-white/10 space-y-2">
                  <h4 className="text-xs font-bold text-violet-300 uppercase tracking-widest">
                    {hi ? 'ऑप्टोकाइनेटिक स्लो फेज़ वेलोसिटी' : 'Optokinetic Slow Phase Velocity'}
                  </h4>
                  {oknResult.slowPhaseVelocityRight === 0 && oknResult.slowPhaseVelocityLeft === 0 ? (
                    <p className="text-xs text-amber-200 bg-amber-950/40 border border-amber-500/30 p-2.5 rounded-xl">
                      {hi
                        ? 'कोई ऑप्टोकाइनेटिक प्रतिक्रिया दर्ज नहीं हुई — सिर स्थिर रखें और बिंदु को आँखों से फॉलो करें।'
                        : 'No optokinetic response recorded — keep the head still and let the eyes follow the sweep.'}
                    </p>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 gap-2 text-center">
                        <MiniMetric label={hi ? 'SPV दाएं' : 'SPV Right'} value={`${oknResult.slowPhaseVelocityRight.toFixed(1)}°/s`} />
                        <MiniMetric label={hi ? 'SPV बाएं' : 'SPV Left'} value={`${oknResult.slowPhaseVelocityLeft.toFixed(1)}°/s`} />
                        <MiniMetric label={hi ? 'गेन दाएं' : 'Gain Right'} value={oknResult.oknGainRight.toFixed(2)} />
                        <MiniMetric label={hi ? 'गेन बाएं' : 'Gain Left'} value={oknResult.oknGainLeft.toFixed(2)} />
                      </div>
                      <div className={`text-xs p-2.5 rounded-xl border ${
                        oknResult.asymmetryPercent > 15
                          ? 'bg-amber-950/40 border-amber-500/30 text-amber-200'
                          : 'bg-white/5 border-white/5 text-slate-200'
                      }`}>
                        {hi
                          ? `दिशात्मक विषमता ${oknResult.asymmetryPercent}% (सामान्य < 15%) · उद्दीपक ${OKN_STIMULUS_DEG_PER_SEC}°/s`
                          : `Directional asymmetry ${oknResult.asymmetryPercent}% (normal < 15%) · stimulus ${OKN_STIMULUS_DEG_PER_SEC}°/s`}
                      </div>
                    </>
                  )}
                </div>
              )}

              {vorResult && (
                <div className="pt-3 border-t border-white/10 space-y-2">
                  <h4 className="text-xs font-bold text-cyan-300 uppercase tracking-widest">
                    {hi ? 'VOR x2 रिफ्लेक्स गेन' : 'VOR x2 Reflex Gain'}
                  </h4>
                  {vorResult.isHeadStationary ? (
                    <p className="text-xs text-amber-200 bg-amber-950/40 border border-amber-500/30 p-2.5 rounded-xl">
                      {hi
                        ? 'सिर पर्याप्त नहीं घुमाया गया — VOR गेन मापने के लिए बिंदु के विपरीत सिर घुमाएँ।'
                        : 'Head barely moved — turn your head against the dot so reflex gain can be measured.'}
                    </p>
                  ) : vorOpposition && !vorOpposition.oppositionValidated ? (
                    <div className="space-y-2">
                      <p className="text-xs text-amber-200 bg-amber-950/40 border border-amber-500/30 p-2.5 rounded-xl">
                        {hi
                          ? `सिर हिला, पर बिंदु के अनुरूप नहीं (सहसंबंध ${vorOpposition.headTargetCorrelation}) — यह गेन VOR x2 प्रतिवर्त को सटीक रूप से नहीं दर्शाता। बिंदु के ठीक विपरीत दिशा में सिर घुमाकर दोबारा प्रयास करें।`
                          : `Head moved, but not coupled to the target (correlation ${vorOpposition.headTargetCorrelation}) — this gain does not reliably reflect VOR x2 physiology. Retake, turning the head directly opposite the dot.`}
                      </p>
                      <div className="grid grid-cols-2 gap-2 text-center opacity-60">
                        <MiniMetric label={hi ? 'VOR गेन (अपुष्ट)' : 'VOR Gain (unvalidated)'} value={vorResult.gain.toFixed(2)} />
                        <MiniMetric label={hi ? 'ट्रैकिंग त्रुटि' : 'Tracking Error'} value={`${resultScore.meanTrackingErrorPct}%`} />
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2 text-center">
                      <MiniMetric label={hi ? 'VOR गेन' : 'VOR Gain'} value={vorResult.gain.toFixed(2)} />
                      <MiniMetric label={hi ? 'स्तर' : 'Level'} value={vorResult.label.toUpperCase()} />
                      <MiniMetric label={hi ? 'सिर गति' : 'Head vel.'} value={`${vorResult.meanHeadVelocityDeg.toFixed(0)}°/s`} />
                      <MiniMetric label={hi ? 'चक्र' : 'Cycles'} value={String(vorResult.cycles)} />
                      <MiniMetric label={hi ? 'ट्रैकिंग त्रुटि' : 'Tracking Error'} value={`${resultScore.meanTrackingErrorPct}%`} />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Real-Time Eye Position / Eye Tracing Waveform Graph (With Scroll Target) */}
      <div ref={eyeTracingGraphRef} className="scroll-mt-6">
        <EyeTracingGraph
          hi={hi}
          samples={waveformSamples}
          pattern={pattern}
          isTesting={isTesting}
          cameraState={cameraState}
          testCompleted={hasCompletedTest}
          vngScore={vngPursuitScore}
        />
      </div>
    </div>
  );
};
