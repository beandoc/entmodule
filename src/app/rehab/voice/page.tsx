import { VoiceRecoveryMonitor } from '@/components/VoiceRecoveryMonitor';
import { ClinicalErrorBoundary } from '@/components/ClinicalErrorBoundary';

export const metadata = {
  title: 'Voice Recovery Monitor | Rehab | i-Dhanwantari',
  description:
    'Post-operative voice and swallowing recovery tracking: maximum phonation time, cepstral peak prominence, syllable rate, VHI-10 and EAT-10 — measured on-device.',
};

export default function VoiceRecoveryPage() {
  return (
    <ClinicalErrorBoundary componentName="VoiceRecoveryMonitor">
      <VoiceRecoveryMonitor />
    </ClinicalErrorBoundary>
  );
}
