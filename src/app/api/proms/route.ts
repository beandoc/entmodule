import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { resolvePatientScope, isDenial } from '@/lib/api-auth';

/**
 * Patient-reported outcome measures.
 *
 * PROMResponse has been modelled since the schema was first written - its
 * comment names SNOT-22, THI, VHI-10, HHIE-S, DHI and EAT-10 - but nothing has
 * ever read or written it. The DHI and THI scores the app computes today live
 * only in localStorage, per browser, per device, which means they are invisible
 * to any clinician and lost when the patient changes phone. This route is the
 * table's first consumer.
 */

const SUPPORTED = ['VHI-10', 'EAT-10', 'DHI', 'THI', 'SNOT-22', 'HHIE-S'];

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const scope = resolvePatientScope(request, url.searchParams.get('patientRefId'));
    if (isDenial(scope)) {
      return NextResponse.json({ success: false, error: scope.error }, { status: scope.status });
    }

    const instrument = url.searchParams.get('instrument');

    const responses = await prisma.pROMResponse.findMany({
      where: {
        patientRefId: scope.patientRefId,
        ...(instrument ? { instrumentName: instrument } : {}),
      },
      orderBy: { submittedAt: 'desc' },
      take: 100,
    });

    return NextResponse.json({ success: true, responses });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const scope = resolvePatientScope(request, body.patientRefId);
    if (isDenial(scope)) {
      return NextResponse.json({ success: false, error: scope.error }, { status: scope.status });
    }

    if (!SUPPORTED.includes(body.instrumentName)) {
      return NextResponse.json(
        { success: false, error: `Unknown instrument: ${body.instrumentName}` },
        { status: 400 },
      );
    }
    if (typeof body.score !== 'number' || !Number.isFinite(body.score)) {
      return NextResponse.json({ success: false, error: 'A numeric score is required.' }, { status: 400 });
    }

    const response = await prisma.pROMResponse.create({
      data: {
        patientRefId: scope.patientRefId,
        educationOrderId: body.educationOrderId ?? null,
        instrumentName: body.instrumentName,
        score: body.score,
        answersJson: JSON.stringify(body.answers ?? {}),
      },
    });

    return NextResponse.json({ success: true, response });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
