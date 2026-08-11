import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { resolvePatientScope, isDenial } from '@/lib/api-auth';

/**
 * Voice session persistence.
 *
 * Unlike the other routes in this app, these are scoped: a request can only read
 * or write the patient its session is bound to. See src/lib/api-auth.ts for what
 * that guarantee is and is not worth.
 *
 * Raw audio never reaches this route. Only derived measurements are stored, plus
 * the recording conditions needed to judge whether they are comparable.
 */

const MAX_PAGE = 200;

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const scope = resolvePatientScope(request, url.searchParams.get('patientRefId'));
    if (isDenial(scope)) {
      return NextResponse.json({ success: false, error: scope.error }, { status: scope.status });
    }

    const limit = Math.min(MAX_PAGE, Number(url.searchParams.get('limit')) || 60);

    const sessions = await prisma.voiceSession.findMany({
      where: { patientRefId: scope.patientRefId },
      orderBy: { recordedAt: 'desc' },
      take: limit,
      include: { alerts: true },
    });

    return NextResponse.json({ success: true, sessions });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

interface IncomingAlert {
  kind: string;
  source: string;
  severity: string;
  detail?: string;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const scope = resolvePatientScope(request, body.patientRefId);
    if (isDenial(scope)) {
      return NextResponse.json({ success: false, error: scope.error }, { status: scope.status });
    }

    if (body.cohort !== 'partial_laryngectomy' && body.cohort !== 'chemoradiation') {
      return NextResponse.json(
        {
          success: false,
          error:
            'Unsupported cohort. This protocol is validated only for partial laryngectomy and chemoradiation.',
        },
        { status: 400 },
      );
    }

    const num = (v: unknown): number | null =>
      typeof v === 'number' && Number.isFinite(v) ? v : null;

    const alerts: IncomingAlert[] = Array.isArray(body.alerts) ? body.alerts : [];

    const session = await prisma.voiceSession.create({
      data: {
        patientRefId: scope.patientRefId,
        cohort: body.cohort,
        recordedAt: body.recordedAt ? new Date(body.recordedAt) : new Date(),
        mptSec: num(body.mptSec),
        mptTrialsJson: JSON.stringify(body.mptTrials ?? []),
        cppsDb: num(body.cppsDb),
        cppsVoicedRatio: num(body.cppsVoicedRatio),
        ddkAmrRate: num(body.ddkAmrRate),
        ddkSmrRate: num(body.ddkSmrRate),
        ddkIntervalCvPct: num(body.ddkIntervalCvPct),
        noiseFloorDb: num(body.noiseFloorDb),
        deviceFingerprint: body.deviceFingerprint ?? null,
        appliedConstraintsJson: body.appliedConstraints
          ? JSON.stringify(body.appliedConstraints)
          : null,
        qualityFlagsJson: JSON.stringify(body.qualityFlags ?? []),
        audioRetained: false,
        // Praat sidecar output (see services/voice-analysis) - avqi/abi stay
        // null with a reason at this layer too; see buildVoiceSession in
        // voice-rx.ts, which is what actually decides these values.
        passageDurationSec: num(body.passageDurationSec),
        avqiReliabilityFlag: typeof body.avqiReliabilityFlag === 'boolean' ? body.avqiReliabilityFlag : null,
        praatCppsDb: num(body.praatCppsDb),
        hnrDb: num(body.hnrDb),
        shimmerLocalPct: num(body.shimmerLocalPct),
        shimmerLocalDb: num(body.shimmerLocalDb),
        ltasSlopeDb: num(body.ltasSlopeDb),
        ltasTiltDb: num(body.ltasTiltDb),
        praatF0MedianHz: num(body.praatF0MedianHz),
        avqi: num(body.avqi),
        avqiUnavailableReason: body.avqiUnavailableReason ?? null,
        abi: num(body.abi),
        abiUnavailableReason: body.abiUnavailableReason ?? null,
        alerts: {
          create: alerts.map((a) => ({
            patientRefId: scope.patientRefId,
            kind: a.kind,
            source: a.source,
            severity: a.severity,
            detailJson: a.detail ? JSON.stringify({ detail: a.detail }) : null,
          })),
        },
      },
      include: { alerts: true },
    });

    return NextResponse.json({ success: true, session });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
