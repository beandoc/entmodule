import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireClinician, isDenial } from '@/lib/api-auth';

/**
 * The clinician alert queue.
 *
 * An alert that lands in a dashboard nobody staffs is a liability, not a
 * feature. This route deliberately exposes acknowledgement so that "who saw this
 * and when" is answerable; a queue that can only be read is not a safety net.
 */

export async function GET(request: Request) {
  try {
    const guard = requireClinician(request);
    if (isDenial(guard)) {
      return NextResponse.json({ success: false, error: guard.error }, { status: guard.status });
    }

    const url = new URL(request.url);
    const includeAcknowledged = url.searchParams.get('all') === 'true';

    const alerts = await prisma.voiceAlert.findMany({
      where: includeAcknowledged ? {} : { acknowledgedAt: null },
      orderBy: [{ severity: 'asc' }, { triggeredAt: 'desc' }],
      take: 200,
      include: {
        patientRef: { select: { id: true, mrn: true, ageBand: true, sex: true, languagePref: true } },
        voiceSession: true,
      },
    });

    return NextResponse.json({ success: true, alerts });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const guard = requireClinician(request);
    if (isDenial(guard)) {
      return NextResponse.json({ success: false, error: guard.error }, { status: guard.status });
    }

    const body = await request.json();
    if (!body.alertId) {
      return NextResponse.json({ success: false, error: 'alertId is required.' }, { status: 400 });
    }

    const alert = await prisma.voiceAlert.update({
      where: { id: body.alertId },
      data: {
        acknowledgedAt: new Date(),
        acknowledgedBy: guard.practitionerId ?? 'unknown',
      },
    });

    return NextResponse.json({ success: true, alert });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
