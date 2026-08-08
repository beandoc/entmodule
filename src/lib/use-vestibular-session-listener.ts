"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "./firebase";
import type { VestibularSessionDocument } from "./vestibular-firestore-schema";

export interface SessionListenerState {
  session: VestibularSessionDocument | null;
  loading: boolean;
  error: string | null;
  isLive: boolean;
}

/**
 * Custom React Hook to subscribe to real-time Firestore updates for a active vestibular exercise session.
 *
 * @param sessionId The Firestore document ID of the active vestibular session.
 */
export function useVestibularSessionListener(sessionId: string | null): SessionListenerState {
  const [state, setState] = useState<SessionListenerState>({
    session: null,
    loading: Boolean(sessionId),
    error: null,
    isLive: false,
  });

  useEffect(() => {
    if (!sessionId) {
      setState({ session: null, loading: false, error: null, isLive: false });
      return;
    }

    setState((prev) => ({ ...prev, loading: true, error: null }));

    const docRef = doc(db, "vestibular_sessions", sessionId);

    // Subscribe to real-time document snapshots
    const unsubscribe = onSnapshot(
      docRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as VestibularSessionDocument;
          setState({
            session: { id: snapshot.id, ...data },
            loading: false,
            error: null,
            isLive: true,
          });
        } else {
          setState({
            session: null,
            loading: false,
            error: "Session document not found.",
            isLive: false,
          });
        }
      },
      (err) => {
        console.error("Firestore real-time session listener error:", err);
        setState({
          session: null,
          loading: false,
          error: err.message || "Failed to sync real-time session data.",
          isLive: false,
        });
      }
    );

    return () => unsubscribe();
  }, [sessionId]);

  return state;
}
