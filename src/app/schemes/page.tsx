'use client';

import { IndiaSchemes } from '@/components/IndiaSchemes';
import { ClinicalErrorBoundary } from '@/components/ClinicalErrorBoundary';
import { useAppData } from '@/lib/app-data-context';

export default function SchemesPage() {
  const { catalogueData } = useAppData();
  return (
    <ClinicalErrorBoundary componentName="IndiaSchemes">
      <IndiaSchemes entitlements={catalogueData.entitlements} />
    </ClinicalErrorBoundary>
  );
}
