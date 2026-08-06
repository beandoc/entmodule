'use client';

import { CommandHospitalCare } from '@/components/CommandHospitalCare';
import { ClinicalErrorBoundary } from '@/components/ClinicalErrorBoundary';

export default function SchemesPage() {
  return (
    <ClinicalErrorBoundary componentName="CommandHospitalCare">
      <CommandHospitalCare />
    </ClinicalErrorBoundary>
  );
}
