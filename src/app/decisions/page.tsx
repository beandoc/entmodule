'use client';

import { DecisionAids } from '@/components/DecisionAids';
import { ClinicalErrorBoundary } from '@/components/ClinicalErrorBoundary';
import { useAppData } from '@/lib/app-data-context';

export default function DecisionsPage() {
  const { catalogueData } = useAppData();
  return (
    <ClinicalErrorBoundary componentName="DecisionAids">
      <DecisionAids decisionAids={catalogueData.decisionAids} />
    </ClinicalErrorBoundary>
  );
}
