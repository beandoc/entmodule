'use client';

import React, { useState, useEffect } from 'react';
import {
  RotateCcw, Play, Pause, RefreshCw, CheckCircle2, AlertTriangle,
  Activity, Award, Sparkles, Volume2, Clock, Eye, ShieldCheck, ChevronRight
} from 'lucide-react';
import { useAppData } from '@/lib/app-data-context';

export const VestibularRehabGuide: React.FC = () => {
  const { locale } = useAppData();
  const hi = locale === 'hi';

  const [activeTab, setActiveTab] = useState<'vor' | 'cawthorne' | 'epley' | 'balance'>('vor');
  const [timerSeconds, setTimerSeconds] = useState<number>(30);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [completedSteps, setCompletedSteps] = useState<Record<string, boolean>>({});
  const [dizzinessBefore, setDizzinessBefore] = useState<number>(4);
  const [dizzinessAfter, setDizzinessAfter] = useState<number>(2);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev - 1);
      }, 1000);
    } else if (timerSeconds === 0) {
      setIsRunning(false);
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        const synth = window.speechSynthesis;
        const msg = new SpeechSynthesisUtterance(hi ? 'व्यायाम का यह चरण पूरा हुआ' : 'Exercise step completed');
        msg.lang = hi ? 'hi-IN' : 'en-US';
        synth.speak(msg);
      }
    }
    return () => clearInterval(interval);
  }, [isRunning, timerSeconds, hi]);

  const toggleTimer = () => setIsRunning(!isRunning);
  const resetTimer = (secs: number = 30) => {
    setIsRunning(false);
    setTimerSeconds(secs);
  };

  const toggleStepDone = (id: string) => {
    setCompletedSteps((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const exercises = {
    vor: {
      title: hi ? 'VOR गेज स्टेबिलाइजेशन (VOR x1 & x2)' : 'Vestibulo-Ocular Reflex (VOR x1 & x2) Training',
      description: hi
        ? 'अपनी उंगली या टारगेट कार्ड पर ध्यान केंद्रित रखते हुए सिर को धीरे-धीरे बाएं-दाएं और ऊपर-नीचे हिलाएं।'
        : 'Maintain sharp visual focus on a card or your thumb while rhythmically turning your head side to side.',
      steps: [
        { id: 'vor-1', text: hi ? 'आंखों के स्तर पर एक कार्ड या उंगली रखें (30-40 सेमी दूरी)' : 'Hold a target card at eye level (30-40 cm away).' },
        { id: 'vor-2', text: hi ? 'टारगेट पर नज़र गड़ाए रखकर सिर को क्षैतिज (Horizontal) 45° हिलाएं' : 'Turn head horizontally side to side while keeping target crystal clear.' },
        { id: 'vor-3', text: hi ? '30 सेकंड तक बिना धुंधलेपन के सिर हिलाएं' : 'Perform for 30 seconds without letting target blur.' },
        { id: 'vor-4', text: hi ? 'उसी प्रकार लंबवत (Vertical) ऊपर-नीचे सिर हिलाएं' : 'Repeat vertically (up and down head nods) for 30 seconds.' },
      ],
      duration: 30,
    },
    cawthorne: {
      title: hi ? 'कॉथॉर्न-कुक्सी सिर एवं नेत्र व्यायाम' : 'Cawthorne-Cooksey Vestibular Exercises',
      description: hi
        ? 'आंखों, सिर और कंधों की समन्वित गतिविधियों से मस्तिष्क को संतुलन बनाए रखना सिखाएं।'
        : 'Systematic eye, head, and body movements designed to desensitize the vestibular system to motion.',
      steps: [
        { id: 'cc-1', text: hi ? 'बैठकर आंखों को ऊपर-नीचे और दाएं-बाएं हिलाएं (10 बार)' : 'Seated: Move eyes up-and-down, then side-to-side (10 repetitions).' },
        { id: 'cc-2', text: hi ? 'अपनी उंगली को चेहरे के पास लाएं और दूर ले जाएं (Focus change)' : 'Focus on finger moving from 1 foot to 3 inches from nose.' },
        { id: 'cc-3', text: hi ? 'सिर को धीरे-धीरे झुकाएं और मोड़ें (खुली आंखों से, फिर बंद आंखों से)' : 'Tilt head forward/backward & shoulder-to-shoulder with eyes open.' },
        { id: 'cc-4', text: hi ? 'कंधों को घुमाएं और आगे की ओर झुककर कोई वस्तु उठाएं' : 'Shrug shoulders and bend forward to pick an object off the floor.' },
      ],
      duration: 45,
    },
    epley: {
      title: hi ? 'एपली पैंतरा (Epley Maneuver for BPPV)' : 'Epley Maneuver for Posterior Canal BPPV',
      description: hi
        ? 'कान की नलिका में विस्थापित कैल्शियम क्रिस्टल (Otoconia) को अपनी सही जगह वापस लाने के लिए।'
        : 'Guided sequential positioning to reposition free-floating otoconia out of the posterior semicircular canal.',
      steps: [
        { id: 'ep-1', text: hi ? 'बिस्तर पर बैठें और सिर को प्रभावित कान की तरफ 45° घुमाएं' : 'Sit upright on bed. Turn head 45° towards affected ear.' },
        { id: 'ep-2', text: hi ? 'तेजी से पीठ के बल लेट जाएं (सिर 20° पीछे लटका रहे) - 30 से 60 सेकंड रुकें' : 'Lie back quickly with head extended 20° over edge. Hold for 45 sec until vertigo stops.' },
        { id: 'ep-3', text: hi ? 'सिर को विपरीत दिशा में 90° घुमाएं - 45 सेकंड रुकें' : 'Rotate head 90° to opposite side without lifting. Hold for 45 sec.' },
        { id: 'ep-4', text: hi ? 'शरीर को उसी तरफ मोड़ें (करवट लें) और सिर को फर्श की ओर 45° झुकाएं' : 'Roll onto side facing floor. Hold for 45 sec.' },
        { id: 'ep-5', text: hi ? 'धीरे-धीरे वापस बैठकर 2 मिनट तक सीधे बैठें' : 'Slowly sit up sideways and remain upright for 2 minutes.' },
      ],
      duration: 45,
    },
    balance: {
      title: hi ? 'संतुलन और चलना (Balance & Habituation)' : 'Static & Dynamic Balance Training',
      description: hi
        ? 'विभिन्न सतहों पर सीधे खड़े होने और चलने का अभ्यास करके संतुलन को मजबूत बनाएं।'
        : 'Progressive postural stability drills to improve gait, reduce fall risk, and boost confidence.',
      steps: [
        { id: 'bal-1', text: hi ? 'पैरों को आपस में मिलाकर 30 सेकंड तक सीधे खड़े रहें (दीवार के पास)' : 'Stand with feet together near a wall for 30 seconds.' },
        { id: 'bal-2', text: hi ? 'फोम मैट या गद्देदार सतह पर खड़े होकर संतुलन बनाए रखें' : 'Stand on a soft cushion or foam pad with arms crossed.' },
        { id: 'bal-3', text: hi ? 'टैंडम वॉक (एक पैर के आगे दूसरा पैर) 10 कदम चलें' : 'Tandem walk (heel-to-toe in a straight line) for 10 steps.' },
        { id: 'bal-4', text: hi ? 'चलते समय सिर को दाएं-बाएं घुमाएं' : 'Walk forward while turning head side-to-side on alternate steps.' },
      ],
      duration: 30,
    }
  };

  const currentEx = exercises[activeTab];

  return (
    <div className="space-y-6 page-enter">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-teal-900 via-emerald-800 to-navy-900 rounded-2xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 border border-teal-400/30 text-teal-200 text-xs font-semibold backdrop-blur-sm">
            <RotateCcw className="w-4 h-4 text-teal-300 animate-spin-slow" />
            {hi ? 'चक्कर व संतुलन पुनर्वास गाइड' : 'Vestibular & Dizziness Rehabilitation Studio'}
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            {hi ? 'वेस्टिबुलर पुनर्वास व्यायाम (VRT)' : 'Vestibular Rehabilitation & Balance Companion'}
          </h1>
          <p className="text-emerald-100 text-xs md:text-sm leading-relaxed">
            {hi
              ? 'बीपीपीवी, वेस्टिबुलर न्यूराइटिस और चक्कर (Dizziness) के मरीजों के लिए विशेष डिजिटल व्यायाम टाइमर, चरण-दर-चरण तकनीक और दैनिक लक्षण ट्रैकिंग।'
              : 'Evidence-based exercises designed for BPPV, Vestibular Neuritis, and Labyrinthitis patients. Features interactive exercise timer and step guides.'}
          </p>
        </div>
      </div>

      {/* Dizziness Rating Bar */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
        <div>
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
            {hi ? 'सत्र से पहले चक्कर का स्तर (0-10)' : 'Dizziness Score Before Rehab (0-10)'}
          </span>
          <div className="flex items-center gap-3 mt-1.5">
            <input
              type="range"
              min="0"
              max="10"
              value={dizzinessBefore}
              onChange={(e) => setDizzinessBefore(Number(e.target.value))}
              className="w-full accent-teal-600 cursor-pointer"
            />
            <span className="font-extrabold text-navy-900 text-lg w-8 text-center bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
              {dizzinessBefore}
            </span>
          </div>
        </div>
        <div>
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
            {hi ? 'सत्र के बाद चक्कर का स्तर (0-10)' : 'Dizziness Score After Rehab (0-10)'}
          </span>
          <div className="flex items-center gap-3 mt-1.5">
            <input
              type="range"
              min="0"
              max="10"
              value={dizzinessAfter}
              onChange={(e) => setDizzinessAfter(Number(e.target.value))}
              className="w-full accent-emerald-600 cursor-pointer"
            />
            <span className="font-extrabold text-emerald-900 text-lg w-8 text-center bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              {dizzinessAfter}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs Selection */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {(['vor', 'cawthorne', 'epley', 'balance'] as const).map((tabKey) => {
          const ex = exercises[tabKey];
          const active = activeTab === tabKey;
          return (
            <button
              key={tabKey}
              onClick={() => {
                setActiveTab(tabKey);
                resetTimer(ex.duration);
              }}
              className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between space-y-2 ${
                active
                  ? 'bg-navy-900 text-white border-navy-900 shadow-md ring-2 ring-navy-900/20'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded uppercase tracking-wider ${
                  active ? 'bg-teal-500/30 text-teal-200' : 'bg-slate-100 text-slate-600'
                }`}>
                  {tabKey.toUpperCase()}
                </span>
                <Clock className={`w-4 h-4 ${active ? 'text-teal-300' : 'text-slate-400'}`} />
              </div>
              <span className="font-bold text-xs md:text-sm line-clamp-1">{ex.title.split('(')[0]}</span>
            </button>
          );
        })}
      </div>

      {/* Main Exercise Card & Timer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Interactive Exercise Steps */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-4 space-y-1">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Eye className="w-5 h-5 text-teal-600" />
              {currentEx.title}
            </h2>
            <p className="text-xs text-slate-600 leading-relaxed">{currentEx.description}</p>
          </div>

          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {hi ? 'चरण-दर-चरण निर्देश (चेकलिस्ट):' : 'Step-by-Step Checklist:'}
            </h3>
            {currentEx.steps.map((step) => {
              const done = !!completedSteps[step.id];
              return (
                <div
                  key={step.id}
                  onClick={() => toggleStepDone(step.id)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                    done
                      ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950'
                      : 'bg-slate-50/80 border-slate-200 text-slate-800 hover:border-slate-300'
                  }`}
                >
                  <CheckCircle2
                    className={`w-5 h-5 shrink-0 mt-0.5 transition-colors ${
                      done ? 'text-emerald-600 fill-emerald-100' : 'text-slate-300'
                    }`}
                  />
                  <span className={`text-xs md:text-sm font-medium ${done ? 'line-through opacity-80' : ''}`}>
                    {step.text}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 text-xs text-amber-900 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong className="font-bold block text-amber-950 mb-0.5">
                {hi ? 'सुरक्षा निर्देश:' : 'Safety Precaution:'}
              </strong>
              {hi
                ? 'यदि व्यायाम के दौरान अचानक गंभीर उल्टी, धुंधला दिखाई देना या बेहोशी महसूस हो तो तुरंत रुकें और दीवार का सहारा लें।'
                : 'If severe nausea, vertical nystagmus, or fainting occurs, stop immediately and hold onto a sturdy support or lie down.'}
            </div>
          </div>
        </div>

        {/* Right: Digital Timer Component */}
        <div className="bg-gradient-to-b from-navy-900 to-navy-950 text-white rounded-xl p-6 shadow-md flex flex-col items-center justify-between space-y-6">
          <div className="w-full text-center space-y-1">
            <span className="text-[11px] font-extrabold uppercase tracking-widest text-teal-400">
              {hi ? 'व्यायाम टाइमर' : 'Position Hold Timer'}
            </span>
            <h3 className="font-bold text-sm text-slate-200">{currentEx.title.split('(')[0]}</h3>
          </div>

          {/* Clock Display */}
          <div className="relative w-40 h-40 rounded-full border-4 border-teal-500/30 flex items-center justify-center bg-navy-900/80 shadow-inner">
            <div className="text-center space-y-0.5">
              <span className="text-5xl font-black tracking-tight text-white font-mono">
                {timerSeconds < 10 ? `0${timerSeconds}` : timerSeconds}
              </span>
              <span className="text-[10px] text-teal-300 block font-bold uppercase tracking-wider">
                {hi ? 'सेकंड शेष' : 'Seconds Left'}
              </span>
            </div>
          </div>

          {/* Controls */}
          <div className="w-full space-y-3">
            <button
              onClick={toggleTimer}
              className={`w-full py-3.5 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-md ${
                isRunning
                  ? 'bg-amber-500 hover:bg-amber-600 text-navy-950'
                  : 'bg-teal-500 hover:bg-teal-400 text-navy-950 font-extrabold'
              }`}
            >
              {isRunning ? (
                <>
                  <Pause className="w-5 h-5" />
                  {hi ? 'टाइमर रोकें' : 'Pause Timer'}
                </>
              ) : (
                <>
                  <Play className="w-5 h-5 fill-current" />
                  {hi ? 'टाइमर शुरू करें' : 'Start Hold Timer'}
                </>
              )}
            </button>

            <button
              onClick={() => resetTimer(currentEx.duration)}
              className="w-full py-2.5 px-4 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              {hi ? 'टाइमर रीसेट करें' : 'Reset Timer'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
