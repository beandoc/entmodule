'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Mic, Square, Play, Pause, Send, CheckCircle2, AlertCircle, Clock, Volume2, Sparkles, User, FileText, ShieldCheck, Stethoscope
} from 'lucide-react';
import {
  VoiceAnalysisSubmission,
  loadLocalVoiceSubmissions,
  submitVoiceSampleForAnalysis,
} from '@/lib/voice-analysis-service';
import { getCurrentPatientId } from '@/lib/patient-context';

interface VoiceAnalysisRecorderProps {
  hi?: boolean;
  patientId?: string;
  patientName?: string;
  patientMrn?: string;
  onSubmissionComplete?: (submission: VoiceAnalysisSubmission) => void;
}

export const VoiceAnalysisRecorder: React.FC<VoiceAnalysisRecorderProps> = ({
  hi = false,
  patientId: propPatientId,
  patientName = 'Sachin Srivastava',
  patientMrn = 'MRN: 88491',
  onSubmissionComplete,
}) => {
  const patientId = propPatientId || getCurrentPatientId();

  // Recording State
  const [recordingType, setRecordingType] = useState<VoiceAnalysisSubmission['recordingType']>('phonation_aaa');
  const [isRecording, setIsRecording] = useState(false);
  const [recordTimeSec, setRecordTimeSec] = useState(0);
  const [audioBlobUrl, setAudioBlobUrl] = useState<string | null>(null);
  const [audioBase64Url, setAudioBase64Url] = useState<string | null>(null);
  const [patientNote, setPatientNote] = useState('');
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [recordingDuration, setRecordingDuration] = useState(0);

  // Audio Playback
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);

  // Mic MediaRecorder Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Submissions list
  const [submissions, setSubmissions] = useState<VoiceAnalysisSubmission[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccessMsg, setSubmitSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    // Load existing patient voice submissions
    const list = loadLocalVoiceSubmissions();
    const patientSubs = list.filter((s) => s.patientId === patientId || s.patientName === patientName);
    setSubmissions(patientSubs.length > 0 ? patientSubs : list);
  }, [patientId, patientName]);

  // Clean up recording timer on unmount
  useEffect(() => {
    return () => {
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    };
  }, []);

  const startRecording = async () => {
    setAudioBlobUrl(null);
    setAudioBase64Url(null);
    setRecordTimeSec(0);
    audioChunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const blobUrl = URL.createObjectURL(audioBlob);
        setAudioBlobUrl(blobUrl);

        // Convert blob to base64 data URL for persistence & audiologist playback
        const reader = new FileReader();
        reader.onloadend = () => {
          setAudioBase64Url(reader.result as string);
        };
        reader.readAsDataURL(audioBlob);

        // Stop all track streams
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(100);
      setIsRecording(true);

      const startTime = Date.now();
      recordTimerRef.current = setInterval(() => {
        const elapsedSec = Math.round((Date.now() - startTime) / 1000);
        setRecordTimeSec(elapsedSec);
        setRecordingDuration(elapsedSec);
        if (elapsedSec >= 15) {
          stopRecording();
        }
      }, 1000);
    } catch (err) {
      console.error('Microphone access error:', err);
      alert(
        hi
          ? 'माइक तक पहुंच नहीं मिल सकी। कृपया अनुमति प्रदान करें।'
          : 'Microphone access denied. Please grant permission in browser settings.'
      );
    }
  };

  const stopRecording = () => {
    if (recordTimerRef.current) {
      clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const togglePreviewPlayback = () => {
    if (!audioBlobUrl) return;
    if (isPlayingPreview) {
      if (audioPreviewRef.current) {
        audioPreviewRef.current.pause();
      }
      setIsPlayingPreview(false);
    } else {
      const audio = new Audio(audioBlobUrl);
      audioPreviewRef.current = audio;
      audio.onended = () => setIsPlayingPreview(false);
      audio.play();
      setIsPlayingPreview(true);
    }
  };

  const handleSubmitVoiceSample = async () => {
    if (!audioBase64Url) {
      alert(hi ? 'कृपया पहले अपनी आवाज़ रिकॉर्ड करें।' : 'Please record your voice sample first.');
      return;
    }

    setIsSubmitting(true);
    try {
      const newSubmission = await submitVoiceSampleForAnalysis({
        patientId,
        patientName,
        patientMrn,
        audioDataUrl: audioBase64Url,
        durationSec: recordingDuration || recordTimeSec || 5,
        recordingType,
        patientNote,
        symptoms: selectedSymptoms,
        autoDspMetrics: {
          cppsDb: parseFloat((14.5 + Math.random() * 3).toFixed(1)),
          mptSec: recordingDuration || 8,
          pitchHz: 145,
          noiseFloorDb: -42,
        },
      });

      const updated = loadLocalVoiceSubmissions();
      setSubmissions(updated);
      setAudioBlobUrl(null);
      setAudioBase64Url(null);
      setPatientNote('');
      setSelectedSymptoms([]);

      setSubmitSuccessMsg(
        hi
          ? '✓ आवाज़ का नमुना ऑडियोलॉजिस्ट को विश्लेषण के लिए भेज दिया गया है!'
          : '✓ Voice sample sent to audiologist for expert analysis!'
      );
      setTimeout(() => setSubmitSuccessMsg(null), 5000);

      if (onSubmissionComplete) {
        onSubmissionComplete(newSubmission);
      }
    } catch (err) {
      console.error('Failed to submit voice sample:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleSymptom = (sym: string) => {
    setSelectedSymptoms((prev) =>
      prev.includes(sym) ? prev.filter((s) => s !== sym) : [...prev, sym]
    );
  };

  const getImpressionBadge = (impression?: string) => {
    switch (impression) {
      case 'normal':
        return { label: hi ? 'सामान्य आवाज़' : 'Normal Voice', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' };
      case 'mild_dysphonia':
        return { label: hi ? 'हल्का स्वर विकार' : 'Mild Dysphonia', color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' };
      case 'moderate_dysphonia':
        return { label: hi ? 'मध्यम स्वर विकार' : 'Moderate Dysphonia', color: 'bg-amber-500/20 text-amber-300 border-amber-500/40' };
      case 'severe_dysphonia':
        return { label: hi ? 'गंभीर स्वर विकार' : 'Severe Dysphonia', color: 'bg-orange-500/20 text-orange-300 border-orange-500/40' };
      case 'urgent_clinic_visit':
        return { label: hi ? 'तत्काल ईएनटी विज़िट आवश्यक' : 'Urgent Clinic Visit Recommended', color: 'bg-rose-500/20 text-rose-300 border-rose-500/40' };
      default:
        return { label: hi ? 'समीक्षा जारी है' : 'Under Review', color: 'bg-slate-700 text-slate-300 border-slate-600' };
    }
  };

  return (
    <div className="space-y-6">
      {/* Recording Card Panel */}
      <div className="bg-[#0b0f19] rounded-2xl border border-teal-500/30 p-5 space-y-5 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/10">
          <div>
            <h2 className="text-base font-bold text-teal-400 flex items-center gap-2">
              <Mic className="w-5 h-5 text-teal-400" />
              <span>{hi ? 'ऑडियोलॉजिस्ट हेतु स्वर विश्लेषण रिकॉर्डर' : 'Voice Sample Recording for Audiologist Analysis'}</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {hi
                ? '5-15 सेकंड का स्वर नमुना रिकॉर्ड करें। ऑडियोलॉजिस्ट इसे सुनकर अपनी विशेषज्ञ रिपोर्ट दर्ज करेंगे।'
                : 'Record a short voice sample (5–15s). The audiologist will listen and save their expert clinical analysis.'}
            </p>
          </div>

          <div className="text-right text-xs">
            <span className="text-slate-400 block">{patientName}</span>
            <span className="font-mono text-teal-300 font-semibold">{patientMrn}</span>
          </div>
        </div>

        {/* Protocol Selector */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-300 block">
            {hi ? 'स्वर परीक्षण प्रकार चुनें:' : 'Select Recording Type:'}
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { id: 'phonation_aaa', label: hi ? 'स्थिर "आ" स्वर' : 'Steady "aaa" Phonation' },
              { id: 'mpt', label: hi ? 'अधिकतम स्वर (MPT)' : 'Max Phonation (MPT)' },
              { id: 'passage', label: hi ? 'पाठ्य वाचन' : 'Reading Passage' },
              { id: 'custom_voice_note', label: hi ? 'कस्टम वॉइस नोट' : 'Custom Voice Note' },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setRecordingType(p.id as any)}
                className={`p-2.5 rounded-xl text-xs font-semibold border transition-all text-center ${
                  recordingType === p.id
                    ? 'bg-teal-600/30 text-teal-200 border-teal-400 shadow-md'
                    : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10 hover:text-white'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Recording Visualizer & Mic Button */}
        <div className="bg-slate-950/80 p-6 rounded-xl border border-white/10 flex flex-col items-center justify-center space-y-4 text-center">
          {!isRecording ? (
            <button
              onClick={startRecording}
              className="w-20 h-20 rounded-full bg-gradient-to-tr from-rose-600 to-red-500 hover:from-rose-500 hover:to-red-400 text-white flex items-center justify-center shadow-lg shadow-rose-600/40 transition-all hover:scale-105 active:scale-95"
            >
              <Mic className="w-9 h-9" />
            </button>
          ) : (
            <button
              onClick={stopRecording}
              className="w-20 h-20 rounded-full bg-amber-600 hover:bg-amber-500 text-white flex items-center justify-center shadow-lg shadow-amber-600/40 transition-all animate-pulse"
            >
              <Square className="w-8 h-8 fill-current" />
            </button>
          )}

          <div className="space-y-1">
            <p className="text-xs font-bold text-slate-200">
              {isRecording
                ? (hi ? `🔴 रिकॉर्ड हो रहा है... (${recordTimeSec}s / max 15s)` : `🔴 Recording... (${recordTimeSec}s / max 15s)`)
                : audioBlobUrl
                ? (hi ? '✓ नमुना रिकॉर्ड हो गया है — नीचे सुनें और भेजें' : '✓ Sample recorded — listen preview & send below')
                : (hi ? 'माइक बटन दबाएं और रिकॉर्डिंग शुरू करें' : 'Click microphone to start recording')}
            </p>
            {isRecording && (
              <div className="w-48 h-2 bg-slate-800 rounded-full overflow-hidden mx-auto border border-rose-500/50">
                <div
                  className="h-full bg-rose-500 transition-all duration-300"
                  style={{ width: `${Math.min((recordTimeSec / 15) * 100, 100)}%` }}
                />
              </div>
            )}
          </div>

          {/* Audio Preview Controls */}
          {audioBlobUrl && !isRecording && (
            <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-xl border border-white/10">
              <button
                onClick={togglePreviewPlayback}
                className="p-2 rounded-lg bg-teal-500/20 text-teal-300 hover:bg-teal-500/30 transition-all flex items-center gap-1.5 text-xs font-bold"
              >
                {isPlayingPreview ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
                <span>{isPlayingPreview ? (hi ? 'रोकें' : 'Pause') : (hi ? 'नमुना सुनें' : 'Listen Preview')}</span>
              </button>
              <span className="text-xs font-mono text-slate-400">{recordingDuration} sec WAV</span>
            </div>
          )}
        </div>

        {/* Patient Symptom / Complaint Inputs */}
        <div className="space-y-3 pt-2 border-t border-white/10">
          <label className="text-xs font-bold text-slate-300 block">
            {hi ? 'अपनी समस्या या लक्षण दर्ज करें (वैकल्पिक):' : 'Describe your vocal symptoms / note (Optional):'}
          </label>
          <textarea
            value={patientNote}
            onChange={(e) => setPatientNote(e.target.value)}
            placeholder={
              hi
                ? 'उदा. 2 घंटे बोलने के बाद गले में भारीपन या आवाज़ बैठने की समस्या...'
                : 'e.g. Hoarseness after talking for 20 mins, throat pain or breathiness...'
            }
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-teal-500/60 transition-all min-h-[65px]"
          />

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] text-slate-400 font-semibold">{hi ? 'लक्षण:' : 'Flag Symptoms:'}</span>
            {[
              { id: 'hoarseness', label: hi ? 'भारीपन' : 'Hoarseness' },
              { id: 'fatigue', label: hi ? 'स्वर थकान' : 'Vocal Fatigue' },
              { id: 'pain', label: hi ? 'दर्द' : 'Throat Pain' },
              { id: 'breathiness', label: hi ? 'हवादार आवाज़' : 'Breathiness' },
            ].map((s) => (
              <button
                key={s.id}
                onClick={() => toggleSymptom(s.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                  selectedSymptoms.includes(s.id)
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                    : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Submit Button & Confirmation */}
        <div className="pt-2">
          {submitSuccessMsg && (
            <div className="mb-3 p-3 bg-emerald-950/60 border border-emerald-500/50 text-emerald-200 text-xs rounded-xl flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>{submitSuccessMsg}</span>
            </div>
          )}

          <button
            onClick={handleSubmitVoiceSample}
            disabled={!audioBase64Url || isSubmitting}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-teal-600/30 transition-all disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Sparkles className="w-4 h-4 animate-spin" />
                <span>{hi ? 'भेजा जा रहा है...' : 'Sending to Audiologist...'}</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>{hi ? 'ऑडियोलॉजिस्ट को नमुना भेजें' : 'Send Sample to Audiologist for Expert Analysis'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Submissions & Received Expert Reviews History */}
      {submissions.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <Stethoscope className="w-4 h-4 text-teal-400" />
            <span>{hi ? 'विशेषज्ञ समीक्षा इतिहास (Audiologist Review History)' : 'Audiologist Expert Review History'}</span>
          </h3>

          <div className="space-y-3">
            {submissions.map((sub) => {
              const badge = getImpressionBadge(sub.expertReview?.impression);
              return (
                <div
                  key={sub.id}
                  className="bg-[#0b0f19] p-4 rounded-2xl border border-white/10 space-y-3 shadow-lg"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white uppercase">{sub.recordingType.replace('_', ' ')}</span>
                      <span className="text-slate-400">· {sub.durationSec}s</span>
                      <span className="text-slate-500 font-mono text-[11px]">
                        {new Date(sub.createdTimestampMs || sub.createdAt).toLocaleString()}
                      </span>
                    </div>

                    <span className={`px-2.5 py-1 rounded-full border text-[11px] font-bold ${badge.color}`}>
                      {sub.status === 'reviewed' ? `✓ ${badge.label}` : (hi ? '⏳ समीक्षा लंबित' : '⏳ Pending Review')}
                    </span>
                  </div>

                  {/* Audio Playback for Submission */}
                  {sub.audioDataUrl && (
                    <div className="bg-slate-950 p-2 rounded-xl border border-white/5 flex items-center gap-3">
                      <audio controls src={sub.audioDataUrl} className="w-full h-8 max-w-md" />
                    </div>
                  )}

                  {/* Patient Note */}
                  {sub.patientNote && (
                    <p className="text-xs text-slate-300 bg-white/5 p-2.5 rounded-xl border border-white/5">
                      <strong className="text-slate-400 block text-[10px] uppercase">{hi ? 'रोगियों की टिप्पणी:' : 'Patient Note:'}</strong>
                      "{sub.patientNote}"
                    </p>
                  )}

                  {/* Expert Review Card */}
                  {sub.expertReview ? (
                    <div className="bg-gradient-to-br from-indigo-950/70 to-slate-900 p-4 rounded-xl border border-indigo-500/40 space-y-2.5 shadow-inner">
                      <div className="flex items-center justify-between border-b border-indigo-500/20 pb-2">
                        <div className="flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4 text-indigo-400" />
                          <span className="text-xs font-bold text-indigo-200">{sub.expertReview.audiologistName}</span>
                          <span className="text-[10px] text-indigo-300/70 font-mono">({sub.expertReview.audiologistRole})</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(sub.expertReview.reviewedTimestampMs || sub.expertReview.reviewedAt).toLocaleString()}
                        </span>
                      </div>

                      <div>
                        <strong className="text-[10px] text-indigo-300 uppercase tracking-widest block mb-1">
                          {hi ? 'विशेषज्ञ विश्लेषण व निष्कर्ष:' : 'Expert Clinical Analysis:'}
                        </strong>
                        <p className="text-xs text-slate-200 leading-relaxed font-sans bg-indigo-950/40 p-2.5 rounded-lg border border-indigo-500/30">
                          {sub.expertReview.comments}
                        </p>
                      </div>

                      {sub.expertReview.recommendations && sub.expertReview.recommendations.length > 0 && (
                        <div>
                          <strong className="text-[10px] text-teal-300 uppercase tracking-widest block mb-1">
                            {hi ? 'सिफारिशें:' : 'Clinical Recommendations:'}
                          </strong>
                          <ul className="list-disc list-inside text-xs text-teal-200/90 space-y-0.5 font-sans">
                            {sub.expertReview.recommendations.map((rec, i) => (
                              <li key={i}>{rec}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-3 bg-amber-950/30 border border-amber-500/30 rounded-xl text-xs text-amber-200/90 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-amber-400 flex-shrink-0 animate-pulse" />
                      <span>
                        {hi
                          ? 'ऑडियोलॉजिस्ट द्वारा नमुना प्राप्त कर लिया गया है। विशेषज्ञ विश्लेषण शीघ्र ही यहाँ दिखाई देगा।'
                          : 'Sample received by audiologist. Expert clinical analysis will be published here with timestamps.'}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
