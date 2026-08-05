import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const harmAlerts = await prisma.preventableHarmAlert.findMany();
    const skillsGuides = await prisma.skillGuide.findMany();
    const entitlements = await prisma.indiaEntitlement.findMany();
    const decisionAids = await prisma.decisionAid.findMany();
    const riskDisclosures = await prisma.riskDisclosure.findMany();
    const stomaCards = await prisma.stomaEmergencyCard.findMany();
    const patientStories = await prisma.patientStory.findMany();

    return NextResponse.json({
      success: true,
      harmAlerts,
      skillsGuides,
      entitlements,
      decisionAids,
      riskDisclosures,
      stomaCards,
      patientStories
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { educationOrderId, structureName, annotationJson, createdById } = body;

    const annotation = await prisma.consultAnnotation.create({
      data: {
        educationOrderId: educationOrderId || 'order-1',
        structureName: structureName || 'Temporal Bone 3D',
        annotationJson: JSON.stringify(annotationJson || {}),
        createdById: createdById || 'HPR-IN-908122'
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Annotated 3D structure pushed to patient care plan timeline successfully.',
      annotation
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
