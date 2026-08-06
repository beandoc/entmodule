'use client';

import React, { useState } from 'react';
import {
  Building2, ShieldCheck, Stethoscope, Ear, FileText, PhoneCall,
  Clock, CheckCircle2, AlertCircle, ArrowRight, Award, HelpCircle,
  ChevronRight, Bookmark, Calendar, UserCheck, Activity, Printer, Sparkles, Wind,
  ShieldAlert, AlertTriangle, X, Check, Eye, Info
} from 'lucide-react';
import { useAppData } from '@/lib/app-data-context';

export interface PlannedVisit {
  id: string;
  type: 'surgery' | 'opd';
  title: string;
  titleHi: string;
  date: string;
  location: string;
  doctor: string;
  status: string;
  preOpInstructions: string[];
  preOpInstructionsHi: string[];
  postOpInstructions: string[];
  postOpInstructionsHi: string[];
}

export const CommandHospitalCare: React.FC = () => {
  const { locale } = useAppData();
  const hi = locale === 'hi';
  const [activeTab, setActiveTab] = useState<'roster' | 'appointment' | 'echs' | 'mhcp'>('appointment');

  // Selected visit for Pre-Op / Post-Op instructions modal
  const [selectedVisit, setSelectedVisit] = useState<PlannedVisit | null>(null);

  // Appointment Form State
  const [formData, setFormData] = useState({
    serviceNo: '',
    rankCategory: 'Serving Officer',
    patientName: '',
    phone: '',
    subSpecialty: 'General ENT OPD',
    preferredDate: '',
    symptoms: '',
  });

  const [appointmentSlip, setAppointmentSlip] = useState<{
    tokenId: string;
    date: string;
    serviceNo: string;
    patientName: string;
    clinic: string;
    timeSlot: string;
  } | null>(null);

  const emergencyHelpline = '987654321';

  const hospitalContact = {
    entOpdLocation: hi ? 'कमांड अस्पताल (ईएनटी कॉम्प्लेक्स, प्रथम तल)' : 'Command Hospital (ENT Complex, 1st Floor)',
    opdDays: hi ? 'मंगलवार एवं शुक्रवार (Tuesday & Friday)' : 'Tuesday & Friday',
    opdTiming: hi ? '08:00 AM - 01:30 PM (टोकन कटऑफ: 11:30 AM)' : '08:00 AM - 01:30 PM (Registration Cutoff: 11:30 AM)',
    emergency: '+91-11-2569-0000 (ENT Casualty 24/7)',
    audiologyLab: 'Ext. 4412 / Room 108',
  };

  const plannedVisits: PlannedVisit[] = [
    {
      id: 'visit-1',
      type: 'surgery',
      title: 'Right Tympanoplasty & Ossiculoplasty',
      titleHi: 'दाएं कान की टिम्पैनोप्लास्टी सर्जरी',
      date: 'Aug 18, 2026 (Tuesday OT)',
      location: 'Command Hospital OT Suite 4',
      doctor: 'Col S. K. Dutta (Sr ENT Specialist)',
      status: hi ? 'ओटी शेड्यूल स्वीकृत' : 'Scheduled OT',
      preOpInstructions: [
        'Strict NPO (No food or water) from 12:00 midnight before surgery day.',
        'Shampoo hair thoroughly with antibacterial soap the evening before surgery.',
        'Stop blood thinners (Aspirin/Clopidogrel) 5 days prior after consulting cardiologist.',
        'Bring all HRCT Temporal Bone X-ray films, Pure Tone Audiogram, and ECHS referral approval slip.',
        'Remove all ear rings, metal ornaments, and hair pins before entering OT.'
      ],
      preOpInstructionsHi: [
        'सर्जरी की रात 12:00 बजे के बाद कुछ भी न खाएं-पीएं (Strict NPO)।',
        'सर्जरी की पूर्व संध्या पर बालों को अच्छी तरह से शैम्पू से धोएं।',
        'कार्डियोलॉजिस्ट से परामर्श के बाद 5 दिन पहले एस्पिरिन/खून पतला करने वाली दवाएं रोक दें।',
        'सभी एचआरसीटी टेम्पोरल बोन फिल्में, ऑडियोग्राम और ईसीएचएस अप्रूवल स्लिप साथ लाएं।',
        'ओटी जाने से पहले सभी कान के आभूषण और बाल पिन निकाल दें।'
      ],
      postOpInstructions: [
        'Keep operated ear strictly dry. Use Vaseline-coated cotton ball during shower.',
        'Never blow nose forcibly. Always sneeze with mouth wide open.',
        'Instill prescribed antibiotic ear drops exactly as directed after outer pad removal.',
        'Avoid air travel, swimming, or heavy weight lifting (>5 kg) for 4 to 6 weeks.',
        'Report immediately if facial asymmetry, severe bleeding, or high fever occurs.'
      ],
      postOpInstructionsHi: [
        'ऑपरेटेड कान को पूरी तरह सूखा रखें। नहाते समय वैसलीन लगा कॉटन प्लग इस्तेमाल करें।',
        'नाक को जोर से न छिड़कें। छींक आने पर मुंह हमेशा खुला रखें।',
        'बाहरी पैड हटने के बाद निर्धारित एंटीबायोटिक ड्रॉप्स नियमित रूप से डालें।',
        '4-6 सप्ताह तक हवाई यात्रा, तैराकी या भारी वजन (5 किग्रा+) उठाने से बचें।',
        'चेहरे में टेढ़ापन, अत्यधिक रक्तस्राव या तेज बुखार होने पर तुरंत सूचित करें।'
      ]
    },
    {
      id: 'visit-2',
      type: 'opd',
      title: 'Post-FESS Follow-up & Nasal Endoscopy',
      titleHi: 'पोस्ट-FESS फॉलो-अप एवं नेज़ल एंडोस्कोपी',
      date: 'Aug 21, 2026 (Friday OPD)',
      location: 'Command Hospital ENT OPD Room 106',
      doctor: 'Lt Col P. Sharma (Rhinology Specialist)',
      status: hi ? 'ओपीडी अपॉइंटमेंट कन्फर्म' : 'Confirmed OPD',
      preOpInstructions: [
        'Perform morning saline nasal rinse 1 hour prior to appointment.',
        'Do not use steroid spray on the morning of endoscopic debridement.',
        'Bring your post-op symptom diary and previous CT Paranasal Sinuses report.'
      ],
      preOpInstructionsHi: [
        'अपॉइंटमेंट से 1 घंटा पहले सुबह सेलाइन नेज़ल रिंस (धुलाई) पूरा करें।',
        'एंडोस्कोपिक सफाई की सुबह स्टेरॉयड स्प्रे का उपयोग न करें।',
        'अपनी लक्षण डायरी और पिछली सीटी रिपोर्ट साथ लाएं।'
      ],
      postOpInstructions: [
        'Continue hypertonic saline rinse 3 times daily after endoscopic cleaning.',
        'Apply steroid nasal spray aiming towards outer corner of eye.',
        'Avoid dust exposure and wear a mask when going outdoors.'
      ],
      postOpInstructionsHi: [
        'एंडोस्कोपिक सफाई के बाद दिन में 3 बार सेलाइन रिंस जारी रखें।',
        'नेज़ल स्टेरॉयड स्प्रे को आंख के बाहरी कोने की दिशा में लगाएं।',
        'धूल के संपर्क से बचें और बाहर जाते समय मास्क पहनें।'
      ]
    },
    {
      id: 'visit-3',
      type: 'opd',
      title: 'Digital Hearing Aid Trial & Audiometry',
      titleHi: 'डिजिटल हियरिंग ऐड ट्रायल व ऑडियोमेट्री',
      date: 'Aug 25, 2026 (Tuesday OPD)',
      location: 'Command Hospital Audiology Lab (Room 108)',
      doctor: 'Dr. A. Verma (Audiologist)',
      status: hi ? 'ऑडियोलॉजी स्लॉट बुक' : 'Audiology Slot Booked',
      preOpInstructions: [
        'Ensure ears are free of impacted earwax (wax clearance at OPD prior if needed).',
        'Avoid loud noise exposure 14 hours prior to Pure Tone Audiometry testing.',
        'Bring ECHS Card and referral form for hearing aid sanction.'
      ],
      preOpInstructionsHi: [
        'सुनिश्चित करें कि कान में वैक्स (खूंट) जमा न हो।',
        'ऑडियोमेट्री टेस्ट से 14 घंटे पहले तेज आवाज के संपर्क से बचें।',
        'ईसीएचएस कार्ड और रेफरल फॉर्म साथ लाएं।'
      ],
      postOpInstructions: [
        'Wear digital hearing aid for 2-4 hours daily during initial adaptation week.',
        'Keep hearing aid dry and store in dehumidifier box overnight.',
        'Schedule fine-tuning mapping session after 14 days of use.'
      ],
      postOpInstructionsHi: [
        'शुरुआती सप्ताह में प्रतिदिन 2-4 घंटे डिजिटल हियरिंग ऐड पहनें।',
        'हियरिंग ऐड को सूखा रखें और रात में डिह्यूमिडिफायर बॉक्स में स्टोर करें।',
        '14 दिनों के उपयोग के बाद फाइन-ट्यूनिंग मैपिंग सत्र निर्धारित करें।'
      ]
    }
  ];

  const redFlags = [
    { title: hi ? 'नाक, कान या स्टोमा से अत्यधिक रक्तस्राव' : 'Severe Active Bleeding', desc: hi ? 'कान, नाक या सांस की नली (Stoma) से लगातार तेज लाल खून बहना।' : 'Continuous bright red hemorrhage from ear, nose, or tracheostomy stoma.' },
    { title: hi ? 'सांस लेने में अत्यधिक तकलीफ (Stridor)' : 'Acute Airway Distress / Stridor', desc: hi ? 'सीटी की आवाज के साथ सांस घुटना या ट्रैकिओस्टॉमी ट्यूब का बंद होना।' : 'High-pitched noisy breathing or blocked tracheostomy airway tube.' },
    { title: hi ? 'चेहरे का लकवा या टेढ़ापन (Facial Palsy)' : 'Sudden Facial Nerve Weakness', desc: hi ? 'कान की सर्जरी के बाद आंख बंद न होना या मुंह का टेढ़ा होना।' : 'Inability to close eye or facial asymmetry following ear surgery.' },
    { title: hi ? 'तेज बुखार, गर्दन में अकड़न व सिरदर्द' : 'High Fever with Stiff Neck', desc: hi ? '102°F से अधिक बुखार और गर्दन हिलाने में तेज दर्द।' : 'Fever >102°F with neck stiffness, suggesting intracranial spread.' },
    { title: hi ? 'अचानक पूर्ण बहरापन या हिंसक चक्कर' : 'Sudden Sensorineural Hearing Loss', desc: hi ? 'कान में अचानक पूरी आवाज बंद होना या उल्टी के साथ तेज चक्कर।' : 'Sudden loss of hearing in one ear or sudden severe rotatory vertigo with emesis.' }
  ];

  const facilities = [
    { id: 'audiology', title: hi ? 'ऑडियोलॉजी एवं स्पीच लैब' : 'Audiology & Speech Rehab Lab', desc: hi ? 'PTA, BERA, ASSR, OAE, Tympanometry व Hearing Aid ट्रायल।' : 'Pure Tone Audiometry, BERA, ASSR, OAE, Tympanometry, and Digital Hearing Aid trial.', icon: Ear, room: 'Room 108' },
    { id: 'otology', title: hi ? 'माइक्रो-ऑटोलॉजी व कॉक्लियर इम्प्लांट' : 'Micro-Otology & Cochlear Suite', desc: hi ? 'टिम्पैनोप्लास्टी, मास्टॉइडेक्टॉमी व DGAFMS स्वीकृत कॉक्लियर इम्प्लांट।' : 'Tympanoplasty, Mastoidectomy, Stapedectomy, and Cochlear Implant surgery.', icon: Stethoscope, room: 'OT Suite 4' },
    { id: 'fess', title: hi ? 'एंडोस्कोपिक साइनस व स्कल बेस' : 'Endoscopic Sinus Suite (FESS)', desc: hi ? 'एफईएसएस, सेप्टोप्लास्टी, पिट्यूटरी सर्जरी व सीएसएफ लीक।' : 'FESS, Septoplasty, Pituitary Adenoma surgery, and CSF leak repair.', icon: Wind, room: 'OT Suite 5' },
    { id: 'vertigo', title: hi ? 'चक्कर एवं संतुलन क्लिनिक' : 'Vertigo & Balance Clinic', desc: hi ? 'VNG टेस्ट, एपली पैंतरा और वेस्टिबुलर पुनर्वास व्यायाम।' : 'VNG testing, Epley positioning for BPPV, and Vestibular Rehabilitation.', icon: Activity, room: 'Room 112 (Tue & Fri)' },
    { id: 'headneck', title: hi ? 'हेड एवं नेक सर्जिकल ऑन्कोलॉजी' : 'Head & Neck Surgical Suite', desc: hi ? 'लारिंजेक्टॉमी, थायरॉइड, स्टोमा केयर व वॉयस थेरेपी।' : 'Laryngectomy, Thyroidectomy, Tracheostomy care, and Voice Rehabilitation.', icon: ShieldCheck, room: 'Room 115' },
  ];

  const handleAppointmentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.serviceNo || !formData.patientName || !formData.phone || !formData.preferredDate) {
      alert(hi ? 'कृपया सभी आवश्यक फ़ील्ड भरें' : 'Please fill out all required fields.');
      return;
    }

    const tokenNum = `CH-ENT-${Math.floor(1000 + Math.random() * 9000)}`;
    setAppointmentSlip({
      tokenId: tokenNum,
      date: formData.preferredDate,
      serviceNo: formData.serviceNo,
      patientName: formData.patientName,
      clinic: formData.subSpecialty,
      timeSlot: '08:30 AM - 10:30 AM (Room 106)',
    });
  };

  return (
    <div className="space-y-6 page-enter">
      {/* Banner */}
      <div className="bg-[#0f1d38] bg-gradient-to-r from-navy-900 via-navy-800 to-slate-900 rounded-2xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden border border-navy-700">
        <div className="absolute -right-10 -bottom-10 opacity-10 pointer-events-none">
          <Building2 className="w-64 h-64 text-white" />
        </div>
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/40 text-blue-200 text-xs font-semibold backdrop-blur-sm">
            <ShieldCheck className="w-4 h-4 text-blue-300" />
            {hi ? 'सशस्त्र बल चिकित्सा सेवा (AFMS) · कमांड अस्पताल' : 'Armed Forces Medical Services · Command Hospital'}
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white drop-shadow-sm">
            {hi ? 'ईएनटी ओपीडी अपॉइंटमेंट, सर्जरी निर्देश व इमरजेंसी' : 'Command Hospital ENT Appointment Portal & Surgical Care'}
          </h1>
          <p className="text-slate-200 text-xs md:text-sm leading-relaxed font-normal">
            {hi
              ? 'आगामी ओपीडी दौरे, निर्धारित सर्जरी के प्री-ऑप व पोस्ट-ऑप निर्देश, मंगलवार व शुक्रवार ओपीडी टोकन बुकिंग और 24/7 इमरजेंसी DMO हेल्पलाइन।'
              : 'Manage upcoming ENT visits, view pre-op & post-op surgical instructions, book Tuesday & Friday OPD tokens, and access 24/7 DMO Emergency Helpline.'}
          </p>
        </div>
      </div>

      {/* ─── RED FLAG EMERGENCY HELPLINE BANNER ──────────────── */}
      <div className="bg-[#450a0a] bg-gradient-to-r from-red-950 via-rose-950 to-slate-950 rounded-2xl p-5 md:p-6 border-2 border-red-600 shadow-2xl text-white space-y-5">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-red-800/80 pb-4">
          <div className="flex items-start gap-3.5">
            <div className="p-3 bg-red-600 rounded-xl text-white shrink-0 animate-pulse shadow-lg ring-4 ring-red-600/30">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-red-200 bg-red-900/70 border border-red-700/80 px-3 py-1 rounded-full mb-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                {hi ? 'आपातकालीन ईएनटी सहायता (24/7 Casualty)' : '24/7 ENT Emergency Triage'}
              </div>
              <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">
                {hi ? 'रेड-फ्लैग आपातकालीन हेल्पलाइन एवं DMO संपर्क' : 'Red-Flag Emergency Helpline & DMO Contact'}
              </h2>
            </div>
          </div>

          <a
            href={`tel:${emergencyHelpline}`}
            className="w-full md:w-auto px-6 py-3.5 bg-red-600 hover:bg-red-500 text-white font-black text-sm md:text-base rounded-xl transition-all shadow-xl flex items-center justify-center gap-2.5 border border-red-400 shrink-0 hover:scale-105"
          >
            <PhoneCall className="w-5 h-5 fill-current animate-bounce" />
            {hi ? `DMO कॉल करें: ${emergencyHelpline}` : `Call DMO / Emergency: ${emergencyHelpline}`}
          </a>
        </div>

        <div className="space-y-3">
          <span className="text-xs font-extrabold uppercase tracking-wider text-red-200 block">
            {hi ? 'तत्काल ध्यान देने योग्य रेड-फ्लैग लक्षण (इमरजेंसी संकेत):' : 'Immediate Red-Flag Emergency Symptoms (Call DMO Immediately):'}
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
            {redFlags.map((flag, idx) => (
              <div key={idx} className="bg-red-900/50 hover:bg-red-900/70 p-3.5 rounded-xl border border-red-700/80 space-y-1.5 transition-colors shadow-sm">
                <p className="font-bold text-white text-xs sm:text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  {flag.title}
                </p>
                <p className="text-xs text-red-100 leading-relaxed font-normal">{flag.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Navigation Tabs */}
      <div className="flex border-b border-slate-200 space-x-4 text-sm font-medium">
        <button
          onClick={() => setActiveTab('appointment')}
          className={`pb-3 px-1 border-b-2 flex items-center gap-2 font-semibold transition-colors ${
            activeTab === 'appointment'
              ? 'border-navy-900 text-navy-900 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Calendar className="w-4 h-4 text-teal-600" />
          {hi ? 'आगामी दौरे व अपॉइंटमेंट पोर्टल' : 'Upcoming Visits & Book OPD'}
        </button>

        <button
          onClick={() => setActiveTab('roster')}
          className={`pb-3 px-1 border-b-2 flex items-center gap-2 font-semibold transition-colors ${
            activeTab === 'roster'
              ? 'border-navy-900 text-navy-900 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Building2 className="w-4 h-4" />
          {hi ? 'विभाग सुविधाएं व रोस्टर' : 'Facilities & Roster'}
        </button>

        <button
          onClick={() => setActiveTab('echs')}
          className={`pb-3 px-1 border-b-2 flex items-center gap-2 font-semibold transition-colors ${
            activeTab === 'echs'
              ? 'border-navy-900 text-navy-900 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Award className="w-4 h-4" />
          {hi ? 'ईसीएचएस एवं इम्प्लांट्स' : 'ECHS & Implants'}
        </button>

        <button
          onClick={() => setActiveTab('mhcp')}
          className={`pb-3 px-1 border-b-2 flex items-center gap-2 font-semibold transition-colors ${
            activeTab === 'mhcp'
              ? 'border-navy-900 text-navy-900 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Ear className="w-4 h-4" />
          {hi ? 'सैन्य श्रवण संरक्षण (MHCP)' : 'Military Hearing Program'}
        </button>
      </div>

      {/* TAB 1: Upcoming Visits, Pre/Post Op Instructions & Booking */}
      {activeTab === 'appointment' && (
        <div className="space-y-6">

          {/* ─── UPCOMING VISITS & PLANNED SURGERIES TIMELINE ─────── */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-teal-600" />
                  {hi ? 'आपके आगामी ओपीडी दौरे और निर्धारित सर्जरी' : 'Your Upcoming OPD Visits & Planned Surgeries'}
                </h2>
                <p className="text-xs text-slate-500">
                  {hi ? 'प्री-ऑप और पोस्ट-ऑप निर्देश देखने के लिए कार्ड पर क्लिक करें' : 'Click on any card to view detailed Pre-Op preparation and Post-Op care instructions.'}
                </p>
              </div>

              <span className="bg-teal-50 text-teal-800 text-xs font-bold px-3 py-1 rounded-full border border-teal-200">
                3 {hi ? 'शेड्यूल्ड गतिविधियां' : 'Active Schedules'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {plannedVisits.map((visit) => (
                <div
                  key={visit.id}
                  onClick={() => setSelectedVisit(visit)}
                  className={`p-5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between space-y-3 hover:shadow-md ${
                    visit.type === 'surgery'
                      ? 'bg-amber-50/50 border-amber-300 hover:border-amber-500'
                      : 'bg-teal-50/40 border-teal-200 hover:border-teal-400'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded uppercase tracking-wider ${
                        visit.type === 'surgery' ? 'bg-amber-200 text-amber-900' : 'bg-teal-200 text-teal-900'
                      }`}>
                        {visit.type === 'surgery' ? (hi ? 'सर्जरी / प्रक्रिया' : 'Planned Surgery') : (hi ? 'ओपीडी दौरा' : 'OPD Consultation')}
                      </span>
                      <span className="text-[11px] font-bold text-slate-500">{visit.status}</span>
                    </div>

                    <h3 className="font-bold text-slate-900 text-sm line-clamp-2">
                      {hi ? visit.titleHi : visit.title}
                    </h3>

                    <div className="space-y-1 text-xs text-slate-600">
                      <p className="flex items-center gap-1.5 font-semibold text-navy-900">
                        <Calendar className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                        {visit.date}
                      </p>
                      <p className="text-[11px] text-slate-500">{visit.location}</p>
                      <p className="text-[11px] text-slate-500 font-medium">{visit.doctor}</p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs font-bold text-navy-900">
                    <span className="flex items-center gap-1 text-teal-700">
                      <Eye className="w-3.5 h-3.5" />
                      {hi ? 'प्री/पोस्ट निर्देश देखें' : 'View Instructions'}
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ─── OPD BOOKING FORM OR CONFIRMATION SLIP ────────────── */}
          {!appointmentSlip ? (
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-teal-600" />
                  {hi ? 'नया ओपीडी टोकन अनुरोध फॉर्म (मंगलवार व शुक्रवार)' : 'Request New OPD Consultation Token (Tuesday & Friday)'}
                </h2>
                <p className="text-xs text-slate-500">
                  {hi
                    ? 'कृपया केवल मंगलवार या शुक्रवार की तिथि चुनें। सेवारत कर्मी, भूतपूर्व सैनिक व ईसीएचएस लाभार्थी पात्र हैं।'
                    : 'Select preferred Tuesday or Friday. Available for Serving Personnel, Veterans, and ECHS Beneficiaries.'}
                </p>
              </div>

              <form onSubmit={handleAppointmentSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">
                    {hi ? 'सर्विस नं. / ईसीएचएस कार्ड नं. *' : 'Service No. / ECHS Card No. *'}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. IC-78412X or ECHS-884120"
                    value={formData.serviceNo}
                    onChange={(e) => setFormData({ ...formData, serviceNo: e.target.value })}
                    className="w-full p-2.5 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-teal-500 font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">
                    {hi ? 'श्रेणी / पद (Rank & Category) *' : 'Rank & Category *'}
                  </label>
                  <select
                    value={formData.rankCategory}
                    onChange={(e) => setFormData({ ...formData, rankCategory: e.target.value })}
                    className="w-full p-2.5 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="Serving Officer">Serving Officer / Personnel</option>
                    <option value="Ex-Serviceman (ECHS)">Ex-Serviceman (ECHS Veteran)</option>
                    <option value="Service Dependent (Spouse/Child)">Service Dependent (Spouse / Child)</option>
                    <option value="Defense Civilian">Defense Civilian Employee</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">
                    {hi ? 'मरीज का पूरा नाम *' : 'Patient Full Name *'}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sub Maj R. S. Sharma"
                    value={formData.patientName}
                    onChange={(e) => setFormData({ ...formData, patientName: e.target.value })}
                    className="w-full p-2.5 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">
                    {hi ? 'मोबाइल नंबर *' : 'Mobile Contact Number *'}
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="+91 9876543210"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full p-2.5 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">
                    {hi ? 'विशेष क्लिनिक (Sub-Specialty Clinic) *' : 'Sub-Specialty Clinic *'}
                  </label>
                  <select
                    value={formData.subSpecialty}
                    onChange={(e) => setFormData({ ...formData, subSpecialty: e.target.value })}
                    className="w-full p-2.5 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="General ENT OPD">General ENT OPD</option>
                    <option value="Otology & Hearing Loss Clinic">Otology & Hearing Loss Clinic</option>
                    <option value="Sinus & Allergy Clinic (FESS)">Sinus & Allergy Clinic (FESS)</option>
                    <option value="Vertigo & Balance Clinic">Vertigo & Balance Clinic</option>
                    <option value="Voice & Tracheostomy Clinic">Voice & Tracheostomy Clinic</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">
                    {hi ? 'पसंदीदा ओपीडी तिथि (केवल मंगलवार व शुक्रवार) *' : 'Preferred OPD Date (Tue or Fri Only) *'}
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.preferredDate}
                    onChange={(e) => setFormData({ ...formData, preferredDate: e.target.value })}
                    className="w-full p-2.5 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-teal-500 font-mono"
                  />
                </div>

                <div className="md:col-span-2 space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">
                    {hi ? 'मुख्य लक्षण / कारण (Chief Complaints)' : 'Reason for Visit / Chief Symptoms'}
                  </label>
                  <textarea
                    rows={3}
                    placeholder={hi ? 'उदा. 3 महीने से कान से पानी बहना, चक्कर आना या सुनने में कमी...' : 'e.g., Decreased hearing in left ear for 2 months, nasal blockage...'}
                    value={formData.symptoms}
                    onChange={(e) => setFormData({ ...formData, symptoms: e.target.value })}
                    className="w-full p-2.5 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <button
                    type="submit"
                    className="w-full py-3 bg-navy-900 hover:bg-navy-800 text-white font-bold text-sm rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
                  >
                    <UserCheck className="w-4 h-4 text-teal-400" />
                    {hi ? 'ओपीडी टोकन अनुरोध जमा करें' : 'Generate Command Hospital OPD Token Slip'}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            /* Generated Printable OPD Slip */
            <div className="bg-white rounded-xl border-2 border-navy-900 p-6 md:p-8 shadow-xl space-y-6 max-w-2xl mx-auto">
              <div className="border-b-2 border-navy-900 pb-4 text-center space-y-1">
                <span className="bg-navy-900 text-white text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider">
                  Official OPD Appointment Confirmation Slip
                </span>
                <h2 className="text-xl font-black text-navy-900 uppercase tracking-tight">
                  Command Hospital ENT OPD Token
                </h2>
                <p className="text-xs text-slate-600">Department of Otolaryngology & Head-Neck Surgery</p>
              </div>

              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Token ID</span>
                  <span className="font-mono font-extrabold text-navy-900 text-base">{appointmentSlip.tokenId}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Appointment Date</span>
                  <span className="font-bold text-slate-900 text-sm">{appointmentSlip.date} (Tue/Fri)</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Service / ECHS No</span>
                  <span className="font-mono font-bold text-slate-900">{appointmentSlip.serviceNo}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Patient Name</span>
                  <span className="font-bold text-slate-900">{appointmentSlip.patientName}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Clinic & Room</span>
                  <span className="font-bold text-teal-800">{appointmentSlip.clinic} — Room 106 (1st Floor)</span>
                </div>
              </div>

              <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 text-xs text-amber-900 space-y-1">
                <strong className="font-bold block text-amber-950">Instructions for OPD Day:</strong>
                <ul className="list-disc pl-4 text-[11px] space-y-0.5">
                  <li>Please report to ENT Reception Counter with Service ID / ECHS Card at 08:00 AM.</li>
                  <li>Show this Token ID to the Nursing Officer on duty for priority entry.</li>
                </ul>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => window.print()}
                  className="flex-1 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow"
                >
                  <Printer className="w-4 h-4" />
                  Print Token Slip
                </button>
                <button
                  onClick={() => setAppointmentSlip(null)}
                  className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
                >
                  Book Another Token
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Facilities & Roster */}
      {activeTab === 'roster' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <Stethoscope className="w-5 h-5 text-teal-600" />
              {hi ? 'कमांड अस्पताल ईएनटी विभाग की विशेष सुविधाएं' : 'Department of ENT - Clinical Facilities & Specialty Suites'}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {facilities.map((fac) => {
                const Icon = fac.icon;
                return (
                  <div key={fac.id} className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-2 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="p-2 bg-teal-100 text-teal-900 rounded-lg">
                          <Icon className="w-5 h-5" />
                        </div>
                        <span className="bg-slate-200 text-slate-800 text-[10px] font-bold px-2 py-0.5 rounded">
                          {fac.room}
                        </span>
                      </div>
                      <h3 className="font-bold text-slate-900 text-sm">{fac.title}</h3>
                      <p className="text-xs text-slate-600 leading-relaxed">{fac.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: ECHS */}
      {activeTab === 'echs' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-900 text-base">{hi ? 'ईसीएचएस एवं इम्प्लांट्स स्वीकृति' : 'ECHS Hearing Aid & Implants Prior Authorization'}</h3>
          <p className="text-xs text-slate-600">
            {hi ? 'ईसीएचएस लाभार्थियों के लिए हियरिंग ऐड और कॉक्लियर इम्प्लांट की स्वीकृति प्रक्रिया।' : 'Detailed clearance workflow for ECHS digitally programmable hearing aids and Cochlear Implants.'}
          </p>
        </div>
      )}

      {/* TAB 4: MHCP */}
      {activeTab === 'mhcp' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-900 text-base">{hi ? 'सैन्य श्रवण संरक्षण कार्यक्रम (MHCP)' : 'Military Hearing Conservation Program (MHCP)'}</h3>
          <p className="text-xs text-slate-600">
            {hi ? 'फायरिंग रेंज और एविएशन में तैनात कर्मियों के लिए वार्षिक श्रवण जांच।' : 'Annual High-Frequency Audiometry baseline screening and combat ear protection issuance.'}
          </p>
        </div>
      )}

      {/* ─── PRE-OP & POST-OP INSTRUCTIONS MODAL ──────────────── */}
      {selectedVisit && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-3xl w-full p-6 md:p-8 space-y-6 max-h-[90vh] overflow-y-auto relative animate-in fade-in zoom-in-95">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded uppercase tracking-wider ${
                  selectedVisit.type === 'surgery' ? 'bg-amber-100 text-amber-900' : 'bg-teal-100 text-teal-900'
                }`}>
                  {selectedVisit.type === 'surgery' ? (hi ? 'सर्जरी / प्रक्रिया निर्देश' : 'Surgical Procedure Sheet') : (hi ? 'ओपीडी दौरा निर्देश' : 'OPD Preparation Sheet')}
                </span>
                <h2 className="text-xl font-bold text-slate-900 mt-1">
                  {hi ? selectedVisit.titleHi : selectedVisit.title}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {selectedVisit.date} · {selectedVisit.location} · {selectedVisit.doctor}
                </p>
              </div>

              <button
                onClick={() => setSelectedVisit(null)}
                className="p-1.5 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content: Pre-Op vs Post-Op Columns */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Pre-Op Instructions */}
              <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-3">
                <h3 className="font-bold text-navy-900 text-sm flex items-center gap-2 border-b border-slate-200 pb-2">
                  <Check className="w-4 h-4 text-emerald-600" />
                  {hi ? 'सर्जरी / प्रक्रिया से पहले के निर्देश (Pre-Op)' : 'Pre-Op / Pre-Procedure Instructions'}
                </h3>
                <ul className="space-y-2 text-xs text-slate-700">
                  {(hi ? selectedVisit.preOpInstructionsHi : selectedVisit.preOpInstructions).map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <span className="leading-snug">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Post-Op Instructions */}
              <div className="bg-amber-50/60 p-5 rounded-xl border border-amber-200 space-y-3">
                <h3 className="font-bold text-amber-950 text-sm flex items-center gap-2 border-b border-amber-200 pb-2">
                  <ShieldCheck className="w-4 h-4 text-amber-700" />
                  {hi ? 'सर्जरी / प्रक्रिया के बाद के निर्देश (Post-Op)' : 'Post-Op / Post-Procedure Care'}
                </h3>
                <ul className="space-y-2 text-xs text-amber-950">
                  {(hi ? selectedVisit.postOpInstructionsHi : selectedVisit.postOpInstructions).map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="w-4 h-4 rounded-full bg-amber-200 text-amber-900 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <span className="leading-snug">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <div className="flex items-center gap-2 text-xs text-red-700 font-semibold">
                <PhoneCall className="w-4 h-4" />
                <span>{hi ? `इमरजेंसी DMO हेल्पलाइन: ${emergencyHelpline}` : `Emergency DMO Helpline: ${emergencyHelpline}`}</span>
              </div>

              <button
                onClick={() => setSelectedVisit(null)}
                className="px-5 py-2 bg-navy-900 text-white font-bold text-xs rounded-xl hover:bg-navy-800"
              >
                {hi ? 'बंद करें' : 'Close Instructions'}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
