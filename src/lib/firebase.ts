import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getFirestore,
  collection,
  doc,
  addDoc,
  onSnapshot,
  serverTimestamp,
  type Unsubscribe,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Check if Firebase env vars are configured
const isConfigured = Boolean(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);
if (!isConfigured && typeof window !== "undefined") {
  console.warn(
    "⚠️ Firebase configuration missing in .env. Please define NEXT_PUBLIC_FIREBASE_PROJECT_ID and associated keys."
  );
}

// Initialize Firebase (Singleton)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const db = getFirestore(app);
export const auth = getAuth(app);

/* ------------------------------------------------------------------ Firestore Helpers */

export interface VestibularSessionRecord {
  patientId: string;
  exerciseName: string;
  eyesClosed: boolean;
  durationSeconds: number;
  maxSwayAngle: number;
  headRotationFrequencyHz: number;
  voiceAlertsCount: number;
  completionStatus: "COMPLETED" | "INTERRUPTED" | "SAFETY_STOP";
  timestamp?: any;
}

/**
 * Save a completed vestibular exercise session log to Firestore.
 */
export async function saveVestibularSession(session: VestibularSessionRecord) {
  try {
    const sessionsCol = collection(db, "vestibular_sessions");
    const docRef = await addDoc(sessionsCol, {
      ...session,
      timestamp: serverTimestamp(),
    });
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error("Error saving vestibular session to Firestore:", error);
    throw error;
  }
}

/**
 * Real-time listener for live exercise sessions (e.g. for Clinician Monitoring Dashboard).
 */
export function subscribeToVestibularSession(
  sessionId: string,
  onUpdate: (data: VestibularSessionRecord | null) => void
): Unsubscribe {
  const sessionRef = doc(db, "vestibular_sessions", sessionId);
  return onSnapshot(
    sessionRef,
    (snapshot) => {
      if (snapshot.exists()) {
        onUpdate(snapshot.data() as VestibularSessionRecord);
      } else {
        onUpdate(null);
      }
    },
    (err) => {
      console.error("Firestore real-time subscription error:", err);
    }
  );
}

export default app;
