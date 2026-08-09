import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

const COLLECTION = "vestibular_sessions";

/**
 * POST /api/vestibular/session
 * Persist a completed rep-counter exercise session (VOR x1/x2, habituation,
 * cervicogenic shrug — see `EXERCISES` in vestibular-rx.ts). Mirrors what
 * `saveSession()` already writes to localStorage on-device; this is the
 * cross-device / longitudinal copy.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { patientId, exerciseId } = body;

    if (!patientId || !exerciseId) {
      return NextResponse.json({ error: "Missing patientId or exerciseId" }, { status: 400 });
    }

    const docRef = await adminDb.collection(COLLECTION).add({
      patientId,
      prescriptionId: body.prescriptionId ?? null,
      exerciseId,
      exerciseTitle: body.exerciseTitle ?? null,
      reps: Number(body.reps) || 0,
      targetReps: Number(body.targetReps) || 0,
      meanPeakAngle: Number(body.meanPeakAngle) || 0,
      meanPeakVelocity: Number(body.meanPeakVelocity) || 0,
      qualityScore: Number(body.qualityScore) || 0,
      dizzinessBefore: Number(body.dizzinessBefore) || 0,
      dizzinessAfter: Number(body.dizzinessAfter) || 0,
      mode: body.mode === "manual" ? "manual" : "coach",
      date: body.date || new Date().toISOString().slice(0, 10),
      timestamp: new Date(),
    });

    return NextResponse.json({ success: true, sessionId: docRef.id }, { status: 201 });
  } catch (error: any) {
    console.error("API POST /api/vestibular/session error:", error);
    return NextResponse.json({ error: error.message || "Server Error" }, { status: 500 });
  }
}

/**
 * GET /api/vestibular/session?patientId=xxx
 * Recent rep-counter sessions for a patient, most recent first — powers
 * cross-device longitudinal adherence/quality trend tracking.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const patientId = searchParams.get("patientId");

    if (!patientId) {
      return NextResponse.json({ error: "Missing patientId parameter" }, { status: 400 });
    }

    const snapshot = await adminDb
      .collection(COLLECTION)
      .where("patientId", "==", patientId)
      .orderBy("timestamp", "desc")
      .limit(300)
      .get();

    const sessions = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({ success: true, sessions });
  } catch (error: any) {
    console.error("API GET /api/vestibular/session error:", error);
    return NextResponse.json({ error: error.message || "Server Error" }, { status: 500 });
  }
}
