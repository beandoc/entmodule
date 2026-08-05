/**
 * FHIR R4 Mapper (NRCeS India FHIR IG Aligned)
 * Maps domain entities (PatientRef, EducationOrder, OrderStep, Acknowledgements) to standard FHIR resources.
 */

export interface FHIRResource {
  resourceType: string;
  id: string;
  meta?: {
    profile?: string[];
  };
  [key: string]: any;
}

export class FHIRMapper {
  /**
   * Map PatientRef to FHIR Patient resource with ABHA identifier system
   */
  public static mapToPatient(patient: {
    id: string;
    mrn: string;
    abhaAddressHash?: string | null;
    sex: string;
    languagePref: string;
  }): FHIRResource {
    return {
      resourceType: 'Patient',
      id: patient.id,
      meta: {
        profile: ['https://nrces.in/ndhm/fhir/r4/StructureDefinition/Patient']
      },
      identifier: [
        {
          system: 'https://healthid.abdm.gov.in',
          value: patient.abhaAddressHash || 'ABHA-UNLINKED'
        },
        {
          system: 'https://idhanwantari.in/mrn',
          value: patient.mrn
        }
      ],
      gender: patient.sex === 'male' ? 'male' : patient.sex === 'female' ? 'female' : 'other',
      communication: [
        {
          language: {
            coding: [
              {
                system: 'urn:ietf:bcp:47',
                code: patient.languagePref
              }
            ]
          },
          preferred: true
        }
      ]
    };
  }

  /**
   * Map EducationOrder to FHIR CarePlan resource
   */
  public static mapToCarePlan(order: {
    id: string;
    patientRefId: string;
    orderedBy: string;
    encounterRef: string;
    pathwayTitle: string;
    steps: { id: string; title: string; scheduledFor: Date; status: string }[];
  }): FHIRResource {
    return {
      resourceType: 'CarePlan',
      id: order.id,
      meta: {
        profile: ['https://nrces.in/ndhm/fhir/r4/StructureDefinition/CarePlan']
      },
      status: 'active',
      intent: 'plan',
      title: order.pathwayTitle,
      subject: {
        reference: `Patient/${order.patientRefId}`
      },
      encounter: {
        reference: `Encounter/${order.encounterRef}`
      },
      author: {
        display: order.orderedBy
      },
      activity: order.steps.map((step) => ({
        detail: {
          kind: 'Task',
          code: {
            text: step.title
          },
          status: step.status === 'completed' ? 'completed' : 'scheduled',
          scheduledTiming: {
            event: [step.scheduledFor.toISOString()]
          }
        }
      }))
    };
  }

  /**
   * Map delivered education act to FHIR Communication resource (correct R4 resource for education delivery)
   */
  public static mapToCommunication(
    communicationId: string,
    patientId: string,
    topicTitle: string,
    deliveredAt: Date,
    practitionerHpr: string
  ): FHIRResource {
    return {
      resourceType: 'Communication',
      id: communicationId,
      meta: {
        profile: ['https://nrces.in/ndhm/fhir/r4/StructureDefinition/Communication']
      },
      status: 'completed',
      category: [
        {
          coding: [
            {
              system: 'http://terminology.hl7.org/CodeSystem/communication-category',
              code: 'instruction',
              display: 'Instruction'
            }
          ]
        }
      ],
      subject: {
        reference: `Patient/${patientId}`
      },
      topic: {
        text: topicTitle
      },
      sent: deliveredAt.toISOString(),
      sender: {
        display: practitionerHpr
      }
    };
  }

  /**
   * Map teach-back response to FHIR QuestionnaireResponse
   */
  public static mapToQuestionnaireResponse(
    responseId: string,
    patientId: string,
    topicCode: string,
    scorePct: number
  ): FHIRResource {
    return {
      resourceType: 'QuestionnaireResponse',
      id: responseId,
      status: 'completed',
      subject: {
        reference: `Patient/${patientId}`
      },
      questionnaire: `https://idhanwantari.in/questionnaire/${topicCode}`,
      item: [
        {
          linkId: 'comprehension_score',
          text: 'Teach-Back Comprehension Percentage',
          answer: [
            {
              valueDecimal: scorePct
            }
          ]
        }
      ]
    };
  }
}
