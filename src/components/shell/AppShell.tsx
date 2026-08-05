'use client';

import React, { useEffect, useState } from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { CommandSearch } from './CommandSearch';
import { useAppData } from '@/lib/app-data-context';
import { AccessRole, AccessWelcome } from './AccessWelcome';

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [accessRole, setAccessRole] = useState<AccessRole | null>(null);
  const [accessReady, setAccessReady] = useState(false);
  const { vestibularMode, locale } = useAppData();

  const [lowBandwidth, setLowBandwidth] = useState(false);
  const [caching, setCaching] = useState(false);
  const [cachedSuccess, setCachedSuccess] = useState(false);

  useEffect(() => {
    // Keyboard shortcut for Cmd+K search
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    document.addEventListener('keydown', onKeyDown);

    // Track online/offline status
    const updateOnline = () => setIsOffline(!navigator.onLine);
    window.addEventListener('online', updateOnline);
    window.addEventListener('offline', updateOnline);
    setIsOffline(!navigator.onLine);

    // Check low-bandwidth & collapsed settings
    try {
      const storedLb = localStorage.getItem('id-low-bandwidth');
      if (storedLb === 'true') setLowBandwidth(true);
      const storedCollapsed = localStorage.getItem('id-sidebar-collapsed');
      if (storedCollapsed === 'true') setIsCollapsed(true);
      const storedRole = localStorage.getItem('id-access-role') as AccessRole | null;
      if (storedRole === 'patient' || storedRole === 'caregiver') setAccessRole(storedRole);
    } catch {}
    setAccessReady(true);

    // Register Service Worker for PWA offline-first capabilities
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          console.log('[AppShell] PWA ServiceWorker registered with scope:', reg.scope);
        })
        .catch((err) => {
          console.warn('[AppShell] ServiceWorker registration skipped:', err);
        });
    }

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('online', updateOnline);
      window.removeEventListener('offline', updateOnline);
    };
  }, []);

  const toggleCollapse = () => {
    const next = !isCollapsed;
    setIsCollapsed(next);
    try {
      localStorage.setItem('id-sidebar-collapsed', String(next));
    } catch {}
  };

  const toggleLowBandwidth = () => {
    const next = !lowBandwidth;
    setLowBandwidth(next);
    try {
      localStorage.setItem('id-low-bandwidth', String(next));
    } catch {}
  };

  const handleCacheCarePlan = async () => {
    setCaching(true);
    try {
      if ('caches' in window) {
        const cache = await caches.open('idhanwantari-v2');
        await cache.addAll([
          '/',
          '/care-plan',
          '/symptom-log',
          '/self-assessment',
          '/troubleshooting',
          '/emergency',
          '/downloads',
          '/guides',
        ]);
        setCachedSuccess(true);
        setTimeout(() => setCachedSuccess(false), 3000);
      }
    } catch (err) {
      console.warn('Failed to cache care plan:', err);
    } finally {
      setCaching(false);
    }
  };

  const handleEnter = (role: AccessRole) => {
    setAccessRole(role);
    try {
      localStorage.setItem('id-access-role', role);
    } catch {}
  };

  const handleSwitchRole = () => {
    setAccessRole(null);
    try {
      localStorage.removeItem('id-access-role');
    } catch {}
  };

  if (!accessReady) {
    return <div className="min-h-screen bg-[var(--bg-primary)]" />;
  }

  if (!accessRole) {
    return <AccessWelcome onEnter={handleEnter} />;
  }

  return (
    <div className={`min-h-screen bg-[var(--bg-primary)] ${vestibularMode ? 'vestibular-safe' : ''} ${locale === 'hi' ? 'lang-hi' : ''}`}>
      {/* Offline PWA & Low-Bandwidth Status Bar */}
      <div className="bg-white/80 dark:bg-slate-950/90 text-slate-600 dark:text-slate-400 text-[11px] px-4 py-1.5 border-b border-slate-200/80 dark:border-slate-800/90 flex flex-wrap items-center justify-between gap-2 z-50 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <span className="status-pill text-[10px] capitalize">
            {accessRole === 'patient'
              ? (locale === 'hi' ? 'रोगी दृश्य' : 'Patient View')
              : (locale === 'hi' ? 'देखभालकर्ता दृश्य' : 'Caregiver View')}
          </span>
          {isOffline ? (
            <span className="inline-flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-semibold">
              <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-60 animate-ping" /><span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" /></span>
              {locale === 'hi' ? 'ऑफलाइन मोड सक्रिय — केवल सहेजी गई सामग्री प्रदर्शित' : 'Offline PWA Active — Viewing cached care plan & guides'}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-300 font-medium font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              {locale === 'hi' ? 'ऑनलाइन · बीडब्ल्यू: 4जी/वाई-फाई' : 'PWA Ready · Offline Sync Enabled'}
            </span>
          )}

          {lowBandwidth && (
            <span className="status-pill text-[10px]">
              {locale === 'hi' ? 'कम बैंडविड्थ मोड (ऑडियो/टेक्स्ट)' : 'Low-Bandwidth Mode (>2MB Audio/Text Fallback)'}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSwitchRole}
            className="text-[11px] font-semibold px-3 py-1 rounded-full bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors"
          >
            {locale === 'hi' ? 'भूमिका बदलें' : 'Switch Role'}
          </button>

          <button
            onClick={toggleLowBandwidth}
            className={`text-[11px] font-semibold px-3 py-1 rounded-full border transition-colors ${
              lowBandwidth
                ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-800'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            {lowBandwidth
              ? (locale === 'hi' ? 'कम बैंडविड्थ चालू' : 'Low-Bandwidth Active')
              : (locale === 'hi' ? 'कम बैंडविड्थ मोड चालू करें' : 'Enable Low-Bandwidth Mode')}
          </button>

          {!isOffline && (
            <button
              onClick={handleCacheCarePlan}
              disabled={caching}
              className="text-[11px] font-semibold px-3 py-1 rounded-full bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors disabled:opacity-50"
            >
              {caching
                ? (locale === 'hi' ? 'कैश हो रहा है…' : 'Caching Care Plan…')
                : cachedSuccess
                ? (locale === 'hi' ? 'सहेजा गया' : 'Wi-Fi Cached')
                : (locale === 'hi' ? 'वाई-फाई पर केयर प्लान कैश करें' : 'Cache Pathway on Wi-Fi')}
            </button>
          )}
        </div>
      </div>

      <Sidebar
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
        isCollapsed={isCollapsed}
        onToggleCollapse={toggleCollapse}
      />
      <div className={`flex flex-col min-h-screen sidebar-transition ${isCollapsed ? 'lg:pl-20' : 'lg:pl-72'}`}>
        <Topbar
          onMenuClick={() => setMobileOpen(true)}
          onSearchClick={() => setSearchOpen(true)}
          isCollapsed={isCollapsed}
          onToggleCollapse={toggleCollapse}
        />
        <main className="flex-1 px-3 sm:px-5 lg:px-8 py-4 sm:py-6 app-page">{children}</main>
        <footer className="text-center text-[11px] text-slate-400 dark:text-slate-600 py-5 border-t border-slate-200 dark:border-ink-800 font-mono">
          Command Hospital (SC), Pune · i-Dhanwantari ENT Portal · Offline-First PWA · ABDM · HL7 v2 · FHIR R4
        </footer>
      </div>
      <CommandSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
};
