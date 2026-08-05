'use client';

import { StomaEmergencyCard } from '@/components/StomaEmergencyCard';
import { ClinicalErrorBoundary } from '@/components/ClinicalErrorBoundary';
import { useAppData } from '@/lib/app-data-context';

export default function EmergencyPage() {
  const { catalogueData } = useAppData();
  return (
    <ClinicalErrorBoundary componentName="StomaEmergencyCard">
      <StomaEmergencyCard stomaCards={catalogueData.stomaCards} />
    </ClinicalErrorBoundary>
  );
}
