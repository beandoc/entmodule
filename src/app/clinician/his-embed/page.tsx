'use client';

import { HisEmbedPanel } from '@/components/HisEmbedPanel';
import { ClinicalErrorBoundary } from '@/components/ClinicalErrorBoundary';
import { useAppData } from '@/lib/app-data-context';

export default function HisEmbedPage() {
  const { orders, handleReleaseEmbargo } = useAppData();
  return (
    <ClinicalErrorBoundary componentName="HisEmbedPanel">
      <HisEmbedPanel orders={orders} handleReleaseEmbargo={handleReleaseEmbargo} />
    </ClinicalErrorBoundary>
  );
}
