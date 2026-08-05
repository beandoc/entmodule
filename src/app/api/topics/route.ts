import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { PublishGateEngine } from '@/lib/publish-gate';

export async function GET() {
  try {
    const topics = await prisma.topic.findMany({
      include: {
        codeMaps: true,
        assets: {
          include: {
            versions: {
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

    const topicsWithValidation = topics.map((t) => {
      const codingValidation = PublishGateEngine.validateTopicCoding({
        code: t.code,
        title: t.title,
        codeMaps: t.codeMaps
      });

      return {
        ...t,
        isValidForPublish: codingValidation.valid,
        validationErrors: codingValidation.errors
      };
    });

    return NextResponse.json({ success: true, topics: topicsWithValidation });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { code, title, description, topicType, subspeciality, snomedCode, icdCode } = body;

    const codeMapsData = [];
    if (snomedCode) codeMapsData.push({ system: 'SNOMED_CT', code: snomedCode, display: title });
    if (icdCode) codeMapsData.push({ system: 'ICD_10', code: icdCode, display: title });

    // Validate coding publish gate
    const codingValidation = PublishGateEngine.validateTopicCoding({
      code,
      title,
      codeMaps: codeMapsData
    });

    if (!codingValidation.valid) {
      return NextResponse.json(
        { success: false, error: codingValidation.errors[0] },
        { status: 400 }
      );
    }

    const topic = await prisma.topic.create({
      data: {
        code,
        title,
        description,
        topicType: topicType || 'procedure',
        subspeciality: subspeciality || 'otology',
        codeMaps: {
          create: codeMapsData
        }
      },
      include: { codeMaps: true }
    });

    return NextResponse.json({ success: true, topic });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
