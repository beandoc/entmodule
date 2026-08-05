'use client';

import React, { useState } from 'react';
import { ShieldAlert, CheckCircle2, Stethoscope, Ear, Activity, AlertTriangle, Sparkles, Droplets, Flame } from 'lucide-react';
import { useAppData } from '@/lib/app-data-context';

export const EarwaxImpactionGuide: React.FC = () => {
  const { locale } = useAppData();
  const hi = locale === 'hi';
  const [activeTab, setActiveTab] = useState<'overview' | 'causes' | 'myths' | 'treatment' | 'prevention'>('overview');

  return (
    <div className="space-y-6 pb-10">
      {/* Header Card */}
      <div className="bg-white dark:bg-ink-900 border border-slate-200 dark:border-ink-800 rounded-3xl p-6 shadow-sm space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-amber-50 dark:bg-ink-800 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold text-xl">
            🕯️
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display font-bold text-xl text-slate-900 dark:text-white">
                {hi ? 'कान का मोम (सिरुमेन) जमाव व सुरक्षित निष्कासन गाइड' : 'Earwax Impaction (Cerumen) Clinical Care Guide'}
              </h2>
              <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 dark:bg-ink-800 dark:text-amber-300 border border-amber-200 dark:border-ink-700">
                Otology & Canal Care
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {hi
                ? 'कान के मोम का महत्व, नली में जमाव, रूई की तीली के खतरे, इयर कैंडलिंग के मिथक, और माइक्रो-सक्शन उपचार।'
                : 'Understanding cerumen protection, impaction symptoms, cotton swab risks, ear candling dangers & micro-suction extraction.'}
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100 dark:border-ink-800">
          {[
            { id: 'overview', label: hi ? '1. मोम जमाव क्या है?' : '1. What is Impaction?' },
            { id: 'causes', label: hi ? '2. मुख्य कारण व लक्षण' : '2. Causes & Symptoms' },
            { id: 'myths', label: hi ? '3. खतरनाक मिथक (Q-Tips)' : '3. Dangerous Myths' },
            { id: 'treatment', label: hi ? '4. डॉक्टरी इलाज व सक्शन' : '4. Clinical Treatments' },
            { id: 'prevention', label: hi ? '5. रोकथाम व सावधानियां' : '5. Prevention & Warnings' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`text-xs font-bold px-3.5 py-1.5 rounded-xl border transition-all ${
                activeTab === tab.id
                  ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                  : 'bg-slate-50 dark:bg-ink-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-ink-800 hover:border-amber-300'
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
              <Ear className="w-5 h-5 text-amber-600" />
              {hi ? 'कान का मोम (Cerumen) क्या है और यह क्यों आवश्यक है?' : 'Understanding Cerumen & Impaction'}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
              <div className="bg-amber-50/60 dark:bg-ink-950/60 p-4 rounded-2xl border border-amber-100 dark:border-ink-800 space-y-2">
                <strong className="font-bold text-amber-900 dark:text-amber-300 text-sm block">
                  {hi ? 'प्राकृतिक सुरक्षा परत' : 'Natural Ear Protection'}
                </strong>
                <p>
                  {hi
                    ? 'कान का मोम (सिरुमेन) बाहरी कान की नली की ग्रंथियों द्वारा बनाया जाने वाला एक प्राकृतिक सुरक्षात्मक स्राव है। यह धूल, गंदगी, और पानी को रोकता है तथा बैक्टीरिया और फंगस से कान की रक्षा करता है।'
                    : 'Earwax (cerumen) is a healthy, self-cleaning lubricant produced by outer ear glands. It traps dust and debris, repels water, and exerts natural antibacterial/antifungal properties.'}
                </p>
              </div>

              <div className="bg-amber-50/60 dark:bg-ink-950/60 p-4 rounded-2xl border border-amber-100 dark:border-ink-800 space-y-2">
                <strong className="font-bold text-amber-900 dark:text-amber-300 text-sm block">
                  {hi ? 'मोम का जमाव (Impaction)' : 'Cerumen Impaction'}
                </strong>
                <p>
                  {hi
                    ? 'जब कान की नली में अत्यधिक मोम जमा हो जाता है और नली को पूरी तरह से बंद कर देता है, तो इसे "सिरुमेन इम्पैक्शन" कहते हैं। इससे सुनने में कमी, कान में भारीपन और दर्द जैसे लक्षण उत्पन्न होते हैं।'
                    : 'Impaction occurs when earwax accumulates significantly, hardening or swelling to occlude the ear canal. This blocks sound transmission and triggers fullness, pain, or muffled hearing.'}
                </p>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-ink-950 p-4 rounded-2xl border border-slate-200 dark:border-ink-800 space-y-2">
              <strong className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider block">
                {hi ? 'सफाई का प्राकृतिक नियम (Self-Cleaning Canal):' : 'Self-Cleaning Canal Mechanism:'}
              </strong>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {hi
                  ? 'कान की त्वचा अपने आप अंदर से बाहर की ओर बढ़ती है। जबड़े के हिलने (चबाने व बोलने) से मोम धीरे-धीरे बाहरी कान की ओर खिसककर अपने आप बाहर निकल जाता है। इसे अंदर से साफ करने की जरूरत नहीं होती।'
                  : 'Normal ear canals clean themselves. Epithelial migration, assisted by jaw movements during chewing and speaking, slowly transports old wax outward to the ear entrance where it dries and falls off naturally.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Causes & Symptoms */}
      {activeTab === 'causes' && (
        <div className="bg-white dark:bg-ink-900 border border-slate-200 dark:border-ink-800 rounded-3xl p-6 shadow-sm space-y-5">
          <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white">
            {hi ? 'मोम जमाव के कारण व मुख्य लक्षण' : 'Causes & Symptoms of Earwax Impaction'}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-50 dark:bg-ink-950 p-4 rounded-2xl border border-slate-200 dark:border-ink-800 space-y-2">
              <strong className="font-bold text-xs text-amber-800 dark:text-amber-400 uppercase tracking-wider block">
                1. Cotton Swab (Q-Tip) Overuse (रूई की तीली का गलत इस्तेमाल)
              </strong>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {hi
                  ? 'कान में माचिस, पिन या रूई की तीली (Q-Tips) डालने से थोड़ा मोम बाहर आता है, लेकिन अधिकांश मोम पर्दे के पास गहरा धकेल दिया जाता है, जिससे नली पूरी तरह बंद हो जाती है।'
                  : 'Probing ear canals with cotton swabs, hairpins, or keys pushes superficial wax deep into the narrow bony canal, compacting it firmly against the eardrum.'}
              </p>
            </div>

            <div className="bg-slate-50 dark:bg-ink-950 p-4 rounded-2xl border border-slate-200 dark:border-ink-800 space-y-2">
              <strong className="font-bold text-xs text-amber-800 dark:text-amber-400 uppercase tracking-wider block">
                2. Age & Narrow Canal (उम्र बढ़ना व संकीर्ण नली)
              </strong>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {hi
                  ? 'उम्र बढ़ने के साथ मोम अधिक सूखा, सख्त व मोटा हो जाता है। इसके अलावा जन्मजात संकीर्ण नली या बार-बार इंफेक्शन के कारण मोम का बाहर निकलना कठिन हो जाता है।'
                  : 'Aging makes cerumen drier, harder, and less mobile. Naturally narrow ear canals or post-infection scarring impede normal outward wax migration.'}
              </p>
            </div>

            <div className="bg-slate-50 dark:bg-ink-950 p-4 rounded-2xl border border-slate-200 dark:border-ink-800 space-y-2">
              <strong className="font-bold text-xs text-amber-800 dark:text-amber-400 uppercase tracking-wider block">
                3. Earbuds & Hearing Aid Devices (इयरफोन व हियरिंग एड)
              </strong>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {hi
                  ? 'लंबे समय तक इन-इयर हेडफोन, इयरप्लग, या हियरिंग एड पहनने से नली के प्राकृतिक स्राव का बाहर निकलना रुक जाता है।'
                  : 'Continuous use of in-ear headphones, earplugs, or hearing aids physically blocks the canal entrance, trapping secretions inside.'}
              </p>
            </div>

            <div className="bg-slate-50 dark:bg-ink-950 p-4 rounded-2xl border border-slate-200 dark:border-ink-800 space-y-2">
              <strong className="font-bold text-xs text-amber-800 dark:text-amber-400 uppercase tracking-wider block">
                4. Water Exposure & Swelling (पानी से मोम का फूलना)
              </strong>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {hi
                  ? 'नहाते या तैरते समय कान में पानी जाने पर सूखा मोम पानी सोखकर फूल जाता है, जिससे अचानक कान बंद और दर्द महसूस होता है।'
                  : 'Water entering the canal during bathing or swimming causes dry, porous wax to absorb fluid and expand rapidly, producing sudden blockage.'}
              </p>
            </div>
          </div>

          {/* Symptoms List */}
          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-ink-800">
            <strong className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider block">
              {hi ? 'मुख्य लक्षण:' : 'Impacted Wax Symptoms:'}
            </strong>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="bg-amber-50/60 dark:bg-ink-950 p-3 rounded-xl border border-amber-200 dark:border-ink-800 text-center font-bold text-amber-900 dark:text-amber-300">
                {hi ? 'धीमा सुनाई देना' : 'Muffled Hearing'}
              </div>
              <div className="bg-amber-50/60 dark:bg-ink-950 p-3 rounded-xl border border-amber-200 dark:border-ink-800 text-center font-bold text-amber-900 dark:text-amber-300">
                {hi ? 'कान में भारीपन व दबाव' : 'Ear Fullness'}
              </div>
              <div className="bg-amber-50/60 dark:bg-ink-950 p-3 rounded-xl border border-amber-200 dark:border-ink-800 text-center font-bold text-amber-900 dark:text-amber-300">
                {hi ? 'कान में हल्का दर्द' : 'Ear Ache / Discomfort'}
              </div>
              <div className="bg-amber-50/60 dark:bg-ink-950 p-3 rounded-xl border border-amber-200 dark:border-ink-800 text-center font-bold text-amber-900 dark:text-amber-300">
                {hi ? 'कान में बजना (Tinnitus)' : 'Ringing Noise'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Myths & Warnings */}
      {activeTab === 'myths' && (
        <div className="bg-white dark:bg-ink-900 border border-slate-200 dark:border-ink-800 rounded-3xl p-6 shadow-sm space-y-5">
          <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            {hi ? 'खतरनाक घरेलू तरीके व मिथक (Dangerous Myths)' : 'Dangerous Earwax Myths to Avoid'}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 p-4 rounded-2xl space-y-2">
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-red-600" />
                <strong className="text-xs font-bold text-red-800 dark:text-red-300 uppercase tracking-wider block">
                  {hi ? '1. इयर कैंडलिंग (Ear Candling) अत्यंत खतरनाक!' : '1. Ear Candling is Dangerous & ineffective'}
                </strong>
              </div>
              <p className="text-xs text-red-950 dark:text-red-200 leading-relaxed">
                {hi
                  ? 'मोमबत्ती (Ear Candle) को कान में रखकर जलाना एक असुरक्षित और अप्रमाणित मिथक है। यह कान का मोम बिल्कुल नहीं निकालता बल्कि कान की नली में गर्म मोम टपकने, चेहरे के जलने और कान के पर्दे में छेद होने का गंभीर खतरा पैदा करता है।'
                  : 'Ear candling (inserting a lit hollow candle into the ear) is a dangerous myth. It does NOT remove wax and carries high risks of severe facial burns, hot wax dripping onto the eardrum, and eardrum perforation.'}
              </p>
            </div>

            <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 p-4 rounded-2xl space-y-2">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-red-600" />
                <strong className="text-xs font-bold text-red-800 dark:text-red-300 uppercase tracking-wider block">
                  {hi ? '2. कान में नुकीली वस्तुएं डालना' : '2. Inserting Sharp Objects or Cotton Buds'}
                </strong>
              </div>
              <p className="text-xs text-red-950 dark:text-red-200 leading-relaxed">
                {hi
                  ? 'कान के अंदर कभी भी रूई की तीली (Q-Tips), हेयरपिन, चाबी या उंगली न डालें। यह मोम को पर्दे के ऊपर और अधिक सख्त जमा देता है तथा नाजुक त्वचा में घाव व इंफेक्शन पैदा करता है।'
                  : 'Never insert objects smaller than your elbow into your ear. Cotton swabs force wax deeper against the tympanic membrane and scratch delicate canal skin, inviting infection.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Treatments */}
      {activeTab === 'treatment' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-ink-900 border border-slate-200 dark:border-ink-800 rounded-3xl p-6 shadow-sm space-y-5">
            <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
              <Stethoscope className="w-5 h-5 text-amber-600" />
              {hi ? 'सुरक्षित डॉक्टरी इलाज व मोम निष्कासन' : 'Safe Clinical Treatment Methods'}
            </h3>

            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
              {hi
                ? 'ईएनटी डॉक्टर केवल उन्हीं रोगियों का मोम निकालते हैं जिनमें लक्षण (दर्द, सुनने में कमी) हों। यदि कोई लक्षण न हो, तो अत्यधिक मोम होने पर भी उसे छेड़ने की जरूरत नहीं होती।'
                : 'Medical treatment is indicated only for symptomatic impaction (or to visualize eardrum/conduct audiometry). If earwax causes no symptoms, no removal is necessary.'}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-amber-50/70 dark:bg-ink-950 border border-amber-200 dark:border-ink-800 p-4 rounded-2xl space-y-2">
                <strong className="font-bold text-xs text-amber-900 dark:text-amber-300 uppercase tracking-wider block flex items-center gap-1.5">
                  <Droplets className="w-4 h-4 text-amber-600" />
                  {hi ? '1. सिरुमेनोलिटिक ड्रॉप्स (Ear Drops)' : '1. Cerumenolytic Drops'}
                </strong>
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                  {hi
                    ? 'विशेष मोम पिघलाने वाली बूंदें (Sodium Bicarbonate / Mineral Oil) मोम को नरम करके बाहर निकलने में मदद करती हैं। (ध्यान दें: पर्दे में छेद होने पर ड्रॉप्स का प्रयोग न करें)।'
                    : 'Medicated ear drops soften hard wax for easier natural drainage. Contraindicated if eardrum perforation or ear tubes exist.'}
                </p>
              </div>

              <div className="bg-amber-50/70 dark:bg-ink-950 border border-amber-200 dark:border-ink-800 p-4 rounded-2xl space-y-2">
                <strong className="font-bold text-xs text-amber-900 dark:text-amber-300 uppercase tracking-wider block flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-amber-600" />
                  {hi ? '2. ईयर सिरेंजिंग (Warm Water Rinse)' : '2. Ear Syringing / Irrigation'}
                </strong>
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                  {hi
                    ? 'प्रशिक्षित नर्स या डॉक्टर द्वारा गुनगुने पानी के हल्के दबाव से नरम मोम को बाहर धोया जाता है।'
                    : 'Controlled, gentle warm water irrigation performed by healthcare professionals to flush out softened wax.'}
                </p>
              </div>

              <div className="bg-amber-50/70 dark:bg-ink-950 border border-amber-200 dark:border-amber-800 p-4 rounded-2xl space-y-2">
                <strong className="font-bold text-xs text-amber-900 dark:text-amber-300 uppercase tracking-wider block flex items-center gap-1.5">
                  <Stethoscope className="w-4 h-4 text-amber-600" />
                  {hi ? '3. माइक्रो-सक्शन (Micro-Suction)' : '3. Micro-Suction & Manual Removal'}
                </strong>
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                  {hi
                    ? 'ईएनटी विशेषज्ञ माइक्रोस्कोप या ऑटोस्कोप के तहत विशेष सक्शन मशीन या छोटे हुक से मोम को बिना पानी के पूरी सुरक्षा से बाहर निकाल लेते हैं।'
                    : 'The gold-standard method: an ENT specialist uses a microscope and gentle suction catheter or curette tool to safely extract wax under direct vision.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 5: Prevention & Warnings */}
      {activeTab === 'prevention' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-ink-900 border border-slate-200 dark:border-ink-800 rounded-3xl p-6 shadow-sm space-y-5">
            <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white">
              {hi ? 'रोकथाम व डॉक्टर से परामर्श की स्थिति' : 'Prevention & When to Contact Doctor'}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 p-4 rounded-2xl space-y-2">
                <strong className="font-bold text-emerald-900 dark:text-emerald-300 text-sm block flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  {hi ? 'रोकथाम की उत्तम आदतें:' : 'Preventive Self-Care:'}
                </strong>
                <ul className="space-y-2 text-emerald-950 dark:text-emerald-200">
                  <li>{hi ? 'केवल कान के बाहरी भाग को तौलिये से साफ करें।' : 'Clean only the outer ear with a damp washcloth.'}</li>
                  <li>{hi ? 'बार-बार मोम बनने वालों के लिए डॉक्टर की सलाह से मिनरल ऑयल बूंदें डालना।' : 'Use preventive mineral oil drops weekly if prescribed by your ENT doctor.'}</li>
                  <li>{hi ? 'रात में हियरिंग एड निकालकर कान की नली को हवा लगने दें।' : 'Remove hearing aids overnight to allow canals to dry and ventilate.'}</li>
                </ul>
              </div>

              <div className="bg-red-50/70 dark:bg-red-950/40 border border-red-200 dark:border-red-800 p-4 rounded-2xl space-y-2">
                <strong className="font-bold text-red-900 dark:text-red-300 text-sm block flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-red-600" />
                  {hi ? 'ईएनटी डॉक्टर को तुरंत कब दिखाएं?' : 'When to Contact Doctor Immediately:'}
                </strong>
                <ul className="space-y-1 text-red-950 dark:text-red-200">
                  <li>{hi ? 'बुखार (100.4°F / 38°C से अधिक) या ठंड लगना।' : 'Fever above 100.4°F (38°C) or chills.'}</li>
                  <li>{hi ? 'कान से रक्तस्राव (Bleeding) या मवाद (Pus) आना।' : 'Bleeding or yellow/green purulent discharge from ear.'}</li>
                  <li>{hi ? 'अत्यधिक दर्द, चक्कर आना या अचानक सुनना बंद होना।' : 'Severe pain, persistent dizziness, or sudden hearing drop.'}</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
