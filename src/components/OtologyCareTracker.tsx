'use client';

import React, { useState } from 'react';
import {
  Ear, ShieldAlert, CheckCircle2, XCircle, AlertTriangle, Calendar,
  Droplets, Award, FileText, ChevronRight, Bookmark
} from 'lucide-react';
import { useAppData } from '@/lib/app-data-context';

export const OtologyCareTracker: React.FC = () => {
  const { locale } = useAppData();
  const hi = locale === 'hi';

  const [waterProofChecked, setWaterProofChecked] = useState(true);
  const [sneezingRuleChecked, setSneezingRuleChecked] = useState(true);

  const precautions = [
    {
      id: 'water',
      title: hi ? 'पानी से पूर्ण सुरक्षा (Strict Water Precaution)' : 'Strict Water Precaution (Dry Ear Policy)',
      status: hi ? 'अति महत्वपूर्ण' : 'CRITICAL',
      description: hi
        ? 'नहाते समय कान में वैसलीन लगा कॉटन प्लग (Vaseline-coated cotton ball) लगाएं। कान में कभी सीधा पानी न जाने दें।'
        : 'Never allow water inside ear. During head wash/bath, place a cotton ball smeared with Vaseline in the ear canal bowl.',
      icon: Droplets,
    },
    {
      id: 'pressure',
      title: hi ? 'प्रेशर और छींकने का नियम (No Valsalva)' : 'Open-Mouth Sneezing Rule (No Pressure)',
      status: hi ? 'महत्वपूर्ण' : 'IMPORTANT',
      description: hi
        ? 'छींक आए तो हमेशा मुंह खोलकर छींकें। अपनी नाक या कान को दबाकर हवा न भरें (Valsalva न करें)।'
        : 'Always sneeze with mouth wide open. Do NOT blow nose hard or hold nostril closed (no Valsalva maneuver).',
      icon: ShieldAlert,
    },
    {
      id: 'flight',
      title: hi ? 'हवाई यात्रा और भारी वजन उठाना' : 'No Flying or Heavy Weight Lifting',
      status: hi ? '4 सप्ताह' : '4 Weeks',
      description: hi
        ? 'सर्जरी के 4 से 6 सप्ताह बाद तक हवाई यात्रा न करें और 5 किग्रा से भारी वजन न उठाएं।'
        : 'Avoid air travel, strenuous gym workouts, or lifting heavy weights (>5kg) for at least 4-6 weeks post-surgery.',
      icon: AlertTriangle,
    }
  ];

  const healingMilestones = [
    { day: 'Day 1 - 3', task: hi ? 'कान की बाहरी ड्रेसिंग और पैडिंग साफ रखें' : 'Keep outer mastoid bandage dry and intact.' },
    { day: 'Day 7 - 10', task: hi ? 'कमांड अस्पताल ईएनटी ओपीडी में सुचर (टांके) निकलवाएं' : 'Suture removal at Command Hospital ENT OPD.' },
    { day: 'Day 21', task: hi ? 'ऑपरेटेड कान के जेलफोम पैक्स (Gelfoam) का अवशोषण/सफाई' : 'Otoscopic inspection & Gelfoam pack status check.' },
    { day: 'Day 45', task: hi ? 'पोस्ट-ऑपरेटिव ऑडियोग्राम (PTA) परीक्षण' : 'Post-op Pure Tone Audiometry (PTA) hearing evaluation.' }
  ];

  return (
    <div className="space-y-6 page-enter">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-amber-950 via-slate-900 to-navy-900 rounded-2xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/30 text-amber-200 text-xs font-semibold backdrop-blur-sm">
            <Ear className="w-4 h-4 text-amber-300" />
            {hi ? 'कान की सर्जरी एवं सुरक्षा ट्रैकर' : 'Otology & Tympanoplasty Ear Precaution Tracker'}
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            {hi ? 'पोस्ट-ऑपरेटिव कान सुरक्षा और रिकवरी मील के पत्थर' : 'Ear Precaution & Post-Op Healing Tracker'}
          </h1>
          <p className="text-amber-100 text-xs md:text-sm leading-relaxed">
            {hi
              ? 'टिम्पैनोप्लास्टी, मास्टॉइडेक्टॉमी और स्टैपिडेक्टॉमी के बाद ग्राफ (Graft) की सफलता के लिए पानी से सुरक्षा, दबाव से बचाव और पोस्ट-ऑप ऑडियोग्राम अनुसूची।'
              : 'Essential guidelines for graft survival after Tympanoplasty, Mastoidectomy, and Stapedectomy surgeries.'}
          </p>
        </div>
      </div>

      {/* Precautions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {precautions.map((p) => {
          const Icon = p.icon;
          return (
            <div key={p.id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="p-2 bg-amber-50 text-amber-800 rounded-lg">
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="bg-amber-100 text-amber-900 text-[10px] font-extrabold px-2 py-0.5 rounded border border-amber-300">
                    {p.status}
                  </span>
                </div>
                <h3 className="font-bold text-slate-900 text-sm">{p.title}</h3>
                <p className="text-xs text-slate-600 leading-relaxed">{p.description}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Healing Milestones Timeline */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-6">
        <div className="border-b border-slate-100 pb-3">
          <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
            <Calendar className="w-5 h-5 text-navy-900" />
            {hi ? 'सर्जरी के बाद रिकवरी मील के पत्थर (Command Hospital Timeline)' : 'Post-Op Ear Recovery Milestones'}
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {healingMilestones.map((m, idx) => (
            <div key={idx} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 relative">
              <span className="bg-navy-900 text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full inline-block">
                {m.day}
              </span>
              <p className="text-xs text-slate-800 font-semibold leading-tight">{m.task}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Do's and Don'ts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-5 space-y-3">
          <h4 className="font-bold text-emerald-950 text-sm flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            {hi ? 'क्या करें (DOs):' : 'What to DO:'}
          </h4>
          <ul className="space-y-2 text-xs text-emerald-900">
            <li className="flex items-start gap-2">
              <span className="font-bold text-emerald-600">•</span>
              {hi ? 'कान की बूंदें प्रिस्क्रिप्शन के अनुसार निर्धारित समय पर डालें' : 'Instill prescribed ear drops regularly as advised by ENT surgeon.'}
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold text-emerald-600">•</span>
              {hi ? 'छींकते समय मुंह पूरा खुला रखें' : 'Sneeze with mouth open to prevent graft displacement.'}
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold text-emerald-600">•</span>
              {hi ? 'नहाते समय हमेशा वैसलीन कॉटन प्लग इस्तेमाल करें' : 'Always keep Vaseline cotton plug ready for showers.'}
            </li>
          </ul>
        </div>

        <div className="bg-red-50/60 border border-red-200 rounded-xl p-5 space-y-3">
          <h4 className="font-bold text-red-950 text-sm flex items-center gap-2">
            <XCircle className="w-5 h-5 text-red-600" />
            {hi ? 'क्या न करें (DON\'Ts):' : 'What NOT to DO:'}
          </h4>
          <ul className="space-y-2 text-xs text-red-900">
            <li className="flex items-start gap-2">
              <span className="font-bold text-red-600">•</span>
              {hi ? 'कान में कॉर्डन बड्स (Cotton buds) या कोई वस्तु न डालें' : 'Never insert ear buds, keys, or pins into ear canal.'}
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold text-red-600">•</span>
              {hi ? 'तैराकी (Swimming) 6 सप्ताह तक बिल्कुल न करें' : 'Do NOT swim until doctor explicitly certifies complete graft healing.'}
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold text-red-600">•</span>
              {hi ? 'नाक को जोर से न छिड़कें (No hard nose blowing)' : 'Do NOT blow nose forcibly.'}
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};
