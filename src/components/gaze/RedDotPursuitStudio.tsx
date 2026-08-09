import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play, Square, RotateCcw, Camera, Info, Volume2, VolumeX,
  Mic, MicOff, Maximize2, Minimize2, Clock, Sparkles, Activity, Target, Brain
} from 'lucide-react';
import {
  CameraState, LiveData, PursuitPattern, EyeTracingPoint, targetPositionAt, HUD_SYNC_INTERVAL_MS
} from './GazeCanvasHelpers';
import { EyeTracingGraph } from './EyeTracingGraph';
import { VNGReportCard } from '../VNGReportCard';
import {
  GazePoint, PursuitTargetPoint, PursuitScore, VORScore, VorX2Validation,
  OptokineticMetrics, scoreSmoothPursuit, scoreVOR, validateVorX2Opposition,
  computeOptokineticMetrics, detectSaccades, OKN_STIMULUS_DEG_PER_SEC
} from '@/lib/gaze-tracking';
import {
  SmoothPursuitVNGScore, VorX1Score, VorX2Score, SaccadeScore, OknScore,
  scoreSmoothPursuitVNG, scoreVorX1, scoreVorX2, scoreSaccades, scoreOKN
} from '@/lib/vng-analytics';

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
}> = ({
  hi, cameraState, liveData, canvasRef, onStartCamera, onStopCamera, onCalibrateGaze,
  onEnsureModelReady, modelFailed,
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

  useEffect(() => { liveDataRef.current = liveData; }, [liveData]);
  useEffect(() => { isTestingRef.current = isTesting; }, [isTesting]);

  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, []);

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

      if (curLiveData.gazeT !== lastRecordedGazeT || (curTesting && now - lastRecordedGazeT > 30)) {
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
          gazeHistoryRef.current.push({
            x: curLiveData.gazeX, y: curLiveData.gazeY,
            t: curLiveData.gazeT || now,
            hasIris: curLiveData.faceVisible && curLiveData.hasIris && !curLiveData.isBlink,
            isBlink: curLiveData.isBlink ?? false,
            confidence: curLiveData.faceVisible ? (curLiveData.confidence ?? 0.9) : 0.05,
            leftEyeX: curLiveData.leftEyeX, leftEyeY: curLiveData.leftEyeY,
            rightEyeX: curLiveData.rightEyeX, rightEyeY: curLiveData.rightEyeY,
          });
          headHistoryRef.current.push({ t: curLiveData.gazeT || now, yaw: curLiveData.headYaw });
        }

        if (now - lastWaveformSyncRef.current >= 80) {
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
    };

    render();

    return () => {
      if (animFrameRef.current !== null) cancelAnimationFrame(animFrameRef.current);
    };
  }, [pattern, speedHz, hi]);

  const startTest = useCallback(async () => {
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

    waveformBufferRef.current = [];
    setWaveformSamples([]);
    targetHistoryRef.current = [];
    gazeHistoryRef.current = [];
    headHistoryRef.current = [];
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
    setIsTesting(true);
    setTimeLeftSec(60);

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

    const startMsg = hi
      ? (pattern === 'vor-x2'
          ? '60 सेकंड का VOR x2 गेज़ टेस्ट शुरू हो रहा है। स्क्रीन पर बिंदु के विपरीत दिशा में अपना सिर घुमाएं।'
          : '60 सेकंड का स्मूथ परस्यूट गेज़ टेस्ट शुरू हो रहा है। अपना सिर स्थिर रखें और लाल बिंदु को अपनी आँखों से फॉलो करें।')
      : (pattern === 'vor-x2'
          ? 'Starting 60-second VOR x2 gaze test. Move your head in the opposite direction of the moving red dot.'
          : 'Starting 60-second smooth pursuit gaze test. Keep your head still and track the moving red dot with your eyes.');

    speakInstruction(startMsg);
  }, [cameraState, onStartCamera, onEnsureModelReady, hi, pattern, speakInstruction]);

  const stopTest = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    setIsTesting(false);
    const targets = targetHistoryRef.current;
    const gazes = gazeHistoryRef.current;
    const heads = headHistoryRef.current;
    const saccades = detectSaccades(gazes);
    const lang = hi ? 'hi' : 'en';

    setResultScore(scoreSmoothPursuit(targets, gazes, saccades, lang));
    setVorResult(scoreVOR(gazes, heads));

    if (pattern === 'vor-x2') {
      const opp = validateVorX2Opposition(targets, heads);
      setVorOpposition(opp);
      setVngVorX2Score(scoreVorX2(targets, gazes, heads));
    } else if (pattern === 'optokinetic') {
      setOknResult(computeOptokineticMetrics(gazes, targets));
      setVngOknScore(scoreOKN(gazes, saccades));
    } else if (pattern === 'saccadic') {
      setVngSaccadeScore(scoreSaccades(targets, gazes, saccades));
    } else if (pattern === 'vertical') {
      setVngPursuitScore(scoreSmoothPursuitVNG(targets, gazes, saccades));
    } else {
      setVngPursuitScore(scoreSmoothPursuitVNG(targets, gazes, saccades));
      setVngVorX1Score(scoreVorX1({ x: 0.5, y: 0.5 }, gazes, heads));
    }

    const endMsg = hi
      ? 'टेस्ट पूरा हुआ। नीचे अपनी नैदानिक गेज़ रिपोर्ट कार्ड और वेवफॉर्म देखें।'
      : 'Test complete. Scroll down to review your VNG Clinical Report Card and eye waveforms.';

    speakInstruction(endMsg);
  }, [hi, pattern, speakInstruction, speedHz]);

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

  return (
    <div className="space-y-6">
      {/* Pattern Selector Bar */}
      <div className="bg-[#0b0f19] p-3 sm:p-4 rounded-2xl border border-white/10 flex flex-wrap items-center justify-between gap-3 shadow-xl">
        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              { id: 'horizontal', label: hi ? '↔ क्षैतिज स्मूथ परस्यूट' : '↔ Smooth Pursuit (Horizontal)' },
              { id: 'vertical', label: hi ? '↕ लंबवत स्मूथ परस्यूट' : '↕ Smooth Pursuit (Vertical)' },
              { id: 'saccadic', label: hi ? '⚡ सैकेडिक स्टेप टेस्ट' : '⚡ Saccadic Step Test' },
              { id: 'optokinetic', label: hi ? '🌀 ऑप्टोकाइनेटिक OKN (20°/s)' : '🌀 Optokinetic OKN (20°/s)' },
              { id: 'vor-x2', label: hi ? '🔀 VOR x2' : '🔀 VOR x2' },
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
              title={hi ? 'वॉयस कमांड ("Start", "Stop")' : 'Hands-free Voice Commands ("Start", "Stop")'}
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

          {/* Test Results Card */}
          {resultScore && (
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
        />
      </div>
    </div>
  );
};
