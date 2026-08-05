'use client';

import React, { useState } from 'react';
import { Volume2, ShieldAlert, CheckCircle2, HelpCircle, ArrowRight, Activity, Plane, Waves, AlertTriangle, Stethoscope, Sparkles } from 'lucide-react';
import { useAppData } from '@/lib/app-data-context';

export const EustachianTubeGuide: React.FC = () => {
  const { locale } = useAppData();
  const hi = locale === 'hi';
  const [activeTab, setActiveTab] = useState<'overview' | 'causes' | 'symptoms' | 'treatment' | 'selfcare'>('overview');

  return (
    <div className="space-y-6 pb-10">
      {/* Header Card */}
      <div className="bg-white dark:bg-ink-900 border border-slate-200 dark:border-ink-800 rounded-3xl p-6 shadow-sm space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-teal-50 dark:bg-ink-800 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold text-xl">
            👂
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display font-bold text-xl text-slate-900 dark:text-white">
                {hi ? 'यूस्टेशियन ट्यूब (कान-नाक नली) और कान का दबाव गाइड' : 'Eustachian Tube Dysfunction & Ear Barotrauma Guide'}
              </h2>
              <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 dark:bg-ink-800 dark:text-teal-300 border border-teal-200 dark:border-ink-700">
                ABDM Clinical Content
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {hi
                ? 'कान के दबाव, उड़ान/गोताखोरी में दर्द, ऑटोफोनी और यूस्टेशियन ट्यूब का व्यापक गाइड।'
                : 'Understand middle ear pressure equalization, flying/diving ear pain, autophony, and safe recovery steps.'}
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100 dark:border-ink-800">
          {[
            { id: 'overview', label: hi ? '1. यूस्टेशियन ट्यूब क्या है?' : '1. What is the Eustachian Tube?' },
            { id: 'causes', label: hi ? '2. कारण व बारोट्रॉमा' : '2. Causes & Barotrauma' },
            { id: 'symptoms', label: hi ? '3. लक्षण व ऑटोफोनी' : '3. Symptoms & Autophony' },
            { id: 'treatment', label: hi ? '4. डॉक्टरी इलाज' : '4. Medical Treatments' },
            { id: 'selfcare', label: hi ? '5. स्व-देखभाल व रोकथाम' : '5. Self-Care & Prevention' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`text-xs font-bold px-3.5 py-1.5 rounded-xl border transition-all ${
                activeTab === tab.id
                  ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
                  : 'bg-slate-50 dark:bg-ink-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-ink-800 hover:border-teal-300'
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
              <Activity className="w-5 h-5 text-teal-600" />
              {hi ? 'यूस्टेशियन ट्यूब कैसे काम करती है?' : 'How Does the Eustachian Tube Function?'}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
              <div className="bg-teal-50/60 dark:bg-ink-950/60 p-4 rounded-2xl border border-teal-100 dark:border-ink-800 space-y-2">
                <strong className="font-bold text-teal-900 dark:text-teal-300 text-sm block">
                  {hi ? 'मध्य कान और गले का जुड़ाव' : 'Anatomical Connection'}
                </strong>
                <p>
                  {hi
                    ? 'यूस्टेशियन नली आपके मध्य कान (कान के पर्दे के पीछे की जगह) को नाक के पिछले हिस्से और गले के ऊपरी भाग (नासोग्रसनी) से जोड़ती है।'
                    : 'The Eustachian tube is a narrow canal connecting the middle ear cavity (behind the eardrum) to the back of your nasal passage and upper throat (nasopharynx).'}
                </p>
              </div>

              <div className="bg-teal-50/60 dark:bg-ink-950/60 p-4 rounded-2xl border border-teal-100 dark:border-ink-800 space-y-2">
                <strong className="font-bold text-teal-900 dark:text-teal-300 text-sm block">
                  {hi ? 'दबाव संतुलन (Equilibrium)' : 'Pressure Equalization'}
                </strong>
                <p>
                  {hi
                    ? 'सामान्य स्थिति में, यह नली निगलते, उबासी लेते या चबाते समय खुलती और बंद होती है। इससे मध्य कान का हवा का दबाव बाहरी वातावरण के दबाव के बराबर बना रहता है।'
                    : 'Normally, the tube momentarily opens and closes during swallowing, yawning, or chewing to equalize internal middle ear air pressure with ambient environmental pressure.'}
                </p>
              </div>
            </div>

            {/* Types of Eustachian Tube Dysfunction */}
            <div className="space-y-3 pt-2">
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                {hi ? 'यूस्टेशियन नली की मुख्य समस्याएं:' : 'Primary Types of Eustachian Tube Dysfunction (ETD):'}
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 p-4 rounded-2xl space-y-1.5">
                  <span className="text-xs font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider block">
                    1. Blocked ETD / Ear Barotrauma (नली का बंद होना)
                  </span>
                  <p className="text-xs text-amber-950 dark:text-amber-200 leading-relaxed">
                    {hi
                      ? 'यदि सूजन या बलगम के कारण नली ठीक से नहीं खुलती है, तो मध्य कान में हवा का दबाव बाहरी दबाव से अलग हो जाता है। इससे कान दर्द, भारीपन, सुनने में धीमापन और पर्दे की क्षति होती है, जिसे "इयर बारोट्रॉमा" कहते हैं।'
                      : 'If swelling or congestion prevents the tube from opening, pressure imbalance develops across the eardrum. This causes ear pain, fullness, muffled hearing, and eardrum strain known as "ear barotrauma".'}
                  </p>
                </div>

                <div className="bg-cyan-50/70 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-900 p-4 rounded-2xl space-y-1.5">
                  <span className="text-xs font-bold text-cyan-800 dark:text-cyan-300 uppercase tracking-wider block">
                    2. Patulous Eustachian Tube (नली का लगातार खुला रहना)
                  </span>
                  <p className="text-xs text-cyan-950 dark:text-cyan-200 leading-relaxed">
                    {hi
                      ? 'कुछ रोगियों में नली सामान्य रूप से बंद नहीं होती और लगातार खुली रहती है। इससे रोगी को खुद की आवाज और सांस लेने की तेज गूंज सुनाई देती है (ऑटोफोनी)।'
                      : 'In some individuals, the Eustachian tube stays abnormally open continuously. This produces "autophony" — hearing the loud resonance of your own voice and breathing in your ear.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Long term risks */}
            <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 p-4 rounded-2xl space-y-2">
              <strong className="text-xs font-bold text-red-800 dark:text-red-300 uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                {hi ? 'दीर्घकालिक समस्याएं व चेतावनी:' : 'Potential Complications of Untreated ETD:'}
              </strong>
              <ul className="text-xs text-red-900 dark:text-red-200 space-y-1 list-disc pl-5">
                <li>{hi ? 'मध्य कान का संक्रमण (Acute Otitis Media - कान में मवाद व दर्द)' : 'Middle ear infection (Acute Otitis Media / fluid buildup)'}</li>
                <li>{hi ? 'कान के पर्दे का फटना (Tympanic Membrane Perforation)' : 'Eardrum rupture or perforation'}</li>
                <li>{hi ? 'सुनने की क्षमता में कमी (Conductive Hearing Loss)' : 'Conductive hearing loss'}</li>
                <li>{hi ? 'बच्चों में सुनने की कमी से भाषा व बोलने के विकास में देरी' : 'In children, persistent hearing reduction can lead to speech & language development delay'}</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Causes */}
      {activeTab === 'causes' && (
        <div className="bg-white dark:bg-ink-900 border border-slate-200 dark:border-ink-800 rounded-3xl p-6 shadow-sm space-y-5">
          <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white">
            {hi ? 'यूस्टेशियन नली की समस्याओं के मुख्य कारण' : 'What Causes Eustachian Tube Problems?'}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-50 dark:bg-ink-950 p-4 rounded-2xl border border-slate-200 dark:border-ink-800 space-y-2">
              <div className="flex items-center gap-2">
                <Stethoscope className="w-4 h-4 text-teal-600" />
                <strong className="font-bold text-xs text-slate-900 dark:text-white uppercase tracking-wider">
                  {hi ? '1. सूजन व म्यूकोसल कंजेशन' : '1. Inflammation & Congestion'}
                </strong>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {hi
                  ? 'सर्दी-जुकाम (Cold/Flu), एलर्जी (Allergic Rhinitis), साइनस संक्रमण, कान में इंफेक्शन या एसिड रिफ्लक्स (LPR/GERD) नली की परत में सूजन पैदा करते हैं।'
                  : 'Common colds, upper respiratory infections, allergic rhinitis, sinus infections, ear infections, or acid reflux (GERD/LPR) cause mucosal lining swelling that obstructs the tube.'}
              </p>
            </div>

            <div className="bg-slate-50 dark:bg-ink-950 p-4 rounded-2xl border border-slate-200 dark:border-ink-800 space-y-2">
              <div className="flex items-center gap-2">
                <Plane className="w-4 h-4 text-cyan-600" />
                <strong className="font-bold text-xs text-slate-900 dark:text-white uppercase tracking-wider">
                  {hi ? '2. अचानक हवा का दबाव बदलना (Barotrauma)' : '2. Rapid Air Pressure Changes'}
                </strong>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {hi
                  ? 'हवाई जहाज में यात्रा (टेक-ऑफ व लैंडिंग), स्कूबा डाइविंग (Scuba Diving), या ऊंचे पहाड़ों पर गाड़ी चलाने से बाहरी दबाव तेजी से बदलता है।'
                  : 'Airplane flights (take-off and landing descent), deep-sea scuba diving, or driving up steep mountain passes create sudden ambient barometric pressure shifts.'}
              </p>
            </div>

            <div className="bg-slate-50 dark:bg-ink-950 p-4 rounded-2xl border border-slate-200 dark:border-ink-800 space-y-2">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-amber-600" />
                <strong className="font-bold text-xs text-slate-900 dark:text-white uppercase tracking-wider">
                  {hi ? '3. नली में रुकावट (Obstruction)' : '3. Anatomical & Tissue Blockage'}
                </strong>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {hi
                  ? 'बच्चों में बढ़े हुए एडेनोइड्स (Adenoid hypertrophy), नाक में पॉलीप्स या नली के पास की गांठें नली के द्वार को बंद कर सकती हैं।'
                  : 'Enlarged adenoid tissue (common in children), nasal polyps, or nasopharyngeal masses can mechanically block the Eustachian opening.'}
              </p>
            </div>

            <div className="bg-slate-50 dark:bg-ink-950 p-4 rounded-2xl border border-slate-200 dark:border-ink-800 space-y-2">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-indigo-600" />
                <strong className="font-bold text-xs text-slate-900 dark:text-white uppercase tracking-wider">
                  {hi ? '4. बच्चों की शारीरिक बनावट' : '4. Paediatric Anatomy'}
                </strong>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {hi
                  ? 'शिशुओं और छोटे बच्चों की यूस्टेशियन नली वयस्कों की तुलना में छोटी, अधिक सीधी (क्षैतिज) और संकीर्ण होती है, जिससे उनमें इंफेक्शन और रुकावट का खतरा अधिक रहता है।'
                  : 'Infants and young children naturally have shorter, narrower, and more horizontal Eustachian tubes, making fluid drainage and pressure regulation more difficult.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Symptoms */}
      {activeTab === 'symptoms' && (
        <div className="bg-white dark:bg-ink-900 border border-slate-200 dark:border-ink-800 rounded-3xl p-6 shadow-sm space-y-5">
          <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white">
            {hi ? 'यूस्टेशियन नली विकार के मुख्य लक्षण' : 'Common Symptoms of Eustachian Tube Dysfunction'}
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              { titleEn: 'Ear Pain & Stabbing Discomfort', titleHi: 'कान में दर्द और खिंचाव', descEn: 'Aching or sharp discomfort inside one or both ears.', descHi: 'एक या दोनों कानों के अंदर हल्का या तेज दर्द।' },
              { titleEn: 'Fullness & Pressure', titleHi: 'कान में भारीपन व दबाव', descEn: 'Feeling like ears are clogged, popping, or under water.', descHi: 'कान बंद होना या पानी में डूबा हुआ महसूस होना।' },
              { titleEn: 'Muffled Hearing', titleHi: 'सुनने में धीमापन', descEn: 'Reduced clarity or dullness in sound perception.', descHi: 'आवाज़ें धीमी या गूंजती हुई महसूस होना।' },
              { titleEn: 'Tinnitus (Ringing)', titleHi: 'टीनाइटस (कान में सीटी/बजना)', descEn: 'Ringing, buzzing, or clicking sounds inside the ear.', descHi: 'कान के अंदर सीटी, घंटी या कट-कट की आवाज़।' },
              { titleEn: 'Dizziness & Balance Issue', titleHi: 'चक्कर आना या अस्थिरता', descEn: 'Mild light-headedness due to inner/middle ear pressure.', descHi: 'मध्य कान के दबाव के कारण हल्का चक्कर आना।' },
              { titleEn: 'Autophony (Own Voice Echo)', titleHi: 'ऑटोफोनी (अपनी आवाज़ की गूंज)', descEn: 'Hearing your own voice and breathing unusually loud.', descHi: 'अपनी ही आवाज़ और सांस लेने की तेज़ गूंज सुनाई देना।' },
            ].map((s) => (
              <div key={s.titleEn} className="bg-slate-50 dark:bg-ink-950 p-4 rounded-2xl border border-slate-200 dark:border-ink-800 space-y-1">
                <span className="font-bold text-xs text-teal-700 dark:text-teal-400 block">{hi ? s.titleHi : s.titleEn}</span>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-snug">{hi ? s.descHi : s.descEn}</p>
              </div>
            ))}
          </div>

          {/* Diagnostics Section */}
          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-ink-800 space-y-3">
            <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Stethoscope className="w-4 h-4 text-clinical-600" />
              {hi ? 'क्या जांच (Tests) की आवश्यकता होती है?' : 'Do I Need Medical Tests?'}
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {hi
                ? 'ज्यादातर मामलों में ईएनटी डॉक्टर आपके लक्षणों को सुनकर और ऑटोस्कोप (Otoscope) से कान के पर्दे की जांच करके ही डायग्नोसिस बना लेते हैं। हालांकि, यदि लक्षण गंभीर या एकतरफा (एक ही कान में) हों, तो डॉक्टर टिमपैनोमेट्री (Tympanometry - पर्दे का दबाव परीक्षण), श्रवण जांच (Audiometry) या नेसोफैरिंजोस्कोपी (Nasopharyngoscopy) की सिफारिश कर सकते हैं।'
                : 'Usually no complex tests are needed; an ENT doctor can diagnose ETD by examining your eardrum with an otoscope. For persistent, severe, or one-sided symptoms, they may perform Tympanometry (eardrum pressure test), Pure Tone Audiometry (hearing evaluation), or Flexible Nasal Endoscopy.'}
            </p>
          </div>
        </div>
      )}

      {/* Tab 4: Treatment */}
      {activeTab === 'treatment' && (
        <div className="bg-white dark:bg-ink-900 border border-slate-200 dark:border-ink-800 rounded-3xl p-6 shadow-sm space-y-5">
          <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white">
            {hi ? 'यूस्टेशियन ट्यूब की समस्याओं का इलाज' : 'How Are Eustachian Tube Problems Treated?'}
          </h3>

          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-teal-50/60 dark:bg-ink-950 p-4 rounded-2xl border border-teal-200 dark:border-ink-800 space-y-1.5">
                <strong className="text-xs font-bold text-teal-800 dark:text-teal-300 uppercase tracking-wider block">
                  {hi ? '1. स्टेरॉयड नेज़ल स्प्रे (Nasal Steroid Sprays)' : '1. Nasal Steroid Sprays'}
                </strong>
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                  {hi
                    ? 'फ्लोटिकासोन या मोमेटासोन जैसे स्प्रे नाक के पिछले हिस्से में नली के द्वार की सूजन को कम करने में बेहद असरदार होते हैं।'
                    : 'Intranasal corticosteroid sprays (e.g. Fluticasone, Mometasone) reduce inflammation and tissue swelling surrounding the Eustachian tube opening.'}
                </p>
              </div>

              <div className="bg-teal-50/60 dark:bg-ink-950 p-4 rounded-2xl border border-teal-200 dark:border-ink-800 space-y-1.5">
                <strong className="text-xs font-bold text-teal-800 dark:text-teal-300 uppercase tracking-wider block">
                  {hi ? '2. एंटीहिस्टामिन व एंटी-रिफ्लक्स दवाएं' : '2. Antihistamines & Acid Blockers'}
                </strong>
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                  {hi
                    ? 'एलर्जी होने पर एंटीहिस्टामिन दवाएं छींक व स्राव रोकती हैं। एसिड रिफ्लक्स से नली में सूजन होने पर आहार परिवर्तन व एंटासिड/पीपीआई दिए जाते हैं।'
                    : 'Antihistamines reduce allergic swelling and mucosal secretions. If acid reflux is triggering ETD, dietary modifications and PPI acid blockers are prescribed.'}
                </p>
              </div>

              <div className="bg-teal-50/60 dark:bg-ink-950 p-4 rounded-2xl border border-teal-200 dark:border-ink-800 space-y-1.5">
                <strong className="text-xs font-bold text-teal-800 dark:text-teal-300 uppercase tracking-wider block">
                  {hi ? '3. पर्याप्त जलपान (Hydration)' : '3. Dehydration Avoidance'}
                </strong>
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                  {hi
                    ? 'भरपूर पानी पिएं। शरीर में पानी की कमी से नाक व गले का बलगम गाढ़ा हो जाता है, जिससे नली आसानी से बंद हो जाती है।'
                    : 'Drink plenty of fluids to keep mucosal secretions thin and clear, preventing thick mucus plugs in the Eustachian canal.'}
                </p>
              </div>

              <div className="bg-teal-50/60 dark:bg-ink-950 p-4 rounded-2xl border border-teal-200 dark:border-ink-800 space-y-1.5">
                <strong className="text-xs font-bold text-teal-800 dark:text-teal-300 uppercase tracking-wider block">
                  {hi ? '4. शल्य चिकित्सा (Surgery - यदि आवश्यक हो)' : '4. Surgical Options (For Chronic ETD)'}
                </strong>
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                  {hi
                    ? 'ज्यादातर रोगियों को सर्जरी की जरूरत नहीं होती। लेकिन लंबे समय से जारी ETD में ग्रोमेट ट्यूब (Ear Tubes) या बैलून डाइलेटेशन (Balloon Tuboplasty) किया जाता है।'
                    : 'Most people do not require surgery. However, chronic refractory cases may benefit from Tympanostomy (grommet tube placement) or Balloon Eustachian Tuboplasty (BET).'}
                </p>
              </div>
            </div>

            {/* Antibiotics Warning */}
            <div className="bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-900 p-4 rounded-2xl flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-900 dark:text-amber-200 space-y-1">
                <strong className="font-bold block">
                  {hi ? 'एंटीबायोटिक दवाओं के बारे में महत्वपूर्ण नियम:' : 'Important Note on Antibiotics:'}
                </strong>
                <p>
                  {hi
                    ? 'यूस्टेशियन नली की रुकावट के इलाज के लिए एंटीबायोटिक्स की आवश्यकता नहीं होती है। एंटीबायोटिक केवल तभी दिए जाते हैं जब कान में बैक्टीरिया से मवाद/संक्रमण (Ear Infection) विकसित हो जाए।'
                    : 'Antibiotics are NOT indicated for treating simple Eustachian tube dysfunction. They are only prescribed if a secondary bacterial ear infection (Otitis Media) is diagnosed by your doctor.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 5: Self Care */}
      {activeTab === 'selfcare' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-ink-900 border border-slate-200 dark:border-ink-800 rounded-3xl p-6 shadow-sm space-y-5">
            <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white">
              {hi ? 'स्व-देखभाल तकनीक और रोकथाम' : 'What You Can Do On Your Own & Prevention'}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {/* Maneuvers */}
              <div className="bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 p-4 rounded-2xl space-y-3">
                <strong className="font-bold text-emerald-900 dark:text-emerald-300 text-sm block flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  {hi ? 'कान खोलने की सरल तकनीकें:' : 'Simple Equalization Maneuvers:'}
                </strong>
                <ul className="space-y-2 text-emerald-950 dark:text-emerald-200">
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-emerald-600">•</span>
                    <span>{hi ? 'च्युइंग गम चबाएं या टॉफी चूसे।' : 'Chew sugar-free gum or suck on hard candies.'}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-emerald-600">•</span>
                    <span>{hi ? 'बार-बार लार निगलें या उबासी लें।' : 'Swallow frequently or open mouth wide in a yawn.'}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-emerald-600">•</span>
                    <span>
                      <strong>{hi ? 'वलसाल्वा पैंतरा (Valsalva Maneuver): ' : 'Valsalva Maneuver: '}</strong>
                      {hi
                        ? 'सांस अंदर लें, मुंह बंद करें, नाक को उंगलियों से भींचें, फिर हल्के से नाक से हवा छोड़ने का प्रयास करें।'
                        : 'Take a breath in, close your mouth, pinch your nostrils shut, and gently blow air against your closed nose until ears pop softly.'}
                    </span>
                  </li>
                </ul>
              </div>

              {/* Prevention */}
              <div className="bg-cyan-50/70 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-800 p-4 rounded-2xl space-y-3">
                <strong className="font-bold text-cyan-900 dark:text-cyan-300 text-sm block flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-cyan-600" />
                  {hi ? 'रोकथाम के मुख्य नियम:' : 'Prevention Guidelines:'}
                </strong>
                <ul className="space-y-2 text-cyan-950 dark:text-cyan-200">
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-cyan-600">•</span>
                    <span>
                      {hi
                        ? 'सर्दी, साइनस या कान के इंफेक्शन के दौरान हवाई जहाज में सफर या स्कूबा डाइविंग से बचें।'
                        : 'Avoid air travel or scuba diving during an active severe cold, sinus, or ear infection.'}
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-cyan-600">•</span>
                    <span>
                      {hi
                        ? 'उड़ान में लैंडिंग के दौरान सोएं नहीं — जागते रहें ताकि नियमित निगल सकें।'
                        : 'Do not sleep during airplane descent; stay awake to consciously swallow and pop ears.'}
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-cyan-600">•</span>
                    <span>
                      {hi
                        ? 'धूम्रपान (Smoking) और सिगरेट के धुएं (Passive Smoking) से पूरी तरह दूर रहें।'
                        : 'Avoid smoking and secondhand tobacco smoke exposure, as nicotine paralyzes mucosal cilia.'}
                    </span>
                  </li>
                </ul>
              </div>
            </div>

            {/* When to Call Doctor */}
            <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 p-5 rounded-2xl space-y-2">
              <strong className="text-sm font-bold text-red-800 dark:text-red-300 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-red-600" />
                {hi ? 'ईएनटी डॉक्टर को कब कॉल करें?' : 'When Should You Call the Doctor?'}
              </strong>
              <p className="text-xs text-red-900 dark:text-red-200 leading-relaxed">
                {hi
                  ? 'यदि आपके लक्षण अत्यंत गंभीर हैं, दर्द लगातार बढ़ रहा है, या 2-3 सप्ताह से अधिक समय से केवल एक तरफ (एक ही कान में) बने हुए हैं, तो तुरंत ईएनटी विशेषज्ञ से परामर्श लें।'
                  : 'Contact your doctor or nurse for advice if your symptoms are severe, worsening, or persist for more than a few weeks — especially if they only affect one ear (unilateral symptoms requiring evaluation).'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
