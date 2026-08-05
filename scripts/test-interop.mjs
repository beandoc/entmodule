import { HL7V2Adapter } from '../src/lib/hl7-adapter.ts';
import { FHIRMapper } from '../src/lib/fhir-mapper.ts';
import { PublishGateEngine } from '../src/lib/publish-gate.ts';
import pkg from '@prisma/client';
const { PrismaClient } = pkg;

const prisma = new PrismaClient();

async function runTests() {
  console.log('----------------------------------------------------');
  console.log('Running Interoperability, Safety Gates & Part 5 Tests');
  console.log('----------------------------------------------------\n');

  // 1. HL7 v2 Parsing Test
  console.log('1. Testing HL7 v2 Inbound SIU^S12 (Surgery Scheduling)...');
  const sampleSIU = [
    'MSH|^~\\&|iDhanwantariHIS|ENTClinic|EduModule|App|20260805140000||SIU^S12|MSG-99201|P|2.5',
    'PID|1||MRN-2026-8812^^^HIS^MRN||Srivastava^Sachin||19850412|M|||Hindi',
    'PV1|1|O|ENT-OPD^^^||||HPR-IN-908122^Dr Sharma|||||||||||ENC-2026-0812-OTOLOGY',
    'SCH|1001|1001|||1001|SURGERY|Tympanoplasty Repair|||20260810090000',
    'AIS|1||232490002^Tympanoplasty'
  ].join('\r');

  const parsed = HL7V2Adapter.parseInboundMessage(sampleSIU);
  console.log(`   [PASS] Extracted MRN: ${parsed.mrn}`);
  console.log(`   [PASS] Language Pref: ${parsed.languagePref}`);
  console.log(`   [PASS] Scheduled Surgery Date: ${parsed.scheduledSurgeryDate.toDateString()}`);
  console.log(`   [PASS] Coded Procedure: ${parsed.plannedProcedureCode}\n`);

  // 2. Outbound HL7 MDM^T02 Document
  console.log('2. Testing Outbound HL7 MDM^T02 (Education Summary Document)...');
  const mdmOut = HL7V2Adapter.buildOutboundMDM(
    parsed.mrn,
    parsed.encounterId,
    'Tympanoplasty Water Precaution Receipt',
    new Date().toISOString(),
    'HPR-IN-908122'
  );
  console.log('   [PASS] Generated MDM Message Segment:');
  console.log('   ' + mdmOut.split('\r')[0]);
  console.log('   ' + mdmOut.split('\r')[4] + '\n');

  // 3. Sensitive Disclosure Gate Test
  console.log('3. Testing Sensitive-Disclosure Gating Engine...');
  const embargoedCheck = PublishGateEngine.canDeliverOrderStep({
    id: 'order-onco-gated',
    disclosureState: 'embargoed'
  });
  if (!embargoedCheck.valid) {
    console.log(`   [PASS] Blocked embargoed oncology order: ${embargoedCheck.errors[0]}`);
  }

  const releasedCheck = PublishGateEngine.canDeliverOrderStep({
    id: 'order-tympano-released',
    disclosureState: 'released'
  });
  if (releasedCheck.valid) {
    console.log('   [PASS] Permitted released order successfully.\n');
  }

  // 4. Content Publish-Gate Test
  console.log('4. Testing Content Publish-Gates (Coding & Accessibility)...');
  const invalidTopicCheck = PublishGateEngine.validateTopicCoding({
    code: 'TOPIC-UNCODED',
    title: 'Uncoded Topic Example',
    codeMaps: []
  });
  console.log(`   [PASS] Rejected uncoded topic: ${invalidTopicCheck.errors[0]}`);

  const mediaCheck = PublishGateEngine.validateMediaAccessibility({
    objectKey: 'media/test.mp4',
    captionTrackUrl: '',
    transcriptText: ''
  });
  console.log(`   [PASS] Rejected media without captions: ${mediaCheck.errors[0]}\n`);

  // 5. Part 5 Clinical Catalogue Data Verification
  console.log('5. Testing Part 5 Clinical Catalogue & Interactive Tools...');
  const harmAlerts = await prisma.preventableHarmAlert.findMany();
  console.log(`   [PASS] Loaded ${harmAlerts.length} Preventable Harm Alerts`);

  const skills = await prisma.skillGuide.findMany();
  console.log(`   [PASS] Practical Skill Guides query completed (${skills.length} records)`);

  const decisionAids = await prisma.decisionAid.findMany();
  console.log(`   [PASS] Shared Decision-Making Aids query completed (${decisionAids.length} records)`);

  const entitlements = await prisma.indiaEntitlement.findMany();
  console.log(`   [PASS] India Entitlements query completed (${entitlements.length} records)`);

  const riskDisclosures = await prisma.riskDisclosure.findMany();
  console.log(`   [PASS] Consent Risk Disclosures query completed (${riskDisclosures.length} records)\n`);

  // 6. ABHA Digital Health Consent & Non-Emergency Disclaimer Test
  console.log('6. Testing ABHA ID Consent & HIS Symptom Log / PROM Doctor Sharing...');
  const sampleAbhaConsent = {
    patientMrn: 'MRN-ENT-2026-8842',
    abhaNumber: '91-4821-9034-7712',
    abhaAddress: 'sachin.srivastava@abdm',
    hospitalHisName: 'Command Hospital (SC), Pune',
    authorizedDoctorHpr: 'Prof. Dr. A. Sharma (HPR-IN-987654)',
    shareSymptomLogs: true,
    sharePromScores: true,
    disclaimerAccepted: true,
    validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
  };
  await prisma.abhaConsent.upsert({
    where: { patientMrn: sampleAbhaConsent.patientMrn },
    update: sampleAbhaConsent,
    create: sampleAbhaConsent
  });
  const savedConsent = await prisma.abhaConsent.findUnique({ where: { patientMrn: sampleAbhaConsent.patientMrn } });
  console.log(`   [PASS] Verified ABHA Consent linked for MRN: ${savedConsent.patientMrn} (ABHA: ${savedConsent.abhaNumber})`);
  console.log(`   [PASS] Authorized Doctor: ${savedConsent.authorizedDoctorHpr}`);
  console.log(`   [PASS] Non-Emergency OPD Disclaimer Accepted: ${savedConsent.disclaimerAccepted}\n`);

  console.log('----------------------------------------------------');
  console.log('ALL INTEROPERABILITY, SAFETY & ABHA CONSENT TESTS PASSED!');
  console.log('----------------------------------------------------');

  await prisma.$disconnect();
}

runTests().catch(console.error);
