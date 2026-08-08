'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  DHINGRA_PATIENT_MODULES,
  DhingraPatientModule,
} from '@/lib/dhingra-modules';
import { useAppData } from '@/lib/app-data-context';

export function DhingraPatientEducationHub() {
  const { locale: contextLocale, readingLevel: contextReadingLevel } = useAppData();
  
  const [selectedSubspecialty, setSelectedSubspecialty] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [language, setLanguage] = useState<'en' | 'hi'>(contextLocale || 'en');
  const [readingLevel, setReadingLevel] = useState<'standard' | 'grade6'>(
    contextReadingLevel || 'grade6'
  );
  const [activeModule, setActiveModule] = useState<DhingraPatientModule | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);
  const [activeModalTab, setActiveModalTab] = useState<
    'overview' | 'symptoms' | 'homecare' | 'treatments' | 'faqs'
  >('overview');

  const filteredModules = useMemo(() => {
    return DHINGRA_PATIENT_MODULES.filter((mod) => {
      const matchesSubspecialty =
        selectedSubspecialty === 'all' || mod.subspecialty === selectedSubspecialty;
      
      const q = searchQuery.toLowerCase().trim();
      if (!q) return matchesSubspecialty;

      const matchesSearch =
        mod.title.toLowerCase().includes(q) ||
        mod.titleHindi.includes(q) ||
        mod.chapterTitle.toLowerCase().includes(q) ||
        mod.icd10Code.toLowerCase().includes(q) ||
        mod.snomedCode.includes(q) ||
        mod.symptoms.some((s) => s.toLowerCase().includes(q)) ||
        mod.symptomsHindi.some((s) => s.includes(q));

      return matchesSubspecialty && matchesSearch;
    });
  }, [selectedSubspecialty, searchQuery]);

  const handleSpeakText = (text: string) => {
    if (!('speechSynthesis' in window)) {
      alert('Speech synthesis is not supported in this browser.');
      return;
    }

    if (isPlayingAudio) {
      window.speechSynthesis.cancel();
      setIsPlayingAudio(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language === 'hi' ? 'hi-IN' : 'en-US';
    utterance.rate = 0.9;
    
    utterance.onend = () => setIsPlayingAudio(false);
    utterance.onerror = () => setIsPlayingAudio(false);

    setIsPlayingAudio(true);
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handlePrintHandout = (mod: DhingraPatientModule) => {
    const printWindow = window.open('', '_blank', 'width=800,height=900');
    if (!printWindow) return;

    const isHi = language === 'hi';
    const content = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${isHi ? mod.titleHindi : mod.title} - Patient Handout</title>
          <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; padding: 30px; color: #1e293b; line-height: 1.6; }
            .header { border-bottom: 3px solid #2563eb; padding-bottom: 12px; margin-bottom: 20px; }
            .badge { background: #eff6ff; color: #1d4ed8; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: bold; }
            .section-title { color: #0f172a; border-left: 4px solid #2563eb; padding-left: 10px; margin-top: 24px; font-size: 18px; }
            .red-flag { background: #fef2f2; border: 1px solid #fecaca; color: #991b1b; padding: 12px; border-radius: 8px; margin: 15px 0; }
            ul { padding-left: 20px; }
            li { margin-bottom: 6px; }
            .footer { margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 15px; font-size: 11px; color: #64748b; }
          </style>
        </head>
        <body>
          <div class="header">
            <span class="badge">Clinical Reference: Ch. ${mod.chapterNo} (${mod.pdfPageRange})</span>
            <h2>${isHi ? mod.titleHindi : mod.title}</h2>
            <p><strong>ICD-10:</strong> ${mod.icd10Code} | <strong>SNOMED CT:</strong> ${mod.snomedCode}</p>
          </div>

          <div class="section-title">${isHi ? 'विवरण (Overview)' : 'Overview'}</div>
          <p>${readingLevel === 'grade6' ? (isHi ? mod.simplifiedOverviewHindi : mod.simplifiedOverview) : (isHi ? mod.overviewHindi : mod.overview)}</p>

          <div class="red-flag">
            <strong>⚠️ ${isHi ? 'आपातकालीन लक्षण (Red Flags - When to see a doctor immediately)' : 'Red Flag Warning Symptoms'}:</strong>
            <ul>
              ${(isHi ? mod.redFlagsHindi : mod.redFlags).map((rf) => `<li>${rf}</li>`).join('')}
            </ul>
          </div>

          <div class="section-title">${isHi ? 'मुख्य लक्षण (Symptoms)' : 'Common Symptoms'}</div>
          <ul>
            ${(isHi ? mod.symptomsHindi : mod.symptoms).map((s) => `<li>${s}</li>`).join('')}
          </ul>

          <div class="section-title">${isHi ? 'घर पर देखभाल (Home Care & Do\'s/Don\'ts)' : 'Home Care & Management'}</div>
          <ul>
            ${(isHi ? mod.homeCareHindi : mod.homeCare).map((hc) => `<li>${hc}</li>`).join('')}
          </ul>

          <div class="section-title">${isHi ? 'इलाज के विकल्प (Treatment Options)' : 'Treatment Options'}</div>
          <p><strong>Medical:</strong> ${ (isHi ? mod.medicalOptionsHindi : mod.medicalOptions).join(', ') }</p>
          <p><strong>Surgical:</strong> ${ (isHi ? mod.surgicalOptionsHindi : mod.surgicalOptions).join(', ') }</p>

          <div class="footer">
            Generated by ENT i-Dhanwantari Clinical Patient Education System. 
          </div>
          <script>window.print();</script>
        </body>
      </html>
    `;

    printWindow.document.write(content);
    printWindow.document.close();
  };

  const getSubspecialtyBadge = (sub: string) => {
    switch (sub) {
      case 'otology':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300';
      case 'rhinology':
        return 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300';
      case 'pharynx':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300';
      case 'laryngology':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300';
      case 'head_neck':
        return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300';
      case 'procedures':
        return 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-teal-700 via-cyan-800 to-indigo-900 p-6 text-white shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold backdrop-blur-md">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              Clinical ENT Patient Education System
            </div>
            <h1 className="mt-2 text-2xl md:text-3xl font-extrabold tracking-tight">
              Patient Education Modules
            </h1>
            <p className="mt-1 text-sm text-cyan-100 max-w-2xl">
              Grade-6 accessible, bilingual, and clinical evidence-backed patient guides.
            </p>
          </div>

          {/* Quick Global Toggles */}
          <div className="flex flex-wrap items-center gap-3 bg-white/10 p-2.5 rounded-xl backdrop-blur-md border border-white/10">
            {/* Language Toggle */}
            <div className="flex items-center rounded-lg bg-black/20 p-1">
              <button
                onClick={() => setLanguage('en')}
                className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                  language === 'en'
                    ? 'bg-white text-gray-900 shadow'
                    : 'text-white/80 hover:text-white'
                }`}
              >
                English
              </button>
              <button
                onClick={() => setLanguage('hi')}
                className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                  language === 'hi'
                    ? 'bg-white text-gray-900 shadow'
                    : 'text-white/80 hover:text-white'
                }`}
              >
                हिंदी
              </button>
            </div>

            {/* Reading Level Toggle */}
            <div className="flex items-center rounded-lg bg-black/20 p-1">
              <button
                onClick={() => setReadingLevel('grade6')}
                className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                  readingLevel === 'grade6'
                    ? 'bg-emerald-500 text-white shadow'
                    : 'text-white/80 hover:text-white'
                }`}
                title="Simplified for easy patient understanding"
              >
                Grade 6 (Easy)
              </button>
              <button
                onClick={() => setReadingLevel('standard')}
                className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                  readingLevel === 'standard'
                    ? 'bg-emerald-500 text-white shadow'
                    : 'text-white/80 hover:text-white'
                }`}
                title="Detailed clinical summary"
              >
                Standard Clinical
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              language === 'hi'
                ? 'रोग, लक्षण या कोड खोजें (e.g. वर्टिगो)...'
                : 'Search condition, symptoms, ICD-10...'
            }
            className="w-full pl-10 pr-4 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
          <svg
            className="absolute left-3 top-2.5 h-4 w-4 text-slate-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>

        {/* Subspecialty Filter Tabs */}
        <div className="flex flex-wrap gap-1.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          {[
            { id: 'all', label: language === 'hi' ? 'सभी (All)' : 'All Subspecialties' },
            { id: 'otology', label: language === 'hi' ? 'कान (Otology)' : 'Ear (Otology)' },
            { id: 'rhinology', label: language === 'hi' ? 'नाक (Rhinology)' : 'Nose (Rhinology)' },
            { id: 'pharynx', label: language === 'hi' ? 'गला (Pharynx)' : 'Throat (Pharynx)' },
            { id: 'laryngology', label: language === 'hi' ? 'आवाज (Larynx)' : 'Voice (Larynx)' },
            { id: 'head_neck', label: language === 'hi' ? 'थायराइड/गर्दन' : 'Head & Neck' },
            { id: 'procedures', label: language === 'hi' ? 'प्रक्रियाएं/इमरजेंसी' : 'Procedures & Care' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedSubspecialty(tab.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
                selectedSubspecialty === tab.id
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Module Grid */}
      {filteredModules.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
          <p className="text-slate-500 dark:text-slate-400">
            {language === 'hi'
              ? 'कोई मॉड्यूल नहीं मिला। कृपया खोज शब्द बदलें।'
              : 'No patient modules match your search criteria.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredModules.map((mod) => (
            <div
              key={mod.id}
              className="group flex flex-col justify-between rounded-xl bg-white dark:bg-slate-800 p-5 shadow-sm hover:shadow-md border border-slate-200 dark:border-slate-700 transition-all duration-200 hover:border-teal-500 dark:hover:border-teal-400"
            >
              <div>
                {/* Badge Row */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span
                    className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${getSubspecialtyBadge(
                      mod.subspecialty
                    )}`}
                  >
                    {mod.subspecialty.toUpperCase()}
                  </span>
                  <span className="text-[11px] font-mono font-medium text-slate-500 dark:text-slate-400">
                    Ch. {mod.chapterNo} ({mod.pdfPageRange.split(' ')[0]} {mod.pdfPageRange.split(' ')[1]})
                  </span>
                </div>

                {/* Title */}
                <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors line-clamp-2">
                  {language === 'hi' ? mod.titleHindi : mod.title}
                </h3>

                {/* Chapter Reference */}
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 line-clamp-1 italic">
                  Chapter Topic: {mod.chapterTitle}
                </p>

                {/* Simplified Overview Snippet */}
                <p className="mt-3 text-xs text-slate-600 dark:text-slate-300 line-clamp-3 leading-relaxed">
                  {readingLevel === 'grade6'
                    ? language === 'hi'
                      ? mod.simplifiedOverviewHindi
                      : mod.simplifiedOverview
                    : language === 'hi'
                    ? mod.overviewHindi
                    : mod.overview}
                </p>

                {/* Red Flag Alert Highlight Box */}
                {mod.redFlags.length > 0 && (
                  <div className="mt-4 p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-800 dark:text-rose-300">
                    <span className="font-bold flex items-center gap-1 mb-0.5">
                      ⚠️ {language === 'hi' ? 'आपातकालीन चेतावनी' : 'Red Flag Alert'}:
                    </span>
                    <p className="line-clamp-1">
                      {language === 'hi' ? mod.redFlagsHindi[0] : mod.redFlags[0]}
                    </p>
                  </div>
                )}
              </div>

              {/* Action Footer */}
              <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
                <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400">
                  <span>{mod.icd10Code}</span>
                </div>

                <button
                  onClick={() => {
                    setActiveModule(mod);
                    setActiveModalTab('overview');
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 transition-colors"
                >
                  {language === 'hi' ? 'पूरा मॉड्यूल देखें' : 'Read Full Guide'}
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detailed Module Modal Viewer */}
      {activeModule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-4xl max-h-[90vh] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-6 bg-gradient-to-r from-slate-900 via-slate-800 to-teal-950 text-white flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-500/20 text-teal-300 border border-teal-500/30">
                    Clinical Guide - Ch. {activeModule.chapterNo} ({activeModule.pdfPageRange})
                  </span>
                  <span className="text-xs font-mono text-slate-300">
                    ICD: {activeModule.icd10Code} | SNOMED: {activeModule.snomedCode}
                  </span>
                </div>
                <button
                  onClick={() => {
                    setActiveModule(null);
                    window.speechSynthesis?.cancel();
                    setIsPlayingAudio(false);
                  }}
                  className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              <h2 className="text-xl md:text-2xl font-extrabold text-white mt-1">
                {language === 'hi' ? activeModule.titleHindi : activeModule.title}
              </h2>
              <p className="text-xs text-teal-200 italic">
                Source Chapter: {activeModule.chapterTitle}
              </p>

              {/* Action Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-3 mt-3 pt-3 border-t border-slate-700/60">
                <div className="flex items-center gap-2">
                  {/* Speech Button */}
                  <button
                    onClick={() =>
                      handleSpeakText(
                        readingLevel === 'grade6'
                          ? language === 'hi'
                            ? activeModule.simplifiedOverviewHindi
                            : activeModule.simplifiedOverview
                          : language === 'hi'
                          ? activeModule.overviewHindi
                          : activeModule.overview
                      )
                    }
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      isPlayingAudio
                        ? 'bg-rose-500 text-white animate-pulse'
                        : 'bg-white/10 text-white hover:bg-white/20'
                    }`}
                  >
                    🔊 {isPlayingAudio ? (language === 'hi' ? 'रोकें' : 'Stop Audio') : (language === 'hi' ? 'सुनें (Listen)' : 'Listen Audio')}
                  </button>

                  {/* Print Button */}
                  <button
                    onClick={() => handlePrintHandout(activeModule)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-white/10 text-white hover:bg-white/20 transition-all"
                  >
                    🖨️ {language === 'hi' ? 'प्रिंट / डाउनलोड' : 'Print Patient Handout'}
                  </button>
                </div>

                {/* Grade 6 Toggle Inside Modal */}
                <span className="text-xs text-slate-300">
                  Mode: <strong className="text-teal-400">{readingLevel === 'grade6' ? 'Grade 6 Easy' : 'Standard'}</strong>
                </span>
              </div>
            </div>

            {/* Modal Internal Navigation Tabs */}
            <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 px-6 overflow-x-auto">
              {[
                { id: 'overview', label: language === 'hi' ? 'विवरण' : 'Overview' },
                { id: 'symptoms', label: language === 'hi' ? 'लक्षण व खतरे' : 'Symptoms & Red Flags' },
                { id: 'homecare', label: language === 'hi' ? 'घरेलू देखभाल' : 'Home Care & Rules' },
                { id: 'treatments', label: language === 'hi' ? 'इलाज के विकल्प' : 'Medical & Surgical' },
                { id: 'faqs', label: language === 'hi' ? 'सवाल-जवाब (FAQs)' : 'FAQs' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveModalTab(tab.id as any)}
                  className={`py-3 px-4 text-xs font-bold border-b-2 whitespace-nowrap transition-colors ${
                    activeModalTab === tab.id
                      ? 'border-teal-600 text-teal-600 dark:border-teal-400 dark:text-teal-400'
                      : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-800 dark:text-slate-200">
              {/* TAB 1: OVERVIEW */}
              {activeModalTab === 'overview' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-900">
                    <h4 className="text-sm font-bold text-teal-900 dark:text-teal-200 mb-1">
                      {language === 'hi' ? 'सरल भाषा में समझें (Grade-6 View)' : 'What happens in your body (Simplified)'}
                    </h4>
                    <p className="text-sm leading-relaxed text-teal-950 dark:text-teal-100">
                      {language === 'hi'
                        ? activeModule.simplifiedOverviewHindi
                        : activeModule.simplifiedOverview}
                    </p>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                      {language === 'hi' ? 'चिकित्सीय विवरण (Medical Description)' : 'Clinical Overview'}
                    </h4>
                    <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                      {language === 'hi' ? activeModule.overviewHindi : activeModule.overview}
                    </p>
                  </div>
                </div>
              )}

              {/* TAB 2: SYMPTOMS & RED FLAGS */}
              {activeModalTab === 'symptoms' && (
                <div className="space-y-5">
                  {/* Red Flags Alert */}
                  {activeModule.redFlags.length > 0 && (
                    <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800">
                      <h4 className="text-sm font-extrabold text-rose-900 dark:text-rose-200 flex items-center gap-1.5 mb-2">
                        🚨 {language === 'hi' ? 'आपातकालीन लक्षण (तुरंत डॉक्टर से संपर्क करें)' : 'Red Flag Emergency Symptoms (Seek immediate care)'}
                      </h4>
                      <ul className="space-y-1.5 list-disc list-inside text-xs text-rose-800 dark:text-rose-300 font-medium">
                        {(language === 'hi'
                          ? activeModule.redFlagsHindi
                          : activeModule.redFlags
                        ).map((rf, idx) => (
                          <li key={idx}>{rf}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-2">
                      {language === 'hi' ? 'आम लक्षण (Common Symptoms)' : 'Common Symptoms'}
                    </h4>
                    <ul className="space-y-2">
                      {(language === 'hi'
                        ? activeModule.symptomsHindi
                        : activeModule.symptoms
                      ).map((sym, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                          <span className="text-teal-500 font-bold">•</span>
                          <span>{sym}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* TAB 3: HOME CARE & DOS/DONTS */}
              {activeModalTab === 'homecare' && (
                <div className="space-y-5">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-2">
                      🏡 {language === 'hi' ? 'घर पर क्या करें (Home Care & Self Management)' : 'Home Care & Self Management'}
                    </h4>
                    <ul className="space-y-2">
                      {(language === 'hi'
                        ? activeModule.homeCareHindi
                        : activeModule.homeCare
                      ).map((hc, idx) => (
                        <li key={idx} className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          {hc}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* DO's */}
                    <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900">
                      <h5 className="text-xs font-extrabold text-emerald-900 dark:text-emerald-200 mb-2 flex items-center gap-1">
                        ✅ {language === 'hi' ? 'क्या करें (Do\'s)' : 'Do\'s'}
                      </h5>
                      <ul className="space-y-1.5 text-xs text-emerald-800 dark:text-emerald-300 list-disc list-inside">
                        {(language === 'hi'
                          ? activeModule.dosHindi
                          : activeModule.dos
                        ).map((d, idx) => (
                          <li key={idx}>{d}</li>
                        ))}
                      </ul>
                    </div>

                    {/* DONT's */}
                    <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900">
                      <h5 className="text-xs font-extrabold text-rose-900 dark:text-rose-200 mb-2 flex items-center gap-1">
                        ❌ {language === 'hi' ? 'क्या न करें (Don\'ts)' : 'Don\'ts'}
                      </h5>
                      <ul className="space-y-1.5 text-xs text-rose-800 dark:text-rose-300 list-disc list-inside">
                        {(language === 'hi'
                          ? activeModule.dontsHindi
                          : activeModule.donts
                        ).map((d, idx) => (
                          <li key={idx}>{d}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: TREATMENTS */}
              {activeModalTab === 'treatments' && (
                <div className="space-y-5">
                  <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900">
                    <h4 className="text-sm font-bold text-blue-900 dark:text-blue-200 mb-2 flex items-center gap-1.5">
                      💊 {language === 'hi' ? 'दवाइयों से इलाज (Medical Options)' : 'Medical Treatment Options'}
                    </h4>
                    <ul className="space-y-1.5 text-sm text-blue-950 dark:text-blue-200 list-disc list-inside">
                      {(language === 'hi'
                        ? activeModule.medicalOptionsHindi
                        : activeModule.medicalOptions
                      ).map((med, idx) => (
                        <li key={idx}>{med}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-4 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900">
                    <h4 className="text-sm font-bold text-purple-900 dark:text-purple-200 mb-2 flex items-center gap-1.5">
                      🏥 {language === 'hi' ? 'ऑपरेशन / शल्य चिकित्सा (Surgical Options)' : 'Surgical & Procedural Options'}
                    </h4>
                    <ul className="space-y-1.5 text-sm text-purple-950 dark:text-purple-200 list-disc list-inside">
                      {(language === 'hi'
                        ? activeModule.surgicalOptionsHindi
                        : activeModule.surgicalOptions
                      ).map((surg, idx) => (
                        <li key={idx}>{surg}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* TAB 5: FAQS */}
              {activeModalTab === 'faqs' && (
                <div className="space-y-4">
                  {activeModule.faqs.map((faq, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                    >
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                        ❓ {language === 'hi' ? faq.questionHindi : faq.question}
                      </h4>
                      <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300 mt-1">
                        {language === 'hi' ? faq.answerHindi : faq.answer}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-100 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>
                Clinical Reference: Chapter {activeModule.chapterNo}
              </span>
              <button
                onClick={() => {
                  setActiveModule(null);
                  window.speechSynthesis?.cancel();
                  setIsPlayingAudio(false);
                }}
                className="px-4 py-2 rounded-lg bg-slate-800 text-white hover:bg-slate-700 font-bold transition-colors"
              >
                {language === 'hi' ? 'बंद करें' : 'Close Module'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
