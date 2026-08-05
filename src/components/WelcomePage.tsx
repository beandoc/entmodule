'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowRight, ShieldAlert, BookOpenText, Headphones, Play, Pause, Activity,
  CheckCircle2, LifeBuoy, ShieldCheck, Clock, ChevronRight, Stethoscope,
  Calendar, Plus, Search, ClipboardList, HeartPulse, AlertTriangle,
  Ear, Volume2, NotebookPen
} from 'lucide-react';
import { useAppData } from '@/lib/app-data-context';
import { navGroups } from '@/lib/nav-registry';

function recoveryDay(anchorSurgeryDate?: string | null): number {
  if (!anchorSurgeryDate) return 4;
  const start = new Date(anchorSurgeryDate);
  if (Number.isNaN(start.getTime())) return 4;
  const diffMs = Date.now() - start.getTime();
  return Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1);
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return '🌅 Good Morning';
  if (h < 17) return '☀️ Good Afternoon';
  return '🌙 Good Evening';
}

export const WelcomePage: React.FC = () => {
  const { locale, orders, catalogueData } = useAppData();
  const primaryOrder = orders[0];
  const day = recoveryDay(primaryOrder?.anchorSurgeryDate);
  const activeAlerts = catalogueData.harmAlerts.length;
  const hi = locale === 'hi';
  const [playingPodcast, setPlayingPodcast] = useState(false);
  const [activeTab, setActiveTab] = useState<'today' | 'upcoming' | 'completed'>('today');

  const toggleInlineAudio = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const synth = window.speechSynthesis;
    if (playingPodcast) {
      synth.cancel();
      setPlayingPodcast(false);
    } else {
      synth.cancel();
      const text = hi
        ? 'Laryngectomy ke baad pehle teesh dinon mein, aapka stoma neck se khulta hai.'
        : 'In the first thirty days after a laryngectomy, your airway now opens through the stoma in your neck.';
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = hi ? 'hi-IN' : 'en-US';
      utter.onend = () => setPlayingPodcast(false);
      utter.onerror = () => setPlayingPodcast(false);
      synth.speak(utter);
      setPlayingPodcast(true);
    }
  };

  const todayDate = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  const recoveryPct = Math.min(Math.round((day / 28) * 100), 100);

  // Today's care steps (from primaryOrder or fallback)
  const todayCareSteps = [
    {
      id: 'step-1',
      time: '08:00 AM',
      title: hi ? 'कान की ड्रेसिंग जाँच करें' : 'Inspect ear dressing for discharge or odour',
      type: 'care',
      done: true,
    },
    {
      id: 'step-2',
      time: '10:00 AM',
      title: hi ? 'दैनिक लक्षण दर्ज करें' : 'Log today\'s pain, hearing & dizziness levels',
      type: 'symptom',
      done: false,
    },
    {
      id: 'step-3',
      time: '02:00 PM',
      title: hi ? 'एंटीबायोटिक कान की बूंदें (Ciprofloxacin)' : 'Antibiotic ear drops — Ciprofloxacin 3 drops',
      type: 'medication',
      done: false,
    },
    {
      id: 'step-4',
      time: '08:00 PM',
      title: hi ? 'पोस्ट-ऑप गाइड पढ़ें: टिम्पैनोप्लास्टी' : 'Read post-op guide: Tympanoplasty recovery week 1',
      type: 'education',
      done: false,
    },
  ];

  const typeIcon: Record<string, React.ReactNode> = {
    care: <Stethoscope className="w-4 h-4 text-blue-700" />,
    symptom: <Activity className="w-4 h-4 text-amber-600" />,
    medication: <HeartPulse className="w-4 h-4 text-emerald-600" />,
    education: <BookOpenText className="w-4 h-4 text-purple-600" />,
  };
  const typeBadge: Record<string, string> = {
    care: 'badge badge-navy',
    symptom: 'badge badge-amber',
    medication: 'badge badge-green',
    education: 'badge badge-purple',
  };
  const typeLabel: Record<string, string> = {
    care: hi ? 'देखभाल' : 'Care',
    symptom: hi ? 'लक्षण' : 'Symptom',
    medication: hi ? 'दवाई' : 'Medication',
    education: hi ? 'शिक्षा' : 'Education',
  };

  return (
    <div className="space-y-6 pb-10 page-enter">

      {/* ─── HERO CARD ────────────────────────────────────────── */}
      <section className="card overflow-hidden card-animated">
        {/* Navy breadcrumb-style header bar */}
        <div className="card-navy-header">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
            <span>{hi ? 'मुख्य पृष्ठ' : 'HOME'}</span>
          </div>
          <span>{todayDate}</span>
        </div>

        {/* Split layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-100 dark:divide-slate-800">
          {/* Left — Patient Greeting */}
          <div className="lg:col-span-6 p-6 sm:p-8 bg-gradient-to-br from-blue-50 via-sky-50/50 to-white dark:from-slate-900 dark:to-blue-950/30 flex flex-col gap-4">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-900 dark:text-blue-200 bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-700 px-3 py-1 rounded-full shadow-sm w-fit">
              {getGreeting()}
            </span>

            <div>
              <h1 className="font-display font-black text-3xl sm:text-4xl leading-tight text-slate-900 dark:text-white tracking-tight">
                {hi ? 'नमस्ते,' : 'Welcome,'}
              </h1>
              <h1 className="font-display font-black text-3xl sm:text-4xl leading-tight text-[#1b3662] dark:text-sky-300 tracking-tight">
                {primaryOrder?.patient?.name ?? 'Sachin Srivastava'}
              </h1>
            </div>

            <div className="space-y-1 text-sm text-slate-700 dark:text-slate-300">
              <p className="font-semibold">
                {hi ? 'सक्रिय रिकवरी पथ:' : 'Active Recovery Pathway:'}
              </p>
              <p className="text-slate-600 dark:text-slate-400 text-xs">
                {primaryOrder?.pathwayTemplate?.title ?? (hi ? 'टिम्पैनोप्लास्टी पोस्ट-ऑप रिकवरी' : 'Tympanoplasty Post-Op Recovery')}
              </p>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-300">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  {hi ? `रिकवरी दिन ${day} / 28` : `Recovery Day ${day} of 28`}
                </span>
                <span className="font-mono text-slate-500">{recoveryPct}%</span>
              </div>
              <div className="w-full h-2.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-300 dark:border-slate-700">
                <div
                  className="h-full bg-[#1b3662] dark:bg-sky-400 rounded-full transition-all duration-700"
                  style={{ width: `${recoveryPct}%` }}
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2.5 pt-1">
              <Link href="/care-plan" className="btn-navy text-sm">
                {hi ? 'केयर प्लान खोलें' : 'Open Care Plan'}
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/symptom-log" className="btn-outline text-sm">
                <Activity className="w-4 h-4" />
                {hi ? 'लक्षण दर्ज करें' : 'Log Symptoms'}
              </Link>
            </div>
          </div>

          {/* Right — Key Clinical Stats */}
          <div className="lg:col-span-6 p-6 sm:p-8 space-y-4 bg-white dark:bg-slate-900">
            <p className="kicker">{hi ? 'आज की नैदानिक स्थिति' : "Today's Clinical Status"}</p>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <p className="kicker mb-1"><Clock className="w-3 h-3 inline mr-1" />{hi ? 'रिकवरी दिन' : 'Recovery Day'}</p>
                <p className="font-display font-black text-2xl text-[#1b3662] dark:text-sky-300">{day}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">{hi ? 'चरण 2: ऊतक उपचार' : 'Phase 2: Tissue Healing'}</p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <p className="kicker mb-1">
                  {activeAlerts > 0 ? <AlertTriangle className="w-3 h-3 inline mr-1 text-amber-500" /> : <ShieldCheck className="w-3 h-3 inline mr-1 text-emerald-500" />}
                  {hi ? 'लक्षण जोखिम' : 'Symptom Risk'}
                </p>
                <p className={`font-display font-black text-2xl ${activeAlerts > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                  {activeAlerts > 0 ? (hi ? 'मध्यम' : 'Moderate') : (hi ? 'कम' : 'Low')}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">{hi ? 'दर्द 2/10' : 'Pain 2/10 · Healing Well'}</p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <p className="kicker mb-1"><NotebookPen className="w-3 h-3 inline mr-1" />{hi ? 'आज के कार्य' : "Today's Tasks"}</p>
                <p className="font-display font-black text-2xl text-slate-900 dark:text-white">
                  {todayCareSteps.filter(s => s.done).length}/{todayCareSteps.length}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">{hi ? 'पूर्ण' : 'Completed'}</p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <p className="kicker mb-1"><BookOpenText className="w-3 h-3 inline mr-1" />{hi ? 'शिक्षा मॉड्यूल' : 'Education Modules'}</p>
                <p className="font-display font-black text-2xl text-slate-900 dark:text-white">18</p>
                <p className="text-[11px] text-slate-500 mt-0.5">{hi ? '8 गाइड · 5 ऑडियो' : '8 Guides · 5 Audio'}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── TODAY'S CARE STEPS TABLE ─────────────────────────── */}
      <section className="card overflow-hidden card-animated">
        {/* Navy header */}
        <div className="card-navy-header">
          <span>{hi ? 'आज के देखभाल चरण' : "TODAY'S CARE STEPS"}</span>
          <Link href="/care-plan" className="text-sky-300 hover:text-white text-xs font-semibold transition-colors">
            {hi ? 'सभी देखें →' : 'View Full Plan →'}
          </Link>
        </div>

        {/* Tab row */}
        <div className="px-6 pt-4 border-b border-slate-100 dark:border-slate-800">
          <div className="tab-nav">
            {(['today', 'upcoming', 'completed'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
              >
                {tab === 'today'
                  ? (hi ? 'आज' : 'Today')
                  : tab === 'upcoming'
                  ? (hi ? 'आगामी' : 'Upcoming')
                  : (hi ? 'पूर्ण' : 'Completed')}
                {tab === 'today' && (
                  <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-[#1b3662] text-white ml-1">
                    {todayCareSteps.filter(s => !s.done).length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="table-navy-head">
                <th className="px-5 py-3.5">#</th>
                <th className="px-5 py-3.5">{hi ? 'समय' : 'Time'}</th>
                <th className="px-5 py-3.5">{hi ? 'देखभाल चरण' : 'Care Step'}</th>
                <th className="px-5 py-3.5">{hi ? 'प्रकार' : 'Type'}</th>
                <th className="px-5 py-3.5">{hi ? 'स्थिति' : 'Status'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {todayCareSteps.map((step, i) => (
                <tr key={step.id} className="table-row-hover transition-colors text-slate-700 dark:text-slate-300">
                  <td className="px-5 py-4 font-mono font-bold text-slate-400">{i + 1}</td>
                  <td className="px-5 py-4 font-mono font-semibold text-slate-600 dark:text-slate-400 whitespace-nowrap">{step.time}</td>
                  <td className="px-5 py-4 font-medium text-slate-900 dark:text-white">
                    <div className="flex items-center gap-2">
                      <span className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800">{typeIcon[step.type]}</span>
                      {step.title}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span className={typeBadge[step.type]}>{typeLabel[step.type]}</span>
                  </td>
                  <td className="px-5 py-4">
                    {step.done ? (
                      <span className="badge badge-green"><CheckCircle2 className="w-3 h-3" /> {hi ? 'पूर्ण' : 'Done'}</span>
                    ) : (
                      <span className="badge badge-amber"><Clock className="w-3 h-3" /> {hi ? 'शेष' : 'Pending'}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ─── EMERGENCY ALERT BANNER ───────────────────────────── */}
      {activeAlerts > 0 && (
        <section className="rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 p-5">
          <div className="flex flex-wrap items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-red-600/10 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-[200px]">
              <h3 className="font-bold text-sm text-red-900 dark:text-red-200">
                {hi ? 'चेतावनी: लाल-ध्वज लक्षण ध्यान देने योग्य' : 'Attention: Red-flag symptoms require review'}
              </h3>
              <p className="text-xs text-red-800 dark:text-red-300 mt-0.5">
                {hi ? 'अचानक चक्कर, तेज रक्तस्राव, या तेज दर्द के लिए तुरंत संपर्क करें।' : 'Contact your ENT nurse immediately if sudden vertigo, heavy bleeding, or severe pain.'}
              </p>
            </div>
            <Link href="/emergency" className="btn-navy text-xs bg-red-700 hover:bg-red-800">
              <ShieldAlert className="w-3.5 h-3.5" />
              {hi ? 'इमरजेंसी कार्ड' : 'Emergency Card'}
            </Link>
          </div>
        </section>
      )}

      {/* ─── FEATURED AUDIO EPISODE ───────────────────────────── */}
      <section className="rounded-2xl bg-[#1b3662] text-white p-5 sm:p-7 border border-blue-900 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 card-animated">
        <div className="flex items-center gap-4 flex-1">
          <button
            onClick={toggleInlineAudio}
            className="w-12 h-12 rounded-2xl bg-blue-900/80 hover:bg-blue-800 border border-blue-700 flex items-center justify-center transition-all shrink-0"
            aria-label="Play audio"
          >
            {playingPodcast ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
          </button>
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-sky-300 bg-blue-950 px-2.5 py-0.5 rounded-full border border-blue-800">
              🎧 {hi ? 'विशेष ईएनटी ऑडियो · 12 मिनट' : 'Featured ENT Audio · 12 mins'}
            </span>
            <h3 className="font-bold text-sm sm:text-base text-white mt-1.5">
              {hi ? 'टिम्पैनोप्लास्टी के बाद: पहले 7 दिन क्या अपेक्षित करें' : 'After Tympanoplasty: What to Expect in the First 7 Days'}
            </h3>
            <p className="text-xs text-slate-300 mt-1 max-w-xl">
              {hi
                ? 'कान की पैकिंग, सुनाई देने में बदलाव, ड्रेसिंग देखभाल और कब डॉक्टर को बुलाएं।'
                : 'Ear packing, hearing changes, dressing care, and when to call your surgeon.'}
            </p>
          </div>
        </div>
        <Link href="/podcasts" className="btn-outline border-blue-700 text-slate-200 hover:text-white hover:border-white shrink-0 text-xs">
          <Headphones className="w-4 h-4 text-sky-300" />
          {hi ? 'सभी ऑडियो गाइड' : 'All Audio Guides'}
        </Link>
      </section>

      {/* ─── CLINICAL MODULES ─────────────────────────────────── */}
      <div className="space-y-6 pt-2">

        {/* Section Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display font-bold text-xl text-slate-900 dark:text-white">
              {hi ? 'चिकित्सा शिक्षा मॉड्यूल' : 'Clinical Education Modules'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {hi
                ? 'अपनी ईएनटी देखभाल, सर्जरी और रिकवरी के लिए विस्तृत इंटरएक्टिव मॉड्यूल।'
                : 'Interactive guides for your ENT care, surgery, and home recovery.'}
            </p>
          </div>
          <Link href="/guides" className="btn-outline text-xs hidden sm:inline-flex">
            <BookOpenText className="w-3.5 h-3.5" />
            {hi ? 'सभी गाइड' : 'All Guides'}
          </Link>
        </div>

        {/* ── MY CARE (featured — 2-col large cards) ── */}
        <div>
          <h3 className="kicker flex items-center gap-2 mb-3">
            <span className="w-1.5 h-5 rounded-full bg-[#1b3662] inline-block" />
            {hi ? 'मेरी देखभाल' : 'My Care'}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {navGroups.find(g => g.id === 'my-care')?.items.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group card card-animated p-5 flex items-start gap-4 hover:border-[#1b3662] dark:hover:border-sky-500"
                >
                  <span className="w-12 h-12 rounded-2xl bg-[#1b3662]/8 text-[#1b3662] dark:bg-blue-950 dark:text-sky-300 border border-blue-100 dark:border-blue-900 flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-[#1b3662] dark:group-hover:text-sky-300 transition-colors">
                      {hi ? item.labelHi : item.label}
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                      {hi ? item.descriptionHi : item.description}
                    </p>
                    <span className="inline-flex items-center gap-1 mt-2.5 text-[11px] font-bold text-[#1b3662] dark:text-sky-400">
                      {hi ? 'खोलें' : 'Open'} <ChevronRight className="w-3 h-3" />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* ── LEARN (3-col horizontal list-style cards) ── */}
        <div>
          <h3 className="kicker flex items-center gap-2 mb-3">
            <span className="w-1.5 h-5 rounded-full bg-sky-500 inline-block" />
            {hi ? 'सीखें' : 'Learn'}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {navGroups.find(g => g.id === 'learn')?.items.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group card card-animated p-4 flex flex-col gap-3 hover:border-sky-400 dark:hover:border-sky-500"
                >
                  <div className="flex items-center justify-between">
                    <span className="w-9 h-9 rounded-xl bg-sky-50 dark:bg-slate-800 text-sky-700 dark:text-sky-300 border border-sky-100 dark:border-slate-700 flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4" />
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-sky-500 transition-colors" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-slate-900 dark:text-white group-hover:text-sky-700 dark:group-hover:text-sky-300 transition-colors">
                      {hi ? item.labelHi : item.label}
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug line-clamp-2">
                      {hi ? item.descriptionHi : item.description}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* ── SUPPORT (2-col: urgent card is visually accented, others neutral) ── */}
        <div>
          <h3 className="kicker flex items-center gap-2 mb-3">
            <span className="w-1.5 h-5 rounded-full bg-slate-400 inline-block" />
            {hi ? 'सहायता एवं अधिकार' : 'Support & Rights'}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {navGroups.find(g => g.id === 'support')?.items.map((item) => {
              const Icon = item.icon;
              const isUrgent = item.tone === 'urgent';
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`group card card-animated p-4 flex items-start gap-3 ${
                    isUrgent
                      ? 'border-red-200 dark:border-red-900/70 hover:border-red-400 bg-red-50/40 dark:bg-red-950/20'
                      : 'hover:border-slate-400 dark:hover:border-slate-500'
                  }`}
                >
                  <span className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    isUrgent
                      ? 'bg-red-100 text-red-700 dark:bg-red-900/60 dark:text-red-300 border border-red-200 dark:border-red-800'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                  }`}>
                    <Icon className="w-4 h-4" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <h4 className={`font-bold text-xs transition-colors ${
                      isUrgent
                        ? 'text-red-800 dark:text-red-300 group-hover:text-red-700'
                        : 'text-slate-900 dark:text-white group-hover:text-slate-700'
                    }`}>
                      {hi ? item.labelHi : item.label}
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug line-clamp-2">
                      {hi ? item.descriptionHi : item.description}
                    </p>
                  </div>
                  <ChevronRight className={`w-4 h-4 shrink-0 transition-colors ${
                    isUrgent ? 'text-red-300 group-hover:text-red-500' : 'text-slate-300 group-hover:text-slate-500'
                  }`} />
                </Link>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
};
