'use client';

import React, { useState } from 'react';
import { Volume2, ShieldAlert, CheckCircle2, HelpCircle, Activity, Brain, Ear, Stethoscope, Sparkles, AlertTriangle, Moon, HeartHandshake } from 'lucide-react';
import { useAppData } from '@/lib/app-data-context';

export const TinnitusGuide: React.FC = () => {
  const { locale } = useAppData();
  const hi = locale === 'hi';
  const [activeTab, setActiveTab] = useState<'overview' | 'causes' | 'symptoms' | 'evaluation' | 'treatment'>('overview');

  return (
    <div className="space-y-6 pb-10">
      {/* Header Card */}
      <div className="bg-white dark:bg-ink-900 border border-slate-200 dark:border-ink-800 rounded-3xl p-6 shadow-sm space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-cyan-50 dark:bg-ink-800 text-cyan-600 dark:text-cyan-400 flex items-center justify-center font-bold text-xl">
            🔔
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display font-bold text-xl text-slate-900 dark:text-white">
                {hi ? 'टीनाइटस (कान में बजना / सनसनाहट) प्रबंधन गाइड' : 'Tinnitus (Ringing in Ears) Clinical Management Guide'}
              </h2>
              <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-cyan-50 text-cyan-700 dark:bg-ink-800 dark:text-cyan-300 border border-cyan-200 dark:border-ink-700">
                Otology & Neurotology
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {hi
                ? 'कान में बजने, सीटी, सनसनाहट, कारण, साउंड मास्किंग और रीट्रेनिंग थेरेपी (TRT) का संपूर्ण विवरण।'
                : 'Comprehensive patient guide covering inner ear hair cell signals, pulsatile sounds, sound masking, TRT & sleep management.'}
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100 dark:border-ink-800">
          {[
            { id: 'overview', label: hi ? '1. टीनाइटस क्या है?' : '1. What is Tinnitus?' },
            { id: 'causes', label: hi ? '2. मुख्य कारण' : '2. Causes & Ototoxicity' },
            { id: 'symptoms', label: hi ? '3. लक्षण व प्रकार' : '3. Symptoms & Types' },
            { id: 'evaluation', label: hi ? '4. डॉक्टरी जांच व परीक्षण' : '4. Evaluation & Tests' },
            { id: 'treatment', label: hi ? '5. उपचार व साउंड थेरेपी' : '5. Treatments & Sound Therapy' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`text-xs font-bold px-3.5 py-1.5 rounded-xl border transition-all ${
                activeTab === tab.id
                  ? 'bg-cyan-600 text-white border-cyan-600 shadow-sm'
                  : 'bg-slate-50 dark:bg-ink-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-ink-800 hover:border-cyan-300'
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
              <Ear className="w-5 h-5 text-cyan-600" />
              {hi ? 'टीनाइटस क्या है और यह क्यों होता है?' : 'Understanding Tinnitus'}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
              <div className="bg-cyan-50/60 dark:bg-ink-950/60 p-4 rounded-2xl border border-cyan-100 dark:border-ink-800 space-y-2">
                <strong className="font-bold text-cyan-900 dark:text-cyan-300 text-sm block">
                  {hi ? 'आंतरिक ध्वनि की अनुभूति' : 'Auditory Perception'}
                </strong>
                <p>
                  {hi
                    ? 'टीनाइटस वह स्थिति है जब किसी व्यक्ति को एक या दोनों कानों में (या सिर के अंदर) बाहर किसी स्रोत के बिना सीटी, घंटी, सनसनाहट, भिनभिनाहट या गर्जना जैसी आवाजें सुनाई देती हैं।'
                    : 'Tinnitus is the perception of sound—such as ringing, buzzing, hissing, humming, or roaring—in one or both ears (or inside the head) when no external sound is present.'}
                </p>
              </div>

              <div className="bg-cyan-50/60 dark:bg-ink-950/60 p-4 rounded-2xl border border-cyan-100 dark:border-ink-800 space-y-2">
                <strong className="font-bold text-cyan-900 dark:text-cyan-300 text-sm block">
                  {hi ? 'मस्तिष्क और कान का तंत्र (Brain Signal Processing)' : 'Inner Ear & Neural Mechanism'}
                </strong>
                <p>
                  {hi
                    ? 'यह आमतौर पर आंतरिक कान (Cochlea) की संवेदी बाल कोशिकाओं (Hair cells) में क्षति के कारण होता है। जब ये कोशिकाएं क्षतिग्रस्त होती हैं, तो वे मस्तिष्क को अवांछित सिग्नल भेजती हैं जिन्हें मस्तिष्क आवाज़ मान लेता है।'
                    : 'Tinnitus usually occurs when microscopic sensory hair cells inside the inner ear (cochlea) get damaged or stressed. These cells send phantom electrical signals to the brain, which the auditory cortex interprets as noise.'}
                </p>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-ink-950 p-4 rounded-2xl border border-slate-200 dark:border-ink-800 space-y-2">
              <strong className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider block">
                {hi ? 'मुख्य क्लिनिकल तथ्य:' : 'Key Clinical Reassurance:'}
              </strong>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {hi
                  ? 'टीनाइटस बहुत आम है। हालांकि यह परेशान करने वाला हो सकता है, लेकिन यह आमतौर पर किसी गंभीर या जानलेवा बीमारी का संकेत नहीं होता है। सही रणनीतियों से इसे पूरी तरह नियंत्रित किया जा सकता है।'
                  : 'Tinnitus is extremely common worldwide. While it can be bothersome or frustrating, it is rarely a sign of a dangerous condition, and proven habituation methods effectively lessen its impact over time.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Causes */}
      {activeTab === 'causes' && (
        <div className="bg-white dark:bg-ink-900 border border-slate-200 dark:border-ink-800 rounded-3xl p-6 shadow-sm space-y-5">
          <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white">
            {hi ? 'टीनाइटस के मुख्य कारण व जोखिम कारक' : 'What Causes Tinnitus?'}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-50 dark:bg-ink-950 p-4 rounded-2xl border border-slate-200 dark:border-ink-800 space-y-2">
              <strong className="font-bold text-xs text-cyan-800 dark:text-cyan-400 uppercase tracking-wider block">
                1. Presbycusis & Noise Injury (उम्र व तेज़ आवाज़)
              </strong>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {hi
                  ? 'उम्र बढ़ने के साथ स्वाभाविक रूप से सुनने की कमी होना (Presbycusis) या कारखानों, हेडफोन व आतिशबाजी से तेज़ आवाज़ (Acoustic Trauma) कान की कोशिकाओं को नुकसान पहुंचाते हैं।'
                  : 'Age-related hearing loss (presbycusis) and acoustic trauma from prolonged exposure to loud music, machinery, or sudden explosions are the leading triggers.'}
              </p>
            </div>

            <div className="bg-slate-50 dark:bg-ink-950 p-4 rounded-2xl border border-slate-200 dark:border-ink-800 space-y-2">
              <strong className="font-bold text-xs text-cyan-800 dark:text-cyan-400 uppercase tracking-wider block">
                2. Ototoxic Medications (ओटोटॉक्सिक दवाएं)
              </strong>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {hi
                  ? 'कुछ एंटीबायोटिक्स (जैसे एमिनोग्लाइकोसाइड्स/Gentamicin), प्लेटिनम कीमोथेरेपी (Cisplatin), लूप डाययूरेटिक्स, और बहुत अधिक मात्रा में दर्द निवारक/एस्पिरिन।'
                  : 'Certain prescription medications, including aminoglycoside antibiotics, platinum chemotherapy agents, loop diuretics, and high-dose aspirin, can temporarily or permanently affect ear cells.'}
              </p>
            </div>

            <div className="bg-slate-50 dark:bg-ink-950 p-4 rounded-2xl border border-slate-200 dark:border-ink-800 space-y-2">
              <strong className="font-bold text-xs text-cyan-800 dark:text-cyan-400 uppercase tracking-wider block">
                3. Ear Wax & Middle Ear Issues (मोम व यूस्टेशियन नली)
              </strong>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {hi
                  ? 'कान में सख्त मोम (Cerumen impaction), मध्य कान का संक्रमण, या यूस्टेशियन नली की रुकावट बाहरी ध्वनियों को रोकती हैं, जिससे टीनाइटस अधिक स्पष्ट हो जाता है।'
                  : 'Impacted earwax, middle ear fluid, eardrum stiffness (otosclerosis), or Eustachian tube dysfunction block external sound, amplifying internal ear noise.'}
              </p>
            </div>

            <div className="bg-slate-50 dark:bg-ink-950 p-4 rounded-2xl border border-slate-200 dark:border-ink-800 space-y-2">
              <strong className="font-bold text-xs text-cyan-800 dark:text-cyan-400 uppercase tracking-wider block">
                4. Vascular, TMJ & Head Injuries (धमनी, जबड़ा व चोट)
              </strong>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {hi
                  ? 'सिर व गर्दन की चोटें, जबड़े के जोड़ (TMJ) की समस्या, या कान के पास रक्त वाहिकाओं में ब्लोक्स/उथल-पुथल से दिल की धड़कन जैसी आवाज़ (Pulsatile Tinnitus) आ सकती है।'
                  : 'Head/neck trauma, temporomandibular jaw joint (TMJ) dysfunction, or turbulent blood flow in arteries near the temporal bone (pulsatile tinnitus).'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Symptoms */}
      {activeTab === 'symptoms' && (
        <div className="bg-white dark:bg-ink-900 border border-slate-200 dark:border-ink-800 rounded-3xl p-6 shadow-sm space-y-5">
          <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white">
            {hi ? 'टीनाइटस के विभिन्न प्रकार व ध्वनियां' : 'Symptoms & Sound Variations'}
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              { titleEn: 'High-Pitched Ringing', titleHi: 'तेज़ सीटी या घंटी की आवाज़', descEn: 'A continuous whistle, bell tone, or metallic frequency.', descHi: 'एक निरंतर सीटी, घंटी की टोन या धात्विक आवृत्ति।' },
              { titleEn: 'Buzzing & Humming', titleHi: 'भिनभिनाहट या गुनगुनाहट', descEn: 'Like an electric transformer or low engine drone.', descHi: 'बिजली के ट्रांसफार्मर या धीमे इंजन जैसी ध्वनि।' },
              { titleEn: 'Hissing & White Noise', titleHi: 'सरसराहट व हिसिंग ध्वनि', descEn: 'Resembling escaping steam or radio static.', descHi: 'भाप निकलने या रेडियो के स्थिर शोर जैसी ध्वनि।' },
              { titleEn: 'Pulsatile / Heartbeat Rhythm', titleHi: 'पल्सटाइल (दिल की धड़कन जैसी आवाज़)', descEn: 'A rhythmic pulsing or rushing sound in sync with your pulse.', descHi: 'नाड़ी या दिल की धड़कन की ताल से मेल खाती आवाज़।' },
              { titleEn: 'Roaring or Ocean Waves', titleHi: 'समुद्र की लहरों जैसी गर्जना', descEn: 'A deep, heavy rushing or ocean wave sound.', descHi: 'गहरी, भारी लहरों जैसी सरसराहट।' },
              { titleEn: 'Clicking & Muscle Spasm', titleHi: 'कट-कट या पेशी ऐंठन', descEn: 'Brief clicking sounds caused by middle ear muscle contractions.', descHi: 'कान की छोटी मांसपेशियों के सिकुड़ने से कट-कट की आवाज़।' },
            ].map((s) => (
              <div key={s.titleEn} className="bg-slate-50 dark:bg-ink-950 p-4 rounded-2xl border border-slate-200 dark:border-ink-800 space-y-1">
                <span className="font-bold text-xs text-cyan-700 dark:text-cyan-400 block">{hi ? s.titleHi : s.titleEn}</span>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-snug">{hi ? s.descHi : s.descEn}</p>
              </div>
            ))}
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 italic">
            {hi
              ? 'टीनाइटस की आवाज़ें शांत वातावरण में (विशेष रूप से रात में सोते समय) अधिक स्पष्ट और तेज़ महसूस हो सकती हैं।'
              : 'Note: Tinnitus sounds often become more prominent at night or in quiet rooms when ambient background noise drops.'}
          </p>
        </div>
      )}

      {/* Tab 4: Evaluation */}
      {activeTab === 'evaluation' && (
        <div className="bg-white dark:bg-ink-900 border border-slate-200 dark:border-ink-800 rounded-3xl p-6 shadow-sm space-y-5">
          <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
            <Stethoscope className="w-5 h-5 text-cyan-600" />
            {hi ? 'डॉक्टरी जांच व परीक्षण (Clinical Evaluation)' : 'When to See a Doctor & Diagnostic Tests'}
          </h3>

          <div className="space-y-4">
            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
              {hi
                ? 'यदि आपको कानों में सीटी या आवाज़ें सुनाई देती हैं जो अन्य लोग नहीं सुन सकते, तो ईएनटी विशेषज्ञ से जांच कराना महत्वपूर्ण है। डॉक्टर यह सुनिश्चित करेंगे कि कान में कोई इलाज योग्य समस्या नहीं है।'
                : 'You should consult an ENT doctor or audiologist if you experience persistent tinnitus. A professional assessment rules out treatable causes and ensures your hearing pathways are healthy.'}
            </p>

            {/* Red Flags Card */}
            <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 p-4 rounded-2xl space-y-2">
              <strong className="text-xs font-bold text-red-800 dark:text-red-300 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-red-600" />
                {hi ? 'तुरंत ईएनटी जांच कराने के संकेत (Red Flags):' : 'Immediate Red Flags Requiring ENT Consultation:'}
              </strong>
              <ul className="text-xs text-red-900 dark:text-red-200 space-y-1 list-disc pl-5">
                <li>{hi ? 'टीनाइटस केवल एक ही कान में हो (Unilateral Tinnitus)' : 'Tinnitus that affects only one ear'}</li>
                <li>{hi ? 'दिल की धड़कन की ताल के साथ आवाज़ आए (Pulsatile Tinnitus)' : 'Rhythmic, pulsing tinnitus in sync with your heartbeat'}</li>
                <li>{hi ? 'अचानक एक तरफ से सुनना बंद हो जाना (Sudden Hearing Loss)' : 'Accompanied by sudden hearing drop in one ear'}</li>
                <li>{hi ? 'चक्कर आना या संतुलन बिगड़ने की समस्या होना (Vertigo/Dizziness)' : 'Accompanied by severe dizziness or balance disturbance'}</li>
              </ul>
            </div>

            {/* Diagnostic Tests Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
              <div className="bg-slate-50 dark:bg-ink-950 p-3.5 rounded-xl border border-slate-200 dark:border-ink-800 space-y-1">
                <strong className="text-xs font-bold text-slate-800 dark:text-slate-200 block">1. Otoscopy & Wax Exam</strong>
                <p className="text-[11px] text-slate-600 dark:text-slate-400">Inspecting eardrum and canal for wax plugs or middle ear fluid.</p>
              </div>
              <div className="bg-slate-50 dark:bg-ink-950 p-3.5 rounded-xl border border-slate-200 dark:border-ink-800 space-y-1">
                <strong className="text-xs font-bold text-slate-800 dark:text-slate-200 block">2. Pure Tone Audiometry</strong>
                <p className="text-[11px] text-slate-600 dark:text-slate-400">Hearing test across frequencies to map underlying presbycusis or notch.</p>
              </div>
              <div className="bg-slate-50 dark:bg-ink-950 p-3.5 rounded-xl border border-slate-200 dark:border-ink-800 space-y-1">
                <strong className="text-xs font-bold text-slate-800 dark:text-slate-200 block">3. MRI / Vascular Angiogram</strong>
                <p className="text-[11px] text-slate-600 dark:text-slate-400">Imaging performed for unilateral or pulsatile tinnitus cases.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 5: Treatment */}
      {activeTab === 'treatment' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-ink-900 border border-slate-200 dark:border-ink-800 rounded-3xl p-6 shadow-sm space-y-5">
            <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white">
              {hi ? 'टीनाइटस के उपचार, थेरेपी व लाइफस्टाइल प्रबंधन' : 'Effective Tinnitus Treatments & Sound Management'}
            </h3>

            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
              {hi
                ? 'यदि टीनाइटस का कोई विशिष्ट कारण हो (जैसे कान का मोम, यूस्टेशियन नली विकार या ओटोटॉक्सिक दवा बदलना), तो उसका इलाज करने से आवाज़ कम हो जाती है। बिना किसी स्पष्ट कारण वाले टीनाइटस के लिए ऐसी थेरेपी उपलब्ध हैं जो इसके प्रभाव को लगभग समाप्त कर देती हैं:'
                : 'If a clear underlying cause is identified (e.g., earwax buildup, Eustachian tube dysfunction, or ototoxic drug adjustment), addressing it often resolves tinnitus. For sensory tinnitus, proven management techniques train the brain to ignore the background noise:'}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Hearing Aids */}
              <div className="bg-cyan-50/70 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-800 p-4 rounded-2xl space-y-2">
                <strong className="font-bold text-xs text-cyan-900 dark:text-cyan-300 uppercase tracking-wider block flex items-center gap-1.5">
                  <Ear className="w-4 h-4 text-cyan-600" />
                  {hi ? '1. हियरिंग एड (Hearing Aids)' : '1. Hearing Aids (Amplification)'}
                </strong>
                <p className="text-xs text-cyan-950 dark:text-cyan-200 leading-relaxed">
                  {hi
                    ? 'सुनने की कमी वाले रोगियों में हियरिंग एड लगाने से बाहरी आवाज़ें साफ व तेज़ हो जाती हैं, जिससे कान की अंदरूनी सीटी दब जाती है और ध्यान हट जाता है।'
                    : 'For people with accompanying hearing loss, hearing aids amplify external ambient sound, making internal tinnitus far less noticeable.'}
                </p>
              </div>

              {/* Masking & White Noise */}
              <div className="bg-cyan-50/70 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-800 p-4 rounded-2xl space-y-2">
                <strong className="font-bold text-xs text-cyan-900 dark:text-cyan-300 uppercase tracking-wider block flex items-center gap-1.5">
                  <Volume2 className="w-4 h-4 text-cyan-600" />
                  {hi ? '2. साउंड मास्किंग व वाइट नॉइज़ (Sound Masking)' : '2. Sound Maskers & White Noise'}
                </strong>
                <p className="text-xs text-cyan-950 dark:text-cyan-200 leading-relaxed">
                  {hi
                    ? 'धीमी धुनों, बारिश की आवाज़, या वाइट नॉइज़ जनरेटर का उपयोग करके सन्नाटे को भरें। विशेष साउंड मास्किंग डिवाइस सन्नाटे में टीनाइटस को छुपाते हैं।'
                    : 'Listening to soft background music, rainfall sounds, or white noise generators covers up internal ringing, especially when trying to sleep.'}
                </p>
              </div>

              {/* TRT */}
              <div className="bg-cyan-50/70 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-800 p-4 rounded-2xl space-y-2">
                <strong className="font-bold text-xs text-cyan-900 dark:text-cyan-300 uppercase tracking-wider block flex items-center gap-1.5">
                  <Brain className="w-4 h-4 text-cyan-600" />
                  {hi ? '3. टीनाइटस रीट्रेनिंग थेरेपी (TRT)' : '3. Tinnitus Retraining Therapy (TRT)'}
                </strong>
                <p className="text-xs text-cyan-950 dark:text-cyan-200 leading-relaxed">
                  {hi
                    ? 'ऑडियोलॉजिस्ट के मार्गदर्शन में मस्तिष्क को इस प्रकार प्रशिक्षित किया जाता है कि वह कान की आवाज़ को एक सामान्य पृष्ठभूमि शोर (जैसे फ्रिज की आवाज़) मानकर अनदेखा करना सीख ले।'
                    : 'Combines sound therapy with expert counseling to "retrain" the auditory cortex to habituate and categorize tinnitus as neutral background noise.'}
                </p>
              </div>

              {/* CBT & Biofeedback */}
              <div className="bg-cyan-50/70 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-800 p-4 rounded-2xl space-y-2">
                <strong className="font-bold text-xs text-cyan-900 dark:text-cyan-300 uppercase tracking-wider block flex items-center gap-1.5">
                  <HeartHandshake className="w-4 h-4 text-cyan-600" />
                  {hi ? '4. सीबीटी, बायोफीडबैक व नींद सुरक्षा' : '4. CBT, Biofeedback & Sleep Hygiene'}
                </strong>
                <p className="text-xs text-cyan-950 dark:text-cyan-200 leading-relaxed">
                  {hi
                    ? 'गहरी सांस, ध्यान, और कॉग्निटिव बिहेवियरल थेरेपी से तनाव कम होता है। अच्छी नींद की आदतें टीनाइटस से होने वाली घबराहट और अनिद्रा को दूर करती हैं।'
                    : 'Cognitive Behavioral Therapy (CBT) and deep relaxation lower stress responses. Proper sleep hygiene ensures rest, preventing fatigue from aggravating tinnitus.'}
                </p>
              </div>
            </div>

            {/* Reassurance Card */}
            <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 p-5 rounded-2xl space-y-2">
              <strong className="text-sm font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-2">
                <Moon className="w-5 h-5 text-emerald-600" />
                {hi ? 'सकारात्मक दृष्टिकोण और जीवन गुणवत्ता:' : 'Living Well & Staying Positive:'}
              </strong>
              <p className="text-xs text-emerald-950 dark:text-emerald-200 leading-relaxed">
                {hi
                  ? 'यदि टीनाइटस लंबे समय से है, तो हो सकता है यह पूरी तरह न मिटे, लेकिन समय के साथ मस्तिष्क इसकी अनदेखी करने लगता है और यह आपको बिल्कुल परेशान नहीं करता। चिंता या नींद की समस्या होने पर अपने ईएनटी डॉक्टर से बात करें।'
                  : 'Over time, brain habituation makes tinnitus far less noticeable in daily life. Maintain a positive outlook, stay active, and speak to your care team if sleep or anxiety feels challenging.'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
