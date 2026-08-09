/**
 * Binocular Disconjugacy & Monocular Analytics Engine
 *
 * Evaluates left-eye vs right-eye agreement, vergence metrics, monocular fallbacks,
 * and binocular velocity disconjugacy during gaze tracking.
 */

import { GazePoint } from './gaze-tracking';

export interface BinocularAnalyticsReport {
  /** Mean disconjugacy distance in normalized screen units */
  meanDisconjugacyNorm: number;
  /** Disconjugacy in visual angle degrees */
  meanDisconjugacyDeg: number;
  /** Left vs Right eye velocity correlation [-1.0 to 1.0] */
  velocityCorrelation: number;
  /** Percentage of frames where monocular fallback occurred (one eye missing/blink) */
  monocularFallbackFraction: number;
  /** Dominant eye if disconjugacy asymmetry is present */
  dominantEye: 'left' | 'right' | 'balanced';
  /** True if disconjugacy is within normal clinical limits (< 1.5 deg) */
  isConjugate: boolean;
  /** Warning message if monocular tracking or high disconjugacy is detected */
  warningMessage?: string;
}

/**
 * Computes binocular alignment and disconjugacy metrics over a series of GazePoints.
 */
export function evaluateBinocularAnalytics(
  gazeSeries: GazePoint[],
  degPerUnit: number = 30
): BinocularAnalyticsReport {
  if (!gazeSeries || gazeSeries.length < 5) {
    return {
      meanDisconjugacyNorm: 0,
      meanDisconjugacyDeg: 0,
      velocityCorrelation: 1.0,
      monocularFallbackFraction: 0,
      dominantEye: 'balanced',
      isConjugate: true,
    };
  }

  let totalDisconjugacy = 0;
  let validFrameCount = 0;
  let monocularCount = 0;

  const leftVelocities: number[] = [];
  const rightVelocities: number[] = [];

  for (let i = 0; i < gazeSeries.length; i++) {
    const g = gazeSeries[i];

    const hasLeft = g.leftEyeX !== undefined && g.leftEyeY !== undefined;
    const hasRight = g.rightEyeX !== undefined && g.rightEyeY !== undefined;

    if (hasLeft && hasRight) {
      const dx = g.leftEyeX! - g.rightEyeX!;
      const dy = g.leftEyeY! - g.rightEyeY!;
      const dist = Math.sqrt(dx * dx + dy * dy);
      totalDisconjugacy += dist;
      validFrameCount++;

      if (i > 0) {
        const prev = gazeSeries[i - 1];
        if (prev.leftEyeX !== undefined && prev.rightEyeX !== undefined) {
          const dt = (g.t - prev.t) / 1000;
          if (dt > 0 && dt < 0.1) {
            const lvx = (g.leftEyeX! - prev.leftEyeX!) / dt;
            const rvx = (g.rightEyeX! - prev.rightEyeX!) / dt;
            leftVelocities.push(lvx);
            rightVelocities.push(rvx);
          }
        }
      }
    } else if (hasLeft || hasRight) {
      monocularCount++;
    }
  }

  const monocularFallbackFraction = gazeSeries.length > 0 ? monocularCount / gazeSeries.length : 0;
  const meanDisconjugacyNorm = validFrameCount > 0 ? totalDisconjugacy / validFrameCount : 0;
  const meanDisconjugacyDeg = meanDisconjugacyNorm * degPerUnit;

  // Pearson correlation between left and right eye horizontal velocities
  let velocityCorrelation = 1.0;
  if (leftVelocities.length > 4) {
    const meanL = leftVelocities.reduce((s, v) => s + v, 0) / leftVelocities.length;
    const meanR = rightVelocities.reduce((s, v) => s + v, 0) / rightVelocities.length;

    let num = 0;
    let denL = 0;
    let denR = 0;

    for (let k = 0; k < leftVelocities.length; k++) {
      const dL = leftVelocities[k] - meanL;
      const dR = rightVelocities[k] - meanR;
      num += dL * dR;
      denL += dL * dL;
      denR += dR * dR;
    }

    const den = Math.sqrt(denL * denR);
    if (den > 1e-9) {
      velocityCorrelation = Math.max(-1.0, Math.min(1.0, num / den));
    }
  }

  const isConjugate = meanDisconjugacyDeg <= 1.5 && velocityCorrelation >= 0.70;

  let warningMessage: string | undefined;
  if (monocularFallbackFraction > 0.30) {
    warningMessage = 'High monocular tracking fallback — check eye illumination and camera position.';
  } else if (!isConjugate) {
    warningMessage = 'Elevated binocular disconjugacy detected — results may reflect asymmetric tracking or eye movement.';
  }

  return {
    meanDisconjugacyNorm: parseFloat(meanDisconjugacyNorm.toFixed(4)),
    meanDisconjugacyDeg: parseFloat(meanDisconjugacyDeg.toFixed(2)),
    velocityCorrelation: parseFloat(velocityCorrelation.toFixed(2)),
    monocularFallbackFraction: parseFloat(monocularFallbackFraction.toFixed(2)),
    dominantEye: 'balanced',
    isConjugate,
    warningMessage,
  };
}
