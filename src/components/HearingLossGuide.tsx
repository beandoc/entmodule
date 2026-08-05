'use client';

import React, { useState } from 'react';
import { Volume2, VolumeX, ShieldAlert, CheckCircle2, Stethoscope, Ear, Activity, AlertTriangle, Sparkles, Headphones } from 'lucide-react';
import { useAppData } from '@/lib/app-data-context';

export const HearingLossGuide: React.FC = () => {
  const { locale } = useAppData();
  const hi = locale === 'hi';
  const [activeTab, setActiveTab] = useState<'overview' | 'types' | 'tests' | 'treatment' | 'prevention'>('overview');

  return (
    <div className="space-y-6 pb-10">
      {/* Header Card */}
      <div className="bg-white dark:bg-ink-900 border border-slate-200 dark:border-ink-800 rounded-3xl p-6 shadow-sm space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-indigo-50 dark:bg-ink-800 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xl">
            <Ear className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display font-bold text-xl text-slate-900 dark:text-white">
                {hi ? 'श्रवण हानि (बहरापन व कम सुनाई देना) गाइड' : 'Hearing Loss Types, Diagnostics & Care Guide'}
              </h2>
              <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 dark:bg-ink-800 dark:text-indigo-300 border border-indigo-200 dark:border-ink-700">
                Audiology & Otology
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {hi
                ? 'संवेदी-तंत्रिका (SNHL), संवाहकीय (CHL), ऑडियोग्राम टेस्ट, हियरिंग एड, कॉकलियर इम्प्लांट व कान की सुरक्षा गाइड।'
                : 'Comprehensive guide to Sensorineural vs Conductive hearing loss, audiometry, hearing aids, cochlear implants & 85dB noise protection.'}
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100 dark:border-ink-800">
          {[
            { id: 'overview', label: hi ? '1. श्रवण हानि क्या है?' : '1. What is Hearing Loss?' },
            { id: 'types', label: hi ? '2. प्रकार व कारण (SNHL/CHL)' : '2. Types & Causes' },
            { id: 'tests', label: hi ? '3. जांच व ऑडियोग्राम' : '3. Tests & Audiogram' },
            { id: 'treatment', label: hi ? '4. इलाज व हियरिंग एड' : '4. Treatments & Aids' },
            { id: 'prevention', label: hi ? '5. रोकथाम व कान सुरक्षा' : '5. Prevention & Safety' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`text-xs font-bold px-3.5 py-1.5 rounded-xl border transition-all ${
                activeTab === tab.id
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                  : 'bg-slate-50 dark:bg-ink-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-ink-800 hover:border-indigo-300'
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
              <VolumeX className="w-5 h-5 text-indigo-600" />
              {hi ? 'श्रवण हानि क्या है और इसके लक्षण क्या हैं?' : 'Understanding Hearing Loss & Symptoms'}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
              <div className="bg-indigo-50/60 dark:bg-ink-950/60 p-4 rounded-2xl border border-indigo-100 dark:border-ink-800 space-y-2">
                <strong className="font-bold text-indigo-900 dark:text-indigo-300 text-sm block">
                  {hi ? 'सुनने की क्षमता में कमी' : 'Reduced Sound Perception'}
                </strong>
                <p>
                  {hi
                    ? 'श्रवण हानि वह स्थिति है जब व्यक्ति एक या दोनों कानों में सामान्य की तुलना में कम सुन पाता है। यह हल्का (केवल कुछ ध्वनियों का न सुनाई देना) से लेकर पूर्ण बहरापन (बिल्कुल न सुनाई देना) तक हो सकता है।'
                    : 'Hearing loss occurs when an individual cannot hear as clearly or fully as usual in one or both ears. It ranges from mild difficulty hearing soft frequencies to total deafness.'}
                </p>
              </div>

              <div className="bg-indigo-50/60 dark:bg-ink-950/60 p-4 rounded-2xl border border-indigo-100 dark:border-ink-800 space-y-2">
                <strong className="font-bold text-indigo-900 dark:text-indigo-300 text-sm block">
                  {hi ? 'अस्थायी बनाम स्थायी (Temporary vs Permanent)' : 'Reversibility Spectrum'}
                </strong>
                <p>
                  {hi
                    ? 'कई मामलों में कान का मोम साफ करने या इंफेक्शन का इलाज करने से सुनना पूरी तरह ठीक हो जाता है। कुछ प्रकार (जैसे उम्र से संबंधित या तेज आवाज से क्षति) स्थायी होते हैं जिनका इलाज हियरिंग एड या कॉकलियर इम्प्लांट से किया जाता है।'
                    : 'Many forms of hearing loss (e.g., earwax blockage, fluid) improve completely with proper medical treatment. Permanent types (age-related or noise-induced) are effectively managed with hearing aids or implants.'}
                </p>
              </div>
            </div>

            {/* Common Symptoms List */}
            <div className="space-y-2 pt-2">
              <strong className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider block">
                {hi ? 'श्रवण हानि के मुख्य लक्षण:' : 'Key Symptoms of Hearing Loss:'}
              </strong>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                <div className="bg-slate-50 dark:bg-ink-950 p-3 rounded-xl border border-slate-200 dark:border-ink-800 space-y-1">
                  <strong className="font-bold text-indigo-700 dark:text-indigo-400 block">1. Sound Muffling</strong>
                  <p className="text-slate-600 dark:text-slate-400">Difficulty understanding words, especially against background noise.</p>
                </div>
                <div className="bg-slate-50 dark:bg-ink-950 p-3 rounded-xl border border-slate-200 dark:border-ink-800 space-y-1">
                  <strong className="font-bold text-indigo-700 dark:text-indigo-400 block">2. Ear Fullness</strong>
                  <p className="text-slate-600 dark:text-slate-400">Feeling like ears are plugged, waterlogged, or under pressure.</p>
                </div>
                <div className="bg-slate-50 dark:bg-ink-950 p-3 rounded-xl border border-slate-200 dark:border-ink-800 space-y-1">
                  <strong className="font-bold text-indigo-700 dark:text-indigo-400 block">3. Ringing / Tinnitus</strong>
                  <p className="text-slate-600 dark:text-slate-400">Accompanied by whistling, buzzing, or humming noises in ears.</p>
                </div>
                <div className="bg-slate-50 dark:bg-ink-950 p-3 rounded-xl border border-slate-200 dark:border-ink-800 space-y-1">
                  <strong className="font-bold text-indigo-700 dark:text-indigo-400 block">4. Turning Up Volume</strong>
                  <p className="text-slate-600 dark:text-slate-400">Needing higher TV/phone volume than family members require.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Types & Causes */}
      {activeTab === 'types' && (
        <div className="bg-white dark:bg-ink-900 border border-slate-200 dark:border-ink-800 rounded-3xl p-6 shadow-sm space-y-5">
          <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white">
            {hi ? 'श्रवण हानि के मुख्य प्रकार व कारण' : 'Types & Causes of Hearing Loss'}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* SNHL */}
            <div className="bg-slate-50 dark:bg-ink-950 p-4 rounded-2xl border border-slate-200 dark:border-ink-800 space-y-2">
              <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300">
                Type A: Inner Ear Nerve
              </span>
              <strong className="font-bold text-xs text-slate-900 dark:text-white block">
                1. Sensorineural Hearing Loss (SNHL / संवेदी-तंत्रिका)
              </strong>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {hi
                  ? 'आंतरिक कान (Cochlea) या श्रवण तंत्रिका में क्षति से होता है। मुख्य कारण: उम्र बढ़ना (Presbycusis), तेज़ आवाज़ का शोर, आंतरिक कान का संक्रमण (Labrynthitis), या ओटोटॉक्सिक दवाएं।'
                  : 'Occurs due to damage to inner ear hair cells or auditory nerve pathways. Causes include aging (presbycusis), noise trauma, inner ear infections, or ototoxic drugs.'}
              </p>
            </div>

            {/* CHL */}
            <div className="bg-slate-50 dark:bg-ink-950 p-4 rounded-2xl border border-slate-200 dark:border-ink-800 space-y-2">
              <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300">
                Type B: Outer / Middle Ear Block
              </span>
              <strong className="font-bold text-xs text-slate-900 dark:text-white block">
                2. Conductive Hearing Loss (CHL / संवाहकीय)
              </strong>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {hi
                  ? 'ध्वनि तरंगों का बाहरी या मध्य कान से आंतरिक कान तक न पहुंच पाना। मुख्य कारण: कान का सख्त मोम (Cerumen), मध्य कान में पानी/स्राव (Otitis Media), पर्दे का फटना, या यूस्टेशियन नली की रुकावट।'
                  : 'Occurs when sound waves cannot travel through outer or middle ear pathways. Common causes: impacted earwax, middle ear fluid/cold, eardrum perforation, or otosclerosis.'}
              </p>
            </div>

            {/* Mixed & Systemic */}
            <div className="bg-slate-50 dark:bg-ink-950 p-4 rounded-2xl border border-slate-200 dark:border-ink-800 space-y-2">
              <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-cyan-100 dark:bg-cyan-950 text-cyan-800 dark:text-cyan-300">
                Type C: Combined & Systemic
              </span>
              <strong className="font-bold text-xs text-slate-900 dark:text-white block">
                3. Mixed Hearing Loss & Systemic Conditions
              </strong>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {hi
                  ? 'जब SNHL और CHL दोनों एक साथ हों। इसके अलावा सिर की चोट, ट्यूमर (Acoustic Neuroma), अनियंत्रित डायबिटीज या ऑटोइम्यून बीमारियां भी श्रवण हानि का कारण बन सकती हैं।'
                  : 'A combination of both SNHL and CHL. Additionally, acoustic neuroma tumors, head trauma, uncontrolled diabetes, or autoimmune inner ear disease can impair hearing.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Diagnostic Tests */}
      {activeTab === 'tests' && (
        <div className="bg-white dark:bg-ink-900 border border-slate-200 dark:border-ink-800 rounded-3xl p-6 shadow-sm space-y-5">
          <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
            <Stethoscope className="w-5 h-5 text-indigo-600" />
            {hi ? 'श्रवण परीक्षण एवं ऑडियोग्राम (Diagnostic Evaluation)' : 'Clinical Examinations & Audiogram Testing'}
          </h3>

          <div className="space-y-4">
            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
              {hi
                ? 'यदि आपको सुनने में कठिनाई महसूस होती है, तो ईएनटी डॉक्टर ऑटोस्कोप (Otoscope) से आपके कान की जांच करेंगे ताकि मोम, सूजन या पर्दे की चोट का पता लगाया जा सके। इसके बाद ऑडियोलॉजिस्ट द्वारा विस्तृत ऑडियोग्राम टेस्ट किया जाता है।'
                : 'Your doctor will first examine your ear canal and eardrum with an otoscope. To pinpoint the exact threshold and type of hearing loss, a formal audiogram test is conducted by an audiologist.'}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-50 dark:bg-ink-950 p-4 rounded-2xl border border-slate-200 dark:border-ink-800 space-y-1">
                <strong className="font-bold text-xs text-indigo-700 dark:text-indigo-300 block">1. Otoscopy & Tuning Fork</strong>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  {hi ? 'कान की नली का निरीक्षण और ट्यूनिंग फोर्क (Rinne/Weber test) से SNHL बनाम CHL का प्रारंभिक अंतर।' : 'Visual inspection for wax or fluid, plus Rinne and Weber tuning fork tests.'}
                </p>
              </div>

              <div className="bg-slate-50 dark:bg-ink-950 p-4 rounded-2xl border border-slate-200 dark:border-ink-800 space-y-1">
                <strong className="font-bold text-xs text-indigo-700 dark:text-indigo-300 block">2. Pure Tone Audiometry (PTA)</strong>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  {hi ? 'हेडफोन लगाकर विभिन्न आवृत्तियों (Frequencies) पर सबसे धीमी आवाज़ सुनने की क्षमता को मैप करने वाला ऑडियोग्राम।' : 'Headphones play sounds at varying pitches to map your exact hearing threshold graph.'}
                </p>
              </div>

              <div className="bg-slate-50 dark:bg-ink-950 p-4 rounded-2xl border border-slate-200 dark:border-ink-800 space-y-1">
                <strong className="font-bold text-xs text-indigo-700 dark:text-indigo-300 block">3. Tympanometry & Imaging</strong>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  {hi ? 'पर्दे की गतिशीलता की जांच (Tympanometry) और आवश्यकता पड़ने पर सिर का एमआरआई/सीटी स्कैन।' : 'Measures eardrum flexibility; CT/MRI scans performed if nerve/bone pathology is suspected.'}
                </p>
              </div>
            </div>

            {/* Sudden Hearing Loss Red Flag */}
            <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 p-4 rounded-2xl space-y-1.5">
              <strong className="text-xs font-bold text-red-800 dark:text-red-300 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-red-600" />
                {hi ? 'अचानक श्रवण हानि (Sudden Sensorineural Hearing Loss - SSNHL) मेडिकल इमरजेंसी!' : 'Sudden Hearing Loss is a Medical Emergency!'}
              </strong>
              <p className="text-xs text-red-900 dark:text-red-200 leading-relaxed">
                {hi
                  ? 'यदि 3 दिनों के भीतर अचानक एक कान से सुनना बहुत कम या बंद हो जाए, तो इसे तुरंत आपातकालीन ईएनटी स्थिति मानें! पहले 24-72 घंटों में ओरल स्टेरॉयड इलाज शुरू करने से सुनना वापस आने की संभावना बहुत अधिक होती है।'
                  : 'Sudden drop in hearing in one ear over 72 hours (SSNHL) requires SAME-DAY emergency ENT evaluation. Early corticosteroid therapy within 24-72 hours significantly increases chances of full hearing recovery.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Treatments */}
      {activeTab === 'treatment' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-ink-900 border border-slate-200 dark:border-ink-800 rounded-3xl p-6 shadow-sm space-y-5">
            <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white">
              {hi ? 'इलाज, हियरिंग एड व कॉकलियर इम्प्लांट' : 'Treatments & Hearing Rehabilitation'}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-indigo-50/70 dark:bg-ink-950 border border-indigo-200 dark:border-ink-800 p-4 rounded-2xl space-y-2">
                <strong className="font-bold text-xs text-indigo-900 dark:text-indigo-300 uppercase tracking-wider block">
                  {hi ? '1. अस्थायी बहरेपन का इलाज' : '1. Reversible / Medical Causes'}
                </strong>
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                  {hi
                    ? 'कान का मोम साफ करना, कान के इंफेक्शन के लिए एंटीबायोटिक्स, या यूस्टेशियन नली की सूजन के लिए स्टेरॉयड नेज़ल स्प्रे से सुनना पूरी तरह वापस आ जाता है।'
                    : 'Professional earwax removal, antibiotics for otitis media, or decongestant/nasal sprays for Eustachian tube fluid often completely restore hearing.'}
                </p>
              </div>

              <div className="bg-indigo-50/70 dark:bg-ink-950 border border-indigo-200 dark:border-ink-800 p-4 rounded-2xl space-y-2">
                <strong className="font-bold text-xs text-indigo-900 dark:text-indigo-300 uppercase tracking-wider block">
                  {hi ? '2. डिजिटल हियरिंग एड (Hearing Aids)' : '2. Digital Hearing Aids'}
                </strong>
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                  {hi
                    ? 'स्थायी SNHL में आधुनिक डिजिटल हियरिंग एड (BTE, RIC, ITE) ध्वनियों को आपकी व्यक्तिगत ऑडियोग्राम प्रोफाइल के अनुसार एम्प्लीफाई करके स्पष्ट बनाते हैं।'
                    : 'For permanent age-related or sensory hearing loss, tailored digital hearing aids amplify soft speech frequencies while filtering out background noise.'}
                </p>
              </div>

              <div className="bg-indigo-50/70 dark:bg-ink-950 border border-indigo-200 dark:border-ink-800 p-4 rounded-2xl space-y-2">
                <strong className="font-bold text-xs text-indigo-900 dark:text-indigo-300 uppercase tracking-wider block">
                  {hi ? '3. कॉकलियर इम्प्लांट (Cochlear Implants)' : '3. Cochlear Implants (Severe-to-Profound)'}
                </strong>
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                  {hi
                    ? 'गंभीर या पूर्ण बहरेपन से ग्रस्त बच्चों व वयस्कों के लिए कॉकलियर इम्प्लांट सर्जरी द्वारा सीधे श्रवण तंत्रिका को विद्युत संकेत दिए जाते हैं।'
                    : 'Surgically implanted electronic devices for severe-to-profound deafness that bypass damaged cochlear hair cells and directly stimulate the auditory nerve.'}
                </p>
              </div>

              <div className="bg-indigo-50/70 dark:bg-ink-950 border border-indigo-200 dark:border-ink-800 p-4 rounded-2xl space-y-2">
                <strong className="font-bold text-xs text-indigo-900 dark:text-indigo-300 uppercase tracking-wider block">
                  {hi ? '4. सहायक कौशल व सांकेतिक भाषा' : '4. Assistive Listening & Sign Language'}
                </strong>
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                  {hi
                    ? 'लिप-रीडिंग (ऑन्ठ पढ़ना), सांकेतिक भाषा (Sign Language) और फोन एम्प्लीफायर से दैनिक जीवन में संवाद बेहद आसान हो जाता है।'
                    : 'Lip-reading techniques, visual sign language, vibrating alerts, and captioning devices empower daily communication.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 5: Prevention & Safety */}
      {activeTab === 'prevention' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-ink-900 border border-slate-200 dark:border-ink-800 rounded-3xl p-6 shadow-sm space-y-5">
            <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white">
              {hi ? 'श्रवण सुरक्षा व बहरेपन की रोकथाम' : 'How Can Hearing Loss Be Prevented?'}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 p-4 rounded-2xl space-y-2">
                <strong className="font-bold text-emerald-900 dark:text-emerald-300 text-sm block flex items-center gap-1.5">
                  <Headphones className="w-4 h-4 text-emerald-600" />
                  {hi ? '1. 85dB नियम व कान सुरक्षा पहनें' : '1. Avoid Noise Above 85 dB'}
                </strong>
                <p className="text-emerald-950 dark:text-emerald-200 leading-relaxed">
                  {hi
                    ? 'यदि आपको किसी शोर के ऊपर चिल्लाकर बोलना पड़े, तो वह आवाज़ आपके कान को नुकसान पहुंचाने के लिए काफी तेज़ है (85 डेसिबल से अधिक)! कारखानों या कंसर्ट में हमेशा ईयरप्लग या ईयरमफ पहनें।'
                    : 'Rule of thumb: If you need to shout to be heard over background noise, the environment exceeds 85 decibels (dB) and risks permanent hair cell damage. Always wear earplugs or earmuffs near machinery or concerts.'}
                </p>
              </div>

              <div className="bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 p-4 rounded-2xl space-y-2">
                <strong className="font-bold text-emerald-900 dark:text-emerald-300 text-sm block flex items-center gap-1.5">
                  <Volume2 className="w-4 h-4 text-emerald-600" />
                  {hi ? '2. हेडफोन का सुरक्षित उपयोग (60/60 Rule)' : '2. Safe Headphone Volume (60/60 Rule)'}
                </strong>
                <p className="text-emerald-950 dark:text-emerald-200 leading-relaxed">
                  {hi
                    ? 'हेडफोन या इयरफोन पर वॉल्यूम हमेशा 60% से कम रखें। आपको आसपास के लोगों की बात सुनाई देनी चाहिए। एक बार में 60 मिनट से अधिक लगातार न सुनें।'
                    : 'Keep earphone volume under 60% maximum capacity. You should easily hear someone talking to you nearby. Limit continuous earphone listening to 60 minutes at a time.'}
                </p>
              </div>
            </div>

            {/* Q-Tip Warning */}
            <div className="bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-900 p-4 rounded-2xl flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-900 dark:text-amber-200 space-y-1">
                <strong className="font-bold block">
                  {hi ? 'रूई की तीली (Q-Tips / Cotton Swabs) का इस्तेमाल कभी न करें!' : 'Never Use Cotton Swabs (Q-Tips) Inside the Ear Canal!'}
                </strong>
                <p>
                  {hi
                    ? 'कान में रुई की तीली, पिन या चाबी डालने से कान का मोम और अंदर धकेल दिया जाता है तथा कान का पर्दा फटने का गंभीर खतरा रहता है। कान की अपनी प्राकृतिक सफाई प्रक्रिया होती है।'
                    : 'Inserting cotton swabs or sharp items pushes wax deeper against the eardrum and risks traumatic eardrum perforation. Ear canals self-clean naturally; clean only the outer ear with a towel.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
