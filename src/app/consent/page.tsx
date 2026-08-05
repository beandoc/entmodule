'use client';

import { RiskConsent } from '@/components/RiskConsent';
import { ClinicalErrorBoundary } from '@/components/ClinicalErrorBoundary';
import { useAppData } from '@/lib/app-data-context';

export default function ConsentPage() {
  const { catalogueData } = useAppData();
  return (
    <ClinicalErrorBoundary componentName="RiskConsent">
      <RiskConsent riskDisclosures={catalogueData.riskDisclosures} />
    </ClinicalErrorBoundary>
  );
}
