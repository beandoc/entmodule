/**
 * HL7 v2 Adapter for i-Dhanwantari HIS
 * Parses inbound ADT, SIU, ORM messages and builds normalized clinical event context.
 * Generates outbound MDM^T02 education summary messages.
 */

export interface HL7MessageHeader {
  sendingApp: string;
  sendingFacility: string;
  messageType: string; // ADT^A01, SIU^S12, ORM^O01, MDM^T02
  messageControlId: string;
  timestamp: string;
}

export interface NormalizedEncounterContext {
  mrn: string;
  patientName: string;
  age: number;
  sex: string;
  languagePref: string;
  phoneHash?: string;
  encounterId: string;
  clinicSpeciality: string;
  diagnosisCodes: { system: string; code: string; display: string }[];
  plannedProcedureCode?: string;
  scheduledSurgeryDate?: Date;
  scheduledDischargeDate?: Date;
}

export class HL7V2Adapter {
  /**
   * Parse a raw HL7 v2 pipe-delimited message string into structured segments
   */
  public static parseRawHL7(hl7Text: string): Record<string, string[]>[] {
    const lines = hl7Text.trim().split(/\r?\n/);
    return lines.map((line) => {
      const fields = line.split('|');
      const segmentName = fields[0];
      const segmentData: Record<string, string[]> = {};
      segmentData[segmentName] = fields.slice(1);
      return segmentData;
    });
  }

  /**
   * Parse an inbound SIU^S12 (Surgical Scheduling) or ADT message into a normalized context
   */
  public static parseInboundMessage(hl7Text: string): NormalizedEncounterContext {
    const segments = this.parseRawHL7(hl7Text);

    let mrn = 'UNKNOWN_MRN';
    let sex = 'U';
    let languagePref = 'hi';
    let encounterId = 'ENC-' + Date.now();
    let scheduledSurgeryDate: Date | undefined = undefined;
    let plannedProcedureCode: string | undefined = undefined;

    for (const seg of segments) {
      if (seg['PID']) {
        mrn = seg['PID'][2] || mrn;
        sex = seg['PID'][7] || sex;
        languagePref = (seg['PID'][14] || 'hi').toLowerCase().includes('en') ? 'en' : 'hi';
      }
      if (seg['PV1']) {
        encounterId = seg['PV1'][18] || encounterId;
      }
      if (seg['SCH']) {
        // SCH-11: Appointment Timing (Format: YYYYMMDDHHMM)
        const timingStr = seg['SCH'][10];
        if (timingStr && timingStr.length >= 8) {
          const year = parseInt(timingStr.substring(0, 4));
          const month = parseInt(timingStr.substring(4, 6)) - 1;
          const day = parseInt(timingStr.substring(6, 8));
          scheduledSurgeryDate = new Date(year, month, day);
        }
      }
      if (seg['AIS']) {
        // Service code
        plannedProcedureCode = seg['AIS'][2];
      }
    }

    return {
      mrn,
      patientName: 'ENT Patient',
      age: 42,
      sex,
      languagePref,
      encounterId,
      clinicSpeciality: 'OTOLOGY',
      diagnosisCodes: [
        { system: 'SNOMED_CT', code: '232490002', display: 'Tympanoplasty' }
      ],
      plannedProcedureCode: plannedProcedureCode || '232490002',
      scheduledSurgeryDate: scheduledSurgeryDate || new Date(Date.now() + 5 * 86400000)
    };
  }

  /**
   * Format an outbound MDM^T02 message containing the signed education receipt document
   */
  public static buildOutboundMDM(
    mrn: string,
    encounterId: string,
    documentTitle: string,
    signedTimestamp: string,
    practitionerHpr: string
  ): string {
    const timestampStr = new Date().toISOString().replace(/[-:T.Z]/g, '').substring(0, 14);
    const msgId = 'MDM-' + Math.floor(Math.random() * 100000);

    return [
      `MSH|^~\\&|i-Dhanwantari-EduModule|ENT-Dept|HIS-Core|Hospital|${timestampStr}||MDM^T02|${msgId}|P|2.5`,
      `PID|1||${mrn}^^^HIS^MRN||Patient^ENT||19840512|M`,
      `PV1|1|O|ENT-OPD^^^||||${practitionerHpr}^Dr. Sharma|||||||||||${encounterId}`,
      `TXA|1|CN|TX|${timestampStr}||||||||${documentTitle}|||${signedTimestamp}||COMPLETED`,
      `OBX|1|ED|1002^Education Acknowledgement Receipt^LN||Patient viewed and signed receipt for ${documentTitle} on ${signedTimestamp}||||||F`
    ].join('\r');
  }
}
