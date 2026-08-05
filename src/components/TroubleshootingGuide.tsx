'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { Search, ChevronDown, ShieldAlert, PhoneCall, LifeBuoy, AlertTriangle, CheckCircle2, Phone, ClipboardCheck } from 'lucide-react';
import { useAppData } from '@/lib/app-data-context';

type Urgency = 'routine' | 'clinic' | 'emergency';

interface Entry {
  id: string;
  category: string;
  categoryHi: string;
  question: string;
  questionHi: string;
  answer: string;
  answerHi: string;
  urgency: Urgency;
}

const ENTRIES: Entry[] = [
  {
    id: 'ear-water',
    category: 'Ear & Hearing',
    categoryHi: 'कान और सुनना',
    question: 'Water accidentally got in my operated ear while bathing — what now?',
    questionHi: 'नहाते समय ऑपरेशन वाले कान में पानी चला गया — अब क्या करें?',
    answer:
      'Gently dry the outer ear with a clean towel. Do not insert cotton buds inside the canal. Watch for increased pain, discharge, or fever over the next 24 hours and call the clinic if any appear.',
    answerHi:
      'बाहरी कान को साफ तौलिये से धीरे से सुखाएं। कान की नली के अंदर रुई की तीली न डालें। अगले 24 घंटों में दर्द, स्राव या बुखार पर नज़र रखें और कोई भी लक्षण दिखने पर क्लिनिक को कॉल करें।',
    urgency: 'clinic',
  },
  {
    id: 'ear-hearing-drop',
    category: 'Ear & Hearing',
    categoryHi: 'कान और सुनना',
    question: 'My hearing suddenly feels muffled a week after surgery.',
    questionHi: 'सर्जरी के एक हफ्ते बाद अचानक सुनना धीमा लग रहा है।',
    answer:
      'Mild muffling from healing tissue and packing is common up to 4–6 weeks. Sudden, severe hearing loss on one side, however, needs same-day evaluation — use the self-assessment hearing check to decide.',
    answerHi:
      'ठीक होने वाले ऊतक और पैकिंग के कारण हल्का धीमापन 4–6 सप्ताह तक सामान्य है। लेकिन एक तरफ अचानक, गंभीर सुनने की हानि के लिए उसी दिन जांच जरूरी है — निर्णय के लिए स्व-मूल्यांकन श्रवण जांच का उपयोग करें।',
    urgency: 'routine',
  },
  {
    id: 'ear-vertigo',
    category: 'Ear & Hearing',
    categoryHi: 'कान और सुनना',
    question: 'The room feels like it is spinning when I stand up.',
    questionHi: 'खड़े होने पर कमरा घूमता हुआ महसूस होता है।',
    answer:
      'Brief light-headedness on standing can happen post-op. Sudden severe vertigo with vomiting or inability to walk is a red flag — call ENT Casualty immediately.',
    answerHi:
      'सर्जरी के बाद खड़े होने पर हल्का चक्कर आना सामान्य हो सकता है। उल्टी के साथ अचानक गंभीर चक्कर आना या चल न पाना एक चेतावनी संकेत है — तुरंत ईएनटी कैज़ुअल्टी को कॉल करें।',
    urgency: 'emergency',
  },
  {
    id: 'etd-barotrauma',
    category: 'Ear & Hearing',
    categoryHi: 'कान और सुनना',
    question: 'Why do my ears hurt or feel popped when flying in an airplane or diving?',
    questionHi: 'हवाई जहाज में यात्रा या गोताखोरी के समय कानों में दर्द और दबाव क्यों महसूस होता है?',
    answer:
      'This is called ear barotrauma caused by Eustachian tube blockage during rapid air pressure changes. Chew gum, swallow frequently, or perform gentle Valsalva maneuvers (blow softly against closed nostrils) to equalize pressure. Avoid flying with an active cold or sinus infection.',
    answerHi:
      'हवा के दबाव में तेजी से बदलाव के दौरान यूस्टेशियन नली बंद होने से इसे इयर बारोट्रॉमा कहते हैं। दबाव बराबर करने के लिए च्युइंग गम चबाएं, लार निगलें या वलसाल्वा पैंतरा अपनाएं (नाक बंद करके हल्के से फूंक मारें)। सर्दी या साइनस होने पर हवाई यात्रा से बचें।',
    urgency: 'routine',
  },
  {
    id: 'etd-autophony',
    category: 'Ear & Hearing',
    categoryHi: 'कान और सुनना',
    question: 'I can hear the loud echo of my own voice and breathing inside my ear.',
    questionHi: 'मुझे अपने कान के अंदर अपनी ही आवाज़ और सांस लेने की तेज़ गूंज सुनाई दे रही है।',
    answer:
      'This symptom is called autophony, which occurs when the Eustachian tube remains continuously open (Patulous Eustachian Tube). Avoid dehydration, stay well hydrated, and consult an ENT specialist if symptoms persist.',
    answerHi:
      'इस लक्षण को ऑटोफोनी कहते हैं, जो यूस्टेशियन नली के लगातार खुले रहने (Patulous Eustachian Tube) के कारण होता है। शरीर में पानी की कमी न होने दें, प्रचुर मात्रा में जलपान करें और लक्षण बने रहने पर ईएनटी डॉक्टर को दिखाएं।',
    urgency: 'clinic',
  },
  {
    id: 'tinnitus-ringing',
    category: 'Ear & Hearing',
    categoryHi: 'कान और सुनना',
    question: 'I hear constant ringing, buzzing, or humming in my ears — is there a treatment?',
    questionHi: 'मुझे अपने कानों में लगातार सीटी, घंटी या भिनभिनाहट सुनाई दे रही है — क्या इसका इलाज संभव है?',
    answer:
      'Tinnitus is caused by inner ear hair cell signals or hearing loss. While sensory tinnitus has no instant cure, effective management options include hearing aids, white noise sound maskers, Tinnitus Retraining Therapy (TRT), and cognitive relaxation techniques.',
    answerHi:
      'टीनाइटस आंतरिक कान की संवेदी कोशिकाओं में परिवर्तन या सुनने की कमी से होता है। यद्यपि इसका कोई एक जादूई इलाज नहीं है, लेकिन हियरिंग एड, वाइट नॉइज़ साउंड मास्किंग, टीनाइटस रीट्रेनिंग थेरेपी (TRT) और ध्यान से इसे पूरी तरह नियंत्रित किया जा सकता है।',
    urgency: 'routine',
  },
  {
    id: 'tinnitus-pulsatile',
    category: 'Ear & Hearing',
    categoryHi: 'कान और सुनना',
    question: 'I hear a rhythmic pulsing or heartbeat sound in one ear (Pulsatile Tinnitus).',
    questionHi: 'मुझे एक कान में दिल की धड़कन की ताल से मेल खाती आवाज़ आ रही है (पल्सटाइल टीनाइटस)।',
    answer:
      'Pulsatile tinnitus occurs when sound from turbulent blood flow near the ear is amplified. Unilateral or pulsatile tinnitus requires an ENT evaluation and imaging (like CT/MRI angiography) to inspect blood vessels.',
    answerHi:
      'पल्सटाइल टीनाइटस कान के पास की रक्त वाहिकाओं में ब्लोक्स या उथल-पुथल से होता है। एक तरफा या धड़कन जैसी आवाज़ आने पर ईएनटी डॉक्टर से जांच व सीटी/एमआरआई परीक्षण कराना जरूरी है।',
    urgency: 'clinic',
  },
  {
    id: 'hl-sudden',
    category: 'Ear & Hearing',
    categoryHi: 'कान और सुनना',
    question: 'I experienced sudden hearing drop or loss in one ear over the past 24-72 hours.',
    questionHi: 'पिछले 24-72 घंटों के दौरान अचानक एक कान से सुनना बंद या कम हो गया है।',
    answer:
      'Sudden Sensorineural Hearing Loss (SSNHL) is a medical emergency. Immediate evaluation and corticosteroid therapy within 24-72 hours yields the highest rate of full hearing recovery. Visit ENT Casualty immediately.',
    answerHi:
      'अचानक संवेदी श्रवण हानि (SSNHL) एक आपातकालीन स्थिति है। पहले 24-72 घंटों के भीतर तुरंत स्टेरॉयड उपचार शुरू करने से सुनना पूरी तरह वापस आने की संभावना सबसे अधिक होती है। तुरंत ईएनटी कैज़ुअल्टी विभाग जाएं।',
    urgency: 'emergency',
  },
  {
    id: 'hl-noise-prevention',
    category: 'Ear & Hearing',
    categoryHi: 'कान और सुनना',
    question: 'How do I protect my hearing from loud music, headphones, or machinery?',
    questionHi: 'तेज़ आवाज़, हेडफोन या कारखानों के शोर से अपने कानों की सुरक्षा कैसे करें?',
    answer:
      'Avoid environments exceeding 85 dB (where you must shout to be heard). Always wear certified earplugs or earmuffs near machinery or loud concerts, keep headphone volume under 60%, and never clean ears with cotton swabs.',
    answerHi:
      '85 डेसिबल से अधिक शोर वाले वातावरण से बचें (जहां बोलने के लिए चिल्लाना पड़े)। कारखानों या कंसर्ट में ईयरप्लग पहनें, हेडफोन का वॉल्यूम 60% से कम रखें और कान में रुई की तीली (Q-Tips) कभी न डालें।',
    urgency: 'routine',
  },
  {
    id: 'wax-impaction',
    category: 'Ear & Hearing',
    categoryHi: 'कान और सुनना',
    question: 'My ear feels completely plugged up and hearing is muffled — could it be earwax buildup?',
    questionHi: 'मेरा कान पूरी तरह बंद महसूस हो रहा है और सुनना धीमा लग रहा है — क्या यह कान के मोम का जमाव हो सकता है?',
    answer:
      'Yes, cerumen impaction is a common cause of ear fullness and muffled hearing. An ENT practitioner can examine your ear with an otoscope and safely clear the wax using cerumenolytic drops, warm water irrigation, or micro-suction.',
    answerHi:
      'हां, कान के मोम (सिरुमेन) का जमाव कान बंद होने और धीमा सुनाई देने का बहुत आम कारण है। ईएनटी डॉक्टर ऑटोस्कोप से जांच करके ड्रॉप्स, गुनगुने पानी की रिंसिंग या माइक्रो-सक्शन से मोम को सुरक्षित रूप से निकाल देते हैं।',
    urgency: 'routine',
  },
  {
    id: 'wax-cotton-swab',
    category: 'Ear & Hearing',
    categoryHi: 'कान और सुनना',
    question: 'Can I clean my ears at home using cotton swabs (Q-tips) or ear candling?',
    questionHi: 'क्या मैं घर पर रुई की तीली (Q-Tips) या इयर कैंडलिंग से कान साफ कर सकता हूं?',
    answer:
      'NEVER insert cotton swabs, pins, or ear candles into your ear canal! Cotton swabs push wax deeper against the eardrum, while ear candling carries severe risks of burns and eardrum perforation. Normal ears clean themselves automatically.',
    answerHi:
      'कान के अंदर कभी भी रुई की तीली (Q-Tips), पिन या इयर मोमबत्ती न डालें! रूई की तीली मोम को पर्दे के पास गहरा जमा देती है तथा इयर कैंडलिंग से चेहरे के जलने व पर्दे में छेद होने का गंभीर खतरा रहता है। कान अपने आप साफ होते हैं।',
    urgency: 'routine',
  },
  {
    id: 'ci-switch-on',
    category: 'Ear & Hearing',
    categoryHi: 'कान और सुनना',
    question: 'When will my cochlear implant be turned on (activated) after surgery?',
    questionHi: 'ऑपरेशन के बाद मेरा कॉकलियर इम्प्लांट कब चालू (स्विच-ऑन) किया जाएगा?',
    answer:
      'Device activation ("Switch-On") occurs 2 to 4 weeks after surgery once the surgical incision is fully healed. Your audiologist will fit the external processor, program hearing thresholds, and begin Auditory Verbal Therapy (AVT).',
    answerHi:
      'सर्जरी का घाव पूरी तरह भरने के 2 से 4 सप्ताह बाद उपकरण का "स्विच-ऑन" किया जाता है। आपके ऑडियोलॉजिस्ट एक्सटर्नल प्रोसेसर को फिट करेंगे, ध्वनियों को प्रोग्राम करेंगे और स्पीच थेरेपी शुरू करेंगे।',
    urgency: 'routine',
  },
  {
    id: 'ci-mri-warning',
    category: 'Ear & Hearing',
    categoryHi: 'कान और सुनना',
    question: 'Can I safely get an MRI scan after receiving a cochlear implant?',
    questionHi: 'क्या कॉकलियर इम्प्लांट लगने के बाद सुरक्षित रूप से MRI स्कैन कराया जा सकता है?',
    answer:
      'ALWAYS inform radiology staff and doctors about your implant magnet before any MRI scan! MRI magnetic fields can dislodge internal receivers. Special MRI-safe protocols or head bandaging are required.',
    answerHi:
      'किसी भी MRI स्कैन से पहले रेडियोलॉजिस्ट व डॉक्टर को इम्प्लांट चुंबक की जानकारी देना अत्यंत आवश्यक है! MRI के चुंबकीय क्षेत्र से अंदर का रिसीवर खिसक सकता है। इसके लिए विशेष सुरक्षा जांच जरूरी है।',
    urgency: 'clinic',
  },
  {
    id: 'nose-blocked',
    category: 'Nose & Sinus',
    categoryHi: 'नाक और साइनस',
    question: 'My nose feels completely blocked after FESS surgery.',
    questionHi: 'एफईएसएस सर्जरी के बाद मेरी नाक पूरी तरह बंद महसूस होती है।',
    answer:
      'Blockage from crusting and swelling is expected for the first 1–2 weeks. Continue saline douching as shown in your recovery guide. Breathe through the mouth if needed — do not blow the nose hard.',
    answerHi:
      'पहले 1–2 सप्ताह तक क्रस्टिंग और सूजन के कारण बंद होना सामान्य है। अपनी रिकवरी गाइड में बताए अनुसार सलाइन डूशिंग जारी रखें। जरूरत पड़ने पर मुंह से सांस लें — नाक को जोर से न सिनकें।',
    urgency: 'routine',
  },
  {
    id: 'nose-bleed',
    category: 'Nose & Sinus',
    categoryHi: 'नाक और साइनस',
    question: 'I have light spotting of blood when I douche my nose.',
    questionHi: 'नाक धोते समय हल्का खून का दाग दिखता है।',
    answer:
      'Light spotting mixed with saline is common while crusts loosen. Sit upright and pinch the soft part of the nose for 10 minutes if bleeding continues, or if it soaks more than a tissue, call the clinic.',
    answerHi:
      'क्रस्ट ढीले होते समय सलाइन में हल्का खून आना सामान्य है। यदि रक्तस्राव जारी रहे तो सीधे बैठें और नाक के नरम हिस्से को 10 मिनट तक दबाएं, या यदि यह एक टिशू से ज्यादा भिगो दे तो क्लिनिक को कॉल करें।',
    urgency: 'clinic',
  },
  {
    id: 'throat-voice',
    category: 'Throat & Voice',
    categoryHi: 'गला और आवाज़',
    question: 'My voice sounds hoarse and weak since the operation.',
    questionHi: 'ऑपरेशन के बाद से मेरी आवाज़ भारी और कमज़ोर लग रही है।',
    answer:
      'Some hoarseness is expected while the throat heals — rest your voice, sip warm water, and avoid whispering (it strains the voice box more than normal speech). Report any breathing difficulty right away.',
    answerHi:
      'गला ठीक होने के दौरान कुछ भारीपन सामान्य है — आवाज़ को आराम दें, गुनगुना पानी पिएं, और फुसफुसाने से बचें (यह सामान्य बोलने से ज्यादा आवाज़ पर दबाव डालता है)। सांस लेने में किसी भी कठिनाई की तुरंत सूचना दें।',
    urgency: 'routine',
  },
  {
    id: 'throat-swallow',
    category: 'Throat & Voice',
    categoryHi: 'गला और आवाज़',
    question: 'Swallowing is painful after my tonsillectomy.',
    questionHi: 'टॉन्सिलेक्टॉमी के बाद निगलने में दर्द होता है।',
    answer:
      'Pain on swallowing peaks around day 4–7. Keep eating soft, cool foods even though it hurts — this actually speeds healing. Sudden bright-red bleeding from the mouth is an emergency.',
    answerHi:
      'निगलने में दर्द दिन 4–7 के आसपास सबसे ज्यादा होता है। दर्द के बावजूद नरम, ठंडा भोजन खाते रहें — यह वास्तव में उपचार को तेज़ करता है। मुंह से अचानक चमकीला लाल रक्तस्राव एक आपातकाल है।',
    urgency: 'clinic',
  },
  {
    id: 'wound-discharge',
    category: 'Bleeding & Wound',
    categoryHi: 'रक्तस्राव और घाव',
    question: 'There is some yellowish discharge from my incision site.',
    questionHi: 'मेरे घाव से कुछ पीला स्राव आ रहा है।',
    answer:
      'Small amounts of clear or pale yellow discharge in the first few days can be normal healing fluid. Foul smell, green discharge, spreading redness, or fever means you should call the clinic today.',
    answerHi:
      'पहले कुछ दिनों में साफ या हल्के पीले स्राव की थोड़ी मात्रा सामान्य उपचार तरल हो सकती है। दुर्गंध, हरा स्राव, फैलती लालिमा, या बुखार का मतलब है कि आपको आज ही क्लिनिक को कॉल करना चाहिए।',
    urgency: 'clinic',
  },
  {
    id: 'wound-bleeding',
    category: 'Bleeding & Wound',
    categoryHi: 'रक्तस्राव और घाव',
    question: 'Active bleeding is soaking through my dressing.',
    questionHi: 'सक्रिय रक्तस्राव मेरी ड्रेसिंग को भिगो रहा है।',
    answer:
      'Apply firm, steady pressure with a clean cloth and go to the ENT Casualty department immediately — do not wait to see if it stops on its own.',
    answerHi:
      'साफ कपड़े से मजबूत, स्थिर दबाव डालें और तुरंत ईएनटी कैज़ुअल्टी विभाग जाएं — यह देखने के लिए प्रतीक्षा न करें कि यह अपने आप बंद होता है या नहीं।',
    urgency: 'emergency',
  },
  {
    id: 'general-fever',
    category: 'General Recovery',
    categoryHi: 'सामान्य रिकवरी',
    question: 'I have a low fever the evening after surgery.',
    questionHi: 'सर्जरी के बाद शाम को हल्का बुखार है।',
    answer:
      'A mild temperature under 100.4°F (38°C) in the first 24 hours is common. Take paracetamol as prescribed and recheck in a few hours. A fever above 101°F (38.3°C), or one that persists past day 2, needs a clinic call.',
    answerHi:
      'पहले 24 घंटों में 100.4°F (38°C) से कम हल्का तापमान सामान्य है। निर्धारित अनुसार पैरासिटामोल लें और कुछ घंटों बाद फिर से जांचें। 101°F (38.3°C) से अधिक बुखार, या दिन 2 के बाद भी बना रहना, क्लिनिक कॉल की आवश्यकता है।',
    urgency: 'routine',
  },
  {
    id: 'general-breathing',
    category: 'General Recovery',
    categoryHi: 'सामान्य रिकवरी',
    question: 'I feel breathless or my chest feels tight.',
    questionHi: 'मुझे सांस लेने में तकलीफ या सीने में जकड़न महसूस होती है।',
    answer:
      'Breathing distress after ENT surgery is always an emergency, especially for neck-breather and laryngectomy patients. Use your emergency wallet card and call ENT Casualty now.',
    answerHi:
      'ईएनटी सर्जरी के बाद सांस लेने में तकलीफ हमेशा एक आपातकाल है, खासकर गर्दन-श्वासी और लैरिंजेक्टॉमी रोगियों के लिए। अपना आपातकालीन कार्ड इस्तेमाल करें और अभी ईएनटी कैज़ुअल्टी को कॉल करें।',
    urgency: 'emergency',
  },
];

const URGENCY_STYLES: Record<Urgency, { label: string; labelHi: string; icon: typeof CheckCircle2; className: string }> = {
  routine: {
    label: 'Self-Care / Normal',
    labelHi: 'सामान्य स्व-देखभाल',
    icon: CheckCircle2,
    className: 'bg-teal-50 text-teal-700 dark:bg-ink-800 dark:text-teal-300 border-teal-200 dark:border-ink-700',
  },
  clinic: {
    label: 'Contact Clinic Today',
    labelHi: 'आज क्लिनिक कॉल करें',
    icon: AlertTriangle,
    className: 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-900',
  },
  emergency: {
    label: 'Emergency Care Now',
    labelHi: 'अभी आपातकालीन देखभाल',
    icon: ShieldAlert,
    className: 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 border-red-200 dark:border-red-900',
  },
};

export const TroubleshootingGuide: React.FC = () => {
  const { locale } = useAppData();
  const hi = locale === 'hi';
  const categories = useMemo(() => Array.from(new Set(ENTRIES.map((e) => e.category))), []);
  const [activeCategory, setActiveCategory] = useState<string | 'all'>('all');
  const [urgencyFilter, setUrgencyFilter] = useState<Urgency | 'all'>('all');
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState<string | null>(ENTRIES[0].id);

  const filtered = ENTRIES.filter((e) => {
    const matchesCategory = activeCategory === 'all' || e.category === activeCategory;
    const matchesUrgency = urgencyFilter === 'all' || e.urgency === urgencyFilter;
    const q = query.trim().toLowerCase();
    const matchesQuery = !q || `${e.question} ${e.answer} ${e.category}`.toLowerCase().includes(q);
    return matchesCategory && matchesUrgency && matchesQuery;
  });

  return (
    <div className="space-y-6 pb-10">
      {/* Header Card */}
      <div className="bg-white dark:bg-ink-900 border border-slate-200 dark:border-ink-800 rounded-3xl p-6 shadow-sm space-y-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-teal-50 dark:bg-ink-800 text-teal-600 dark:text-teal-400 flex items-center justify-center">
            <LifeBuoy className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-display font-bold text-xl text-slate-900 dark:text-white">
              {hi ? 'समस्या निवारण गाइड' : 'ENT Clinical Troubleshooting Guide'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {hi
                ? 'सामान्य रिकवरी चिंताओं के जवाब — हर उत्तर स्पष्ट करता है कि यह सामान्य है, क्लिनिक को कॉल करने का समय है, या आपातकाल है।'
                : 'Clear, audited medical guidance for post-op concerns — sorted by urgency level.'}
            </p>
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="space-y-3">
        <div className="flex items-center gap-3 bg-white dark:bg-ink-900 border border-slate-200 dark:border-ink-800 rounded-2xl px-4 py-3 shadow-sm">
          <Search className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={hi ? 'लक्षण या शब्द खोजें (उदा. कान का पानी, बुखार, खून)…' : 'Search a symptom or question (e.g. water in ear, bleeding, fever)…'}
            className="flex-1 bg-transparent outline-none text-sm font-medium text-slate-800 dark:text-slate-100 placeholder:text-slate-400"
          />
        </div>

        {/* Urgency Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1">{hi ? 'गंभीरता:' : 'Urgency:'}</span>
          {[
            { id: 'all', label: hi ? 'सभी' : 'All Levels' },
            { id: 'routine', label: hi ? 'सामान्य स्व-देखभाल' : 'Self-Care / Normal' },
            { id: 'clinic', label: hi ? 'आज क्लिनिक कॉल करें' : 'Contact Clinic' },
            { id: 'emergency', label: hi ? 'आपातकाल' : 'Emergency' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setUrgencyFilter(tab.id as any)}
              className={`text-xs font-semibold px-3.5 py-1.5 rounded-full border transition-all ${
                urgencyFilter === tab.id
                  ? 'bg-teal-700 text-white border-teal-700 shadow-sm'
                  : 'bg-white dark:bg-ink-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-ink-700 hover:border-teal-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap gap-2 pt-1">
          <button
            onClick={() => setActiveCategory('all')}
            className={`text-xs font-semibold px-3 py-1 rounded-xl border transition-colors ${
              activeCategory === 'all'
                ? 'bg-ink-800 text-white border-ink-800'
                : 'bg-slate-100 dark:bg-ink-800/60 text-slate-600 dark:text-slate-400 border-transparent hover:bg-slate-200'
            }`}
          >
            {hi ? 'सभी श्रेणियां' : 'All Categories'}
          </button>
          {categories.map((c) => {
            const entry = ENTRIES.find((e) => e.category === c)!;
            return (
              <button
                key={c}
                onClick={() => setActiveCategory(c)}
                className={`text-xs font-semibold px-3 py-1 rounded-xl border transition-colors ${
                  activeCategory === c
                    ? 'bg-ink-800 text-white border-ink-800'
                    : 'bg-slate-100 dark:bg-ink-800/60 text-slate-600 dark:text-slate-400 border-transparent hover:bg-slate-200'
                }`}
              >
                {hi ? entry.categoryHi : c}
              </button>
            );
          })}
        </div>
      </div>

      {/* Entries List */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="bg-white dark:bg-ink-900 border border-slate-200 dark:border-ink-800 rounded-2xl p-12 text-center text-slate-400">
            <Search className="w-8 h-8 mx-auto mb-2 opacity-40 text-teal-500" />
            <p className="text-sm font-semibold">{hi ? 'कोई मेल खाता प्रश्न नहीं मिला।' : 'No matching questions found.'}</p>
          </div>
        )}

        {filtered.map((entry) => {
          const open = openId === entry.id;
          const style = URGENCY_STYLES[entry.urgency];
          const UrgencyIcon = style.icon;

          return (
            <div
              key={entry.id}
              id={entry.id}
              className={`bg-white dark:bg-ink-900 border rounded-2xl overflow-hidden transition-all shadow-sm ${
                open
                  ? 'border-teal-400 dark:border-teal-600 shadow-md ring-1 ring-teal-400/30'
                  : 'border-slate-200 dark:border-ink-800 hover:border-slate-300 dark:hover:border-ink-700'
              }`}
            >
              <button
                onClick={() => setOpenId(open ? null : entry.id)}
                className="w-full flex items-center gap-3.5 text-left px-5 py-4"
                aria-expanded={open}
              >
                <span
                  className={`shrink-0 text-xs font-bold px-2.5 py-1 rounded-full border flex items-center gap-1.5 ${style.className}`}
                >
                  <UrgencyIcon className="w-3.5 h-3.5" />
                  {hi ? style.labelHi : style.label}
                </span>

                <span className="flex-1 font-semibold text-sm sm:text-base text-slate-900 dark:text-white">
                  {hi ? entry.questionHi : entry.question}
                </span>

                <ChevronDown
                  className={`w-5 h-5 text-slate-400 shrink-0 transition-transform duration-200 ${
                    open ? 'rotate-180 text-teal-600 dark:text-teal-400' : ''
                  }`}
                />
              </button>

              {open && (
                <div className="px-5 pb-5 pt-1 space-y-4 border-t border-slate-100 dark:border-ink-800">
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-ink-950 border-l-4 border-teal-500 dark:border-teal-400 text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
                    {hi ? entry.answerHi : entry.answer}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 text-xs pt-1">
                    <span className="text-slate-400 font-mono">Category: {hi ? entry.categoryHi : entry.category}</span>

                    <div className="flex items-center gap-2">
                      <Link
                        href="/self-assessment"
                        className="inline-flex items-center gap-1 text-teal-700 dark:text-teal-300 font-semibold hover:underline"
                      >
                        <ClipboardCheck className="w-3.5 h-3.5" />
                        {hi ? 'स्व-मूल्यांकन फॉर्म खोलें' : 'Take Self-Assessment Check'}
                      </Link>
                      {entry.urgency !== 'routine' && (
                        <a
                          href="tel:+911126588500"
                          className="inline-flex items-center gap-1 bg-red-600 hover:bg-red-700 text-white font-bold px-3 py-1.5 rounded-lg shadow-sm"
                        >
                          <Phone className="w-3.5 h-3.5" />
                          {hi ? 'क्लिनिक कॉल करें' : 'Call ENT Casualty'}
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Emergency Hotline Banner */}
      <div className="bg-gradient-to-r from-red-600 to-red-700 text-white rounded-2xl p-5 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <ShieldAlert className="w-6 h-6 shrink-0 text-red-200 animate-bounce" />
          <div>
            <p className="font-bold text-sm">
              {hi ? 'किसी भी अनिश्चितता की स्थिति में मदद लें' : 'Not sure about your symptom? Ask ENT Casualty directly.'}
            </p>
            <p className="text-xs text-red-100 mt-0.5">
              {hi
                ? 'हमारी 24x7 क्लिनिकल हेल्पलाइन आपकी सहायता के लिए हमेशा उपलब्ध है।'
                : 'Our 24x7 clinical hotline is always available for immediate triage guidance.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="tel:+911126588500"
            className="inline-flex items-center gap-1.5 bg-white text-red-700 hover:bg-red-50 font-bold text-xs px-4 py-2.5 rounded-xl shadow-md"
          >
            <PhoneCall className="w-4 h-4" />
            +91 11 2658 8500
          </a>
          <Link
            href="/emergency"
            className="inline-flex items-center gap-1 bg-red-900/60 hover:bg-red-950 text-white text-xs font-semibold px-3 py-2.5 rounded-xl border border-red-500/40"
          >
            {hi ? 'वॉलेट कार्ड' : 'Emergency Card'}
          </Link>
        </div>
      </div>
    </div>
  );
};
