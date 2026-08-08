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
        const cache = await caches.open('idhanwantari-v3');
        await cache.addAll([
          '/',
          '/care-plan',
          '/patient-education',
          '/audiologist',
          '/settings',
          '/symptom-log',
          '/self-assessment',
          '/rehab/vestibular',
          '/rehab/sinus',
          '/rehab/otology',
          '/rehab/tinnitus',
          '/rehab/voice',
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

    if (role === 'audiologist') {
      window.location.href = '/audiologist';
    } else if (role === 'ent_specialist') {
      window.location.href = '/schemes';
    }
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
