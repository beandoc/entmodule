/**
 * voice-analysis-service.ts
 *
 * Asynchronous Voice Analysis & Audiologist Expert Review Engine.
 * Allows patients to record and transmit voice samples to the clinical team,
 * and enables Audiologists/ENT Specialists to listen, evaluate, and save timestamped
 * expert clinical analysis & comments to local storage + Firebase backend.
 */

import { db } from './firebase';
import { collection, addDoc, doc, updateDoc, getDocs, query, where, serverTimestamp } from 'firebase/firestore';

/**
 * Recording-quality problems that make a take unsafe to score. These are the
 * reviewer's cue that a number is missing for a reason, and they gate submission
 * in VoiceAnalysisRecorder rather than travelling with a bad take.
 */
export type VoiceQualityFlag =
  | 'room_too_noisy'
  | 'clipped'
  | 'too_short'
  | 'no_phonation_detected'
  | 'low_voiced_ratio'
  | 'mic_processing_active';

/**
 * On-device acoustic measurements from voice-dsp.ts.
 *
 * Every field here is measured. Nothing is defaulted, estimated or filled in -
 * an earlier version of this file carried a randomised CPPS and a hardcoded
 * pitch, which reached the audiologist's review panel labelled as acoustic
 * analysis. Do not reintroduce placeholder values for any clinical number.
 *
 * Portability warning inherited from voice-dsp.ts: absolute CPPS is not
 * comparable across microphones or mouth-to-mic distances. `deviceFingerprint`
 * exists so a reviewer can tell whether two sessions are comparable at all.
 */
export interface AutoDspMetrics {
  /** Smoothed cepstral peak prominence, dB. Null unless the task was a sustained vowel. */
  cppsDb: number | null;
  /** Fraction of frames passing the voicing gate. Low values mean a poor take. */
  cppsVoicedRatio: number | null;
  /** Longest sustained phonation, seconds. Null unless the task was MPT. */
  mptSec: number | null;
  /** Bridged gaps inside the phonation. Rising counts suggest glottal insufficiency. */
  phonationDropouts: number | null;
  /** Measured room floor, dBFS. Not a constant - this is why a take can be rejected. */
  noiseFloorDb: number;
  /** Fraction of samples at full scale. Clipping invalidates CPPS. */
  clippedFraction: number;
  /** Actual PCM duration, seconds. Distinct from the UI timer. */
  durationSec: number;
  sampleRate: number;
  /** Longitudinal comparison is only valid within one fingerprint. */
  deviceFingerprint: string;
  /** False means the browser may have applied gain control under us - see voice-capture.ts. */
  processingDisabled: boolean;
  qualityFlags: VoiceQualityFlag[];
  /**
   * Provenance. 'device-dsp-v1' means a real recording was measured in-browser.
   * 'demo-seed' marks the illustrative rows the queue seeds when empty -
   * these numbers were typed by a developer for layout purposes and must never
   * be mistaken for a measurement. Keep them visually and structurally distinct.
   */
  computedBy: 'device-dsp-v1' | 'demo-seed';
}

export interface ExpertReview {
  /** ISO timestamp of when the audiologist completed the review */
  reviewedAt: string;
  /** Epoch milliseconds timestamp */
  reviewedTimestampMs: number;
  /** Name of the reviewing audiologist / specialist */
  audiologistName: string;
  /** Professional title / role */
  audiologistRole: string;
  /** Overall clinical impression rating */
  impression: 'normal' | 'mild_dysphonia' | 'moderate_dysphonia' | 'severe_dysphonia' | 'urgent_clinic_visit';
  /** Detailed expert analysis comments and acoustic observations */
  comments: string;
  /** Array of actionable clinical recommendations */
  recommendations: string[];
}

export interface VoiceAnalysisSubmission {
  id: string;
  patientId: string;
  patientName: string;
  patientMrn: string;
  /** Base64 WAV data URL (data:audio/wav;base64,...) */
  audioDataUrl: string;
  /** Audio sample duration in seconds */
  durationSec: number;
  /** Type of voice recording protocol */
  recordingType: 'phonation_aaa' | 'mpt' | 'passage' | 'custom_voice_note';
  /** Patient-reported subjective vocal complaints or note */
  patientNote: string;
  /** Optional flagged symptoms */
  symptoms?: string[];
  /**
   * Measurements computed on-device by voice-dsp.ts. Absent when analysis did not
   * run; never synthesised. A null field means "this task does not support that
   * measure" or "the take was too poor to score it" - not "assume a normal value".
   * The reviewing clinician must be able to tell those apart, so the UI renders
   * absent and null distinctly and never substitutes a default.
   */
  autoDspMetrics?: AutoDspMetrics;
  /** Status of audiologist review */
  status: 'pending' | 'reviewed';
  /** True only for the illustrative rows the queue seeds when empty. Never set this for a real submission. */
  isDemoSeed?: boolean;
  /** ISO timestamp of submission */
  createdAt: string;
  /** Epoch ms timestamp */
  createdTimestampMs: number;
  /** Expert analysis and comments from audiologist (present if reviewed) */
  expertReview?: ExpertReview;
}

const STORAGE_KEY = 'id-voice-analysis-submissions';

/**
 * Load voice submissions from local storage.
 */
export function loadLocalVoiceSubmissions(): VoiceAnalysisSubmission[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as VoiceAnalysisSubmission[]) : [];
  } catch {
    return [];
  }
}

/**
 * Save or update a single voice submission in local storage.
 */
export function saveLocalVoiceSubmission(submission: VoiceAnalysisSubmission): VoiceAnalysisSubmission[] {
  const current = loadLocalVoiceSubmissions();
  const filtered = current.filter((s) => s.id !== submission.id);
  const next = [submission, ...filtered];
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (err) {
      // Storage quota fallback: truncate old audio payloads if local storage is tight
      console.warn('Storage quota warning, truncating old audio payloads:', err);
      const truncated = next.slice(0, 30).map((s, idx) => (idx > 5 ? { ...s, audioDataUrl: '' } : s));
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(truncated));
      } catch {
        /* best effort */
      }
    }
  }
  return next;
}

/**
 * Submit a new voice sample for audiologist expert review.
 * Persists locally and syncs to Firebase Firestore backend with timestamps.
 */
export async function submitVoiceSampleForAnalysis(
  input: Omit<VoiceAnalysisSubmission, 'id' | 'createdAt' | 'createdTimestampMs' | 'status'>
): Promise<VoiceAnalysisSubmission> {
  const now = new Date();
  const newSubmission: VoiceAnalysisSubmission = {
    ...input,
    id: `vsub-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    status: 'pending',
    createdAt: now.toISOString(),
    createdTimestampMs: now.getTime(),
  };

  // Save to local storage immediately
  saveLocalVoiceSubmission(newSubmission);

  // Sync to Firebase backend
  try {
    await addDoc(collection(db, 'voice_analysis_submissions'), {
      ...newSubmission,
      backendTimestamp: serverTimestamp(),
    });
  } catch (err) {
    console.warn('Firebase voice submission sync warning:', err);
  }

  return newSubmission;
}

/**
 * Save an audiologist's expert analysis and comments for a patient's voice submission.
 * Saves locally and updates the backend document with timestamps.
 *
 * Throws if the submission does not exist locally - see the comment at the
 * lookup below for why this is not recoverable here.
 */
export async function saveExpertReview(
  submissionId: string,
  reviewInput: Omit<ExpertReview, 'reviewedAt' | 'reviewedTimestampMs'>
): Promise<VoiceAnalysisSubmission> {
  const now = new Date();
  const fullReview: ExpertReview = {
    ...reviewInput,
    reviewedAt: now.toISOString(),
    reviewedTimestampMs: now.getTime(),
  };

  const current = loadLocalVoiceSubmissions();
  const idx = current.findIndex((s) => s.id === submissionId);
  if (idx === -1) {
    // Refuse rather than invent. This previously fabricated a submission with a
    // hardcoded patient name and MRN, which would attach a real clinician's
    // signed review to a record for a patient who never made it. A missing
    // submission is a sync failure to surface, not a gap to paper over.
    throw new Error(
      `Cannot save review: voice submission ${submissionId} was not found. ` +
        'Reload the queue and try again - do not re-enter the review against a different sample.',
    );
  }

  const updated: VoiceAnalysisSubmission = {
    ...current[idx],
    status: 'reviewed',
    expertReview: fullReview,
  };

  saveLocalVoiceSubmission(updated);

  // Sync update to Firebase backend
  try {
    const q = query(collection(db, 'voice_analysis_submissions'), where('id', '==', submissionId));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const docRef = doc(db, 'voice_analysis_submissions', snapshot.docs[0].id);
      await updateDoc(docRef, {
        status: 'reviewed',
        expertReview: fullReview,
        reviewedBackendTimestamp: serverTimestamp(),
      });
    } else {
      await addDoc(collection(db, 'voice_analysis_submissions'), {
        ...updated,
        reviewedBackendTimestamp: serverTimestamp(),
      });
    }
  } catch (err) {
    console.warn('Firebase expert review sync warning:', err);
  }

  return updated;
}
