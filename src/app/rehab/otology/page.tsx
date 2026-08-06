'use client';

import { OtologyCareTracker } from '@/components/OtologyCareTracker';
import { ClinicalErrorBoundary } from '@/components/ClinicalErrorBoundary';

export default function OtologyCarePage() {
  return (
    <ClinicalErrorBoundary componentName="OtologyCareTracker">
      <OtologyCareTracker />
    </ClinicalErrorBoundary>
  );
}
