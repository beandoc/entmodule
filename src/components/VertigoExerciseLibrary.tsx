'use client';

import React, { useState, useMemo } from 'react';
import {
  Search, Calendar, Clock, Check, Plus, Camera, Eye, UserCheck, Move, RotateCcw,
  Sparkles, Filter, X, ArrowRight, Activity, Bell, Info
} from 'lucide-react';
import { useAppData } from '@/lib/app-data-context';
import { EXERCISES, type VestibularExercise, type ExerciseCategory } from '@/lib/vestibular-rx';
import { IndianFemaleExerciseAvatar } from './IndianFemaleExerciseVisuals';

interface ScheduledExerciseItem {
  id: string;
  exerciseId: string;
  title: string;
  timeSlot: 'morning' | 'afternoon' | 'evening' | 'night';
  reps: number;
  durationMinutes: number;
  scheduledAt: string;
}

const CATEGORIES: Array<{ id: ExerciseCategory | 'all'; en: string; hi: string; icon: React.ElementType }> = [
  { id: 'all', en: 'All exercises', hi: 'सभी अभ्यास', icon: Activity },
  { id: 'head_neck', en: 'Head & Neck', hi: 'सिर व गर्दन', icon: RotateCcw },
  { id: 'eyes', en: 'Eye exercises', hi: 'नेत्र अभ्यास', icon: Eye },
  { id: 'sitting', en: 'Sitting drills', hi: 'बैठकर अभ्यास', icon: UserCheck },
  { id: 'standing', en: 'Standing balance', hi: 'खड़े संतुलन', icon: Move },
  { id: 'moving', en: 'Moving & Gait', hi: 'चाल व गमन', icon: Move },
  { id: 'positioning', en: 'Rolling & BPPV', hi: 'रोलिंग व पैंतरे', icon: RotateCcw },
];

export const VertigoExerciseLibrary: React.FC<{ onLaunchCoach?: (exId: string) => void }> = ({ onLaunchCoach }) => {
  const { locale } = useAppData();
  const hi = locale === 'hi';

  const [activeCategory, setActiveCategory] = useState<ExerciseCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEx, setSelectedEx] = useState<VestibularExercise | null>(null);
  
  // Scheduled state (stored in local state / care plan)
  const [scheduled, setScheduled] = useState<ScheduledExerciseItem[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const saved = localStorage.getItem('idhanwantari_scheduled_vertigo_ex');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Modal State
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [modalTimeSlot, setModalTimeSlot] = useState<'morning' | 'afternoon' | 'evening' | 'night'>('morning');
  const [modalReps, setModalReps] = useState(15);
  const [modalDuration, setModalDuration] = useState(2);
  const [scheduleSuccessMsg, setScheduleSuccessMsg] = useState<string | null>(null);

  // Filter exercises based on category and search query
  const filteredExercises = useMemo(() => {
    return EXERCISES.filter((ex) => {
      const matchesCat = activeCategory === 'all' || ex.category === activeCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        ex.titleEn.toLowerCase().includes(q) ||
        ex.titleHi.toLowerCase().includes(q) ||
        ex.code.toLowerCase().includes(q) ||
        ex.descEn.toLowerCase().includes(q);
      return matchesCat && matchesSearch;
    });
  }, [activeCategory, searchQuery]);

  // Check if an exercise is already scheduled
  const isScheduled = (exerciseId: string) => {
    return scheduled.some((item) => item.exerciseId === exerciseId);
  };

  // Open modal to schedule
  const handleOpenScheduleModal = (ex: VestibularExercise) => {
    setSelectedEx(ex);
    setModalReps(ex.targetReps || 15);
    setModalDuration(ex.recommendedDurationMinutes || 2);
    setScheduleModalOpen(true);
  };

  // Save schedule
  const handleConfirmSchedule = () => {
    if (!selectedEx) return;
    const newItem: ScheduledExerciseItem = {
      id: `${selectedEx.id}-${Date.now()}`,
      exerciseId: selectedEx.id,
      title: hi ? selectedEx.titleHi : selectedEx.titleEn,
      timeSlot: modalTimeSlot,
      reps: modalReps,
      durationMinutes: modalDuration,
      scheduledAt: new Date().toISOString(),
    };

    const updated = [...scheduled.filter((item) => item.exerciseId !== selectedEx.id), newItem];
    setScheduled(updated);
    try {
      localStorage.setItem('idhanwantari_scheduled_vertigo_ex', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }

    setScheduleModalOpen(false);
    setScheduleSuccessMsg(
      hi
        ? `"${selectedEx.titleHi}" आपकी दैनिक अभ्यास योजना में जोड़ा गया!`
        : `"${selectedEx.titleEn}" scheduled successfully to your daily care plan!`
    );
    setTimeout(() => setScheduleSuccessMsg(null), 4000);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-br from-slate-900 via-teal-950 to-navy-950 rounded-2xl p-6 md:p-8 text-white shadow-elevated border border-teal-500/20 relative overflow-hidden">
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 border border-teal-400/30 text-teal-200 text-xs font-semibold backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5 text-teal-300" />
            {hi ? 'भारतीय मॉडल आधारित चक्कर अभ्यास डायरेक्टरी' : 'Vertigo Management — Indian Subject Guide'}
          </div>
          <h2 className="font-display text-2xl md:text-3xl font-extrabold tracking-tight">
            {hi ? 'चक्कर व संतुलन अभ्यास' : 'Exercises for Vertigo Management'}
          </h2>
          <p className="text-slate-300 text-xs md:text-sm leading-relaxed">
            {hi
              ? 'वेस्टिबुलर ऑक्युलर रिफ्लेक्स (VOR), कैथॉर्न-कुक्सी एवं ब्रांड-डैरोफ अभ्यासों की सचित्र मार्गदर्शिका। अपने दैनिक पुनर्वास के लिए अभ्यास शेड्यूल करें।'
              : 'Illustrated Cawthorne-Cooksey, VOR gaze-stabilization & Brandt-Daroff repositioning drills featuring standard Indian subject avatar guidance. Schedule routines into your daily care plan.'}
          </p>
        </div>
      </div>

      {/* Success Notification Alert */}
      {scheduleSuccessMsg && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700/80 rounded-xl text-emerald-800 dark:text-emerald-200 text-sm font-semibold flex items-center justify-between shadow-sm transition-all animate-in fade-in">
          <div className="flex items-center gap-3">
            <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{scheduleSuccessMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setScheduleSuccessMsg(null)}
            className="text-emerald-600 hover:text-emerald-900 dark:hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Search & Category Filter Toolbar */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={hi ? 'अभ्यास खोजें (जैसे: सिर दाएं-बाएं, पैर मिलाकर...)' : 'Search vertigo exercises...'}
              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-ink-900 border border-slate-200 dark:border-ink-800 rounded-xl text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-sm"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold px-2">
            {filteredExercises.length} {hi ? 'अभ्यास उपलब्ध' : 'exercises listed'}
          </div>
        </div>

        {/* Categories Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none" role="tablist">
          {CATEGORIES.map(({ id, en, hi: catHi, icon: Icon }) => {
            const active = activeCategory === id;
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setActiveCategory(id)}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold shrink-0 transition-all ${
                  active
                    ? 'bg-teal-600 text-white shadow-md ring-2 ring-teal-600/30'
                    : 'bg-white dark:bg-ink-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-ink-800 hover:bg-slate-100 dark:hover:bg-ink-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {hi ? catHi : en}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Exercises List (Matches the User's Screenshot Card Layout) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredExercises.map((ex) => {
          const scheduledAlready = isScheduled(ex.id);
          return (
            <div
              key={ex.id}
              className="bg-white dark:bg-ink-900 rounded-2xl border border-slate-200/90 dark:border-ink-800 shadow-card hover:shadow-elevated transition-all overflow-hidden flex flex-col sm:flex-row group"
            >
              {/* Left Side: Indian Female Subject Visual Thumbnail */}
              <div className="w-full sm:w-44 h-48 sm:h-auto bg-slate-100 dark:bg-ink-950 shrink-0 relative flex items-center justify-center p-2 border-b sm:border-b-0 sm:border-r border-slate-100 dark:border-ink-800">
                <IndianFemaleExerciseAvatar exerciseId={ex.id} className="w-full h-full max-h-44 object-contain rounded-xl" />
                
                {ex.axis && (
                  <span className="absolute top-2 left-2 bg-teal-900/80 backdrop-blur-sm text-teal-200 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-teal-500/30 flex items-center gap-1">
                    <Camera className="w-3 h-3 text-teal-300" />
                    {hi ? 'AI कैमरा ट्रैक' : 'Camera Track'}
                  </span>
                )}
              </div>

              {/* Right Side: Exercise Information & Action */}
              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/60 px-2 py-0.5 rounded border border-teal-200/60 dark:border-teal-800/60">
                      {ex.code}
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                      {ex.recommendedDurationMinutes || 2} min • {ex.targetReps} reps
                    </span>
                  </div>

                  <h3 className="font-display text-lg font-extrabold text-slate-900 dark:text-white leading-snug group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                    {hi ? ex.titleHi : ex.titleEn}
                  </h3>

                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-2">
                    {hi ? ex.descHi : ex.descEn}
                  </p>
                </div>

                {/* Card Footer Actions */}
                <div className="pt-2 border-t border-slate-100 dark:border-ink-800 flex items-center justify-between gap-2 flex-wrap">
                  {/* Schedule Button (Faithfully matching user screenshot style) */}
                  <button
                    type="button"
                    onClick={() => handleOpenScheduleModal(ex)}
                    className={`px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
                      scheduledAlready
                        ? 'bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 border border-teal-300 dark:border-teal-700'
                        : 'bg-white dark:bg-ink-800 text-teal-600 dark:text-teal-400 border border-teal-500 hover:bg-teal-50 dark:hover:bg-teal-950/40 shadow-sm'
                    }`}
                  >
                    {scheduledAlready ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-teal-600" />
                        {hi ? 'शेड्यूल किया गया' : 'Scheduled'}
                      </>
                    ) : (
                      <>
                        <Calendar className="w-3.5 h-3.5" />
                        {hi ? 'यह अभ्यास शेड्यूल करें' : 'Schedule this exercise'}
                      </>
                    )}
                  </button>

                  {/* Launch AI Camera Coach if trackable */}
                  {ex.axis && onLaunchCoach && (
                    <button
                      type="button"
                      onClick={() => onLaunchCoach(ex.id)}
                      className="inline-flex items-center gap-1 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
                    >
                      <span>{hi ? 'कैमरा कोच' : 'Camera Coach'}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredExercises.length === 0 && (
        <div className="text-center p-12 bg-white dark:bg-ink-900 rounded-2xl border border-slate-200 dark:border-ink-800 space-y-3">
          <Info className="w-10 h-10 text-slate-400 mx-auto" />
          <h4 className="font-bold text-slate-800 dark:text-slate-200">
            {hi ? 'कोई अभ्यास नहीं मिला' : 'No exercises found'}
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {hi ? 'कृपया अपनी खोज शब्द बदलें या श्रेणी फिल्टर बदलें।' : 'Try adjusting your search terms or category filters.'}
          </p>
        </div>
      )}

      {/* Schedule Exercise Interactive Modal */}
      {scheduleModalOpen && selectedEx && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-ink-900 rounded-2xl border border-slate-200 dark:border-ink-800 shadow-2xl max-w-md w-full p-6 space-y-6">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wider">
                  {hi ? 'दैनिक अभ्यास निर्धारण' : 'Schedule Routine'}
                </span>
                <h3 className="font-display text-xl font-extrabold text-slate-900 dark:text-white mt-1">
                  {hi ? selectedEx.titleHi : selectedEx.titleEn}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setScheduleModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-ink-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Indian Female Visual Avatar in Modal */}
            <div className="h-40 bg-slate-50 dark:bg-ink-950 rounded-xl p-2 border border-slate-100 dark:border-ink-800 flex items-center justify-center">
              <IndianFemaleExerciseAvatar exerciseId={selectedEx.id} className="w-full h-full object-contain" />
            </div>

            {/* Time Slot Picker */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                {hi ? 'दिन का समय चुनें' : 'Select Time of Day'}
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'morning', labelEn: 'Morning (सुबह)', icon: '🌅' },
                  { id: 'afternoon', labelEn: 'Afternoon (दोपहर)', icon: '☀️' },
                  { id: 'evening', labelEn: 'Evening (शाम)', icon: '🌆' },
                  { id: 'night', labelEn: 'Night (रात)', icon: '🌙' },
                ].map((slot) => (
                  <button
                    key={slot.id}
                    type="button"
                    onClick={() => setModalTimeSlot(slot.id as any)}
                    className={`p-2.5 rounded-xl text-xs font-bold border flex items-center gap-2 transition-all ${
                      modalTimeSlot === slot.id
                        ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
                        : 'bg-white dark:bg-ink-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-ink-800 hover:border-teal-400'
                    }`}
                  >
                    <span>{slot.icon}</span>
                    <span>{slot.labelEn}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Repetitions & Duration */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  {hi ? 'पुनरावृत्ति (Reps)' : 'Target Reps'}
                </label>
                <input
                  type="number"
                  min={5}
                  max={50}
                  value={modalReps}
                  onChange={(e) => setModalReps(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white dark:bg-ink-950 border border-slate-200 dark:border-ink-800 rounded-xl text-sm font-bold text-slate-800 dark:text-white"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  {hi ? 'अवधि (मिनट)' : 'Duration (mins)'}
                </label>
                <input
                  type="number"
                  min={1}
                  max={15}
                  value={modalDuration}
                  onChange={(e) => setModalDuration(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white dark:bg-ink-950 border border-slate-200 dark:border-ink-800 rounded-xl text-sm font-bold text-slate-800 dark:text-white"
                />
              </div>
            </div>

            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed bg-slate-50 dark:bg-ink-950 p-3 rounded-xl border border-slate-100 dark:border-ink-800">
              💡 {hi ? 'सलाह: चिकित्सक के निर्देशानुसार दिन में 3-5 बार 1-2 मिनट प्रत्येक अभ्यास करें।' : 'Clinical Note: Build up gradually 1-2 minutes per exercise 3-5 times a day as advised.'}
            </p>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setScheduleModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-ink-800"
              >
                {hi ? 'रद्द करें' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleConfirmSchedule}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white shadow-md transition-all flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                {hi ? 'योजना में जोड़ें' : 'Save to Schedule'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
