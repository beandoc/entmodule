'use client';

import React, { useState } from 'react';
import { BarChart3, TrendingUp, Award, Users, CheckCircle2, ShieldCheck, Download, Filter, Layers, ArrowUpRight } from 'lucide-react';
import { useAppData } from '@/lib/app-data-context';

export const ClinicianAnalytics: React.FC = () => {
  const { locale } = useAppData();
  const hi = locale === 'hi';
  const [selectedPathway, setSelectedPathway] = useState<string>('all');

  const pathwayData: Record<string, { title: string; count: number; snotStart: number; snotEnd: number; passRate: number }> = {
    all: { title: 'All ENT Pathways', count: 520, snotStart: 54, snotEnd: 8, passRate: 93.6 },
    fess: { title: 'FESS Sinus Surgery (Rhinology)', count: 210, snotStart: 62, snotEnd: 12, passRate: 91.2 },
    tympanoplasty: { title: 'Tympanoplasty & Mastoid (Otology)', count: 180, snotStart: 46, snotEnd: 6, passRate: 96.4 },
    laryngectomy: { title: 'Total Laryngectomy (Head & Neck)', count: 45, snotStart: 70, snotEnd: 18, passRate: 98.0 },
    cochlear: { title: 'Cochlear Implant Rehabilitation', count: 85, snotStart: 50, snotEnd: 10, passRate: 94.8 },
  };

  const currentPathway = pathwayData[selectedPathway] || pathwayData.all;

  const promsTrajectory = [
    { stage: 'Pre-Op', snot22: currentPathway.snotStart, dhi: Math.round(currentPathway.snotStart * 0.8), pain: 6.2 },
    { stage: 'Week 1', snot22: Math.round(currentPathway.snotStart * 0.75), dhi: Math.round(currentPathway.snotStart * 0.6), pain: 4.1 },
    { stage: 'Week 2', snot22: Math.round(currentPathway.snotStart * 0.5), dhi: Math.round(currentPathway.snotStart * 0.38), pain: 2.3 },
    { stage: 'Week 4', snot22: Math.round(currentPathway.snotStart * 0.25), dhi: Math.round(currentPathway.snotStart * 0.18), pain: 1.1 },
    { stage: 'Week 8', snot22: currentPathway.snotEnd, dhi: Math.round(currentPathway.snotEnd * 0.5), pain: 0.4 },
  ];

  const quizPassRates = [
    { topic: 'Tympanoplasty Water Precautions', passRate: 96, attempts: 248, avgScore: 92, specialty: 'Otology' },
    { topic: 'FESS Saline Sinus Douching', passRate: 91, attempts: 312, avgScore: 88, specialty: 'Rhinology' },
    { topic: 'Laryngectomy Stoma Care & Safety', passRate: 98, attempts: 114, avgScore: 95, specialty: 'Head & Neck' },
    { topic: 'Tonsillectomy Bleeding Rules', passRate: 89, attempts: 186, avgScore: 84, specialty: 'Paediatric ENT' },
    { topic: 'Cochlear Implant vs Hearing Aid', passRate: 94, attempts: 142, avgScore: 90, specialty: 'Audiology / CI' },
  ];

  const funnelMetrics = [
    { label: 'Orders Prescribed', count: currentPathway.count, pct: 100 },
    { label: 'WhatsApp / SMS Reminders Delivered', count: Math.round(currentPathway.count * 0.95), pct: 95 },
    { label: 'Module Opened & Viewed', count: Math.round(currentPathway.count * 0.88), pct: 88 },
    { label: 'Skill Guides Completed', count: Math.round(currentPathway.count * 0.82), pct: 82 },
    { label: 'PROM Scores Submitted', count: Math.round(currentPathway.count * 0.76), pct: 76 },
  ];

  const exportCSV = () => {
    const header = 'Pathway,Stage,SNOT-22 Score,DHI Score,Pain Level\n';
    const rows = promsTrajectory.map((r) => `"${currentPathway.title}","${r.stage}",${r.snot22},${r.dhi},${r.pain}`).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ENT-QI-Analytics-${selectedPathway}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8 pb-10">
      {/* Header */}
      <div className="bg-white dark:bg-ink-900 border border-slate-200 dark:border-ink-800 rounded-3xl p-6 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-clinical-50 dark:bg-ink-800 text-clinical-600 dark:text-clinical-400 flex items-center justify-center">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-display font-bold text-xl text-slate-900 dark:text-white">
              {hi ? 'चिकित्सक विश्लेषण और गुणवत्ता सुधार (QI) डैशबोर्ड' : 'Departmental Clinician Analytics & QI Dashboard'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {hi
                ? 'विभाग-व्यापी PROM स्कोर (SNOT-22), क्विज़ दरें और केयर पाथवे रुझान।'
                : 'Aggregated PROMs (SNOT-22/DHI), quiz pass rates & pathway adherence across ENT care pathways.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportCSV}
            className="inline-flex items-center gap-1.5 bg-slate-100 dark:bg-ink-800 text-slate-700 dark:text-slate-200 text-xs font-bold px-3.5 py-2 rounded-xl border border-slate-200 dark:border-ink-700 hover:bg-slate-200 dark:hover:bg-ink-700 transition-colors"
          >
            <Download className="w-4 h-4 text-clinical-600" />
            {hi ? 'सीएसवी डेटा निर्यात' : 'Export QI Data (CSV)'}
          </button>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 bg-clinical-600 hover:bg-clinical-500 text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow-md transition-colors"
          >
            <ArrowUpRight className="w-4 h-4" />
            {hi ? 'प्रिंट QI रिपोर्ट' : 'Print QI Report'}
          </button>
        </div>
      </div>

      {/* Pathway Selector Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400 shrink-0 flex items-center gap-1">
          <Filter className="w-3.5 h-3.5" /> Filter Pathway:
        </span>
        {Object.entries(pathwayData).map(([key, val]) => (
          <button
            key={key}
            onClick={() => setSelectedPathway(key)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 border ${
              selectedPathway === key
                ? 'bg-clinical-600 text-white border-clinical-500 shadow-sm'
                : 'bg-white dark:bg-ink-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-ink-800 hover:border-clinical-400'
            }`}
          >
            {val.title}
          </button>
        ))}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Active Pathway Patients', val: String(currentPathway.count), sub: `N=${currentPathway.count} in pathway`, icon: Users, color: 'text-clinical-600' },
          { label: 'SNOT-22 Improvement', val: `-${Math.round(((currentPathway.snotStart - currentPathway.snotEnd) / currentPathway.snotStart) * 100)}%`, sub: `Pre-op ${currentPathway.snotStart} → Wk8 ${currentPathway.snotEnd}`, icon: TrendingUp, color: 'text-emerald-600' },
          { label: 'Comprehension Pass Rate', val: `${currentPathway.passRate}%`, sub: 'First-attempt mastery', icon: Award, color: 'text-cyan-600' },
          { label: 'Red-Flag Triage Triggered', val: '42 cases', sub: 'Early clinic call before ER', icon: ShieldCheck, color: 'text-indigo-600' },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="bg-white dark:bg-ink-900 border border-slate-200 dark:border-ink-800 rounded-2xl p-5 shadow-sm flex items-start gap-4"
            >
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-ink-800 shrink-0">
                <Icon className={`w-5 h-5 ${card.color}`} />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{card.label}</p>
                <p className="font-display font-bold text-2xl text-slate-900 dark:text-white mt-0.5">{card.val}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-semibold">{card.sub}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pathway PROM Trajectory Chart & Quiz Pass Rates */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* SNOT-22 & DHI Recovery Trajectory */}
        <div className="bg-white dark:bg-ink-900 border border-slate-200 dark:border-ink-800 rounded-3xl p-6 shadow-xl space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-ink-800 pb-3">
            <div>
              <h3 className="font-display font-bold text-base text-slate-900 dark:text-white">
                SNOT-22 & DHI Recovery Trajectory ({currentPathway.title})
              </h3>
              <p className="text-xs text-slate-400">Average patient-reported outcome scores over 8 post-op weeks</p>
            </div>
            <span className="text-xs font-mono font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-200">
              N={currentPathway.count}
            </span>
          </div>

          <div className="space-y-4">
            {promsTrajectory.map((row) => (
              <div key={row.stage} className="space-y-1">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-slate-700 dark:text-slate-300 w-16">{row.stage}</span>
                  <div className="flex items-center gap-4 text-xs font-mono">
                    <span className="text-clinical-600 dark:text-clinical-400">SNOT-22: {row.snot22}/110</span>
                    <span className="text-cyan-600 dark:text-cyan-400">DHI: {row.dhi}/100</span>
                    <span className="text-slate-400">Pain: {row.pain}/10</span>
                  </div>
                </div>
                <div className="h-2.5 bg-slate-100 dark:bg-ink-950 rounded-full overflow-hidden flex gap-1">
                  <div
                    className="bg-clinical-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${(row.snot22 / 110) * 100}%` }}
                  />
                  <div
                    className="bg-cyan-400 h-full rounded-full transition-all duration-500"
                    style={{ width: `${(row.dhi / 100) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Topic Comprehension Quiz Pass Rates */}
        <div className="bg-white dark:bg-ink-900 border border-slate-200 dark:border-ink-800 rounded-3xl p-6 shadow-xl space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-ink-800 pb-3">
            <div>
              <h3 className="font-display font-bold text-base text-slate-900 dark:text-white">
                Comprehension Quiz Pass Rates by Topic
              </h3>
              <p className="text-xs text-slate-400">First-attempt mastery rates across key procedural modules</p>
            </div>
            <span className="text-xs font-mono font-bold text-clinical-600 bg-clinical-50 dark:bg-ink-800 px-2.5 py-1 rounded-full border border-clinical-200">
              5 Topics
            </span>
          </div>

          <div className="space-y-4">
            {quizPassRates.map((q) => (
              <div key={q.topic} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[220px]">{q.topic}</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{q.passRate}% Pass ({q.attempts} attempts)</span>
                </div>
                <div className="h-2 bg-slate-100 dark:bg-ink-950 rounded-full overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-clinical-500 to-emerald-400 h-full rounded-full transition-all duration-500"
                    style={{ width: `${q.passRate}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Patient Engagement & Delivery Funnel */}
      <div className="bg-white dark:bg-ink-900 border border-slate-200 dark:border-ink-800 rounded-3xl p-6 shadow-xl space-y-5">
        <div className="border-b border-slate-100 dark:border-ink-800 pb-3">
          <h3 className="font-display font-bold text-base text-slate-900 dark:text-white">
            Patient Delivery & Engagement Funnel ({currentPathway.title})
          </h3>
          <p className="text-xs text-slate-400">Departmental adherence tracking from order entry to PROM completion</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
          {funnelMetrics.map((f, i) => (
            <div key={f.label} className="bg-slate-50 dark:bg-ink-950 p-4 rounded-2xl border border-slate-200/80 dark:border-ink-800 text-center space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Step {i + 1}</span>
              <p className="font-display font-bold text-xl text-clinical-600 dark:text-clinical-400">{f.count}</p>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-snug">{f.label}</p>
              <span className="inline-block text-[10px] font-mono font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full mt-1">
                {f.pct}% Retention
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Real-time Audiologist & Patient Sync Panel */}
      <ClinicianAudiologySyncSection hi={hi} />
    </div>
  );
};

const ClinicianAudiologySyncSection: React.FC<{ hi: boolean }> = ({ hi }) => {
  const { latestAudiologyEval } = useAppData();

  if (!latestAudiologyEval) return null;

  return (
    <div className="bg-slate-900 text-white border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider bg-teal-500/20 text-teal-300 px-2.5 py-0.5 rounded-full border border-teal-500/30 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
              {hi ? 'ऑडियोलॉजिस्ट लाइव डेटा सिंक' : 'Live Audiologist Data Sync'}
            </span>
            <span className="text-xs font-mono text-slate-400">
              Evaluator: {latestAudiologyEval.audiologistName || 'Mr Lokanath Sahoo'}
            </span>
          </div>
          <h3 className="font-bold text-lg text-white mt-1">
            Patient Evaluation: {latestAudiologyEval.patientName || 'Sachin Srivastava'} ({latestAudiologyEval.patientMrn || 'MRN: 88491'})
          </h3>
        </div>

        <span className="text-xs font-mono text-teal-400 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
          Last Synced: {new Date(latestAudiologyEval.updatedAt || Date.now()).toLocaleTimeString()}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
        <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
          <span className="text-slate-500 block text-[10px] uppercase font-bold">Right Ear PTA</span>
          <span className="text-base font-extrabold text-rose-400 font-mono">{latestAudiologyEval.rightPta} dB HL</span>
        </div>
        <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
          <span className="text-slate-500 block text-[10px] uppercase font-bold">Left Ear PTA</span>
          <span className="text-base font-extrabold text-cyan-400 font-mono">{latestAudiologyEval.leftPta} dB HL</span>
        </div>
        <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
          <span className="text-slate-500 block text-[10px] uppercase font-bold">Speech-in-Noise</span>
          <span className="text-base font-extrabold text-emerald-400 font-mono">{latestAudiologyEval.speechInNoiseScore}%</span>
        </div>
        <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
          <span className="text-slate-500 block text-[10px] uppercase font-bold">Tympanogram</span>
          <span className="text-base font-extrabold text-amber-400 font-mono">{latestAudiologyEval.tympanogramType}</span>
        </div>
        <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
          <span className="text-slate-500 block text-[10px] uppercase font-bold">Fitting Status</span>
          <span className="text-base font-extrabold text-purple-400 font-mono">{latestAudiologyEval.fittingStatus}</span>
        </div>
      </div>
    </div>
  );
};
