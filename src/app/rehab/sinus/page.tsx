'use client';

import { SinusIrrigationCompanion } from '@/components/SinusIrrigationCompanion';
import { ClinicalErrorBoundary } from '@/components/ClinicalErrorBoundary';

export default function SinusIrrigationPage() {
  return (
    <ClinicalErrorBoundary componentName="SinusIrrigationCompanion">
      <SinusIrrigationCompanion />
    </ClinicalErrorBoundary>
  );
}
