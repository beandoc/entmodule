import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Activity, Play, Pause, Download } from 'lucide-react';
import { CameraState, PursuitPattern, EyeTracingPoint } from './GazeCanvasHelpers';

interface EyeTracingGraphProps {
  hi: boolean;
  samples: EyeTracingPoint[];
  pattern: PursuitPattern;
  isTesting: boolean;
  cameraState: CameraState;
}

export const EyeTracingGraph: React.FC<EyeTracingGraphProps> = ({
  hi, samples, pattern, isTesting, cameraState,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [axisMode, setAxisMode] = useState<'horizontal' | 'vertical' | 'magnitude'>('horizontal');
  const [timeWindowSec, setTimeWindowSec] = useState<number>(10);
  const [showTarget, setShowTarget] = useState(true);
  const [showRightEye, setShowRightEye] = useState(true);
  const [showLeftEye, setShowLeftEye] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const frozenSamplesRef = useRef<EyeTracingPoint[]>([]);

  const activeSamples = isPaused ? frozenSamplesRef.current : samples;

  const handleTogglePause = () => {
    if (!isPaused) {
      frozenSamplesRef.current = [...samples];
    }
    setIsPaused(prev => !prev);
  };

  const handleExportPNG = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `Eye_Tracing_Graph_${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const renderGraph = () => {
      const parent = canvas.parentElement;
      const w = parent?.clientWidth || 700;
      const h = parent?.clientHeight || 340;
      const dpr = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;

      if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
        canvas.width = Math.floor(w * dpr);
        canvas.height = Math.floor(h * dpr);
      }

      ctx.save();
      ctx.scale(dpr, dpr);

      // Clear & background
      ctx.fillStyle = '#080c16';
      ctx.fillRect(0, 0, w, h);

      // Margins
      const paddingLeft = 65;
      const paddingRight = 30;
      const paddingTop = 35;
      const paddingBottom = 45;
      const graphWidth = w - paddingLeft - paddingRight;
      const graphHeight = h - paddingTop - paddingBottom;

      // Inner graph backdrop
      ctx.fillStyle = '#0d1322';
      ctx.fillRect(paddingLeft, paddingTop, graphWidth, graphHeight);

      // Inner graph border
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.lineWidth = 1;
      ctx.strokeRect(paddingLeft, paddingTop, graphWidth, graphHeight);

      // Y-Axis Ticks & Gridlines (-25° to +25°)
      const yTicks = [
        { val: 1.0, deg: '+25°' },
        { val: 0.75, deg: '+12.5°' },
        { val: 0.5, deg: '0° Center' },
        { val: 0.25, deg: '-12.5°' },
        { val: 0.0, deg: '-25°' },
      ];

      yTicks.forEach(({ val, deg }) => {
        const y = paddingTop + (1 - val) * graphHeight;
        ctx.beginPath();
        ctx.moveTo(paddingLeft, y);
        ctx.lineTo(paddingLeft + graphWidth, y);

        if (val === 0.5) {
          ctx.strokeStyle = 'rgba(34, 211, 238, 0.4)';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([6, 4]);
        } else {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
          ctx.lineWidth = 1;
          ctx.setLineDash([]);
        }
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = val === 0.5 ? '#22d3ee' : '#64748b';
        ctx.font = '10px monospace';
        ctx.textAlign = 'right';
        ctx.fillText(deg, paddingLeft - 8, y + 3);
      });

      const data = activeSamples;
      if (data.length > 1) {
        const latestTime = data[data.length - 1].t;
        const windowMs = timeWindowSec * 1000;
        const minTime = latestTime - windowMs;

        const visibleData = data.filter(d => d.t >= minTime);

        // X-Axis Time Ticks
        const xTickCount = 5;
        for (let i = 0; i <= xTickCount; i++) {
          const ratio = i / xTickCount;
          const x = paddingLeft + ratio * graphWidth;
          const secAgo = (timeWindowSec * (1 - ratio)).toFixed(1);

          ctx.beginPath();
          ctx.moveTo(x, paddingTop);
          ctx.lineTo(x, paddingTop + graphHeight);
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
          ctx.lineWidth = 1;
          ctx.stroke();

          ctx.fillStyle = '#64748b';
          ctx.font = '10px monospace';
          ctx.textAlign = 'center';
          ctx.fillText(`-${secAgo}s`, x, paddingTop + graphHeight + 16);
        }

        const getYVal = (pt: EyeTracingPoint, source: 'target' | 'right' | 'left') => {
          let val = 0.5;
          if (source === 'target') {
            val = axisMode === 'horizontal' ? pt.targetX : axisMode === 'vertical' ? 1 - pt.targetY : 0.5 + Math.sqrt(Math.pow(pt.targetX - 0.5, 2) + Math.pow(pt.targetY - 0.5, 2));
          } else if (source === 'right') {
            val = axisMode === 'horizontal' ? pt.rightEyeX : axisMode === 'vertical' ? 1 - pt.rightEyeY : 0.5 + Math.sqrt(Math.pow(pt.rightEyeX - 0.5, 2) + Math.pow(pt.rightEyeY - 0.5, 2));
          } else {
            val = axisMode === 'horizontal' ? pt.leftEyeX : axisMode === 'vertical' ? 1 - pt.leftEyeY : 0.5 + Math.sqrt(Math.pow(pt.leftEyeX - 0.5, 2) + Math.pow(pt.leftEyeY - 0.5, 2));
          }
          return Math.min(Math.max(val, 0), 1);
        };

        // Render Blinks
        visibleData.forEach((pt) => {
          if (pt.isBlink) {
            const x = paddingLeft + ((pt.t - minTime) / windowMs) * graphWidth;
            ctx.fillStyle = 'rgba(239, 68, 68, 0.15)';
            ctx.fillRect(x - 2, paddingTop, 4, graphHeight);
          }
        });

        // 1. Target Line (Yellow)
        if (showTarget && visibleData.length > 0) {
          ctx.beginPath();
          let started = false;
          visibleData.forEach((pt) => {
            const x = paddingLeft + ((pt.t - minTime) / windowMs) * graphWidth;
            const y = paddingTop + (1 - getYVal(pt, 'target')) * graphHeight;
            if (!started) { ctx.moveTo(x, y); started = true; }
            else { ctx.lineTo(x, y); }
          });
          ctx.strokeStyle = '#facc15';
          ctx.lineWidth = 2.5;
          ctx.shadowColor = 'rgba(250, 204, 21, 0.6)';
          ctx.shadowBlur = 4;
          ctx.stroke();
          ctx.shadowBlur = 0;
        }

        // 2. Left Eye Line (Blue)
        if (showLeftEye && visibleData.length > 0) {
          ctx.beginPath();
          let started = false;
          visibleData.forEach((pt) => {
            if (pt.isBlink) return;
            const x = paddingLeft + ((pt.t - minTime) / windowMs) * graphWidth;
            const y = paddingTop + (1 - getYVal(pt, 'left')) * graphHeight;
            if (!started) { ctx.moveTo(x, y); started = true; }
            else { ctx.lineTo(x, y); }
          });
          ctx.strokeStyle = '#3b82f6';
          ctx.lineWidth = 2.5;
          ctx.shadowColor = 'rgba(59, 130, 246, 0.6)';
          ctx.shadowBlur = 4;
          ctx.stroke();
          ctx.shadowBlur = 0;
        }

        // 3. Right Eye Line (Red)
        if (showRightEye && visibleData.length > 0) {
          ctx.beginPath();
          let started = false;
          visibleData.forEach((pt) => {
            if (pt.isBlink) return;
            const x = paddingLeft + ((pt.t - minTime) / windowMs) * graphWidth;
            const y = paddingTop + (1 - getYVal(pt, 'right')) * graphHeight;
            if (!started) { ctx.moveTo(x, y); started = true; }
            else { ctx.lineTo(x, y); }
          });
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 2.5;
          ctx.shadowColor = 'rgba(239, 68, 68, 0.6)';
          ctx.shadowBlur = 4;
          ctx.stroke();
          ctx.shadowBlur = 0;
        }

        // Playhead Vertical Cursor Line
        const lastPt = visibleData[visibleData.length - 1];
        if (lastPt) {
          const headX = paddingLeft + ((lastPt.t - minTime) / windowMs) * graphWidth;

          ctx.beginPath();
          ctx.moveTo(headX, paddingTop);
          ctx.lineTo(headX, paddingTop + graphHeight);
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([4, 4]);
          ctx.stroke();
          ctx.setLineDash([]);

          if (showTarget) {
            const ty = paddingTop + (1 - getYVal(lastPt, 'target')) * graphHeight;
            ctx.beginPath(); ctx.arc(headX, ty, 5, 0, Math.PI * 2);
            ctx.fillStyle = '#facc15'; ctx.fill(); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5; ctx.stroke();
          }
          if (showLeftEye && !lastPt.isBlink) {
            const ly = paddingTop + (1 - getYVal(lastPt, 'left')) * graphHeight;
            ctx.beginPath(); ctx.arc(headX, ly, 5, 0, Math.PI * 2);
            ctx.fillStyle = '#3b82f6'; ctx.fill(); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5; ctx.stroke();
          }
          if (showRightEye && !lastPt.isBlink) {
            const ry = paddingTop + (1 - getYVal(lastPt, 'right')) * graphHeight;
            ctx.beginPath(); ctx.arc(headX, ry, 5, 0, Math.PI * 2);
            ctx.fillStyle = '#ef4444'; ctx.fill(); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5; ctx.stroke();
          }
        }
      } else {
        ctx.fillStyle = 'rgba(148, 163, 184, 0.5)';
        ctx.font = 'bold 13px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(
          hi ? 'वेवफॉर्म देखने के लिए कैमरा चालू करें या "Start Pursuit Test" दबाएं' : 'Turn on camera or click "Start Pursuit Test" to stream real-time eye waveforms',
          paddingLeft + graphWidth / 2,
          paddingTop + graphHeight / 2,
        );
      }

      ctx.restore();

      if (!isPaused) {
        animId = requestAnimationFrame(renderGraph);
      }
    };

    renderGraph();
    return () => {
      if (animId) cancelAnimationFrame(animId);
    };
  }, [activeSamples, axisMode, timeWindowSec, showTarget, showRightEye, showLeftEye, isPaused, hi]);

  const metrics = useMemo(() => {
    if (samples.length < 5) return null;
    const windowSamples = samples.slice(-120);

    let sumRightErr = 0;
    let sumLeftErr = 0;
    let sumDisagreement = 0;
    let count = 0;

    windowSamples.forEach(pt => {
      if (pt.isBlink) return;
      const rErr = Math.abs(pt.rightEyeX - pt.targetX);
      const lErr = Math.abs(pt.leftEyeX - pt.targetX);
      const dis = Math.abs(pt.rightEyeX - pt.leftEyeX);
      sumRightErr += rErr;
      sumLeftErr += lErr;
      sumDisagreement += dis;
      count++;
    });

    if (count === 0) return null;
    const avgRErr = sumRightErr / count;
    const avgLErr = sumLeftErr / count;
    const rightGain = Math.max(0.2, 1 - avgRErr * 1.8);
    const leftGain = Math.max(0.2, 1 - avgLErr * 1.8);
    const avgDisagreementDeg = (sumDisagreement / count) * 50;

    return {
      rightGain: rightGain.toFixed(2),
      leftGain: leftGain.toFixed(2),
      disagreementDeg: avgDisagreementDeg.toFixed(1),
      quality: (rightGain + leftGain) / 2 > 0.85 ? 'OPTIMAL' : 'SACCADIC',
    };
  }, [samples]);

  return (
    <div className="bg-[#0b0f19] rounded-2xl border border-teal-500/30 p-4 sm:p-5 space-y-4 shadow-2xl">
      {/* Header & Status */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-teal-400">
            <Activity className="w-4 h-4 text-teal-400 animate-pulse" />
            <span>{hi ? 'नेत्र स्थिति एवं वेवफॉर्म ट्रैकिंग ग्राफ' : 'Eye Position / Eye Tracing Graph'}</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              isTesting ? 'bg-red-500/20 text-red-300 border border-red-500/40 animate-pulse'
                : cameraState === 'live' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'bg-slate-800 text-slate-400'
            }`}>
              {isTesting ? (hi ? '● रिकॉर्डिंग लाइव' : '● TEST RECORDING') : cameraState === 'live' ? (hi ? '● लाइव स्ट्रीम' : '● LIVE STREAMING') : (hi ? 'स्टैंडबाय' : 'STANDBY')}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            {hi ? 'दाहिनी आंख (लाल) और बाईं आंख (नीली) की वास्तविक समय की तरंग रेखाएं लक्ष्य बिंदु (पीली/हरी रेखा) के सापेक्ष।'
              : 'Real-time waveform tracking of right eye (red trace) and left eye (blue trace) against the target stimulus (yellow/green line).'}
          </p>
        </div>

        {/* Legend Pills */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs font-bold">
          <button
            onClick={() => setShowRightEye(!showRightEye)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-all ${
              showRightEye ? 'bg-red-500/20 border-red-500/50 text-red-300' : 'bg-white/5 border-white/10 text-slate-500 opacity-50'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-sm shadow-red-500" />
            <span>{hi ? 'दाहिनी आंख (रेड)' : 'Right Eye (Red)'}</span>
          </button>

          <button
            onClick={() => setShowLeftEye(!showLeftEye)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-all ${
              showLeftEye ? 'bg-blue-500/20 border-blue-500/50 text-blue-300' : 'bg-white/5 border-white/10 text-slate-500 opacity-50'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-sm shadow-blue-500" />
            <span>{hi ? 'बाईं आंख (ब्लू)' : 'Left Eye (Blue)'}</span>
          </button>

          <button
            onClick={() => setShowTarget(!showTarget)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-all ${
              showTarget ? 'bg-amber-500/20 border-amber-400/50 text-amber-300' : 'bg-white/5 border-white/10 text-slate-500 opacity-50'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-sm shadow-amber-400" />
            <span>{hi ? 'लक्ष्य उद्दीपन (पीला/हरा)' : 'Target Stimulus (Yellow)'}</span>
          </button>
        </div>
      </div>

      {/* Control Bar: Axis Toggle, Time Window, Pause & Export */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-white/5 p-2 rounded-xl border border-white/10 text-xs">
        {/* Signal Axis Selection */}
        <div className="flex items-center gap-1">
          <span className="text-slate-400 font-semibold mr-1">{hi ? 'सिग्नल अक्ष:' : 'Trace Axis:'}</span>
          {(['horizontal', 'vertical', 'magnitude'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setAxisMode(mode)}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                axisMode === mode ? 'bg-teal-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {mode === 'horizontal' ? (hi ? '↔ क्षैतिज (X)' : '↔ Horizontal (X)')
                : mode === 'vertical' ? (hi ? '↕ लंबवत (Y)' : '↕ Vertical (Y)')
                : (hi ? '📐 परिणामी 2D' : '📐 Vector (2D)')}
            </button>
          ))}
        </div>

        {/* Time Window Scale */}
        <div className="flex items-center gap-1">
          <span className="text-slate-400 font-semibold mr-1">{hi ? 'समय सीमा:' : 'Window:'}</span>
          {[5, 10, 15, 30].map((sec) => (
            <button
              key={sec}
              onClick={() => setTimeWindowSec(sec)}
              className={`px-2 py-1 rounded-lg font-semibold transition-all ${
                timeWindowSec === sec ? 'bg-slate-700 text-cyan-300 font-bold border border-cyan-500/40' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {sec}s
            </button>
          ))}
        </div>

        {/* Action Buttons: Pause & Export */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleTogglePause}
            className={`flex items-center gap-1 px-3 py-1 rounded-lg font-bold transition-all border ${
              isPaused ? 'bg-amber-500 text-slate-950 border-amber-400' : 'bg-white/10 hover:bg-white/20 text-slate-200 border-white/10'
            }`}
          >
            {isPaused ? <Play className="w-3 h-3 fill-current" /> : <Pause className="w-3 h-3" />}
            <span>{isPaused ? (hi ? 'पुनः चलाएं' : 'Resume') : (hi ? 'विराम दें' : 'Pause')}</span>
          </button>

          <button
            onClick={handleExportPNG}
            className="flex items-center gap-1 px-3 py-1 rounded-lg bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 font-bold border border-teal-500/40 transition-all"
            title={hi ? 'ग्राफ छवि डाउनलोड करें' : 'Download PNG waveform graph'}
          >
            <Download className="w-3 h-3" />
            <span>{hi ? 'निर्यात PNG' : 'Export PNG'}</span>
          </button>
        </div>
      </div>

      {/* Main Canvas Graph Display */}
      <div className="relative bg-[#080c16] rounded-xl overflow-hidden border border-white/10 h-72 sm:h-80 w-full flex items-center justify-center shadow-inner">
        <canvas ref={canvasRef} className="w-full h-full object-cover" />
      </div>

      {/* Real-Time Clinical Metrics Readout */}
      {metrics && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
          <div className="bg-red-950/30 border border-red-500/30 rounded-xl p-2.5 text-center">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">{hi ? 'दाहिनी आंख गेन' : 'Right Eye Gain'}</span>
            <span className="font-mono text-base font-bold text-red-400">{metrics.rightGain}</span>
          </div>

          <div className="bg-blue-950/30 border border-blue-500/30 rounded-xl p-2.5 text-center">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">{hi ? 'बाईं आंख गेन' : 'Left Eye Gain'}</span>
            <span className="font-mono text-base font-bold text-blue-400">{metrics.leftGain}</span>
          </div>

          <div className="bg-amber-950/30 border border-amber-500/30 rounded-xl p-2.5 text-center">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">{hi ? 'आंख असंतुलन (Δ Deg)' : 'Binocular Offset'}</span>
            <span className="font-mono text-base font-bold text-amber-300">±{metrics.disagreementDeg}°</span>
          </div>

          <div className="bg-teal-950/30 border border-teal-500/30 rounded-xl p-2.5 text-center">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">{hi ? 'ट्रैकिंग गुणवत्ता' : 'Pursuit Fidelity'}</span>
            <span className="font-bold text-teal-300">{metrics.quality}</span>
          </div>
        </div>
      )}
    </div>
  );
};
