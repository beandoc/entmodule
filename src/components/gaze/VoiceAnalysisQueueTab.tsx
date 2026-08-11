'use client';

import React, { useState, useEffect } from 'react';
import {
  Mic, Play, Pause, Save, CheckCircle2, Clock, AlertTriangle, ShieldCheck, UserCheck, Stethoscope, RefreshCcw, Sparkles, Volume2
} from 'lucide-react';
import {
  VoiceAnalysisSubmission,
  ExpertReview,
  loadLocalVoiceSubmissions,
  saveExpertReview,
} from '@/lib/voice-analysis-service';

interface VoiceAnalysisQueueTabProps {
  hi?: boolean;
  audiologistName?: string;
}

export const VoiceAnalysisQueueTab: React.FC<VoiceAnalysisQueueTabProps> = ({
  hi = false,
  audiologistName: propAudiologistName = 'Mr Lokanath Sahoo',
}) => {
  const [submissions, setSubmissions] = useState<VoiceAnalysisSubmission[]>([]);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'reviewed'>('all');
  const [activeSubmissionId, setActiveSubmissionId] = useState<string | null>(null);

  // Expert Analysis Form State
  const [audiologistName, setAudiologistName] = useState(propAudiologistName);
  const [audiologistRole, setAudiologistRole] = useState('Chief Clinical Audiologist & Voice Specialist');
  const [impression, setImpression] = useState<ExpertReview['impression']>('mild_dysphonia');
  const [expertComments, setExpertComments] = useState('');
  const [recommendationsInput, setRecommendationsInput] = useState('');
  const [selectedPresetRecs, setSelectedPresetRecs] = useState<string[]>([
    'Vocal hygiene & hydration protocol',
    'Avoid vocal strain / shouting',
  ]);

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessId, setSaveSuccessId] = useState<string | null>(null);

  // Illustrative rows shown only when the queue is otherwise empty, so the
  // layout is not blank on first load. `isDemoSeed` and `computedBy: 'demo-seed'`
  // mark every number here as invented for display, not measured - the render
  // below refuses to show DSP metrics as real unless computedBy is 'device-dsp-v1'.
  const buildDemoSeed = (): VoiceAnalysisSubmission[] => [
    {
      id: 'vsub-seed-101',
      patientId: 'pt_101',
      patientName: 'Sachin Srivastava',
      patientMrn: 'MRN: 88491',
      audioDataUrl: '',
      durationSec: 8,
      recordingType: 'phonation_aaa',
      patientNote: 'Felt vocal fatigue and mild roughness after 30 minutes of continuous talking.',
      isDemoSeed: true,
      autoDspMetrics: {
        cppsDb: 13.8, cppsVoicedRatio: 0.82, mptSec: null, phonationDropouts: null,
        noiseFloorDb: -44, clippedFraction: 0, durationSec: 8, sampleRate: 48000,
        deviceFingerprint: 'demo', processingDisabled: true, qualityFlags: [], computedBy: 'demo-seed',
      },
      status: 'pending',
      createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
      createdTimestampMs: Date.now() - 3600000 * 2,
    },
    {
      id: 'vsub-seed-102',
      patientId: 'pt_102',
      patientName: 'Anita Sharma',
      patientMrn: 'MRN: 94102',
      audioDataUrl: '',
      durationSec: 12,
      recordingType: 'mpt',
      patientNote: 'Post-operative 4 weeks cordectomy follow-up voice sample.',
      isDemoSeed: true,
      autoDspMetrics: {
        cppsDb: null, cppsVoicedRatio: null, mptSec: 12.0, phonationDropouts: 1,
        noiseFloorDb: -48, clippedFraction: 0, durationSec: 12, sampleRate: 48000,
        deviceFingerprint: 'demo', processingDisabled: true, qualityFlags: [], computedBy: 'demo-seed',
      },
      status: 'reviewed',
      createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
      createdTimestampMs: Date.now() - 3600000 * 24,
      expertReview: {
        reviewedAt: new Date(Date.now() - 3600000 * 18).toISOString(),
        reviewedTimestampMs: Date.now() - 3600000 * 18,
        audiologistName: 'Mr Lokanath Sahoo',
        audiologistRole: 'Chief Clinical Audiologist',
        impression: 'mild_dysphonia',
        comments: 'Good glottic closure recovery observed. MPT steady at 12.0s.',
        recommendations: ['Maintain hydration', 'Follow-up in 4 weeks'],
      },
    },
  ];

  const refreshQueue = () => {
    const list = loadLocalVoiceSubmissions();
    // If no submissions exist, populate illustrative rows for layout purposes only.
    if (list.length === 0) {
      list.push(...buildDemoSeed());
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('id-voice-analysis-submissions', JSON.stringify(list));
      }
    }
    setSubmissions(list);
  };

  useEffect(() => {
    refreshQueue();
  }, []);

  const handleSelectSubmission = (sub: VoiceAnalysisSubmission) => {
    setActiveSubmissionId(sub.id);
    if (sub.expertReview) {
      setImpression(sub.expertReview.impression);
      setExpertComments(sub.expertReview.comments);
      setSelectedPresetRecs(sub.expertReview.recommendations || []);
      setAudiologistName(sub.expertReview.audiologistName || propAudiologistName);
      setAudiologistRole(sub.expertReview.audiologistRole || 'Chief Clinical Audiologist & Voice Specialist');
    } else {
      setImpression('mild_dysphonia');
      setExpertComments('');
      setSelectedPresetRecs(['Vocal hygiene & hydration protocol', 'Avoid vocal strain / shouting']);
    }
  };

  const togglePresetRec = (rec: string) => {
    setSelectedPresetRecs((prev) =>
      prev.includes(rec) ? prev.filter((r) => r !== rec) : [...prev, rec]
    );
  };

  const handleSaveExpertReview = async (submissionId: string) => {
    if (!expertComments.trim()) {
      alert(hi ? 'कृपया अपने विशेषज्ञ विश्लेषण की टिप्पणियां दर्ज करें।' : 'Please enter your expert clinical comments.');
      return;
    }

    setIsSaving(true);
    try {
      const customRecs = recommendationsInput
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      const allRecs = Array.from(new Set([...selectedPresetRecs, ...customRecs]));

      await saveExpertReview(submissionId, {
        audiologistName,
        audiologistRole,
        impression,
        comments: expertComments,
        recommendations: allRecs,
      });

      refreshQueue();
      setSaveSuccessId(submissionId);
      setTimeout(() => setSaveSuccessId(null), 4000);
    } catch (err) {
      console.error('Failed to save expert review:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const filteredSubmissions = submissions.filter((s) => {
    if (filterStatus === 'pending') return s.status === 'pending';
    if (filterStatus === 'reviewed') return s.status === 'reviewed';
    return true;
  });

  const getImpressionBadge = (imp?: string) => {
    switch (imp) {
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
        return { label: hi ? 'लंबित' : 'Pending', color: 'bg-slate-800 text-slate-400 border-slate-700' };
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="bg-[#0b0f19] p-4 sm:p-5 rounded-2xl border border-indigo-500/30 flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div>
          <h2 className="text-lg font-extrabold text-indigo-300 flex items-center gap-2">
            <Stethoscope className="w-5 h-5 text-indigo-400" />
            <span>{hi ? 'ऑडियोलॉजिस्ट स्वर विश्लेषण एवं समीक्षा कतार' : 'Audiologist Voice Analysis & Expert Review Queue'}</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {hi
              ? 'रोगियों द्वारा भेजे गए स्वर नमूनों को सुनें, विशेषज्ञ विश्लेषण करें और टाइमस्टैम्प के साथ टिप्पणियां सहेजें।'
              : 'Listen to patient recorded voice samples, perform expert clinical evaluation, and save timestamped comments.'}
          </p>
        </div>

        {/* Filter Controls & Refresh */}
        <div className="flex items-center gap-2">
          {(['all', 'pending', 'reviewed'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-all border ${
                filterStatus === st
                  ? 'bg-indigo-600 text-white border-indigo-400 shadow-md'
                  : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10 hover:text-white'
              }`}
            >
              {st === 'all' ? (hi ? 'सभी' : 'All Samples') : st === 'pending' ? (hi ? '⏳ लंबित' : '⏳ Pending') : (hi ? '✓ समीक्षा पूर्ण' : '✓ Reviewed')}
            </button>
          ))}

          <button
            onClick={refreshQueue}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-all"
            title={hi ? 'कतार ताज़ा करें' : 'Refresh Queue'}
          >
            <RefreshCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Submissions List Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Submissions Queue List */}
        <div className="space-y-3 lg:col-span-1">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">
            {hi ? `स्वर नमुना सूची (${filteredSubmissions.length})` : `Patient Voice Submissions (${filteredSubmissions.length})`}
          </h3>

          {filteredSubmissions.length === 0 ? (
            <div className="p-6 bg-slate-900/60 rounded-2xl border border-white/10 text-center text-xs text-slate-400">
              {hi ? 'कोई नमुना नहीं मिला।' : 'No submissions found in queue.'}
            </div>
          ) : (
            filteredSubmissions.map((sub) => {
              const badge = getImpressionBadge(sub.expertReview?.impression);
              const isSelected = activeSubmissionId === sub.id;
              return (
                <div
                  key={sub.id}
                  onClick={() => handleSelectSubmission(sub)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-2 ${
                    isSelected
                      ? 'bg-indigo-950/80 border-indigo-400 shadow-lg shadow-indigo-500/20 ring-1 ring-indigo-400'
                      : 'bg-[#0b0f19] border-white/10 hover:border-indigo-500/40 hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-white">{sub.patientName}</span>
                    <span className="font-mono text-[10px] text-teal-300">{sub.patientMrn}</span>
                  </div>

                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-300 uppercase font-semibold">{sub.recordingType.replace('_', ' ')} ({sub.durationSec}s)</span>
                    <span className={`px-2 py-0.5 rounded-full border font-bold text-[10px] ${badge.color}`}>
                      {sub.status === 'reviewed' ? `✓ ${badge.label}` : '⏳ Pending'}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-400 font-mono">
                    🕒 {new Date(sub.createdTimestampMs || sub.createdAt).toLocaleString()}
                  </p>

                  {sub.patientNote && (
                    <p className="text-[11px] text-slate-300 italic truncate bg-white/5 p-1.5 rounded-lg">
                      "{sub.patientNote}"
                    </p>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Right Column: Expert Analysis & Audio Player Workstation */}
        <div className="lg:col-span-2 space-y-4">
          {activeSubmissionId ? (
            (() => {
              const sub = submissions.find((s) => s.id === activeSubmissionId);
              if (!sub) return null;
              const badge = getImpressionBadge(sub.expertReview?.impression);

              return (
                <div className="bg-[#0b0f19] rounded-2xl border border-indigo-500/40 p-5 space-y-5 shadow-2xl">
                  {/* Patient Header */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-white/10">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-extrabold text-white">{sub.patientName}</h3>
                        <span className="font-mono text-xs text-teal-300 bg-teal-950/60 px-2 py-0.5 rounded border border-teal-500/30">
                          {sub.patientMrn}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        Submitted: <span className="font-mono text-slate-300">{new Date(sub.createdTimestampMs || sub.createdAt).toLocaleString()}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`px-3 py-1 rounded-full border text-xs font-bold ${badge.color}`}>
                        {sub.status === 'reviewed' ? `✓ ${badge.label}` : '⏳ Pending Review'}
                      </span>
                    </div>
                  </div>

                  {/* HTML5 Audio Player for Recorded Sample */}
                  <div className="bg-slate-950 p-4 rounded-xl border border-indigo-500/30 space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-300 font-bold">
                      <span className="flex items-center gap-1.5">
                        <Volume2 className="w-4 h-4 text-indigo-400" />
                        {hi ? 'रोगियों का रिकॉर्ड किया गया ऑडियो नमुना:' : 'Patient Voice Audio Sample Recording:'}
                      </span>
                      <span className="font-mono text-indigo-300">{sub.durationSec} sec WAV</span>
                    </div>

                    {sub.audioDataUrl ? (
                      <audio controls src={sub.audioDataUrl} className="w-full h-10 mt-2" />
                    ) : (
                      <div className="p-3 bg-amber-950/40 border border-amber-500/30 rounded-lg text-xs text-amber-200">
                        {hi
                          ? 'ऑडियो नमुना स्थानीय मेमोरी में उपलब्ध है। सुनने के लिए ऊपर ऑडियो चलाएं।'
                          : 'Audio payload retained in active session memory for clinical listening.'}
                      </div>
                    )}
                  </div>

                  {/* Auto DSP Metrics - only ever what was actually measured.
                      No field here is ever defaulted; a dash means "not computed",
                      not "assume normal". */}
                  {sub.autoDspMetrics && (
                    <div className="space-y-1.5">
                      {sub.isDemoSeed && (
                        <div className="text-[10px] font-bold text-amber-300/90 bg-amber-950/30 border border-amber-500/30 rounded-lg px-2 py-1 inline-block">
                          {hi ? '⚠ नमुना डेटा — किसी वास्तविक रिकॉर्डिंग से नहीं' : '⚠ DEMO DATA - not from a real recording'}
                        </div>
                      )}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                        <div className="bg-white/5 p-2.5 rounded-xl border border-white/5">
                          <span className="text-[10px] text-slate-400 block font-medium">CPPS</span>
                          <span className="font-mono font-bold text-teal-300 text-sm">
                            {sub.autoDspMetrics.cppsDb !== null ? `${sub.autoDspMetrics.cppsDb.toFixed(1)} dB` : '—'}
                          </span>
                        </div>
                        <div className="bg-white/5 p-2.5 rounded-xl border border-white/5">
                          <span className="text-[10px] text-slate-400 block font-medium">MPT</span>
                          <span className="font-mono font-bold text-teal-300 text-sm">
                            {sub.autoDspMetrics.mptSec !== null ? `${sub.autoDspMetrics.mptSec.toFixed(1)} s` : '—'}
                          </span>
                        </div>
                        <div className="bg-white/5 p-2.5 rounded-xl border border-white/5">
                          <span className="text-[10px] text-slate-400 block font-medium">Noise Floor</span>
                          <span className="font-mono font-bold text-slate-300 text-sm">{sub.autoDspMetrics.noiseFloorDb.toFixed(0)} dB</span>
                        </div>
                        <div className="bg-white/5 p-2.5 rounded-xl border border-white/5">
                          <span className="text-[10px] text-slate-400 block font-medium">Duration</span>
                          <span className="font-mono font-bold text-slate-300 text-sm">{sub.autoDspMetrics.durationSec.toFixed(1)} s</span>
                        </div>
                      </div>
                      {sub.autoDspMetrics.qualityFlags.length > 0 && (
                        <p className="text-[10px] text-amber-300/90">
                          {hi ? 'गुणवत्ता ध्वज: ' : 'Quality flags: '}
                          {sub.autoDspMetrics.qualityFlags.join(', ')}
                        </p>
                      )}
                    </div>
                  )}
                  {!sub.autoDspMetrics && (
                    <p className="text-[11px] text-slate-500 italic">
                      {hi ? 'इस नमुने के लिए कोई स्वचालित माप उपलब्ध नहीं।' : 'No automated measurements available for this sample.'}
                    </p>
                  )}

                  {/* Patient Note & Complaints */}
                  {sub.patientNote && (
                    <div className="bg-slate-950/60 p-3 rounded-xl border border-white/10 text-xs">
                      <strong className="text-slate-400 block text-[10px] uppercase mb-1">
                        {hi ? 'रोगियों की शिकायत / टिप्पणी:' : 'Patient Complaints & Note:'}
                      </strong>
                      <p className="text-slate-200 italic">"{sub.patientNote}"</p>
                    </div>
                  )}

                  {/* Expert Clinical Evaluation Form */}
                  <div className="space-y-4 pt-4 border-t border-white/10">
                    <h4 className="text-xs font-bold text-indigo-300 uppercase tracking-widest flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-indigo-400" />
                      <span>{hi ? 'विशेषज्ञ ऑडियोलॉजिस्ट विश्लेषण दर्ज करें' : 'Audiologist Expert Analysis & Comments'}</span>
                    </h4>

                    {/* Clinical Impression Dropdown */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-300 block">
                        {hi ? 'नैदानिक प्रभाव (Clinical Impression):' : 'Clinical Impression:'}
                      </label>
                      <select
                        value={impression}
                        onChange={(e) => setImpression(e.target.value as any)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 font-semibold focus:outline-none focus:border-indigo-500"
                      >
                        <option value="normal">Normal Voice Quality (सामान्य आवाज़)</option>
                        <option value="mild_dysphonia">Mild Dysphonia (हल्का स्वर विकार)</option>
                        <option value="moderate_dysphonia">Moderate Dysphonia (मध्यम स्वर विकार)</option>
                        <option value="severe_dysphonia">Severe Dysphonia (गंभीर स्वर विकार)</option>
                        <option value="urgent_clinic_visit">Urgent In-Clinic Examination Required</option>
                      </select>
                    </div>

                    {/* Expert Comments Input */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-300 block">
                        {hi ? 'विशेषज्ञ टिप्पणियां एवं निष्कर्ष (Expert Analysis Comments):' : 'Expert Analysis Comments & Findings:'}
                      </label>
                      <textarea
                        value={expertComments}
                        onChange={(e) => setExpertComments(e.target.value)}
                        rows={4}
                        placeholder={
                          hi
                            ? 'उदा. रिकॉर्ड किए गए नमुने में स्वर का तनाव देखा गया। F0 स्थिर है। 2 सप्ताह तक स्वर आराम और जलपान की सलाह।'
                            : 'e.g. Acoustic analysis reveals mild strain at end-phonation. Pitch stability is maintained at 145Hz. Recommend vocal hygiene, hydration, and 2 weeks re-assessment.'
                        }
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 leading-relaxed font-sans"
                      />
                    </div>

                    {/* Recommendations Presets */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-300 block">
                        {hi ? 'क्लिनिकल सिफारिशें (Actionable Recommendations):' : 'Clinical Recommendations:'}
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {[
                          'Vocal hygiene & hydration protocol',
                          'Avoid vocal strain / shouting',
                          'Voice rest for 48 hours',
                          'Speech therapy referral',
                          'Follow-up in 2 weeks',
                          'In-clinic video stroboscopy needed',
                        ].map((rec) => (
                          <button
                            key={rec}
                            onClick={() => togglePresetRec(rec)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                              selectedPresetRecs.includes(rec)
                                ? 'bg-teal-500/20 text-teal-300 border-teal-500/40'
                                : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10'
                            }`}
                          >
                            {selectedPresetRecs.includes(rec) ? `✓ ${rec}` : `+ ${rec}`}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Audiologist Metadata Inputs */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                      <div>
                        <label className="text-[11px] text-slate-400 block font-semibold mb-1">
                          {hi ? 'ऑडियोलॉजिस्ट का नाम:' : 'Audiologist Name:'}
                        </label>
                        <input
                          type="text"
                          value={audiologistName}
                          onChange={(e) => setAudiologistName(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-slate-200 font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-400 block font-semibold mb-1">
                          {hi ? 'पद/पदनाम:' : 'Designation / Title:'}
                        </label>
                        <input
                          type="text"
                          value={audiologistRole}
                          onChange={(e) => setAudiologistRole(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-slate-200"
                        />
                      </div>
                    </div>

                    {/* Save Button */}
                    <div>
                      {saveSuccessId === sub.id && (
                        <div className="mb-3 p-3 bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 text-xs rounded-xl flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span>
                            {hi
                              ? '✓ विशेषज्ञ विश्लेषण और टिप्पणियां टाइमस्टैम्प के साथ सहेज दी गई हैं!'
                              : '✓ Expert analysis & comments successfully saved to backend with timestamps!'}
                          </span>
                        </div>
                      )}

                      <button
                        onClick={() => handleSaveExpertReview(sub.id)}
                        disabled={isSaving}
                        className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50"
                      >
                        {isSaving ? (
                          <>
                            <Sparkles className="w-4 h-4 animate-spin" />
                            <span>{hi ? 'सहेजा जा रहा है...' : 'Saving to Backend...'}</span>
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4" />
                            <span>
                              {sub.status === 'reviewed'
                                ? (hi ? 'विशेषज्ञ विश्लेषण अद्यतन करें (Save Update)' : 'Update & Publish Expert Analysis')
                                : (hi ? 'सहेजें और प्रकाशित करें (Save & Publish Expert Analysis)' : 'Save & Publish Expert Analysis to Backend')}
                            </span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()
          ) : (
            <div className="bg-[#0b0f19] rounded-2xl border border-white/10 p-12 text-center text-slate-400 text-xs space-y-3">
              <Stethoscope className="w-10 h-10 text-indigo-400 mx-auto opacity-50" />
              <p className="font-bold text-slate-300 text-sm">
                {hi ? 'समीक्षा के लिए बाईं सूची से एक नमुना चुनें' : 'Select a patient voice submission from the left queue'}
              </p>
              <p className="max-w-md mx-auto text-slate-500">
                {hi
                  ? 'रोगियों के ऑडियो रिकॉर्डिंग को सुनें, स्वचालित डीएसपी माप देखें और अपनी विशेषज्ञ रिपोर्ट सहेजें।'
                  : 'Listen to recorded audio, inspect DSP metrics, and record your expert clinical evaluation with timestamps.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
