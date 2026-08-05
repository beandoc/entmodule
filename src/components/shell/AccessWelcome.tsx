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
} from 'lucide-react';
import { useAppData } from '@/lib/app-data-context';
import { DhanwantariMark } from './DhanwantariMark';

export type AccessRole = 'patient' | 'caregiver';

export const AccessWelcome: React.FC<{ onEnter: (role: AccessRole) => void }> = ({ onEnter }) => {
  const { locale, setLocale, theme, setTheme } = useAppData();
  const [role, setRole] = useState<AccessRole>('patient');
  const hi = locale === 'hi';

  const roleCards = [
    {
      id: 'patient' as const,
      icon: UserRound,
      title: hi ? 'मैं रोगी हूँ' : 'I am the patient',
      body: hi
        ? 'अपना रिकवरी प्लान, लक्षण लॉग, गाइड और आपातकालीन कार्ड देखें।'
        : 'Open your recovery plan, symptom log, care guides, and emergency card.',
    },
    {
      id: 'caregiver' as const,
      icon: HeartHandshake,
      title: hi ? 'मैं देखभालकर्ता हूँ' : 'I am a caregiver',
      body: hi
        ? 'अनुमति के साथ देखभाल निर्देश, चेतावनी संकेत और दैनिक सहायता कार्य देखें।'
        : 'View care instructions, warning signs, and daily support tasks with consent.',
    },
  ];

  return (
    <div className={`min-h-screen bg-[var(--bg-primary)] text-slate-950 dark:text-white ${locale === 'hi' ? 'lang-hi' : ''}`}>
      <header className="absolute inset-x-0 top-0 z-10 px-4 sm:px-8 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-blue-600 dark:text-blue-300">
              <DhanwantariMark className="h-9 w-9" />
            </span>
            <div>
              <p className="font-display text-base font-bold leading-tight">i-Dhanwantari</p>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-blue-700 dark:text-blue-300">
                ENT Patient Care
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setLocale(locale === 'en' ? 'hi' : 'en')}
              className="btn-secondary min-h-0 w-auto px-3 py-2 text-xs"
              aria-label="Toggle language"
            >
              <Languages className="h-4 w-4" />
              {locale === 'en' ? 'EN' : 'हि'}
            </button>
            <button
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              className="btn-secondary min-h-0 w-auto px-3 py-2"
              aria-label="Toggle theme"
            >
              {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4 text-amber-400" />}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto grid min-h-screen max-w-6xl grid-cols-1 items-center gap-8 px-4 pb-8 pt-24 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:pt-16">
        <section className="space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[11px] font-bold text-blue-800 dark:border-blue-900/70 dark:bg-blue-950/35 dark:text-blue-200">
            <ShieldCheck className="h-3.5 w-3.5" />
            {hi ? 'ABDM-संगत सुरक्षित देखभाल प्रवेश' : 'Secure ABDM-aligned care access'}
          </div>

          <div className="max-w-2xl space-y-4">
            <h1 className="font-display text-3xl font-bold leading-tight tracking-tight sm:text-5xl">
              {hi ? 'आपकी ENT रिकवरी, सुरक्षित और सरल।' : 'Your ENT recovery, safely in one place.'}
            </h1>
            <p className="max-w-xl text-sm leading-6 text-slate-600 dark:text-slate-300 sm:text-base">
              {hi
                ? 'रोगी या देखभालकर्ता के रूप में जारी रखें। आपका केयर प्लान, दैनिक लक्षण, गाइड और आपातकालीन जानकारी भूमिका के अनुसार व्यवस्थित होगी।'
                : 'Continue as a patient or caregiver. Your care plan, daily symptoms, guides, and emergency information will open in a role-aware workspace.'}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { icon: LockKeyhole, label: hi ? 'निजी प्रवेश' : 'Private access' },
              { icon: Smartphone, label: hi ? 'मोबाइल तैयार' : 'Mobile ready' },
              { icon: BadgeCheck, label: hi ? 'क्लिनिकल गाइड' : 'Clinical guides' },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="clinical-panel flex items-center gap-3 p-3">
                  <Icon className="h-4 w-4 text-blue-600 dark:text-blue-300" />
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{item.label}</span>
                </div>
              );
            })}
          </div>
        </section>

        <section className="clinical-card p-4 sm:p-6">
          <div className="mb-5">
            <p className="clinical-kicker">{hi ? 'भूमिका चुनें' : 'Choose access role'}</p>
            <h2 className="mt-1 font-display text-xl font-bold text-slate-950 dark:text-white">
              {hi ? 'स्वागत है, सचिन' : 'Welcome, Sachin'}
            </h2>
            <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
              {hi
                ? 'यह डेमो प्रवेश है। वास्तविक उपयोग में ABHA/OTP या अस्पताल MRN सत्यापन जोड़ा जाएगा।'
                : 'This is a demo access step. In production, connect this to ABHA/OTP or hospital MRN verification.'}
            </p>
          </div>

          <div className="space-y-3">
            {roleCards.map((item) => {
              const Icon = item.icon;
              const active = role === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setRole(item.id)}
                  className={`w-full rounded-2xl border p-4 text-left transition-all ${
                    active
                      ? 'border-blue-300 bg-blue-50 shadow-sm ring-2 ring-blue-500/10 dark:border-blue-800 dark:bg-blue-950/30'
                      : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                        active ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-bold text-slate-950 dark:text-white">{item.title}</span>
                      <span className="mt-1 block text-xs leading-5 text-slate-500 dark:text-slate-400">{item.body}</span>
                    </span>
                    <span
                      className={`mt-1 h-4 w-4 rounded-full border ${
                        active ? 'border-blue-600 bg-blue-600 shadow-[inset_0_0_0_3px_white]' : 'border-slate-300 dark:border-slate-600'
                      }`}
                    />
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/50">
            <label className="clinical-kicker block" htmlFor="demo-code">
              {hi ? 'डेमो एक्सेस कोड' : 'Demo access code'}
            </label>
            <input
              id="demo-code"
              value="ENT-CARE-2026"
              readOnly
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-bold tracking-wide text-slate-800 outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </div>

          <button onClick={() => onEnter(role)} className="btn-primary mt-5 w-full px-5 text-sm">
            {role === 'patient'
              ? hi
                ? 'रोगी डैशबोर्ड खोलें'
                : 'Enter Patient Dashboard'
              : hi
              ? 'देखभालकर्ता दृश्य खोलें'
              : 'Enter Caregiver View'}
            <ArrowRight className="h-4 w-4" />
          </button>

          <p className="mt-4 text-center text-[11px] leading-5 text-slate-400">
            {hi
              ? 'आपात स्थिति में ऐप का इंतज़ार न करें। नजदीकी आपातकालीन सेवा या ENT हेल्पलाइन से संपर्क करें।'
              : 'In an emergency, do not wait for the app. Contact local emergency care or the ENT helpline immediately.'}
          </p>
        </section>
      </main>
    </div>
  );
};
