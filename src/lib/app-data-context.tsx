'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

interface CatalogueData {
  harmAlerts: any[];
  skillsGuides: any[];
  entitlements: any[];
  decisionAids: any[];
  riskDisclosures: any[];
  stomaCards: any[];
  patientStories: any[];
}

interface AppDataContextValue {
  // Accessibility & locale
  vestibularMode: boolean;
  setVestibularMode: (v: boolean) => void;
  hearingMode: boolean;
  setHearingMode: (v: boolean) => void;
  locale: 'en' | 'hi';
  setLocale: (v: 'en' | 'hi') => void;
  readingLevel: 'grade6' | 'standard';
  setReadingLevel: (v: 'grade6' | 'standard') => void;
  theme: 'light' | 'dark';
  setTheme: (v: 'light' | 'dark') => void;

  // Orders / care plan
  orders: any[];
  selectedOrderId: string;
  setSelectedOrderId: (id: string) => void;
  orderDetails: any;
  loadingOrder: boolean;
  orderError: string | null;
  handleReleaseEmbargo: (id: string) => void;
  handleSignReceipt: () => void;
  sigSigned: boolean;

  // Catalogue
  catalogueData: CatalogueData;

  // NPO calculator
  surgeryTime: string;
  setSurgeryTime: (t: string) => void;
  npoTimes: { solidTime: string; liquidTime: string };

  // Author studio
  topics: any[];
  newTopic: any;
  setNewTopic: (t: any) => void;
  handleCreateTopic: (e: React.FormEvent) => void;
  authorMsg: string | null;
}

const AppDataContext = createContext<AppDataContextValue | null>(null);

export function useAppData() {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error('useAppData must be used within AppDataProvider');
  return ctx;
}

export const AppDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [vestibularMode, setVestibularMode] = useState(false);
  const [hearingMode, setHearingMode] = useState(true);
  const [locale, setLocaleState] = useState<'en' | 'hi'>('hi');
  const [readingLevel, setReadingLevel] = useState<'grade6' | 'standard'>('grade6');
  const [theme, setThemeState] = useState<'light' | 'dark'>('light');

  const [orders, setOrders] = useState<any[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string>('');
  const [orderDetails, setOrderDetails] = useState<any>(null);
  const [loadingOrder, setLoadingOrder] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);

  const [catalogueData, setCatalogueData] = useState<CatalogueData>({
    harmAlerts: [],
    skillsGuides: [],
    entitlements: [],
    decisionAids: [],
    riskDisclosures: [],
    stomaCards: [],
    patientStories: [],
  });

  const [sigSigned, setSigSigned] = useState(false);
  const [surgeryTime, setSurgeryTime] = useState<string>('09:00');

  const [topics, setTopics] = useState<any[]>([]);
  const [newTopic, setNewTopic] = useState({
    code: 'TOPIC-RHINO-01',
    title: 'FESS & Sinus Douching Guide',
    description: 'Functional endoscopic sinus surgery post-op sinus douching.',
    topicType: 'procedure',
    subspeciality: 'rhinology',
    snomedCode: '173874004',
    icdCode: 'J32.9',
  });
  const [authorMsg, setAuthorMsg] = useState<string | null>(null);

  // Restore persisted theme + locale preferences
  useEffect(() => {
    const storedTheme = window.localStorage.getItem('id-theme') as 'light' | 'dark' | null;
    const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
    const initialTheme = storedTheme || (prefersDark ? 'dark' : 'light');
    setThemeState(initialTheme);
    document.documentElement.classList.toggle('dark', initialTheme === 'dark');

    const storedLocale = window.localStorage.getItem('id-locale') as 'en' | 'hi' | null;
    if (storedLocale) setLocaleState(storedLocale);
  }, []);

  const setTheme = (v: 'light' | 'dark') => {
    setThemeState(v);
    document.documentElement.classList.toggle('dark', v === 'dark');
    window.localStorage.setItem('id-theme', v);
  };

  const setLocale = (v: 'en' | 'hi') => {
    setLocaleState(v);
    window.localStorage.setItem('id-locale', v);
  };

  useEffect(() => {
    fetchOrders();
    fetchTopics();
    fetchCatalogue();
  }, []);

  useEffect(() => {
    if (selectedOrderId) {
      loadOrderDetails(selectedOrderId);
    }
  }, [selectedOrderId]);

  const fetchOrders = async () => {
    try {
      const res = await fetch('/api/orders');
      const data = await res.json();
      if (data.success && data.orders.length > 0) {
        setOrders(data.orders);
        setSelectedOrderId(data.orders[0].id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchCatalogue = async () => {
    try {
      const res = await fetch('/api/catalogue');
      const data = await res.json();
      if (data.success) {
        setCatalogueData({
          harmAlerts: data.harmAlerts || [],
          skillsGuides: data.skillsGuides || [],
          entitlements: data.entitlements || [],
          decisionAids: data.decisionAids || [],
          riskDisclosures: data.riskDisclosures || [],
          stomaCards: data.stomaCards || [],
          patientStories: data.patientStories || [],
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchTopics = async () => {
    try {
      const res = await fetch('/api/topics');
      const data = await res.json();
      if (data.success) {
        setTopics(data.topics);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadOrderDetails = async (id: string) => {
    setLoadingOrder(true);
    setOrderError(null);
    try {
      const res = await fetch(`/api/orders/${id}`);
      const data = await res.json();
      if (data.success) {
        setOrderDetails(data.order);
      } else {
        setOrderDetails(null);
        setOrderError(data.error || 'Failed to load order');
      }
    } catch (e: any) {
      setOrderError(e.message);
    } finally {
      setLoadingOrder(false);
    }
  };

  const handleReleaseEmbargo = async (orderId: string) => {
    try {
      const res = await fetch(`/api/orders/${orderId}/release`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ practitionerHpr: 'HPR-IN-908122' }),
      });
      const data = await res.json();
      if (data.success) {
        fetchOrders();
        loadOrderDetails(orderId);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSignReceipt = async () => {
    if (!orderDetails) return;
    try {
      const res = await fetch(`/api/orders/${orderDetails.id}/acknowledge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signatureText: `Patient MRN ${orderDetails.patientRef?.mrn} (Patient Digital Consent)`,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSigSigned(true);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthorMsg(null);
    try {
      const res = await fetch('/api/topics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTopic),
      });
      const data = await res.json();
      if (data.success) {
        setAuthorMsg('Topic created and passed publish-gate checks successfully!');
        fetchTopics();
      } else {
        setAuthorMsg(`Publish-Gate Failure: ${data.error}`);
      }
    } catch (e: any) {
      setAuthorMsg(`Error: ${e.message}`);
    }
  };

  const calculateNPO = () => {
    const [h, m] = surgeryTime.split(':').map(Number);
    let solidH = h - 8;
    if (solidH < 0) solidH += 24;
    let liquidH = h - 2;
    if (liquidH < 0) liquidH += 24;

    const formatT = (hour: number) => {
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const formattedH = hour % 12 || 12;
      return `${formattedH}:${m < 10 ? '0' + m : m} ${ampm}`;
    };

    return { solidTime: formatT(solidH), liquidTime: formatT(liquidH) };
  };

  const value: AppDataContextValue = {
    vestibularMode,
    setVestibularMode,
    hearingMode,
    setHearingMode,
    locale,
    setLocale,
    readingLevel,
    setReadingLevel,
    theme,
    setTheme,
    orders,
    selectedOrderId,
    setSelectedOrderId,
    orderDetails,
    loadingOrder,
    orderError,
    handleReleaseEmbargo,
    handleSignReceipt,
    sigSigned,
    catalogueData,
    surgeryTime,
    setSurgeryTime,
    npoTimes: calculateNPO(),
    topics,
    newTopic,
    setNewTopic,
    handleCreateTopic,
    authorMsg,
  };

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
};
