'use client';

import React, { useEffect, useState } from 'react';
import { Podcast, Play, Pause, Headphones, Volume2, FastForward, FileText, ChevronDown, Sparkles } from 'lucide-react';
import { useAppData } from '@/lib/app-data-context';
import { DhanwantariMark } from '@/components/shell/DhanwantariMark';

interface Episode {
  id: string;
  title: string;
  titleHi: string;
  host: string;
  summary: string;
  summaryHi: string;
  transcript: string;
  transcriptHi: string;
  minutes: number;
}

const EPISODES: Episode[] = [
  {
    id: 'ep1',
    title: 'Living With a Stoma: The First 30 Days',
    titleHi: 'स्टोमा के साथ जीवन: पहले 30 दिन',
    host: 'Dr. Rajesh Sharma, MS (ENT)',
    summary: 'A calm, practical walkthrough of the first month after a laryngectomy — breathing, humidification, and emotional adjustment.',
    summaryHi: 'लैरिंजेक्टॉमी के बाद पहले महीने का शांत, व्यावहारिक विवरण — सांस लेना, नमीकरण और भावनात्मक समायोजन।',
    transcript:
      'Welcome to this episode. In the first thirty days after a laryngectomy, your airway now opens through the stoma in your neck, not your nose or mouth. Keep the area humidified, protect it while bathing, and always carry your emergency wallet card. It is normal to feel overwhelmed at first — most patients find their new routine within two to three weeks.',
    transcriptHi:
      'इस एपिसोड में आपका स्वागत है। लैरिंजेक्टॉमी के बाद पहले तीस दिनों में, आपका वायुमार्ग अब गर्दन के स्टोमा से खुलता है, नाक या मुंह से नहीं। इस क्षेत्र को नम रखें, नहाते समय इसकी सुरक्षा करें, और हमेशा अपना आपातकालीन वॉलेट कार्ड साथ रखें।',
    minutes: 12,
  },
  {
    id: 'ep2',
    title: 'Cochlear Implant vs Hearing Aid: Making the Choice',
    titleHi: 'कॉक्लियर इम्प्लांट बनाम श्रवण यंत्र: विकल्प चुनना',
    host: 'Dr. Meera Nair, Audiologist',
    summary: 'Real numbers, not vague terms — comparing outcomes to help you and your family make an informed decision together.',
    summaryHi: 'अस्पष्ट शब्दों के बजाय वास्तविक आंकड़े — आपको और आपके परिवार को एक सूचित निर्णय लेने में मदद करने के लिए परिणामों की तुलना।',
    transcript:
      'One of the hardest choices ENT patients face is between a cochlear implant and a hearing aid. In this episode we walk through the hundred-person option grids from your decision aid, explain what "uncommon" actually means in exact numbers, and share what past patients wish they had known before deciding.',
    transcriptHi:
      'ईएनटी रोगियों के सामने सबसे कठिन विकल्पों में से एक कॉक्लियर इम्प्लांट और श्रवण यंत्र के बीच है। इस एपिसोड में हम आपकी निर्णय सहायता से सौ-व्यक्ति विकल्प ग्रिड पर चर्चा करते हैं।',
    minutes: 18,
  },
  {
    id: 'ep3',
    title: 'Sinus Surgery Recovery: Douching Without Dread',
    titleHi: 'साइनस सर्जरी रिकवरी: बिना डर के डूशिंग',
    host: 'Dr. Arvind Rao, Rhinology',
    summary: 'A step-by-step audio companion to your FESS recovery guide, with tips for the first uncomfortable week.',
    summaryHi: 'आपकी एफईएसएस रिकवरी गाइड के लिए एक चरण-दर-चरण ऑडियो साथी, पहले असहज सप्ताह के लिए सुझावों के साथ।',
    transcript:
      'Saline douching feels strange the first time, but it is the single most important habit for a smooth sinus recovery. Lean over the sink, tilt your head, and let gravity do the work. Light spotting of blood in the saline is normal in the first week. We will walk through the full routine together.',
    transcriptHi:
      'सलाइन डूशिंग पहली बार अजीब लगती है, लेकिन यह एक सहज साइनस रिकवरी के लिए सबसे महत्वपूर्ण आदत है। सिंक के ऊपर झुकें, सिर झुकाएं, और गुरुत्वाकर्षण को काम करने दें।',
    minutes: 9,
  },
  {
    id: 'ep4',
    title: 'Ask the Surgeon: Your Top 10 Recovery Questions',
    titleHi: 'सर्जन से पूछें: आपके शीर्ष 10 रिकवरी प्रश्न',
    host: 'Dr. Rajesh Sharma, MS (ENT)',
    summary: 'Answers to the questions the clinic hears most often — from bathing to returning to work.',
    summaryHi: 'क्लिनिक में सबसे अधिक पूछे जाने वाले प्रश्नों के उत्तर — नहाने से लेकर काम पर लौटने तक।',
    transcript:
      'Today we are answering the ten questions our clinic hears most often after ENT surgery. When can you fly again. When can you return to the gym. What does normal healing discharge look like versus a warning sign. Let us go through each one with real timelines.',
    transcriptHi:
      'आज हम ईएनटी सर्जरी के बाद हमारे क्लिनिक में सबसे अधिक पूछे जाने वाले दस प्रश्नों के उत्तर दे रहे हैं। आप दोबारा कब उड़ान भर सकते हैं। आप जिम कब लौट सकते हैं।',
    minutes: 21,
  },
];

const COVER_TONES = ['text-teal-300 bg-teal-900', 'text-brass-300 bg-brass-900', 'text-teal-200 bg-ink-800', 'text-brass-200 bg-ink-700'];
const SPEED_OPTIONS = [0.75, 1.0, 1.25, 1.5];

export const PodcastLibrary: React.FC = () => {
  const { locale } = useAppData();
  const hi = locale === 'hi';
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [showTranscriptId, setShowTranscriptId] = useState<string | null>(null);
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    setSupported(typeof window !== 'undefined' && 'speechSynthesis' in window);
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const togglePlay = (ep: Episode) => {
    if (!supported) return;
    const synth = window.speechSynthesis;
    if (playingId === ep.id) {
      synth.cancel();
      setPlayingId(null);
      return;
    }
    synth.cancel();
    const utter = new SpeechSynthesisUtterance(hi ? ep.transcriptHi : ep.transcript);
    utter.lang = hi ? 'hi-IN' : 'en-IN';
    utter.rate = playbackSpeed;
    utter.onend = () => setPlayingId(null);
    utter.onerror = () => setPlayingId(null);
    synth.speak(utter);
    setPlayingId(ep.id);
  };

  const changeSpeed = (speed: number) => {
    setPlaybackSpeed(speed);
    if (playingId) {
      const ep = EPISODES.find((e) => e.id === playingId);
      if (ep) {
        const synth = window.speechSynthesis;
        synth.cancel();
        const utter = new SpeechSynthesisUtterance(hi ? ep.transcriptHi : ep.transcript);
        utter.lang = hi ? 'hi-IN' : 'en-IN';
        utter.rate = speed;
        utter.onend = () => setPlayingId(null);
        utter.onerror = () => setPlayingId(null);
        synth.speak(utter);
      }
    }
  };

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="bg-white dark:bg-ink-900 border border-slate-200 dark:border-ink-800 rounded-3xl p-6 shadow-sm space-y-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-brass-500/20 text-brass-600 dark:text-brass-400 flex items-center justify-center">
            <Podcast className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-display font-bold text-xl text-slate-900 dark:text-white flex items-center gap-2">
              {hi ? 'ईएनटी केयर पॉडकास्ट सीरीज' : 'ENT Clinical Care Podcast Library'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {hi
                ? 'सर्जन और ऑडियोलॉजिस्ट द्वारा रिकॉर्ड किए गए मार्गदर्शन एपिसोड — प्ले दबाएं और सुनें।'
                : 'Listen to ENT specialists walk through post-op recovery routines, stoma care & hearing choices.'}
            </p>
          </div>
        </div>

        {/* Global Player Controls Bar */}
        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-ink-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-400 uppercase tracking-wider">{hi ? 'गति:' : 'Playback Speed:'}</span>
            {SPEED_OPTIONS.map((speed) => (
              <button
                key={speed}
                onClick={() => changeSpeed(speed)}
                className={`px-2.5 py-1 rounded-lg font-mono font-bold transition-colors ${
                  playbackSpeed === speed
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-ink-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                {speed}x
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 text-slate-400 text-xs font-mono">
            <Volume2 className="w-4 h-4 text-teal-500" />
            <span>Web Speech API Synthesis</span>
          </div>
        </div>
      </div>

      {/* Episodes List */}
      <div className="space-y-4">
        {EPISODES.map((ep, i) => {
          const isPlaying = playingId === ep.id;
          const isTranscriptOpen = showTranscriptId === ep.id;

          return (
            <div
              key={ep.id}
              id={ep.id}
              className={`bg-white dark:bg-ink-900 border rounded-3xl p-6 transition-all shadow-sm ${
                isPlaying
                  ? 'border-teal-400 dark:border-teal-600 ring-2 ring-teal-400/20 shadow-lg'
                  : 'border-slate-200 dark:border-ink-800 hover:border-slate-300 dark:hover:border-ink-700'
              }`}
            >
              <div className="flex items-start gap-4 sm:gap-6">
                <div
                  className={`shrink-0 w-16 h-16 rounded-2xl flex items-center justify-center shadow-md ${
                    COVER_TONES[i % COVER_TONES.length]
                  }`}
                >
                  <DhanwantariMark className="w-8 h-8" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-teal-50 dark:bg-ink-800 text-teal-700 dark:text-teal-300 px-2.5 py-0.5 rounded-full border border-teal-200 dark:border-ink-700">
                      {ep.host}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">{ep.minutes} mins</span>
                  </div>

                  <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white mt-1 leading-snug">
                    {hi ? ep.titleHi : ep.title}
                  </h3>

                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                    {hi ? ep.summaryHi : ep.summary}
                  </p>

                  {/* Equalizer Visualizer */}
                  {isPlaying && (
                    <div className="flex items-center gap-1 mt-3 bg-teal-50 dark:bg-ink-800/80 px-3 py-1.5 rounded-xl w-fit">
                      {[0, 1, 2, 3, 4, 5].map((bar) => (
                        <span
                          key={bar}
                          className="w-1 bg-teal-500 rounded-full animate-pulse"
                          style={{ height: `${8 + (bar % 4) * 5}px`, animationDelay: `${bar * 100}ms` }}
                        />
                      ))}
                      <span className="text-xs font-bold text-teal-700 dark:text-teal-300 ml-2">
                        {hi ? 'प्ले हो रहा है…' : 'Playing Episode Audio…'}
                      </span>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex flex-wrap items-center gap-3 mt-4 pt-3 border-t border-slate-100 dark:border-ink-800/80">
                    <button
                      onClick={() => togglePlay(ep)}
                      disabled={!supported}
                      className={`inline-flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-sm ${
                        isPlaying
                          ? 'bg-amber-600 text-white'
                          : 'bg-teal-600 hover:bg-teal-500 text-white'
                      }`}
                    >
                      {isPlaying ? (
                        <>
                          <Pause className="w-4 h-4 fill-current" />
                          {hi ? 'रोकें (Pause)' : 'Pause Audio'}
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 fill-current" />
                          {hi ? 'एपिसोड सुनें' : 'Listen Episode'}
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => setShowTranscriptId(isTranscriptOpen ? null : ep.id)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-teal-600 dark:hover:text-teal-400 px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-ink-800 transition-colors"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      {hi ? 'ट्रांसक्रिप्ट देखें' : 'View Transcript'}
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isTranscriptOpen ? 'rotate-180' : ''}`} />
                    </button>
                  </div>

                  {/* Transcript Viewer Accordion */}
                  {isTranscriptOpen && (
                    <div className="mt-4 p-4 rounded-2xl bg-slate-50 dark:bg-ink-950 border border-slate-200 dark:border-ink-800 text-xs text-slate-700 dark:text-slate-200 space-y-2 animate-in fade-in duration-200">
                      <p className="font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wider text-[10px]">
                        {hi ? 'पूर्ण एपिसोड ट्रांसक्रिप्ट:' : 'Full Episode Transcript:'}
                      </p>
                      <p className="leading-relaxed font-sans text-sm italic">
                        "{hi ? ep.transcriptHi : ep.transcript}"
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
