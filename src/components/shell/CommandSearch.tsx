'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search, CornerDownLeft, X, BookOpen, FileText, Podcast, HelpCircle, ClipboardCheck, ArrowRight, ShieldAlert,
} from 'lucide-react';
import { allNavItems, NavItem } from '@/lib/nav-registry';
import { useAppData } from '@/lib/app-data-context';

export interface SearchEntry {
  id: string;
  title: string;
  titleHi: string;
  subtitle: string;
  subtitleHi: string;
  category: 'nav' | 'faq' | 'assessment' | 'podcast' | 'download';
  href: string;
  icon: typeof Search;
  keywords?: string;
  tone?: 'default' | 'urgent';
}

const SEARCH_EXTRA_ITEMS: SearchEntry[] = [
  {
    id: 'faq-water-ear',
    title: 'Water in operated ear precaution',
    titleHi: 'ऑपरेशन वाले कान में पानी की सावधानी',
    subtitle: 'What to do if water enters ear after tympanoplasty',
    subtitleHi: 'टिमपैनोप्लास्टी के बाद कान में पानी जाने पर क्या करें',
    category: 'faq',
    href: '/troubleshooting#ear-water',
    icon: HelpCircle,
    keywords: 'water ear shower bathe tympanoplasty cotton vaseline',
  },
  {
    id: 'faq-nose-bleed',
    title: 'Nasal bleeding during douching',
    titleHi: 'नाक धोते समय रक्तस्राव',
    subtitle: 'Light spotting vs heavy nasal bleeding guidance',
    subtitleHi: 'हल्का दाग बनाम भारी नाक से बहने वाले खून का मार्गदर्शन',
    category: 'faq',
    href: '/troubleshooting#nose-bleed',
    icon: HelpCircle,
    keywords: 'blood nose bleed saline FESS discharge',
  },
  {
    id: 'assess-hearing-check',
    title: 'Hearing Self-Check Form',
    titleHi: 'श्रवण स्व-जांच फॉर्म',
    subtitle: '4-question rapid assessment for hearing muffling',
    subtitleHi: 'सुनने में कठिनाई के लिए 4-प्रश्न त्वरित मूल्यांकन',
    category: 'assessment',
    href: '/self-assessment?type=hearing',
    icon: ClipboardCheck,
    keywords: 'quiz hearing test muffling score audio',
  },
  {
    id: 'assess-vertigo-check',
    title: 'Dizziness & Balance Self-Check',
    titleHi: 'चक्कर और संतुलन स्व-जांच',
    subtitle: 'Evaluate post-op unsteadiness and fall risk',
    subtitleHi: 'सर्जरी के बाद अस्थिरता और गिरने के जोखिम का मूल्यांकन करें',
    category: 'assessment',
    href: '/self-assessment?type=vertigo',
    icon: ClipboardCheck,
    keywords: 'vertigo dizziness balance spinning falls quiz',
  },
  {
    id: 'podcast-stoma',
    title: 'Podcast: Living With a Stoma (First 30 Days)',
    titleHi: 'पॉडकास्ट: स्टोमा के साथ जीवन (पहले 30 दिन)',
    subtitle: 'Audio walkthrough by Dr. Rajesh Sharma',
    subtitleHi: 'डॉ. राजेश शर्मा द्वारा ऑडियो विवरण',
    category: 'podcast',
    href: '/podcasts#ep1',
    icon: Podcast,
    keywords: 'audio podcast stoma laryngectomy episode 1',
  },
  {
    id: 'download-emergency-card',
    title: 'Print Emergency Wallet Card (Neck Breather)',
    titleHi: 'आपातकालीन वॉलेट कार्ड प्रिंट करें (गर्दन-श्वासी)',
    subtitle: 'Downloadable card for tracheostomy & laryngectomy',
    subtitleHi: 'ट्रैकियोस्टॉमी और लैरिंजेक्टॉमी के लिए डाउनलोड योग्य कार्ड',
    category: 'download',
    href: '/downloads#emergency-card',
    icon: FileText,
    keywords: 'pdf print wallet card stoma SOS emergency',
    tone: 'urgent',
  },
];

export const CommandSearch: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { locale } = useAppData();
  const hi = locale === 'hi';

  const allSearchable: SearchEntry[] = useMemo(() => {
    const navEntries: SearchEntry[] = allNavItems.map((item) => ({
      id: item.href,
      title: item.label,
      titleHi: item.labelHi,
      subtitle: item.description,
      subtitleHi: item.descriptionHi,
      category: 'nav',
      href: item.href,
      icon: item.icon,
      keywords: item.keywords,
      tone: item.tone,
    }));
    return [...navEntries, ...SEARCH_EXTRA_ITEMS];
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    let filtered = allSearchable;

    if (activeCategory !== 'all') {
      filtered = filtered.filter((item) => item.category === activeCategory);
    }

    if (!q) return filtered;

    return filtered.filter((item) => {
      const haystack = `${item.title} ${item.titleHi} ${item.subtitle} ${item.subtitleHi} ${item.keywords || ''}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [query, activeCategory, allSearchable]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query, activeCategory, open]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveCategory('all');
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const go = (item: SearchEntry) => {
    router.push(item.href);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const item = results[activeIndex];
      if (item) go(item);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center bg-slate-950/70 backdrop-blur-md px-3 sm:px-4 pt-[7vh] sm:pt-[10vh]"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Global search"
    >
      <div
        className="w-full max-w-2xl rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[84vh] sm:max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Header */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50">
          <Search className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={hi ? 'गाइड, लक्षण, फॉर्म, पॉडकास्ट खोजें…' : 'Search guides, symptoms, forms, podcasts…'}
            className="flex-1 bg-transparent outline-none text-sm font-semibold text-slate-900 dark:text-slate-100 placeholder:text-slate-400 placeholder:font-normal"
          />
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-200/50 dark:hover:bg-ink-800"
            aria-label="Close search"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Category Filter Chips */}
        <div className="flex items-center gap-1.5 px-4 py-2 border-b border-slate-100 dark:border-ink-800 bg-white dark:bg-ink-900 overflow-x-auto thin-scroll">
          {[
            { id: 'all', label: hi ? 'सभी' : 'All' },
            { id: 'nav', label: hi ? 'पृष्ठ' : 'Pages' },
            { id: 'faq', label: hi ? 'समस्या निवारण' : 'Troubleshooting' },
            { id: 'assessment', label: hi ? 'स्व-मूल्यांकन' : 'Self-Check' },
            { id: 'podcast', label: hi ? 'पॉडकास्ट' : 'Podcasts' },
            { id: 'download', label: hi ? 'डाउनलोड' : 'Downloads' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                activeCategory === cat.id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-ink-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-ink-700'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto thin-scroll py-2 px-2">
          {results.length === 0 && (
            <div className="px-4 py-12 text-center text-slate-400">
              <Search className="w-8 h-8 mx-auto mb-2 opacity-40 text-blue-500" />
              <p className="text-sm font-semibold">{hi ? 'कोई परिणाम नहीं मिला।' : 'No matching resources found.'}</p>
              <p className="text-xs text-slate-400 mt-1">
                {hi ? 'अलग कीवर्ड या श्रेणी आज़माएं' : 'Try searching with different keywords'}
              </p>
            </div>
          )}

          {results.map((item, i) => {
            const Icon = item.icon;
            const isSelected = i === activeIndex;
            const isUrgent = item.tone === 'urgent';

            return (
              <button
                key={item.id}
                onMouseEnter={() => setActiveIndex(i)}
                onClick={() => go(item)}
                className={`w-full flex items-center gap-3.5 px-3.5 py-3 rounded-xl text-left transition-all ${
                  isSelected
                    ? 'bg-blue-50 dark:bg-blue-950/35 border border-blue-200 dark:border-blue-900/60 shadow-sm'
                    : 'hover:bg-slate-50 dark:hover:bg-ink-800/40 border border-transparent'
                }`}
              >
                <span
                  className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${
                    isUrgent
                      ? 'bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400'
                      : 'bg-blue-100/70 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300'
                  }`}
                >
                  <Icon className="w-4.5 h-4.5" />
                </span>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-900 dark:text-white truncate">
                      {hi ? item.titleHi : item.title}
                    </span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-ink-700 text-slate-500 dark:text-slate-400 uppercase tracking-wider shrink-0">
                      {item.category}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                    {hi ? item.subtitleHi : item.subtitle}
                  </p>
                </div>

                {isSelected ? (
                  <CornerDownLeft className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                ) : (
                  <ArrowRight className="w-4 h-4 text-slate-300 dark:text-slate-600 shrink-0 opacity-0 group-hover:opacity-100" />
                )}
              </button>
            );
          })}
        </div>

        {/* Footer shortcuts */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 dark:bg-ink-950 border-t border-slate-200 dark:border-ink-800 text-[11px] text-slate-400 font-mono">
          <div className="flex items-center gap-3">
            <span><kbd className="bg-slate-200 dark:bg-ink-800 px-1.5 py-0.5 rounded">↑</kbd> <kbd className="bg-slate-200 dark:bg-ink-800 px-1.5 py-0.5 rounded">↓</kbd> navigate</span>
            <span><kbd className="bg-slate-200 dark:bg-ink-800 px-1.5 py-0.5 rounded">↵</kbd> select</span>
            <span><kbd className="bg-slate-200 dark:bg-ink-800 px-1.5 py-0.5 rounded">esc</kbd> close</span>
          </div>
          <span className="text-blue-600 dark:text-blue-400 font-semibold font-sans">{results.length} results</span>
        </div>
      </div>
    </div>
  );
};
