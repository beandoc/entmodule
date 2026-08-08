export interface DhingraFaq {
  question: string;
  questionHindi: string;
  answer: string;
  answerHindi: string;
}

export interface DhingraPatientModule {
  id: string;
  code: string;
  title: string;
  titleHindi: string;
  subspecialty: 'otology' | 'rhinology' | 'pharynx' | 'laryngology' | 'head_neck' | 'procedures';
  chapterNo: number;
  chapterTitle: string;
  pdfPageRange: string;
  icd10Code: string;
  snomedCode: string;
  
  // Standard & Simplified summaries
  overview: string;
  overviewHindi: string;
  simplifiedOverview: string;
  simplifiedOverviewHindi: string;

  // Key Symptoms
  symptoms: string[];
  symptomsHindi: string[];

  // Red Flags / Emergency Warnings
  redFlags: string[];
  redFlagsHindi: string[];

  // Home Care & Self-Management
  homeCare: string[];
  homeCareHindi: string[];

  // Do's and Don'ts
  dos: string[];
  dosHindi: string[];
  donts: string[];
  dontsHindi: string[];

  // Medical & Surgical Options (Paraphrased from Dhingra)
  medicalOptions: string[];
  medicalOptionsHindi: string[];
  surgicalOptions: string[];
  surgicalOptionsHindi: string[];

  // FAQs
  faqs: DhingraFaq[];
}

export const DHINGRA_PATIENT_MODULES: DhingraPatientModule[] = [
  {
    id: 'dhingra-mod-1',
    code: 'DHINGRA-EAR-01',
    title: 'Chronic Otitis Media & Ear Discharge (कान से मवाद आना)',
    titleHindi: 'पुराना कान का संक्रमण (कान से पानी/मवाद बहना)',
    subspecialty: 'otology',
    chapterNo: 11,
    chapterTitle: 'Cholesteatoma and Chronic Otitis Media',
    pdfPageRange: 'pp. 88–97',
    icd10Code: 'H66.9',
    snomedCode: '19427006',
    overview:
      'Chronic Otitis Media (CSOM) is a long-standing infection of the middle ear space characterized by a persistent perforation in the tympanic membrane (eardrum) and recurrent ear discharge (otorrhea) with varying degrees of hearing impairment.',
    overviewHindi:
      'क्रोनिक ओटिटिस मीडिया (CSOM) कान के परदे में छेद और कान से बार-बार मवाद या पानी बहने की एक पुरानी स्थिति है, जिससे सुनने की क्षमता भी कम हो सकती है।',
    simplifiedOverview:
      'If you have a hole in your eardrum, water or bacteria can easily get into your ear, causing watery or smelly fluid to drain out and making hearing muffled.',
    simplifiedOverviewHindi:
      'यदि आपके कान के परदे में छेद है, तो पानी या कीटाणु आसानी से कान के अंदर जाकर इन्फेक्शन कर सकते हैं, जिससे कान बहता है और कम सुनाई देता है।',
    symptoms: [
      'Painless or foul-smelling discharge from the ear',
      'Gradual hearing loss or muffled hearing',
      'Fullness or pressure inside the ear',
      'Ringing sound in the ear (tinnitus)'
    ],
    symptomsHindi: [
      'कान से बिना दर्द वाला या बदबूदार मवाद बहना',
      'धीरे-धीरे सुनने की क्षमता कम होना',
      'कान में भारीपन या दबाव महसूस होना',
      'कान में सीटी या घंटी जैसी आवाजें आना (टिनिटस)'
    ],
    redFlags: [
      'Severe headache or high fever',
      'Swelling or tenderness behind the ear (mastoid area)',
      'Sudden dizziness, loss of balance, or vomiting',
      'Facial weakness or drooping on one side'
    ],
    redFlagsHindi: [
      'तेज सिरदर्द या तेज बुखार',
      'कान के पीछे सूजन या दर्द (मैस्टॉइड सूजन)',
      'अचानक चक्कर आना या संतुलन बिगड़ना',
      'चेहरे के एक तरफ कमजोरी या लकवा (पैरालिसिस)'
    ],
    homeCare: [
      'Keep the ear strictly dry during baths using cotton soaked in vaseline.',
      'Do NOT insert cotton buds, matchsticks, or hairpins into the ear canal.',
      'Instill prescribed ear drops after cleaning outer discharge gently with sterile tissue.'
    ],
    homeCareHindi: [
      'नहाते समय कान में पानी न जाने दें (वेसलीन लगी रुई का इस्तेमाल करें)।',
      'कान में कॉटन बड, तीली या पिन बिल्कुल न डालें।',
      'डॉक्टर द्वारा दी गई ड्रॉप्स समय पर सही तरीके से डालें।'
    ],
    dos: [
      'Keep your ear dry at all times.',
      'Complete the full course of prescribed antibiotic drops.',
      'Consult an ENT doctor before swimming.'
    ],
    dosHindi: [
      'कान को हमेशा सूखा रखें।',
      'एंटीबायोटिक इयर ड्रॉप्स का पूरा कोर्स खत्म करें।',
      'तैराकी करने से पहले नाक-कान-गला विशेषज्ञ की सलाह लें।'
    ],
    donts: [
      'Never put homemade oils, warm ghee, or unfiltered water in the ear.',
      'Avoid blowing your nose forcibly with both nostrils closed.',
      'Do not put unprescribed over-the-counter drops into a perforated ear.'
    ],
    dontsHindi: [
      'कान में तेल, घी या नीम का पानी कभी न डालें।',
      'दोनों नथुने बंद करके तेजी से नाक न छिनकें।',
      'बिना डॉक्टर की सलाह के मेडिकल स्टोर से ड्रॉप्स लेकर न डालें।'
    ],
    medicalOptions: [
      'Topical antimicrobial ear drops (e.g., ciprofloxacin/ofloxacin)',
      'Systemic antibiotics during acute ear discharge flares',
      'Gentle ear canal suction clearance under microscopic guidance'
    ],
    medicalOptionsHindi: [
      'एंटीबायोटिक कान की बूंदें (जैसे सिप्रोफ्लोक्सासिन/ओफ्लोक्सासिन)',
      'इन्फेक्शन बढ़ने पर खाने की एंटीबायोटिक दवाएं',
      'माइक्रोस्कोप की मदद से कान की सफाई (सक्शन क्लीयरेंस)'
    ],
    surgicalOptions: [
      'Tympanoplasty (Surgical repair of the eardrum hole)',
      'Mastoidectomy (Cleaning infected mastoid bone cells behind the ear)'
    ],
    surgicalOptionsHindi: [
      'टिम्पेनोप्लास्टी (कान का परदा सिलने/बनाने का ऑपरेशन)',
      'मैस्टॉइडेक्टॉमी (कान के पीछे की सड़ी हड्डी की सफाई का ऑपरेशन)'
    ],
    faqs: [
      {
        question: 'Can a perforated eardrum heal naturally without surgery?',
        questionHindi: 'क्या कान का छेद बिना ऑपरेशन के भर सकता है?',
        answer:
          'Small, fresh traumatic tears often heal within 4–6 weeks if kept dry. However, chronic holes with recurring infection usually require a minor procedure (Tympanoplasty).',
        answerHindi:
          'छोटे और नए छेद 4-6 हफ्तों में अपने आप भर सकते हैं यदि कान सूखा रखा जाए। लेकिन पुराने छेद के लिए ऑपरेशन की जरूरत होती है।'
      },
      {
        question: 'Why is water dangerous for my ear?',
        questionHindi: 'कान के लिए पानी इतना खतरनाक क्यों है?',
        answer:
          'Water carries bacteria and fungus through the perforated eardrum into the sterile middle ear, causing rapid infection, pain, and foul discharge.',
        answerHindi:
          'पानी के जरिए कीटाणु कान के परदे के पार पहुंचकर इन्फेक्शन पैदा करते हैं, जिससे मवाद और दर्द होने लगता है।'
      }
    ]
  },
  {
    id: 'dhingra-mod-2',
    code: 'DHINGRA-EAR-02',
    title: 'Ménière’s Disease & Vertigo (चक्कर आना और संतुलन खोना)',
    titleHindi: 'मेनियर बीमारी और चक्कर आना (वर्टिगो)',
    subspecialty: 'otology',
    chapterNo: 15,
    chapterTitle: 'Ménière’s Disease',
    pdfPageRange: 'pp. 126–131',
    icd10Code: 'H81.0',
    snomedCode: '69922007',
    overview:
      'Ménière’s disease is a disorder of the inner ear characterized by episodes of spinning vertigo, fluctuating sensorineural hearing loss, tinnitus (ringing), and a sensation of ear fullness due to endolymphatic hydrops (fluid build-up in the inner ear).',
    overviewHindi:
      'मेनियर रोग अंदरूनी कान का एक विकार है जिसमें अचानक तेज चक्कर आना, कान में घंटी बजना, कान बंद महसूस होना और सुनने में उतार-चढ़ाव होना शामिल है।',
    simplifiedOverview:
      'The inner ear controls your balance. In Ménière’s disease, extra liquid builds up in the inner ear, making you feel like the room is spinning around you.',
    simplifiedOverviewHindi:
      'अंदरूनी कान शरीर का संतुलन बनाए रखता है। मेनियर बीमारी में अंदर तरल पदार्थ बढ़ जाता है, जिससे ऐसा लगता है कि पूरा कमरा गोल घूम रहा है।',
    symptoms: [
      'Sudden attacks of spinning dizziness (vertigo) lasting 20 minutes to several hours',
      'Nausea and vomiting during vertigo attacks',
      'Fluctuating hearing loss (worse in lower pitches)',
      'Low-pitched buzzing or roaring tinnitus'
    ],
    symptomsHindi: [
      'अचानक 20 मिनट से लेकर कुछ घंटों तक चलने वाले तेज चक्कर आना',
      'चक्कर के साथ उल्टी और घबराहट होना',
      'कम सुनाई देना (जो समय के साथ कम या ज्यादा होता रहता है)',
      'कान में भिनभिनाहट या गर्जन जैसी आवाज आना'
    ],
    redFlags: [
      'Fainting or loss of consciousness during a fall',
      'Double vision, slurred speech, or numbness in arms/legs',
      'Sudden profound hearing loss in both ears'
    ],
    redFlagsHindi: [
      'चक्कर आकर बेहोश हो जाना या गिर जाना',
      'दो-दो दिखाई देना, आवाज लडखडाना या हाथ-पैर सुन्न होना',
      'दोनों कानों से अचानक पूरी तरह सुनाई देना बंद हो जाना'
    ],
    homeCare: [
      'Adhere to a low-salt diet (restrict sodium intake to less than 2 grams per day).',
      'Lie still in a quiet, dark room during a acute vertigo attack with eyes closed.',
      'Avoid sudden head movements, bright lights, or watching moving screen objects during attacks.'
    ],
    homeCareHindi: [
      'खाने में नमक की मात्रा कम करें (प्रतिदिन 2 ग्राम से कम)।',
      'चक्कर आने पर अंधेरे और शांत कमरे में आंखें बंद करके सीधे लेट जाएं।',
      'अचानक गर्दन या सिर घुमाने से बचें।'
    ],
    dos: [
      'Drink plenty of plain water spread throughout the day.',
      'Keep acute rescue medications (vestibular suppressants) handy at all times.',
      'Maintain a dizzy diary to track triggers (stress, caffeine, salt).'
    ],
    dosHindi: [
      'दिन भर में पर्याप्त मात्रा में पानी पिएं।',
      'चक्कर की आपातकालीन दवाएं हमेशा पास रखें।',
      'एक डायरी में नोट करें कि किस वजह से चक्कर आ रहे हैं (जैसे अधिक नमक, तनाव, कॉफी)।'
    ],
    donts: [
      'Do not consume excessive coffee, tea, chocolates, or alcohol.',
      'Avoid smoking or nicotine usage (nicotine constricts inner ear blood vessels).',
      'Never drive or operate machinery during an active vertigo episode.'
    ],
    dontsHindi: [
      'कॉफी, चाय, शराब या अत्यधिक चॉकलेट से परहेज करें।',
      'सिगरेट, तंबाकू या बीड़ी से दूर रहें।',
      'चक्कर आने के दौरान गाड़ी न चलाएं और भारी मशीनरी पर काम न करें।'
    ],
    medicalOptions: [
      'Vestibular suppressants (e.g., Betahistine, Cinnarizine, Dimenhydrinate)',
      'Diuretics (water pills) to reduce inner ear fluid pressure',
      'Intratympanic steroid or gentamicin injections for severe refractory cases'
    ],
    medicalOptionsHindi: [
      'चक्कर रोधी दवाएं (जैसे बीटाहिस्टिन, सिग्नाइरिन)',
      'कान का तरल पदार्थ कम करने वाली दवाएं (डाययूरेटिक्स)',
      'गंभीर मामलों में कान के परदे के पीछे इंजेक्शन (इंट्राटैम्पैनिक इंजेक्शन)'
    ],
    surgicalOptions: [
      'Endolymphatic sac decompression/shunt surgery',
      'Vestibular nerve section or Labyrinthectomy for severe incapacitating unilateral cases'
    ],
    surgicalOptionsHindi: [
      'एंडोलिम्फैटिक सैक डिकम्प्रेशन सर्जरी (कान के दबाव को कम करने का ऑपरेशन)',
      'वेस्टिबुलर नर्व सेक्शन (अत्यधिक गंभीर मामलों में नस काटने की सर्जरी)'
    ],
    faqs: [
      {
        question: 'Does salt really trigger vertigo attacks?',
        questionHindi: 'क्या वाकई नमक ज्यादा खाने से चक्कर आते हैं?',
        answer:
          'Yes. High salt increases fluid retention in the body and spikes inner ear fluid pressure (endolymphatic hydrops), triggering sudden vertigo attacks.',
        answerHindi:
          'हां, अधिक नमक खाने से शरीर और कान के अंदर तरल पदार्थ का दबाव बढ़ जाता है जिससे चक्कर आ सकते हैं।'
      }
    ]
  },
  {
    id: 'dhingra-mod-3',
    code: 'DHINGRA-EAR-03',
    title: 'Tinnitus: Ringing & Humming Sounds in Ears (कान में आवाजें आना)',
    titleHindi: 'टिनिटस (कान में सीटी, घंटी या सां-सां की आवाज आना)',
    subspecialty: 'otology',
    chapterNo: 22,
    chapterTitle: 'Tinnitus',
    pdfPageRange: 'pp. 160–161',
    icd10Code: 'H93.1',
    snomedCode: '60862001',
    overview:
      'Tinnitus is the perception of sound in the ear or head without an external acoustic source. It can be subjective (heard only by the patient) or objective (vascular/muscular sound heard by the examiner).',
    overviewHindi:
      'टिनिटस बिना किसी बाहरी स्रोत के कान या सिर के अंदर आवाजें (जैसे सीटी, बजना या भिनभिनाहट) सुनाई देने की स्थिति है।',
    simplifiedOverview:
      'Tinnitus is like having a tiny internal radio stuck on static inside your ear. It often happens when ear nerve cells get irritated or tired.',
    simplifiedOverviewHindi:
      'टिनिटस का मतलब है कान में बिना किसी बाहरी शोर के अपने आप सीटी या घंटी की आवाज आना। यह कान की नसों में थकावट या नुकसान की वजह से होता है।',
    symptoms: [
      'Ringing, buzzing, whistling, roaring, or clicking sounds in one or both ears',
      'Increased awareness of internal noise in quiet places or before sleep',
      'Associated stress, sleep disturbance, or mild hearing difficulty'
    ],
    symptomsHindi: [
      'एक या दोनों कानों में सीटी, घंटी, भिनभिनाहट या सायँ-सायँ की आवाजें आना',
      'शांत माहौल या रात को सोते समय आवाज अधिक महसूस होना',
      'चिंता, नींद में रुकावट और ध्यान केंद्रित करने में परेशानी'
    ],
    redFlags: [
      'Pulsatile tinnitus (sound beating in sync with your heart pulse)',
      'Tinnitus restricted to only ONE ear with progressive hearing loss',
      'Associated facial numbness or dizziness'
    ],
    redFlagsHindi: [
      'दिल की धड़कन की लय में कान में आवाज आना (पल्सेटाइल टिनिटस)',
      'केवल एक ही कान में तेज आवाज आना और साथ में सुनाई कम देना',
      'चेहरे में सुन्नपन या चक्कर आना'
    ],
    homeCare: [
      'Use white noise machines, soft ambient music, or a bedside fan during sleep to mask tinnitus.',
      'Protect your ears from loud noise with earplugs or noise-cancelling headphones in noisy environments.',
      'Practice mindfulness and relaxation techniques to reduce stress-induced tinnitus spikes.'
    ],
    homeCareHindi: [
      'सोते समय पंखे या हल्की धीमी संगीत/सफेद शोर (व्हाइट नॉइज़) का प्रयोग करें।',
      'तेज आवाज वाले स्थानों पर कान में प्लग लगाएं।',
      'तनाव कम करने के लिए योग और प्राणायाम करें।'
    ],
    dos: [
      'Stay mentally active and keep background sound present in quiet rooms.',
      'Have your hearing formally evaluated with an Audiogram (Pure Tone Audiometry).',
      'Maintain regular sleep hygiene.'
    ],
    dosHindi: [
      'कमरे को एकदम शांत न रखें, हल्का पृष्ठभूमि शोर बनाए रखें।',
      'कान के डॉक्टर से आडियोग्राम (सुनने की जांच) करवाएं।',
      'सोने का समय निश्चित रखें।'
    ],
    donts: [
      'Avoid long hours of listening to loud audio on earphones.',
      'Do not consume excessive caffeine, energy drinks, or high-sodium foods.',
      'Avoid focusing constantly on the noise (this reinforces the brain sound pathway).'
    ],
    dontsHindi: [
      'ईयरफोन पर तेज आवाज में लंबे समय तक गाने न सुनें।',
      'ज्यादा चाय, कॉफी या तंबाकू का सेवन न करें।',
      'दिन भर कान की आवाज पर ही ध्यान न लगाए रखें।'
    ],
    medicalOptions: [
      'Tinnitus Retraining Therapy (TRT) and Cognitive Behavioral Therapy (CBT)',
      'Customized Sound Therapy generators / Hearing aids with integrated tinnitus masking',
      'Pharmacotherapy for sleep or anxiety management if indicated'
    ],
    medicalOptionsHindi: [
      'टिनिटस रिट्रेनिंग थेरेपी (TRT) और माइंडफुलनेस काउंसलिंग',
      'हियरिंग एड (सुनने की मशीन) में टिनिटस मास्कर मोड का उपयोग',
      'नींद और चिंता के लिए डॉक्टर द्वारा सुझाई गई दवाएं'
    ],
    surgicalOptions: [
      'Cochlear Implant (in cases of profound hearing loss associated with intractable tinnitus)'
    ],
    surgicalOptionsHindi: [
      'कोक्लेयर इम्प्लांट (अत्यधिक बहरेपन और गंभीर टिनिटस के रोगियों के लिए)'
    ],
    faqs: [
      {
        question: 'Will tinnitus make me permanently deaf?',
        questionHindi: 'क्या टिनिटस से मैं बहरा हो जाऊंगा?',
        answer:
          'No. Tinnitus itself does not cause deafness; it is a symptom of inner ear or auditory pathway changes that can be managed effectively with sound therapy.',
        answerHindi:
          'नहीं, टिनिटस अपने आप में बहरेपन का कारण नहीं बनता। साउंड थेरेपी और हियरिंग एड से इसे आसानी से नियंत्रित किया जा सकता है।'
      }
    ]
  },
  {
    id: 'dhingra-mod-4',
    code: 'DHINGRA-RHINO-01',
    title: 'Allergic Rhinitis & Seasonal Allergies (एलर्जी और छींकें आना)',
    titleHindi: 'अलर्जिक राइनाइटिस (बार-बार छींक आना और नाक बहना)',
    subspecialty: 'rhinology',
    chapterNo: 30,
    chapterTitle: 'Allergic Rhinitis',
    pdfPageRange: 'pp. 202–205',
    icd10Code: 'J30.9',
    snomedCode: '61582004',
    overview:
      'Allergic Rhinitis is an IgE-mediated inflammatory response of the nasal mucosa to airborne environmental allergens, characterized by paroxysmal sneezing, watery nasal discharge, nasal congestion, and itching.',
    overviewHindi:
      'अलर्जिक राइनाइटिस हवा में मौजूद धूल, परागकण या एलर्जी पैदा करने वाले तत्वों की वजह से नाक में होने वाली सूजन है, जिससे लगातार छींकें आती हैं और पानी जैसा डिस्चार्ज बहता है।',
    simplifiedOverview:
      'When your nose breathes in dust, pollen, or pet hair, your immune system overreacts. This makes your nose itch, sneeze repeatedly, and run like a leaky tap.',
    simplifiedOverviewHindi:
      'जब आपकी नाक में धूल, मिट्टी या परागकण जाते हैं, तो आपकी इम्युनिटी अति-प्रतिक्रिया देती है। इससे नाक में खुजली, लगातार छींकें और पानी बहना शुरू हो जाता है।',
    symptoms: [
      'Bouts of multiple consecutive sneezes (paroxysmal sneezing), especially in the morning',
      'Watery nasal discharge (rhinorrhea)',
      'Nasal blockage and breathing through the mouth',
      'Itching in the nose, eyes, palate, and throat'
    ],
    symptomsHindi: [
      'सुबह उठते ही लगातार 10-20 छींकें आना',
      'नाक से पानी की तरह बहना',
      'नाक बंद रहना और मुंह से सांस लेना',
      'नाक, आंखों, तालु और गले में खुजली होना'
    ],
    redFlags: [
      'Thick yellow or green foul nasal pus accompanied by high fever',
      'Severe facial pain or forehead pressure (sinusitis complication)',
      'Shortness of breath, chest tightness, or wheezing (co-existing asthma attack)'
    ],
    redFlagsHindi: [
      'नाक से गाढ़ा पीला/हरा बदबूदार मवाद और तेज बुखार',
      'चेहरे और माथे पर तेज दर्द व दबाव',
      'सांस फूलना या छाती में घड़घड़ाहट (अस्थमा का दौरा)'
    ],
    homeCare: [
      'Identify and minimize exposure to known allergens (dust mites, pollen, mold, pet dander).',
      'Perform regular saline nasal irrigation (Jal Neti or isotonic saline spray) to flush out allergens.',
      'Encortain mattresses and pillows with dust-mite proof covers and wash bedding in warm water.'
    ],
    homeCareHindi: [
      'धूल-मिट्टी, धुआं, पालतू जानवरों के बाल और तेज इत्र से बचें।',
      'रोजाना सुबह गुनगुने नमकीन पानी या सेलाइन नेजल स्प्रे से नाक की सफाई करें।',
      'बिस्तर और तकिये की चादरों को गर्म पानी में धोएं।'
    ],
    dos: [
      'Use prescribed steroid nasal sprays consistently as directed (takes 1–2 weeks for full effect).',
      'Wear an N95 mask when sweeping, gardening, or traveling in dusty outdoor air.',
      'Keep indoor rooms well-ventilated and dry.'
    ],
    dosHindi: [
      'डॉक्टर द्वारा दी गई नेजल स्प्रे का नियमित इस्तेमाल करें।',
      'सफाई करते या धूल वाली जगह जाते समय N95 मास्क पहनें।',
      'कमरे में हवा और धूप आने दें।'
    ],
    donts: [
      'Do not rely long-term on over-the-counter decongestant drops (e.g. Otrivin) for >5 days.',
      'Avoid sudden temperature changes, such as stepping directly from AC into hot sun.',
      'Do not rub your eyes or nose vigorously.'
    ],
    dontsHindi: [
      'ओट्रिविन या बंद नाक की ड्रॉप्स का प्रयोग 5 दिन से ज्यादा न करें (इससे नाक हमेशा के लिए बंद हो सकती है)।',
      'एसी कमरे से तुरंत धूप में न निकलें।',
      'नाक और आंखों को बार-बार न रगड़ें।'
    ],
    medicalOptions: [
      'Intranasal corticosteroid sprays (e.g., Fluticasone, Mometasone)',
      'Non-sedating oral second-generation antihistamines (e.g., Levocetirizine, Fexofenadine)',
      'Leukotriene receptor antagonists (e.g., Montelukast)',
      'Allergen Immunotherapy (desensitization sublingual drops/shots for severe cases)'
    ],
    medicalOptionsHindi: [
      'स्टेरॉयड नेजल स्प्रे (फ्लोटिकासोन या मोमेटासोन)',
      'एलर्जी रोधी गोलियां (लीवोसेटिरिजिन, फेक्सोफेनाडाइन)',
      'मोंटेलुकास्ट दवाएं',
      'एलर्जी इम्युनोथेरेपी (एलर्जी के टीके या जीभ के नीचे वाली बूंदें)'
    ],
    surgicalOptions: [
      'Turbinate reduction / Submucous resection (if severe hypertrophied turbinates block nasal airway despite medical therapy)'
    ],
    surgicalOptionsHindi: [
      'टर्बिनेट रिडक्शन / सेप्टोप्लास्टी (यदि नाक के अंदर की मांस की गांठें दवा से ठीक न हों)'
    ],
    faqs: [
      {
        question: 'Are steroid nasal sprays safe for long term use?',
        questionHindi: 'क्या नेजल स्प्रे का लंबे समय तक इस्तेमाल सुरक्षित है?',
        answer:
          'Modern topical steroid nasal sprays act locally inside the nose with minimal systemic absorption, making them extremely safe for long-term seasonal use under doctor supervision.',
        answerHindi:
          'जी हां, आधुनिक नेजल स्प्रे केवल नाक की सतह पर काम करते हैं और खून में नहीं जाते, इसलिए ये सुरक्षित हैं।'
      }
    ]
  },
  {
    id: 'dhingra-mod-5',
    code: 'DHINGRA-RHINO-02',
    title: 'Epistaxis: Bleeding from Nose (नाक से खून बहना / नकसीर)',
    titleHindi: 'नकसीर या नाक से खून बहना (एपिस्टैक्सिस)',
    subspecialty: 'rhinology',
    chapterNo: 33,
    chapterTitle: 'Epistaxis',
    pdfPageRange: 'pp. 212–217',
    icd10Code: 'R04.0',
    snomedCode: '24932003',
    overview:
      'Epistaxis is bleeding from the nasal cavity or nasopharynx. It most commonly originates from Little’s area (Kiesselbach’s plexus) on the anterior nasal septum.',
    overviewHindi:
      'नाक से खून बहने को नकसीर (Epistaxis) कहते हैं। यह अधिकतर नाक के सामने वाले हिस्से (लिटिल्स एरिया) की रक्त वाहिकाओं के फटने से होता है।',
    simplifiedOverview:
      'Nosebleeds happen when small delicate blood vessels inside the front wall of your nose burst due to dryness, nose picking, heat, or high blood pressure.',
    simplifiedOverviewHindi:
      'नाक के अंदर की खून की नसें बहुत पतली होती हैं। सूखी हवा, गर्मी, नाक में उंगली डालने या हाई बीपी की वजह से ये नसें फट जाती हैं और खून बहने लगता है।',
    symptoms: [
      'Sudden trickling or heavy flow of blood from one or both nostrils',
      'Blood dripping down the back of the throat',
      'Feeling dizzy or lightheaded if blood loss is significant'
    ],
    symptomsHindi: [
      'एक या दोनों नथुनों से अचानक खून बहना',
      'गले के पीछे खून का रिसाव होना',
      'ज्यादा खून बहने पर कमजोरी या चक्कर महसूस होना'
    ],
    redFlags: [
      'Uncontrolled nosebleeding that does not stop after 15–20 minutes of continuous firm pressure',
      'Bleeding accompanied by fainting, rapid heart rate, or pale skin',
      'Frequent recurring nosebleeds with unexplained bodily bruising'
    ],
    redFlagsHindi: [
      '15-20 मिनट तक नाक दबाने के बाद भी खून का न रुकना',
      'खून बहने के साथ बेहोशी, तेज धड़कन या त्वचा का पीला पड़ना',
      'शरीर पर नीले निशान पड़ने के साथ बार-बार नकसीर फूटना'
    ],
    homeCare: [
      'TROTTER’S METHOD: Sit upright and lean slightly FORWARD (never lean your head backward!).',
      'Firmly pinch the soft cartilaginous part of your nose with thumb and index finger continuously for 10–15 minutes.',
      'Breathe smoothly through your mouth and spit out any blood that enters your mouth.'
    ],
    homeCareHindi: [
      'आगे की तरफ झुककर बैठें (सिर पीछे बिल्कुल न झुकाएं!)।',
      'अंगूठे और उंगली से नाक के निचले मुलायम हिस्से को लगातार 10-15 मिनट दबाकर रखें।',
      'मुंह से सांस लें और गले में आए खून को थूक दें।'
    ],
    dos: [
      'Apply ice packs over the bridge of the nose or forehead.',
      'Use saline nose drops or liquid paraffin oil to keep nasal lining moist.',
      'Monitor blood pressure if you are a known hypertensive patient.'
    ],
    dosHindi: [
      'नाक के ऊपर या माथे पर बर्फ की सिकाई करें।',
      'नाक की नमी बनाए रखने के लिए सेलाइन ड्रॉप्स या पैराफिन ऑयल का इस्तेमाल करें।',
      'बीपी के मरीज अपना ब्लड प्रेशर तुरंत चेक करें।'
    ],
    donts: [
      'DO NOT tilt head backwards (this causes blood to be swallowed into stomach or aspirated into lungs).',
      'Do not blow your nose, pick inside the nose, or perform heavy lifting for 24 hours after bleeding stops.',
      'Avoid taking non-prescribed aspirin or NSAID pain relievers.'
    ],
    dontsHindi: [
      'सिर को पीछे की तरफ न झुकाएं (इससे खून पेट में जाकर उल्टी या फेफड़ों में फंस सकता है)।',
      'खून रुकने के 24 घंटे बाद तक नाक न छिनकें और न ही भारी सामान उठाएं।',
      'बिना सलाह के एस्पिरिन या डिस्प्रिन की गोली न लें।'
    ],
    medicalOptions: [
      'Anterior Nasal Packing (using ribbon gauze lubricated with antibiotic ointment or merocel sponges)',
      'Chemical Cautery (using Silver Nitrate applicator stick) or Electro-cautery under local anesthesia',
      'Posterior Nasal Packing / Foley catheter balloon inflation for posterior bleeding'
    ],
    medicalOptionsHindi: [
      'नेजल पैकिंग (नाक में एंटीबायोटिक लगी पट्टी या स्पंज भरना)',
      'सिल्वर नाइट्रेट से फटी नस की सिकाई (काउटरी)',
      'पीछे के खून के लिए पोस्टीरियर पैकिंग या बैलून पैकिंग'
    ],
    surgicalOptions: [
      'Endoscopic Sphenopalatine Artery Ligation (ESPAL) for severe refractory posterior epistaxis'
    ],
    surgicalOptionsHindi: [
      'एंडोस्कोपिक नस बांधने का ऑपरेशन (ESPAL)'
    ],
    faqs: [
      {
        question: 'Why should I lean forward instead of backward during a nosebleed?',
        questionHindi: 'नाक से खून बहने पर सिर पीछे क्यों नहीं झुकाना चाहिए?',
        answer:
          'Tilting your head backward causes blood to drain down your throat into your stomach, triggering violent vomiting or choking into your lungs.',
        answerHindi:
          'सिर पीछे झुकाने से खून गले से पेट में चला जाता है जिससे उल्टी और सांस की नली में रुकावट का खतरा रहता है।'
      }
    ]
  },
  {
    id: 'dhingra-mod-6',
    code: 'DHINGRA-RHINO-03',
    title: 'Chronic Rhinosinusitis & Sinus Douching (साइनस और माथे का दर्द)',
    titleHindi: 'क्रोनिक राइनोसाइनुसाइटिस (साइनस का इन्फेक्शन और नेजल वाश)',
    subspecialty: 'rhinology',
    chapterNo: 37,
    chapterTitle: 'Chronic Rhinosinusitis',
    pdfPageRange: 'pp. 232–237',
    icd10Code: 'J32.9',
    snomedCode: '40055000',
    overview:
      'Chronic Rhinosinusitis (CRS) is persistent inflammation of the nasal passages and paranasal sinuses lasting longer than 12 weeks, characterized by nasal obstruction, facial pressure/pain, post-nasal drip, and reduced sense of smell.',
    overviewHindi:
      'क्रोनिक साइनुसाइटिस नाक और उसके आस-पास की हड्डियों के छिद्रों (साइनस) में 12 हफ्तों से अधिक समय तक रहने वाली सूजन है, जिससे माथे में दर्द, नाक बंद और बदबू आती है।',
    simplifiedOverview:
      'Your sinuses are hollow air spaces in your facial bones. When blocked, fluid gets trapped inside, causing pressure, headaches, and thick discharge.',
    simplifiedOverviewHindi:
      'आपके चेहरे की हड्डियों के अंदर हवा की थैलियां (साइनस) होती हैं। जब वे बंद हो जाती हैं, तो उनमें बलगम भर जाता है जिससे चेहरे पर दर्द और दबाव महसूस होता है।',
    symptoms: [
      'Facial pain, pressure, or fullness over cheeks, forehead, or between eyes',
      'Nasal congestion and difficulty breathing through the nose',
      'Thick discolored post-nasal drip draining into back of throat',
      'Hyposmia (reduced or loss of smell)'
    ],
    symptomsHindi: [
      'चेहरे, माथे और आंखों के बीच भारीपन व दर्द',
      'नाक बंद रहना और सांस लेने में कठिनाई',
      'गले के पीछे गाढ़ा बलगम गिरना (पोस्ट नेजल ड्रिप)',
      'सुंघने की शक्ति कम होना'
    ],
    redFlags: [
      'Swelling, redness, or protrusion of the eyeball (orbital cellulitis)',
      'Double vision or loss of vision',
      'Severe frontal headache with neck stiffness and high fever (meningitis risk)'
    ],
    redFlagsHindi: [
      'आंखों के चारों तरफ सूजन, लालिमा या आंख का बाहर आना',
      'दो-दो दिखाई देना या देखने में परेशानी',
      'तेज सिरदर्द के साथ गर्दन में अकड़न और बुखार'
    ],
    homeCare: [
      'Perform high-volume low-pressure isotonic saline sinus douching (squeeze bottle neti) twice daily.',
      'Steam inhalation for 10–15 minutes twice a day to loosen sinus secretions.',
      'Stay hydrated with warm water and herbal teas.'
    ],
    homeCareHindi: [
      'रोजाना दो बार सेलाइन बोतल (नेजल डच) से नाक की सफाई करें।',
      'दिन में दो बार भाप (स्टीम) लें।',
      'गुनगुना पानी पर्याप्त मात्रा में पिएं।'
    ],
    dos: [
      'Use steroid nasal spray after completing saline sinus douching.',
      'Elevate your head with extra pillows during sleep.',
      'Complete full prescribed duration of medical treatment.'
    ],
    dosHindi: [
      'नाक साफ करने के बाद ही स्टेरॉयड स्प्रे का प्रयोग करें।',
      'सोते समय सिर को थोड़ा ऊंचा रखें।',
      'दवाइयों का कोर्स पूरा करें।'
    ],
    donts: [
      'Avoid diving or swimming in chlorinated pools during acute sinus flares.',
      'Do not smoke or expose yourself to secondhand tobacco smoke.',
      'Avoid blowing your nose violently.'
    ],
    dontsHindi: [
      'साइनस के दर्द में स्विमिंग न करें।',
      'धूम्रपान और धुएं से बचें।',
      'बहुत तेजी से जोर लगाकर नाक न छिनकें।'
    ],
    medicalOptions: [
      'Intranasal corticosteroid sprays for minimum 8–12 weeks',
      'Extended courses of macrolide antibiotics for immunomodulatory action',
      'Short courses of oral corticosteroids during severe polypoid flares'
    ],
    medicalOptionsHindi: [
      '8-12 सप्ताह तक नेजल स्टेरॉयड स्प्रे',
      'एंटीबायोटिक दवाओं का लंबा कोर्स',
      'गंभीर मामलों में मुंह से ली जाने वाली स्टेरॉयड गोलियों का छोटा कोर्स'
    ],
    surgicalOptions: [
      'FESS (Functional Endoscopic Sinus Surgery) to restore natural sinus ventilation and drainage'
    ],
    surgicalOptionsHindi: [
      'FESS - एंडोस्कोपिक साइनस सर्जरी (दूरबीन द्वारा साइनस के रास्ते खोलने का ऑपरेशन)'
    ],
    faqs: [
      {
        question: 'How does sinus douching help my sinuses?',
        questionHindi: 'नेजल डचिंग (नाक की सफाई) साइनस में कैसे मदद करती है?',
        answer:
          'Sinus douching flushes out thick stagnant mucus, allergens, and inflammatory debris while helping natural cilia beat effectively.',
        answerHindi:
          'साइनस डचिंग जमा हुए बलगम, बैक्टीरिया और एलर्जी फैलाने वाले कणों को बाहर निकालकर साइनस की प्राकृतिक सफाई करती है।'
      }
    ]
  },
  {
    id: 'dhingra-mod-7',
    code: 'DHINGRA-THROAT-01',
    title: 'Acute & Chronic Tonsillitis (टॉन्सिल में सूजन और गले का दर्द)',
    titleHindi: 'टॉन्सिलाइटिस (टॉन्सिल में इन्फेक्शन और गले में दर्द)',
    subspecialty: 'pharynx',
    chapterNo: 51,
    chapterTitle: 'Acute and Chronic Tonsillitis',
    pdfPageRange: 'pp. 306–311',
    icd10Code: 'J35.0',
    snomedCode: '54088003',
    overview:
      'Tonsillitis is inflammation of the palatine tonsils, commonly caused by viral or bacterial infection (Group A Beta-Hemolytic Streptococcus), leading to sore throat, fever, dysphagia, and enlarged tender cervical lymph nodes.',
    overviewHindi:
      'टॉन्सिलाइटिस गले के दोनों तरफ स्थित टॉन्सिल ग्रंथि का संक्रमण है। यह बैक्टीरिया या वायरस के कारण होता है, जिससे निगलने में तेज दर्द, बुखार और गले में गांठें बनती हैं।',
    simplifiedOverview:
      'Tonsils are guardians at the back of your throat. When germs attack them, they swell up red, become covered in white spots, and make swallowing painful.',
    simplifiedOverviewHindi:
      'टॉन्सिल आपके गले के चौकीदार हैं। जब कीटाणु हमला करते हैं, तो टॉन्सिल लाल होकर सूज जाते हैं, जिससे खाना निगलने में बहुत दर्द होता है।',
    symptoms: [
      'Severe sore throat and odynophagia (painful swallowing)',
      'High fever with chills and rigor',
      'Red, swollen tonsils with white or yellow pus spots (follicular tonsillitis)',
      'Swollen, tender neck lymph nodes below the jaw'
    ],
    symptomsHindi: [
      'गले में तेज दर्द और थूक या खाना निगलने में तकलीफ',
      'कपकपी के साथ तेज बुखार',
      'लाल, सूजे हुए टॉन्सिल जिन पर सफेद/पीले मवाद के धब्बे हों',
      'गर्दन और जबड़े के नीचे की ग्रंथियों (गिल्टियों) में सूजन व दर्द'
    ],
    redFlags: [
      'Quinsy (Peritonsillar Abscess): Severe one-sided throat pain, trismus (inability to open mouth), and muffled hot potato voice',
      'Inability to swallow liquids leading to dehydration',
      'Stridor or respiratory distress (difficulty breathing)'
    ],
    redFlagsHindi: [
      'क्विंसी (टॉन्सिल के पास मवाद की थैली): मुंह न खोल पाना, एक तरफ तेज दर्द और आवाज भारी होना',
      'पानी तक न निगल पाना और शरीर में पानी की अत्यधिक कमी होना',
      'सांस लेने में तकलीफ या सांस से आवाज आना'
    ],
    homeCare: [
      'Gargle with warm salt water (1/2 teaspoon salt in a glass of warm water) 4–5 times daily.',
      'Drink warm fluids such as soups, broths, and honey-lemon tea.',
      'Get ample rest and maintain adequate oral hygiene.'
    ],
    homeCareHindi: [
      'दिन में 4-5 बार हल्के गुनगुने नमकीन पानी से गरारे करें।',
      'गर्म तरल पदार्थ (सूप, गुनगुना पानी, शहद-अदरक चाय) पिएं।',
      'पर्याप्त आराम करें।'
    ],
    dos: [
      'Take complete antibiotic course as prescribed by doctor (do not stop early).',
      'Use paracetamol or ibuprofen for fever and throat pain reduction as advised.',
      'Eat soft, non-spicy foods.'
    ],
    dosHindi: [
      'एंटीबायोटिक का पूरा कोर्स खत्म करें (दर्द ठीक होने पर भी बीच में न छोड़ें)।',
      'बुखार और दर्द के लिए डॉक्टर की सलाह से पैरासिटामोल लें।',
      'नरम, सुपाच्य और कम मिर्च-मसाले वाला खाना खाएं।'
    ],
    donts: [
      'Do not consume cold ice creams, carbonated soft drinks, or chilled water.',
      'Avoid fried, crispy, or heavily spiced foods that scratch throat mucosa.',
      'Do not share utensils, cups, or towels during active infection.'
    ],
    dontsHindi: [
      'अत्यधिक ठंडा पानी, आइसक्रीम या कोल्ड ड्रिंक्स न लें।',
      'तले-भुने, कठोर और बहुत मसालेदार भोजन से परहेज करें।',
      'दूसरों के साथ अपने बर्तन और तौलिया शेयर न करें।'
    ],
    medicalOptions: [
      'Oral antibiotics (Penicillin V, Amoxicillin-Clavulanate, or Erythromycin for 7–10 days)',
      'Analgesics and anti-inflammatory throat lozenges',
      'Antiseptic gargles (Povidone-iodine or Chlorhexidine)'
    ],
    medicalOptionsHindi: [
      'एंटीबायोटिक दवाएं (अमोक्सिसिलिन/क्लेवुलैनेट आदि)',
      'दर्द निवारक और गले की गोलियां (लोजेंज)',
      'एंटीसेप्टिक गरारे (पोविडोन आयोडीन)'
    ],
    surgicalOptions: [
      'Tonsillectomy (Surgical removal of tonsils for recurrent infections >7 episodes/year or sleep apnea)'
    ],
    surgicalOptionsHindi: [
      'टॉन्सिलेक्टॉमी (टॉन्सिल को ऑपरेशन द्वारा बाहर निकालने की सर्जरी)'
    ],
    faqs: [
      {
        question: 'When should tonsils be surgically removed?',
        questionHindi: 'टॉन्सिल का ऑपरेशन कब करवाना चाहिए?',
        answer:
          'Tonsillectomy is indicated if you suffer from 7 or more episodes of acute tonsillitis in a year, recurring peritonsillar abscesses, or severe snoring and sleep breathing stoppage.',
        answerHindi:
          'यदि 1 साल में 7 या अधिक बार टॉन्सिल का इन्फेक्शन हो, या सांस लेने में रुकावट और खराटे की गंभीर समस्या हो, तो ऑपरेशन किया जाता है।'
      }
    ]
  },
  {
    id: 'dhingra-mod-8',
    code: 'DHINGRA-THROAT-02',
    title: 'Snoring & Sleep Apnea (खर्राटे और सोते समय सांस रुकना)',
    titleHindi: 'खर्राटे और ऑब्स्ट्रक्टिव स्लीप एपनिया (OSA)',
    subspecialty: 'pharynx',
    chapterNo: 55,
    chapterTitle: 'Snoring and Sleep Apnoea',
    pdfPageRange: 'pp. 328–331',
    icd10Code: 'G47.33',
    snomedCode: '78275009',
    overview:
      'Obstructive Sleep Apnea (OSA) is a sleep disorder characterized by repeated collapse and obstruction of the upper airway during sleep, resulting in breath pauses, oxygen desaturation, and excessive daytime sleepiness.',
    overviewHindi:
      'स्लीप एपनिया (OSA) नींद के दौरान सांस की नली में बार-बार रुकावट आने का विकार है। इससे सोते समय सांस कुछ सेकंड के लिए रुक जाती है और दिन भर थकावट महसूस होती है।',
    simplifiedOverview:
      'When you sleep, your throat muscles relax. If your throat path is too narrow, the air creates loud vibrating noises (snoring) or gets completely blocked.',
    simplifiedOverviewHindi:
      'सोते समय गले की मांसपेशियां ढीली हो जाती हैं। यदि गले का रास्ता संकरा हो, तो हवा टकराकर खर्राटों की आवाज बनाती है और कभी-कभी सांस पूरी तरह रुक जाती है।',
    symptoms: [
      'Loud, chronic snoring interrupted by silent pauses and sudden gasping/choking',
      'Excessive daytime sleepiness (falling asleep while reading, working, or driving)',
      'Waking up with a dry mouth, sore throat, or morning headache',
      'Impaired concentration and mood irritability'
    ],
    symptomsHindi: [
      'तेज खर्राटे जिनके बीच में सांस रुकना और अचानक हांफते हुए जागना',
      'दिन में अत्यधिक नींद और आलस आना (गाड़ी चलाते या काम करते वक्त नींद आना)',
      'सुबह उठने पर मुंह सूखना और सिरदर्द होना',
      'ध्यान लगाने में कठिनाई और चिड़चिड़ापन'
    ],
    redFlags: [
      'Witnessed long pauses in breathing during sleep (>10 seconds)',
      'Uncontrolled high blood pressure (hypertension) despite multiple medications',
      'Falling asleep involuntarily while driving a vehicle'
    ],
    redFlagsHindi: [
      'सोते समय 10 सेकंड से ज्यादा देर तक सांस बंद रहना',
      'दवाइयों के बावजूद बीपी का लगातार बढ़ा रहना',
      'ड्राइविंग के दौरान अचानक नींद के झोंके आना'
    ],
    homeCare: [
      'Achieve weight reduction through healthy diet and daily exercise (reducing neck circumference dramatically improves airway size).',
      'Sleep on your SIDE rather than on your back (positional therapy).',
      'Elevate the head end of your bed by 4–6 inches.'
    ],
    homeCareHindi: [
      'वजन कम करें (गर्दन की चर्बी कम होने से गले की नली खुलती है)।',
      'पीठ के बल लेटने के बजाय करवट लेकर सोएं।',
      'बिस्तर के सिरहाने को थोड़ा ऊंचा रखें।'
    ],
    dos: [
      'Undergo a formal overnight Sleep Study (Polysomnography).',
      'Maintain regular sleeping hours.',
      'Treat co-existing nasal blockage or allergies.'
    ],
    dosHindi: [
      'रात की नींद की जांच (पॉलीसम्नोग्राफी / स्लीप स्टडी) करवाएं।',
      'सोने का समय नियमित रखें।',
      'नाक की एलर्जी या रुकावट का इलाज कराएं।'
    ],
    donts: [
      'DO NOT consume alcohol or sedatives/sleeping pills within 4 hours of bedtime.',
      'Avoid heavy meals right before sleeping.',
      'Do not ignore daytime drowsiness.'
    ],
    dontsHindi: [
      'सोने से 4 घंटे पहले शराब या नींद की गोलियों का सेवन बिल्कुल न करें।',
      'रात को भारी भोजन करके तुरंत न सोएं।',
      'दिन की सुस्ती को नजरअंदाज न करें।'
    ],
    medicalOptions: [
      'CPAP (Continuous Positive Airway Pressure) therapy mask during sleep',
      'Mandibular Advancement Oral Appliances (MAD) fitted by dental specialists'
    ],
    medicalOptionsHindi: [
      'CPAP मशीन (सोते समय मास्क द्वारा सांस का दबाव बनाए रखने वाली मशीन)',
      'डेंटल ओरल एप्लायंस (जबड़े को आगे रखने वाला क्लिप)'
    ],
    surgicalOptions: [
      'UPPP (Uvulopalatopharyngoplasty) or Coblation Palatoplasty',
      'Adenotonsillectomy (in pediatric patients with enlarged tonsils/adenoids causing OSA)'
    ],
    surgicalOptionsHindi: [
      'UPPP या कोबलेशन पैलेटोप्लास्टी (गले और तालु के अतिरिक्त मांस को हटाने का ऑपरेशन)',
      'बच्चों में बड़े टॉन्सिल और एडेनॉइड्स का ऑपरेशन'
    ],
    faqs: [
      {
        question: 'Are snoring and sleep apnea the same thing?',
        questionHindi: 'क्या खर्राटे और स्लीप एपनिया एक ही बात हैं?',
        answer:
          'No. Simple snoring is sound created by vibrating soft tissues. Sleep apnea is a dangerous medical condition where the airway completely collapses, depriving your brain and heart of oxygen.',
        answerHindi:
          'नहीं, केवल खर्राटे आना हवा की रगड़ से होने वाली आवाज है। जबकि स्लीप एपनिया में सांस रुक जाती है, जो दिल और दिमाग के लिए खतरनाक है।'
      }
    ]
  },
  {
    id: 'dhingra-mod-9',
    code: 'DHINGRA-VOICE-01',
    title: 'Laryngitis & Voice Rest (आवाज बैठना और गले की देखभाल)',
    titleHindi: 'लैरिंगाइटिस (आवाज बैठना / होर्सनेस)',
    subspecialty: 'laryngology',
    chapterNo: 58,
    chapterTitle: 'Acute and Chronic Inflammations of Larynx',
    pdfPageRange: 'pp. 342–347',
    icd10Code: 'J37.0',
    snomedCode: '398246009',
    overview:
      'Laryngitis is an inflammation of the vocal cords in the larynx, leading to voice change (hoarseness), weak voice, dry cough, and throat irritation. It is commonly caused by viral infections, vocal overuse, or laryngopharyngeal reflux (LPR).',
    overviewHindi:
      'लैरिंगाइटिस स्वर यंत्र (वोकल कॉर्ड्स) की सूजन है, जिससे आवाज बैठ जाती है, भारी हो जाती है या पूरी तरह निकलना बंद हो जाती है।',
    simplifiedOverview:
      'Your vocal cords are like delicate guitar strings inside your voice box. When swollen from overuse or a cold, they cannot vibrate properly, making your voice sound rough.',
    simplifiedOverviewHindi:
      'आपकी वोकल कॉर्ड्स गले के अंदर गिटार के तारों की तरह होती हैं। जब वे सूज जाती हैं, तो आवाज भारी हो जाती है या बैठ जाती है।',
    symptoms: [
      'Hoarseness, raspy voice, or complete loss of voice (aphonia)',
      'Tickling sensation and raw feeling in the throat',
      'Dry irritating cough',
      'Constant urge to clear the throat'
    ],
    symptomsHindi: [
      'आवाज बैठना, भारी होना या बिल्कुल न निकलना',
      'गले में खराश और सरसराहट',
      'सूखी खांसी',
      'बार-बार खंखारने या गला साफ करने की इच्छा होना'
    ],
    redFlags: [
      'Hoarseness lasting LONGER than 3 weeks (requires urgent fiberoptic laryngoscopy to rule out vocal cord lesions/cancer)',
      'Coughing up blood (hemoptysis)',
      'Difficulty swallowing or shortness of breath'
    ],
    redFlagsHindi: [
      'आवाज का 3 हफ्ते से ज्यादा समय तक बैठे रहना (कैंसर या गांठ की जांच के लिए दूरबीन से जांच जरूरी है)',
      'खांसी में खून आना',
      'सांस लेने में दिक्कत या खाना निगलने में दर्द होना'
    ],
    homeCare: [
      'ABSOLUTE VOICE REST: Speak as little as possible. Avoid whispering (whispering strains vocal cords more than quiet normal speech!).',
      'Steam inhalation twice daily without adding strong aromatic additives.',
      'Sip warm water continuously throughout the day to keep vocal folds hydrated.'
    ],
    homeCareHindi: [
      'आवाज को पूरा आराम दें: कम से कम बोलें। फुसफुसाकर भी न बोलें (फुसफुसाने से गले पर ज्यादा दबाव पड़ता है!)।',
      'दिन में 2 बार सादे पानी की भाप (स्टीम) लें।',
      'दिन भर गुनगुना पानी पीते रहें।'
    ],
    dos: [
      'Use a room humidifier to maintain moisture in dry air.',
      'Manage acid reflux with dietary modifications (avoid late dinner).',
      'Practice soft vocal hygiene.'
    ],
    dosHindi: [
      'कमरे में नमी बनाकर रखें।',
      'एसिडिटी का इलाज करें (रात का खाना सोने से 3 घंटे पहले खाएं)।',
      'गले को नमीयुक्त रखें।'
    ],
    donts: [
      'DO NOT WHISPER (whispering causes severe muscle tension dysphonia).',
      'Do not clear your throat forcefully (throat clearing snaps vocal cords together violentely).',
      'Avoid smoking, alcohol, and caffeine.'
    ],
    dontsHindi: [
      'फुसफुसाकर बात न करें।',
      'जोर से गला न खंखारे (बार-बार खंखारने से वोकल कॉर्ड्स टकराकर छिल जाती हैं)।',
      'सिगरेट, शराब और ज्यादा चाय-कॉफी से दूर रहें।'
    ],
    medicalOptions: [
      'Proton Pump Inhibitors (e.g. Pantoprazole) for reflux laryngitis',
      'Short-term voice therapy by a speech pathologist',
      'Steroid anti-inflammatory therapy for acute professional voice users under strict medical guidance'
    ],
    medicalOptionsHindi: [
      'एसिडिटी रोधी दवाएं (पेंटोप्राजोल)',
      'स्पीच थेरेपी (आवाज सुधारने की एक्सरसाइज)',
      'सूजन कम करने की दवाएं'
    ],
    surgicalOptions: [
      'Microlaryngeal Surgery (MLS) for excision of vocal polyps, nodules, or cysts if medical management fails'
    ],
    surgicalOptionsHindi: [
      'माइक्रो-लैरिंगियल सर्जरी (दूरबीन से वोकल कॉर्ड्स की गांठ का ऑपरेशन)'
    ],
    faqs: [
      {
        question: 'Why is whispering bad for hoarseness?',
        questionHindi: 'आवाज बैठने पर फुसफुसाना नुकसानदायक क्यों है?',
        answer:
          'Whispering squeezes the vocal folds tightly together under high muscular strain, worsening inflammation and delaying vocal recovery.',
        answerHindi:
          'फुसफुसाते समय वोकल कॉर्ड्स पर ज्यादा खिंचाव और दबाव पड़ता है, जिससे सूजन बढ़ सकती है।'
      }
    ]
  },
  {
    id: 'dhingra-mod-10',
    code: 'DHINGRA-EMERGENCY-01',
    title: 'Tracheostomy Care & Emergency Stoma Management (ट्रैकियोस्टॉमी देखभाल)',
    titleHindi: 'ट्रैकियोस्टॉमी ट्यूब की देखभाल और आपातकालीन निर्देश',
    subspecialty: 'procedures',
    chapterNo: 64,
    chapterTitle: 'Tracheostomy and Other Procedures for Airway Management',
    pdfPageRange: 'pp. 374–379',
    icd10Code: 'Z93.0',
    snomedCode: '118836005',
    overview:
      'A tracheostomy is a surgically created opening (stoma) in the anterior wall of the trachea (windpipe) to provide an alternative breathing pathway, bypass upper airway obstruction, or assist long-term mechanical ventilation.',
    overviewHindi:
      'ट्रैकियोस्टॉमी सांस की नली (ट्रेकिया) में बनाया गया एक सुराख है, जिससे सांस लेने के लिए ट्यूब डाली जाती है। यह ऊपरी गले में रुकावट होने पर जीवन रक्षक प्रक्रिया है।',
    simplifiedOverview:
      'A tracheostomy is a special tube in the front of your neck that helps you breathe safely directly into your lungs when your upper throat is blocked.',
    simplifiedOverviewHindi:
      'ट्रैकियोस्टॉमी आपकी गर्दन के सामने एक विशेष सांस की ट्यूब होती है, जिससे हवा सीधे फेफड़ों में जाती है जब गले का ऊपरी रास्ता बंद हो।',
    symptoms: [
      'Presence of a tracheostomy tube in the lower neck',
      'Increased tracheal secretions requiring suctioning',
      'Inability to speak clearly without occluding the tube opening or using a speaking valve'
    ],
    symptomsHindi: [
      'गर्दन में सांस की ट्यूब होना',
      'ट्यूब में बलगम जमा होना जिसके लिए सक्शन की जरूरत हो',
      'ट्यूब बंद किए बिना आवाज न निकलना'
    ],
    redFlags: [
      'Accidental tube decannulation (tube falls out of neck stoma)',
      'Complete obstruction of tube by mucus plug causing respiratory distress (blue lips, gasping)',
      'Brisk bright red bleeding from around the stoma site'
    ],
    redFlagsHindi: [
      'ट्रैकियोस्टॉमी ट्यूब का गर्दन से बाहर निकल जाना',
      'गाढ़े बलगम के कारण ट्यूब का पूरी तरह बंद होना और सांस रुकने लगना',
      'ट्यूब के आस-पास से अचानक तेज खून बहना'
    ],
    homeCare: [
      'Clean the inner cannula of the tube 3–4 times daily using normal saline or hydrogen peroxide solution.',
      'Suction secretions gently using a sterile suction catheter when rattling sounds are heard.',
      'Keep the skin around the stoma clean and dry with a pre-cut sterile gauze dressing.'
    ],
    homeCareHindi: [
      'अंदरूनी ट्यूब (इनर कैनुला) को दिन में 3-4 बार निकालकर गुनगुने सेलाइन पानी से साफ करें।',
      'गड़गड़ाहट की आवाज आने पर सक्शन कैथेटर से बलगम निकालें।',
      'ट्यूब के आस-पास की त्वचा को सूखा और साफ रखें।'
    ],
    dos: [
      'Keep a spare tracheostomy tube of the same size and one size smaller at the bedside at all times.',
      'Cover the tube opening loosely with a damp gauze bib to humidify inhaled air.',
      'Maintain strict sterile hygiene during suctioning.'
    ],
    dosHindi: [
      'एक जैसी साइज की दूसरी स्पेयर ट्यूब और सक्शन मशीन हमेशा बेड के पास रखें।',
      'सांस लेने वाली हवा की नमी बनाए रखने के लिए ट्यूब के आगे हल्की गीली जाली ढककर रखें।',
      'सक्शन करते समय हाथों और नली की सफाई का ध्यान रखें।'
    ],
    donts: [
      'NEVER submerge in water (swimming or bathing without protecting the stoma can cause fatal drowning!).',
      'Do not cut gauze dressings (loose threads can be inhaled into the windpipe).',
      'Avoid dusty environments or aerosol sprays.'
    ],
    dontsHindi: [
      'पानी में बिल्कुल न डूबें (बिना सुरक्षा के नहाने या तैरने पर पानी सीधे फेफड़ों में चला जाएगा)।',
      'पट्टी को काटकर न लगाएं (धागे फेफड़े में जा सकते हैं)।',
      'धूल-मिट्टी और स्प्रे से दूर रहें।'
    ],
    medicalOptions: [
      'Regular humidification with saline nebulization',
      'Tracheostomy tube exchanges by medical staff every 2–4 weeks'
    ],
    medicalOptionsHindi: [
      'सेलाइन नेबुलाइजेशन (नेबुलाइजर से भाप देना)',
      'हर 2-4 हफ्ते में डॉक्टर द्वारा ट्यूब बदलवाना'
    ],
    surgicalOptions: [
      'Surgical Decannulation (stoma closure once natural upper airway is fully restored)'
    ],
    surgicalOptionsHindi: [
      'डिकैनुलेशन (सांस का प्राकृतिक रास्ता ठीक होने पर ट्यूब निकालना और सुराख बंद करना)'
    ],
    faqs: [
      {
        question: 'What should I do immediately if the tube falls out?',
        questionHindi: 'यदि गलती से ट्यूब बाहर निकल जाए तो तुरंत क्या करें?',
        answer:
          'Stay calm. Call emergency medical help immediately. Insert the spare tube or tracheal dilator gently into the stoma track if trained, or keep the stoma open and perform bag-valve mask ventilation if necessary.',
        answerHindi:
          'घबराएं नहीं। तुरंत डॉक्टर या आपातकालीन टीम को बुलाएं। यदि ट्रेनिंग ली है तो स्पेयर ट्यूब सुराख में डालें।'
      }
    ]
  },
  {
    id: 'dhingra-mod-11',
    code: 'DHINGRA-HEADNECK-01',
    title: 'Thyroid Disorders & Neck Swellings (थायराइड और गर्दन की गांठ)',
    titleHindi: 'थायराइड ग्रंथि और गर्दन की गांठें',
    subspecialty: 'head_neck',
    chapterNo: 66,
    chapterTitle: 'Thyroid Gland and Its Disorders',
    pdfPageRange: 'pp. 386–397',
    icd10Code: 'E07.9',
    snomedCode: '14304000',
    overview:
      'Thyroid swellings (goiter/nodules) involve abnormal enlargement of the thyroid gland situated in the lower front of the neck. They can be multinodular, solitary nodules, or associated with altered thyroid hormone function.',
    overviewHindi:
      'थायराइड विकार या गर्दन के निचले हिस्से में सूजन (घेंघा/गांठ) थायराइड ग्रंथि के बढ़ने से होती है। यह हार्मोन असंतुलन या गांठों की वजह से हो सकता है।',
    simplifiedOverview:
      'The thyroid is a butterfly-shaped gland at the base of your neck. It controls your body’s metabolism. Enlargement creates a visible lump in the front of your neck.',
    simplifiedOverviewHindi:
      'थायराइड गर्दन के निचले हिस्से में तितली के आकार की ग्रंथि है। जब यह बढ़ जाती है, तो गर्दन के सामने एक गांठ या उभार दिखाई देता है।',
    symptoms: [
      'Visible swelling or lump in the lower front of the neck that moves UP and DOWN when swallowing',
      'Pressure sensation in lower throat',
      'Hypothyroid symptoms (weight gain, fatigue, cold intolerance, constipation) OR Hyperthyroid symptoms (weight loss, tremors, rapid heart rate, heat intolerance)'
    ],
    symptomsHindi: [
      'गर्दन के निचले हिस्से में गांठ जो थूक निगलने पर ऊपर-नीचे हिलती हो',
      'गले में दबाव महसूस होना',
      'थकान, वजन बढ़ना, ठंड लगना (हाइपोथायरायडिज्म) अथवा वजन घटना, घबराहट और धड़कन तेज होना (हाइपरथायरायडिज्म)'
    ],
    redFlags: [
      'Rapidly enlarging hard fixed neck nodule',
      'Hoarseness of voice due to recurrent laryngeal nerve involvement',
      'Dysphagia (difficulty swallowing) or stridor (noisy breathing)'
    ],
    redFlagsHindi: [
      'गांठ का बहुत तेजी से बढ़ना और कठोर हो जाना',
      'आवाज का बैठ जाना (नस दबने का संकेत)',
      'सांस लेने में रुकावट या खाना निगलने में तेज दर्द'
    ],
    homeCare: [
      'Ensure adequate dietary iodine intake (use iodized salt).',
      'Take prescribed thyroid hormone supplements (Levothyroxine) early in the morning on an empty stomach with water, at least 30–60 minutes before breakfast.',
      'Regular self-palpation of neck swellings.'
    ],
    homeCareHindi: [
      'आयोडीन युक्त नमक का इस्तेमाल करें।',
      'थायराइड की गोली (लेवोथायरोक्सिन) रोज सुबह खाली पेट एक गिलास पानी के साथ लें (नाश्ते से 45 मिनट पहले)।',
      'गांठ के आकार पर नजर रखें।'
    ],
    dos: [
      'Undergo Thyroid Function Tests (T3, T4, TSH) and Neck Ultrasound (USG).',
      'Perform FNAC (Fine Needle Aspiration Cytology) test to confirm whether a nodule is benign or malignant.',
      'Follow up regularly with your ENT / Endocrine surgeon.'
    ],
    dosHindi: [
      'खून की जांच (T3, T4, TSH) और गर्दन का अल्ट्रासाउंड करवाएं।',
      'गांठ की सुई वाली जांच (FNAC) जरूर करवाएं।',
      'डॉक्टर से नियमित परामर्श लें।'
    ],
    donts: [
      'Do not take calcium or iron supplements at the same time as thyroid hormone medicine (leave a 4-hour gap).',
      'Avoid unverified herbal remedies claiming instant thyroid cure.',
      'Do not ignore sudden change in voice or rapid nodule growth.'
    ],
    dontsHindi: [
      'थायराइड की दवा के साथ तुरंत कैल्शियम या आयरन की गोली न लें (कम से कम 4 घंटे का अंतर रखें)।',
      'बिना प्रमाणित हर्बल दावों के चक्कर में अपनी दवा बंद न करें।',
      'आवाज में अचानक बदलाव को नजरअंदाज न करें।'
    ],
    medicalOptions: [
      'Thyroid hormone replacement (Levothyroxine) for hypothyroidism',
      'Anti-thyroid medications (Carbimazole/Methimazole) or Radioactive Iodine (RAI) for hyperthyroidism'
    ],
    medicalOptionsHindi: [
      'लेवोथायरोक्सिन गोलियां (हाइपोथायरायडिज्म के लिए)',
      'कार्बीमाजोल या रेडियोएक्टिव आयोडीन थेरेपी (हाइपरथायरायडिज्म के लिए)'
    ],
    surgicalOptions: [
      'Hemithyroidectomy / Total Thyroidectomy (Surgical excision of half or full thyroid gland for large goiters or thyroid cancer)'
    ],
    surgicalOptionsHindi: [
      'थायराइडेक्टॉमी (ऑपरेशन द्वारा थायराइड ग्रंथि या गांठ को निकालना)'
    ],
    faqs: [
      {
        question: 'Why does a thyroid swelling move when I swallow?',
        questionHindi: 'निगलने पर थायराइड की गांठ ऊपर-नीचे क्यों हिलती है?',
        answer:
          'The thyroid gland is enclosed within pretracheal fascia attached to the larynx and trachea. When swallowing, the larynx moves upward, carrying the thyroid with it.',
        answerHindi:
          'थायराइड ग्रंथि सांस की नली और गले से जुड़ी होती है। जब हम थूक निगलते हैं, तो गला ऊपर उठता है और गांठ भी हिलती है।'
      }
    ]
  },
  {
    id: 'dhingra-mod-12',
    code: 'DHINGRA-EAR-04',
    title: 'Otosclerosis & Conductive Hearing Loss (कान का बहरापन)',
    titleHindi: 'ऑटोस्क्लेरोसिस और सुनने की क्षमता कम होना',
    subspecialty: 'otology',
    chapterNo: 13,
    chapterTitle: 'Otosclerosis (Syn. Otospongiosis)',
    pdfPageRange: 'pp. 110–113',
    icd10Code: 'H80.9',
    snomedCode: '37419003',
    overview:
      'Otosclerosis is a localized disease of the otic capsule where abnormal spongy bone replaces normal dense bone, causing fixation of the stapes footplate and slowly progressive conductive hearing loss.',
    overviewHindi:
      'ऑटोस्क्लेरोसिस कान की हड्डियों का एक विकार है जिसमें कान की सबसे छोटी हड्डी (स्टेप्स) अपनी जगह पर फिक्स हो जाती है, जिससे धीरे-धीरे सुनाई देना कम हो जाता है।',
    simplifiedOverview:
      'Inside your ear are three tiny bones that vibrate to convey sound. In otosclerosis, the smallest bone gets jammed and stops vibrating.',
    simplifiedOverviewHindi:
      'कान के अंदर तीन छोटी हड्डियां होती हैं जो आवाज के कंपन को अंदर पहुंचाती हैं। इस बीमारी में सबसे छोटी हड्डी जाम हो जाती है और कंपन रुक जाता है।',
    symptoms: [
      'Painless, gradually progressive hearing loss (usually starting in young adulthood)',
      'Paracusis Willisii: Patient hears BETTER in noisy surroundings',
      'Tinnitus (ringing in ear)',
      'Monotone or soft speaking voice'
    ],
    symptomsHindi: [
      'बिना किसी दर्द के धीरे-धीरे सुनाई देना कम होना',
      'शोरगुल वाले माहौल में बेहतर सुनाई देना (पैराक्यूसिस विलिसिई)',
      'कान में सीटी या घंटी की आवाज',
      'मरीज खुद बहुत धीमी आवाज में बात करता है'
    ],
    redFlags: [
      'Rapidly worsening hearing loss accompanied by severe dizziness',
      'Sudden profound sensorineural hearing drop'
    ],
    redFlagsHindi: [
      'चक्कर आने के साथ सुनने की क्षमता का तेजी से गिरना',
      'अचानक पूरा बहरापन होना'
    ],
    homeCare: [
      'Get a comprehensive Pure Tone Audiometry (PTA) test and Impedance Audiometry (Tympanogram) to evaluate hearing.',
      'Protect your ears from high sound volume exposure.'
    ],
    homeCareHindi: [
      'कान की विस्तृत जांच (आडियोग्राम और टिम्पेनोग्राम) करवाएं।',
      'तेज शोर से बचें।'
    ],
    dos: [
      'Discuss surgical restoration options vs Digital Hearing Aid use with your Otologist.',
      'Inform your doctor if female family members experienced hearing drop during pregnancy.'
    ],
    dosHindi: [
      'ऑपरेशन (स्टेपेडेक्टॉमी) या हियरिंग एड के विकल्पों पर डॉक्टर से चर्चा करें।',
      'पारिवारिक इतिहास की जानकारी डॉक्टर को दें।'
    ],
    donts: [
      'Do not insert ear cleaning instruments.',
      'Do not delay diagnostic audiometry.'
    ],
    dontsHindi: [
      'कान में कोई चीज न डालें।',
      'जांच कराने में देरी न करें।'
    ],
    medicalOptions: [
      'Sodium Fluoride therapy (in active spongiotic phase)',
      'Digital Hearing Aid fitting for patients not opting for surgery'
    ],
    medicalOptionsHindi: [
      'सोडियम फ्लोराइड गोलियां (प्रारंभिक अवस्था में)',
      'डिजिटल हियरिंग एड (सुनने की मशीन) लगाना'
    ],
    surgicalOptions: [
      'Stapedotomy / Stapedectomy (Replacing the fixed stapes bone with a micro-piston prosthesis)'
    ],
    surgicalOptionsHindi: [
      'स्टेपेडोटॉमी (सूक्ष्म पिस्टन डालकर कान की जाम हड्डी को बदलने का ऑपरेशन)'
    ],
    faqs: [
      {
        question: 'Why do patients with otosclerosis hear better in noisy places?',
        questionHindi: 'ऑटोस्क्लेरोसिस के मरीज शोर में बेहतर क्यों सुन पाते हैं?',
        answer:
          'In noisy places, people speak louder. Because the patient’s inner ear is normal and only the bone conduction pathway works, the patient hears loud speech clearly over background noise.',
        answerHindi:
          'शोरगुल में लोग तेज बोलते हैं, और मरीज के अंदर का कान ठीक होने की वजह से वह तेज आवाज को आसानी से सुन लेता है।'
      }
    ]
  }
];
