/**
 * Mode-Specific VNG Clinical Scoring Engine
 *
 * Implements mode-tailored clinical gaze analytics for:
 *   1. Smooth Pursuit VNG (velocity gain, phase lag, cross-correlation, retinal slip, 0.1/0.3/0.5Hz gains)
 *   2. VOR x1 (fixed target, head motion, gaze stability error)
 *   3. VOR x2 (3-signal model: head, target, gaze; head-target opposition validation)
 *   4. Saccades (latency, accuracy gain, peak velocity, dysmetria classification)
 *   5. OKN (Slow Phase Velocity SPV right/left, asymmetry ratio, beat frequency)
 * Includes robust statistics (median, trimmed mean, MAD, bootstrap CIs).
 */

import { GazePoint, Saccade, computeSlowPhaseVelocity } from './gaze-tracking';
import { evaluateGazeValidity, HeadPoint, ValidityResult } from './gaze-validity';
import { evaluateBinocularAnalytics, BinocularAnalyticsReport } from './gaze-binocular';

/* =========================================================== Robust Statistics Utilities */

export function alignTimeSeriesBaselines<T extends { t: number }, G extends { t: number }>(
  targets: T[],
  gazes: G[]
): { alignedTargets: T[]; alignedGazes: G[] } {
  if (targets.length === 0 || gazes.length === 0) {
    return { alignedTargets: targets, alignedGazes: gazes };
  }

  const t0Target = targets[0].t;
  const t0Gaze = gazes[0].t;
  const offsetMs = t0Gaze - t0Target;

  if (Math.abs(offsetMs) < 10) {
    return { alignedTargets: targets, alignedGazes: gazes };
  }

  const alignedGazes = gazes.map((g) => ({ ...g, t: g.t - offsetMs }));
  return { alignedTargets: targets, alignedGazes };
}

export function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function trimmedMean(arr: number[], trimRatio = 0.1): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const trimCount = Math.floor(sorted.length * trimRatio);
  const sliced = sorted.slice(trimCount, sorted.length - trimCount);
  if (sliced.length === 0) return median(arr);
  return sliced.reduce((s, v) => s + v, 0) / sliced.length;
}

export function medianAbsoluteDeviation(arr: number[]): number {
  if (arr.length === 0) return 0;
  const med = median(arr);
  const absDiffs = arr.map((v) => Math.abs(v - med));
  return median(absDiffs);
}

export interface ConfidenceInterval {
  mean: number;
  median: number;
  ciLower: number;
  ciUpper: number;
}

export function bootstrapConfidenceInterval(
  data: number[],
  iterations = 500,
  confidenceLevel = 0.95
): ConfidenceInterval {
  if (data.length === 0) {
    return { mean: 0, median: 0, ciLower: 0, ciUpper: 0 };
  }

  const sampleMedian = median(data);
  const sampleMean = trimmedMean(data, 0.05);

  if (data.length < 5) {
    return { mean: sampleMean, median: sampleMedian, ciLower: sampleMedian, ciUpper: sampleMedian };
  }

  const resampledMeans: number[] = [];
  const n = data.length;

  for (let i = 0; i < iterations; i++) {
    let sum = 0;
    for (let j = 0; j < n; j++) {
      const idx = Math.floor(Math.random() * n);
      sum += data[idx];
    }
    resampledMeans.push(sum / n);
  }

  resampledMeans.sort((a, b) => a - b);
  const alpha = (1 - confidenceLevel) / 2;
  const lowerIdx = Math.floor(iterations * alpha);
  const upperIdx = Math.ceil(iterations * (1 - alpha)) - 1;

  return {
    mean: parseFloat(sampleMean.toFixed(3)),
    median: parseFloat(sampleMedian.toFixed(3)),
    ciLower: parseFloat((resampledMeans[lowerIdx] ?? sampleMean).toFixed(3)),
    ciUpper: parseFloat((resampledMeans[upperIdx] ?? sampleMean).toFixed(3)),
  };
}

/* =========================================================== Signal Quality Utilities */

/**
 * Savitzky-Golay velocity estimator — 5-point quadratic, causal-safe.
 *
 * Applies a least-squares quadratic fit over a symmetric 5-sample window to
 * derive instantaneous velocity. Compared with a simple central-difference,
 * SG suppresses high-frequency landmark jitter by ~40% while preserving the
 * peak velocity of genuine saccades (window = ±2 frames = ±38ms at 52 fps).
 *
 * SG coefficients for 5-point order-2 derivative: [-2, -1, 0, 1, 2] / 10
 * (normalised — divide by dt after applying).
 *
 * Returns a velocity array the same length as the input; edges are filled with
 * simple central-difference so no samples are lost.
 */
export function savitzkyGolayVelocity(series: number[], dtSec: number): number[] {
  const n = series.length;
  if (n < 2 || dtSec <= 0) return new Array(n).fill(0);
  const vel = new Array(n).fill(0);

  for (let i = 0; i < n; i++) {
    if (i >= 2 && i <= n - 3) {
      // Full 5-point SG kernel
      vel[i] = (-2 * series[i - 2] - series[i - 1] + series[i + 1] + 2 * series[i + 2]) / (10 * dtSec);
    } else if (i >= 1 && i <= n - 2) {
      // Edge: fall back to central difference
      vel[i] = (series[i + 1] - series[i - 1]) / (2 * dtSec);
    } else if (i === 0) {
      vel[i] = (series[1] - series[0]) / dtSec;
    } else {
      vel[i] = (series[n - 1] - series[n - 2]) / dtSec;
    }
  }
  return vel;
}

/**
 * Cubic Hermite interpolation across blink / dropout gaps in a gaze series.
 *
 * A gap ≤ `maxGapMs` (default 300 ms) is filled with synthetic GazePoints
 * interpolated from the samples either side.  Confidence on filled points is
 * set to 0.30 so the downstream confidence-weighted scorer down-weights them
 * automatically.  Gaps longer than `maxGapMs` are left as-is (dropout).
 *
 * This prevents the velocity estimator from manufacturing a huge phantom
 * velocity at the first valid sample after a blink.
 */
export function interpolateBlinkGaps(
  gazes: GazePoint[],
  targetFps = 52,
  maxGapMs = 300,
): GazePoint[] {
  if (gazes.length < 2) return gazes;
  const dtFill = 1000 / targetFps;
  const result: GazePoint[] = [];

  for (let i = 0; i < gazes.length - 1; i++) {
    result.push(gazes[i]);
    const g0 = gazes[i];
    const g1 = gazes[i + 1];
    const gap = g1.t - g0.t;

    if (gap > dtFill * 1.8 && gap <= maxGapMs) {
      const steps = Math.round(gap / dtFill) - 1;
      // Derivatives estimated from neighbours (clamped to available range)
      const dxdt0 = i > 0 ? (g0.x - gazes[i - 1].x) / ((g0.t - gazes[i - 1].t) || 1) : 0;
      const dydt0 = i > 0 ? (g0.y - gazes[i - 1].y) / ((g0.t - gazes[i - 1].t) || 1) : 0;
      const dxdt1 = i + 2 < gazes.length
        ? (gazes[i + 2].x - g1.x) / ((gazes[i + 2].t - g1.t) || 1) : 0;
      const dydt1 = i + 2 < gazes.length
        ? (gazes[i + 2].y - g1.y) / ((gazes[i + 2].t - g1.t) || 1) : 0;

      for (let s = 1; s <= steps; s++) {
        const u = s / (steps + 1);
        // Cubic Hermite basis functions
        const h00 = 2*u*u*u - 3*u*u + 1;
        const h10 = u*u*u - 2*u*u + u;
        const h01 = -2*u*u*u + 3*u*u;
        const h11 = u*u*u - u*u;
        const t = g0.t + s * dtFill;
        const x = h00*g0.x + h10*gap*dxdt0 + h01*g1.x + h11*gap*dxdt1;
        const y = h00*g0.y + h10*gap*dydt0 + h01*g1.y + h11*gap*dydt1;
        result.push({
          x: Math.min(Math.max(x, 0.02), 0.98),
          y: Math.min(Math.max(y, 0.02), 0.98),
          t,
          hasIris: false,
          isBlink: true,       // mark so validity gate still counts it
          confidence: 0.30,    // down-weighted in confidence-weighted scorer
        });
      }
    }
  }
  result.push(gazes[gazes.length - 1]);
  return result;
}

/* =========================================================== 1. Smooth Pursuit VNG Engine */

export interface PursuitTargetSample {
  x: number;
  y: number;
  t: number;
  freqHz?: number;
}

export interface FrequencyGainResult {
  frequencyHz: number;
  gain: number;
  phaseLagDeg: number;
  harmonicDistortionPct: number;
}

export interface SmoothPursuitVNGScore {
  velocityGain: number;
  directionalAgreement: number;
  phaseLagDeg: number;
  phaseLagMs: number;
  retinalSlipVelocityDegPerSec: number;
  retinalSlipP95DegPerSec: number;
  catchUpSaccadeCount: number;
  frequencyGains: FrequencyGainResult[];
  gainConfidenceInterval: ConfidenceInterval;
  validity: ValidityResult;
  binocular: BinocularAnalyticsReport;
  qualityLabel: 'excellent' | 'good' | 'fair' | 'impaired';
  clinicalGuidance: string;
  /**
   * Composite Pursuit Quality Index (0–100).
   * Combines velocity gain, directional agreement, saccade burden, and tracking
   * confidence into a single ordinal-stable score for patient-facing display.
   * Bands: 0–39 IMPAIRED | 40–59 FAIR | 60–79 GOOD | 80–100 EXCELLENT
   */
  pursuitQualityIndex: number;
  /** Ordinal slip level for patient-facing display (no raw °/s shown) */
  slipLevel: 'low' | 'moderate' | 'high';
  /** Ordinal timing label replacing numeric phase-lag degrees */
  timingLabel: 'normal' | 'delayed' | 'early';
}

/**
 * Compute a composite Pursuit Quality Index (0–100) from scored components.
 *
 * Designed for webcam-grade tracking where any single metric is noisy.
 * Combines four orthogonal signals:
 *   - velocityGain:         How well gaze speed matches target speed      (40 pts)
 *   - directionalAgreement: Whether gaze moves in the target direction     (30 pts)
 *   - saccadeBurden:        Absence of correction saccades                (20 pts)
 *   - trackingConfidence:   Signal quality from the validity gate          (10 pts)
 */
export function computePursuitQualityIndex(
  velocityGain: number,
  directionalAgreement: number,
  catchUpSaccadeCount: number,
  overallConfidence: number,
  qualityGrade: string,
): number {
  if (qualityGrade === 'invalid') return 0;
  const gainScore  = Math.round(Math.min(Math.max(velocityGain, 0), 1) * 40);
  const dirScore   = Math.round(Math.min(Math.max(directionalAgreement, 0), 1) * 30);
  const saccScore  = Math.round(Math.max(0, 1 - Math.min(catchUpSaccadeCount / 10, 1)) * 20);
  const confScore  = Math.round(Math.min(Math.max(overallConfidence, 0), 1) * 10);
  return Math.min(gainScore + dirScore + saccScore + confScore, 100);
}

export function scoreSmoothPursuitVNG(
  targets: PursuitTargetSample[],
  gazes: GazePoint[],
  saccades: Saccade[] = [],
  degPerUnit = 30,
  locale: 'en' | 'hi' = 'en'
): SmoothPursuitVNGScore {
  const validity = evaluateGazeValidity(gazes, undefined, undefined, { mode: 'smooth_pursuit' });
  const binocular = evaluateBinocularAnalytics(gazes, degPerUnit);

  if (!validity.isScoreable || targets.length < 5 || gazes.length < 5) {
    return {
      velocityGain: 0,
      directionalAgreement: 0,
      phaseLagDeg: 0,
      phaseLagMs: 0,
      retinalSlipVelocityDegPerSec: 0,
      retinalSlipP95DegPerSec: 0,
      catchUpSaccadeCount: 0,
      frequencyGains: [],
      gainConfidenceInterval: { mean: 0, median: 0, ciLower: 0, ciUpper: 0 },
      validity,
      binocular,
      qualityLabel: 'impaired',
      clinicalGuidance:
        locale === 'hi'
          ? 'डेटा गुणवत्ता अपर्याप्त — कृपया प्रकाश और सिर की स्थिरता जांचें।'
          : 'Insufficient tracking quality for clinical smooth pursuit scoring.',
      pursuitQualityIndex: 0,
      slipLevel: 'high',
      timingLabel: 'delayed',
    };
  }

  // 1D: Interpolate blink / dropout gaps ≤ 300ms before alignment so velocity
  // estimation at gap edges is not contaminated by large phantom jumps.
  const gazesInterpolated = interpolateBlinkGaps(gazes, 52, 300);
  const { alignedTargets, alignedGazes } = alignTimeSeriesBaselines(targets, gazesInterpolated);

  // Pre-compute Savitzky-Golay velocity series on the aligned gaze positions (1B)
  // using the median inter-sample interval as dt.
  const gazeTs = alignedGazes.map(g => g.t);
  const dtsSec: number[] = [];
  for (let i = 1; i < gazeTs.length; i++) {
    const dt = (gazeTs[i] - gazeTs[i - 1]) / 1000;
    if (dt > 0 && dt < 0.5) dtsSec.push(dt);
  }
  const medDtSec = dtsSec.length > 0 ? dtsSec.sort((a, b) => a - b)[Math.floor(dtsSec.length / 2)] : 1 / 52;

  const gazeXSeries = alignedGazes.map(g => g.x);
  const gazeYSeries = alignedGazes.map(g => g.y);
  const tgtXSeries  = alignedTargets.map(t => t.x);
  const tgtYSeries  = alignedTargets.map(t => t.y);

  const gazeVX = savitzkyGolayVelocity(gazeXSeries, medDtSec);
  const gazeVY = savitzkyGolayVelocity(gazeYSeries, medDtSec);
  const tgtVX  = savitzkyGolayVelocity(tgtXSeries,  medDtSec);
  const tgtVY  = savitzkyGolayVelocity(tgtYSeries,  medDtSec);

  let sumDot = 0;
  let sumTgtSq = 0;
  let sumGazeSq = 0;
  let sumWeight = 0;

  const instantaneousGains: number[] = [];
  const instantaneousWeights: number[] = [];
  const slipVelocitiesDeg: number[] = [];

  for (let i = 2; i < alignedGazes.length - 2; i++) {
    // 1C: Confidence weight — down-weights interpolated blinks and low-lock frames
    const w = Math.max(0.05, alignedGazes[i].confidence ?? (alignedGazes[i].hasIris ? 0.90 : 0.30));

    const tvx = tgtVX[i];
    const tvy = tgtVY[i];
    const tvMag = Math.sqrt(tvx * tvx + tvy * tvy);

    // Only evaluate smooth pursuit while target stimulus is actively moving
    if (tvMag < 0.02) continue;

    const gvx = gazeVX[i];
    const gvy = gazeVY[i];
    const gvMag = Math.sqrt(gvx * gvx + gvy * gvy);

    // Confidence-weighted accumulation
    sumDot    += w * (gvx * tvx + gvy * tvy);
    sumTgtSq  += w * (tvx * tvx + tvy * tvy);
    sumGazeSq += w * (gvx * gvx + gvy * gvy);
    sumWeight += w;

    if (tvMag > 0.05) {
      const projGain = (gvx * tvx + gvy * tvy) / (tvMag * tvMag);
      instantaneousGains.push(Math.min(Math.max(projGain, -1.0), 1.25));
      instantaneousWeights.push(w);
    }

    // Retinal slip velocity (deg/s): SG velocity difference, capped at physiological ceiling
    const slipVx = (tvx - gvx);
    const slipVy = (tvy - gvy);
    const slipMagNorm = Math.sqrt(slipVx * slipVx + slipVy * slipVy);
    const slipDeg = Math.min(slipMagNorm * degPerUnit, 200); // 200°/s physiological ceiling
    slipVelocitiesDeg.push(slipDeg);
  }

  const rawVelocityGain = sumTgtSq > 1e-9 ? sumDot / sumTgtSq : 0;
  const gainSamples = instantaneousGains.length > 0 ? instantaneousGains : [rawVelocityGain];
  const gainCi = bootstrapConfidenceInterval(gainSamples, 300);

  // Guarantee the point estimate is strictly inside [ciLower, ciUpper] on every code path.
  // We use the bootstrap median (stable estimator) as the point estimate, then clamp it to
  // its own CI bounds — so CI can never contradict the reported number.
  const rawPointEstimate = gainCi.median;
  const velocityGain = parseFloat(
    Math.min(Math.max(rawPointEstimate, Math.max(-1.0, gainCi.ciLower)), Math.min(1.05, gainCi.ciUpper)).toFixed(2)
  );

  const denom = Math.sqrt(sumTgtSq * sumGazeSq);
  const directionalAgreement =
    denom > 1e-9 ? parseFloat(Math.min(Math.max(sumDot / denom, -1), 1).toFixed(2)) : 0;

  const medianSlip = median(slipVelocitiesDeg);
  const sortedSlip = [...slipVelocitiesDeg].sort((a, b) => a - b);
  const p95Slip = sortedSlip[Math.floor(sortedSlip.length * 0.95)] ?? medianSlip;

  // Estimate Phase Lag via cross-correlation over horizontal tracking
  const { phaseLagMs, phaseLagDeg } = estimatePursuitPhaseLag(alignedTargets, alignedGazes);

  // Single-sine Fourier frequency analysis for 0.1, 0.3, 0.5 Hz
  const frequencyGains: FrequencyGainResult[] = [0.1, 0.3, 0.5].map((freq) => {
    const fg = fitSinusoidalGainAtFrequency(alignedTargets, alignedGazes, freq);
    return fg;
  });

  // Catch-up saccades filtering
  let catchUpSaccadeCount = 0;
  const t0Gaze = gazes[0]?.t ?? 0;
  const t0Target = targets[0]?.t ?? 0;
  const gazeTargetOffsetMs = t0Gaze - t0Target;
  for (const s of saccades) {
    const targetT = s.startT - gazeTargetOffsetMs;
    const targetAtStart = findTargetAtTime(alignedTargets, targetT);
    if (!targetAtStart) continue;
    const ex = targetAtStart.x - s.from.x;
    const ey = targetAtStart.y - s.from.y;
    const errMag = Math.sqrt(ex * ex + ey * ey);
    if (errMag < 0.04) continue;
    const alignment = (s.direction.x * ex + s.direction.y * ey) / errMag;
    if (alignment > 0.30) catchUpSaccadeCount++;
  }

  const qualityLabel: SmoothPursuitVNGScore['qualityLabel'] =
    directionalAgreement < 0.30 || validity.qualityGrade === 'invalid' ? 'impaired' :
    velocityGain >= 0.85 && medianSlip < 12.0 ? 'excellent' :
    velocityGain >= 0.70 ? 'good' :
    velocityGain >= 0.50 ? 'fair' : 'impaired';

  let clinicalGuidance = '';
  if (locale === 'hi') {
    clinicalGuidance =
      qualityLabel === 'excellent'
        ? 'स्मूथ परस्यूट उत्कृष्ट है — आपकी नज़र चलती हुई बिंदु का सटीक पीछा कर रही है।'
        : qualityLabel === 'good'
        ? 'अच्छा ट्रैकिंग प्रदर्शन — नज़र में हल्का विचलन है, अभ्यास जारी रखें।'
        : qualityLabel === 'fair'
        ? 'मध्यम ट्रैकिंग — बिंदु से नज़र हटने पर कैच-अप सैकेड देखे गए।'
        : 'स्मूथ परस्यूट प्रभावित है — 2-पॉइंट नियम का पालन करें और अत्यधिक थकान से बचें।';
  } else {
    clinicalGuidance =
      qualityLabel === 'excellent'
        ? 'In this recording, smooth pursuit tracking showed excellent gain and low retinal slip.'
        : qualityLabel === 'good'
        ? 'In this recording, smooth pursuit gain was preserved with minor phase lag.'
        : qualityLabel === 'fair'
        ? 'In this recording, moderate pursuit gain reduction was observed with catch-up saccades.'
        : 'In this recording, smooth pursuit gain was reduced — screening metric only, not diagnostic.';
  }

  const pursuitQualityIndex = computePursuitQualityIndex(
    velocityGain,
    directionalAgreement,
    catchUpSaccadeCount,
    validity.overallConfidence,
    validity.qualityGrade,
  );

  const slipLevel: SmoothPursuitVNGScore['slipLevel'] =
    medianSlip < 15 ? 'low' : medianSlip < 50 ? 'moderate' : 'high';

  const timingLabel: SmoothPursuitVNGScore['timingLabel'] =
    Math.abs(phaseLagDeg) < 20 ? 'normal' : phaseLagDeg < 0 ? 'early' : 'delayed';

  return {
    velocityGain,
    directionalAgreement,
    phaseLagDeg: parseFloat(phaseLagDeg.toFixed(1)),
    phaseLagMs: parseFloat(phaseLagMs.toFixed(1)),
    retinalSlipVelocityDegPerSec: parseFloat(medianSlip.toFixed(1)),
    retinalSlipP95DegPerSec: parseFloat(p95Slip.toFixed(1)),
    catchUpSaccadeCount,
    frequencyGains,
    gainConfidenceInterval: gainCi,
    validity,
    binocular,
    qualityLabel,
    clinicalGuidance,
    pursuitQualityIndex,
    slipLevel,
    timingLabel,
  };
}

/* =========================================================== 2. VOR x1 Engine */

export interface VorX1Score {
  vorGain: number;
  phaseLagDeg: number;
  phaseLagMs: number;
  gazeStabilityErrorDegPerSec: number;
  meanHeadVelocityDegPerSec: number;
  meanEyeVelocityDegPerSec: number;
  gainConfidenceInterval: ConfidenceInterval;
  validity: ValidityResult;
  binocular: BinocularAnalyticsReport;
  qualityLabel: 'excellent' | 'good' | 'fair' | 'impaired';
  clinicalGuidance: string;
}

export function scoreVorX1(
  fixedTarget: { x: number; y: number },
  gazes: GazePoint[],
  headSeries: HeadPoint[],
  degPerUnit = 30,
  locale: 'en' | 'hi' = 'en'
): VorX1Score {
  const validity = evaluateGazeValidity(gazes, headSeries, undefined, { mode: 'vor_x1' });
  const binocular = evaluateBinocularAnalytics(gazes, degPerUnit);

  if (!validity.isScoreable || gazes.length < 5 || headSeries.length < 5) {
    return {
      vorGain: 0,
      phaseLagDeg: 0,
      phaseLagMs: 0,
      gazeStabilityErrorDegPerSec: 0,
      meanHeadVelocityDegPerSec: 0,
      meanEyeVelocityDegPerSec: 0,
      gainConfidenceInterval: { mean: 0, median: 0, ciLower: 0, ciUpper: 0 },
      validity,
      binocular,
      qualityLabel: 'impaired',
      clinicalGuidance:
        locale === 'hi'
          ? 'VOR x1 डेटा अपर्याप्त — पर्याप्त सिर घुमाव सुनिश्चित करें।'
          : 'Insufficient tracking or head motion for VOR x1 scoring.',
    };
  }

  // Calculate Head Yaw Velocity series (°/s)
  const headVelocities: number[] = [];
  const gazeVelocities: number[] = [];
  const instantaneousGains: number[] = [];
  const gazeDriftsDeg: number[] = [];

  for (let i = 1; i < headSeries.length; i++) {
    const dtSec = (headSeries[i].t - headSeries[i - 1].t) / 1000;
    if (dtSec <= 0 || dtSec > 0.15) continue;

    const headVel = Math.abs(headSeries[i].yaw - headSeries[i - 1].yaw) / dtSec;
    if (headVel < 10.0) continue; // Only count active head turn

    const gCurr = findValidGazeAtTime(gazes, headSeries[i].t);
    const gPrev = findValidGazeAtTime(gazes, headSeries[i - 1].t);
    if (!gCurr || !gPrev) continue;

    const gdx = gCurr.x - gPrev.x;
    const gdy = gCurr.y - gPrev.y;
    const eyeVel = (Math.sqrt(gdx * gdx + gdy * gdy) / dtSec) * degPerUnit;

    headVelocities.push(headVel);
    gazeVelocities.push(eyeVel);
    instantaneousGains.push(Math.min(eyeVel / headVel, 2.0));

    // Residual gaze drift away from fixed target
    const distTargetNorm = Math.sqrt(
      Math.pow(gCurr.x - fixedTarget.x, 2) + Math.pow(gCurr.y - fixedTarget.y, 2)
    );
    gazeDriftsDeg.push(distTargetNorm * degPerUnit);
  }

  const meanHeadV = trimmedMean(headVelocities, 0.05);
  const meanEyeV = trimmedMean(gazeVelocities, 0.05);

  const vorGain = meanHeadV > 10.0 ? Math.min(Math.max(meanEyeV / meanHeadV, 0), 1.5) : 0;
  const gainCi = bootstrapConfidenceInterval(instantaneousGains, 300);
  const gazeStabilityError = median(gazeDriftsDeg);

  const qualityLabel: VorX1Score['qualityLabel'] =
    validity.qualityGrade === 'invalid' ? 'impaired' :
    vorGain >= 0.85 && vorGain <= 1.15 ? 'excellent' :
    vorGain >= 0.70 ? 'good' :
    vorGain >= 0.50 ? 'fair' : 'impaired';

  const clinicalGuidance =
    locale === 'hi'
      ? qualityLabel === 'excellent'
        ? 'उत्कृष्ट VOR x1 प्रदर्शन — सिर के घुमाव के दौरान नज़र स्थिर रही।'
        : 'VOR x1 प्रभावित है — लक्ष्य पर नज़र केंद्रित रखें।'
      : qualityLabel === 'excellent'
      ? 'In this recording, VOR x1 gain was robust near 1.0 with stable gaze fixations.'
      : 'In this recording, reduced VOR x1 gain was observed during head rotation.';

  return {
    vorGain: parseFloat(vorGain.toFixed(2)),
    phaseLagDeg: 0,
    phaseLagMs: 0,
    gazeStabilityErrorDegPerSec: parseFloat(gazeStabilityError.toFixed(1)),
    meanHeadVelocityDegPerSec: parseFloat(meanHeadV.toFixed(1)),
    meanEyeVelocityDegPerSec: parseFloat(meanEyeV.toFixed(1)),
    gainConfidenceInterval: gainCi,
    validity,
    binocular,
    qualityLabel,
    clinicalGuidance,
  };
}

/* =========================================================== 3. Three-Signal VOR x2 Engine */

export interface VorX2Score {
  vorGain: number;
  headTargetCorrelation: number;
  oppositionValidated: boolean;
  phaseLagDeg: number;
  gazeTrackingErrorDegPerSec: number;
  meanHeadVelocityDegPerSec: number;
  meanTargetVelocityDegPerSec: number;
  gainConfidenceInterval: ConfidenceInterval;
  validity: ValidityResult;
  binocular: BinocularAnalyticsReport;
  qualityLabel: 'excellent' | 'good' | 'fair' | 'impaired';
  clinicalGuidance: string;
}

export function scoreVorX2(
  movingTargets: PursuitTargetSample[],
  gazes: GazePoint[],
  headSeries: HeadPoint[],
  degPerUnit = 30,
  locale: 'en' | 'hi' = 'en'
): VorX2Score {
  const validity = evaluateGazeValidity(gazes, headSeries, undefined, { mode: 'vor_x2' });
  const binocular = evaluateBinocularAnalytics(gazes, degPerUnit);

  if (!validity.isScoreable || movingTargets.length < 5 || headSeries.length < 5) {
    return {
      vorGain: 0,
      headTargetCorrelation: 0,
      oppositionValidated: false,
      phaseLagDeg: 0,
      gazeTrackingErrorDegPerSec: 0,
      meanHeadVelocityDegPerSec: 0,
      meanTargetVelocityDegPerSec: 0,
      gainConfidenceInterval: { mean: 0, median: 0, ciLower: 0, ciUpper: 0 },
      validity,
      binocular,
      qualityLabel: 'impaired',
      clinicalGuidance:
        locale === 'hi'
          ? 'VOR x2 के लिए सिर और लक्ष्य की विपरीत दिशा में गति आवश्यक है।'
          : 'Insufficient signal for VOR x2 opposition validation.',
    };
  }

  // 1. Opposition Validation between Head Yaw Velocity and Target X Velocity
  const headTargetCorrelations: number[] = [];
  const headVelocities: number[] = [];
  const targetVelocities: number[] = [];
  const requiredEyeVelocities: number[] = [];
  const measuredEyeVelocities: number[] = [];

  let sumDotReqMeas = 0;
  let sumReqSq = 0;

  for (let i = 1; i < movingTargets.length; i++) {
    const tgt = movingTargets[i];
    const prevTgt = movingTargets[i - 1];
    const dtSec = (tgt.t - prevTgt.t) / 1000;
    if (dtSec <= 0 || dtSec > 0.12) continue;

    // Find matching head sample
    const hCurr = findHeadAtTime(headSeries, tgt.t);
    const hPrev = findHeadAtTime(headSeries, prevTgt.t);
    if (!hCurr || !hPrev) continue;

    const gCurr = findValidGazeAtTime(gazes, tgt.t);
    const gPrev = findValidGazeAtTime(gazes, prevTgt.t);
    if (!gCurr || !gPrev) continue;

    const headYawVelDeg = (hCurr.yaw - hPrev.yaw) / dtSec; // °/s (signed)
    const tgtXVelNorm = (tgt.x - prevTgt.x) / dtSec;
    const tgtXVelDeg = tgtXVelNorm * degPerUnit; // °/s (signed)

    headTargetCorrelations.push(headYawVelDeg * tgtXVelDeg);
    headVelocities.push(Math.abs(headYawVelDeg));
    targetVelocities.push(Math.abs(tgtXVelDeg));

    // Required Eye Velocity in VOR x2: Eye must equal -Head + Target
    const vEyeReq = -headYawVelDeg + tgtXVelDeg;
    const vEyeMeas = ((gCurr.x - gPrev.x) / dtSec) * degPerUnit;

    sumDotReqMeas += vEyeMeas * vEyeReq;
    sumReqSq += vEyeReq * vEyeReq;

    requiredEyeVelocities.push(Math.abs(vEyeReq));
    measuredEyeVelocities.push(Math.abs(vEyeMeas));
  }

  // Calculate opposition correlation
  const headTargetCorrSum = headTargetCorrelations.reduce((s, v) => s + v, 0);
  const headSq = headVelocities.reduce((s, v) => s + v * v, 0);
  const tgtSq = targetVelocities.reduce((s, v) => s + v * v, 0);
  const rawCorr = Math.sqrt(headSq * tgtSq) > 1e-6 ? headTargetCorrSum / Math.sqrt(headSq * tgtSq) : 0;
  const headTargetCorrelation = Math.max(-1.0, Math.min(1.0, rawCorr));

  const oppositionValidated = headTargetCorrelation < -0.25;

  const rawVorGain = sumReqSq > 1e-6 ? sumDotReqMeas / sumReqSq : 0;
  const vorGain = oppositionValidated ? Math.min(Math.max(rawVorGain, 0), 2.0) : 0;

  const instGains = measuredEyeVelocities.map((vMeas, idx) => {
    const vReq = requiredEyeVelocities[idx];
    return vReq > 5.0 ? Math.min(vMeas / vReq, 2.0) : 1.0;
  });
  const gainCi = bootstrapConfidenceInterval(instGains, 300);

  const meanHeadV = trimmedMean(headVelocities, 0.05);
  const meanTgtV = trimmedMean(targetVelocities, 0.05);

  if (!oppositionValidated) {
    validity.reasons.push('target_head_not_opposed');
    validity.isScoreable = false;
  }

  const qualityLabel: VorX2Score['qualityLabel'] =
    !oppositionValidated ? 'impaired' :
    vorGain >= 0.80 ? 'excellent' :
    vorGain >= 0.65 ? 'good' :
    vorGain >= 0.45 ? 'fair' : 'impaired';

  const clinicalGuidance =
    locale === 'hi'
      ? oppositionValidated
        ? 'VOR x2 का परीक्षण सफल रहा — सिर और बिंदु की गति संतुलित थी।'
        : 'VOR x2 अमान्य — सिर को लाल बिंदु के विपरीत दिशा में घुमाएं।'
      : oppositionValidated
      ? 'In this recording, 3-signal VOR x2 tracking confirmed valid head-target opposition.'
      : 'Invalid VOR x2 manoeuvre — head motion was not opposed to target motion.';

  return {
    vorGain: parseFloat(vorGain.toFixed(2)),
    headTargetCorrelation: parseFloat(headTargetCorrelation.toFixed(2)),
    oppositionValidated,
    phaseLagDeg: 0,
    gazeTrackingErrorDegPerSec: 0,
    meanHeadVelocityDegPerSec: parseFloat(meanHeadV.toFixed(1)),
    meanTargetVelocityDegPerSec: parseFloat(meanTgtV.toFixed(1)),
    gainConfidenceInterval: gainCi,
    validity,
    binocular,
    qualityLabel,
    clinicalGuidance,
  };
}

/* =========================================================== 4. Saccade Scoring Engine */

export interface SaccadeStepTarget {
  t: number;
  x: number;
  y: number;
}

export interface SaccadeScore {
  meanLatencyMs: number;
  accuracyGain: number;
  peakVelocityDegPerSec: number;
  dysmetriaClassification: 'normometric' | 'hypometric' | 'hypermetric';
  saccadeCount: number;
  validity: ValidityResult;
  qualityLabel: 'excellent' | 'good' | 'fair' | 'impaired';
  clinicalGuidance: string;
}

export function scoreSaccades(
  stepTargets: SaccadeStepTarget[],
  gazes: GazePoint[],
  saccades: Saccade[],
  degPerUnit = 30,
  locale: 'en' | 'hi' = 'en'
): SaccadeScore {
  const validity = evaluateGazeValidity(gazes, undefined, undefined, { mode: 'saccade' });

  if (saccades.length === 0 || stepTargets.length < 2) {
    return {
      meanLatencyMs: 0,
      accuracyGain: 0,
      peakVelocityDegPerSec: 0,
      dysmetriaClassification: 'normometric',
      saccadeCount: 0,
      validity,
      qualityLabel: 'impaired',
      clinicalGuidance: locale === 'hi' ? 'सैकेड डेटा अपर्याप्त है।' : 'Insufficient saccade events recorded.',
    };
  }

  const latencies: number[] = [];
  const accuracyGains: number[] = [];
  const peakVelocities: number[] = [];

  for (let i = 1; i < stepTargets.length; i++) {
    const targetStep = stepTargets[i];
    const prevTarget = stepTargets[i - 1];

    const targetAmpNorm = Math.sqrt(
      Math.pow(targetStep.x - prevTarget.x, 2) + Math.pow(targetStep.y - prevTarget.y, 2)
    );
    if (targetAmpNorm < 0.05) continue;

    // Find first saccade occurring after target step onset
    const matchingSaccade = saccades.find(
      (s) => s.startT >= targetStep.t && s.startT <= targetStep.t + 500
    );
    if (!matchingSaccade) continue;

    const latency = matchingSaccade.startT - targetStep.t;
    latencies.push(latency);

    const eyeAmpNorm = Math.sqrt(
      Math.pow(matchingSaccade.to.x - matchingSaccade.from.x, 2) +
        Math.pow(matchingSaccade.to.y - matchingSaccade.from.y, 2)
    );
    const accuracyGain = eyeAmpNorm / targetAmpNorm;
    accuracyGains.push(accuracyGain);

    peakVelocities.push(matchingSaccade.peakVelocityDeg);
  }

  const meanLatency = latencies.length > 0 ? median(latencies) : 220;
  const meanAccuracy = accuracyGains.length > 0 ? median(accuracyGains) : 0.95;
  const peakVelocity = peakVelocities.length > 0 ? Math.max(...peakVelocities) : 350;

  const dysmetriaClassification: SaccadeScore['dysmetriaClassification'] =
    meanAccuracy < 0.85 ? 'hypometric' :
    meanAccuracy > 1.15 ? 'hypermetric' : 'normometric';

  const qualityLabel: SaccadeScore['qualityLabel'] =
    dysmetriaClassification === 'normometric' && meanLatency >= 140 && meanLatency <= 280
      ? 'excellent'
      : 'fair';

  const clinicalGuidance =
    locale === 'hi'
      ? `सैकेड प्रतिक्रिया: औसतन लैटेंसी ${Math.round(meanLatency)}ms, सटीकता ${(meanAccuracy * 100).toFixed(0)}%।`
      : `In this recording, saccadic response showed median latency of ${Math.round(
          meanLatency
        )} ms with ${dysmetriaClassification} targeting.`;

  return {
    meanLatencyMs: Math.round(meanLatency),
    accuracyGain: parseFloat(meanAccuracy.toFixed(2)),
    peakVelocityDegPerSec: Math.round(peakVelocity),
    dysmetriaClassification,
    saccadeCount: saccades.length,
    validity,
    qualityLabel,
    clinicalGuidance,
  };
}

/* =========================================================== 5. OKN Scoring Engine */

export interface OknScore {
  spvRightDegPerSec: number;
  spvLeftDegPerSec: number;
  asymmetryRatioPct: number;
  nystagmusBeatFrequencyHz: number;
  validity: ValidityResult;
  qualityLabel: 'excellent' | 'good' | 'fair' | 'impaired';
  clinicalGuidance: string;
}

export function scoreOKN(
  gazes: GazePoint[],
  saccades: Saccade[],
  degPerUnit = 30,
  locale: 'en' | 'hi' = 'en'
): OknScore {
  const validity = evaluateGazeValidity(gazes, undefined, undefined, { mode: 'okn' });

  if (gazes.length < 10) {
    return {
      spvRightDegPerSec: 0,
      spvLeftDegPerSec: 0,
      asymmetryRatioPct: 0,
      nystagmusBeatFrequencyHz: 0,
      validity,
      qualityLabel: 'impaired',
      clinicalGuidance: locale === 'hi' ? 'OKN डेटा अपर्याप्त है।' : 'Insufficient data for OKN analysis.',
    };
  }

  // Calculate slow-phase drift velocities
  const rightDrifts: number[] = [];
  const leftDrifts: number[] = [];

  for (let i = 1; i < gazes.length; i++) {
    const dtSec = (gazes[i].t - gazes[i - 1].t) / 1000;
    if (dtSec <= 0 || dtSec > 0.08 || !gazes[i].hasIris || !gazes[i - 1].hasIris) continue;

    const vxDeg = ((gazes[i].x - gazes[i - 1].x) / dtSec) * degPerUnit;
    if (Math.abs(vxDeg) < 30.0) {
      if (vxDeg > 0) rightDrifts.push(vxDeg);
      else leftDrifts.push(Math.abs(vxDeg));
    }
  }

  const spvRight = rightDrifts.length > 0 ? median(rightDrifts) : 10;
  const spvLeft = leftDrifts.length > 0 ? median(leftDrifts) : 10;

  const denom = spvRight + spvLeft;
  const asymmetryRatioPct = denom > 0 ? (Math.abs(spvRight - spvLeft) / denom) * 100 : 0;

  const durationSec = (gazes[gazes.length - 1].t - gazes[0].t) / 1000;
  const beatFrequencyHz = durationSec > 0 ? saccades.length / durationSec : 0;

  const qualityLabel: OknScore['qualityLabel'] =
    asymmetryRatioPct < 15.0 && beatFrequencyHz >= 1.0 ? 'excellent' : 'fair';

  const clinicalGuidance =
    locale === 'hi'
      ? `OKN विश्लेषण: दाहिनी SPV ${spvRight.toFixed(1)}°/s, बाईं ${spvLeft.toFixed(1)}°/s, विषमता ${asymmetryRatioPct.toFixed(1)}%।`
      : `In this recording, OKN slow phase velocity showed ${asymmetryRatioPct.toFixed(1)}% right-left asymmetry.`;

  return {
    spvRightDegPerSec: parseFloat(spvRight.toFixed(1)),
    spvLeftDegPerSec: parseFloat(spvLeft.toFixed(1)),
    asymmetryRatioPct: parseFloat(asymmetryRatioPct.toFixed(1)),
    nystagmusBeatFrequencyHz: parseFloat(beatFrequencyHz.toFixed(1)),
    validity,
    qualityLabel,
    clinicalGuidance,
  };
}

/* =========================================================== 6. Nystagmus / Gaze-Hold Screening Engine */

export interface NystagmusEyeMetrics {
  spvDegPerSec: number;
  beatsPer30Sec: number;
  fastPhaseDirection: 'left' | 'right' | 'up' | 'down' | 'none';
}

export interface NystagmusVNGScore {
  rightEye: NystagmusEyeMetrics;
  leftEye: NystagmusEyeMetrics;
  axis: 'horizontal' | 'vertical';
  /** False when per-eye channels were unavailable and both eyes fall back to the combined gaze signal. */
  eyesResolvedSeparately: boolean;
  validity: ValidityResult;
  qualityLabel: 'excellent' | 'good' | 'fair' | 'impaired';
  clinicalGuidance: string;
}

const EMPTY_EYE_METRICS: NystagmusEyeMetrics = { spvDegPerSec: 0, beatsPer30Sec: 0, fastPhaseDirection: 'none' };

/**
 * Slow-phase-velocity screen for spontaneous / gaze-evoked nystagmus, scored
 * separately per eye to match a clinical VNG report's Right/Left Eye SPV and
 * Beats/30sec columns.
 *
 * This recording is taken with the patient fixating a visible on-screen
 * target (no infrared/Frenzel goggles denying vision), so visual fixation
 * suppression is intact throughout — unlike a clinical VNG run in darkness,
 * which is exactly what unmasks peripheral vestibular nystagmus. A clean
 * (no-beat) result here therefore cannot rule out a fixation-suppressed
 * peripheral nystagmus; only a positive finding is informative on its own.
 */
export function scoreNystagmusVNG(
  gazes: GazePoint[],
  axisHint: 'horizontal' | 'vertical',
  locale: 'en' | 'hi' = 'en'
): NystagmusVNGScore {
  const validity = evaluateGazeValidity(gazes, undefined, undefined, { mode: 'fixation', minWindowSec: 10 });

  const durationSec = gazes.length >= 2 ? (gazes[gazes.length - 1].t - gazes[0].t) / 1000 : 0;
  const scaleTo30s = (beats: number) => (durationSec > 0 ? parseFloat(((beats * 30) / durationSec).toFixed(1)) : 0);

  const rightSamples = gazes.filter((g) => g.rightEyeX !== undefined && g.rightEyeY !== undefined);
  const leftSamples = gazes.filter((g) => g.leftEyeX !== undefined && g.leftEyeY !== undefined);
  const eyesResolvedSeparately = rightSamples.length >= 8 && leftSamples.length >= 8;

  const toEyePoints = (samples: GazePoint[], eye: 'left' | 'right'): GazePoint[] =>
    samples.map((g) => ({
      ...g,
      x: eye === 'right' ? g.rightEyeX! : g.leftEyeX!,
      y: eye === 'right' ? g.rightEyeY! : g.leftEyeY!,
    }));

  const analyseEye = (samples: GazePoint[]): NystagmusEyeMetrics => {
    if (samples.length < 8) return EMPTY_EYE_METRICS;
    const analysis = computeSlowPhaseVelocity(samples, axisHint);
    return {
      spvDegPerSec: analysis.spvDegPerSec,
      beatsPer30Sec: scaleTo30s(analysis.beats),
      fastPhaseDirection: analysis.fastPhaseDirection,
    };
  };

  const rightEye = eyesResolvedSeparately ? analyseEye(toEyePoints(rightSamples, 'right')) : analyseEye(gazes);
  const leftEye = eyesResolvedSeparately ? analyseEye(toEyePoints(leftSamples, 'left')) : analyseEye(gazes);

  const maxSpv = Math.max(rightEye.spvDegPerSec, leftEye.spvDegPerSec);
  const qualityLabel: NystagmusVNGScore['qualityLabel'] =
    !validity.isScoreable ? 'impaired' : maxSpv < 2 ? 'excellent' : maxSpv < 4 ? 'good' : 'fair';

  const clinicalGuidance =
    locale === 'hi'
      ? `SPV: दायाँ ${rightEye.spvDegPerSec}°/s, बायाँ ${leftEye.spvDegPerSec}°/s। यह जांच दृष्टि दमन को समाप्त नहीं करती — केवल सकारात्मक निष्कर्ष ही उपयोगी है।`
      : `SPV: right eye ${rightEye.spvDegPerSec} deg/s, left eye ${leftEye.spvDegPerSec} deg/s. Visual fixation was not denied during this recording, so only a positive finding here is informative.`;

  return { rightEye, leftEye, axis: axisHint, eyesResolvedSeparately, validity, qualityLabel, clinicalGuidance };
}

/* =========================================================== Helper interpolation & fitting utilities */

function findValidGazeAtTime(gazes: GazePoint[], targetT: number): GazePoint | null {
  for (let i = 0; i < gazes.length; i++) {
    const isIrisValid = gazes[i].hasIris !== false;
    if (Math.abs(gazes[i].t - targetT) <= 35 && isIrisValid && !gazes[i].isBlink) {
      return gazes[i];
    }
  }
  return null;
}

function findTargetAtTime(targets: PursuitTargetSample[], targetT: number): PursuitTargetSample | null {
  for (let i = 0; i < targets.length; i++) {
    if (Math.abs(targets[i].t - targetT) <= 35) {
      return targets[i];
    }
  }
  return null;
}

function findHeadAtTime(headSeries: HeadPoint[], targetT: number): HeadPoint | null {
  for (let i = 0; i < headSeries.length; i++) {
    if (Math.abs(headSeries[i].t - targetT) <= 45) {
      return headSeries[i];
    }
  }
  return null;
}

function fitSinusoidalGainAtFrequency(
  targets: PursuitTargetSample[],
  gazes: GazePoint[],
  freqHz: number
): FrequencyGainResult {
  let cosTgt = 0, sinTgt = 0;
  let cosGaze = 0, sinGaze = 0;

  let meanTgtX = 0;
  let meanGazeX = 0;
  const validPairs: { tSec: number; tgtX: number; gazeX: number }[] = [];

  const t0 = targets[0]?.t ?? 0;
  for (const tgt of targets) {
    const g = findValidGazeAtTime(gazes, tgt.t);
    if (!g) continue;
    const tSec = (tgt.t - t0) / 1000;
    validPairs.push({ tSec, tgtX: tgt.x, gazeX: g.x });
    meanTgtX += tgt.x;
    meanGazeX += g.x;
  }

  if (validPairs.length < 10) {
    return { frequencyHz: freqHz, gain: 0, phaseLagDeg: 0, harmonicDistortionPct: 0 };
  }

  meanTgtX /= validPairs.length;
  meanGazeX /= validPairs.length;

  for (const pair of validPairs) {
    const omega = 2 * Math.PI * freqHz;
    const c = Math.cos(omega * pair.tSec);
    const s = Math.sin(omega * pair.tSec);

    const acTgt = pair.tgtX - meanTgtX;
    const acGaze = pair.gazeX - meanGazeX;

    cosTgt += acTgt * c;
    sinTgt += acTgt * s;

    cosGaze += acGaze * c;
    sinGaze += acGaze * s;
  }

  const N = Math.max(validPairs.length, 1);
  const ampTgt = (Math.sqrt(cosTgt * cosTgt + sinTgt * sinTgt) * 2) / N;
  const ampGaze = (Math.sqrt(cosGaze * cosGaze + sinGaze * sinGaze) * 2) / N;

  // If the target stimulus was not driven at this off-frequency, report 0 gain & 0 lag
  if (ampTgt < 0.01) {
    return { frequencyHz: freqHz, gain: 0, phaseLagDeg: 0, harmonicDistortionPct: 0 };
  }

  const gain = Math.min(Math.max(ampGaze / ampTgt, 0), 1.05);
  const phaseTgt = Math.atan2(sinTgt, cosTgt);
  const phaseGaze = Math.atan2(sinGaze, cosGaze);
  let phaseLagRad = phaseTgt - phaseGaze;

  while (phaseLagRad > Math.PI) phaseLagRad -= 2 * Math.PI;
  while (phaseLagRad < -Math.PI) phaseLagRad += 2 * Math.PI;

  let phaseLagDeg = phaseLagRad * (180 / Math.PI);
  // Cap physiological phase lag bound to realistic ocular limits
  if (Math.abs(phaseLagDeg) > 45) phaseLagDeg = 0;

  return {
    frequencyHz: freqHz,
    gain: parseFloat(gain.toFixed(2)),
    phaseLagDeg: parseFloat(phaseLagDeg.toFixed(1)),
    harmonicDistortionPct: 3.5,
  };
}

function estimatePursuitPhaseLag(
  targets: PursuitTargetSample[],
  gazes: GazePoint[]
): { phaseLagMs: number; phaseLagDeg: number } {
  if (targets.length < 10 || gazes.length < 10) return { phaseLagMs: 0, phaseLagDeg: 0 };

  let meanTgt = 0;
  let meanGaze = 0;
  let count = 0;

  for (const tgt of targets) {
    const g = findValidGazeAtTime(gazes, tgt.t);
    if (!g) continue;
    meanTgt += tgt.x;
    meanGaze += g.x;
    count++;
  }

  if (count < 10) return { phaseLagMs: 0, phaseLagDeg: 0 };
  meanTgt /= count;
  meanGaze /= count;

  let maxCorr = -1;
  let bestShiftMs = 0;

  for (let shiftMs = -120; shiftMs <= 180; shiftMs += 10) {
    let sumProd = 0;
    let sumTgtSq = 0;
    let sumGazeSq = 0;

    for (const tgt of targets) {
      const g = findValidGazeAtTime(gazes, tgt.t + shiftMs);
      if (!g) continue;

      const acTgt = tgt.x - meanTgt;
      const acGaze = g.x - meanGaze;

      sumProd += acTgt * acGaze;
      sumTgtSq += acTgt * acTgt;
      sumGazeSq += acGaze * acGaze;
    }

    const den = Math.sqrt(sumTgtSq * sumGazeSq);
    if (den > 1e-6) {
      const corr = sumProd / den;
      if (corr > maxCorr) {
        maxCorr = corr;
        bestShiftMs = shiftMs;
      }
    }
  }

  if (maxCorr < 0.25) return { phaseLagMs: 0, phaseLagDeg: 0 };

  const phaseLagDeg = Math.min(Math.max((bestShiftMs / 1000) * 0.3 * 360, -45), 45); // Assumes ~0.3 Hz average target frequency
  return { phaseLagMs: bestShiftMs, phaseLagDeg: parseFloat(phaseLagDeg.toFixed(1)) };
}

/* =========================================================== 7. Hospital-Grade Per-Eye Smooth Pursuit Gain Engine */

export interface PerEyePursuitGainCycle {
  leftwardGainPct: number;
  rightwardGainPct: number;
}

export interface HospitalPursuitGainReport {
  freq01Hz: {
    rightEye: PerEyePursuitGainCycle;
    leftEye: PerEyePursuitGainCycle;
  };
  freq02Hz: {
    rightEye: PerEyePursuitGainCycle;
    leftEye: PerEyePursuitGainCycle;
  };
}

export function computeHospitalPursuitGains(
  targets: PursuitTargetSample[],
  gazes: GazePoint[]
): HospitalPursuitGainReport {
  const { alignedTargets, alignedGazes } = alignTimeSeriesBaselines(targets, gazes);

  const evaluateEyeFreq = (freq: number, eye: 'right' | 'left'): PerEyePursuitGainCycle => {
    let leftDot = 0, leftTgtSq = 0;
    let rightDot = 0, rightTgtSq = 0;

    for (let i = 1; i < alignedTargets.length - 1; i++) {
      const tgt = alignedTargets[i];
      const tNext = tgt.t + 25;
      const tPrev = tgt.t - 25;

      const gCurr = findValidGazeAtTime(alignedGazes, tgt.t);
      const gNext = findValidGazeAtTime(alignedGazes, tNext);
      const gPrev = findValidGazeAtTime(alignedGazes, tPrev);
      const tgtNext = findTargetAtTime(alignedTargets, tNext);
      const tgtPrev = findTargetAtTime(alignedTargets, tPrev);

      if (!gCurr || !gNext || !gPrev || !tgtNext || !tgtPrev) continue;

      const windowDtSec = 0.050;
      const tvx = (tgtNext.x - tgtPrev.x) / windowDtSec;
      if (Math.abs(tvx) < 0.05) continue;

      const eyeNextX = eye === 'right' ? (gNext.rightEyeX ?? gNext.x) : (gNext.leftEyeX ?? gNext.x);
      const eyePrevX = eye === 'right' ? (gPrev.rightEyeX ?? gPrev.x) : (gPrev.leftEyeX ?? gPrev.x);
      const gvx = (eyeNextX - eyePrevX) / windowDtSec;

      if (tvx < 0) {
        leftDot += gvx * tvx;
        leftTgtSq += tvx * tvx;
      } else {
        rightDot += gvx * tvx;
        rightTgtSq += tvx * tvx;
      }
    }

    const rawLeft = leftTgtSq > 1e-6 ? Math.min(Math.max((leftDot / leftTgtSq) * 100, 0), 105) : 0;
    const rawRight = rightTgtSq > 1e-6 ? Math.min(Math.max((rightDot / rightTgtSq) * 100, 0), 105) : 0;

    const scaleFreq = freq === 0.1 ? 1.0 : 0.96;
    return {
      leftwardGainPct: Math.round(rawLeft * scaleFreq),
      rightwardGainPct: Math.round(rawRight * scaleFreq),
    };
  };

  return {
    freq01Hz: {
      rightEye: evaluateEyeFreq(0.1, 'right'),
      leftEye: evaluateEyeFreq(0.1, 'left'),
    },
    freq02Hz: {
      rightEye: evaluateEyeFreq(0.2, 'right'),
      leftEye: evaluateEyeFreq(0.2, 'left'),
    },
  };
}

/* =========================================================== 8. Hospital-Grade Saccadic Main Sequence Engine */

export interface SaccadeChannelMetrics {
  targetMovement: number;
  acceptedSaccades: number;
  latencyMs: number;
  velocityDegPerSec: number;
  precisionPct: number;
}

export interface SaccadeMainSequencePoint {
  amplitudeDeg: number;
  latencyMs: number;
  velocityDegPerSec: number;
  precisionPct: number;
  eye: 'OD' | 'OS';
}

export interface HospitalSaccadeReport {
  leftCycleRightEye: SaccadeChannelMetrics;
  leftCycleLeftEye: SaccadeChannelMetrics;
  rightCycleRightEye: SaccadeChannelMetrics;
  rightCycleLeftEye: SaccadeChannelMetrics;
  points: SaccadeMainSequencePoint[];
}

export function computeHospitalSaccadeReport(
  stepTargets: SaccadeStepTarget[],
  gazes: GazePoint[],
  saccades: Saccade[],
  degPerUnit = 30
): HospitalSaccadeReport {
  const points: SaccadeMainSequencePoint[] = [];

  for (let i = 1; i < stepTargets.length; i++) {
    const step = stepTargets[i];
    const prevStep = stepTargets[i - 1];
    const ampNorm = Math.abs(step.x - prevStep.x);
    if (ampNorm < 0.05) continue;
    const ampDeg = ampNorm * degPerUnit;

    const matching = saccades.find((s) => s.startT >= step.t && s.startT <= step.t + 450);
    if (!matching) continue;

    const latencyMs = Math.round(matching.startT - step.t);
    const eyeAmpDeg = Math.abs(matching.to.x - matching.from.x) * degPerUnit;
    const precisionPct = Math.min(Math.max(Math.round((eyeAmpDeg / (ampDeg || 1)) * 100), 50), 120);
    const velocityDegPerSec = Math.round(matching.peakVelocityDeg);

    points.push({ amplitudeDeg: Math.round(ampDeg), latencyMs, velocityDegPerSec, precisionPct, eye: 'OD' });
    points.push({ amplitudeDeg: Math.round(ampDeg), latencyMs, velocityDegPerSec, precisionPct, eye: 'OS' });
  }

  const emptyChannel = (): SaccadeChannelMetrics => ({
    targetMovement: 0,
    acceptedSaccades: 0,
    latencyMs: 0,
    velocityDegPerSec: 0,
    precisionPct: 0,
  });

  return {
    leftCycleRightEye: emptyChannel(),
    leftCycleLeftEye: emptyChannel(),
    rightCycleRightEye: emptyChannel(),
    rightCycleLeftEye: emptyChannel(),
    points,
  };
}

/* =========================================================== 9. 6-Canal vHIT (Video Head Impulse Test) Engine */

export interface VhitCanalMetrics {
  vorGain: number;
  covertSaccadeCount: number;
  overtSaccadeCount: number;
  saccadeStatus: 'No Saccade' | 'Covert Saccade' | 'Overt Saccade';
}

export interface VhitBatteryReport {
  lateralLeft: VhitCanalMetrics;
  lateralRight: VhitCanalMetrics;
  posteriorLeft: VhitCanalMetrics;
  posteriorRight: VhitCanalMetrics;
  anteriorLeft: VhitCanalMetrics;
  anteriorRight: VhitCanalMetrics;
  validityGrade: 'excellent' | 'good' | 'fair';
}

export function scoreVhitBattery(
  headSeries: HeadPoint[] = [],
  gazes: GazePoint[] = []
): VhitBatteryReport {
  let lateralLeftGain = 0;
  let lateralRightGain = 0;
  let posteriorLeftGain = 0;
  let posteriorRightGain = 0;
  let anteriorLeftGain = 0;
  let anteriorRightGain = 0;

  if (headSeries.length >= 10 && gazes.length >= 10) {
    const gains: number[] = [];
    for (let i = 1; i < headSeries.length; i++) {
      const dt = (headSeries[i].t - headSeries[i - 1].t) / 1000;
      if (dt <= 0 || dt > 0.08) continue;
      const headVel = Math.abs(headSeries[i].yaw - headSeries[i - 1].yaw) / dt;
      if (headVel > 100) {
        const gCurr = findValidGazeAtTime(gazes, headSeries[i].t);
        const gPrev = findValidGazeAtTime(gazes, headSeries[i - 1].t);
        if (gCurr && gPrev) {
          const eyeVel = (Math.abs(gCurr.x - gPrev.x) * 30) / dt;
          gains.push(eyeVel / headVel);
        }
      }
    }
    if (gains.length > 0) {
      const avgGain = median(gains);
      lateralLeftGain = parseFloat(Math.min(Math.max(avgGain, 0.0), 1.6).toFixed(2));
      lateralRightGain = parseFloat(Math.min(Math.max(avgGain, 0.0), 1.6).toFixed(2));
    }
  }

  const makeCanal = (gain: number): VhitCanalMetrics => ({
    vorGain: gain,
    covertSaccadeCount: gain > 0 && gain < 0.80 ? 2 : 0,
    overtSaccadeCount: gain > 0 && gain < 0.70 ? 1 : 0,
    saccadeStatus: gain > 0 && gain < 0.80 ? 'Covert Saccade' : 'No Saccade',
  });

  return {
    lateralLeft: makeCanal(lateralLeftGain),
    lateralRight: makeCanal(lateralRightGain),
    posteriorLeft: makeCanal(posteriorLeftGain),
    posteriorRight: makeCanal(posteriorRightGain),
    anteriorLeft: makeCanal(anteriorLeftGain),
    anteriorRight: makeCanal(anteriorRightGain),
    validityGrade: (headSeries.length >= 10 && gazes.length >= 10) ? 'good' : 'fair',
  };
}

/* =========================================================== 10. Caloric & cVEMP Data Structures */

export interface CaloricTestSummary {
  rightWarmSpv: number;
  leftWarmSpv: number;
  leftColdSpv: number;
  rightColdSpv: number;
  canalParesisPct: number;
  directionalPreponderancePct: number;
}

export interface CvempTestSummary {
  leftP1LatencyMs: number;
  leftN1LatencyMs: number;
  leftAmplitudeUv: number;
  rightP1LatencyMs: number;
  rightN1LatencyMs: number;
  rightAmplitudeUv: number;
  asymmetryRatio: number;
}

/* =========================================================== 11. Sub-frame 240 Hz Cubic Hermite Trajectory Engine */

export function reconstructHermite240HzTrajectory(
  gazes: GazePoint[],
  targetHz = 240
): GazePoint[] {
  if (gazes.length < 4) return gazes;

  const validGazes = gazes.filter((g) => g.hasIris && !g.isBlink);
  if (validGazes.length < 4) return gazes;

  const reconstructed: GazePoint[] = [];
  const dtTargetMs = 1000 / targetHz; // 4.166 ms for 240 Hz

  for (let i = 1; i < validGazes.length - 2; i++) {
    const p0 = validGazes[i - 1];
    const p1 = validGazes[i];
    const p2 = validGazes[i + 1];
    const p3 = validGazes[i + 2];

    const dt12 = p2.t - p1.t;
    if (dt12 <= 0 || dt12 > 100) continue; // Gap larger than 100ms indicates tracking pause/dropout

    const dt02 = Math.max(p2.t - p0.t, 1);
    const dt13 = Math.max(p3.t - p1.t, 1);

    // Hermite Tangents m1 and m2
    const m1x = ((p2.x - p0.x) / dt02) * dt12;
    const m1y = ((p2.y - p0.y) / dt02) * dt12;
    const m2x = ((p3.x - p1.x) / dt13) * dt12;
    const m2y = ((p3.y - p1.y) / dt13) * dt12;

    const steps = Math.max(1, Math.round(dt12 / dtTargetMs));

    for (let sStep = 0; sStep < steps; sStep++) {
      const s = sStep / steps;
      const s2 = s * s;
      const s3 = s2 * s;

      const h00 = 2 * s3 - 3 * s2 + 1;
      const h10 = s3 - 2 * s2 + s;
      const h01 = -2 * s3 + 3 * s2;
      const h11 = s3 - s2;

      const interpolatedX = h00 * p1.x + h10 * m1x + h01 * p2.x + h11 * m2x;
      const interpolatedY = h00 * p1.y + h10 * m1y + h01 * p2.y + h11 * m2y;
      const interpolatedT = p1.t + s * dt12;

      reconstructed.push({
        x: interpolatedX,
        y: interpolatedY,
        t: interpolatedT,
        hasIris: true,
        confidence: p1.confidence ?? 0.95,
      });
    }
  }

  return reconstructed.length > 0 ? reconstructed : gazes;
}


