'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ClipboardCheck, Ear, Waves, Wind, ArrowLeft, RotateCcw, ArrowRight, CheckCircle2, AlertTriangle, ShieldAlert, Printer, Save, Check, Smartphone, ExternalLink, Download
} from 'lucide-react';
import { useAppData } from '@/lib/app-data-context';

type Tone = 'routine' | 'clinic' | 'emergency';

interface Option { label: string; labelHi: string; score: number }
interface Question { id: string; text: string; textHi: string; options: Option[] }
interface Band { max: number; tone: Tone; label: string; labelHi: string; guidance: string; guidanceHi: string }

interface AssessmentConfig {
  id: string;
  title: string;
  titleHi: string;
  description: string;
  descriptionHi: string;
  icon: typeof Ear;
  questions: Question[];
  bands: Band[];
}

const SCALE: Option[] = [
  { label: 'Never', labelHi: 'कभी नहीं', score: 0 },
  { label: 'Sometimes', labelHi: 'कभी-कभी', score: 1 },
  { label: 'Often', labelHi: 'अक्सर', score: 2 },
  { label: 'Always / Severe', labelHi: 'हमेशा / गंभीर', score: 3 },
];

const ASSESSMENTS: AssessmentConfig[] = [
  {
    id: 'hearing',
    title: 'Hearing Self-Check',
    titleHi: 'श्रवण स्व-जांच',
    description: 'A quick check on how conversations and everyday sounds feel right now.',
    descriptionHi: 'अभी बातचीत और रोज़मर्रा की आवाज़ें कैसी महसूस होती हैं, इसकी त्वरित जांच।',
    icon: Ear,
    questions: [
      { id: 'q1', text: 'Do you have trouble following conversation in a quiet room?', textHi: 'क्या शांत कमरे में बातचीत समझने में परेशानी होती है?', options: SCALE },
      { id: 'q2', text: 'Do you turn up the TV or phone volume more than before?', textHi: 'क्या आप टीवी या फोन की आवाज़ पहले से ज्यादा तेज़ करते हैं?', options: SCALE },
      { id: 'q3', text: 'Do you find yourself asking people to repeat themselves?', textHi: 'क्या आपको लोगों से बात दोहराने के लिए कहना पड़ता है?', options: SCALE },
      { id: 'q4', text: 'Does background noise make conversations hard to follow?', textHi: 'क्या पृष्ठभूमि शोर बातचीत समझना मुश्किल बनाता है?', options: SCALE },
    ],
    bands: [
      { max: 3, tone: 'routine', label: 'Within expected range', labelHi: 'सामान्य सीमा के भीतर', guidance: 'This is typical while healing tissue and packing settle. No action needed right now.', guidanceHi: 'यह सामान्य है जब तक ऊतक और पैकिंग ठीक हो रहे हैं। अभी किसी कार्रवाई की आवश्यकता नहीं है।' },
      { max: 7, tone: 'clinic', label: 'Worth mentioning at follow-up', labelHi: 'फॉलो-अप में बताने योग्य', guidance: 'Note this down and mention it at your next scheduled visit — no need to call today.', guidanceHi: 'इसे नोट कर लें और अपनी अगली निर्धारित यात्रा में बताएं — आज कॉल करने की आवश्यकता नहीं है।' },
      { max: 12, tone: 'clinic', label: 'Book a hearing check soon', labelHi: 'जल्द ही श्रवण जांच बुक करें', guidance: 'These answers suggest it is worth calling the clinic this week to arrange a hearing check.', guidanceHi: 'ये उत्तर बताते हैं कि श्रवण जांच के लिए इस सप्ताह क्लिनिक को कॉल करना उचित है।' },
    ],
  },
  {
    id: 'vertigo',
    title: 'Dizziness & Balance Check',
    titleHi: 'चक्कर और संतुलन जांच',
    description: 'Helps you decide whether unsteadiness needs a call today or can wait.',
    descriptionHi: 'यह तय करने में मदद करता है कि अस्थिरता के लिए आज कॉल करना है या इंतज़ार किया जा सकता है।',
    icon: Waves,
    questions: [
      { id: 'q1', text: 'Do you feel unsteady when walking?', textHi: 'क्या चलते समय अस्थिर महसूस होता है?', options: SCALE },
      { id: 'q2', text: 'Does turning your head quickly bring on dizziness?', textHi: 'क्या सिर जल्दी घुमाने पर चक्कर आता है?', options: SCALE },
      { id: 'q3', text: 'Have you had a fall or near-fall recently?', textHi: 'क्या हाल ही में आप गिरे हैं या गिरते-गिरते बचे हैं?', options: SCALE },
      { id: 'q4', text: 'Does the dizziness come with nausea or vomiting?', textHi: 'क्या चक्कर के साथ मतली या उल्टी होती है?', options: SCALE },
    ],
    bands: [
      { max: 3, tone: 'routine', label: 'Within expected range', labelHi: 'सामान्य सीमा के भीतर', guidance: 'Mild light-headedness on standing can be normal post-op. Rise slowly and rest as needed.', guidanceHi: 'खड़े होने पर हल्का चक्कर सर्जरी के बाद सामान्य हो सकता है। धीरे-धीरे उठें और आवश्यकतानुसार आराम करें।' },
      { max: 7, tone: 'clinic', label: 'Call the clinic today', labelHi: 'आज क्लिनिक को कॉल करें', guidance: 'This level of unsteadiness is worth a same-day call to the clinic, especially before driving or climbing stairs alone.', guidanceHi: 'अस्थिरता का यह स्तर आज ही क्लिनिक को कॉल करने योग्य है, खासकर अकेले गाड़ी चलाने या सीढ़ियां चढ़ने से पहले।' },
      { max: 12, tone: 'emergency', label: 'Seek care now', labelHi: 'अभी देखभाल लें', guidance: 'Falls or vomiting combined with dizziness match the red-flag pattern in your care plan — use the emergency card now.', guidanceHi: 'चक्कर के साथ गिरना या उल्टी आपकी देखभाल योजना में चेतावनी संकेत से मेल खाता है — अभी आपातकालीन कार्ड का उपयोग करें।' },
    ],
  },
  {
    id: 'sinus',
    title: 'Sinus & Nasal Symptom Score',
    titleHi: 'साइनस और नाक लक्षण स्कोर',
    description: 'Rate congestion, pressure and discharge to track your FESS recovery trend.',
    descriptionHi: 'अपनी एफईएसएस रिकवरी की प्रवृत्ति को ट्रैक करने के लिए जमाव, दबाव और स्राव को रेट करें।',
    icon: Wind,
    questions: [
      { id: 'q1', text: 'How blocked does your nose feel?', textHi: 'आपकी नाक कितनी बंद महसूस होती है?', options: SCALE },
      { id: 'q2', text: 'How much facial pain or pressure do you feel?', textHi: 'आपको चेहरे में कितना दर्द या दबाव महसूस होता है?', options: SCALE },
      { id: 'q3', text: 'How reduced is your sense of smell?', textHi: 'आपकी सूंघने की क्षमता कितनी कम हुई है?', options: SCALE },
      { id: 'q4', text: 'How much discharge or crusting do you notice?', textHi: 'आपको कितना स्राव या पपड़ी दिखाई देती है?', options: SCALE },
    ],
    bands: [
      { max: 3, tone: 'routine', label: 'Healing as expected', labelHi: 'अपेक्षित रूप से ठीक हो रहा है', guidance: 'Keep up your saline douching routine from the recovery guide.', guidanceHi: 'रिकवरी गाइड के अनुसार अपनी सलाइन डूशिंग दिनचर्या जारी रखें।' },
      { max: 7, tone: 'clinic', label: 'Monitor closely', labelHi: 'बारीकी से निगरानी करें', guidance: 'Continue douching and recheck tomorrow. If scores rise or fever appears, call the clinic.', guidanceHi: 'डूशिंग जारी रखें और कल फिर से जांचें। यदि स्कोर बढ़े या बुखार आए, तो क्लिनिक को कॉल करें।' },
      { max: 12, tone: 'clinic', label: 'Call the clinic today', labelHi: 'आज क्लिनिक को कॉल करें', guidance: 'These scores suggest possible infection or excess crusting — worth a same-day clinic call.', guidanceHi: 'ये स्कोर संभावित संक्रमण या अत्यधिक पपड़ी का सुझाव देते हैं — आज ही क्लिनिक कॉल करने योग्य है।' },
    ],
  },
];

const TONE_STYLES: Record<Tone, { icon: typeof CheckCircle2; className: string; badgeClass: string }> = {
  routine: {
    icon: CheckCircle2,
    className: 'bg-teal-50 text-teal-800 dark:bg-ink-800/90 dark:text-teal-200 border-teal-200 dark:border-ink-700',
    badgeClass: 'bg-teal-600 text-white',
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

export const SelfAssessment: React.FC = () => {
  const { locale } = useAppData();
  const hi = locale === 'hi';
  const [activeId, setActiveId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [savedToLog, setSavedToLog] = useState(false);

  const active = ASSESSMENTS.find((a) => a.id === activeId) || null;

  const reset = () => {
    setAnswers({});
    setSubmitted(false);
    setSavedToLog(false);
  };

  const start = (id: string) => {
    setActiveId(id);
    reset();
  };

  const score = active ? active.questions.reduce((sum, q) => sum + (answers[q.id] ?? 0), 0) : 0;
  const answeredCount = active ? Object.keys(answers).length : 0;
  const allAnswered = active ? active.questions.every((q) => answers[q.id] !== undefined) : false;
  const band = active ? active.bands.find((b) => score <= b.max) || active.bands[active.bands.length - 1] : null;

  const saveResultToSymptomLog = () => {
    if (!active || !band) return;
    try {
      const raw = window.localStorage.getItem('id-symptom-log');
      const entries = raw ? JSON.parse(raw) : [];
      const newEntry = {
        id: crypto.randomUUID(),
        date: new Date().toISOString().slice(0, 10),
        pain: Math.min(10, Math.round((score / 12) * 10)),
        hearing: active.id === 'hearing' ? Math.round((score / 12) * 10) : 2,
        dizziness: active.id === 'vertigo' ? Math.round((score / 12) * 10) : 1,
        notes: `Self-Assessment (${active.title}): Score ${score}/12 — ${band.label}`,
        createdAt: new Date().toISOString(),
      };
      window.localStorage.setItem('id-symptom-log', JSON.stringify([newEntry, ...entries]));
      setSavedToLog(true);
    } catch {
      // ignore local storage error
    }
  };

  if (!active) {
    return (
      <div className="space-y-6 pb-10">
        <div className="bg-white dark:bg-ink-900 border border-slate-200 dark:border-ink-800 rounded-3xl p-6 shadow-sm space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-50 dark:bg-ink-800 text-teal-600 dark:text-teal-400 flex items-center justify-center">
              <ClipboardCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display font-bold text-xl text-slate-900 dark:text-white">
                {hi ? 'रोगी स्व-मूल्यांकन फॉर्म' : 'Patient Self-Assessment Forms'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {hi
                  ? 'दो मिनट के गाइडेड चेक जो आपको बताते हैं कि क्या सामान्य है और कब क्लिनिक को कॉल करना है।'
                  : 'Audited 2-minute clinical questionnaires with real-time triage scoring.'}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {ASSESSMENTS.map((a) => {
            const Icon = a.icon;
            return (
              <button
                key={a.id}
                onClick={() => start(a.id)}
                className="group text-left bg-white dark:bg-ink-900 border border-slate-200 dark:border-ink-800 rounded-2xl p-6 hover:border-teal-400 dark:hover:border-teal-600 hover:shadow-lg transition-all card-interactive flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <span className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-ink-800 text-teal-600 dark:text-teal-300 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Icon className="w-6 h-6" />
                  </span>
                  <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                    {hi ? a.titleHi : a.title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    {hi ? a.descriptionHi : a.description}
                  </p>
                </div>

                <div className="mt-6 pt-3 border-t border-slate-100 dark:border-ink-800 flex items-center justify-between text-xs font-bold text-teal-700 dark:text-teal-300">
                  <span>{hi ? 'जांच शुरू करें' : 'Start Assessment'}</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </button>
            );
          })}
        </div>

        {/* Official WHO hearWHO External Tool Banner */}
        <div className="mt-8 rounded-3xl bg-gradient-to-r from-teal-900 via-ink-900 to-ink-950 text-white p-6 shadow-xl border border-teal-700/60 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-5 flex-1">
            <div className="w-14 h-14 rounded-2xl bg-teal-500/20 border border-teal-400/40 text-teal-300 flex items-center justify-center shrink-0 shadow-inner">
              <Smartphone className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-teal-300 bg-teal-950/80 px-2.5 py-0.5 rounded-full border border-teal-700/50">
                  {hi ? 'आधिकारिक डब्ल्यूएचओ ऐप' : 'Official WHO Tool'}
                </span>
                <span className="text-xs text-slate-300 font-mono">Android & iOS · hearWHO</span>
              </div>
              <h3 className="font-display font-bold text-lg text-white mt-1">
                {hi ? 'डब्ल्यूएचओ hearWHO श्रवण मूल्यांकन ऐप' : 'WHO hearWHO Mobile Hearing Assessment App'}
              </h3>
              <p className="text-xs text-slate-300 mt-1 max-w-xl leading-relaxed">
                {hi
                  ? 'विश्व स्वास्थ्य संगठन (WHO) का आधिकारिक मोबाइल ऐप जो डिजिट-इन-नॉइज़ तकनीक का उपयोग करके आपकी सुनने की क्षमता की जांच करता है।'
                  : 'Official World Health Organization (WHO) hearing screening app using digit-in-noise technology. Download on Android or iOS to check your hearing.'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <a
              href="https://play.google.com/store/apps/details?id=com.hearxgroup.hearwho&pli=1"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-teal-500 hover:bg-teal-400 text-ink-950 font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-lg hover:shadow-glow-teal transition-all"
            >
              <Download className="w-4 h-4" />
              {hi ? 'गूगल प्ले (Android)' : 'Google Play'}
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <a
              href="https://apps.apple.com/us/app/hearwho-check-your-hearing/id1449966543"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-md transition-all"
            >
              <Download className="w-4 h-4 text-teal-300" />
              {hi ? 'एप स्टोर (iOS)' : 'App Store (iOS)'}
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-10">
      <button
        onClick={() => setActiveId(null)}
        className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-300"
      >
        <ArrowLeft className="w-4 h-4" /> {hi ? 'सभी स्व-मूल्यांकन फॉर्म पर लौटें' : 'Back to all assessments'}
      </button>

      <div className="bg-white dark:bg-ink-900 border border-slate-200 dark:border-ink-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 dark:border-ink-800 pb-4">
          <div>
            <h2 className="font-display font-bold text-xl sm:text-2xl text-slate-900 dark:text-white">
              {hi ? active.titleHi : active.title}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{hi ? active.descriptionHi : active.description}</p>
          </div>
          <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-teal-50 dark:bg-ink-800 text-teal-700 dark:text-teal-300 shrink-0">
            {answeredCount} / {active.questions.length} {hi ? 'उत्तर दिए' : 'Answered'}
          </span>
        </div>

        {!submitted ? (
          <div className="space-y-6">
            {/* Question List */}
            {active.questions.map((q, idx) => {
              const isAnswered = answers[q.id] !== undefined;
              return (
                <div key={q.id} className="space-y-3 p-4 rounded-2xl bg-slate-50/70 dark:bg-ink-950/60 border border-slate-200/80 dark:border-ink-800/80">
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center justify-between">
                    <span>{idx + 1}. {hi ? q.textHi : q.text}</span>
                    {isAnswered && <Check className="w-4 h-4 text-teal-600 shrink-0" />}
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {q.options.map((opt) => {
                      const selected = answers[q.id] === opt.score;
                      return (
                        <button
                          key={opt.score}
                          onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: opt.score }))}
                          className={`text-xs font-semibold px-3 py-2.5 rounded-xl border transition-all ${
                            selected
                              ? 'bg-teal-600 text-white border-teal-600 shadow-sm scale-[1.02]'
                              : 'bg-white dark:bg-ink-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-ink-700 hover:border-teal-400'
                          }`}
                        >
                          {hi ? opt.labelHi : opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            <button
              onClick={() => setSubmitted(true)}
              disabled={!allAnswered}
              className="w-full bg-teal-600 hover:bg-teal-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm py-3.5 rounded-xl shadow-lg transition-all"
            >
              {hi ? 'क्लिनिकल परिणाम और स्कोर देखें' : 'Calculate & View Clinical Result'}
            </button>
          </div>
        ) : (
          band && (
            <div className="space-y-6 animate-in fade-in duration-300">
              {/* Outcome Card */}
              <div className={`rounded-2xl border p-6 space-y-3 shadow-md ${TONE_STYLES[band.tone].className}`}>
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full ${TONE_STYLES[band.tone].badgeClass}`}>
                    {hi ? 'क्लिनिकल परिणाम' : 'Triage Assessment Result'}
                  </span>
                  <span className="font-mono text-sm font-bold">Total Score: {score}/12</span>
                </div>
                <h3 className="font-display font-bold text-xl">{hi ? band.labelHi : band.label}</h3>
                <p className="text-sm leading-relaxed">{hi ? band.guidanceHi : band.guidance}</p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  onClick={reset}
                  className="inline-flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-ink-700 px-4 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-ink-800 transition-colors"
                >
                  <RotateCcw className="w-4 h-4" /> {hi ? 'पुनः जांच करें' : 'Retake Check'}
                </button>

                <button
                  onClick={saveResultToSymptomLog}
                  disabled={savedToLog}
                  className={`inline-flex items-center gap-2 text-xs font-bold px-4 py-2.5 rounded-xl transition-all ${
                    savedToLog
                      ? 'bg-teal-800 text-teal-200 cursor-default'
                      : 'bg-teal-600 hover:bg-teal-500 text-white shadow-md'
                  }`}
                >
                  <Save className="w-4 h-4" />
                  {savedToLog
                    ? (hi ? 'लक्षण लॉग में सहेजा गया ✓' : 'Saved to Symptom Log ✓')
                    : (hi ? 'लक्षण लॉग में सहेजें' : 'Save to Symptom Log')}
                </button>

                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-2 text-xs font-bold border border-slate-200 dark:border-ink-700 text-slate-700 dark:text-slate-200 px-4 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-ink-800"
                >
                  <Printer className="w-4 h-4" /> {hi ? 'प्रिंट सारांश' : 'Print Summary'}
                </button>

                {band.tone === 'emergency' && (
                  <Link
                    href="/emergency"
                    className="inline-flex items-center gap-2 text-xs font-bold bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-xl shadow-md"
                  >
                    <ShieldAlert className="w-4 h-4" /> {hi ? 'आपातकालीन कार्ड खोलें' : 'Open Emergency Card'}
                  </Link>
                )}
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
};
