'use client';

import React, { useState } from 'react';
import {
  ArrowRight,
  BadgeCheck,
  HeartHandshake,
  Languages,
  LockKeyhole,
  Moon,
  ShieldCheck,
  Smartphone,
  Sun,
  UserRound,
  Ear,
  Stethoscope,
  Check,
  Copy,
  Sparkles,
  Building2,
  Activity,
  CheckCircle2,
} from 'lucide-react';
import { useAppData } from '@/lib/app-data-context';
import { DhanwantariMark } from './DhanwantariMark';

export type AccessRole = 'patient' | 'audiologist' | 'ent_specialist' | 'caregiver';

export const AccessWelcome: React.FC<{ onEnter: (role: AccessRole) => void }> = ({ onEnter }) => {
  const { locale, setLocale, theme, setTheme } = useAppData();
  const [role, setRole] = useState<AccessRole>('patient');
  const [copied, setCopied] = useState(false);
  const hi = locale === 'hi';

  const handleCopyCode = () => {
    navigator.clipboard.writeText('ENT-CARE-2026');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const roleCards = [
    {
      id: 'patient' as const,
      icon: UserRound,
      badgeEn: 'PATIENT DASHBOARD',
      badgeHi: 'रोगी डैशबोर्ड',
      colorClass: 'from-blue-600 to-cyan-600',
      activeBorder: 'border-blue-500/80 bg-gradient-to-r from-blue-500/10 via-cyan-500/5 to-transparent dark:from-blue-900/30 dark:via-cyan-900/10 dark:to-transparent ring-2 ring-blue-500/30',
      activeIconBg: 'bg-gradient-to-tr from-blue-600 to-cyan-500 text-white shadow-md shadow-blue-500/30',
      badgeStyle: 'bg-blue-100/80 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 dark:border-blue-800/50',
      title: hi ? 'रोगी पोर्टल (सचिन श्रीवास्तव)' : 'Patient Portal (Sachin Srivastava)',
      body: hi
        ? 'अपना रिकवरी प्लान, लक्षण लॉग, स्वास्थ्य शिक्षा और आपातकालीन कार्ड देखें।'
        : 'Open your personal recovery plan, symptom log, care guides, and emergency card.',
      tags: hi ? ['लक्षण लॉग', 'आपातकालीन कार्ड', 'पुनर्वास'] : ['Recovery Plan', 'Symptom Log', 'Emergency Card'],
    },
    {
      id: 'audiologist' as const,
      icon: Ear,
      badgeEn: 'AUDIOLOGY SUITE',
      badgeHi: 'ऑडियोलॉजी सूट',
      colorClass: 'from-purple-600 to-indigo-600',
      activeBorder: 'border-purple-500/80 bg-gradient-to-r from-purple-500/10 via-indigo-500/5 to-transparent dark:from-purple-900/30 dark:via-indigo-900/10 dark:to-transparent ring-2 ring-purple-500/30',
      activeIconBg: 'bg-gradient-to-tr from-purple-600 to-indigo-500 text-white shadow-md shadow-purple-500/30',
      badgeStyle: 'bg-purple-100/80 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300 dark:border-purple-800/50',
      title: hi ? 'ऑडियोलॉजिस्ट पोर्टल (श्री लोकनाथ साहू)' : 'Audiologist Portal (Mr Lokanath Sahoo)',
      body: hi
        ? 'श्री लोकनाथ साहू (मुख्य नैदानिक ऑडियोलॉजिस्ट) - शुद्ध टोन ऑडियोमेट्री (PTA), टिनिटस मास्किंग Rx, स्पीच-इन-नॉइज़ व हियरिंग एड फिटिंग suite।'
        : 'Mr Lokanath Sahoo (Chief Clinical Audiologist) - Full Audiology Suite: Pure Tone Audiometry (PTA), Speech-in-Noise, REM fitting & Tinnitus Rx.',
      tags: hi ? ['PTA परीक्षण', 'टिनिटस Rx', 'हियरिंग एड'] : ['Pure Tone Audiometry', 'Tinnitus Rx', 'Speech-in-Noise'],
    },
    {
      id: 'ent_specialist' as const,
      icon: Stethoscope,
      badgeEn: 'CLINICAL & SURGERY',
      badgeHi: 'क्लिनिकल एवं सर्जरी',
      colorClass: 'from-emerald-600 to-teal-600',
      activeBorder: 'border-emerald-500/80 bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent dark:from-emerald-900/30 dark:via-teal-900/10 dark:to-transparent ring-2 ring-emerald-500/30',
      activeIconBg: 'bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-md shadow-emerald-500/30',
      badgeStyle: 'bg-emerald-100/80 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-800/50',
      title: hi ? 'ईएनटी विशेषज्ञ पोर्टल (ENT Specialist Portal)' : 'ENT Specialist Portal',
      body: hi
        ? 'ओपीडी एवं शल्य चिकित्सा रोस्टर, HIS परामर्श, निर्णय सहायता और क्लिनिकल एनालिटिक्स।'
        : 'Access surgical & OPD rosters, HIS patient consults, decision aids, and clinical analytics.',
      tags: hi ? ['सर्जिकल रोस्टर', 'HIS परामर्श', 'एनालिटिक्स'] : ['Surgical Roster', 'HIS Consults', 'Decision Aids'],
    },
    {
      id: 'caregiver' as const,
      icon: HeartHandshake,
      badgeEn: 'FAMILY SUPPORT',
      badgeHi: 'देखभालकर्ता सहायता',
      colorClass: 'from-amber-600 to-orange-600',
      activeBorder: 'border-amber-500/80 bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-transparent dark:from-amber-900/30 dark:via-orange-900/10 dark:to-transparent ring-2 ring-amber-500/30',
      activeIconBg: 'bg-gradient-to-tr from-amber-600 to-orange-500 text-white shadow-md shadow-amber-500/30',
      badgeStyle: 'bg-amber-100/80 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-800/50',
      title: hi ? 'देखभालकर्ता पोर्टल (Caregiver Portal)' : 'Caregiver Portal',
      body: hi
        ? 'अनुमति के साथ देखभाल निर्देश, चेतावनी संकेत और दैनिक सहायता कार्य देखें।'
        : 'View care instructions, warning signs, and daily support tasks with consent.',
      tags: hi ? ['देखभाल निर्देश', 'दैनिक अलर्ट', 'सहमति एक्सेस'] : ['Care Guides', 'Daily Alerts', 'Consent Access'],
    },
  ];

  const getButtonText = () => {
    switch (role) {
      case 'audiologist':
        return hi ? 'ऑडियोलॉजिस्ट पोर्टल में प्रवेश करें' : 'Enter Audiologist Portal';
      case 'ent_specialist':
        return hi ? 'ईएनटी विशेषज्ञ पोर्टल में प्रवेश करें' : 'Enter ENT Specialist Portal';
      case 'caregiver':
        return hi ? 'देखभालकर्ता पोर्टल खोलें' : 'Enter Caregiver View';
      default:
        return hi ? 'रोगी डैशबोर्ड में प्रवेश करें (सचिन)' : 'Enter Patient Dashboard (Sachin)';
    }
  };

  return (
    <div className={`relative min-h-screen overflow-hidden bg-slate-50 text-slate-900 dark:bg-[#0b132b] dark:text-slate-100 selection:bg-blue-500 selection:text-white ${locale === 'hi' ? 'lang-hi' : ''}`}>
      {/* Decorative ambient lighting spheres */}
      <div className="pointer-events-none absolute -left-40 -top-40 h-[500px] w-[500px] rounded-full bg-blue-500/15 blur-[120px] dark:bg-blue-600/20" />
      <div className="pointer-events-none absolute -right-20 top-1/3 h-[500px] w-[500px] rounded-full bg-cyan-500/15 blur-[120px] dark:bg-indigo-600/20" />
      <div className="pointer-events-none absolute bottom-0 left-1/3 h-[400px] w-[400px] rounded-full bg-purple-500/10 blur-[100px] dark:bg-blue-900/20" />

      {/* Floating Modern Header */}
      <header className="sticky top-4 z-40 mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white/75 p-3 shadow-lg shadow-slate-900/5 backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/75 dark:shadow-black/20">
          <div className="flex items-center gap-3.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 text-white shadow-md shadow-blue-500/25">
              <DhanwantariMark className="h-6 w-6" animated />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display text-base font-extrabold tracking-tight text-slate-900 dark:text-white">
                  i-Dhanwantari
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60">
                  v1.0
                </span>
              </div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-600 dark:text-blue-400">
                ENT Clinical Portal
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-1.5 rounded-xl border border-slate-200/80 bg-slate-100/60 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:border-slate-800/80 dark:bg-slate-800/60 dark:text-slate-300 md:flex">
              <Building2 className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              <span>{hi ? 'कमांड अस्पताल (SC), पुणे' : 'Command Hospital (SC), Pune'}</span>
            </div>

            <button
              onClick={() => setLocale(locale === 'en' ? 'hi' : 'en')}
              className="flex min-h-0 items-center gap-1.5 rounded-xl border border-slate-200/80 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm transition-all hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              aria-label="Toggle language"
            >
              <Languages className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              <span>{locale === 'en' ? 'English' : 'हिंदी'}</span>
            </button>
            <button
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200/80 bg-white text-slate-700 shadow-sm transition-all hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              aria-label="Toggle theme"
            >
              {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4 text-amber-400" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Grid Section */}
      <main className="relative z-10 mx-auto grid max-w-6xl grid-cols-1 items-start gap-8 px-4 pb-12 pt-8 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:pt-12">
        {/* Left Column: Hero Title & Key Features */}
        <section className="space-y-6 lg:pr-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1.5 text-xs font-bold text-emerald-800 shadow-sm backdrop-blur-md dark:border-emerald-500/40 dark:bg-emerald-950/40 dark:text-emerald-300">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
            </span>
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>{hi ? 'ABDM-संगत सुरक्षित पोर्टल प्रवेश' : 'Secure ABDM-aligned clinical portal access'}</span>
          </div>

          <div className="space-y-3">
            <h1 className="font-display text-4xl font-extrabold leading-[1.15] tracking-tight text-slate-900 dark:text-white sm:text-5xl lg:text-[2.75rem]">
              {hi ? (
                <>
                  <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 bg-clip-text text-transparent">
                    ENT क्लिनिकल
                  </span>{' '}
                  एवं रोगी सेवा पोर्टल
                </>
              ) : (
                <>
                  <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 bg-clip-text text-transparent">
                    ENT Clinical
                  </span>{' '}
                  & Patient Care Portal
                </>
              )}
            </h1>
            <p className="max-w-xl text-base leading-relaxed text-slate-600 dark:text-slate-300">
              {hi
                ? 'ईएनटी विशेषज्ञ, ऑडियोलॉजिस्ट, या रोगी (सचिन श्रीवास्तव) के रूप में प्रवेश करें। सम्पूर्ण डिजिटल स्वास्थ्य सेवा।'
                : 'Select your role to launch the ENT Specialist Portal, Audiologist Suite, or Patient Recovery Dashboard.'}
            </p>
          </div>

          {/* Key Feature Pills Grid */}
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              {
                icon: LockKeyhole,
                label: hi ? 'निजी प्रवेश' : 'Private Access',
                sub: hi ? '256-बिट एन्क्रिप्शन' : 'Role Isolated',
                color: 'text-blue-600 dark:text-blue-400',
                bg: 'bg-blue-50 dark:bg-blue-950/50',
              },
              {
                icon: Smartphone,
                label: hi ? 'मोबाइल तैयार' : 'Mobile Ready',
                sub: hi ? 'रेस्पॉन्सिव PWA' : 'Multi-device',
                color: 'text-purple-600 dark:text-purple-400',
                bg: 'bg-purple-50 dark:bg-purple-950/50',
              },
              {
                icon: BadgeCheck,
                label: hi ? 'क्लिनिकल गाइड' : 'Clinical Guides',
                sub: hi ? 'साक्ष्य आधारित' : 'ABDM Compliant',
                color: 'text-emerald-600 dark:text-emerald-400',
                bg: 'bg-emerald-50 dark:bg-emerald-950/50',
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.label}
                  className="group rounded-2xl border border-slate-200/80 bg-white/80 p-3.5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md dark:border-slate-800/80 dark:bg-slate-900/80 dark:hover:border-slate-700"
                >
                  <div className="flex items-center gap-3">
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${item.bg} ${item.color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-100">{item.label}</p>
                      <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400">{item.sub}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Live Telemetry / Institution Banner */}
          <div className="rounded-2xl border border-blue-200/70 bg-gradient-to-br from-blue-50/80 via-white to-cyan-50/60 p-4 shadow-sm backdrop-blur-sm dark:border-blue-900/50 dark:from-blue-950/40 dark:via-slate-900/50 dark:to-cyan-950/30">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm">
                <Activity className="h-4 w-4" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-blue-950 dark:text-blue-200">
                    {hi ? 'नैदानिक प्रणाली स्थिति' : 'System Telemetry & Access Status'}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="h-3 w-3" />
                    {hi ? 'सक्रिय' : 'Online'}
                  </span>
                </div>
                <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                  {hi
                    ? 'कमांड अस्पताल ईएनटी विभाग द्वारा समर्थित। शुद्ध टोन ऑडियोमेट्री, सर्जरी रोस्टर एवं ई-परामर्श डेटा सिंक।'
                    : 'Command Hospital ENT Suite enabled. Real-time PTA Audiometry, Surgical Roster & HIS Consult sync.'}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Right Column: Portal Selector Glass Card */}
        <section className="relative overflow-hidden rounded-3xl border border-slate-200/90 bg-white/90 p-5 shadow-2xl shadow-slate-950/10 backdrop-blur-xl dark:border-slate-800/90 dark:bg-slate-900/90 dark:shadow-black/40 sm:p-7">
          {/* Top subtle highlight border */}
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-500" />

          {/* User Welcome Greeting */}
          <div className="mb-5 flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800/80">
            <div>
              <span className="text-[11px] font-extrabold uppercase tracking-widest text-blue-600 dark:text-blue-400">
                {hi ? 'पोर्टल का चयन करें' : 'Select Portal Workspace'}
              </span>
              <h2 className="mt-0.5 font-display text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                {hi ? 'स्वागत है, सचिन श्रीवास्तव' : 'Welcome, Sachin Srivastava'}
              </h2>
            </div>
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 font-bold text-white shadow-md shadow-blue-600/25">
              SS
            </div>
          </div>

          {/* Role Cards List */}
          <div className="space-y-3">
            {roleCards.map((item) => {
              const Icon = item.icon;
              const active = role === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setRole(item.id)}
                  className={`group relative w-full rounded-2xl p-4 text-left transition-all duration-200 ${
                    active
                      ? `${item.activeBorder} shadow-md`
                      : 'border border-slate-200/80 bg-white hover:border-slate-300 hover:shadow-sm dark:border-slate-800/80 dark:bg-slate-900/80 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start gap-3.5">
                    {/* Icon Container */}
                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-105 ${
                        active
                          ? item.activeIconBg
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>

                    {/* Card Details */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-white text-sm sm:text-base">
                          {item.title}
                        </span>
                        <span
                          className={`hidden sm:inline-flex rounded-md border px-1.5 py-0.5 text-[9px] font-extrabold tracking-wider ${item.badgeStyle}`}
                        >
                          {hi ? item.badgeHi : item.badgeEn}
                        </span>
                      </div>

                      <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                        {item.body}
                      </p>

                      {/* Feature Tags */}
                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {item.tags.map((tag) => (
                          <span
                            key={tag}
                            className={`rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors ${
                              active
                                ? 'bg-blue-100/70 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                            }`}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Radio Button */}
                    <div className="mt-1 shrink-0">
                      {active ? (
                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-white shadow-md shadow-blue-600/40 ring-2 ring-blue-500/30">
                          <Check className="h-3 w-3 stroke-[3]" />
                        </div>
                      ) : (
                        <div className="h-5 w-5 rounded-full border-2 border-slate-300 transition-colors group-hover:border-slate-400 dark:border-slate-700" />
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Demo Access Code Box */}
          <div className="mt-5 flex items-center justify-between rounded-2xl border border-slate-200/80 bg-slate-50/80 p-3 backdrop-blur-sm dark:border-slate-800/80 dark:bg-slate-950/60">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                <LockKeyhole className="h-4 w-4" />
              </div>
              <div>
                <span className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {hi ? 'डेमो एक्सेस कोड' : 'Demo Access Code'}
                </span>
                <span className="font-mono text-xs font-bold tracking-wider text-slate-800 dark:text-slate-200">
                  ENT-CARE-2026
                </span>
              </div>
            </div>

            <button
              onClick={handleCopyCode}
              type="button"
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm transition-all hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-emerald-600 dark:text-emerald-400">{hi ? 'कॉपी हुआ' : 'Copied'}</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                  <span>{hi ? 'कॉपी करें' : 'Copy'}</span>
                </>
              )}
            </button>
          </div>

          {/* Enter Workspace CTA Button */}
          <button
            onClick={() => onEnter(role)}
            className="group relative mt-5 flex w-full items-center justify-center gap-2.5 overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 px-6 py-4 text-sm font-extrabold text-white shadow-xl shadow-blue-600/25 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-blue-600/40 active:translate-y-0"
          >
            <Sparkles className="h-4 w-4 text-blue-200" />
            <span>{getButtonText()}</span>
            <ArrowRight className="h-4.5 w-4.5 transition-transform duration-200 group-hover:translate-x-1" />
          </button>

          {/* Emergency Notice */}
          <p className="mt-4 text-center text-[11px] leading-relaxed text-slate-400 dark:text-slate-500">
            {hi
              ? 'आपात स्थिति में ऐप का इंतज़ार न करें। नजदीकी आपातकालीन सेवा या ENT हेल्पलाइन से संपर्क करें।'
              : 'In an emergency, do not wait for the app. Contact local emergency care or the ENT helpline immediately.'}
          </p>
        </section>
      </main>
    </div>
  );
};

