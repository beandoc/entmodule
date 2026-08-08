import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { PublishGateEngine } from '@/lib/publish-gate';

export function generateStaticParams() {
  return [{ id: 'demo' }];
}

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const order = await prisma.educationOrder.findUnique({
      where: { id: params.id },
      include: {
        patientRef: {
          include: {
            guardianLinks: true
          }
        },
        pathwayTemplate: true,
        orderSteps: {
          include: {
            pathwayStep: true
          },
          orderBy: { scheduledFor: 'asc' }
        },
        acknowledgements: true
      }
    });

    if (!order) {
      return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
    }

    // Sensitive Disclosure Gate Check
    const gateCheck = PublishGateEngine.canDeliverOrderStep({
      id: order.id,
      disclosureState: order.disclosureState
    });

    if (!gateCheck.valid) {
      return NextResponse.json(
        {
          success: false,
          isEmbargoed: true,
          error: gateCheck.errors[0],
          patientRef: { mrn: order.patientRef.mrn, sex: order.patientRef.sex },
          pathwayTitle: order.pathwayTemplate.title
        },
        { status: 403 }
      );
    }

    // Fetch topics & asset variants scoped to this order's pathway steps only —
    // pulling the full catalogue here does an unbounded fetch of every topic's
    // versions/locale variants/media objects on every order view.
    const topicCodes = Array.from(new Set(order.orderSteps.map((s) => s.pathwayStep.topicCode)));

    const topics = await prisma.topic.findMany({
      where: { code: { in: topicCodes } },
      include: {
        codeMaps: true,
        assets: {
          include: {
            versions: {
              where: { status: 'published' },
              include: {
                localeVariants: {
                  include: {
                    mediaObjects: true
                  }
                }
              }
            }
          }
        }
      }
    });

    const glossary = await prisma.glossaryTerm.findMany();

    return NextResponse.json({
      success: true,
      order,
      topics,
      glossary
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
