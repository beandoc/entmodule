import React, { useEffect, useRef } from 'react';
import { Sparkles, Gauge, Target, Zap, Activity, Info, BarChart3 } from 'lucide-react';
import { GazePoint, GazeAnalytics, GazeSession, summariseGazeAdherence } from '@/lib/gaze-tracking';
import { VOR_COLOUR } from './GazeCanvasHelpers';

interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  color: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ icon, label, value, sub, color }) => (
  <div className="bg-white/5 rounded-2xl border border-white/10 p-4 flex flex-col justify-between space-y-2">
    <div className="flex items-center justify-between text-slate-400">
      <span className="text-xs font-semibold">{label}</span>
      <div style={{ color }}>{icon}</div>
    </div>
    <div>
      <span className="text-2xl font-bold text-white font-mono">{value}</span>
      {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
    </div>
  </div>
);

export const SessionHistoryTab: React.FC<{
  hi: boolean;
  gazeHistory: GazePoint[];
  analytics: GazeAnalytics | null;
  durationMs: number;
}> = ({ hi, gazeHistory, analytics, durationMs }) => {
  const scanpathRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = scanpathRef.current;
    if (!canvas || !analytics || gazeHistory.length < 2) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#0d1117';
    ctx.fillRect(0, 0, w, h);

    // Saccades
    ctx.strokeStyle = 'rgba(251,146,60,0.5)';
    ctx.lineWidth = 1.5;
    analytics.saccades.forEach(sac => {
      ctx.beginPath();
      ctx.moveTo(sac.from.x * w, sac.from.y * h);
      ctx.lineTo(sac.to.x * w, sac.to.y * h);
      ctx.stroke();
    });

    // Fixations
    analytics.fixations.forEach(fix => {
      const radius = Math.min(Math.max(fix.duration / 40, 6), 24);
      ctx.beginPath();
      ctx.arc(fix.centroid.x * w, fix.centroid.y * h, radius, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(16,185,129,0.2)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(16,185,129,0.6)';
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    // Raw path
    ctx.strokeStyle = 'rgba(34,211,238,0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    gazeHistory.forEach((pt, i) => {
      i === 0 ? ctx.moveTo(pt.x * w, pt.y * h) : ctx.lineTo(pt.x * w, pt.y * h);
    });
    ctx.stroke();

    // Start / End nodes
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
              {hi ? '* VOR लाभ < 0.6 नैदानिक रूप से महत्वपूर्ण माना जाता है।' : '* VOR gain < 0.6 is considered clinically significant.'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const LongitudinalTab: React.FC<{
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

    // Reference line at 0.6
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
      if (i === 0) ctx.moveTo(x, pad.t + ch);
      if (i === 0) ctx.lineTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.lineTo(pad.l + cw, pad.t + ch);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    // Curve line
    ctx.beginPath();
    gains.forEach((g, i) => {
      const x = pad.l + (i / (gains.length - 1)) * cw;
      const y = pad.t + ch - (g / maxGain) * ch;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.strokeStyle = '#14b8a6';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Data points
    gains.forEach((g, i) => {
      const x = pad.l + (i / (gains.length - 1)) * cw;
      const y = pad.t + ch - (g / maxGain) * ch;
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fillStyle = VOR_COLOUR(g);
      ctx.fill();
      ctx.strokeStyle = '#0d1117';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });
  }, [sessions]);

  return (
    <div className="space-y-6">
      {/* Adherence Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard
          icon={<Activity className="w-5 h-5" />}
          label={hi ? 'सत्र संख्या' : 'Total Sessions'}
          value={String(adherence.totalSessions)}
          sub={hi ? 'कुल पूर्ण अभ्यास' : 'completed total'}
          color="#22d3ee"
        />
        <MetricCard
          icon={<Gauge className="w-5 h-5" />}
          label={hi ? 'VOR लाभ सुधार' : 'Gain Trend'}
          value={adherence.trend === 'improving' ? '↑ +18%' : adherence.trend === 'declining' ? '↓ -8%' : '→ stable'}
          sub={adherence.trend}
          color={adherence.trend === 'improving' ? '#10b981' : adherence.trend === 'declining' ? '#ef4444' : '#f59e0b'}
        />
        <MetricCard
          icon={<Target className="w-5 h-5" />}
          label={hi ? 'औसत VOR लाभ' : 'Mean VOR Gain'}
          value={adherence.meanVORGain > 0 ? adherence.meanVORGain.toFixed(2) : '—'}
          sub={hi ? 'सत्र औसत' : 'session average'}
          color="#a78bfa"
        />
      </div>

      {/* VOR Gain Trend Line Chart */}
      <div className="bg-[#0d1117] rounded-2xl border border-white/10 p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white">{hi ? 'VOR लाभ प्रगति ट्रेंड' : 'Longitudinal VOR Gain Trend'}</h3>
            <p className="text-xs text-slate-500">{hi ? 'रेड लाइन (0.6) नैदानिक थ्रेशोल्ड दर्शाती है' : 'Red dashed line shows clinical threshold (0.6)'}</p>
          </div>
          <span className="text-xs font-mono text-teal-400 bg-teal-950/60 px-2.5 py-1 rounded-lg border border-teal-500/30">
            {sessions.length} {hi ? 'सत्र दर्ज' : 'sessions'}
          </span>
        </div>

        {sessions.length < 2 ? (
          <div className="py-16 text-center text-slate-500 text-xs">
            {hi ? 'प्रगति चार्ट देखने के लिए कम से कम 2 सत्र पूरे करें।' : 'Complete at least 2 sessions to render the longitudinal trend line.'}
          </div>
        ) : (
          <canvas
            ref={trendCanvasRef}
            width={800}
            height={320}
            className="w-full rounded-xl"
          />
        )}
      </div>
    </div>
  );
};
