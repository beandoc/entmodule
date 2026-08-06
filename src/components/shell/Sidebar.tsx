'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  X, ChevronDown, ChevronRight, Search, ShieldCheck, PhoneCall,
  User, Calendar, FileCheck, ClipboardList, Stethoscope, HeartPulse,
  Award, Activity, LogOut, PanelLeftClose, PanelLeft, RefreshCw, Layers
} from 'lucide-react';
import { navGroups, clinicianGroup } from '@/lib/nav-registry';
import { useAppData } from '@/lib/app-data-context';

interface SidebarProps {
  mobileOpen: boolean;
  onClose: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  mobileOpen,
  onClose,
  isCollapsed,
  onToggleCollapse,
}) => {
  const pathname = usePathname();
  const { locale, orders } = useAppData();
  const primaryOrder = orders[0];
  const hi = locale === 'hi';
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    myCare: true,
    patient: true,
    clinician: true,
  });

  const toggleGroup = (id: string) => {
    setExpandedGroups((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const content = (
    <div
      className={`flex h-full flex-col bg-[#1b3662] text-slate-100 shadow-2xl sidebar-transition ${
        isCollapsed ? 'w-20' : 'w-72'
      }`}
    >
      {/* Brand Header with Command Hospital & Gunjan Dual Crest */}
      <div className="flex flex-col border-b border-blue-900/60 p-4 bg-[#162d53]">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group" onClick={onClose}>
            {/* Dual Emblem Logos */}
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-full bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300 font-extrabold text-xs shadow-md">
                🎖️
              </div>
              {!isCollapsed && (
                <div className="w-9 h-9 rounded-full bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300 font-bold text-xs shadow-md">
                  💚
                </div>
              )}
            </div>

            {!isCollapsed && (
              <div className="min-w-0">
                <span className="block font-display font-extrabold text-sm tracking-tight text-white uppercase">
                  GUNJAN
                </span>
                <span className="block text-[10px] font-semibold text-sky-300 truncate">
                  Command Hospital (SC), Pune
                </span>
              </div>
            )}
          </Link>

          <button
            onClick={onClose}
            className="lg:hidden text-slate-300 hover:text-white p-1 rounded-lg hover:bg-blue-900/50"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Menu Item Search & Auto-Collapse Toggle */}
      {!isCollapsed && (
        <div className="px-3 pt-3 pb-1 space-y-2">
          {/* Menu Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={hi ? 'मेनू आइटम खोजें...' : 'Search menu items...'}
              className="w-full bg-blue-950/70 border border-blue-800/80 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-slate-400 outline-none focus:border-sky-400 transition-colors"
            />
          </div>

          {/* Collapse All Button */}
          <button
            onClick={onToggleCollapse}
            className="w-full flex items-center justify-center gap-2 py-1.5 rounded-xl bg-blue-900/40 hover:bg-blue-900/70 border border-blue-800/60 text-slate-200 text-xs font-semibold transition-colors"
          >
            <PanelLeftClose className="w-3.5 h-3.5 text-sky-300" />
            <span>{hi ? 'समेकन (Collapse All)' : 'Collapse All'}</span>
          </button>
        </div>
      )}

      {isCollapsed && (
        <div className="p-2 text-center border-b border-blue-900/60">
          <button
            onClick={onToggleCollapse}
            className="p-2 rounded-xl bg-blue-900/50 hover:bg-blue-800/80 text-sky-300 transition-colors"
            title="Expand Sidebar"
          >
            <PanelLeft className="w-5 h-5 mx-auto" />
          </button>
        </div>
      )}

      {/* Navigation Groups Accordion */}
      <nav className="flex-1 overflow-y-auto thin-scroll px-3 py-3 space-y-3">
        {/* Main Home Link */}
        <Link
          href="/"
          onClick={onClose}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
            pathname === '/'
              ? 'bg-[#2b518c] text-white shadow-md border-r-4 border-sky-400'
              : 'text-slate-200 hover:bg-blue-900/50 hover:text-white'
          }`}
        >
          <span className="w-5 h-5 flex items-center justify-center">🏠</span>
          {!isCollapsed && <span className="flex-1">{hi ? 'मुख्य पृष्ठ (Home)' : 'Home'}</span>}
        </Link>

        {navGroups.map((group) => {
          const isExpanded = expandedGroups[group.id] ?? true;
          const filteredItems = group.items.filter((item) =>
            !searchQuery ||
            item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.labelHi.includes(searchQuery)
          );

          if (filteredItems.length === 0) return null;

          return (
            <div key={group.id} className="space-y-1">
              {/* Group Accordion Header */}
              {!isCollapsed ? (
                <button
                  onClick={() => toggleGroup(group.id)}
                  className="w-full flex items-center justify-between px-3 py-1.5 text-[11px] font-bold text-slate-300 hover:text-white uppercase tracking-wider transition-colors"
                >
                  <span className="flex items-center gap-1.5">
                    {hi ? group.titleHi : group.title}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-blue-950 text-sky-300 font-mono">
                      {filteredItems.length}
                    </span>
                    {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                  </span>
                </button>
              ) : null}

              {/* Group Nav Items */}
              {(isCollapsed || isExpanded) && (
                <div className="space-y-1">
                  {filteredItems.map((item) => {
                    const active = pathname === item.href;
                    const Icon = item.icon;

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={onClose}
                        title={isCollapsed ? (hi ? item.labelHi : item.label) : undefined}
                        className={`group flex items-center gap-3 px-3 py-2 rounded-xl text-xs transition-all ${
                          active
                            ? 'bg-[#2b518c] text-white font-bold shadow-sm border-r-4 border-sky-300'
                            : 'text-slate-300 hover:bg-blue-900/50 hover:text-white'
                        }`}
                      >
                        <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-sky-300' : 'text-slate-300 group-hover:text-white'}`} />
                        {!isCollapsed && (
                          <span className="truncate flex-1 font-medium">{hi ? item.labelHi : item.label}</span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {/* Clinician Group */}
        <div className="pt-2 border-t border-blue-900/60">
          {!isCollapsed && (
            <button
              onClick={() => toggleGroup('clinician')}
              className="w-full flex items-center justify-between px-3 py-1.5 text-[11px] font-bold text-slate-300 hover:text-white uppercase tracking-wider"
            >
              <span>{hi ? clinicianGroup.titleHi : clinicianGroup.title}</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          )}

          <div className="space-y-1 mt-1">
            {clinicianGroup.items.map((item) => {
              const active = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={`group flex items-center gap-3 px-3 py-2 rounded-xl text-xs transition-all ${
                    active
                      ? 'bg-[#2b518c] text-white font-bold shadow-sm border-r-4 border-sky-300'
                      : 'text-slate-300 hover:bg-blue-900/50 hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0 text-slate-300" />
                  {!isCollapsed && (
                    <span className="truncate flex-1 font-medium">{hi ? item.labelHi : item.label}</span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Patient Profile Footer */}
      <div className="p-3 border-t border-blue-900/80 bg-[#162d53]">
        {!isCollapsed ? (
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div className="w-9 h-9 rounded-full bg-blue-800 border-2 border-sky-400/60 flex items-center justify-center font-bold text-sm text-white shrink-0 shadow-inner">
              S
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-white truncate">Sachin Srivastava</p>
              <p className="text-[10px] text-slate-400 truncate">
                {hi ? 'टिम्पैनोप्लास्टी रिकवरी · दिन 4' : 'Tympanoplasty Recovery · Day 4'}
              </p>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="inline-flex items-center gap-1 text-[9px] font-bold bg-emerald-900/60 text-emerald-300 border border-emerald-700/60 px-1.5 py-0.5 rounded-full">
                  ✓ {hi ? 'ABHA सत्यापित' : 'ABHA Verified'}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex justify-center">
            <div className="w-9 h-9 rounded-full bg-blue-800 border-2 border-sky-400/60 flex items-center justify-center font-bold text-sm text-white shadow-inner" title="Sachin Srivastava">
              S
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop fixed sidebar with collapse animation */}
      <aside className="hidden lg:block lg:fixed lg:inset-y-0 lg:left-0 lg:z-30">
        {content}
      </aside>

      {/* Mobile drawer with backdrop blur */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[90] lg:hidden">
          <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity" onClick={onClose} />
          <div className="absolute inset-y-0 left-0 w-72 max-w-[85vw] shadow-2xl">{content}</div>
        </div>
      )}
    </>
  );
};
