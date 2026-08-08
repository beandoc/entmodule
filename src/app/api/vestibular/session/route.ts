import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

/**
 * POST /api/vestibular/session
 * Record a completed vestibular exercise session via Server API
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { patientId, exerciseId, exerciseTitle, eyesClosed, durationCompletedSeconds, telemetry, safetyStatus } = body;

    if (!patientId || !exerciseId) {
      return NextResponse.json({ error: "Missing patientId or exerciseId" }, { status: 400 });
    }

    const docRef = await adminDb.collection("vestibular_sessions").add({
      patientId,
      exerciseId,
      exerciseTitle: exerciseTitle || "Vestibular Exercise",
      eyesClosed: Boolean(eyesClosed),
      durationCompletedSeconds: durationCompletedSeconds || 0,
      telemetry: telemetry || {},
      safetyStatus: safetyStatus || "NORMAL",
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
 * Retrieve recent sessions for a patient
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const patientId = searchParams.get("patientId");

    if (!patientId) {
      return NextResponse.json({ error: "Missing patientId parameter" }, { status: 400 });
    }

    const snapshot = await adminDb
      .collection("vestibular_sessions")
      .where("patientId", "==", patientId)
      .orderBy("timestamp", "desc")
      .limit(20)
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
