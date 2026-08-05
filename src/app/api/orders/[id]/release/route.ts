import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const { practitionerHpr } = body;

    const updatedOrder = await prisma.educationOrder.update({
      where: { id: params.id },
      data: {
        disclosureState: 'released',
        releasedAt: new Date(),
        releasedBy: practitionerHpr || 'HPR-IN-908122'
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Sensitive diagnosis embargo released successfully by clinician.',
      order: updatedOrder
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
