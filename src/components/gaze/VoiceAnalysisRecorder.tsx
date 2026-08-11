'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Mic, Square, Play, Pause, Send, CheckCircle2, AlertCircle, Clock, Volume2, Sparkles, User, FileText, ShieldCheck, Stethoscope
} from 'lucide-react';
import {
  VoiceAnalysisSubmission,
  AutoDspMetrics,
  VoiceQualityFlag,
  loadLocalVoiceSubmissions,
  submitVoiceSampleForAnalysis,
} from '@/lib/voice-analysis-service';
import { getCurrentPatientId } from '@/lib/patient-context';
import { openMicrophone, describeDevice, encodeWav, micErrorKey, MicHandle } from '@/lib/voice-capture';
import {
  estimateNoiseFloorDb,
  clippedFraction,
  computeCPPS,
  detectPhonation,
} from '@/lib/voice-dsp';
import { MAX_USABLE_NOISE_FLOOR_DB } from '@/lib/voice-rx';

/**
 * Recording ceiling, seconds. Generous enough for the reading passage, which
 * needs roughly 20 s of continuous speech to be acoustically reliable - the
 * 3-5 s used by older protocols is below the length at which published
 * thresholds hold. MPT stops when the patient runs out of air, well inside this.
 */
const MAX_RECORD_SEC = 30;

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

  // Measured acoustics for the take currently held in the preview.
  const [metrics, setMetrics] = useState<AutoDspMetrics | null>(null);
  const [captureError, setCaptureError] = useState<string | null>(null);

  // Raw PCM capture. MediaRecorder is deliberately not used - it encodes to Opus
  // or AAC, and lossy coding of a dysphonic voice is exactly the damage that
  // makes phone-recorded acoustic measures untrustworthy. See voice-capture.ts.
  const micRef = useRef<MicHandle | null>(null);
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

  // Clean up recording timer and an open mic stream on unmount
  useEffect(() => {
    return () => {
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
      micRef.current?.stop();
    };
  }, []);

  const micErrorMessage = (err: unknown): string => {
    const key = micErrorKey(err);
    const en: Record<string, string> = {
      denied: 'Microphone access denied. Grant permission in browser settings and try again.',
      'not-found': 'No microphone was found. Connect one and try again.',
      'in-use': 'The microphone is being used by another app. Close it and try again.',
      insecure: 'Recording needs a secure (https) connection.',
      unsupported: 'This browser cannot capture raw audio. Try Chrome, Edge or Safari.',
      unknown: 'The microphone could not be opened.',
    };
    const hiMap: Record<string, string> = {
      denied: 'माइक की अनुमति नहीं मिली। ब्राउज़र सेटिंग में अनुमति दें और फिर कोशिश करें।',
      'not-found': 'कोई माइक नहीं मिला। माइक जोड़ें और फिर कोशिश करें।',
      'in-use': 'माइक किसी दूसरे ऐप में चल रहा है। उसे बंद करके फिर कोशिश करें।',
      insecure: 'रिकॉर्डिंग के लिए सुरक्षित (https) कनेक्शन चाहिए।',
      unsupported: 'यह ब्राउज़र रॉ ऑडियो रिकॉर्ड नहीं कर सकता। Chrome, Edge या Safari आज़माएं।',
      unknown: 'माइक नहीं खुल सका।',
    };
    return hi ? hiMap[key] : en[key];
  };

  /**
   * Measure the take. Every value returned here is computed from the captured
   * PCM - nothing is defaulted. A measure that does not apply to the selected
   * task is null, so the reviewer can tell "not applicable" from "normal".
   */
  const analyseTake = (
    pcm: Float32Array,
    sampleRate: number,
    device: ReturnType<typeof describeDevice>,
    task: VoiceAnalysisSubmission['recordingType'],
  ): AutoDspMetrics => {
    const durationSec = pcm.length / sampleRate;
    const noiseFloorDb = estimateNoiseFloorDb(pcm, sampleRate);
    const clipped = clippedFraction(pcm);
    const flags: VoiceQualityFlag[] = [];

    if (noiseFloorDb > MAX_USABLE_NOISE_FLOOR_DB) flags.push('room_too_noisy');
    // Occasional single-sample overs are normal; a sustained over means the
    // preamp was driven into limiting and the cepstrum is no longer meaningful.
    if (clipped > 0.001) flags.push('clipped');
    if (durationSec < 2) flags.push('too_short');
    if (!device.processingDisabled) flags.push('mic_processing_active');

    let cppsDb: number | null = null;
    let cppsVoicedRatio: number | null = null;
    let mptSec: number | null = null;
    let phonationDropouts: number | null = null;

    // CPPS is only meaningful on a comfortable-effort sustained vowel. It must
    // never be computed from an MPT take: maximum phonation drives the patient to
    // residual lung volume and quality collapses over the final seconds, so the
    // result would track respiratory effort rather than voice. Continuous speech
    // and free voice notes have their own norms and are not scored here.
    if (task === 'phonation_aaa' && !flags.includes('clipped')) {
      const cpps = computeCPPS(pcm, sampleRate);
      if (cpps.voicedFrameRatio > 0) {
        cppsDb = cpps.cppsDb;
        cppsVoicedRatio = cpps.voicedFrameRatio;
        if (cpps.voicedFrameRatio < 0.3) flags.push('low_voiced_ratio');
      } else {
        flags.push('no_phonation_detected');
      }
    }

    if (task === 'mpt') {
      const phon = detectPhonation(pcm, sampleRate, noiseFloorDb);
      if (phon.detected) {
        mptSec = phon.durationSec;
        phonationDropouts = phon.dropoutCount;
      } else {
        flags.push('no_phonation_detected');
      }
    }

    return {
      cppsDb,
      cppsVoicedRatio,
      mptSec,
      phonationDropouts,
      noiseFloorDb,
      clippedFraction: clipped,
      durationSec,
      sampleRate,
      deviceFingerprint: device.fingerprint,
      processingDisabled: device.processingDisabled,
      qualityFlags: flags,
      computedBy: 'device-dsp-v1',
    };
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCaptureError(null);
    const blobUrl = URL.createObjectURL(file);
    setAudioBlobUrl(blobUrl);
    setRecordingDuration(file.size > 0 ? 8 : 5);

    const reader = new FileReader();
    reader.onloadend = () => {
      setAudioBase64Url(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const startRecording = async () => {
    setAudioBlobUrl(null);
    setAudioBase64Url(null);
    setMetrics(null);
    setCaptureError(null);
    setRecordTimeSec(0);

    try {
      const mic = await openMicrophone();
      micRef.current = mic;
      mic.start();
      setIsRecording(true);

      const startTime = Date.now();
      recordTimerRef.current = setInterval(() => {
        const elapsedSec = Math.round((Date.now() - startTime) / 1000);
        setRecordTimeSec(elapsedSec);
        if (elapsedSec >= MAX_RECORD_SEC) stopRecording();
      }, 250);
    } catch (err) {
      console.error('Microphone access error:', err);
      micRef.current?.stop();
      micRef.current = null;
      setIsRecording(false);
      setCaptureError(micErrorMessage(err));
    }
  };

  const stopRecording = () => {
    if (recordTimerRef.current) {
      clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
    setIsRecording(false);

    const mic = micRef.current;
    if (!mic) return;
    micRef.current = null;

    const pcm = mic.takeBuffer();
    const sampleRate = mic.sampleRate;
    const device = describeDevice(mic);
    mic.stop();

    if (pcm.length === 0) {
      setCaptureError(
        hi ? 'कोई ऑडियो रिकॉर्ड नहीं हुआ। दोबारा कोशिश करें।' : 'No audio was captured. Please record again.',
      );
      return;
    }

    // Uncompressed 16-bit WAV, so what the audiologist hears is what the
    // microphone produced and what the metrics were computed from.
    const wav = encodeWav(pcm, sampleRate);
    setAudioBlobUrl(URL.createObjectURL(wav));
    setRecordingDuration(pcm.length / sampleRate);

    const reader = new FileReader();
    reader.onloadend = () => setAudioBase64Url(reader.result as string);
    reader.readAsDataURL(wav);

    setMetrics(analyseTake(pcm, sampleRate, device, recordingType));
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

  // Flags that make a take unsafe to send at all, versus flags that just limit
  // what can be scored (e.g. mic processing active still yields a usable MPT).
  const BLOCKING_FLAGS: VoiceQualityFlag[] = ['room_too_noisy', 'clipped', 'too_short'];

  const handleSubmitVoiceSample = async () => {
    if (!audioBase64Url) {
      alert(hi ? 'कृपया पहले अपनी आवाज़ रिकॉर्ड करें।' : 'Please record your voice sample first.');
      return;
    }

    const blocking = metrics?.qualityFlags.filter((f) => BLOCKING_FLAGS.includes(f)) ?? [];
    if (blocking.length > 0) {
      alert(
        hi
          ? 'यह रिकॉर्डिंग विश्लेषण के लिए ठीक नहीं है (शोर/क्लिपिंग/बहुत छोटी)। कृपया शांत जगह पर दोबारा रिकॉर्ड करें।'
          : 'This recording is not usable for analysis (too noisy, clipped, or too short). Please re-record somewhere quiet.',
      );
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
        // Whatever analyseTake measured, or absent if capture somehow completed
        // without it. Never a placeholder - the audiologist must be able to tell
        // "not computed" from "computed and normal".
        autoDspMetrics: metrics ?? undefined,
      });

      const updated = loadLocalVoiceSubmissions();
      setSubmissions(updated);
      setAudioBlobUrl(null);
      setAudioBase64Url(null);
      setMetrics(null);
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
                ? 'अपना स्वर नमुना रिकॉर्ड करें। ऑडियोलॉजिस्ट इसे सुनकर अपनी विशेषज्ञ रिपोर्ट दर्ज करेंगे — मापे गए संकेतक केवल सहायक हैं।'
                : 'Record your voice sample. The audiologist listens and saves the expert report — measured indicators below are a supporting reference only.'}
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
            <div className="flex flex-col items-center gap-3">
              <button
                onClick={startRecording}
                className="w-20 h-20 rounded-full bg-gradient-to-tr from-rose-600 to-red-500 hover:from-rose-500 hover:to-red-400 text-white flex items-center justify-center shadow-lg shadow-rose-600/40 transition-all hover:scale-105 active:scale-95"
              >
                <Mic className="w-9 h-9" />
              </button>
              <span className="text-xs font-bold text-slate-300">
                {hi ? '🔴 माइक दबाकर रिकॉर्ड करें' : '🔴 Press Mic to Record'}
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <button
                onClick={stopRecording}
                className="w-20 h-20 rounded-full bg-amber-600 hover:bg-amber-500 text-white flex items-center justify-center shadow-lg shadow-amber-600/40 transition-all animate-pulse"
              >
                <Square className="w-8 h-8 fill-current" />
              </button>
              <span className="text-xs font-bold text-amber-300 animate-pulse">
                {hi ? '⏹ रोकें और नमुना सहेजें' : '⏹ Click to Stop & Save Sample'}
              </span>
            </div>
          )}

          {/* Alternative File Upload Fallback */}
          {!isRecording && !audioBlobUrl && (
            <div className="pt-2">
              <label className="text-[11px] text-teal-400 hover:text-teal-300 font-semibold underline cursor-pointer">
                <span>{hi ? 'या बनी हुई ऑडियो फाइल अपलोड करें (.wav, .mp3, .m4a)' : 'Or upload recorded audio file (.wav, .mp3, .m4a)'}</span>
                <input
                  type="file"
                  accept="audio/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          )}

          <div className="space-y-1">
            <p className="text-xs font-bold text-slate-200">
              {isRecording
                ? (hi ? `🔴 रिकॉर्ड हो रहा है... (${recordTimeSec}s / अधिकतम ${MAX_RECORD_SEC}s)` : `🔴 Recording... (${recordTimeSec}s / max ${MAX_RECORD_SEC}s)`)
                : audioBlobUrl
                ? (hi ? '✓ नमुना रिकॉर्ड हो गया है — नीचे सुनें और भेजें' : '✓ Sample recorded — listen preview & send below')
                : (hi ? 'माइक बटन दबाएं और रिकॉर्डिंग शुरू करें' : 'Click microphone to start recording')}
            </p>
            {isRecording && (
              <div className="w-48 h-2 bg-slate-800 rounded-full overflow-hidden mx-auto border border-rose-500/50">
                <div
                  className="h-full bg-rose-500 transition-all duration-300"
                  style={{ width: `${Math.min((recordTimeSec / MAX_RECORD_SEC) * 100, 100)}%` }}
                />
              </div>
            )}
          </div>

          {captureError && (
            <div className="w-full max-w-md p-2.5 bg-rose-950/40 border border-rose-500/40 rounded-xl text-xs text-rose-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <span>{captureError}</span>
            </div>
          )}

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
              <span className="text-xs font-mono text-slate-400">{recordingDuration.toFixed(1)} sec WAV</span>
            </div>
          )}

          {/* Measured recording-quality reference. Supporting information for the
              audiologist, not a verdict - see the header note above. */}
          {metrics && !isRecording && (
            <div className="w-full max-w-md space-y-2">
              {metrics.qualityFlags.filter((f) => BLOCKING_FLAGS.includes(f)).length > 0 ? (
                <div className="p-2.5 bg-rose-950/40 border border-rose-500/40 rounded-xl text-xs text-rose-200 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                  <span>
                    {hi
                      ? 'यह टेक विश्लेषण योग्य नहीं है — शोर, क्लिपिंग या बहुत छोटी अवधि। दोबारा रिकॉर्ड करें।'
                      : 'This take is not analysable - too noisy, clipped, or too short. Please re-record.'}
                  </span>
                </div>
              ) : (
                <div className="p-2.5 bg-white/5 border border-white/10 rounded-xl text-[11px] text-slate-300 grid grid-cols-2 gap-x-3 gap-y-1 font-mono">
                  {metrics.cppsDb !== null && (
                    <span>CPPS: <strong className="text-teal-300">{metrics.cppsDb.toFixed(1)} dB</strong></span>
                  )}
                  {metrics.mptSec !== null && (
                    <span>MPT: <strong className="text-teal-300">{metrics.mptSec.toFixed(1)} s</strong></span>
                  )}
                  <span>{hi ? 'शोर तल' : 'Noise floor'}: {metrics.noiseFloorDb.toFixed(0)} dB</span>
                  <span>{hi ? 'अवधि' : 'Duration'}: {metrics.durationSec.toFixed(1)} s</span>
                  {metrics.qualityFlags.includes('mic_processing_active') && (
                    <span className="col-span-2 text-amber-300/90">
                      {hi
                        ? '⚠ फोन ने माइक प्रोसेसिंग लागू की — पुराने नमूनों से सीधी तुलना अविश्वसनीय हो सकती है।'
                        : '⚠ Phone applied mic processing - direct comparison to earlier samples may be unreliable.'}
                    </span>
                  )}
                </div>
              )}
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
            disabled={
              !audioBase64Url ||
              isSubmitting ||
              (metrics?.qualityFlags.some((f) => BLOCKING_FLAGS.includes(f)) ?? false)
            }
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
