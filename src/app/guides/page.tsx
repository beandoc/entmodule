'use client';

import { DhingraPatientEducationHub } from '@/components/DhingraPatientEducationHub';
import { SkillsLibrary } from '@/components/SkillsLibrary';
import { EustachianTubeGuide } from '@/components/EustachianTubeGuide';
import { TinnitusGuide } from '@/components/TinnitusGuide';
import { HearingLossGuide } from '@/components/HearingLossGuide';
import { EarwaxImpactionGuide } from '@/components/EarwaxImpactionGuide';
import { CochlearImplantGuide } from '@/components/CochlearImplantGuide';
import { ClinicalErrorBoundary } from '@/components/ClinicalErrorBoundary';
import { useAppData } from '@/lib/app-data-context';

export default function GuidesPage() {
  const { catalogueData } = useAppData();
  return (
    <div className="space-y-10 pb-12">
      <ClinicalErrorBoundary componentName="DhingraPatientEducationHub">
        <DhingraPatientEducationHub />
      </ClinicalErrorBoundary>

      <ClinicalErrorBoundary componentName="HearingLossGuide">
        <HearingLossGuide />
      </ClinicalErrorBoundary>

      <ClinicalErrorBoundary componentName="TinnitusGuide">
        <TinnitusGuide />
      </ClinicalErrorBoundary>

      <ClinicalErrorBoundary componentName="EustachianTubeGuide">
        <EustachianTubeGuide />
      </ClinicalErrorBoundary>

      <ClinicalErrorBoundary componentName="EarwaxImpactionGuide">
        <EarwaxImpactionGuide />
      </ClinicalErrorBoundary>

      <ClinicalErrorBoundary componentName="CochlearImplantGuide">
        <CochlearImplantGuide />
      </ClinicalErrorBoundary>

      <ClinicalErrorBoundary componentName="SkillsLibrary">
        <SkillsLibrary skillsGuides={catalogueData.skillsGuides} />
      </ClinicalErrorBoundary>
    </div>
  );
}
