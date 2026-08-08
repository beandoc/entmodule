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

/* ------------------------------------------------------------------ 3. Telemetry Session Logs */

export type SessionSafetyStatus = "NORMAL" | "STABILITY_WARNING" | "SAFETY_ABORT";

export interface SessionTelemetry {
  maxLateralSwayCm: number;
  maxAnteriorPosteriorSwayCm: number;
  meanHeadRollDegrees: number;
  meanHeadPitchDegrees: number;
  meanHeadYawDegrees: number;
  cadenceHz: number;
  offBalanceEventsCount: number;
  voiceCuesTriggeredCount: number;
}

export interface VestibularSessionDocument {
  id?: string;
  patientId: string;
  prescriptionId?: string;
  exerciseId: string;
  exerciseTitle: string;
  eyesClosed: boolean;
  durationCompletedSeconds: number;
  targetDurationSeconds: number;
  overallCompliancePercent: number;
  eyesClosedCompliancePercent: number; // Eye Aspect Ratio (EAR) compliance check
  telemetry: SessionTelemetry;
  safetyStatus: SessionSafetyStatus;
  postExerciseDizzinessScore?: number; // 0-10 VAS scale
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

/* ------------------------------------------------------------------ Collection Names */

export const FIRESTORE_COLLECTIONS = {
  USERS: "users",
  PRESCRIPTIONS: "vestibular_prescriptions",
  SESSIONS: "vestibular_sessions",
  PROMS: "proms_evaluations",
  VOICE_CUES_LOG: "voice_cues_log",
} as const;
