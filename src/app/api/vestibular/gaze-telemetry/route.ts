import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

const COLLECTION = "vestibular_gaze_telemetry";

/**
 * POST /api/vestibular/gaze-telemetry
 * Persist a completed gaze-analytics session: the computed VOR/nystagmus/SPV
 * summary, plus a downsampled raw gaze+head sample stream (see
 * `downsampleSeries` in gaze-tracking.ts). The raw stream is what makes this
 * data usable for calibrating VOR gain / SPV against a reference VNG unit —
 * the aggregate summary alone cannot support that.
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
      exerciseId,
      date: body.date || new Date().toISOString().slice(0, 10),
      durationMs: Number(body.durationMs) || 0,
      analytics: body.analytics ?? null,
      gazeSeries: Array.isArray(body.gazeSeries) ? body.gazeSeries : [],
      headSeries: Array.isArray(body.headSeries) ? body.headSeries : [],
      referenceTag: body.referenceTag || null,
      syncMarkerT: typeof body.syncMarkerT === "number" ? body.syncMarkerT : null,
      timestamp: new Date(),
    });

    return NextResponse.json({ success: true, sessionId: docRef.id }, { status: 201 });
  } catch (error: any) {
    console.error("API POST /api/vestibular/gaze-telemetry error:", error);
    return NextResponse.json({ error: error.message || "Server Error" }, { status: 500 });
  }
}

/**
 * GET /api/vestibular/gaze-telemetry?id=xxx
 *   Single session, full raw series — for calibration-study offline export.
 * GET /api/vestibular/gaze-telemetry?patientId=xxx[&summary=1]
 *   Recent sessions for a patient, most recent first. `summary=1` strips
 *   gazeSeries/headSeries server-side, since a longitudinal trend chart only
 *   needs the aggregate `analytics` and fetching the full raw stream for many
 *   sessions at once is unnecessary payload.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (id) {
      const snap = await adminDb.collection(COLLECTION).doc(id).get();
      if (!snap.exists) {
        return NextResponse.json({ error: "Session not found" }, { status: 404 });
      }
      return NextResponse.json({ success: true, session: { id: snap.id, ...snap.data() } });
    }

    const patientId = searchParams.get("patientId");
    if (!patientId) {
      return NextResponse.json({ error: "Missing patientId or id parameter" }, { status: 400 });
    }
    const summary = searchParams.get("summary") === "1";

    const snapshot = await adminDb
      .collection(COLLECTION)
      .where("patientId", "==", patientId)
      .orderBy("timestamp", "desc")
      .limit(100)
      .get();

    const sessions = snapshot.docs.map((doc) => {
      const data = doc.data();
      if (summary) {
        const { gazeSeries, headSeries, ...rest } = data;
        return { id: doc.id, ...rest };
      }
      return { id: doc.id, ...data };
    });

    return NextResponse.json({ success: true, sessions });
  } catch (error: any) {
    console.error("API GET /api/vestibular/gaze-telemetry error:", error);
    return NextResponse.json({ error: error.message || "Server Error" }, { status: 500 });
  }
}
