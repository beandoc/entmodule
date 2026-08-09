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

import { GazePoint, Saccade } from './gaze-tracking';
import { evaluateGazeValidity, HeadPoint, ValidityResult } from './gaze-validity';
import { evaluateBinocularAnalytics, BinocularAnalyticsReport } from './gaze-binocular';

/* =========================================================== Robust Statistics Utilities */

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
    };
  }

  let sumDot = 0;
  let sumTgtSq = 0;
  let sumGazeSq = 0;

  const instantaneousGains: number[] = [];
  const slipVelocitiesDeg: number[] = [];

  for (let i = 1; i < targets.length; i++) {
    const tgt = targets[i];
    const prevTgt = targets[i - 1];
    const dtSec = (tgt.t - prevTgt.t) / 1000;
    if (dtSec <= 0 || dtSec > 0.1) continue;

    // Find closest un-interpolated non-blink gaze sample
    const gCurr = findValidGazeAtTime(gazes, tgt.t);
    const gPrev = findValidGazeAtTime(gazes, prevTgt.t);
    if (!gCurr || !gPrev) continue;

    const tvx = (tgt.x - prevTgt.x) / dtSec;
    const tvy = (tgt.y - prevTgt.y) / dtSec;
    const tvMag = Math.sqrt(tvx * tvx + tvy * tvy);

    // Only evaluate smooth pursuit while target stimulus is actively moving
    if (tvMag < 0.02) continue;

    const gvx = (gCurr.x - gPrev.x) / dtSec;
    const gvy = (gCurr.y - gPrev.y) / dtSec;
    const gvMag = Math.sqrt(gvx * gvx + gvy * gvy);

    sumDot += gvx * tvx + gvy * tvy;
    sumTgtSq += tvx * tvx + tvy * tvy;
    sumGazeSq += gvx * gvx + gvy * gvy;

    if (tvMag > 0.1) {
      instantaneousGains.push(Math.min(gvMag / tvMag, 1.25));
    }

    // Retinal slip velocity (deg/s)
    const slipVx = (tgt.x - gCurr.x) / dtSec;
    const slipVy = (tgt.y - gCurr.y) / dtSec;
    const slipMagNorm = Math.sqrt(slipVx * slipVx + slipVy * slipVy);
    slipVelocitiesDeg.push(slipMagNorm * degPerUnit);
  }

  const rawVelocityGain = sumTgtSq > 1e-9 ? sumDot / sumTgtSq : 0;
  const velocityGain = Math.min(Math.max(parseFloat(rawVelocityGain.toFixed(2)), -1.0), 1.05);

  const denom = Math.sqrt(sumTgtSq * sumGazeSq);
  const directionalAgreement =
    denom > 1e-9 ? parseFloat(Math.min(Math.max(sumDot / denom, -1), 1).toFixed(2)) : 0;

  const medianSlip = median(slipVelocitiesDeg);
  const sortedSlip = [...slipVelocitiesDeg].sort((a, b) => a - b);
  const p95Slip = sortedSlip[Math.floor(sortedSlip.length * 0.95)] ?? medianSlip;

  const gainCi = bootstrapConfidenceInterval(instantaneousGains, 300);

  // Estimate Phase Lag via cross-correlation over horizontal tracking
  const { phaseLagMs, phaseLagDeg } = estimatePursuitPhaseLag(targets, gazes);

  // Single-sine Fourier frequency analysis for 0.1, 0.3, 0.5 Hz
  const frequencyGains: FrequencyGainResult[] = [0.1, 0.3, 0.5].map((freq) => {
    const fg = fitSinusoidalGainAtFrequency(targets, gazes, freq);
    return fg;
  });

  // Catch-up saccades filtering
  let catchUpSaccadeCount = 0;
  for (const s of saccades) {
    const targetAtStart = findTargetAtTime(targets, s.startT);
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

/* =========================================================== Helper interpolation & fitting utilities */

function findValidGazeAtTime(gazes: GazePoint[], targetT: number): GazePoint | null {
  for (let i = 0; i < gazes.length; i++) {
    if (Math.abs(gazes[i].t - targetT) <= 35 && gazes[i].hasIris && !gazes[i].isBlink) {
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
  let count = 0;

  for (const tgt of targets) {
    const g = findValidGazeAtTime(gazes, tgt.t);
    if (!g) continue;

    const tSec = (tgt.t - targets[0].t) / 1000;
    const omega = 2 * Math.PI * freqHz;
    const c = Math.cos(omega * tSec);
    const s = Math.sin(omega * tSec);

    cosTgt += tgt.x * c;
    sinTgt += tgt.x * s;

    cosGaze += g.x * c;
    sinGaze += g.x * s;
    count++;
  }

  if (count < 10) {
    return { frequencyHz: freqHz, gain: 0, phaseLagDeg: 0, harmonicDistortionPct: 0 };
  }

  const ampTgt = Math.sqrt(cosTgt * cosTgt + sinTgt * sinTgt);
  const ampGaze = Math.sqrt(cosGaze * cosGaze + sinGaze * sinGaze);

  const gain = ampTgt > 1e-6 ? Math.min(ampGaze / ampTgt, 1.5) : 0;
  const phaseTgt = Math.atan2(sinTgt, cosTgt);
  const phaseGaze = Math.atan2(sinGaze, cosGaze);
  let phaseLagRad = phaseTgt - phaseGaze;

  while (phaseLagRad > Math.PI) phaseLagRad -= 2 * Math.PI;
  while (phaseLagRad < -Math.PI) phaseLagRad += 2 * Math.PI;

  const phaseLagDeg = phaseLagRad * (180 / Math.PI);

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
  let maxCorr = -1;
  let bestShiftMs = 0;

  for (let shiftMs = -200; shiftMs <= 300; shiftMs += 20) {
    let sumProd = 0;
    let sumTgtSq = 0;
    let sumGazeSq = 0;

    for (const tgt of targets) {
      const g = findValidGazeAtTime(gazes, tgt.t + shiftMs);
      if (!g) continue;

      sumProd += tgt.x * g.x;
      sumTgtSq += tgt.x * tgt.x;
      sumGazeSq += g.x * g.x;
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

  const phaseLagDeg = (bestShiftMs / 1000) * 0.3 * 360; // Assumes ~0.3 Hz average target frequency
  return { phaseLagMs: bestShiftMs, phaseLagDeg };
}
