'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  ClipboardCheck, CheckCircle2, AlertTriangle, ShieldAlert, Printer, Save, Check, RotateCcw, TrendingDown,
} from 'lucide-react';
import { useAppData } from '@/lib/app-data-context';
import {
  VHI10_ITEMS, VHI10_OPTIONS, scoreVhi10, vhi10BandFor, VHI10_MCID, VHI10_ABNORMAL_ABOVE,
  EAT10_ITEMS, EAT10_OPTIONS, scoreEat10, eat10BandFor, EAT10_ABNORMAL_AT_OR_ABOVE,
  loadPromHistory, savePromResult, savePromToSymptomLog,
  type PromResult, type PromTone, type PromItem, type PromOption, type PromBand,
} from '@/lib/voice-rx';

const TONE_STYLES: Record<PromTone, { icon: typeof CheckCircle2; className: string; badgeClass: string }> = {
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

type Instrument = 'VHI-10' | 'EAT-10';

interface Config {
  items: PromItem[];
  options: PromOption[];
  score: (a: Record<string, number>) => number;
  band: (s: number) => PromBand;
  title: string;
  titleHi: string;
  blurb: string;
  blurbHi: string;
  attribution: string;
  /** Smallest change that is real rather than noise. Null where none is published. */
  mcid: number | null;
  cutoffNote: string;
  cutoffNoteHi: string;
}

const CONFIGS: Record<Instrument, Config> = {
  'VHI-10': {
    items: VHI10_ITEMS,
    options: VHI10_OPTIONS,
    score: scoreVhi10,
    band: vhi10BandFor,
    title: 'Voice Handicap Index (VHI-10)',
    titleHi: 'वॉइस हैंडिकैप इंडेक्स (VHI-10)',
    blurb: 'Ten questions about how your voice affects daily life. There are no right answers - answer for the last week.',
    blurbHi: 'दस प्रश्न कि आपकी आवाज़ रोज़मर्रा के जीवन को कैसे प्रभावित करती है। कोई सही उत्तर नहीं है - पिछले सप्ताह के अनुसार उत्तर दें।',
    attribution: 'Rosen, Lee, Osborne, Zullo & Murry (2004)',
    mcid: VHI10_MCID,
    cutoffNote: `Scores above ${VHI10_ABNORMAL_ABOVE} are outside the normal range.`,
    cutoffNoteHi: `${VHI10_ABNORMAL_ABOVE} से अधिक स्कोर सामान्य सीमा के बाहर हैं।`,
  },
  'EAT-10': {
    items: EAT10_ITEMS,
    options: EAT10_OPTIONS,
    score: scoreEat10,
    band: eat10BandFor,
    title: 'Swallowing Assessment (EAT-10)',
    titleHi: 'निगलने का आकलन (EAT-10)',
    blurb: 'Ten questions about swallowing. Rate each problem from 0 (no problem) to 4 (severe problem).',
    blurbHi: 'निगलने से जुड़े दस प्रश्न। हर समस्या को 0 (कोई समस्या नहीं) से 4 (गंभीर समस्या) तक आंकें।',
    attribution: 'Belafsky et al. (2008). EAT-10 is the property of Nestle Health Science.',
    mcid: null,
    cutoffNote: `A total of ${EAT10_ABNORMAL_AT_OR_ABOVE} or more is abnormal and worth raising with your team.`,
    cutoffNoteHi: `${EAT10_ABNORMAL_AT_OR_ABOVE} या अधिक का कुल स्कोर असामान्य है और अपनी टीम को बताना चाहिए।`,
  },
};

interface Props {
  instrument: Instrument;
  onSaved?: (result: PromResult) => void;
}

export const VoicePromInventory: React.FC<Props> = ({ instrument, onSaved }) => {
  const { locale } = useAppData();
  const hi = locale === 'hi';
  const config = CONFIGS[instrument];

  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [savedToLog, setSavedToLog] = useState(false);
  const [history, setHistory] = useState<PromResult[]>([]);

  useEffect(() => {
    setHistory(loadPromHistory(instrument));
    setAnswers({});
    setSubmitted(false);
    setSavedToLog(false);
  }, [instrument]);

  const answered = Object.keys(answers).length;
  const complete = answered === config.items.length;
  const score = useMemo(() => config.score(answers), [answers, config]);
  const band = config.band(score);
  const tone = TONE_STYLES[band.tone];
  const ToneIcon = tone.icon;

  const previous = history[0];
  const delta = previous ? score - previous.score : null;

  const handleSubmit = () => {
    if (!complete) return;
    const next = savePromResult(instrument, score, answers);
    setHistory(next);
    setSubmitted(true);
    onSaved?.(next[0]);
  };

  const handleSaveToLog = () => {
    savePromToSymptomLog(instrument, score, hi ? band.labelHi : band.label);
    setSavedToLog(true);
  };

  const handleRetake = () => {
    setAnswers({});
    setSubmitted(false);
    setSavedToLog(false);
  };

  if (submitted) {
    return (
      <div className="space-y-4">
        <div className={`clinical-card border ${tone.className}`}>
          <div className="flex items-start gap-3">
            <ToneIcon className="w-6 h-6 shrink-0 mt-0.5" aria-hidden />
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`badge ${tone.badgeClass}`}>{hi ? band.labelHi : band.label}</span>
                <span className="text-2xl font-semibold tabular-nums">{score}<span className="text-base opacity-60">/40</span></span>
              </div>
              <p className="mt-2 text-sm leading-relaxed">{hi ? band.guidanceHi : band.guidance}</p>
              <p className="mt-2 text-xs opacity-70">{hi ? config.cutoffNoteHi : config.cutoffNote}</p>
            </div>
          </div>
        </div>

        {/*
          Telling the patient whether a change is real is the single most useful
          thing this screen does. Without it a three-point swing reads as
          progress or relapse when it is neither.
        */}
        {delta !== null && config.mcid !== null && (
          <div className="clinical-card">
            <div className="flex items-start gap-3">
              <TrendingDown className="w-5 h-5 shrink-0 mt-0.5 text-slate-500" aria-hidden />
              <div className="text-sm leading-relaxed">
                <p className="font-medium">
                  {hi ? `पिछली बार आपका स्कोर ${previous.score} था।` : `Last time you scored ${previous.score}.`}
                </p>
                <p className="mt-1 opacity-80">
                  {Math.abs(delta) >= config.mcid
                    ? (hi
                      ? `यह ${Math.abs(delta)} अंक का बदलाव है, जो वास्तविक बदलाव माने जाने के लिए पर्याप्त बड़ा है।`
                      : `That is a ${Math.abs(delta)}-point change, which is large enough to count as a real change.`)
                    : (hi
                      ? `यह ${Math.abs(delta)} अंक का बदलाव है - इस प्रश्नावली के लिए यह इतना बड़ा नहीं कि इसे वास्तविक बदलाव माना जाए (${config.mcid} अंक चाहिए)।`
                      : `That is a ${Math.abs(delta)}-point change - not large enough to count as a real change on this questionnaire, which needs ${config.mcid} points.`)}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-2 no-print">
          <button type="button" onClick={handleSaveToLog} className="btn-primary" disabled={savedToLog}>
            {savedToLog
              ? (<><Check className="w-4 h-4" aria-hidden /> {hi ? 'लॉग में सहेजा गया' : 'Saved to log'}</>)
              : (<><Save className="w-4 h-4" aria-hidden /> {hi ? 'लक्षण लॉग में सहेजें' : 'Save to symptom log'}</>)}
          </button>
          <button type="button" onClick={() => window.print()} className="btn-outline">
            <Printer className="w-4 h-4" aria-hidden /> {hi ? 'प्रिंट करें' : 'Print'}
          </button>
          <button type="button" onClick={handleRetake} className="btn-secondary">
            <RotateCcw className="w-4 h-4" aria-hidden /> {hi ? 'दोबारा भरें' : 'Retake'}
          </button>
        </div>

        <p className="print-only text-xs mt-4">
          {config.title} - {config.attribution}. {new Date().toLocaleDateString()}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="clinical-card">
        <div className="flex items-start gap-3">
          <ClipboardCheck className="w-5 h-5 shrink-0 mt-0.5 text-slate-500" aria-hidden />
          <div>
            <h3 className="font-semibold">{hi ? config.titleHi : config.title}</h3>
            <p className="mt-1 text-sm opacity-80">{hi ? config.blurbHi : config.blurb}</p>
          </div>
        </div>
        <div className="mt-4">
          <div className="flex justify-between text-xs opacity-70 mb-1">
            <span>{hi ? 'प्रगति' : 'Progress'}</span>
            <span className="tabular-nums">{answered}/{config.items.length}</span>
          </div>
          <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-clinical-600 transition-all"
              style={{ width: `${(answered / config.items.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {config.items.map((item, index) => (
        <fieldset key={item.id} className="clinical-card">
          <legend className="text-sm font-medium mb-3">
            <span className="opacity-50 mr-2 tabular-nums">{index + 1}.</span>
            {hi ? item.textHi : item.text}
          </legend>
          <div className="flex flex-wrap gap-2">
            {config.options.map((option) => {
              const selected = answers[item.id] === option.score;
              return (
                <button
                  key={option.score}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setAnswers((a) => ({ ...a, [item.id]: option.score }))}
                  className={`px-3 py-2 rounded-lg text-sm border transition-colors ${
                    selected
                      ? 'bg-clinical-700 text-white border-clinical-700'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:border-clinical-400'
                  }`}
                >
                  {hi ? option.labelHi : option.label}
                </button>
              );
            })}
          </div>
        </fieldset>
      ))}

      <div className="flex items-center gap-3 no-print">
        <button type="button" onClick={handleSubmit} disabled={!complete} className="btn-primary disabled:opacity-40">
          {hi ? 'स्कोर देखें' : 'See my score'}
        </button>
        {!complete && (
          <span className="text-xs opacity-70">
            {hi
              ? `${config.items.length - answered} प्रश्न बाकी`
              : `${config.items.length - answered} question${config.items.length - answered === 1 ? '' : 's'} left`}
          </span>
        )}
      </div>

      <p className="text-xs opacity-60">{config.attribution}</p>
    </div>
  );
};
