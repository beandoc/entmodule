import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { HL7V2Adapter } from '@/lib/hl7-adapter';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const { assetVersionId, signatureText } = body;

    const order = await prisma.educationOrder.findUnique({
      where: { id: params.id },
      include: { patientRef: true, pathwayTemplate: true }
    });

    if (!order) {
      return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
    }

    const timestamp = new Date().toISOString();
    const sigPayload = `Patient ${order.patientRef.mrn} viewed and confirmed understanding of ${order.pathwayTemplate.title} at ${timestamp}. Signature: ${signatureText}`;

    const ack = await prisma.educationAcknowledgement.create({
      data: {
        educationOrderId: order.id,
        assetVersionId: assetVersionId || 'v1-tympano',
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
