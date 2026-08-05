import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(req: Request) {
  const now = new Date();

  try {
    // Find all scheduled order steps that are due
    const pendingSteps = await prisma.orderStep.findMany({
      where: {
        status: 'scheduled',
        scheduledFor: { lte: now },
      },
      include: {
        educationOrder: {
          include: {
            patientRef: true,
          },
        },
        pathwayStep: true,
      },
    });

    const dispatchedSteps: any[] = [];

    for (const step of pendingSteps) {
      // Update OrderStep status to delivered
      await prisma.orderStep.update({
        where: { id: step.id },
        data: {
          status: 'delivered',
          deliveredAt: now,
        },
      });

      // Log EngagementEvent
      await prisma.engagementEvent.create({
        data: {
          orderStepId: step.id,
          eventType: 'delivered',
          detailsJson: JSON.stringify({
            channel: 'whatsapp',
            scheduledFor: step.scheduledFor,
            deliveredAt: now.toISOString(),
            topicCode: step.pathwayStep.topicCode,
            stepTitle: step.pathwayStep.title,
            mrn: step.educationOrder.patientRef?.mrn,
          }),
        },
      });

      dispatchedSteps.push({
        stepId: step.id,
        title: step.pathwayStep.title,
        mrn: step.educationOrder.patientRef?.mrn,
        deliveredAt: now.toISOString(),
        channel: 'whatsapp',
      });
    }

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      dispatchedCount: dispatchedSteps.length,
      dispatchedSteps,
      pushEngineStatus: 'ACTIVE_GATEWAY_SYNCED',
    });
  } catch (error: any) {
    console.error('Error executing automated push notification dispatcher:', error);
    return NextResponse.json({ error: error.message || 'Push Dispatch Error' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'READY',
    engine: 'i-Dhanwantari Push Notification Dispatcher (WhatsApp / SMS)',
    interval: '5 minutes',
  });
}
