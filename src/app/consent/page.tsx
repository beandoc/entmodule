'use client';

import React from 'react';
import { RiskConsent } from '@/components/RiskConsent';
import { AbhaConsentPanel } from '@/components/AbhaConsentPanel';
import { ClinicalErrorBoundary } from '@/components/ClinicalErrorBoundary';
import { useAppData } from '@/lib/app-data-context';

export default function ConsentPage() {
  const { catalogueData } = useAppData();

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-8">
      <ClinicalErrorBoundary componentName="AbhaConsentPanel">
        <AbhaConsentPanel />
      </ClinicalErrorBoundary>

      <ClinicalErrorBoundary componentName="RiskConsent">
        <RiskConsent riskDisclosures={catalogueData.riskDisclosures} />
      </ClinicalErrorBoundary>
    </div>
  );
}
