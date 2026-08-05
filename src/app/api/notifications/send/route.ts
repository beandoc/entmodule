import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { orderStepId, patientPhone, channel = 'whatsapp', messageText } = body;

    if (!messageText) {
      return NextResponse.json({ error: 'Message text is required' }, { status: 400 });
    }

    const now = new Date();
    let updatedStep = null;
    let newEvent = null;

    if (orderStepId) {
      // Update DB OrderStep status
      try {
        updatedStep = await prisma.orderStep.update({
          where: { id: orderStepId },
          data: {
            status: 'delivered',
            deliveredAt: now,
          },
        });

        // Record EngagementEvent
        newEvent = await prisma.engagementEvent.create({
          data: {
            orderStepId,
            eventType: 'delivered',
            detailsJson: JSON.stringify({
              channel,
              patientPhone: patientPhone || '+919876543210',
              messageText,
              sentAt: now.toISOString(),
            }),
          },
        });
      } catch (dbErr) {
        console.warn('Prisma DB order step update skipped (mock mode):', dbErr);
      }
    }

    // Simulate Gateway Payload
    const gatewayResponse = {
      success: true,
      messageId: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      channel,
      recipient: patientPhone || '+919876543210',
      deliveredAt: now.toISOString(),
      content: messageText,
      orderStepId: orderStepId || null,
      status: 'SENT_TO_GATEWAY',
    };

    return NextResponse.json(gatewayResponse);
  } catch (error: any) {
    console.error('Error in notification dispatch API:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
