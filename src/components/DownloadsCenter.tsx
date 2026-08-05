'use client';

import React, { useState } from 'react';
import { Download, FileText, ShieldAlert, Wind, Clipboard, Award, Activity, Eye, Printer, Copy, Check, X, Search, Smartphone, ExternalLink } from 'lucide-react';
import { useAppData } from '@/lib/app-data-context';

interface DownloadItem {
  id: string;
  title: string;
  titleHi: string;
  category: string;
  categoryHi: string;
  icon: typeof FileText;
  body: string[];
  bodyHi: string[];
  formatTag?: string;
}

const ITEMS: DownloadItem[] = [
  {
    id: 'water-precautions',
    title: 'Tympanoplasty Water Precaution Instructions',
    titleHi: 'टिमपैनोप्लास्टी जल सावधानी निर्देश',
    category: 'Care Plan',
    categoryHi: 'देखभाल योजना',
    icon: FileText,
    formatTag: 'Printable Card • 2 KB',
    body: [
      '6-Week Water Precaution Rules',
      '1. Never let water enter your operated ear for 6 weeks.',
      '2. Use a Vaseline-coated cotton plug in the outer ear while bathing.',
      '3. Avoid swimming and hair washing without ear protection.',
      '4. Report any discharge, pain, or fever immediately.',
    ],
    bodyHi: [
      '6 सप्ताह जल सावधानी नियम',
      '1. 6 सप्ताह तक ऑपरेशन वाले कान में पानी न जाने दें।',
      '2. नहाते समय बाहरी कान में वैसलीन लगी रुई का प्रयोग करें।',
      '3. कान की सुरक्षा के बिना तैराकी और बाल धोने से बचें।',
      '4. किसी भी स्राव, दर्द या बुखार की तुरंत सूचना दें।',
    ],
  },
  {
    id: 'npo-chart',
    title: 'Pre-Op NPO Fasting Chart',
    titleHi: 'सर्जरी-पूर्व एनपीओ उपवास चार्ट',
    category: 'Care Plan',
    categoryHi: 'देखभाल योजना',
    icon: Clipboard,
    formatTag: 'Clinical Chart • 3 KB',
    body: [
      'Pre-Operative Fasting Guide',
      'No solid food: 8 hours before surgery time.',
      'No water or liquids: 2 hours before surgery time.',
      'Take only prescribed medicines with a small sip of water if instructed.',
    ],
    bodyHi: [
      'सर्जरी-पूर्व उपवास गाइड',
      'कोई ठोस भोजन नहीं: सर्जरी समय से 8 घंटे पहले।',
      'कोई पानी या तरल पदार्थ नहीं: सर्जरी समय से 2 घंटे पहले।',
      'निर्देशानुसार केवल थोड़े पानी के साथ निर्धारित दवाएं लें।',
    ],
  },
  {
    id: 'sinus-douching',
    title: 'Sinus Douching Step-by-Step Guide',
    titleHi: 'साइनस डूशिंग चरण-दर-चरण गाइड',
    category: 'Recovery Guides',
    categoryHi: 'रिकवरी गाइड',
    icon: Wind,
    formatTag: 'Guide Sheet • 4 KB',
    body: [
      'Saline Sinus Douching — Step by Step',
      '1. Prepare isotonic saline solution as instructed by your surgeon.',
      '2. Lean over a sink, tilt head to one side.',
      '3. Gently irrigate one nostril, letting solution flow out the other.',
      '4. Repeat 2–3 times daily, or as prescribed.',
    ],
    bodyHi: [
      'सलाइन साइनस डूशिंग — चरण दर चरण',
      '1. सर्जन के निर्देशानुसार आइसोटोनिक सलाइन घोल तैयार करें।',
      '2. सिंक के ऊपर झुकें, सिर को एक तरफ झुकाएं।',
      '3. एक नथुने को धीरे से सिंचित करें, घोल को दूसरे से बाहर निकलने दें।',
      '4. दिन में 2–3 बार दोहराएं, या निर्धारित अनुसार।',
    ],
  },
  {
    id: 'emergency-card',
    title: 'Emergency Wallet Card (Neck Breather)',
    titleHi: 'आपातकालीन वॉलेट कार्ड (गर्दन-श्वासी)',
    category: 'Emergency',
    categoryHi: 'आपातकाल',
    icon: ShieldAlert,
    formatTag: 'Wallet Card • Urgent',
    body: [
      'NECK BREATHER — I BREATHE THROUGH A STOMA, NOT MY NOSE OR MOUTH.',
      'In an emergency: give oxygen and rescue breaths via the neck opening only.',
      'ENT Casualty 24x7 Hotline: +91 11 2658 8500',
    ],
    bodyHi: [
      'गर्दन-श्वासी — मैं स्टोमा से सांस लेता/लेती हूं, नाक या मुंह से नहीं।',
      'आपातकाल में: केवल गर्दन के खुलेपन से ऑक्सीजन और बचाव सांस दें।',
      'ईएनटी कैज़ुअल्टी 24x7 हॉटलाइन: +91 11 2658 8500',
    ],
  },
  {
    id: 'consent-summary',
    title: 'Consent Risk Disclosure Summary',
    titleHi: 'सहमति जोखिम प्रकटीकरण सारांश',
    category: 'Consent',
    categoryHi: 'सहमति',
    icon: FileText,
    formatTag: 'Audited Disclosure • 5 KB',
    body: [
      'Consent-Grade Risk Disclosure Summary',
      'Keep this with your discharge papers. Ask your surgeon to fill in exact figures',
      'discussed for your specific procedure before signing any consent form.',
    ],
    bodyHi: [
      'सहमति-ग्रेड जोखिम प्रकटीकरण सारांश',
      'इसे अपने डिस्चार्ज पेपर्स के साथ रखें। किसी भी सहमति फॉर्म पर हस्ताक्षर करने से पहले',
      'अपने सर्जन से अपनी विशिष्ट प्रक्रिया के लिए चर्चा किए गए सटीक आंकड़े भरने को कहें।',
    ],
  },
  {
    id: 'schemes-checklist',
    title: 'India Schemes Application Checklist',
    titleHi: 'भारत योजना आवेदन चेकलिस्ट',
    category: 'Entitlements',
    categoryHi: 'हकदारी',
    icon: Award,
    formatTag: 'Checklist Sheet • 3 KB',
    body: [
      'Ayushman Bharat (PM-JAY) & ADIP Checklist',
      '[ ] Aadhaar card copy',
      '[ ] Income certificate (if applicable)',
      '[ ] Discharge summary from treating hospital',
      '[ ] UDID / disability certificate (for ADIP hearing aid assistance)',
    ],
    bodyHi: [
      'आयुष्मान भारत (पीएम-जय) और एडीआईपी चेकलिस्ट',
      '[ ] आधार कार्ड की प्रति',
      '[ ] आय प्रमाण पत्र (यदि लागू हो)',
      '[ ] उपचार अस्पताल से डिस्चार्ज सारांश',
      '[ ] यूडीआईडी / विकलांगता प्रमाण पत्र (एडीआईपी श्रवण यंत्र सहायता के लिए)',
    ],
  },
  {
    id: 'symptom-tracker',
    title: 'Blank Weekly Symptom Tracker Sheet',
    titleHi: 'खाली साप्ताहिक लक्षण ट्रैकर पत्रक',
    category: 'Recovery Guides',
    categoryHi: 'रिकवरी गाइड',
    icon: Activity,
    formatTag: 'Log Sheet • Printable',
    body: [
      'Weekly Symptom Tracker',
      'Day | Pain (0-10) | Hearing (0-10) | Dizziness (0-10) | Notes',
      'Mon |            |                |                   |',
      'Tue |            |                |                   |',
      'Wed |            |                |                   |',
      'Thu |            |                |                   |',
      'Fri |            |                |                   |',
      'Sat |            |                |                   |',
      'Sun |            |                |                   |',
    ],
    bodyHi: [
      'साप्ताहिक लक्षण ट्रैकर',
      'दिन | दर्द (0-10) | सुनना (0-10) | चक्कर (0-10) | टिप्पणी',
      'सोम |            |               |               |',
      'मंगल |          |               |               |',
      'बुध |            |               |               |',
      'गुरु |           |               |               |',
      'शुक्र |          |               |               |',
      'शनि |            |               |               |',
      'रवि |            |               |               |',
    ],
  },
];

function triggerDownload(item: DownloadItem, hi: boolean) {
  const title = hi ? item.titleHi : item.title;
  const lines = hi ? item.bodyHi : item.body;
  const html = `<!doctype html><html lang="${hi ? 'hi' : 'en'}"><head><meta charset="utf-8"><title>${title}</title>
<style>
  body { font-family: system-ui, sans-serif; max-width: 680px; margin: 48px auto; color: #0f172a; line-height: 1.7; padding: 0 20px; }
  h1 { font-size: 22px; color: #0c4a6e; border-bottom: 2px solid #0284c7; padding-bottom: 12px; }
  p { font-size: 14px; white-space: pre-wrap; background: #f8fafc; padding: 12px 16px; border-radius: 8px; border-left: 4px solid #0284c7; margin-bottom: 12px; }
  footer { margin-top: 48px; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 16px; text-align: center; }
</style></head>
<body>
  <h1>${title}</h1>
  ${lines.map((l) => `<p>${l}</p>`).join('\n')}
  <footer>i-Dhanwantari ENT Patient Education Service — ABDM / HL7 v2 Compliant Document.</footer>
</body></html>`;

  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${item.id}-${hi ? 'hi' : 'en'}.html`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export const DownloadsCenter: React.FC = () => {
  const { locale } = useAppData();
  const hi = locale === 'hi';
  const categories = Array.from(new Set(ITEMS.map((i) => i.category)));
  const [selectedCat, setSelectedCat] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [previewItem, setPreviewItem] = useState<DownloadItem | null>(null);
  const [copied, setCopied] = useState(false);

  const filteredItems = ITEMS.filter((item) => {
    const matchesCat = selectedCat === 'all' || item.category === selectedCat;
    const q = searchQuery.trim().toLowerCase();
    const matchesQuery = !q || `${item.title} ${item.titleHi} ${item.category}`.toLowerCase().includes(q);
    return matchesCat && matchesQuery;
  });

  const copyText = (item: DownloadItem) => {
    const text = (hi ? item.bodyHi : item.body).join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="bg-white dark:bg-ink-900 border border-slate-200 dark:border-ink-800 rounded-3xl p-6 shadow-sm space-y-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-teal-50 dark:bg-ink-800 text-teal-600 dark:text-teal-400 flex items-center justify-center">
            <Download className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-display font-bold text-xl text-slate-900 dark:text-white">
              {hi ? 'संसाधन और दस्तावेज़ डाउनलोड' : 'ENT Patient Document & Download Center'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {hi
                ? 'प्रिंट करने योग्य निर्देश पत्रक, उपवास चार्ट, आपातकालीन वॉलेट कार्ड और मोबाइल श्रवण उपकरण।'
                : 'Audited printable patient sheets, fast guides, emergency cards, and mobile hearing assessment tools.'}
            </p>
          </div>
        </div>
      </div>

      {/* Featured WHO hearWHO App Tool Card */}
      <div className="rounded-3xl bg-gradient-to-r from-teal-900 via-ink-900 to-ink-950 text-white p-6 shadow-xl border border-teal-700/60 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-5 flex-1">
          <div className="w-14 h-14 rounded-2xl bg-teal-500/20 border border-teal-400/40 text-teal-300 flex items-center justify-center shrink-0 shadow-inner">
            <Smartphone className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-teal-300 bg-teal-950/80 px-2.5 py-0.5 rounded-full border border-teal-700/50">
                {hi ? 'आधिकारिक डब्ल्यूएचओ ऐप' : 'Official WHO Tool'}
              </span>
              <span className="text-xs text-slate-300 font-mono">Android & iOS · hearWHO</span>
            </div>
            <h3 className="font-display font-bold text-lg text-white mt-1">
              {hi ? 'डब्ल्यूएचओ hearWHO श्रवण मूल्यांकन ऐप' : 'WHO hearWHO Mobile Hearing Assessment App'}
            </h3>
            <p className="text-xs text-slate-300 mt-1 max-w-xl leading-relaxed">
              {hi
                ? 'विश्व स्वास्थ्य संगठन (WHO) का आधिकारिक मोबाइल ऐप जो डिजिट-इन-नॉइज़ तकनीक का उपयोग करके आपकी सुनने की क्षमता की जांच करता है। एंड्रोइड और आईओएस (आईफोन) पर उपलब्ध।'
                : 'Official World Health Organization (WHO) hearing screening app using digit-in-noise technology. Download on Android or iOS to check your hearing status.'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <a
            href="https://play.google.com/store/apps/details?id=com.hearxgroup.hearwho&pli=1"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-teal-500 hover:bg-teal-400 text-ink-950 font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-lg hover:shadow-glow-teal transition-all"
          >
            <Download className="w-4 h-4" />
            {hi ? 'गूगल प्ले (Android)' : 'Google Play'}
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
          <a
            href="https://apps.apple.com/us/app/hearwho-check-your-hearing/id1449966543"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-md transition-all"
          >
            <Download className="w-4 h-4 text-teal-300" />
            {hi ? 'एप स्टोर (iOS)' : 'App Store (iOS)'}
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Search & Category Filter */}
      <div className="space-y-3">
        <div className="flex items-center gap-3 bg-white dark:bg-ink-900 border border-slate-200 dark:border-ink-800 rounded-2xl px-4 py-3 shadow-sm">
          <Search className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={hi ? 'दस्तावेज़ खोजें (उदा. जल सावधानी, एनपीओ उपवास)…' : 'Search documents (e.g. water precautions, NPO chart, stoma card)…'}
            className="flex-1 bg-transparent outline-none text-sm font-medium text-slate-800 dark:text-slate-100 placeholder:text-slate-400"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCat('all')}
            className={`text-xs font-semibold px-3.5 py-1.5 rounded-full border transition-all ${
              selectedCat === 'all'
                ? 'bg-teal-700 text-white border-teal-700 shadow-sm'
                : 'bg-white dark:bg-ink-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-ink-700 hover:border-teal-300'
            }`}
          >
            {hi ? 'सभी श्रेणियां' : 'All Categories'}
          </button>
          {categories.map((c) => {
            const catEntry = ITEMS.find((i) => i.category === c)!;
            return (
              <button
                key={c}
                onClick={() => setSelectedCat(c)}
                className={`text-xs font-semibold px-3.5 py-1.5 rounded-full border transition-all ${
                  selectedCat === c
                    ? 'bg-teal-700 text-white border-teal-700 shadow-sm'
                    : 'bg-white dark:bg-ink-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-ink-700 hover:border-teal-300'
                }`}
              >
                {hi ? catEntry.categoryHi : c}
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid of Items */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {filteredItems.map((item) => {
          const Icon = item.icon;
          const isUrgent = item.category === 'Emergency';
          return (
            <div
              key={item.id}
              className={`bg-white dark:bg-ink-900 border rounded-2xl p-5 flex flex-col justify-between hover:shadow-lg transition-all card-interactive ${
                isUrgent ? 'border-red-200 dark:border-red-900/60' : 'border-slate-200 dark:border-ink-800'
              }`}
            >
              <div className="flex items-start gap-4">
                <span
                  className={`w-11 h-11 shrink-0 rounded-2xl flex items-center justify-center ${
                    isUrgent
                      ? 'bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400'
                      : 'bg-teal-50 text-teal-700 dark:bg-ink-800 dark:text-teal-300'
                  }`}
                >
                  <Icon className="w-5.5 h-5.5" />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 dark:bg-ink-800 text-slate-500">
                      {hi ? item.categoryHi : item.category}
                    </span>
                  </div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white mt-1.5 leading-snug">
                    {hi ? item.titleHi : item.title}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 font-mono">{item.formatTag || 'Printable Document'}</p>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 dark:border-ink-800/80 flex items-center justify-between gap-2">
                <button
                  onClick={() => setPreviewItem(item)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-teal-600 dark:hover:text-teal-300 px-3 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-ink-800 transition-colors"
                >
                  <Eye className="w-3.5 h-3.5" />
                  {hi ? 'पूर्वावलोकन' : 'Preview'}
                </button>

                <button
                  onClick={() => triggerDownload(item, hi)}
                  className="inline-flex items-center gap-1.5 bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold px-3.5 py-1.5 rounded-xl shadow-sm transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  {hi ? 'डाउनलोड' : 'Download HTML/PDF'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Preview Modal */}
      {previewItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-ink-950/70 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-ink-900 border border-slate-200 dark:border-ink-700 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 dark:border-ink-800 pb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400">
                  {hi ? previewItem.categoryHi : previewItem.category}
                </span>
                <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white mt-0.5">
                  {hi ? previewItem.titleHi : previewItem.title}
                </h3>
              </div>
              <button
                onClick={() => setPreviewItem(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 dark:bg-ink-950 border border-slate-200 dark:border-ink-800 rounded-2xl p-5 text-sm space-y-3 font-sans leading-relaxed text-slate-800 dark:text-slate-200 max-h-[50vh] overflow-y-auto thin-scroll">
              {(hi ? previewItem.bodyHi : previewItem.body).map((line, idx) => (
                <p key={idx} className={idx === 0 ? 'font-bold text-teal-700 dark:text-teal-300 text-base' : ''}>
                  {line}
                </p>
              ))}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => copyText(previewItem)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-ink-700 px-3.5 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-ink-800"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-teal-500" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? (hi ? 'कॉपी हो गया' : 'Copied!') : (hi ? 'टेक्स्ट कॉपी करें' : 'Copy Text')}
              </button>

              <button
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 text-xs font-semibold border border-slate-200 dark:border-ink-700 text-slate-700 dark:text-slate-200 px-3.5 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-ink-800"
              >
                <Printer className="w-3.5 h-3.5" />
                {hi ? 'प्रिंट करें' : 'Print Document'}
              </button>

              <button
                onClick={() => triggerDownload(previewItem, hi)}
                className="inline-flex items-center gap-1.5 bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-md"
              >
                <Download className="w-3.5 h-3.5" />
                {hi ? 'डाउनलोड करें' : 'Download File'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
