'use client';

import React, { useState } from 'react';
import { 
  ShieldAlert, Play, Clock, HelpCircle, Send, Check, Video, RefreshCw, Lock
} from 'lucide-react';
import { ClinicalTextHardener } from '@/lib/clinical-text';
import { AbhaConsentPanel } from './AbhaConsentPanel';
import { NotificationDispatcher } from './NotificationDispatcher';

interface PatientPortalProps {
  locale: 'en' | 'hi';
  vestibularMode: boolean;
  hearingMode: boolean;
  orders: any[];
  selectedOrderId: string;
  setSelectedOrderId: (id: string) => void;
  orderDetails: any;
  loadingOrder: boolean;
  orderError: string | null;
  catalogueData: { harmAlerts: any[]; patientStories: any[] };
  surgeryTime: string;
  setSurgeryTime: (t: string) => void;
  npoTimes: { solidTime: string; liquidTime: string };
  handleSignReceipt: () => void;
  sigSigned: boolean;
}

export const PatientPortal: React.FC<PatientPortalProps> = ({
  locale,
  vestibularMode,
  hearingMode,
  orders,
  selectedOrderId,
  setSelectedOrderId,
  orderDetails,
  loadingOrder,
  orderError,
  catalogueData,
  surgeryTime,
  setSurgeryTime,
  npoTimes,
  handleSignReceipt,
  sigSigned,
}) => {
  const [quizAnswer, setQuizAnswer] = useState<number | null>(null);
  const [quizSubmitted, setQuizSubmitted] = useState(false);

  // Sample Glossary dictionary for auto-linking
  const glossaryTerms = [
    { term: 'Tympanoplasty', definition: 'Surgical repair of the eardrum', simpleText: 'कान के पर्दे का ऑपरेशन' },
    { term: 'Vaseline', definition: 'Petroleum jelly for waterproofing ear cotton plug', simpleText: 'मलम/वैसलीन' },
    { term: 'water precaution', definition: 'Strict rules to keep ear canal completely dry for 6 weeks', simpleText: 'पानी बचाव नियम' }
  ];

  const sanitizedBodyText = ClinicalTextHardener.autoLinkGlossary(
    locale === 'hi'
      ? 'टिमपैनोप्लास्टी (Tympanoplasty) के बाद कान में Vaseline लगी रुई लगाकर 6 हफ्तों तक water precaution का पालन करें।'
      : 'Follow strict water precaution rules after Tympanoplasty surgery by placing Vaseline coated cotton in the ear.',
    glossaryTerms
  );

  return (
    <div className="space-y-5 sm:space-y-6 pb-10">
      {/* Message From Your Surgeon */}
      <div className="clinical-card p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-4">
          <div className="w-12 h-12 sm:w-14 sm:h-14 bg-blue-50 dark:bg-blue-950/35 text-blue-700 dark:text-blue-200 rounded-2xl border border-blue-100 dark:border-blue-900/60 flex items-center justify-center font-bold text-base shrink-0">
            DR
          </div>
          <div>
            <span className="clinical-kicker block">
              Message from Your Surgeon (60 sec)
            </span>
            <h2 className="text-base sm:text-lg font-bold text-slate-950 dark:text-white leading-snug mt-1">
              {locale === 'hi'
                ? 'डॉ. विशाल गौरव (एम.एस. ई.एन.टी.) - बेस अस्पताल नई दिल्ली / कमान अस्पताल पुणे का विशेष संदेश'
                : 'Personal Welcome & Care Instructions from Dr. Vishal Gaurav, MS (ENT) — Base Hospital ND / Command Hospital Pune'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              "Welcome to the department. Please follow the 5 water precaution rules for 6 weeks post-tympanoplasty..."
            </p>
          </div>
        </div>
        <button className="btn-primary px-4 text-xs sm:text-sm">
          <Play className="w-4 h-4" /> Watch Surgeon Video
        </button>
      </div>

      {/* Red Flags SOS Banner */}
      <div className="rounded-2xl bg-red-50 dark:bg-red-950/35 text-red-950 dark:text-red-100 p-4 sm:p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 border border-red-200 dark:border-red-900">
        <div className="flex items-start sm:items-center gap-3">
          <div className="bg-white dark:bg-red-950/60 text-red-600 dark:text-red-300 p-2.5 rounded-xl border border-red-200 dark:border-red-800 shrink-0">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-base text-red-950 dark:text-red-100">
              {locale === 'hi' ? 'आपातकालीन लाल झंडे (SOS Red Flags)' : 'Emergency Warning Signs (Red Flags)'}
            </h3>
            <p className="text-xs sm:text-sm text-red-800 dark:text-red-200 mt-1">
              Post-op bleeding, sudden severe vertigo, or breathing distress requires immediate emergency care.
            </p>
          </div>
        </div>
        <button
          onClick={() => alert('Emergency SOS Call Triggered: ENT Casualty 24x7 Hotline - +91 11 2658 8500')}
          className="inline-flex items-center justify-center bg-red-600 hover:bg-red-700 text-white font-bold px-4 py-2.5 rounded-xl text-sm shadow-sm min-h-[44px]"
        >
          Call ENT Casualty (24x7)
        </button>
      </div>

      {/* Preventable Harm Day-Indexed Alerts */}
      {catalogueData.harmAlerts.length > 0 && (
        <div className="space-y-3">
          <h3 className="clinical-kicker">
            Preventable Harm & Clinical Warnings
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {catalogueData.harmAlerts.map((alert) => (
              <div
                key={alert.id}
                className={`p-4 rounded-xl border space-y-2 text-xs shadow-sm ${
                  alert.urgencyLevel === 'EMERGENCY'
                    ? 'bg-red-50 border-red-300 text-red-950'
                    : 'bg-amber-50 border-amber-300 text-amber-950'
                }`}
              >
                <div className="font-bold text-sm flex items-center justify-between">
                  <span>{alert.alertTitle}</span>
                  <span className="bg-white px-2 py-0.5 rounded text-[10px] uppercase font-semibold">
                    Day {alert.dayIndex} Alert
                  </span>
                </div>
                <p>{alert.alertMessage}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Order Selector */}
      <div className="clinical-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <label className="clinical-kicker block mb-2">
            Select Prescribed Education Order (CarePlan):
          </label>
          <select
            value={selectedOrderId}
            onChange={(e) => setSelectedOrderId(e.target.value)}
            className="w-full sm:min-w-[22rem] bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500"
          >
            {orders.map((o) => (
              <option key={o.id} value={o.id}>
                {o.pathwayTemplate.title} — MRN: {o.patientRef.mrn} ({o.disclosureState.toUpperCase()})
              </option>
            ))}
          </select>
        </div>
      </div>

      {loadingOrder && (
        <div className="p-8 text-center text-slate-500 flex items-center justify-center gap-2">
          <RefreshCw className="w-5 h-5 animate-spin" /> Loading Care Plan...
        </div>
      )}

      {orderError && (
        <div className="bg-amber-50 border border-amber-300 text-amber-900 p-6 rounded-xl space-y-3">
          <div className="flex items-center gap-2 text-amber-800 font-bold text-lg">
            <Lock className="w-6 h-6 text-amber-600" />
            Sensitive-Disclosure Gating Active (Embargoed)
          </div>
          <p className="text-sm">{orderError}</p>
        </div>
      )}

      {orderDetails && !orderError && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Timeline & NPO Calculator */}
          <div className="lg:col-span-1 space-y-5">
            <div className="clinical-card p-5 space-y-4">
              <span className="clinical-kicker block">
                My Care Plan Spine
              </span>
              <h2 className="text-lg font-bold text-slate-950 dark:text-white">{orderDetails.pathwayTemplate.title}</h2>
              <div className="clinical-panel p-3 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Prescribed By:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{orderDetails.orderedBy}</span>
                </div>
              </div>
            </div>

            {/* NPO Fasting Calculator */}
            <div className="clinical-card p-4 space-y-3">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600" />
                {locale === 'hi' ? 'NPO उपवास समय कैलकुलेटर (Pre-Op Fasting)' : 'Pre-Op NPO Fasting Calculator'}
              </h3>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-xs">
                <label className="font-medium text-slate-700 dark:text-slate-300">Surgery Time:</label>
                <input
                  type="time"
                  value={surgeryTime}
                  onChange={(e) => setSurgeryTime(e.target.value)}
                  className="border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 font-bold bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>
              <div className="clinical-panel p-3 space-y-2 text-xs">
                <div className="flex justify-between gap-4 text-slate-800 dark:text-slate-200">
                  <span>No Solid Food After:</span>
                  <strong className="text-amber-700">{npoTimes.solidTime} (8h prior)</strong>
                </div>
                <div className="flex justify-between gap-4 text-slate-800 dark:text-slate-200">
                  <span>No Water/Liquids After:</span>
                  <strong className="text-red-700">{npoTimes.liquidTime} (2h prior)</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Player & Hardened Content */}
          <div className="lg:col-span-2 space-y-6">
            <div className="clinical-card p-4 sm:p-5 space-y-4">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                {locale === 'hi'
                  ? 'टिमपैनोप्लास्टी: 6 सप्ताह के पानी से बचाव के नियम'
                  : 'Tympanoplasty: 6-Week Water Precaution Rules'}
              </h2>
              
              <div className="bg-slate-950 rounded-2xl overflow-hidden shadow-inner text-white relative">
                <div className="aspect-video bg-ink-950 flex flex-col items-center justify-center p-6 relative">
                  <Play className="w-14 h-14 sm:w-16 sm:h-16 text-blue-300 opacity-90 mb-2" />
                  <span className="text-sm font-semibold">
                    {locale === 'hi'
                      ? 'टिमपैनोप्लास्टी रिकवरी निर्देश वीडियो (4 मिनट)'
                      : 'Tympanoplasty Recovery Rules Video (4 min)'}
                  </span>
                  {hearingMode && (
                    <div className="w-full max-w-lg mt-6 caption-box-large text-center shadow-lg">
                      {locale === 'hi'
                        ? 'कान में पानी न जाने दें — नहाते समय वैसलीन लगी रुई का प्रयोग करें।'
                        : 'Rule 1: Never let water enter your operated ear for 6 weeks.'}
                    </div>
                  )}
                </div>
              </div>

              {/* Hardened Content Body with Auto-Linked Glossary Terms */}
              <div 
                className="prose prose-slate prose-sm max-w-none text-sm leading-relaxed p-4 bg-slate-50 rounded-lg border border-slate-200"
                dangerouslySetInnerHTML={{ __html: sanitizedBodyText }}
              />

              {/* Teach-Back Quiz */}
              <div className="bg-blue-50 dark:bg-blue-950/25 border border-blue-200 dark:border-blue-900/60 rounded-2xl p-4 space-y-3">
                <h4 className="font-bold text-sm text-blue-950 dark:text-blue-100 flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-blue-600 dark:text-blue-300" />
                  {locale === 'hi' ? 'समझ की जाँच (Teach-Back Check)' : 'Teach-Back Check'}
                </h4>
                <p className="text-xs text-blue-900 dark:text-blue-200">
                  Question: How should you protect your ear when bathing after eardrum repair surgery?
                </p>

                <div className="space-y-2 text-xs">
                  {[
                    { id: 1, text: 'A) Leave ear open and let water flow' },
                    { id: 2, text: 'B) Plug ear canal with Vaseline-coated cotton', correct: true },
                    { id: 3, text: 'C) Wash ear canal directly with soap' }
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => { setQuizAnswer(opt.id); setQuizSubmitted(true); }}
                      className={`w-full text-left p-2.5 rounded-lg border transition-colors ${
                        quizAnswer === opt.id
                          ? opt.correct
                            ? 'bg-emerald-100 border-emerald-400 text-emerald-900 font-medium'
                            : 'bg-amber-100 border-amber-400 text-amber-900 font-medium'
                          : 'bg-white dark:bg-slate-900 border-blue-200 dark:border-blue-900/60 text-slate-700 dark:text-slate-200 hover:bg-blue-100 dark:hover:bg-blue-950/45'
                      }`}
                    >
                      {opt.text}
                    </button>
                  ))}
                </div>

                {quizSubmitted && (
                  <div className="bg-emerald-100 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-100 p-3 rounded-lg text-xs font-semibold flex items-center justify-between border border-emerald-300 dark:border-emerald-800">
                    <span>
                      {quizAnswer === 2
                        ? 'Correct. Understanding confirmed (FHIR QuestionnaireResponse recorded: 100%).'
                        : "Let's review again: Always plug your ear with Vaseline cotton before bathing."}
                    </span>
                  </div>
                )}
              </div>

              {/* Digital Receipt Signing */}
              <div className="bg-slate-950 text-white rounded-2xl p-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                <div>
                  <h4 className="font-bold text-sm">Digital Receipt & Medico-Legal Confirmation</h4>
                  <p className="text-xs text-slate-400">Generates signed FHIR Communication & HL7 MDM document.</p>
                </div>
                <button
                  onClick={handleSignReceipt}
                  disabled={sigSigned}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold inline-flex items-center justify-center gap-2 min-h-[44px] ${
                    sigSigned ? 'bg-emerald-600 text-white' : 'bg-blue-600 hover:bg-blue-500 text-white'
                  }`}
                >
                  {sigSigned ? <Check className="w-4 h-4" /> : <Send className="w-4 h-4" />}
                  {sigSigned ? 'Receipt Signed & HL7 Emitted' : 'Sign Receipt'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* WhatsApp / SMS Push Reminders Delivery Service */}
      <NotificationDispatcher />

      {/* ABHA ID Digital Health Consent & HIS PROM Doctor Sharing */}
      <AbhaConsentPanel />
    </div>
  );
};
