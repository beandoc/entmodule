'use client';

import { TinnitusReliefStudio } from '@/components/TinnitusReliefStudio';
import { ClinicalErrorBoundary } from '@/components/ClinicalErrorBoundary';

export default function TinnitusReliefPage() {
  return (
    <ClinicalErrorBoundary componentName="TinnitusReliefStudio">
      <TinnitusReliefStudio />
    </ClinicalErrorBoundary>
  );
}
