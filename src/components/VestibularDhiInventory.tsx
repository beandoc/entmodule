'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ClipboardCheck, CheckCircle2, AlertTriangle, ShieldAlert, Printer, Save, Check, RotateCcw, TrendingDown,
} from 'lucide-react';
import { useAppData } from '@/lib/app-data-context';
import {
  DHI_ITEMS, DHI_OPTIONS, DHI_SUBSCALE_MAX, DHI_MDC,
  scoreDhi, scoreDhiSubscale, dhiBandFor,
  saveDhiResult, saveDhiToSymptomLog, loadDhiHistory,
  type DhiResult, type DhiTone,
} from '@/lib/vestibular-rx';

const TONE_STYLES: Record<DhiTone, { icon: typeof CheckCircle2; className: string; badgeClass: string }> = {
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
  onSaved?: (result: DhiResult) => void;
}

export const VestibularDhiInventory: React.FC<Props> = ({ onSaved }) => {
  const { locale } = useAppData();
  const hi = locale === 'hi';

  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [savedToLog, setSavedToLog] = useState(false);
  const [history, setHistory] = useState<DhiResult[]>([]);

  useEffect(() => {
    setHistory(loadDhiHistory());
  }, []);

  const score = scoreDhi(answers);
  const band = dhiBandFor(score);
  const answered = Object.keys(answers).length;
  const allAnswered = answered === DHI_ITEMS.length;
  const ToneIcon = TONE_STYLES[band.tone].icon;

  /** The previous score, so we can say whether a change is real or measurement noise. */
  const previous = history[0];
  const change = useMemo(() => {
    if (!previous) return null;
    const delta = score - previous.score;
    return { delta, meaningful: Math.abs(delta) >= DHI_MDC };
  }, [previous, score]);

  const reset = () => {
    setAnswers({});
    setSubmitted(false);
    setSavedToLog(false);
  };

  const handleSave = () => {
    const result: DhiResult = {
      id: crypto.randomUUID(),
      date: new Date().toISOString().slice(0, 10),
      score,
      grade: band.grade,
      createdAt: new Date().toISOString(),
    };
    setHistory(saveDhiResult(result));
    saveDhiToSymptomLog(score, band.label);
    setSavedToLog(true);
    onSaved?.(result);
  };

  if (submitted) {
    return (
      <div className="space-y-5" id="printable-dhi-report">
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

          {change && (
            <div className="flex items-start gap-2 text-sm rounded-xl bg-white/60 dark:bg-ink-950/50 border border-current/10 p-3">
              <TrendingDown className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
              <span>
                {hi
                  ? `पिछली बार ${previous.score} था — ${change.delta === 0 ? 'कोई बदलाव नहीं' : `${Math.abs(change.delta)} अंक ${change.delta < 0 ? 'कम' : 'अधिक'}`}। `
                  : `Last time you scored ${previous.score} — ${change.delta === 0 ? 'no change' : `${Math.abs(change.delta)} points ${change.delta < 0 ? 'lower' : 'higher'}`}. `}
                {change.meaningful
                  ? hi
                    ? 'यह अंतर वास्तविक बदलाव माना जाता है।'
                    : 'That is large enough to count as a real change.'
                  : hi
                  ? `${DHI_MDC} अंक से कम का अंतर मापन की सामान्य उतार-चढ़ाव में आता है, वास्तविक सुधार नहीं।`
                  : `A shift under ${DHI_MDC} points sits inside the inventory's normal measurement noise, so read it as steady rather than improved.`}
              </span>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3 pt-2">
            {([
              { key: 'P' as const, label: hi ? 'शारीरिक' : 'Physical' },
              { key: 'E' as const, label: hi ? 'भावनात्मक' : 'Emotional' },
              { key: 'F' as const, label: hi ? 'कार्यात्मक' : 'Functional' },
            ]).map((sub) => {
              const value = scoreDhiSubscale(answers, sub.key);
              const max = DHI_SUBSCALE_MAX[sub.key];
              return (
                <div key={sub.key} className="rounded-xl bg-white/60 dark:bg-ink-950/50 border border-current/10 p-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider opacity-70 block">{sub.label}</span>
                  <span className="font-mono font-bold text-lg">
                    {value}
                    <span className="text-xs opacity-60">/{max}</span>
                  </span>
                  <div className="h-1.5 mt-1.5 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-current opacity-70 transition-all duration-500"
                      style={{ width: `${(value / max) * 100}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {band.grade >= 2 && (
            <Link
              href="/care-plan"
              className="no-print inline-flex items-center gap-2 bg-navy-800 hover:bg-navy-900 text-white font-bold text-sm px-4 py-2.5 rounded-xl transition-colors"
            >
              <ClipboardCheck className="w-4 h-4" />
              {hi ? 'देखभाल योजना खोलें' : 'Open my care plan'}
            </Link>
          )}
        </div>

        <div className="print-only hidden text-xs text-slate-600">
          DHI-25 · {new Date().toLocaleDateString()} · i-Dhanwantari ENT Module
        </div>

        <div className="no-print flex flex-wrap gap-3">
          <button onClick={handleSave} disabled={savedToLog} className="btn-navy inline-flex items-center gap-2 disabled:opacity-60">
            {savedToLog ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {savedToLog ? (hi ? 'लॉग में सहेजा गया' : 'Saved to log') : (hi ? 'लक्षण लॉग में सहेजें' : 'Save to Symptom Log')}
          </button>
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
            {hi ? 'चक्कर हैंडीकैप इन्वेंटरी (DHI-25)' : 'Dizziness Handicap Inventory (DHI-25)'}
          </h3>
        </div>
        <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400">
          {answered}/{DHI_ITEMS.length}
        </span>
      </div>

      <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
        {hi
          ? 'पिछले एक महीने में अपने चक्कर या असंतुलन के बारे में सोचकर उत्तर दें। यह प्रश्नावली गंभीरता नहीं, बल्कि यह मापती है कि चक्कर आपके जीवन में कितनी बाधा डाल रहा है।'
          : 'Answer for your dizziness or unsteadiness over the past month. This measures how much dizziness restricts your life, not how intense the spinning feels.'}
      </p>

      <div className="h-2 bg-slate-100 dark:bg-ink-950 rounded-full overflow-hidden">
        <div
          className="bg-navy-700 h-full rounded-full transition-all duration-500"
          style={{ width: `${(answered / DHI_ITEMS.length) * 100}%` }}
        />
      </div>

      <div className="space-y-3 max-h-[32rem] overflow-y-auto thin-scroll pr-1">
        {DHI_ITEMS.map((item, index) => (
          <fieldset
            key={item.id}
            className="rounded-xl border border-slate-200 dark:border-ink-800 bg-slate-50/70 dark:bg-ink-950/60 p-4 space-y-3"
          >
            <legend className="sr-only">{hi ? item.textHi : item.text}</legend>
            <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
              <span className="font-mono text-xs text-slate-400 mr-2">{index + 1}.</span>
              {hi ? item.textHi : item.text}
            </p>
            <div className="grid grid-cols-3 gap-2">
              {DHI_OPTIONS.map((option) => {
                const selected = answers[item.id] === option.score;
                return (
                  <button
                    key={option.score}
                    type="button"
                    aria-pressed={selected}
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
          </fieldset>
        ))}
      </div>

      <button onClick={() => setSubmitted(true)} disabled={!allAnswered} className="btn-navy w-full disabled:opacity-50 disabled:cursor-not-allowed">
        {allAnswered
          ? (hi ? 'स्कोर देखें' : 'See my score')
          : (hi ? `${DHI_ITEMS.length - answered} प्रश्न शेष` : `${DHI_ITEMS.length - answered} question${DHI_ITEMS.length - answered === 1 ? '' : 's'} left`)}
      </button>
    </div>
  );
};
