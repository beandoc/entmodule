'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ClipboardCheck, Ear, Waves, Wind, ArrowLeft, RotateCcw, ArrowRight, CheckCircle2,
  AlertTriangle, ShieldAlert, Printer, Save, Check, Smartphone, ExternalLink, Download,
  ShieldCheck, Building2, UserCheck, Send, FileText, Lock, CheckCircle, RefreshCw
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

const AUTHORIZED_HOSPITALS = [
  {
    id: 'command-pune',
    name: 'Command Hospital (SC), Pune',
    nameHi: 'कमांड अस्पताल (दक्षिणी कमान), पुणे',
    dept: 'Department of Otorhinolaryngology (ENT)',
    doctors: [
      { id: 'doc-1', name: 'Dr. Col. A.K. Sharma', role: 'Senior ENT & Skull Base Consultant', hprId: 'HPR-IN-884920' },
      { id: 'doc-2', name: 'Dr. Lt. Col. S. Gupta', role: 'Otologist & Cochlear Implant Specialist', hprId: 'HPR-IN-772910' },
    ],
  },
  {
    id: 'base-delhi',
    name: 'Base Hospital, New Delhi',
    nameHi: 'बेस अस्पताल, नई दिल्ली',
    dept: 'Department of ENT & Head-Neck Surgery',
    doctors: [
      { id: 'doc-3', name: 'Dr. Col. R.K. Varma', role: 'Head of ENT Department', hprId: 'HPR-IN-910244' },
      { id: 'doc-4', name: 'Dr. Maj. V. Gaurav', role: 'Rhinology & FESS Surgeon', hprId: 'HPR-IN-987654' },
    ],
  },
];

export const SelfAssessment: React.FC = () => {
  const { locale } = useAppData();
  const hi = locale === 'hi';
  const [activeId, setActiveId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [savedToLog, setSavedToLog] = useState(false);

  // ABHA Export Modal state
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedHospitalId, setSelectedHospitalId] = useState('command-pune');
  const [selectedDoctorId, setSelectedDoctorId] = useState('doc-1');
  const [abhaNumber, setAbhaNumber] = useState('91-4821-9034-7712');
  const [abhaAddress, setAbhaAddress] = useState('sachin.srivastava@abdm');
  const [consentConfirmed, setConsentConfirmed] = useState(false);
  const [transmitting, setTransmitting] = useState(false);
  const [shareSuccess, setShareSuccess] = useState<any | null>(null);

  const active = ASSESSMENTS.find((a) => a.id === activeId) || null;
  const currentHospital = AUTHORIZED_HOSPITALS.find((h) => h.id === selectedHospitalId) || AUTHORIZED_HOSPITALS[0];
  const currentDoctor = currentHospital.doctors.find((d) => d.id === selectedDoctorId) || currentHospital.doctors[0];

  const reset = () => {
    setAnswers({});
    setSubmitted(false);
    setSavedToLog(false);
    setShareSuccess(null);
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

  const handleDownloadPdf = () => {
    window.print();
  };

  const handleTransmitHl7Fhir = () => {
    if (!consentConfirmed) {
      alert(hi ? 'कृपया ट्रांसमिशन से पहले सहमति टिक करें।' : 'Please confirm your authorization consent before transmitting.');
      return;
    }
    setTransmitting(true);
    setTimeout(() => {
      const timestamp = new Date().toISOString();
      const txId = `HL7-ORU-${Date.now().toString().slice(-6)}`;
      const fhirId = `QuestionnaireResponse/QR-${Math.floor(100000 + Math.random() * 900000)}`;

      setShareSuccess({
        txId,
        fhirId,
        timestamp,
        hospital: currentHospital.name,
        doctor: currentDoctor.name,
        doctorRole: currentDoctor.role,
        hprId: currentDoctor.hprId,
        score,
        assessmentTitle: active?.title,
        triageBand: band?.label,
      });
      setTransmitting(false);
    }, 1200);
  };

  if (!active) {
    return (
      <div className="space-y-6 pb-10 page-enter">
        <div className="page-title-block">
          <div className="page-title-icon">
            <ClipboardCheck className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-display font-bold text-xl text-slate-900 dark:text-white">
              {hi ? 'रोगी स्व-मूल्यांकन फॉर्म' : 'Patient Self-Assessment Forms'}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {hi
                ? 'दो मिनट के गाइडेड चेक जिन्हें भरकर आप पीडीएफ डाउनलोड कर सकते हैं या सीधे अपने अधिकृत अस्पताल (Command Hospital SC Pune / Base Hospital New Delhi) को एबीएचए और एचएल7 द्वारा साझा कर सकते हैं।'
                : 'Audited clinical questionnaires with real-time scoring. Fill out, download a PDF summary, or authorize direct HL7/FHIR export to Command Hospital SC Pune or Base Hospital New Delhi via ABHA.'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {ASSESSMENTS.map((a) => {
            const Icon = a.icon;
            return (
              <button
                key={a.id}
                onClick={() => start(a.id)}
                className="group text-left card card-animated p-6 flex flex-col justify-between hover:border-[#1b3662] dark:hover:border-sky-500"
              >
                <div className="space-y-3">
                  <span className="w-12 h-12 rounded-2xl bg-[#1b3662]/10 dark:bg-slate-800 text-[#1b3662] dark:text-sky-300 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Icon className="w-6 h-6" />
                  </span>
                  <h3 className="font-display font-bold text-base text-slate-900 dark:text-white group-hover:text-[#1b3662] dark:group-hover:text-sky-300 transition-colors">
                    {hi ? a.titleHi : a.title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    {hi ? a.descriptionHi : a.description}
                  </p>
                </div>

                <div className="mt-6 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-[#1b3662] dark:text-sky-300">
                  <span>{hi ? 'फॉर्म भरें' : 'Fill Form'}</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </button>
            );
          })}
        </div>

        {/* WHO hearWHO App Banner */}
        <div className="rounded-3xl bg-[#1b3662] text-white p-6 shadow-xl border border-blue-900 flex flex-col md:flex-row items-center justify-between gap-6 card-animated">
          <div className="flex items-center gap-5 flex-1">
            <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/20 text-sky-300 flex items-center justify-center shrink-0 shadow-inner">
              <Smartphone className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-sky-300 bg-blue-950 px-2.5 py-0.5 rounded-full border border-blue-800">
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
              className="btn-navy text-xs"
            >
              <Download className="w-4 h-4" />
              {hi ? 'गूगल प्ले (Android)' : 'Google Play'}
              <ExternalLink className="w-3.5 h-3.5 ml-1" />
            </a>
            <a
              href="https://apps.apple.com/us/app/hearwho-check-your-hearing/id1449966543"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-outline text-xs text-white border-blue-700 hover:text-white"
            >
              <Download className="w-4 h-4 text-sky-300" />
              {hi ? 'एप स्टोर (iOS)' : 'App Store (iOS)'}
              <ExternalLink className="w-3.5 h-3.5 ml-1" />
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-10 page-enter">
      <button
        onClick={() => setActiveId(null)}
        className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-[#1b3662] dark:hover:text-sky-300 transition-colors no-print"
      >
        <ArrowLeft className="w-4 h-4" /> {hi ? 'सभी स्व-मूल्यांकन फॉर्म पर लौटें' : 'Back to all assessments'}
      </button>

      {/* Printable Report Wrapper */}
      <div id="printable-assessment-report" className="card p-6 sm:p-8 space-y-6">

        {/* Printable Header (Visible during Print & Preview) */}
        <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-widest text-[#1b3662] dark:text-sky-400 font-mono">
                  GUNJAN ENT MODULE · PATIENT ASSESSMENT
                </span>
              </div>
              <h2 className="font-display font-bold text-xl sm:text-2xl text-slate-900 dark:text-white mt-1">
                {hi ? active.titleHi : active.title}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {hi ? active.descriptionHi : active.description}
              </p>
            </div>
            <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 shrink-0 no-print">
              {answeredCount} / {active.questions.length} {hi ? 'उत्तर दिए' : 'Answered'}
            </span>
          </div>

          {/* Patient Details Sub-header (Shown in Print and Completed state) */}
          {submitted && (
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-sans">Patient Name</span>
                <strong className="text-slate-900 dark:text-white font-bold">Sachin Srivastava</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-sans">MRN / ABHA</span>
                <strong className="text-slate-900 dark:text-white">MRN-2026-8842</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-sans">Assessment Date</span>
                <strong className="text-slate-900 dark:text-white">{new Date().toLocaleDateString('en-IN')}</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-sans">Total Score</span>
                <strong className="text-[#1b3662] dark:text-sky-300 font-bold">{score} / 12</strong>
              </div>
            </div>
          )}
        </div>

        {!submitted ? (
          <div className="space-y-6">
            {/* Question List */}
            {active.questions.map((q, idx) => {
              const isAnswered = answers[q.id] !== undefined;
              return (
                <div key={q.id} className="space-y-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800">
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center justify-between">
                    <span>{idx + 1}. {hi ? q.textHi : q.text}</span>
                    {isAnswered && <Check className="w-4 h-4 text-emerald-600 shrink-0" />}
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
                              ? 'bg-[#1b3662] text-white border-[#1b3662] shadow-sm'
                              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-[#1b3662]'
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
              className="w-full btn-navy justify-center text-sm py-3.5 rounded-xl shadow-lg disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {hi ? 'परिणाम देखें और पीडीएफ/अस्पताल निर्यात विकल्प पाएं' : 'Calculate Score & Generate Report'}
            </button>
          </div>
        ) : (
          band && (
            <div className="space-y-6 animate-in fade-in duration-300">
              {/* Triage Outcome Card */}
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

              {/* Questionnaire Breakdown Summary (Printable) */}
              <div className="space-y-2 pt-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono">
                  {hi ? 'उत्तर सारांश' : 'Questionnaire Response Summary'}
                </h4>
                <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden text-xs">
                  {active.questions.map((q, idx) => {
                    const ansScore = answers[q.id] ?? 0;
                    const optObj = q.options.find(o => o.score === ansScore);
                    return (
                      <div key={q.id} className="p-3 bg-white dark:bg-slate-900 flex items-center justify-between gap-4">
                        <span className="text-slate-700 dark:text-slate-300 font-medium">
                          {idx + 1}. {hi ? q.textHi : q.text}
                        </span>
                        <span className="font-bold font-mono text-[#1b3662] dark:text-sky-300 shrink-0 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                          {hi ? optObj?.labelHi : optObj?.label} ({ansScore} pts)
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="flex flex-wrap items-center gap-3 pt-2 no-print">
                <button
                  onClick={reset}
                  className="btn-outline text-xs"
                >
                  <RotateCcw className="w-4 h-4" /> {hi ? 'पुनः जांच करें' : 'Retake Check'}
                </button>

                <button
                  onClick={saveResultToSymptomLog}
                  disabled={savedToLog}
                  className={`btn-navy text-xs ${savedToLog ? 'bg-emerald-700 hover:bg-emerald-700 cursor-default' : ''}`}
                >
                  <Save className="w-4 h-4" />
                  {savedToLog
                    ? (hi ? 'लक्षण लॉग में सहेजा गया ✓' : 'Saved to Symptom Log ✓')
                    : (hi ? 'लक्षण लॉग में सहेजें' : 'Save to Symptom Log')}
                </button>

                <button
                  onClick={handleDownloadPdf}
                  className="btn-outline text-xs border-[#1b3662] text-[#1b3662] dark:text-sky-300 dark:border-sky-500"
                >
                  <Download className="w-4 h-4" />
                  {hi ? 'पीडीएफ डाउनलोड / प्रिंट' : 'Download PDF / Print Report'}
                </button>

                <button
                  onClick={() => setShowShareModal(true)}
                  className="btn-navy text-xs bg-emerald-700 hover:bg-emerald-800 text-white border-emerald-600 shadow-md"
                >
                  <ShieldCheck className="w-4 h-4" />
                  {hi ? 'एबीएचए द्वारा अस्पताल साझा करें (HL7 / FHIR)' : 'Authorize & Export to Hospital (ABHA / HL7)'}
                </button>

                {band.tone === 'emergency' && (
                  <Link
                    href="/emergency"
                    className="btn-navy text-xs bg-red-700 hover:bg-red-800 text-white"
                  >
                    <ShieldAlert className="w-4 h-4" /> {hi ? 'आपातकालीन कार्ड खोलें' : 'Open Emergency Card'}
                  </Link>
                )}
              </div>

              {/* Share Confirmation Banner if already shared */}
              {shareSuccess && (
                <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-sm text-emerald-800 dark:text-emerald-300">
                    <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                    {hi ? 'एचएल7 / एफएचआईआर ट्रांसमिशन सफल!' : 'HL7 v2 / FHIR Bundle Transmitted & Authorized Successfully!'}
                  </div>
                  <p className="text-xs leading-relaxed text-emerald-800 dark:text-emerald-300">
                    Your assessment has been authorized via <strong>ABHA ({abhaNumber})</strong> and transmitted to <strong>{shareSuccess.hospital}</strong> for <strong>{shareSuccess.doctor} ({shareSuccess.hprId})</strong>.
                  </p>
                  <div className="flex flex-wrap gap-3 text-[11px] font-mono pt-1 text-emerald-700 dark:text-emerald-400">
                    <span>Tx ID: <strong>{shareSuccess.txId}</strong></span>
                    <span>FHIR: <strong>{shareSuccess.fhirId}</strong></span>
                    <span>Status: <strong className="text-emerald-600">200 OK (HIS ACK)</strong></span>
                  </div>
                </div>
              )}
            </div>
          )
        )}
      </div>

      {/* ─── ABHA & HL7 / FHIR AUTHORIZATION MODAL ───────────────────────── */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-6 animate-in fade-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <span className="badge badge-green mb-1">
                  <Lock className="w-3 h-3 inline mr-1" /> ABDM & HL7 v2 Compliant
                </span>
                <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white">
                  {hi ? 'अस्पताल को एबीएचए और एचएल7 द्वारा साझा करें' : 'Authorize & Export Self-Assessment via ABHA'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {hi
                    ? 'अपने अधिकृत अस्पताल और डॉक्टर को अपना स्व-मूल्यांकन परिणाम साझा करें।'
                    : 'Authorize direct HL7 v2 ORU / FHIR QuestionnaireResponse export to your treating hospital HIS.'}
                </p>
              </div>
              <button
                onClick={() => setShowShareModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm font-bold p-1"
              >
                ✕
              </button>
            </div>

            {!shareSuccess ? (
              <div className="space-y-4">
                {/* 1. Target Authorized Hospital */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-[#1b3662] dark:text-sky-400" />
                    {hi ? '1. अधिकृत अस्पताल चुनें' : '1. Target Authorized Hospital'}
                  </label>
                  <select
                    value={selectedHospitalId}
                    onChange={(e) => {
                      setSelectedHospitalId(e.target.value);
                      const h = AUTHORIZED_HOSPITALS.find(item => item.id === e.target.value);
                      if (h && h.doctors.length > 0) setSelectedDoctorId(h.doctors[0].id);
                    }}
                    className="input-field"
                  >
                    {AUTHORIZED_HOSPITALS.map((h) => (
                      <option key={h.id} value={h.id}>
                        {hi ? h.nameHi : h.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-slate-500">{currentHospital.dept}</p>
                </div>

                {/* 2. Target Doctor Selection */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-[#1b3662] dark:text-sky-400" />
                    {hi ? '2. अधिकृत डॉक्टर चुनें' : '2. Authorized Treating Doctor'}
                  </label>
                  <select
                    value={selectedDoctorId}
                    onChange={(e) => setSelectedDoctorId(e.target.value)}
                    className="input-field"
                  >
                    {currentHospital.doctors.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} — {d.role} ({d.hprId})
                      </option>
                    ))}
                  </select>
                </div>

                {/* 3. ABHA Identity Verification */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">ABHA Number</label>
                    <input
                      type="text"
                      value={abhaNumber}
                      onChange={(e) => setAbhaNumber(e.target.value)}
                      className="input-field font-mono text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">ABHA Address</label>
                    <input
                      type="text"
                      value={abhaAddress}
                      onChange={(e) => setAbhaAddress(e.target.value)}
                      className="input-field font-mono text-xs"
                    />
                  </div>
                </div>

                {/* 4. Mandatory Consent Checkbox */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2">
                  <label className="flex items-start gap-2.5 cursor-pointer text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                    <input
                      type="checkbox"
                      checked={consentConfirmed}
                      onChange={(e) => setConsentConfirmed(e.target.checked)}
                      className="mt-0.5 accent-[#1b3662] w-4 h-4 rounded shrink-0"
                    />
                    <span>
                      {hi
                        ? `मैं धनवंतरी डिजिटल हेल्थ प्लेटफॉर्म को यह स्व-मूल्यांकन परिणाम ${currentHospital.name} के ${currentDoctor.name} को एबीएचए और एचएल7 बीआईडी द्वारा साझा करने के लिए अधिकृत करता हूं।`
                        : `I authorize Dhanwantari Health Platform to generate and transmit an HL7 v2 ORU / FHIR QuestionnaireResponse bundle of this self-assessment to ${currentHospital.name} for review by ${currentDoctor.name} (${currentDoctor.hprId}).`}
                    </span>
                  </label>
                </div>

                {/* Submit Transmission */}
                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    onClick={() => setShowShareModal(false)}
                    className="btn-outline text-xs"
                  >
                    {hi ? 'रद्द करें' : 'Cancel'}
                  </button>
                  <button
                    onClick={handleTransmitHl7Fhir}
                    disabled={transmitting || !consentConfirmed}
                    className="btn-navy text-xs bg-emerald-700 hover:bg-emerald-800 text-white disabled:opacity-40"
                  >
                    {transmitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        {hi ? 'एचएल7 ट्रांसमिट हो रहा है…' : 'Transmitting HL7 Payload…'}
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        {hi ? 'अस्पताल को ट्रांसमिट करें' : 'Transmit HL7 / FHIR to HIS'}
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              /* Success Certificate View */
              <div className="space-y-5 py-2">
                <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-center space-y-2">
                  <CheckCircle className="w-10 h-10 text-emerald-600 mx-auto" />
                  <h4 className="font-bold text-base text-emerald-900 dark:text-emerald-200">
                    {hi ? 'डिजिटल स्वास्थ्य ट्रांसमिशन अधिकृत!' : 'Digital Health Transmission Authorized!'}
                  </h4>
                  <p className="text-xs text-emerald-800 dark:text-emerald-300">
                    HL7 v2 ORU^R01 observation message & FHIR QuestionnaireResponse successfully acknowledged by <strong>{shareSuccess.hospital}</strong>.
                  </p>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/80 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2 text-xs font-mono">
                  <div className="flex justify-between border-b border-slate-200 dark:border-slate-700 pb-1.5">
                    <span className="text-slate-500">Target Hospital:</span>
                    <span className="font-bold text-slate-900 dark:text-white">{shareSuccess.hospital}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200 dark:border-slate-700 pb-1.5">
                    <span className="text-slate-500">Authorized Doctor:</span>
                    <span className="font-bold text-slate-900 dark:text-white">{shareSuccess.doctor} ({shareSuccess.hprId})</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200 dark:border-slate-700 pb-1.5">
                    <span className="text-slate-500">ABHA Number:</span>
                    <span className="text-slate-900 dark:text-white">{abhaNumber}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200 dark:border-slate-700 pb-1.5">
                    <span className="text-slate-500">HL7 Tx ID:</span>
                    <span className="text-slate-900 dark:text-white">{shareSuccess.txId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">HIS Response:</span>
                    <span className="text-emerald-600 font-bold">200 OK (MSH-ACK Received)</span>
                  </div>
                </div>

                <button
                  onClick={() => setShowShareModal(false)}
                  className="w-full btn-navy justify-center text-xs py-3"
                >
                  {hi ? 'बंद करें' : 'Done & Return'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
