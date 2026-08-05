'use client';

import React, { useEffect, useState } from 'react';
import { PenTool, CheckCircle2, Check, Sparkles } from 'lucide-react';
import { useAppData } from '@/lib/app-data-context';

interface SkillsLibraryProps {
  skillsGuides: any[];
}

const COMPLETED_KEY = 'id-completed-skills';

export const SkillsLibrary: React.FC<SkillsLibraryProps> = ({ skillsGuides }) => {
  const { locale } = useAppData();
  const hi = locale === 'hi';
  const [completedIds, setCompletedIds] = useState<string[]>([]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(COMPLETED_KEY);
      if (raw) setCompletedIds(JSON.parse(raw));
    } catch {
      // ignore local storage error
    }
  }, []);

  const toggleComplete = (id: string) => {
    const next = completedIds.includes(id)
      ? completedIds.filter((item) => item !== id)
      : [...completedIds, id];
    setCompletedIds(next);
    window.localStorage.setItem(COMPLETED_KEY, JSON.stringify(next));
  };

  const completedCount = skillsGuides.filter((s) => completedIds.includes(s.id)).length;

  return (
    <div className="space-y-6 pb-10">
      <div className="bg-white dark:bg-ink-900 p-6 rounded-3xl border border-slate-200 dark:border-ink-800 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-ink-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-clinical-50 dark:bg-ink-800 text-clinical-600 dark:text-clinical-400 flex items-center justify-center">
              <PenTool className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                {hi ? 'व्यावहारिक ईएनटी कौशल और गाइड' : 'Practical ENT Skills & How-To Guides'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {hi
                  ? 'सही तरीका बनाम गलत तरीका दृश्य निर्देशों के साथ एकल-कार्य कौशल गाइड।'
                  : 'Procedural skill guides with side-by-side visual instructions. Mark guides as completed to track recovery.'}
              </p>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1.5">
            <div className="flex items-center gap-2 bg-slate-100 dark:bg-ink-800 px-3.5 py-1.5 rounded-full border border-slate-200 dark:border-ink-700">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span className="text-xs font-bold font-mono text-slate-800 dark:text-slate-200">
                {completedCount} / {skillsGuides.length} {hi ? 'पूर्ण' : 'Guides Completed'}
              </span>
            </div>
            {skillsGuides.length > 0 && (
              <div className="w-36 h-2 bg-slate-200 dark:bg-ink-800 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${(completedCount / skillsGuides.length) * 100}%` }}
                />
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {skillsGuides.map((skill) => {
            const isDone = completedIds.includes(skill.id);
            return (
              <div
                key={skill.id}
                className={`bg-slate-50/70 dark:bg-ink-950/60 border rounded-2xl p-5 space-y-4 shadow-sm transition-all ${
                  isDone
                    ? 'border-emerald-400 dark:border-emerald-800 ring-1 ring-emerald-400/20'
                    : 'border-slate-200 dark:border-ink-800'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                    <CheckCircle2 className={`w-5 h-5 ${isDone ? 'text-emerald-500' : 'text-slate-400'}`} />
                    {skill.title}
                  </h3>

                  <button
                    onClick={() => toggleComplete(skill.id)}
                    className={`inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-xl transition-all shrink-0 ${
                      isDone
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-white dark:bg-ink-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-ink-700 hover:border-emerald-400'
                    }`}
                  >
                    <Check className="w-3.5 h-3.5" />
                    {isDone ? (hi ? 'पूर्ण ✓' : 'Completed ✓') : (hi ? 'पूर्ण चिह्नित करें' : 'Mark Complete')}
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-3 text-xs">
                  <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-950 dark:text-emerald-200 p-3.5 rounded-xl space-y-1">
                    <strong className="text-emerald-800 dark:text-emerald-300 font-bold block flex items-center gap-1">
                      <span>✓ RIGHT WAY</span> <span className="text-[11px] font-normal">(सही तरीका):</span>
                    </strong>
                    <p className="leading-relaxed">{skill.rightWay}</p>
                  </div>

                  <div className="bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-800 text-red-950 dark:text-red-200 p-3.5 rounded-xl space-y-1">
                    <strong className="text-red-800 dark:text-red-300 font-bold block flex items-center gap-1">
                      <span>✕ WRONG WAY</span> <span className="text-[11px] font-normal">(आम गलती):</span>
                    </strong>
                    <p className="leading-relaxed">{skill.wrongWay}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
