'use client';

import { DhingraPatientEducationHub } from '@/components/DhingraPatientEducationHub';
import { ClinicalErrorBoundary } from '@/components/ClinicalErrorBoundary';

export default function PatientEducationPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <ClinicalErrorBoundary componentName="DhingraPatientEducationHub">
        <DhingraPatientEducationHub />
      </ClinicalErrorBoundary>
    </div>
  );
}
