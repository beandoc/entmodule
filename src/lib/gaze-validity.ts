/**
 * Gaze Tracking Signal Validity Engine
 *
 * Implements clinical signal quality gates before scoring gaze performance.
 * Evaluates frame rate stability, iris tracking availability, blink fraction,
 * head velocity thresholds, and sample window duration.
 */

import { GazePoint } from './gaze-tracking';

export interface HeadPoint {
  t: number;
  yaw: number;
  pitch?: number;
  roll?: number;
}

export type ValidityReason =
  | 'low_frame_rate'
  | 'insufficient_head_velocity'
  | 'high_blink_fraction'
  | 'poor_calibration'
  | 'target_head_not_opposed'
  | 'short_window_duration'
  | 'low_iris_confidence';

export interface ValidityResult {
  /** True if signal quality meets minimum thresholds for valid physiological scoring */
  isScoreable: boolean;
  /** Overall confidence score [0.0 to 1.0] */
  overallConfidence: number;
  /** Quality classification for UI badge */
  qualityGrade: 'excellent' | 'good' | 'borderline' | 'invalid';
  /** Failure or warning reasons */
  reasons: ValidityReason[];
  /** Detailed empirical metrics evaluated during gate check */
  metrics: {
    effectiveFps: number;
    fpsCv: number;
    blinkFraction: number;
    irisAvailability: number;
    meanConfidence: number;
    peakHeadVelocityDeg: number;
    trackingWindowSec: number;
    calibrationMaeDeg?: number;
  };
}

export interface ValidityOptions {
  /** Target mode for mode-specific thresholds */
  mode?: 'smooth_pursuit' | 'vor_x1' | 'vor_x2' | 'saccade' | 'okn' | 'fixation';
  /** Minimum continuous tracking window (seconds). Default 3.0s */
  minWindowSec?: number;
  /** Minimum required effective FPS. Default 15.0 */
  minFps?: number;
  /** Maximum allowable blink/dropout ratio [0.0-1.0]. Default 0.25 */
  maxBlinkFraction?: number;
  /** Minimum iris landmark availability ratio [0.0-1.0]. Default 0.70 */
  minIrisAvailability?: number;
  /** Minimum peak head velocity for VOR modes (deg/s). Default 15.0 */
  minVorHeadVelocityDeg?: number;
  /** Calibration MAE threshold (deg). Default 3.5 */
  maxCalibrationMaeDeg?: number;
}

/**
 * Evaluates a sequence of gaze points (and optional head pose series) against
 * clinical signal quality gates.
 */
export function evaluateGazeValidity(
  gazeSeries: GazePoint[],
  headSeries?: HeadPoint[],
  calibrationMaeDeg?: number,
  options: ValidityOptions = {}
): ValidityResult {
  const mode = options.mode || 'smooth_pursuit';
  const minWindowSec = options.minWindowSec ?? 3.0;
  const minFps = options.minFps ?? 15.0;
  const maxBlinkFraction = options.maxBlinkFraction ?? 0.25;
  const minIrisAvailability = options.minIrisAvailability ?? 0.70;
  const minVorHeadVelocityDeg = options.minVorHeadVelocityDeg ?? 15.0;
  const maxCalibrationMaeDeg = options.maxCalibrationMaeDeg ?? 3.5;

  const reasons: ValidityReason[] = [];

  if (!gazeSeries || gazeSeries.length < 5) {
    return {
      isScoreable: false,
      overallConfidence: 0,
      qualityGrade: 'invalid',
      reasons: ['short_window_duration', 'low_frame_rate'],
      metrics: {
        effectiveFps: 0,
        fpsCv: 1,
        blinkFraction: 1,
        irisAvailability: 0,
        meanConfidence: 0,
        peakHeadVelocityDeg: 0,
        trackingWindowSec: 0,
        calibrationMaeDeg,
      },
    };
  }

  // 1. Window Duration
  const startT = gazeSeries[0].t;
  const endT = gazeSeries[gazeSeries.length - 1].t;
  const trackingWindowSec = Math.max((endT - startT) / 1000, 0);

  if (trackingWindowSec < minWindowSec) {
    reasons.push('short_window_duration');
  }

  // 2. Sampling Rate & Frame Rate Stability
  const timeGaps: number[] = [];
  for (let i = 1; i < gazeSeries.length; i++) {
    const dt = gazeSeries[i].t - gazeSeries[i - 1].t;
    if (dt > 0 && dt < 1000) {
      timeGaps.push(dt);
    }
  }

  let effectiveFps = 0;
  let fpsCv = 0;
  if (timeGaps.length > 0) {
    const meanDtMs = timeGaps.reduce((sum, g) => sum + g, 0) / timeGaps.length;
    effectiveFps = meanDtMs > 0 ? 1000 / meanDtMs : 0;

    const variance =
      timeGaps.reduce((sum, g) => sum + Math.pow(g - meanDtMs, 2), 0) / timeGaps.length;
    const stdDtMs = Math.sqrt(variance);
    fpsCv = meanDtMs > 0 ? stdDtMs / meanDtMs : 1.0;
  }

  if (effectiveFps < minFps || fpsCv > 0.40) {
    reasons.push('low_frame_rate');
  }

  // 3. Iris Availability & Blink / Dropout Fraction
  let irisCount = 0;
  let blinkCount = 0;
  let totalConfidenceSum = 0;

  for (const g of gazeSeries) {
    if (g.hasIris) irisCount++;
    if (g.isBlink) blinkCount++;
    totalConfidenceSum += g.confidence ?? (g.hasIris ? 0.9 : 0.2);
  }

  const irisAvailability = irisCount / gazeSeries.length;
  const blinkFraction = blinkCount / gazeSeries.length;
  const meanConfidence = totalConfidenceSum / gazeSeries.length;

  if (irisAvailability < minIrisAvailability || meanConfidence < 0.50) {
    reasons.push('low_iris_confidence');
  }

  if (blinkFraction > maxBlinkFraction) {
    reasons.push('high_blink_fraction');
  }

  // 4. Head Velocity Check for VOR modes
  let peakHeadVelocityDeg = 0;
  if (headSeries && headSeries.length >= 4) {
    const headVelocities: number[] = [];
    for (let i = 1; i < headSeries.length; i++) {
      const dtSec = (headSeries[i].t - headSeries[i - 1].t) / 1000;
      if (dtSec > 0 && dtSec < 0.2) {
        const dYaw = Math.abs(headSeries[i].yaw - headSeries[i - 1].yaw);
        headVelocities.push(dYaw / dtSec);
      }
    }

    if (headVelocities.length > 0) {
      // Sort head velocities to pick 90th percentile to avoid single noise spike
      const sorted = [...headVelocities].sort((a, b) => a - b);
      const idx90 = Math.floor(sorted.length * 0.9);
      peakHeadVelocityDeg = sorted[idx90] ?? sorted[sorted.length - 1];
    }
  }

  if ((mode === 'vor_x1' || mode === 'vor_x2') && peakHeadVelocityDeg < minVorHeadVelocityDeg) {
    reasons.push('insufficient_head_velocity');
  }

  // 5. Calibration Quality
  if (calibrationMaeDeg !== undefined && calibrationMaeDeg > maxCalibrationMaeDeg) {
    reasons.push('poor_calibration');
  }

  // 6. Overall Confidence & Scoreability Calculation
  let qualityPenalty = 0;
  if (reasons.includes('low_frame_rate')) qualityPenalty += 0.25;
  if (reasons.includes('low_iris_confidence')) qualityPenalty += 0.25;
  if (reasons.includes('high_blink_fraction')) qualityPenalty += 0.30;
  if (reasons.includes('short_window_duration')) qualityPenalty += 0.35;
  if (reasons.includes('insufficient_head_velocity')) qualityPenalty += 0.25;
  if (reasons.includes('poor_calibration')) qualityPenalty += 0.20;

  const overallConfidence = Math.max(0, Math.min(1.0, meanConfidence * (1.0 - qualityPenalty * 0.8)));

  const isScoreable =
    !reasons.includes('short_window_duration') &&
    !reasons.includes('high_blink_fraction') &&
    (mode !== 'vor_x1' && mode !== 'vor_x2' ? true : !reasons.includes('insufficient_head_velocity'));

  const qualityGrade: ValidityResult['qualityGrade'] =
    !isScoreable || overallConfidence < 0.40 ? 'invalid' :
    overallConfidence >= 0.85 && reasons.length === 0 ? 'excellent' :
    overallConfidence >= 0.65 ? 'good' : 'borderline';

  return {
    isScoreable,
    overallConfidence: parseFloat(overallConfidence.toFixed(2)),
    qualityGrade,
    reasons,
    metrics: {
      effectiveFps: parseFloat(effectiveFps.toFixed(1)),
      fpsCv: parseFloat(fpsCv.toFixed(2)),
      blinkFraction: parseFloat(blinkFraction.toFixed(2)),
      irisAvailability: parseFloat(irisAvailability.toFixed(2)),
      meanConfidence: parseFloat(meanConfidence.toFixed(2)),
      peakHeadVelocityDeg: parseFloat(peakHeadVelocityDeg.toFixed(1)),
      trackingWindowSec: parseFloat(trackingWindowSec.toFixed(1)),
      calibrationMaeDeg: calibrationMaeDeg !== undefined ? parseFloat(calibrationMaeDeg.toFixed(2)) : undefined,
    },
  };
}
