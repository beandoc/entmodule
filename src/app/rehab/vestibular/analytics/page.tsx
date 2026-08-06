import { AIGazeAnalyticsEngine } from '@/components/AIGazeAnalyticsEngine';

export const metadata = {
  title: 'AI Gaze Analytics | Vestibular Rehab | i-Dhanwantari',
  description:
    'Real-time eye-movement analytics for vestibular rehabilitation: VOR gain, fixation detection, saccade analysis, and nystagmus heuristic — all on-device.',
};

export default function GazeAnalyticsPage() {
  return <AIGazeAnalyticsEngine />;
}
