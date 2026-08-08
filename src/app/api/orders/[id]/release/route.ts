import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export function generateStaticParams() {
  return [{ id: 'demo' }];
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const { practitionerHpr } = body;

    if (!practitionerHpr) {
      return NextResponse.json(
        { success: false, error: 'practitionerHpr is required to release a sensitive-disclosure embargo.' },
        { status: 400 }
      );
    }

    const updatedOrder = await prisma.educationOrder.update({
      where: { id: params.id },
      data: {
        disclosureState: 'released',
        releasedAt: new Date(),
        releasedBy: practitionerHpr
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
