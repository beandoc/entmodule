'use client';

import React, { useEffect, useState } from 'react';
import { Activity, Trash2, Save, NotebookPen, Download, Tag, Calendar, Plus, CheckCircle2, Flame } from 'lucide-react';
import { useAppData } from '@/lib/app-data-context';

interface LogEntry {
  id: string;
  date: string;
  pain: number;
  hearing: number;
  dizziness: number;
  notes: string;
  createdAt: string;
}

const STORAGE_KEY = 'id-symptom-log';

const QUICK_TAGS = [
  { en: 'Mild Discharge', hi: 'हल्का स्राव' },
  { en: 'Ear Pressure', hi: 'कान का दबाव' },
  { en: 'Tinnitus (Ringing)', hi: 'टीनाइटस (बजना)' },
  { en: 'Dizziness on Rising', hi: 'उठने पर चक्कर' },
  { en: 'Congestion', hi: 'नाक का जमाव' },
];

function severityTone(value: number): 'ok' | 'watch' | 'high' {
  if (value <= 3) return 'ok';
  if (value <= 6) return 'watch';
  return 'high';
}

const TONE_BAR: Record<'ok' | 'watch' | 'high', string> = {
  ok: 'bg-blue-500',
  watch: 'bg-amber-500',
  high: 'bg-red-500',
};

const SliderField: React.FC<{
  label: string;
  value: number;
  onChange: (v: number) => void;
  hint: string;
}> = ({ label, value, onChange, hint }) => {
  const tone = severityTone(value);
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-bold text-slate-800 dark:text-slate-200">{label}</label>
        <span
          className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded-full ${
            tone === 'ok'
              ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/35 dark:text-blue-300 border border-blue-200 dark:border-blue-900/60'
              : tone === 'watch'
              ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-900'
              : 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 border border-red-200 dark:border-red-900'
          }`}
        >
          {value}/10
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={10}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-blue-600 cursor-pointer h-2 bg-slate-200 dark:bg-ink-800 rounded-lg"
      />
      <p className="text-[11px] text-slate-400">{hint}</p>
    </div>
  );
};

export const SymptomLog: React.FC = () => {
  const { locale } = useAppData();
  const hi = locale === 'hi';

  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [pain, setPain] = useState(2);
  const [hearing, setHearing] = useState(2);
  const [dizziness, setDizziness] = useState(1);
  const [notes, setNotes] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setEntries(JSON.parse(raw));
    } catch {
      // ignore local storage parse errors
    }
  }, []);

  const persist = (next: LogEntry[]) => {
    setEntries(next);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const handleSave = () => {
    const entry: LogEntry = {
      id: crypto.randomUUID(),
      date,
      pain,
      hearing,
      dizziness,
      notes: notes.trim(),
      createdAt: new Date().toISOString(),
    };
    const next = [entry, ...entries.filter((e) => e.date !== date)].sort((a, b) => (a.date < b.date ? 1 : -1));
    persist(next);
    setNotes('');
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleDelete = (id: string) => {
    persist(entries.filter((e) => e.id !== id));
  };

  const addTagToNotes = (tagText: string) => {
    setNotes((prev) => (prev ? `${prev}, ${tagText}` : tagText));
  };

  const exportCSV = () => {
    if (entries.length === 0) return;
    const header = 'Date,Pain (0-10),Hearing Muffling (0-10),Dizziness (0-10),Notes\n';
    const rows = entries.map((e) => `"${e.date}",${e.pain},${e.hearing},${e.dizziness},"${e.notes.replace(/"/g, '""')}"`).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ENT-Symptom-Log-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const calculateStreak = (list: LogEntry[]): number => {
    if (list.length === 0) return 0;
    const dates = Array.from(new Set(list.map((e) => e.date))).sort().reverse();
    let streak = 1;
    for (let i = 0; i < dates.length - 1; i++) {
      const d1 = new Date(dates[i]);
      const d2 = new Date(dates[i + 1]);
      const diff = Math.floor((d1.getTime() - d2.getTime()) / (1000 * 60 * 60 * 24));
      if (diff === 1) streak++;
      else break;
    }
    return streak;
  };

  const streakDays = calculateStreak(entries);

  return (
    <div className="space-y-6 pb-10 page-enter">
      {/* Page Title Block — Gunjan Pattern */}
      <div className="page-title-block">
        <div className="page-title-icon">
          <Activity className="w-6 h-6" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display font-bold text-xl text-slate-900 dark:text-white">
              {hi ? 'दैनिक लक्षण ट्रैकर' : 'Daily ENT Symptom Tracker'}
            </h1>
            {streakDays > 0 ? (
              <span className="badge badge-amber">
                <Flame className="w-3 h-3" /> {streakDays}-{hi ? 'दिन स्ट्रिक' : 'Day Streak'}
              </span>
            ) : (
              <span className="badge badge-navy">
                <CheckCircle2 className="w-3 h-3" /> {hi ? 'अनुशंसित: 3+ दिन/सप्ताह' : 'Rec: 3+ Check-ins / Wk'}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {hi
              ? 'अपनी रिकवरी प्रवृत्तियों को ट्रैक करें — नियमित रूप से दर्ज करने से डॉक्टर को सटीक प्रगति मिलती है।'
              : 'Monitor daily pain, hearing & vertigo levels. Consistent tracking provides accurate post-op recovery data for your surgeon.'}
          </p>
        </div>
        {entries.length > 0 && (
          <button onClick={exportCSV} className="btn-outline shrink-0">
            <Download className="w-4 h-4 text-[#1b3662]" />
            {hi ? 'CSV निर्यात करें' : 'Export CSV'}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Input Form */}
        <div className="lg:col-span-2 clinical-card p-4 sm:p-6 space-y-5 h-fit">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 dark:border-ink-800 pb-3">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-blue-600" />
              {hi ? 'तारीख' : 'Entry Date'}
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="bg-slate-50 dark:bg-ink-800 border border-slate-200 dark:border-ink-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <SliderField
            label={hi ? 'दर्द का स्तर (Pain)' : 'Pain Severity'}
            value={pain}
            onChange={setPain}
            hint={hi ? '0 = कोई दर्द नहीं, 10 = तीव्र दर्द' : '0 = no pain, 10 = unbearable pain'}
          />

          <SliderField
            label={hi ? 'सुनने में कठिनाई (Hearing Muffling)' : 'Hearing Loss / Muffling'}
            value={hearing}
            onChange={setHearing}
            hint={hi ? '0 = सामान्य, 10 = बहुत धीमा' : '0 = clear hearing, 10 = severe muffling'}
          />

          <SliderField
            label={hi ? 'चक्कर / अस्थिरता (Dizziness)' : 'Dizziness & Unsteadiness'}
            value={dizziness}
            onChange={setDizziness}
            hint={hi ? '0 = कोई नहीं, 10 = गंभीर चक्कर' : '0 = none, 10 = severe vertigo'}
          />

          {/* Quick Tag Chips */}
          <div className="space-y-2 pt-1">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <Tag className="w-3 h-3 text-blue-600" />
              {hi ? 'त्वरित लक्षण टैग:' : 'Quick Tag Chips:'}
            </label>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_TAGS.map((t) => (
                <button
                  key={t.en}
                  type="button"
                  onClick={() => addTagToNotes(hi ? t.hi : t.en)}
                  className="text-[11px] font-semibold bg-slate-100 dark:bg-ink-800 hover:bg-blue-50 dark:hover:bg-blue-950/35 text-slate-700 dark:text-slate-300 hover:text-blue-700 px-2 py-1.5 rounded-lg border border-slate-200 dark:border-ink-700 transition-colors flex items-center gap-1"
                >
                  <Plus className="w-2.5 h-2.5 text-blue-500" />
                  {hi ? t.hi : t.en}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
              {hi ? 'अतिरिक्त टिप्पणियाँ (Notes)' : 'Clinical Notes (Optional)'}
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder={hi ? 'आज की रिकवरी संबंधी बातें…' : 'Mention discharge, fever, or meds taken today…'}
              className="w-full bg-slate-50 dark:bg-ink-800 border border-slate-200 dark:border-ink-700 rounded-xl p-3 text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            onClick={handleSave}
            className="btn-primary w-full text-sm py-3"
          >
            {saved ? (
              hi ? 'प्रविष्टि सहेजी गई' : 'Entry Saved'
            ) : (
              <>
                <Save className="w-4 h-4" /> {hi ? 'आज की प्रविष्टि सहेजें' : 'Save Daily Entry'}
              </>
            )}
          </button>
        </div>

        {/* Entry History & Visual Trends */}
        <div className="lg:col-span-3 space-y-4">
          <h3 className="font-display font-bold text-base text-slate-800 dark:text-slate-200">
            {hi ? 'हालिया रिकवरी लॉग इतिहास' : 'Recent Log History & Trends'}
          </h3>

          {entries.length === 0 ? (
            <div className="clinical-card border-dashed border-slate-300 dark:border-ink-700 p-8 sm:p-12 text-center shadow-sm">
              <NotebookPen className="w-10 h-10 text-blue-500/40 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                {hi ? 'अभी तक कोई लक्षण प्रविष्टि नहीं।' : 'No logged entries yet.'}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {hi ? 'अपनी पहली दैनिक प्रविष्टि दर्ज करने के लिए बाईं ओर फॉर्म का उपयोग करें।' : 'Use the form on the left to add your first daily check.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {entries.map((entry) => (
                <div
                  key={entry.id}
                  className="clinical-card p-4 hover:border-blue-300 dark:hover:border-blue-800 transition-all flex flex-col sm:flex-row sm:items-center gap-4"
                >
                  <div className="w-24 shrink-0">
                    <span className="text-xs font-bold text-slate-900 dark:text-white block">
                      {new Date(entry.date + 'T00:00:00').toLocaleDateString(hi ? 'hi-IN' : 'en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">Logged</span>
                  </div>

                  <div className="flex-1 min-w-[200px] grid grid-cols-3 gap-3">
                    {[
                      { label: hi ? 'दर्द' : 'Pain', v: entry.pain },
                      { label: hi ? 'सुनना' : 'Hearing', v: entry.hearing },
                      { label: hi ? 'चक्कर' : 'Dizziness', v: entry.dizziness },
                    ].map((m) => (
                      <div key={m.label}>
                        <div className="flex items-center justify-between text-[10.5px] font-bold">
                          <span className="text-slate-400">{m.label}</span>
                          <span className="text-slate-700 dark:text-slate-300 font-mono">{m.v}/10</span>
                        </div>
                        <div className="h-1.5 bg-slate-100 dark:bg-ink-800 rounded-full mt-1 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${TONE_BAR[severityTone(m.v)]}`}
                            style={{ width: `${(m.v / 10) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  {entry.notes && (
                    <p className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-ink-950 px-3 py-1.5 rounded-xl border border-slate-100 dark:border-ink-800 italic max-w-full sm:max-w-xs truncate">
                      "{entry.notes}"
                    </p>
                  )}

                  <button
                    onClick={() => handleDelete(entry.id)}
                    className="ml-auto text-slate-300 dark:text-slate-600 hover:text-red-500 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-ink-800 transition-colors"
                    aria-label="Delete entry"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
