/**
 * Minimal current-patient identity for the vestibular telemetry backend.
 *
 * This is NOT authentication — the app has none today (see the header comment
 * in `api-auth.ts`, which candidly documents the same gap for the Prisma-backed
 * routes). It is the same convention already used ad hoc across the app
 * (`AudiologistWorkspace.tsx`, `AbhaConsentPanel.tsx` both default to the
 * registered demo patient `'pt_101'` from `/api/users`) made into one shared,
 * persisted helper instead of being re-hardcoded per component, so telemetry
 * saved from different screens lands under the same patient record.
 */

const STORAGE_KEY = 'id-current-patient-id';
const DEFAULT_PATIENT_ID = 'pt_101';

export function getCurrentPatientId(): string {
  if (typeof window === 'undefined') return DEFAULT_PATIENT_ID;
  try {
    return window.localStorage.getItem(STORAGE_KEY) || DEFAULT_PATIENT_ID;
  } catch {
    return DEFAULT_PATIENT_ID;
  }
}

export function setCurrentPatientId(patientId: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, patientId);
  } catch {
    // Storage disabled — the session still works, just un-persisted.
  }
}
