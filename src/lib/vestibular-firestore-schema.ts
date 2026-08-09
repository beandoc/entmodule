/**
 * Cloud Firestore Schema Definitions for the Vestibular Rehabilitation Module
 * (ENT i-Dhanwantari System)
 */

import { Timestamp } from "firebase/firestore";

/* ------------------------------------------------------------------ 1. Users Collection */

export type UserRole = "PATIENT" | "CLINICIAN" | "ADMIN";
export type AffectedSide = "LEFT" | "RIGHT" | "BILATERAL" | "NONE";
export type FallRiskLevel = "LOW" | "MODERATE" | "HIGH";

export interface UserDocument {
  uid: string;
  role: UserRole;
  fullName: string;
  email: string;
  phone?: string;
  assignedClinicianId?: string;
  createdAt: Timestamp;
  clinicalProfile?: {
    primaryDiagnosis:
      | "BPPV"
      | "Unilateral Vestibular Hypofunction"
      | "Bilateral Vestibular Loss"
      | "Meniere's Disease"
      | "PPPD"
      | "Vestibular Migraine"
      | "Labyrinthitis"
      | "Other";
    affectedSide: AffectedSide;
    fallRisk: FallRiskLevel;
    baselineDhiScore?: number;
  };
}

/* ------------------------------------------------------------------ 2. Care Plan Prescriptions */

export type VoicePreference = "FEMALE_CALM" | "MALE_STEADY";
export type EyesRequirement = "OPEN" | "CLOSED" | "BOTH";

export interface PrescribedExercise {
  exerciseId: string;
  exerciseTitle: string;
  targetDurationSeconds: number;
  targetFrequencyHz?: number; // e.g. 1.0 Hz or 1.5 Hz for VOR x1 head turns
  eyesRequirement: EyesRequirement;
  audioGuidanceEnabled: boolean;
  voicePreference: VoicePreference;
  setsPerDay: number;
}

export interface PrescriptionDocument {
  id?: string;
  patientId: string;
  clinicianId: string;
  title: string; // e.g., "Post-BPPV Gaze Stability & Habituation Plan"
  prescribedExercises: PrescribedExercise[];
  active: boolean;
  startDate: Timestamp;
  endDate?: Timestamp;
  notes?: string;
}

/* ------------------------------------------------------------------ 3. Rep-Counter Exercise Sessions */

/**
 * Mirrors `VestibularSession` in `vestibular-rx.ts` — the camera-tracked,
 * hysteresis-gated rep-counter drills (VOR x1/x2, habituation, cervicogenic
 * shrug). Backend copy of what `saveSession()` already persists to
 * localStorage on-device, so it survives across devices and is queryable
 * per-patient for longitudinal adherence/quality trend tracking.
 */
export interface VestibularSessionDocument {
  id?: string;
  patientId: string;
  prescriptionId?: string;
  exerciseId: string;
  exerciseTitle?: string;
  reps: number;
  targetReps: number;
  meanPeakAngle: number;
  meanPeakVelocity: number;
  qualityScore: number;
  dizzinessBefore: number;
  dizzinessAfter: number;
  /** 'coach' for camera-tracked, 'manual' for the checklist guide. */
  mode: "coach" | "manual";
  date: string;
  timestamp: Timestamp;
}

/* ------------------------------------------------------------------ 4. PROMs (Outcome Measures) */

export interface PromsEvaluationDocument {
  id?: string;
  patientId: string;
  instrument: "DHI" | "ABC" | "VSS";
  totalScore: number;
  maxPossibleScore: number;
  subscores?: {
    functional?: number;
    emotional?: number;
    physical?: number;
  };
  severityGrade: "MILD" | "MODERATE" | "SEVERE";
  timestamp: Timestamp;
}

/* ------------------------------------------------------------------ 5. Gaze / VOR Telemetry (raw, per-sample) */

/**
 * Backend copy of `GazeSession` (gaze-tracking.ts), for the VOR-gain /
 * nystagmus / slow-phase-velocity pipeline. Unlike `VestibularSessionDocument`
 * above, this carries a downsampled *raw* sample stream (`gazeSeries` /
 * `headSeries`), not just the computed summary — that raw stream is the whole
 * point: it is what a clinician can later cross-correlate against a reference
 * VNG unit's own trace to calibrate `DEG_PER_UNIT` / `GAZE_GAIN_X` in
 * gaze-tracking.ts against ground truth, which the computed summary alone
 * cannot support.
 */
export interface GazeTelemetryDocument {
  id?: string;
  patientId: string;
  exerciseId: string;
  date: string;
  durationMs: number;
  analytics: unknown; // GazeAnalytics — kept loosely typed here to avoid importing the client gaze-tracking module into schema-only code
  gazeSeries?: Array<{ t: number; x: number; y: number; hasIris: boolean }>;
  headSeries?: Array<{ t: number; yaw: number }>;
  /** Free-text tag marking this as a paired recording against a reference device. */
  referenceTag?: string;
  /** Client `t` of a manually marked sync event, for offline clock alignment. */
  syncMarkerT?: number;
  timestamp: Timestamp;
}

/* ------------------------------------------------------------------ Collection Names */

export const FIRESTORE_COLLECTIONS = {
  USERS: "users",
  PRESCRIPTIONS: "vestibular_prescriptions",
  SESSIONS: "vestibular_sessions",
  GAZE_TELEMETRY: "vestibular_gaze_telemetry",
  PROMS: "proms_evaluations",
  VOICE_CUES_LOG: "voice_cues_log",
} as const;
