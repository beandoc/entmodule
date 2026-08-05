/**
 * Publish-Gate Validation Engine
 * Enforces non-negotiable rules for publishing content & delivering education orders.
 */

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export class PublishGateEngine {
  /**
   * Rule 1: Topic must carry at least one SNOMED-CT or ICD code
   */
  public static validateTopicCoding(topic: {
    code: string;
    title: string;
    codeMaps: { system: string; code: string }[];
  }): ValidationResult {
    const errors: string[] = [];

    const hasClinicalCode = topic.codeMaps && topic.codeMaps.some(
      (m) => m.system === 'SNOMED_CT' || m.system === 'ICD_10' || m.system === 'ICD_11'
    );

    if (!hasClinicalCode) {
      errors.push(
        `Publish-Gate Violation: Topic '${topic.title}' (${topic.code}) is missing a SNOMED-CT or ICD clinical code mapping.`
      );
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Rule 2: Media assets must have mandatory captions & transcripts for Hearing-Friendly accessibility
   */
  public static validateMediaAccessibility(media: {
    objectKey: string;
    captionTrackUrl?: string | null;
    transcriptText?: string | null;
  }): ValidationResult {
    const errors: string[] = [];

    if (!media.captionTrackUrl || media.captionTrackUrl.trim() === '') {
      errors.push(`Publish-Gate Violation: Media '${media.objectKey}' is missing mandatory captions (captionTrackUrl).`);
    }

    if (!media.transcriptText || media.transcriptText.trim() === '') {
      errors.push(`Publish-Gate Violation: Media '${media.objectKey}' is missing mandatory transcript text.`);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Rule 3: Sensitive-Disclosure Gating
   * Embargoed orders cannot be delivered to patients until released by a practitioner.
   */
  public static canDeliverOrderStep(order: {
    id: string;
    disclosureState: string; // 'embargoed' | 'released'
  }): ValidationResult {
    const errors: string[] = [];

    if (order.disclosureState === 'embargoed') {
      errors.push(
        `Delivery Blocked: Order ${order.id} is currently EMBARGOED under Sensitive-Disclosure Gating rules. Clinician release required.`
      );
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}
