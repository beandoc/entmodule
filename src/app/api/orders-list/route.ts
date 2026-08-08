import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const orders = await prisma.educationOrder.findMany({
      include: {
        patientRef: true,
        pathwayTemplate: true,
        orderSteps: {
          include: {
            pathwayStep: true
          },
          orderBy: { scheduledFor: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ success: true, orders });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
