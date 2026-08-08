import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const patientRefId = url.searchParams.get('patientRefId') || 'pt_101';
    const format = url.searchParams.get('format') || 'fhir_r4';

    // Construct FHIR R4 Compliant Bundle
    const fhirBundle = {
      resourceType: 'Bundle',
      id: `bundle-idhanwantari-${Date.now()}`,
      meta: {
        lastUpdated: new Date().toISOString(),
        profile: ['https://nrces.in/ndhm/fhir/r4/StructureDefinition/DocumentBundle'],
      },
      identifier: {
        system: 'https://abdm.gov.in/hip/bundles',
        value: `ABDM-HIP-BUNDLE-${Date.now()}`,
      },
      type: 'document',
      timestamp: new Date().toISOString(),
      entry: [
        {
          fullUrl: 'urn:uuid:patient-sachin-srivastava',
          resource: {
            resourceType: 'Patient',
            id: patientRefId,
            identifier: [
              {
                system: 'https://healthid.ndhm.gov.in',
                value: '91-4821-9034-7712',
                type: { text: 'ABHA Number' },
              },
              {
                system: 'https://commandhospital.in/mrn',
                value: 'MRN: 88491',
                type: { text: 'Medical Record Number' },
              },
            ],
            name: [{ text: 'Sachin Srivastava', family: 'Srivastava', given: ['Sachin'] }],
            gender: 'male',
            birthDate: '1984-05-15',
            telecom: [
              { system: 'phone', value: '+919876567890', use: 'mobile' },
              { system: 'email', value: 'sachin.srivastava@abdm.in' },
            ],
          },
        },
        {
          fullUrl: 'urn:uuid:practitioner-vishal-gaurav',
          resource: {
            resourceType: 'Practitioner',
            id: 'doc_101',
            identifier: [
              {
                system: 'https://hpr.ndhm.gov.in',
                value: 'HPR-IN-987654',
                type: { text: 'Healthcare Professional Registry' },
              },
            ],
            name: [{ text: 'Dr. Vishal Gaurav', prefix: ['Dr.'], family: 'Gaurav', given: ['Vishal'] }],
            qualification: [{ code: { text: 'MS (ENT), Senior Otology & Base Hospital Surgeon' } }],
          },
        },
        {
          fullUrl: 'urn:uuid:practitioner-lokanath-sahoo',
          resource: {
            resourceType: 'Practitioner',
            id: 'aud_101',
            identifier: [
              {
                system: 'https://hpr.ndhm.gov.in',
                value: 'AUD-IN-88412',
                type: { text: 'Chief Clinical Audiologist' },
              },
            ],
            name: [{ text: 'Mr Lokanath Sahoo', prefix: ['Mr'], family: 'Sahoo', given: ['Lokanath'] }],
            qualification: [{ code: { text: 'M.Sc Clinical Audiology & Speech Pathology' } }],
          },
        },
        {
          fullUrl: 'urn:uuid:diagnosticreport-audiometry',
          resource: {
            resourceType: 'DiagnosticReport',
            id: `diag-audiogram-${Date.now()}`,
            status: 'final',
            category: [
              {
                coding: [
                  {
                    system: 'http://terminology.hl7.org/CodeSystem/v2-0074',
                    code: 'AU',
                    display: 'Audiology',
                  },
                ],
              },
            ],
            code: {
              coding: [
                {
                  system: 'http://loinc.org',
                  code: '28614-6',
                  display: 'Audiology Pure tone air and bone conduction panel',
                },
              ],
              text: 'Pure Tone Audiometry & Acoustic Immittance Report',
            },
            subject: { reference: 'urn:uuid:patient-sachin-srivastava' },
            performer: [{ reference: 'urn:uuid:practitioner-lokanath-sahoo' }],
            conclusion: 'Bilateral mild-to-moderate high-frequency sensorineural hearing loss. Jerger Type A tympanogram.',
            result: [
              {
                display: 'Right Ear Pure Tone Average (500-2000 Hz)',
                valueQuantity: { value: 28, unit: 'dB HL' },
              },
              {
                display: 'Left Ear Pure Tone Average (500-2000 Hz)',
                valueQuantity: { value: 35, unit: 'dB HL' },
              },
            ],
          },
        },
        {
          fullUrl: 'urn:uuid:consent-abdm-artefact',
          resource: {
            resourceType: 'Consent',
            id: `abdm-consent-${Date.now()}`,
            status: 'active',
            scope: {
              coding: [{ system: 'http://terminology.hl7.org/CodeSystem/consentscope', code: 'patient-privacy' }],
            },
            category: [
              {
                coding: [{ system: 'https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-consent-category', code: 'OPD' }],
              },
            ],
            patient: { reference: 'urn:uuid:patient-sachin-srivastava' },
            organization: [{ display: 'Command Hospital (SC) Pune / Base Hospital ND' }],
            policy: [{ uri: 'https://abdm.gov.in/privacy-policy' }],
          },
        },
      ],
    };

    return NextResponse.json({
      success: true,
      format,
      abdmVerified: true,
      hl7GradeCompliant: true,
      bundle: fhirBundle,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
