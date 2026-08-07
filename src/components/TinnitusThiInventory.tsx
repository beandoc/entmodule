'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ClipboardCheck, CheckCircle2, AlertTriangle, ShieldAlert, Printer, Save, Check, RotateCcw, CloudOff,
} from 'lucide-react';
import { useAppData } from '@/lib/app-data-context';
import {
  THI_ITEMS, THI_OPTIONS, scoreThi, thiBandFor, scoreThiSubscale,
  saveThiResult, saveThiToSymptomLog, syncThiToServer,
  type ThiResult, type ThiTone,
} from '@/lib/tinnitus-rx';

const TONE_STYLES: Record<ThiTone, { icon: typeof CheckCircle2; className: string; badgeClass: string }> = {
  routine: {
    icon: CheckCircle2,
    className: 'bg-emerald-50 text-emerald-900 dark:bg-[#122443] dark:text-emerald-200 border-emerald-200 dark:border-emerald-800',
    badgeClass: 'bg-emerald-700 text-white',
  },
  clinic: {
    icon: AlertTriangle,
    className: 'bg-amber-50 text-amber-900 dark:bg-amber-950/60 dark:text-amber-200 border-amber-200 dark:border-amber-800',
    badgeClass: 'bg-amber-600 text-white',
  },
  emergency: {
    icon: ShieldAlert,
    className: 'bg-red-50 text-red-900 dark:bg-red-950/60 dark:text-red-200 border-red-200 dark:border-red-800',
    badgeClass: 'bg-red-600 text-white',
  },
};

interface Props {
  onSaved?: (result: ThiResult) => void;
}

export const TinnitusThiInventory: React.FC<Props> = ({ onSaved }) => {
  const { locale } = useAppData();
  const hi = locale === 'hi';

  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [savedToLog, setSavedToLog] = useState(false);
  const [syncState, setSyncState] = useState<'idle' | 'syncing' | 'synced' | 'queued'>('idle');

  const score = scoreThi(answers);
  const band = thiBandFor(score);
  const answered = Object.keys(answers).length;
  const allAnswered = answered === THI_ITEMS.length;
  const ToneIcon = TONE_STYLES[band.tone].icon;

  const reset = () => {
    setAnswers({});
    setSubmitted(false);
    setSavedToLog(false);
    setSyncState('idle');
  };

  const handleSave = async () => {
    const result: ThiResult = {
      id: crypto.randomUUID(),
      date: new Date().toISOString().slice(0, 10),
      score,
      grade: band.grade,
      createdAt: new Date().toISOString(),
    };
    // Local save first — it must not depend on the network.
    saveThiResult(result);
    saveThiToSymptomLog(score, band.label);
    setSavedToLog(true);
    onSaved?.(result);

    // Then push to PROMResponse so the audiologist can see the trend.
    setSyncState('syncing');
    const sent = await syncThiToServer(score, band.grade, answers);
    setSyncState(sent ? 'synced' : 'queued');
  };

  if (submitted) {
    return (
      <div className="space-y-5" id="printable-thi-report">
        <div className={`rounded-2xl border p-6 space-y-4 ${TONE_STYLES[band.tone].className}`}>
          <div className="flex flex-wrap items-center gap-3">
            <ToneIcon className="w-7 h-7 shrink-0" />
            <div>
              <span className={`text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-full ${TONE_STYLES[band.tone].badgeClass}`}>
                {hi ? band.labelHi : band.label}
              </span>
              <h3 className="font-display font-bold text-2xl mt-2">
                {score} <span className="text-base font-semibold opacity-70">/ 100</span>
              </h3>
            </div>
          </div>
          <p className="text-sm leading-relaxed">{hi ? band.guidanceHi : band.guidance}</p>

          <div className="grid grid-cols-3 gap-3 pt-2">
            {([
              { key: 'F' as const, label: hi ? 'कार्यात्मक' : 'Functional', max: 44 },
              { key: 'E' as const, label: hi ? 'भावनात्मक' : 'Emotional', max: 36 },
              { key: 'C' as const, label: hi ? 'विनाशकारी' : 'Catastrophic', max: 20 },
            ]).map((sub) => {
              const value = scoreThiSubscale(answers, sub.key);
              return (
                <div key={sub.key} className="rounded-xl bg-white/60 dark:bg-ink-950/50 border border-current/10 p-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider opacity-70 block">{sub.label}</span>
                  <span className="font-mono font-bold text-lg">{value}<span className="text-xs opacity-60">/{sub.max}</span></span>
                  <div className="h-1.5 mt-1.5 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-current opacity-70 transition-all duration-500" style={{ width: `${(value / sub.max) * 100}%` }} />
                  </div>
                </div>
              );
            })}
          </div>

          {band.tone === 'emergency' && (
            <Link
              href="/emergency"
              className="no-print inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold text-sm px-4 py-2.5 rounded-xl transition-colors"
            >
              <ShieldAlert className="w-4 h-4" />
              {hi ? 'आपातकालीन कार्ड खोलें' : 'Open Emergency Card'}
            </Link>
          )}
        </div>

        <div className="print-only hidden text-xs text-slate-600">
          THI-25 · {new Date().toLocaleDateString()} · i-Dhanwantari ENT Module
        </div>

        <div className="no-print flex flex-wrap gap-3">
          <button onClick={handleSave} disabled={savedToLog} className="btn-navy inline-flex items-center gap-2 disabled:opacity-60">
            {savedToLog ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {savedToLog ? (hi ? 'लॉग में सहेजा गया' : 'Saved to log') : (hi ? 'लक्षण लॉग में सहेजें' : 'Save to Symptom Log')}
          </button>
          {syncState !== 'idle' && (
            <span
              className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg ${
                syncState === 'synced'
                  ? 'text-emerald-700 dark:text-emerald-300'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              {syncState === 'syncing' && (hi ? 'ऑडियोलॉजी को भेजा जा रहा है…' : 'Sending to Audiology…')}
              {syncState === 'synced' && (
                <>
                  <Check className="w-3.5 h-3.5" />
                  {hi ? 'ऑडियोलॉजी रिकॉर्ड में जोड़ा गया' : 'Added to your Audiology record'}
                </>
              )}
              {syncState === 'queued' && (
                <>
                  <CloudOff className="w-3.5 h-3.5" />
                  {hi ? 'ऑफ़लाइन — अगली बार अपने आप भेजा जाएगा' : 'Offline — will send automatically next time'}
                </>
              )}
            </span>
          )}
          <button onClick={() => window.print()} className="btn-outline inline-flex items-center gap-2">
            <Printer className="w-4 h-4" />
            {hi ? 'रिपोर्ट प्रिंट करें' : 'Print / Download Report'}
          </button>
          <button onClick={reset} className="btn-outline inline-flex items-center gap-2">
            <RotateCcw className="w-4 h-4" />
            {hi ? 'फिर से भरें' : 'Retake'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ClipboardCheck className="w-5 h-5 text-navy-700 dark:text-navy-300" />
          <h3 className="font-bold text-slate-900 dark:text-white">
            {hi ? 'टिनिटस हैंडीकैप इन्वेंटरी (THI-25)' : 'Tinnitus Handicap Inventory (THI-25)'}
          </h3>
        </div>
        <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400">
          {answered}/{THI_ITEMS.length}
        </span>
      </div>

      <div className="h-2 bg-slate-100 dark:bg-ink-950 rounded-full overflow-hidden">
        <div
          className="bg-navy-700 h-full rounded-full transition-all duration-500"
          style={{ width: `${(answered / THI_ITEMS.length) * 100}%` }}
        />
      </div>

      <div className="space-y-3 max-h-[32rem] overflow-y-auto thin-scroll pr-1">
        {THI_ITEMS.map((item, index) => (
          <div key={item.id} className="rounded-xl border border-slate-200 dark:border-ink-800 bg-slate-50/70 dark:bg-ink-950/60 p-4 space-y-3">
            <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
              <span className="font-mono text-xs text-slate-400 mr-2">{index + 1}.</span>
              {hi ? item.textHi : item.text}
            </p>
            <div className="grid grid-cols-3 gap-2">
              {THI_OPTIONS.map((option) => {
                const selected = answers[item.id] === option.score;
                return (
                  <button
                    key={option.score}
                    onClick={() => setAnswers((prev) => ({ ...prev, [item.id]: option.score }))}
                    className={`py-2 px-2 rounded-lg text-xs font-bold border transition-all ${
                      selected
                        ? 'bg-navy-700 text-white border-navy-700 shadow-sm'
                        : 'bg-white dark:bg-ink-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-ink-800 hover:border-navy-300'
                    }`}
                  >
                    {hi ? option.labelHi : option.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={() => setSubmitted(true)}
        disabled={!allAnswered}
        className="btn-navy w-full disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {allAnswered
          ? (hi ? 'स्कोर देखें' : 'See my score')
          : (hi ? `${THI_ITEMS.length - answered} प्रश्न शेष` : `${THI_ITEMS.length - answered} question${THI_ITEMS.length - answered === 1 ? '' : 's'} left`)}
      </button>
    </div>
  );
};
