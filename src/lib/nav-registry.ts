import {
  Compass, ClipboardList, Activity, ClipboardCheck, Users, BookOpenText,
  LifeBuoy, Podcast, Download, ShieldAlert, Award, ShieldCheck,
  Stethoscope, FileText, BarChart3, Building2, RotateCcw, Wind, Ear, AudioWaveform, Eye, Mic,
} from 'lucide-react';

export interface NavItem {
  href: string;
  label: string;
  labelHi: string;
  description: string;
  descriptionHi: string;
  icon: typeof Compass;
  keywords?: string;
  tone?: 'default' | 'urgent';
}

export interface NavGroup {
  id: string;
  title: string;
  titleHi: string;
  items: NavItem[];
}

export const navGroups: NavGroup[] = [
  {
    id: 'overview',
    title: 'Overview',
    titleHi: 'अवलोकन',
    items: [
      {
        href: '/',
        label: 'Welcome',
        labelHi: 'स्वागत',
        description: 'Your care summary at a glance',
        descriptionHi: 'आपकी देखभाल का सारांश',
        icon: Compass,
        keywords: 'home dashboard start',
      },
    ],
  },
  {
    id: 'my-care',
    title: 'My Care & Rehab',
    titleHi: 'मेरी देखभाल और पुनर्वास',
    items: [
      {
        href: '/care-plan',
        label: 'Care Plan',
        labelHi: 'देखभाल योजना',
        description: 'Prescribed recovery pathway & videos',
        descriptionHi: 'निर्धारित रिकवरी पथ और वीडियो',
        icon: ClipboardList,
        keywords: 'tympanoplasty surgery recovery pathway carePlan',
      },
      {
        href: '/symptom-log',
        label: 'Symptom Log',
        labelHi: 'लक्षण लॉग',
        description: 'Track daily pain, hearing & healing',
        descriptionHi: 'दैनिक दर्द और सुनने की स्थिति दर्ज करें',
        icon: Activity,
        keywords: 'pain diary tracker log symptoms',
      },
      {
        href: '/rehab/vestibular',
        label: 'Vestibular Rehab',
        labelHi: 'वेस्टिबुलर पुनर्वास',
        description: 'Camera gaze-stabilisation coach, timed Epley & Brandt-Daroff, balance drills, DHI-25',
        descriptionHi: 'कैमरा गेज़-स्टेबिलाइजेशन कोच, समयबद्ध एपली व ब्रांट-डैरोफ, संतुलन अभ्यास, DHI-25',
        icon: RotateCcw,
        keywords: 'vertigo epley brandt daroff bppv balance dizziness gaze stabilisation vor habituation dhi handicap inventory mediapipe pose neck landmark motion tracking camera coach',
      },
      {
        href: '/rehab/vestibular/analytics',
        label: 'Gaze Analytics Engine',
        labelHi: 'गेज़ एनालिटिक्स इंजन',
        description: 'AI iris tracking · VOR gain · fixation & saccade analysis · nystagmus heuristic',
        descriptionHi: 'AI आईरिस ट्रैकिंग · VOR लाभ · फिक्सेशन और सैकेड विश्लेषण · निस्टैगमस',
        icon: Eye,
        keywords: 'gaze eye tracking iris vor saccade fixation nystagmus analytics vestibular rehab ai engine',
      },
      {
        href: '/rehab/sinus',
        label: 'Sinus Irrigation',
        labelHi: 'साइनस धुलाई सहायक',
        description: 'Saline rinse timer & spray coach',
        descriptionHi: 'नेज़ल सेलाइन रिंस टाइमर और स्प्रे गाइड',
        icon: Wind,
        keywords: 'sinus rinse saline irrigation snot spray fess',
      },
      {
        href: '/rehab/otology',
        label: 'Ear Precaution Tracker',
        labelHi: 'कान सुरक्षा ट्रैकर',
        description: 'Water protection & post-op milestones',
        descriptionHi: 'पानी से सुरक्षा और कान की देखभाल',
        icon: Ear,
        keywords: 'ear pack water precaution tympanoplasty audiogram otology',
      },
      {
        href: '/rehab/tinnitus',
        label: 'Tinnitus Relief',
        labelHi: 'टिनिटस राहत',
        description: 'Pitch match & ACRN sound therapy player',
        descriptionHi: 'पिच मिलान और ACRN साउंड थेरेपी',
        icon: AudioWaveform,
        keywords: 'tinnitus ringing acrn masking notched sound therapy pitch match thi loudness habituation trt',
      },
      {
        href: '/rehab/voice',
        label: 'Voice Recovery',
        labelHi: 'स्वर सुधार',
        description: 'Post-op voice & swallowing tracking',
        descriptionHi: 'ऑपरेशन के बाद आवाज़ और निगलने की निगरानी',
        icon: Mic,
        keywords: 'voice hoarse dysphonia laryngeal larynx cordectomy laryngectomy phonation mpt cpps ddk vhi vhi-10 eat-10 swallow dysphagia speech chemoradiation stridor',
      },
      {
        href: '/self-assessment',
        label: 'Self-Assessment',
        labelHi: 'स्व-मूल्यांकन',
        description: 'Guided hearing, vertigo & sinus checks',
        descriptionHi: 'श्रवण, चक्कर और साइनस जांच',
        icon: ClipboardCheck,
        keywords: 'quiz screening test forms vertigo hearing sinus',
      },
      {
        href: '/decisions',
        label: 'Decision Aids',
        labelHi: 'निर्णय सहायता',
        description: 'Compare options with real numbers',
        descriptionHi: 'वास्तविक आंकड़ों के साथ विकल्पों की तुलना',
        icon: Users,
        keywords: 'shared decision making cochlear implant hearing aid',
      },
    ],
  },
  {
    id: 'learn',
    title: 'Learn',
    titleHi: 'सीखें',
    items: [
      {
        href: '/guides',
        label: 'Recovery Guides',
        labelHi: 'रिकवरी गाइड',
        description: 'Step-by-step how-to skill guides',
        descriptionHi: 'चरण-दर-चरण कौशल गाइड',
        icon: BookOpenText,
        keywords: 'skills library how to guide',
      },
      {
        href: '/troubleshooting',
        label: 'Troubleshooting',
        labelHi: 'समस्या निवारण',
        description: 'What to do when something feels wrong',
        descriptionHi: 'कुछ गलत महसूस होने पर क्या करें',
        icon: LifeBuoy,
        keywords: 'faq problems help issues fix',
      },
      {
        href: '/podcasts',
        label: 'Podcast',
        labelHi: 'पॉडकास्ट',
        description: 'Listen to ENT care episodes',
        descriptionHi: 'ईएनटी देखभाल एपिसोड सुनें',
        icon: Podcast,
        keywords: 'audio episodes listen',
      },
      {
        href: '/downloads',
        label: 'Downloads',
        labelHi: 'डाउनलोड',
        description: 'Instruction sheets & printable cards',
        descriptionHi: 'निर्देश पत्रक और प्रिंट करने योग्य कार्ड',
        icon: Download,
        keywords: 'pdf files documents print',
      },
    ],
  },
  {
    id: 'support',
    title: 'Support & Hospital Services',
    titleHi: 'सहायता और अस्पताल सेवाएं',
    items: [
      {
        href: '/emergency',
        label: 'Emergency Card',
        labelHi: 'आपातकालीन कार्ड',
        description: 'Neck-breather & stoma wallet card',
        descriptionHi: 'गर्दन-श्वासी और स्टोमा कार्ड',
        icon: ShieldAlert,
        keywords: 'stoma tracheostomy laryngectomy sos red flags',
        tone: 'urgent',
      },
      {
        href: '/schemes',
        label: 'Command Hospital Care',
        labelHi: 'कमांड अस्पताल सेवाएं',
        description: 'Tue/Fri OPDs, OT Roster, Facilities & OPD Token Portal',
        descriptionHi: 'मंगलवार/शुक्रवार ओपीडी, ओटी रोस्टर व टोकन पोर्टल',
        icon: Building2,
        keywords: 'command hospital afms echs opd tuesday friday ot schedule appointment booking token portal facilities',
      },
      {
        href: '/consent',
        label: 'Consent & Risk',
        labelHi: 'सहमति और जोखिम',
        description: 'Numeric, audited risk disclosures',
        descriptionHi: 'संख्यात्मक, ऑडिट किए गए जोखिम प्रकटीकरण',
        icon: ShieldCheck,
        keywords: 'consent surgery risk disclosure',
      },
    ],
  },
];

export const clinicianGroup: NavGroup = {
  id: 'clinician',
  title: 'Clinician Tools',
  titleHi: 'चिकित्सक उपकरण',
  items: [
    {
      href: '/clinician/analytics',
      label: 'Department Analytics',
      labelHi: 'विभाग विश्लेषण (QI)',
      description: 'SNOT-22 trends & quiz pass rates',
      descriptionHi: 'साइनस रुझान और क्विज़ दरें',
      icon: BarChart3,
      keywords: 'analytics proms snot22 qi quality improvement trends',
    },
    {
      href: '/clinician/his-embed',
      label: 'HIS Embed',
      labelHi: 'एचआईएस एम्बेड',
      description: 'Order entry & embargo controls',
      descriptionHi: 'ऑर्डर एंट्री और एम्बार्गो नियंत्रण',
      icon: Stethoscope,
      keywords: 'prescribe practitioner order embargo',
    },
    {
      href: '/clinician/author-studio',
      label: 'Author Studio',
      labelHi: 'ऑथर स्टूडियो',
      description: 'SNOMED/ICD-coded topic authoring',
      descriptionHi: 'स्नोमेड/आईसीडी-कोडेड विषय लेखन',
      icon: FileText,
      keywords: 'snomed icd publish gate topics',
    },
  ],
};

export const allNavItems: NavItem[] = [...navGroups.flatMap((g) => g.items), ...clinicianGroup.items];
