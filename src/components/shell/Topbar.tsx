'use client';

import React, { useState, useRef, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import {
  Menu, Search, Sun, Moon, Languages, ShieldAlert, ChevronDown, Eye, Volume2, BookOpen, Calendar, LogOut, PanelLeft, PanelLeftClose
} from 'lucide-react';
import { allNavItems } from '@/lib/nav-registry';
import { useAppData } from '@/lib/app-data-context';

interface TopbarProps {
  onMenuClick: () => void;
  onSearchClick: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({
  onMenuClick,
  onSearchClick,
  isCollapsed,
  onToggleCollapse,
}) => {
  const pathname = usePathname();
  const {
    locale, setLocale, theme, setTheme,
    vestibularMode, setVestibularMode, hearingMode, setHearingMode,
    readingLevel, setReadingLevel
  } = useAppData();

  const [a11yOpen, setA11yOpen] = useState(false);
  const a11yRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (a11yRef.current && !a11yRef.current.contains(e.target as Node)) setA11yOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const current = allNavItems.find((i) => i.href === pathname);
  const hi = locale === 'hi';
  const pageTitle = current ? (hi ? current.labelHi : current.label) : (hi ? 'मुख्य पृष्ठ' : 'Home');

  const todayDate = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  });

  return (
    <header className="sticky top-0 z-40 bg-[#1b3662] text-white border-b border-blue-900/60 shadow-md">
      <div className="flex items-center gap-3 px-4 sm:px-6 py-2.5 max-w-7xl mx-auto w-full">
        {/* Mobile Menu Button */}
        <button
          onClick={onMenuClick}
          className="lg:hidden text-slate-200 hover:text-white p-2 rounded-xl hover:bg-blue-900/60 transition-colors"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Sidebar Auto-Collapse Toggle Button (Desktop) */}
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="hidden lg:flex items-center gap-1 text-slate-200 hover:text-white p-1.5 rounded-xl hover:bg-blue-900/60 transition-colors"
            title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {isCollapsed ? <PanelLeft className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
          </button>
        )}

        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
          <span className="text-slate-300">Home</span>
          {pathname !== '/' && (
            <>
              <span className="text-slate-400">&gt;</span>
              <span className="text-white font-bold">{pageTitle}</span>
            </>
          )}
        </div>

        <div className="flex-1" />

        {/* Global Search Button */}
        <button
          onClick={onSearchClick}
          className="hidden sm:flex items-center gap-2 text-xs text-slate-300 bg-blue-950/60 border border-blue-800/80 rounded-xl px-3 py-1.5 hover:border-sky-400 transition-all w-52"
        >
          <Search className="w-3.5 h-3.5 text-slate-400" />
          <span className="flex-1 text-left">{hi ? 'मेनू आइटम खोजें...' : 'Search items...'}</span>
          <kbd className="text-[9px] font-mono bg-blue-900 text-slate-300 px-1.5 py-0.5 rounded">⌘K</kbd>
        </button>

        {/* Live Date Pill */}
        <div className="hidden md:flex items-center gap-1.5 bg-blue-950/70 border border-blue-800/80 text-slate-200 text-xs font-semibold px-3 py-1.5 rounded-xl">
          <Calendar className="w-3.5 h-3.5 text-sky-400" />
          <span>{todayDate}</span>
        </div>

        {/* Language Switcher */}
        <button
          onClick={() => setLocale(locale === 'en' ? 'hi' : 'en')}
          className="flex items-center gap-1 text-xs font-bold text-slate-200 bg-blue-950/70 border border-blue-800/80 rounded-xl px-2.5 py-1.5 hover:border-sky-400 transition-all"
        >
          <Languages className="w-3.5 h-3.5 text-sky-300" />
          <span>{locale === 'en' ? 'EN' : 'हि'}</span>
        </button>

        {/* Theme Toggle */}
        <button
          onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
          className="p-1.5 text-slate-200 bg-blue-950/70 border border-blue-800/80 rounded-xl hover:border-sky-400 transition-all"
          title="Toggle Dark/Light Mode"
        >
          {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4 text-amber-400" />}
        </button>

        {/* Logout / Exit Button (Matching Screenshot Top Right) */}
        <button
          onClick={() => alert('Logged out safely from Command Hospital Patient Session')}
          className="hidden sm:flex items-center gap-1.5 text-xs font-semibold bg-blue-950/80 hover:bg-red-900/60 border border-blue-800/80 hover:border-red-700/60 text-slate-200 hover:text-white px-3 py-1.5 rounded-xl transition-all"
        >
          <LogOut className="w-3.5 h-3.5 text-red-300" />
          <span>Logout</span>
        </button>
      </div>
    </header>
  );
};
