'use client';

import React, { useState, useEffect } from 'react';
import {
  Wind, Droplets, Clock, Play, Pause, RefreshCw, CheckCircle2,
  AlertCircle, Sparkles, HelpCircle, ShieldCheck, ChevronRight
} from 'lucide-react';
import { useAppData } from '@/lib/app-data-context';

export const SinusIrrigationCompanion: React.FC = () => {
  const { locale } = useAppData();
  const hi = locale === 'hi';

  const [activeSide, setActiveSide] = useState<'left' | 'right'>('left');
  const [timerSeconds, setTimerSeconds] = useState<number>(30);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [solutionType, setSolutionType] = useState<'isotonic' | 'hypertonic'>('isotonic');
  const [sprayChecklist, setSprayChecklist] = useState<Record<string, boolean>>({});

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
        const sideText = activeSide === 'left' ? (hi ? 'बायां नथुना पूरा हुआ' : 'Left nostril rinse complete') : (hi ? 'दायां नथुना पूरा हुआ' : 'Right nostril rinse complete');
        const msg = new SpeechSynthesisUtterance(sideText);
        msg.lang = hi ? 'hi-IN' : 'en-US';
        synth.speak(msg);
      }
    }
    return () => clearInterval(interval);
  }, [isRunning, timerSeconds, activeSide, hi]);

  const toggleTimer = () => setIsRunning(!isRunning);
  const resetTimer = (secs: number = 30) => {
    setIsRunning(false);
    setTimerSeconds(secs);
  };

  const toggleSprayCheck = (id: string) => {
    setSprayChecklist((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const spraySteps = [
    { id: 'sp-1', text: hi ? 'नाक को सेलाइन धुलाई से अच्छी तरह साफ करें' : 'Blow nose gently or perform saline rinse first to clear mucus.' },
    { id: 'sp-2', text: hi ? 'बोतल को अच्छी तरह हिलाएं और सिर को थोड़ा आगे की ओर झुकाएं (नीचे देखें)' : 'Shake bottle well. Tilt head slightly forward (look down at feet).' },
    { id: 'sp-3', text: hi ? 'स्प्रे नोजल को बाहरी आंख/कान की दिशा में रखें (सेप्टम से दूर)' : 'Aim nozzle towards outer corner of eye/ear (away from nasal septum).' },
    { id: 'sp-4', text: hi ? 'धीरे से सांस लेते हुए 1-2 स्प्रे दबाएं (जोर से न सूंघें)' : 'Press pump while breathing in gently. Do NOT snort hard back into throat.' },
    { id: 'sp-5', text: hi ? 'मुंह से सांस बाहर छोड़ें और नोजल को साफ करें' : 'Breathe out through mouth. Wipe nozzle with clean tissue.' }
  ];

  return (
    <div className="space-y-6 page-enter">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-2xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-200 text-xs font-semibold backdrop-blur-sm">
            <Wind className="w-4 h-4 text-blue-300" />
            {hi ? 'साइनस एवं सेलाइन धुलाई companion' : 'Nasal Saline Irrigation & Spray Companion'}
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            {hi ? 'साइनस इरिगेशन एवं नेज़ल स्प्रे गाइड' : 'Sinus Rinse Timer & Spray Technique Coach'}
          </h1>
          <p className="text-blue-100 text-xs md:text-sm leading-relaxed">
            {hi
              ? 'पोस्ट-FESS सर्जरी, साइनस संक्रमण और एलर्जिक राइनाइटिस के मरीजों के लिए सेलाइन घोल बनाने का अनुपात, टाइमर और नेज़ल स्प्रे की सही तकनीक।'
              : 'Interactive tool for post-FESS sinus surgery recovery, allergic rhinitis, and chronic sinusitis management.'}
          </p>
        </div>
      </div>

      {/* Saline Solution Recipe Card */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Droplets className="w-5 h-5 text-blue-600" />
              {hi ? 'स्टेरिल सेलाइन घोल अनुपात (Saline Recipe)' : 'Sterile Saline Rinse Preparation Guide'}
            </h2>
            <p className="text-xs text-slate-500">
              {hi ? 'संक्रमण से बचने के लिए केवल उबला हुआ या आसुत (Distilled) पानी इस्तेमाल करें' : 'Use distilled or previously boiled & cooled water to prevent amoebic infection.'}
            </p>
          </div>

          <div className="inline-flex bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-semibold">
            <button
              onClick={() => setSolutionType('isotonic')}
              className={`px-3 py-1 rounded-md transition-colors ${
                solutionType === 'isotonic' ? 'bg-white text-blue-900 shadow-sm font-bold' : 'text-slate-600'
              }`}
            >
              {hi ? 'आइसोटोनिक (0.9% सामान्य)' : 'Isotonic (0.9% Normal)'}
            </button>
            <button
              onClick={() => setSolutionType('hypertonic')}
              className={`px-3 py-1 rounded-md transition-colors ${
                solutionType === 'hypertonic' ? 'bg-white text-blue-900 shadow-sm font-bold' : 'text-slate-600'
              }`}
            >
              {hi ? 'हाइपरटोनिक (2% सूजन कम करने हेतु)' : 'Hypertonic (2% Decongesting)'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50/70 p-4 rounded-xl border border-blue-200 space-y-1">
            <span className="text-[11px] font-bold text-blue-800 uppercase tracking-wider block">1. Water Base</span>
            <p className="font-bold text-slate-900 text-sm">240 mL (1 Cup) Distilled / Boiled Water</p>
            <span className="text-[11px] text-slate-600 block">{hi ? 'गुनगुना पानी (37°C)' : 'Lukewarm temperature'}</span>
          </div>

          <div className="bg-blue-50/70 p-4 rounded-xl border border-blue-200 space-y-1">
            <span className="text-[11px] font-bold text-blue-800 uppercase tracking-wider block">2. Non-Iodized Salt</span>
            <p className="font-bold text-slate-900 text-sm">
              {solutionType === 'isotonic' ? '1/2 Teaspoon Pure Salt' : '1 Full Teaspoon Pure Salt'}
            </p>
            <span className="text-[11px] text-slate-600 block">{hi ? 'बिना आयोडीन वाला नमक' : 'No additives or preservatives'}</span>
          </div>

          <div className="bg-blue-50/70 p-4 rounded-xl border border-blue-200 space-y-1">
            <span className="text-[11px] font-bold text-blue-800 uppercase tracking-wider block">3. Baking Soda</span>
            <p className="font-bold text-slate-900 text-sm">1/4 Teaspoon Baking Soda (Buffer)</p>
            <span className="text-[11px] text-slate-600 block">{hi ? 'जलन रोकने हेतु सोडियम बाइकार्बोनेट' : 'Prevents nasal stinging'}</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Left Rinse Timer, Right Spray Technique */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Rinse Timer */}
        <div className="bg-gradient-to-b from-slate-900 to-navy-950 text-white rounded-xl p-6 shadow-md flex flex-col justify-between space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <span className="text-[11px] font-bold text-blue-400 uppercase tracking-wider block">
                {hi ? 'नासिक धुलाई टाइमर' : 'Nasal Rinse Companion Timer'}
              </span>
              <h3 className="font-bold text-base text-white">
                {activeSide === 'left' ? (hi ? 'बायां नथुना (Left Nostril)' : 'Left Nostril Rinse') : (hi ? 'दायां नथुना (Right Nostril)' : 'Right Nostril Rinse')}
              </h3>
            </div>

            <div className="flex bg-slate-800 p-1 rounded-lg border border-slate-700 text-xs">
              <button
                onClick={() => {
                  setActiveSide('left');
                  resetTimer(30);
                }}
                className={`px-3 py-1 rounded-md transition-colors ${
                  activeSide === 'left' ? 'bg-blue-600 text-white font-bold' : 'text-slate-400'
                }`}
              >
                {hi ? 'बायां' : 'Left'}
              </button>
              <button
                onClick={() => {
                  setActiveSide('right');
                  resetTimer(30);
                }}
                className={`px-3 py-1 rounded-md transition-colors ${
                  activeSide === 'right' ? 'bg-blue-600 text-white font-bold' : 'text-slate-400'
                }`}
              >
                {hi ? 'दायां' : 'Right'}
              </button>
            </div>
          </div>

          <div className="text-center space-y-2 py-4">
            <div className="inline-flex items-center justify-center w-36 h-36 rounded-full border-4 border-blue-500/40 bg-navy-900 text-5xl font-black font-mono shadow-inner text-white">
              {timerSeconds < 10 ? `0${timerSeconds}` : timerSeconds}
            </div>
            <p className="text-xs text-slate-300">
              {hi
                ? 'सिंक के ऊपर सिर 45° झुकाएं, मुंह से सांस लें और सेलाइन प्रवाहित करें।'
                : 'Lean over sink at 45° angle. Breathe through mouth while squeezing bottle gently.'}
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={toggleTimer}
              className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-md ${
                isRunning ? 'bg-amber-500 hover:bg-amber-600 text-navy-950' : 'bg-blue-500 hover:bg-blue-400 text-navy-950'
              }`}
            >
              {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
              {isRunning ? (hi ? 'रोकें' : 'Pause') : (hi ? 'रिंस शुरू करें' : 'Start Rinse')}
            </button>
            <button
              onClick={() => resetTimer(30)}
              className="py-3 px-4 rounded-xl border border-slate-700 text-slate-300 text-xs font-semibold hover:bg-slate-800"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Right: Steroid Spray Technique Checklist */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-indigo-600" />
              {hi ? 'नेज़ल स्टेरॉयड स्प्रे लगाने की सही तकनीक' : 'Nasal Steroid Spray Technique Coach'}
            </h3>
            <p className="text-xs text-slate-500">
              {hi ? 'गलत तरीके से लगाने पर सेप्टम में ब्लीडिंग हो सकती है। इन चरणों का पालन करें:' : 'Prevents nosebleeds and ensures maximum drug deposit into sinus osteomeatal complex.'}
            </p>
          </div>

          <div className="space-y-2.5">
            {spraySteps.map((step) => {
              const checked = !!sprayChecklist[step.id];
              return (
                <div
                  key={step.id}
                  onClick={() => toggleSprayCheck(step.id)}
                  className={`p-3 rounded-lg border transition-all cursor-pointer flex items-center gap-3 text-xs ${
                    checked
                      ? 'bg-indigo-50 border-indigo-200 text-indigo-950 font-medium'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <CheckCircle2
                    className={`w-4 h-4 shrink-0 ${checked ? 'text-indigo-600 fill-indigo-100' : 'text-slate-300'}`}
                  />
                  <span>{step.text}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
