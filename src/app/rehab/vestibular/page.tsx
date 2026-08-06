'use client';

import { VestibularRehabGuide } from '@/components/VestibularRehabGuide';
import { ClinicalErrorBoundary } from '@/components/ClinicalErrorBoundary';

export default function VestibularRehabPage() {
  return (
    <ClinicalErrorBoundary componentName="VestibularRehabGuide">
      <VestibularRehabGuide />
    </ClinicalErrorBoundary>
  );
}
