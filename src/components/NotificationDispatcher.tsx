'use client';

import React, { useState } from 'react';
import { MessageSquare, Send, CheckCircle2, Phone, Clock, Sparkles, Smartphone, ArrowRight } from 'lucide-react';
import { useAppData } from '@/lib/app-data-context';

interface Template {
  id: string;
  dayLabel: string;
  dayLabelHi: string;
  title: string;
  titleHi: string;
  messageEn: string;
  messageHi: string;
  channel: 'whatsapp' | 'sms';
}

const TEMPLATES: Template[] = [
  {
    id: 't-preop',
    dayLabel: 'Day -1 Pre-Op',
    dayLabelHi: 'दिन -1 सर्जरी-पूर्व',
    title: 'Pre-Op Fasting Reminder (NPO)',
    titleHi: 'सर्जरी-पूर्व उपवास चेतावनी',
    messageEn: 'Hello Sachin, reminder for tomorrow’s ENT surgery: Stop solid food 8 hours before arrival. Sip clear water only up to 2 hours before.',
    messageHi: 'नमस्ते सचिन, कल की ईएनटी सर्जरी के लिए रिमाइंडर: आने से 8 घंटे पहले ठोस भोजन बंद करें। केवल 2 घंटे पहले तक थोड़ा पानी पिएं।',
    channel: 'whatsapp',
  },
  {
    id: 't-water',
    dayLabel: 'Day 1 Post-Op',
    dayLabelHi: 'दिन 1 सर्जरी-बाद',
    title: 'Water Precaution Alert',
    titleHi: 'जल सावधानी चेतावनी',
    messageEn: 'Care Team Alert: Do not allow water inside your operated ear. Use Vaseline-coated cotton when bathing. Call +91 11 2658 8500 if pain rises.',
    messageHi: 'केयर टीम चेतावनी: अपने ऑपरेशन वाले कान के अंदर पानी न जाने दें। नहाते समय वैसलीन लगी रुई का इस्तेमाल करें।',
    channel: 'whatsapp',
  },
  {
    id: 't-symptom',
    dayLabel: 'Day 4 Recovery',
    dayLabelHi: 'दिन 4 रिकवरी',
    title: 'Daily Symptom Log Nudge',
    titleHi: 'दैनिक लक्षण लॉग रिमाइंड',
    messageEn: 'Hi Sachin, please spend 1 min logging today’s pain & hearing scores to keep your recovery trajectory updated: https://idhanwantari.org/symptom-log',
    messageHi: 'नमस्ते सचिन, अपनी रिकवरी को अपडेट रखने के लिए आज के दर्द और सुनने के स्कोर दर्ज करें: https://idhanwantari.org/symptom-log',
    channel: 'whatsapp',
  },
  {
    id: 't-douching',
    dayLabel: 'Day 7 Sinus Care',
    dayLabelHi: 'दिन 7 साइनस देखभाल',
    title: 'Sinus Saline Douching Guide',
    titleHi: 'साइनस सलाइन डूशिंग गाइड',
    messageEn: 'FESS Recovery Reminder: Continue 3x daily saline sinus douching today. Watch step-by-step video guide: https://idhanwantari.org/guides',
    messageHi: 'एफईएसएस रिकवरी रिमाइंडर: आज दिन में 3 बार सलाइन साइनस डूशिंग जारी रखें। वीडियो गाइड देखें: https://idhanwantari.org/guides',
    channel: 'sms',
  },
];

export const NotificationDispatcher: React.FC = () => {
  const { locale, orders } = useAppData();
  const hi = locale === 'hi';
  const primaryOrder = orders[0];

  const [phone, setPhone] = useState('+919876543210');
  const [selectedTemplate, setSelectedTemplate] = useState<Template>(TEMPLATES[2]);
  const [customMessage, setCustomMessage] = useState('');
  const [channel, setChannel] = useState<'whatsapp' | 'sms'>('whatsapp');
  const [sending, setSending] = useState(false);
  const [sentLog, setSentLog] = useState<any[]>([]);

  const handleSelectTemplate = (t: Template) => {
    setSelectedTemplate(t);
    setChannel(t.channel);
    setCustomMessage(hi ? t.messageHi : t.messageEn);
  };

  const handleSend = async () => {
    const textToSend = customMessage || (hi ? selectedTemplate.messageHi : selectedTemplate.messageEn);
    setSending(true);

    try {
      const firstStepId = primaryOrder?.orderSteps?.[0]?.id || 'step_sample_123';
      const res = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderStepId: firstStepId,
          patientPhone: phone,
          channel,
          messageText: textToSend,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSentLog((prev) => [data, ...prev]);
      }
    } catch (err) {
      console.error('Failed to dispatch notification:', err);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-white dark:bg-ink-900 border border-slate-200 dark:border-ink-800 rounded-3xl p-6 shadow-xl space-y-6">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-ink-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-teal-50 dark:bg-ink-800 text-teal-600 dark:text-teal-400 flex items-center justify-center">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white">
              {hi ? 'व्हाट्सएप / एसएमएस स्वचालित प्रेषक' : 'WhatsApp & SMS Delivery Service (Push Reminders)'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {hi
                ? 'निधारित रिकवरी चरणों के लिए सक्रिय पुश संदेश — डेटाबेस के साथ समन्वयित।'
                : 'Automated delivery service for scheduled order steps & daily recovery nudges.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={async () => {
              setSending(true);
              try {
                const res = await fetch('/api/notifications/dispatch-scheduled', { method: 'POST' });
                const data = await res.json();
                if (data.dispatchedSteps) {
                  setSentLog((prev) => [...data.dispatchedSteps, ...prev]);
                }
              } catch (e) {
                console.error('Failed to trigger auto push dispatch:', e);
              } finally {
                setSending(false);
              }
            }}
            disabled={sending}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition-all disabled:opacity-50"
          >
            <Clock className="w-3.5 h-3.5" />
            {hi ? 'स्वचालित पुश इंजन चलाएं' : 'Run Scheduled Push Engine'}
          </button>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-mono">
            <Sparkles className="w-3.5 h-3.5" /> Push Active
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Template Selector */}
        <div className="space-y-3">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
            {hi ? 'निर्धारित चरण टेम्पलेट चुनें:' : 'Select Scheduled Step Template:'}
          </label>

          <div className="space-y-2">
            {TEMPLATES.map((t) => {
              const selected = selectedTemplate.id === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => handleSelectTemplate(t)}
                  className={`w-full text-left p-3.5 rounded-2xl border transition-all ${
                    selected
                      ? 'bg-teal-50 dark:bg-ink-800 border-teal-500 dark:border-teal-400 shadow-sm ring-1 ring-teal-400/30'
                      : 'bg-slate-50/70 dark:bg-ink-950 border-slate-200 dark:border-ink-800 hover:border-teal-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700 dark:text-teal-300 px-2 py-0.5 rounded-md bg-white dark:bg-ink-900 border border-slate-200 dark:border-ink-700">
                      {hi ? t.dayLabelHi : t.dayLabel}
                    </span>
                    <span className="text-[10px] font-mono font-semibold text-slate-400 uppercase">{t.channel}</span>
                  </div>
                  <p className="font-bold text-xs text-slate-900 dark:text-white mt-1.5">{hi ? t.titleHi : t.title}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Message Customizer & Dispatcher */}
        <div className="space-y-4 bg-slate-50/50 dark:bg-ink-950/60 p-4 rounded-2xl border border-slate-200/80 dark:border-ink-800">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
              {hi ? 'चैनल और फोन:' : 'Channel & Recipient Phone:'}
            </label>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setChannel('whatsapp')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                  channel === 'whatsapp' ? 'bg-emerald-600 text-white' : 'bg-slate-200 dark:bg-ink-800 text-slate-600'
                }`}
              >
                WhatsApp
              </button>
              <button
                onClick={() => setChannel('sms')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                  channel === 'sms' ? 'bg-teal-600 text-white' : 'bg-slate-200 dark:bg-ink-800 text-slate-600'
                }`}
              >
                SMS
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-white dark:bg-ink-900 border border-slate-200 dark:border-ink-700 rounded-xl px-3 py-2">
            <Smartphone className="w-4 h-4 text-teal-600 shrink-0" />
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="flex-1 bg-transparent text-xs font-mono font-semibold text-slate-900 dark:text-slate-100 outline-none"
              placeholder="+91 98765 43210"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
              {hi ? 'संदेश पाठ:' : 'Message Content:'}
            </label>
            <textarea
              value={customMessage || (hi ? selectedTemplate.messageHi : selectedTemplate.messageEn)}
              onChange={(e) => setCustomMessage(e.target.value)}
              rows={4}
              className="w-full bg-white dark:bg-ink-900 border border-slate-200 dark:border-ink-700 rounded-xl p-3 text-xs text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <button
            onClick={handleSend}
            disabled={sending}
            className="w-full inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs py-3 rounded-xl shadow-md transition-all"
          >
            {sending ? (
              <span>Sending notification...</span>
            ) : (
              <>
                <Send className="w-4 h-4" />
                {hi ? `भेजें (${channel.toUpperCase()})` : `Send Push Reminder (${channel.toUpperCase()})`}
              </>
            )}
          </button>

          {sentLog.length > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-200 dark:border-ink-800 space-y-2">
              <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Recent Dispatch Log:
              </p>
              {sentLog.slice(0, 2).map((log) => (
                <div key={log.messageId} className="bg-emerald-50 dark:bg-emerald-950/40 p-2.5 rounded-xl text-[11px] text-emerald-900 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800 space-y-1">
                  <div className="flex items-center justify-between font-mono">
                    <span>{log.recipient} ({log.channel})</span>
                    <span>{new Date(log.deliveredAt).toLocaleTimeString()}</span>
                  </div>
                  <p className="truncate font-sans italic">"{log.content}"</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
