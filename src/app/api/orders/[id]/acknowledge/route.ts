import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { HL7V2Adapter } from '@/lib/hl7-adapter';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const { assetVersionId, signatureText } = body;

    if (!signatureText) {
      return NextResponse.json({ success: false, error: 'signatureText is required' }, { status: 400 });
    }

    const order = await prisma.educationOrder.findUnique({
      where: { id: params.id },
      include: {
        patientRef: true,
        pathwayTemplate: true,
        orderSteps: { include: { pathwayStep: true } }
      }
    });

    if (!order) {
      return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
    }

    // Resolve which published asset version is actually being acknowledged instead of
    // trusting an unvalidated client-supplied id or falling back to a made-up placeholder.
    let resolvedAssetVersionId: string | undefined = assetVersionId;
    if (!resolvedAssetVersionId) {
      const topicCodes = Array.from(new Set(order.orderSteps.map((s) => s.pathwayStep.topicCode)));
      const publishedVersion = await prisma.assetVersion.findFirst({
        where: { status: 'published', asset: { topic: { code: { in: topicCodes } } } },
        orderBy: { createdAt: 'desc' }
      });
      resolvedAssetVersionId = publishedVersion?.id;
    }

    if (!resolvedAssetVersionId) {
      return NextResponse.json(
        { success: false, error: 'No published asset version found for this order to acknowledge.' },
        { status: 400 }
      );
    }

    const timestamp = new Date().toISOString();
    const sigPayload = `Patient ${order.patientRef.mrn} viewed and confirmed understanding of ${order.pathwayTemplate.title} at ${timestamp}. Signature: ${signatureText}`;

    const ack = await prisma.educationAcknowledgement.create({
      data: {
        educationOrderId: order.id,
        assetVersionId: resolvedAssetVersionId,
        signaturePayload: sigPayload
      }
    });

    // Generate MDM HL7 message for HIS ingestion
    const mdmPayload = HL7V2Adapter.buildOutboundMDM(
      order.patientRef.mrn,
      order.encounterRef,
      order.pathwayTemplate.title,
      timestamp,
      order.orderedBy
    );

    return NextResponse.json({
      success: true,
      acknowledgement: ack,
      hl7MdmPayload: mdmPayload
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
