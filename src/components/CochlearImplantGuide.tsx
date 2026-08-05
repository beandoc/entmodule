'use client';

import React, { useState } from 'react';
import { Activity, ShieldAlert, CheckCircle2, Stethoscope, Ear, Brain, AlertTriangle, Sparkles, Syringe, Clock, HeartHandshake, Shield, HelpCircle, Magnet, Waves } from 'lucide-react';
import { useAppData } from '@/lib/app-data-context';

export const CochlearImplantGuide: React.FC = () => {
  const { locale } = useAppData();
  const hi = locale === 'hi';
  const [activeTab, setActiveTab] = useState<'overview' | 'parts' | 'preop' | 'surgery' | 'recovery' | 'discharge'>('overview');
  const [teachBackAnswer, setTeachBackAnswer] = useState<string | null>(null);

  return (
    <div className="space-y-6 pb-10">
      {/* Header Card */}
      <div className="bg-white dark:bg-ink-900 border border-slate-200 dark:border-ink-800 rounded-3xl p-6 shadow-sm space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-purple-50 dark:bg-ink-800 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold text-xl">
            <Brain className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display font-bold text-xl text-slate-900 dark:text-white">
                {hi ? 'कॉकलियर इम्प्लांट सर्जरी, डिस्चार्ज व पुनर्वास गाइड' : 'Cochlear Implant Surgery, Discharge Care & AVT Therapy Guide'}
              </h2>
              <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 dark:bg-ink-800 dark:text-purple-300 border border-purple-200 dark:border-ink-700">
                Otology & Neurotology
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {hi
                ? 'कॉकलियर इम्प्लांट के 3 भाग, मेनिंजाइटिस टीकाकरण, सर्जरी प्रक्रिया, घाव की देखभाल, एमआरआई सावधानियां व एवीटी थेरेपी।'
                : 'Comprehensive guide covering implant parts, pre-op vaccines, surgical steps, home wound care, MRI precautions & teach-back checks.'}
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100 dark:border-ink-800">
          {[
            { id: 'overview', label: hi ? '1. इम्प्लांट क्या है?' : '1. What is an Implant?' },
            { id: 'parts', label: hi ? '2. इम्प्लांट के 3 मुख्य भाग' : '2. Device Architecture' },
            { id: 'preop', label: hi ? '3. पूर्व तैयारी व टीके' : '3. Pre-Op & Vaccines' },
            { id: 'surgery', label: hi ? '4. सर्जरी प्रक्रिया (2-4 घंटे)' : '4. Surgical Steps' },
            { id: 'recovery', label: hi ? '5. स्विच-ऑन व स्पीच थेरेपी' : '5. Activation & AVT' },
            { id: 'discharge', label: hi ? '6. डिस्चार्ज निर्देश व जीवनभर की सावधानियां' : '6. Home Care & MRI Precautions' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`text-xs font-bold px-3.5 py-1.5 rounded-xl border transition-all ${
                activeTab === tab.id
                  ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                  : 'bg-slate-50 dark:bg-ink-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-ink-800 hover:border-purple-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-ink-900 border border-slate-200 dark:border-ink-800 rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
              <Brain className="w-5 h-5 text-purple-600" />
              {hi ? 'कॉकलियर इम्प्लांट क्या है और यह कैसे काम करता है?' : 'What is a Cochlear Implant?'}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
              <div className="bg-purple-50/60 dark:bg-ink-950/60 p-4 rounded-2xl border border-purple-100 dark:border-ink-800 space-y-2">
                <strong className="font-bold text-purple-900 dark:text-purple-300 text-sm block">
                  {hi ? 'विद्युत श्रवण उपकरण (Electronic Neural Device)' : 'Direct Neural Stimulation'}
                </strong>
                <p>
                  {hi
                    ? 'कॉकलियर इम्प्लांट एक परिष्कृत इलेक्ट्रॉनिक चिकित्सा उपकरण है जिसे शल्य चिकित्सा (सर्जरी) द्वारा आंतरिक कान (कॉकलिया) में लगाया जाता है। यह क्षतिग्रस्त कोशिकाओं को दरकिनार कर सीधे श्रवण तंत्रिका को विद्युत संकेत भेजता है।'
                    : 'A cochlear implant is an advanced electronic medical device surgically implanted into the inner ear (cochlea). Unlike acoustic hearing aids, it bypasses damaged sensory hair cells and directly stimulates auditory nerve fibers with electrical pulses.'}
                </p>
              </div>

              <div className="bg-purple-50/60 dark:bg-ink-950/60 p-4 rounded-2xl border border-purple-100 dark:border-ink-800 space-y-2">
                <strong className="font-bold text-purple-900 dark:text-purple-300 text-sm block">
                  {hi ? 'यह किसके लिए उपयुक्त है? (Candidates)' : 'Ideal Candidacy'}
                </strong>
                <p>
                  {hi
                    ? 'यह उन बच्चों (शिशुओं से लेकर किशोरों) तथा वयस्कों के लिए है जो दोनों कानों में गंभीर से पूर्ण बहरेपन (Severe-to-Profound SNHL) से पीड़ित हैं और हियरिंग एड से पर्याप्त लाभ नहीं पाते हैं।'
                    : 'Ideal for children (from infancy onward) and adults with bilateral or unilateral severe-to-profound sensorineural hearing loss who receive limited benefit from acoustic hearing aids.'}
                </p>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-ink-950 p-4 rounded-2xl border border-slate-200 dark:border-ink-800 space-y-2">
              <strong className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider block">
                {hi ? 'एकतरफा बनाम दोतरफा इम्प्लांट (Unilateral vs Bilateral):' : 'Implant Options:'}
              </strong>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {hi
                  ? 'दोनों कानों में बहरापन होने पर बच्चों को एक ही सर्जरी में या दो अलग-अलग चरणों में दोनों कानों (Bilateral) में इम्प्लांट दिया जा सकता है। केवल एक कान में बहरापन होने पर केवल प्रभावित कान में ही इम्प्लांट लगाया जाता है।'
                  : 'Children with bilateral severe hearing loss can receive implants in both ears (bilateral cochlear implantation) either simultaneously in one surgical session or sequentially. Unilateral loss requires a single implant.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Parts */}
      {activeTab === 'parts' && (
        <div className="bg-white dark:bg-ink-900 border border-slate-200 dark:border-ink-800 rounded-3xl p-6 shadow-sm space-y-5">
          <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white">
            {hi ? 'कॉकलियर इम्प्लांट के 3 मुख्य भाग' : 'The 3 Core Components of a Cochlear Implant'}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-purple-50/70 dark:bg-ink-950 border border-purple-200 dark:border-ink-800 p-4 rounded-2xl space-y-2">
              <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-purple-200 dark:bg-purple-950 text-purple-900 dark:text-purple-300">
                Component 1: External
              </span>
              <strong className="font-bold text-xs text-purple-950 dark:text-purple-200 block">
                1. एक्सटर्नल साउंड प्रोसेसर (Sound Processor)
              </strong>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                {hi
                  ? 'सिर की त्वचा पर बाहर की तरफ पहना जाने वाला भाग। इसमें माइक्रोफोन होता है जो बाहरी आवाज़ों को पकड़कर डिजिटल सिग्नल में बदलता है। चुंबक (Magnet) की मदद से यह अंदर के रिसीवर से जुड़ता है और सोते समय हटाया जा सकता है।'
                  : 'Worn externally behind the ear or on the scalp. Contains a microphone and digital speech processor. Held in place over the internal receiver via an RF transmitting coil magnet, easily removed for sleeping or bathing.'}
              </p>
            </div>

            <div className="bg-purple-50/70 dark:bg-ink-950 border border-purple-200 dark:border-ink-800 p-4 rounded-2xl space-y-2">
              <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-purple-200 dark:bg-purple-950 text-purple-900 dark:text-purple-300">
                Component 2: Sub-Cutaneous
              </span>
              <strong className="font-bold text-xs text-purple-950 dark:text-purple-200 block">
                2. इंटरनल रिसीवर-स्टिम्युलेटर (Receiver-Stimulator)
              </strong>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                {hi
                  ? 'इसे सर्जरी द्वारा त्वचा के नीचे सिर की हड्डी में बनाई गई एक पॉकेट में सुरक्षित रूप से स्थापित किया जाता है। यह प्रोसेसर से रेडियो सिग्नल प्राप्त करके उन्हें विद्युत पल्स में बदलता है।'
                  : 'Surgically placed under the scalp skin in a shallow bone pocket behind the ear. Receives radiofrequency signals from the external processor and converts them into precise electrical pulses.'}
              </p>
            </div>

            <div className="bg-purple-50/70 dark:bg-ink-950 border border-purple-200 dark:border-ink-800 p-4 rounded-2xl space-y-2">
              <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-purple-200 dark:bg-purple-950 text-purple-900 dark:text-purple-300">
                Component 3: Intracochlear
              </span>
              <strong className="font-bold text-xs text-purple-950 dark:text-purple-200 block">
                3. इलेक्ट्रोड ऐरे (Electrode Array)
              </strong>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                {hi
                  ? 'यह एक बारीक लचीला तार है जिसे आंतरिक कान (कॉकलिया) के अंदर पिरोया जाता है। यह रिसीवर से विद्युत सिग्नल लेकर श्रवण तंत्रिका की तंतुओं को उत्तेजित करता है, जिससे मस्तिष्क आवाज़ को "सुनता" है।'
                  : 'A thin, flexible micro-electrode string inserted into the fluid-filled cochlear duct (scala tympani). It transmits electrical currents directly to auditory nerve endings, enabling sound perception.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Pre-Op */}
      {activeTab === 'preop' && (
        <div className="bg-white dark:bg-ink-900 border border-slate-200 dark:border-ink-800 rounded-3xl p-6 shadow-sm space-y-5">
          <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
            <Syringe className="w-5 h-5 text-purple-600" />
            {hi ? 'सर्जरी पूर्व जांच, मेनिंजाइटिस टीकाकरण व उपवास नियम' : 'Pre-Operative Evaluation & Vaccine Mandates'}
          </h3>

          <div className="space-y-4 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-50 dark:bg-ink-950 p-4 rounded-2xl border border-slate-200 dark:border-ink-800 space-y-2">
                <strong className="font-bold text-xs text-purple-800 dark:text-purple-300 uppercase tracking-wider block">
                  1. CT व MRI इमेजिंग परीक्षण
                </strong>
                <p>
                  {hi
                    ? 'सिर और कान की हड्डी (Temporal Bone) का सीटी स्कैन व एमआरआई किया जाता है ताकि यह पुष्टि की जा सके कि कॉकलिया की बनावट सामान्य है और श्रवण तंत्रिका (Auditory Nerve) मौजूद है।'
                    : 'High-resolution CT and MRI of the temporal bone confirm normal cochlear anatomy, patency of scala tympani, and presence of the auditory nerve.'}
                </p>
              </div>

              <div className="bg-slate-50 dark:bg-ink-950 p-4 rounded-2xl border border-slate-200 dark:border-ink-800 space-y-2">
                <strong className="font-bold text-xs text-purple-800 dark:text-purple-300 uppercase tracking-wider block">
                  2. उपवास नियम (NPO Protocol)
                </strong>
                <p>
                  {hi
                    ? 'जनरल एनेस्थीसिया के लिए सर्जरी से 8 घंटे पहले ठोस भोजन बंद करें तथा 2 घंटे पहले तक केवल थोड़ा पानी पिएं।'
                    : 'Strict NPO guidelines: No solid food for 8 hours prior to arrival; clear fluids permitted only up to 2 hours before general anesthesia.'}
                </p>
              </div>
            </div>

            {/* Meningitis Vaccine Mandate Alert */}
            <div className="bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-900 p-4 rounded-2xl space-y-1.5">
              <strong className="text-xs font-bold text-red-800 dark:text-red-300 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-red-600" />
                {hi ? 'अत्यंत आवश्यक: मेनिंजाइटिस (दिमागी बुखार) का टीकाकरण!' : 'MANDATORY: Pre-Op Meningitis Vaccination Protocol!'}
              </strong>
              <p className="text-xs text-red-900 dark:text-red-200 leading-relaxed">
                {hi
                  ? 'कॉकलियर इम्प्लांट से मस्तिष्क के आसपास इंफेक्शन (Meningitis) का हल्का जोखिम बढ़ सकता है। इसलिए सर्जरी से कम से कम 2-4 सप्ताह पहले बच्चे/रोगी को न्यूमोकोकल (Pneumococcal) और मेनिगोकोकल (Meningococcal) के टीके लगाना अनिवार्य है!'
                  : 'Cochlear implants create a direct conduit to the inner ear, slightly increasing susceptibility to bacterial meningitis. Pre-operative Pneumococcal and Meningococcal vaccinations are MANDATORY for all implant recipients before surgery!'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Surgery */}
      {activeTab === 'surgery' && (
        <div className="bg-white dark:bg-ink-900 border border-slate-200 dark:border-ink-800 rounded-3xl p-6 shadow-sm space-y-5">
          <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
            <Stethoscope className="w-5 h-5 text-purple-600" />
            {hi ? 'सर्जरी प्रक्रिया (2 से 4 घंटे)' : 'Intraoperative Surgical Walkthrough'}
          </h3>

          <div className="space-y-3 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="bg-slate-50 dark:bg-ink-950 p-3.5 rounded-xl border border-slate-200 dark:border-ink-800 space-y-1">
                <span className="text-[10px] font-bold text-purple-600 uppercase font-mono">Step 1</span>
                <strong className="font-bold block text-slate-900 dark:text-white">General Anesthesia & Nerve Monitor</strong>
                <p className="text-slate-600 dark:text-slate-400">Patient is asleep. Facial nerve monitoring electrodes are placed for safety.</p>
              </div>

              <div className="bg-slate-50 dark:bg-ink-950 p-3.5 rounded-xl border border-slate-200 dark:border-ink-800 space-y-1">
                <span className="text-[10px] font-bold text-purple-600 uppercase font-mono">Step 2</span>
                <strong className="font-bold block text-slate-900 dark:text-white">Postauricular Incision & Mastoidectomy</strong>
                <p className="text-slate-600 dark:text-slate-400">Incision behind ear, drilling mastoid bone & facial recess to access middle ear.</p>
              </div>

              <div className="bg-slate-50 dark:bg-ink-950 p-3.5 rounded-xl border border-slate-200 dark:border-ink-800 space-y-1">
                <span className="text-[10px] font-bold text-purple-600 uppercase font-mono">Step 3</span>
                <strong className="font-bold block text-slate-900 dark:text-white">Electrode Insertion & Pocket Creation</strong>
                <p className="text-slate-600 dark:text-slate-400">Electrode threaded into cochlea; receiver bed pocket created in skull bone.</p>
              </div>

              <div className="bg-slate-50 dark:bg-ink-950 p-3.5 rounded-xl border border-slate-200 dark:border-ink-800 space-y-1">
                <span className="text-[10px] font-bold text-purple-600 uppercase font-mono">Step 4</span>
                <strong className="font-bold block text-slate-900 dark:text-white">Telemetry Testing & Closure</strong>
                <p className="text-slate-600 dark:text-slate-400">Audiologist tests device firing (NRT) in operating room before skin closure.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 5: Recovery & AVT */}
      {activeTab === 'recovery' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-ink-900 border border-slate-200 dark:border-ink-800 rounded-3xl p-6 shadow-sm space-y-5">
            <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white">
              {hi ? 'रिकवरी, स्विच-ऑन व एवीटी थेरेपी (AVT Therapy)' : 'Post-Op Recovery, Switch-On & Auditory Verbal Therapy'}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="bg-purple-50/70 dark:bg-ink-950 border border-purple-200 dark:border-ink-800 p-4 rounded-2xl space-y-2">
                <strong className="font-bold text-purple-900 dark:text-purple-300 text-sm block flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-purple-600" />
                  {hi ? '1. अस्पताल में देखभाल व आहार' : '1. Immediate Recovery & Diet'}
                </strong>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                  {hi
                    ? 'अधिकांश मरीज उसी दिन या 1 रात अस्पताल में रुककर घर चले जाते हैं। दर्द की दवाएं दी जाती हैं। शिशुओं के लिए दूध/बोतल तथा बच्चों के लिए सुपाच्य हल्का भोजन दें।'
                    : 'Most patients go home the same day or after 1 night. Mild dizziness or sore throat fades quickly. Restart liquid/bland diet as tolerated.'}
                </p>
              </div>

              <div className="bg-purple-50/70 dark:bg-ink-950 border border-purple-200 dark:border-ink-800 p-4 rounded-2xl space-y-2">
                <strong className="font-bold text-purple-900 dark:text-purple-300 text-sm block flex items-center gap-1.5">
                  <HeartHandshake className="w-4 h-4 text-purple-600" />
                  {hi ? '2. स्विच-ऑन दिन व एवीटी स्पीच थेरेपी' : '2. Device Switch-On & AVT Speech Therapy'}
                </strong>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                  {hi
                    ? 'सर्जरी के 2-4 सप्ताह बाद घाव भरने पर उपकरण का "स्विच-ऑन" किया जाता है। इसके बाद ऑडिओ-वर्बल थेरेपी (AVT) द्वारा बच्चे को ध्वनियों को पहचानना व बोलना सिखाया जाता है।'
                    : 'Initial activation ("Switch-On") occurs 2–4 weeks post-op once healing completes. Intensive Auditory Verbal Therapy (AVT) follows to map speech comprehension.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 6: Discharge & Precautions */}
      {activeTab === 'discharge' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-ink-900 border border-slate-200 dark:border-ink-800 rounded-3xl p-6 shadow-sm space-y-5">
            <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
              <Shield className="w-5 h-5 text-purple-600" />
              {hi ? 'डिस्चार्ज निर्देश, घाव की देखभाल व जीवनभर की सावधानियां' : 'Home Discharge Care, Water & MRI Precautions'}
            </h3>

            {/* 24 Hour Rules */}
            <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 p-4 rounded-2xl space-y-1.5 text-xs">
              <strong className="font-bold text-amber-900 dark:text-amber-300 uppercase tracking-wider block">
                {hi ? 'सर्जरी के पहले 24 घंटे की सख्त पाबंदियां:' : 'First 24-Hour Post-Op Restrictions:'}
              </strong>
              <ul className="list-disc list-inside space-y-1 text-amber-950 dark:text-amber-200">
                <li>{hi ? 'गाड़ी या भारी मशीनरी न चलाएं (एनेस्थीसिया का असर रहता है)।' : 'Do NOT drive or operate machinery.'}</li>
                <li>{hi ? 'कोई भी महत्वपूर्ण वित्तीय निर्णय या कागजात पर हस्ताक्षर न करें।' : 'Do NOT make major legal or financial decisions.'}</li>
                <li>{hi ? 'शराब या नशीले पदार्थों का सेवन बिल्कुल न करें।' : 'Do NOT consume alcohol of any kind.'}</li>
              </ul>
            </div>

            {/* Wound Care & Water Rules */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="bg-purple-50/70 dark:bg-ink-950 border border-purple-200 dark:border-ink-800 p-4 rounded-2xl space-y-2">
                <strong className="font-bold text-purple-950 dark:text-purple-200 text-sm block">
                  {hi ? 'घाव की देखभाल (Incision Care)' : 'Incision & Cup Dressing Care'}
                </strong>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                  {hi
                    ? 'पहले 24-48 घंटों तक पट्टी या सुरक्षा कप को सूखा रखें। इसके बाद साबुन व पानी से धीरे धोएं। पट्टी छूने से पहले और बाद में हाथ धोना अनिवार्य है।'
                    : 'Keep incision dry and covered with protective cup for 1–2 days. Once cleared, shower with soap and water, pat dry. Wash hands before touching dressing.'}
                </p>
              </div>

              <div className="bg-purple-50/70 dark:bg-ink-950 border border-purple-200 dark:border-ink-800 p-4 rounded-2xl space-y-2">
                <strong className="font-bold text-purple-950 dark:text-purple-200 text-sm block flex items-center gap-1.5">
                  <Waves className="w-4 h-4 text-purple-600" />
                  {hi ? 'पानी व तैराकी पर प्रतिबंध' : 'No Submerging in Water'}
                </strong>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                  {hi
                    ? 'घाव पूरी तरह भरने तक सिर को स्विमिंग पूल, बाथटब या नदी/झील में न डुबोएं। नहलाते समय एक्सटर्नल प्रोसेसर उतार दें।'
                    : 'Do NOT submerge head in baths, pools, lakes, or ocean until cleared by your surgeon. Remove external processor before showering or swimming.'}
                </p>
              </div>
            </div>

            {/* MRI & Scuba Lifelong Warnings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 p-4 rounded-2xl space-y-2">
                <strong className="font-bold text-red-900 dark:text-red-300 text-sm block flex items-center gap-1.5">
                  <Magnet className="w-4 h-4 text-red-600" />
                  {hi ? 'अत्यंत महत्वपूर्ण: MRI की पूर्व सूचना!' : 'CRITICAL: MRI Magnet Warning'}
                </strong>
                <p className="text-red-950 dark:text-red-200 leading-relaxed">
                  {hi
                    ? 'भविष्य में कभी भी एमआरआई (MRI) स्कैन कराने से पहले रेडियोलॉजिस्ट को कॉकलियर इम्प्लांट की जानकारी जरूर दें! एमआरआई के चुंबक से सिर के अंदर का रिसीवर खिसक सकता है।'
                    : 'ALWAYS inform medical staff and radiologists about your cochlear implant magnet before any MRI scan. Unprecautioned MRI fields can displace internal receivers.'}
                </p>
              </div>

              <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 p-4 rounded-2xl space-y-2">
                <strong className="font-bold text-red-900 dark:text-red-300 text-sm block flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-red-600" />
                  {hi ? 'जीवनभर के प्रतिबंधित खेल' : 'Lifelong Restricted Activities'}
                </strong>
                <p className="text-red-950 dark:text-red-200 leading-relaxed">
                  {hi
                    ? 'स्कूबा डाइविंग (Scuba Diving) और मुक्केबाजी/फुटबॉल जैसे कांटेक्ट स्पोर्ट्स से हमेशा बचें, क्योंकि पानी का दबाव या सिर पर तेज चोट इम्प्लांट को तोड़ सकती है।'
                    : 'Scuba diving (extreme barometric pressure) and high-impact contact sports (boxing, football) are contraindicated for life to prevent receiver damage.'}
                </p>
              </div>
            </div>

            {/* Teach-Back Verification Widget */}
            <div className="bg-slate-50 dark:bg-ink-950 border border-slate-200 dark:border-ink-800 p-5 rounded-2xl space-y-3">
              <strong className="text-xs font-bold text-purple-900 dark:text-purple-300 uppercase tracking-wider block flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4 text-purple-600" />
                {hi ? 'टीच-बैक (Teach-Back) स्व-जांच: क्या आपने डिस्चार्ज निर्देश समझ लिए हैं?' : 'Teach-Back Verification Check:'}
              </strong>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                {hi
                  ? 'नीचे दिए गए प्रश्न का उत्तर चुनकर अपनी समझ की पुष्टि करें:'
                  : 'Verify your understanding of post-op discharge rules by selecting the correct answer:'}
              </p>

              <div className="space-y-2 text-xs font-semibold">
                <p className="text-slate-900 dark:text-white">
                  {hi
                    ? 'प्रश्न: कॉकलियर इम्प्लांट वाले मरीज को भविष्य में MRI स्कैन कराने से पहले क्या करना चाहिए?'
                    : 'Q: What should a patient with a cochlear implant ALWAYS do before getting an MRI scan?'}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    onClick={() => setTeachBackAnswer('wrong')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      teachBackAnswer === 'wrong'
                        ? 'bg-red-100 border-red-300 text-red-900'
                        : 'bg-white dark:bg-ink-900 border-slate-200 dark:border-ink-800 hover:border-purple-300'
                    }`}
                  >
                    {hi ? 'A) कुछ नहीं, MRI पूरी तरह सामान्य है।' : 'A) Nothing, MRIs have no effect.'}
                  </button>

                  <button
                    onClick={() => setTeachBackAnswer('correct')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      teachBackAnswer === 'correct'
                        ? 'bg-emerald-100 border-emerald-300 text-emerald-900'
                        : 'bg-white dark:bg-ink-900 border-slate-200 dark:border-ink-800 hover:border-purple-300'
                    }`}
                  >
                    {hi
                      ? 'B) रेडियोलॉजिस्ट को चुंबक इम्प्लांट की जानकारी देना व सेफ्टी जांच कराना।'
                      : 'B) Inform radiology staff about the implant magnet for safety protocols.'}
                  </button>
                </div>

                {teachBackAnswer === 'correct' && (
                  <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400 pt-1 flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" />
                    {hi ? 'बिल्कुल सही! MRI चुंबक से अंदर का रिसीवर प्रभावित हो सकता है, इसलिए पहले सूचित करना अनिवार्य है।' : 'Correct! Radiologists must assess magnet safety before operating MRI machines.'}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
