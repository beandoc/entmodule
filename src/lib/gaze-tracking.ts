/**
 * Gaze Tracking Analytics Engine for Vestibular Rehabilitation
 *
 * Implements browser-side eye-movement analysis inspired by the algorithms in:
 *   - antoinelame/GazeTracking  (iris-centre pupil tracking concept)
 *   - ck-zhang/EyeTrax           (webcam gaze estimation)
 *   - JEOresearch/EyeTracker     (fixation / saccade classification)
 *   - pymovements                (I-DT fixation detection, VOR metrics)
 *
 * All processing is on-device — no video or gaze data ever leaves the browser.
 *
 * MediaPipe FaceLandmarker returns 478 points when `refineLandmarks: true`.
 * Iris landmark indices:
 *   Left  iris centre : 468
 *   Left  iris ring   : 469, 470, 471, 472
 *   Right iris centre : 473
 *   Right iris ring   : 474, 475, 476, 477
 *
 * Normalised gaze coordinates are in [0, 1] relative to the video frame,
 * with (0,0) = top-left of the *mirrored* image the patient sees.
 */

/* =========================================================== types */

export interface GazePoint {
  /** Normalised x in [0,1]: 0 = patient's left, 1 = patient's right (mirrored). */
  x: number;
  /** Normalised y in [0,1]: 0 = top, 1 = bottom. */
  y: number;
  /** Unix timestamp (ms). */
  t: number;
  /** True when iris landmarks are available (FaceLandmarker with refineLandmarks). */
  hasIris: boolean;
  /** Left iris centre in canvas pixels. */
  leftIris?: { x: number; y: number };
  /** Right iris centre in canvas pixels. */
  rightIris?: { x: number; y: number };
  /** Estimated gaze direction as a unit vector in head-reference space. */
  gazeVector?: { x: number; y: number };
  /** Raw uncalibrated intra-ocular horizontal offset. */
  rawOffsetX?: number;
  /** Raw uncalibrated intra-ocular vertical offset. */
  rawOffsetY?: number;
  /** Tracking confidence score in [0.0, 1.0]. */
  confidence?: number;
  /** True if eye blink / lid closure was detected on this frame. */
  isBlink?: boolean;
  /** Eye Aspect Ratio (EAR). */
  ear?: number;
  /** Disagreement magnitude between left and right eye gaze vectors. */
  eyeDisagreement?: number;
  /** Individual left eye gaze position normalized to [0,1]. */
  leftEyeX?: number;
  leftEyeY?: number;
  /** Individual right eye gaze position normalized to [0,1]. */
  rightEyeX?: number;
  rightEyeY?: number;
}

export interface CalibrationPointSample {
  target: { x: number; y: number }; // Screen target position in [0,1]
  rawOffset: { x: number; y: number }; // Measured pupil offset
}

export interface CalibrationCoefficients {
  a0: number; a1: number; a2: number; // screenX = a0 + a1*rawX + a2*rawY
  b0: number; b1: number; b2: number; // screenY = b0 + b1*rawX + b2*rawY
  isCalibrated: boolean;
}

export interface Fixation {
  /** Start timestamp (ms). */
  startT: number;
  /** End timestamp (ms). */
  endT: number;
  /** Duration (ms). */
  duration: number;
  /** Centroid of all gaze points in this fixation, normalised [0,1]. */
  centroid: { x: number; y: number };
  /** Number of gaze samples in this fixation. */
  count: number;
}

export interface Saccade {
  startT: number;
  endT: number;
  duration: number;
  /** Peak velocity in degrees/second (approximated from normalised units × screen angle). */
  peakVelocityDeg: number;
  /** Direction vector (normalised). */
  direction: { x: number; y: number };
  /** Start gaze point (normalised). */
  from: { x: number; y: number };
  /** End gaze point (normalised). */
  to: { x: number; y: number };
  /** Amplitude in degrees (approximate). */
  amplitudeDeg: number;
}

/**
 * VOR (Vestibulo-Ocular Reflex) score for one exercise window.
 * A healthy VOR produces eye movements that perfectly compensate head rotation,
 * keeping the gaze stable on the target — gain = 1.0.
 */
export interface VORScore {
  /**
   * VOR gain = mean |gaze velocity| / mean |head velocity|.
   * Ideal: 1.0. Clinically impaired: < 0.6.
   */
  gain: number;
  /**
   * Phase error in degrees. Healthy VOR: ~0° (eye opposes head exactly).
   * Large phase lag → delayed VOR.
   */
  phaseErrorDeg: number;
  /** Number of head-turn cycles used for the estimate. */
  cycles: number;
  /** Mean peak head velocity (°/s). */
  meanHeadVelocityDeg: number;
  /** Mean peak gaze velocity (°/s). */
  meanGazeVelocityDeg: number;
  /** Subjective quality label. */
  label: 'excellent' | 'good' | 'fair' | 'impaired';
  /** True when head velocity < 15°/s (insufficient head rotation for true VOR calculation). */
  isHeadStationary?: boolean;
}

export interface NystagmusFlag {
  /** True if the heuristic detected nystagmus-like oscillation. */
  detected: boolean;
  /** Estimated oscillation frequency in Hz (0 if not detected). */
  frequencyHz: number;
  /** Direction of fast phase ('horizontal' | 'vertical' | 'rotary' | 'none'). */
  direction: 'horizontal' | 'vertical' | 'rotary' | 'none';
  /** Amplitude of oscillation in normalised screen units. */
  amplitude: number;
}

export interface SaccadeMetrics {
  latencyMs: number; // Normal range: 150-250 ms (Pre-motor / cortical pathways)
  precisionPercent: number; // Normal range: 85-115% (Cerebellar dysmetria check)
  peakVelocityDegPerSec: number; // Normal range: 250-600 deg/s (Brainstem & Ocular nerves III, IV, VI)
  isHypometria: boolean;
  isHypermetria: boolean;
}

export interface SmoothPursuitVngMetrics {
  gain01Hz: number; // Normal > 0.8
  gain03Hz: number; // Normal > 0.75
  gain05Hz: number; // Normal > 0.65
  saccadicIntrusionsCount: number; // Catch-up / catch-back saccades count
  retinalSlipDegPerSec: number;
}

export interface OptokineticMetrics {
  slowPhaseVelocityRight: number; // deg/s
  slowPhaseVelocityLeft: number; // deg/s
  oknGainRight: number; // SPV / 20 deg/s
  oknGainLeft: number;
  asymmetryPercent: number; // Normal < 15%
}

export interface GazeAnalytics {
  vorScore: VORScore | null;
  nystagmus: NystagmusFlag;
  fixations: Fixation[];
  saccades: Saccade[];
  meanFixationDuration: number;
  meanSaccadeVelocity: number;
  antiSaccadeErrorRate: number;
  saccadeVng?: SaccadeMetrics;
  smoothPursuitVng?: SmoothPursuitVngMetrics;
  optokineticVng?: OptokineticMetrics;
  clinicalGuidance: string;
  centralPeripheralLoc: 'peripheral' | 'central' | 'normal' | 'inconclusive';
  /** Fraction of session time spent in fixation. */
  fixationFraction: number;
  /** Insight string for the AI summary card. */
  insight: string;
}

export interface GazeSession {
  id: string;
  date: string;
  exerciseId: string;
  analytics: GazeAnalytics;
  durationMs: number;
  createdAt: string;
}

/* =========================================================== constants */

/**
 * Approximate degrees of visual angle per normalised unit at typical screen
 * distance (60 cm, 27" monitor). Used to convert pixel velocity → °/s.
 * This is a reasonable default for seated patient setups.
 */
const DEG_PER_UNIT = 30;

/** I-DT fixation detection: maximum dispersion for a fixation window. */
const FIXATION_DISPERSION_DEG = 1.5;
/** I-DT fixation detection: minimum fixation duration (ms). */
const FIXATION_MIN_DURATION_MS = 80;

/** Saccade detection: velocity threshold (°/s). */
const SACCADE_VELOCITY_THRESHOLD = 30;

/**
 * Maximum gap between consecutive samples that still counts as continuous
 * tracking (ms). Face detection drops out whenever the patient blinks, turns
 * far off-axis, or the frame rate stalls. Treating the jump either side of such
 * a dropout as real eye motion manufactures a huge phantom velocity, so every
 * velocity-based metric ignores intervals longer than this.
 */
const MAX_SAMPLE_GAP_MS = 200;

/** Nystagmus heuristic: minimum oscillation frequency to flag (Hz). */
const NYSTAGMUS_MIN_HZ = 1.0;
/** Nystagmus heuristic: minimum oscillation amplitude in normalised units. */
const NYSTAGMUS_MIN_AMPLITUDE = 0.008;
/**
 * Nystagmus heuristic: upper bound of the physiological band (Hz). Oscillation
 * faster than this is landmark jitter, not an eye movement.
 */
const NYSTAGMUS_MAX_HZ = 6.0;
/**
 * Nystagmus heuristic: how much faster the fast phase must be than the slow
 * phase before the waveform counts as a sawtooth rather than a voluntary,
 * roughly symmetric oscillation.
 */
const NYSTAGMUS_MIN_ASYMMETRY = 2.0;
/**
 * Nystagmus heuristic: mean head velocity (°/s) above which the head counts as
 * actively rotating, so compensatory eye motion is VOR rather than nystagmus.
 */
const NYSTAGMUS_MAX_HEAD_VELOCITY = 15.0;

/**
 * Compute Eye Aspect Ratio (EAR) for blink detection.
 * EAR = (|p2-p6| + |p3-p5|) / (2 * |p1-p4|)
 */
export function computeEAR(landmarks: Array<{ x: number; y: number }>): { ear: number; isBlink: boolean } {
  if (landmarks.length < 468) return { ear: 0.25, isBlink: false };

  // Left Eye: 33 outer, 133 inner, 159 top1, 145 bot1, 158 top2, 144 bot2
  const lWidth = Math.hypot(landmarks[33].x - landmarks[133].x, landmarks[33].y - landmarks[133].y) || 0.03;
  const lH1 = Math.hypot(landmarks[159].x - landmarks[145].x, landmarks[159].y - landmarks[145].y);
  const lH2 = Math.hypot(landmarks[158].x - landmarks[144].x, landmarks[158].y - landmarks[144].y);
  const lEAR = (lH1 + lH2) / (2 * lWidth);

  // Right Eye: 362 inner, 263 outer, 386 top1, 374 bot1, 385 top2, 373 bot2
  const rWidth = Math.hypot(landmarks[362].x - landmarks[263].x, landmarks[362].y - landmarks[263].y) || 0.03;
  const rH1 = Math.hypot(landmarks[386].x - landmarks[374].x, landmarks[386].y - landmarks[374].y);
  const rH2 = Math.hypot(landmarks[385].x - landmarks[373].x, landmarks[385].y - landmarks[373].y);
  const rEAR = (rH1 + rH2) / (2 * rWidth);

  const avgEAR = (lEAR + rEAR) / 2;
  const isBlink = avgEAR < 0.16;

  return { ear: avgEAR, isBlink };
}

/* =========================================================== iris extraction */

/**
 * Extract a normalised gaze point from MediaPipe face landmarks.
 * Supports zero-point calibration via `neutralOffset` and head pose compensation via `headPose`.
 */
export function extractGazeFromLandmarks(
  landmarks: Array<{ x: number; y: number; z?: number }>,
  width: number,
  height: number,
  t: number,
  neutralOffset?: { x: number; y: number },
  headPose?: { yaw: number; pitch: number },
): GazePoint {
  const hasIris = landmarks.length >= 478;

  if (!hasIris) {
    const leftEye = landmarks[33];
    const rightEye = landmarks[263];
    if (!leftEye || !rightEye) {
      return { x: 0.5, y: 0.5, t, hasIris: false, confidence: 0 };
    }
    const x = 1 - (leftEye.x + rightEye.x) / 2;
    const y = (leftEye.y + rightEye.y) / 2;
    return { x, y, t, hasIris: false, confidence: 0.3 };
  }

  // Compute Eye Aspect Ratio for blink detection
  const { ear, isBlink } = computeEAR(landmarks);

  // MediaPipe Landmark Indices:
  // Left eye: outer corner 33, inner corner 133, top 159, bottom 145, pupil 468
  // Right eye: inner corner 362, outer corner 263, top 386, bottom 374, pupil 473
  const lOuter = landmarks[33];
  const lInner = landmarks[133];
  const lTop = landmarks[159];
  const lBottom = landmarks[145];
  const lPupil = landmarks[468];

  const rInner = landmarks[362];
  const rOuter = landmarks[263];
  const rTop = landmarks[386];
  const rBottom = landmarks[374];
  const rPupil = landmarks[473];

  // Intra-ocular horizontal offset (pupil offset relative to eye socket width)
  const lWidth = Math.abs(lInner.x - lOuter.x) || 0.03;
  const rWidth = Math.abs(rOuter.x - rInner.x) || 0.03;

  const lCenterX = (lOuter.x + lInner.x) / 2;
  const rCenterX = (rOuter.x + rInner.x) / 2;

  const lOffsetX = (lPupil.x - lCenterX) / lWidth;
  const rOffsetX = (rPupil.x - rCenterX) / rWidth;
  const avgOffsetX = (lOffsetX + rOffsetX) / 2;

  // Intra-ocular vertical offset (pupil offset relative to eye socket height)
  const lHeight = Math.abs(lBottom.y - lTop.y) || 0.015;
  const rHeight = Math.abs(rBottom.y - rTop.y) || 0.015;

  const lCenterY = (lTop.y + lBottom.y) / 2;
  const rCenterY = (rTop.y + rBottom.y) / 2;

  const lOffsetY = (lPupil.y - lCenterY) / lHeight;
  const rOffsetY = (rPupil.y - rCenterY) / rHeight;
  const avgOffsetY = (lOffsetY + rOffsetY) / 2;

  // Zero-point calibration offset
  const zeroX = neutralOffset?.x ?? avgOffsetX;
  const zeroY = neutralOffset?.y ?? avgOffsetY;

  let deltaX = avgOffsetX - zeroX;
  let deltaY = avgOffsetY - zeroY;

  // Head Pose Compensation:
  // Turning head right (yaw > 0 in mirrored frame) shifts pupil left in image.
  // Partial compensation factor 0.35 accounts for eye counter-rotation.
  if (headPose) {
    const yawComp = (headPose.yaw / 45) * 0.12;
    const pitchComp = (headPose.pitch / 45) * 0.12;
    deltaX -= yawComp;
    deltaY += pitchComp;
  }

  // Gain scaling factor: 10.0x horizontal, 10.0x vertical to project eye rotation across full screen
  const GAZE_GAIN_X = 10.0;
  const GAZE_GAIN_Y = 10.0;

  const gazeX = Math.min(Math.max(0.5 - deltaX * GAZE_GAIN_X, 0.02), 0.98);
  const gazeY = Math.min(Math.max(0.5 + deltaY * GAZE_GAIN_Y, 0.02), 0.98);

  // Left vs Right eye position tracking (clamped to 0.02 - 0.98 screen bounds)
  const lGazeX = Math.min(Math.max(0.5 - (lOffsetX - zeroX) * GAZE_GAIN_X, 0.02), 0.98);
  const rGazeX = Math.min(Math.max(0.5 - (rOffsetX - zeroX) * GAZE_GAIN_X, 0.02), 0.98);
  const lGazeY = Math.min(Math.max(0.5 + (lOffsetY - zeroY) * GAZE_GAIN_Y, 0.02), 0.98);
  const rGazeY = Math.min(Math.max(0.5 + (rOffsetY - zeroY) * GAZE_GAIN_Y, 0.02), 0.98);
  const eyeDisagreement = Math.abs(lGazeX - rGazeX);

  // Confidence calculation
  let confidence = 0.95;
  if (isBlink) confidence = 0.05;
  else if (eyeDisagreement > 0.15) confidence = Math.max(0.2, 0.95 - (eyeDisagreement - 0.15) * 3);

  const leftIris = {
    x: (1 - lPupil.x) * width,
    y: lPupil.y * height,
  };
  const rightIris = {
    x: (1 - rPupil.x) * width,
    y: rPupil.y * height,
  };

  return {
    x: gazeX,
    y: gazeY,
    t,
    hasIris: true,
    leftIris,
    rightIris,
    gazeVector: { x: gazeX - 0.5, y: gazeY - 0.5 },
    rawOffsetX: avgOffsetX,
    rawOffsetY: avgOffsetY,
    confidence,
    isBlink,
    ear,
    eyeDisagreement,
    leftEyeX: lGazeX,
    leftEyeY: lGazeY,
    rightEyeX: rGazeX,
    rightEyeY: rGazeY,
  };
}

/* =========================================================== fixation detection (I-DT) */

/**
 * Dispersion-Threshold Identification (I-DT) fixation detector.
 * From Salvucci & Goldberg (2000) — the same algorithm used by pymovements.
 *
 * Algorithm:
 *  1. Take a sliding window of minimum duration.
 *  2. Compute dispersion = (max_x - min_x) + (max_y - min_y).
 *  3. If dispersion < threshold → fixation. Grow window until dispersion exceeds threshold.
 *  4. Otherwise advance window by one point.
 */
export function detectFixations(
  gazeHistory: GazePoint[],
  params: { dispersionDeg?: number; minDurationMs?: number } = {},
): Fixation[] {
  const dispThreshold = (params.dispersionDeg ?? FIXATION_DISPERSION_DEG) / DEG_PER_UNIT;
  const minDuration = params.minDurationMs ?? FIXATION_MIN_DURATION_MS;

  if (gazeHistory.length < 2) return [];

  const fixations: Fixation[] = [];
  let i = 0;

  while (i < gazeHistory.length) {
    // Grow a window from i while it stays within the dispersion threshold,
    // maintaining the bounding box incrementally so a long session stays O(n)
    // rather than re-scanning the whole window on every extension.
    const seed = gazeHistory[i];
    let minX = seed.x, maxX = seed.x;
    let minY = seed.y, maxY = seed.y;
    let sumX = seed.x, sumY = seed.y;
    let j = i + 1;

    while (j < gazeHistory.length) {
      // A tracking dropout terminates the window: samples either side of a gap
      // are separate fixations, not one long one.
      const gapMs = gazeHistory[j].t - gazeHistory[j - 1].t;
      if (gapMs <= 0 || gapMs > MAX_SAMPLE_GAP_MS) break;

      const p = gazeHistory[j];
      const nMinX = Math.min(minX, p.x), nMaxX = Math.max(maxX, p.x);
      const nMinY = Math.min(minY, p.y), nMaxY = Math.max(maxY, p.y);
      if ((nMaxX - nMinX) + (nMaxY - nMinY) > dispThreshold) break;

      minX = nMinX; maxX = nMaxX; minY = nMinY; maxY = nMaxY;
      sumX += p.x; sumY += p.y;
      j++;
    }

    const count = j - i;
    const startT = seed.t;
    const endT = gazeHistory[j - 1].t;

    if (count >= 2 && endT - startT >= minDuration) {
      fixations.push({
        startT, endT,
        duration: endT - startT,
        centroid: { x: sumX / count, y: sumY / count },
        count,
      });
      i = j;
    } else {
      i++;
    }
  }

  return fixations;
}

/* =========================================================== saccade detection */

/**
 * Velocity-based saccade detector (I-VT algorithm).
 * Computes inter-sample angular velocity; samples above the threshold
 * are classified as saccades.
 */
export function detectSaccades(
  gazeHistory: GazePoint[],
  params: { velocityThresholdDeg?: number } = {},
): Saccade[] {
  const threshold = (params.velocityThresholdDeg ?? SACCADE_VELOCITY_THRESHOLD) / DEG_PER_UNIT;

  if (gazeHistory.length < 2) return [];

  // Compute velocity for each sample
  const velocities: number[] = [0];
  for (let i = 1; i < gazeHistory.length; i++) {
    const gapMs = gazeHistory[i].t - gazeHistory[i - 1].t;
    // A tracking dropout is not an eye movement — the displacement either side
    // of the gap is unmeasured, so it must not register as a saccade.
    if (gapMs <= 0 || gapMs > MAX_SAMPLE_GAP_MS) { velocities.push(0); continue; }
    const dt = gapMs / 1000; // seconds
    const dx = gazeHistory[i].x - gazeHistory[i - 1].x;
    const dy = gazeHistory[i].y - gazeHistory[i - 1].y;
    velocities.push(Math.sqrt(dx * dx + dy * dy) / dt);
  }

  const saccades: Saccade[] = [];
  let inSaccade = false;
  let saccadeStart = 0;

  for (let i = 0; i < velocities.length; i++) {
    if (!inSaccade && velocities[i] > threshold) {
      inSaccade = true;
      saccadeStart = i;
    } else if (inSaccade && velocities[i] <= threshold) {
      inSaccade = false;
      const pts = gazeHistory.slice(saccadeStart, i);
      if (pts.length < 2) continue;

      const peakVelocity = Math.max(...velocities.slice(saccadeStart, i)) * DEG_PER_UNIT;
      const from = { x: pts[0].x, y: pts[0].y };
      const to = { x: pts[pts.length - 1].x, y: pts[pts.length - 1].y };
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const mag = Math.sqrt(dx * dx + dy * dy);
      const amplitudeDeg = mag * DEG_PER_UNIT;
      const direction = mag > 0 ? { x: dx / mag, y: dy / mag } : { x: 0, y: 0 };

      saccades.push({
        startT: pts[0].t,
        endT: pts[pts.length - 1].t,
        duration: pts[pts.length - 1].t - pts[0].t,
        peakVelocityDeg: peakVelocity,
        direction,
        from,
        to,
        amplitudeDeg,
      });
    }
  }

  return saccades;
}

/* =========================================================== VOR scoring */

/**
 * Compute VOR gain and phase error for one head-turn exercise window.
 *
 * VOR gain = mean peak eye velocity / mean peak head velocity.
 * A healthy VOR produces gain ≈ 1.0 (eye perfectly compensates head).
 * Vestibular hypofunction → gain < 0.6.
 *
 * @param gazeSeries   Gaze points with timestamps.
 * @param headSeries   Head yaw values (degrees) at the same timestamps.
 */
export function scoreVOR(
  gazeSeries: GazePoint[],
  headSeries: Array<{ t: number; yaw: number }>,
): VORScore {
  if (gazeSeries.length < 4 || headSeries.length < 4) {
    return { gain: 0, phaseErrorDeg: 0, cycles: 0, meanHeadVelocityDeg: 0, meanGazeVelocityDeg: 0, label: 'fair' };
  }

  // Compute head velocity series (°/s)
  const headVelocities: number[] = [];
  for (let i = 1; i < headSeries.length; i++) {
    const gapMs = headSeries[i].t - headSeries[i - 1].t;
    if (gapMs <= 0 || gapMs > MAX_SAMPLE_GAP_MS) continue;
    headVelocities.push(Math.abs(headSeries[i].yaw - headSeries[i - 1].yaw) / (gapMs / 1000));
  }

  // Compute gaze velocity series (normalised → °/s)
  const gazeVelocities: number[] = [];
  for (let i = 1; i < gazeSeries.length; i++) {
    const gapMs = gazeSeries[i].t - gazeSeries[i - 1].t;
    if (gapMs <= 0 || gapMs > MAX_SAMPLE_GAP_MS) continue;
    const dt = gapMs / 1000;
    const dx = gazeSeries[i].x - gazeSeries[i - 1].x;
    const dy = gazeSeries[i].y - gazeSeries[i - 1].y;
    gazeVelocities.push((Math.sqrt(dx * dx + dy * dy) / dt) * DEG_PER_UNIT);
  }

  if (headVelocities.length === 0 || gazeVelocities.length === 0) {
    return { gain: 0, phaseErrorDeg: 0, cycles: 0, meanHeadVelocityDeg: 0, meanGazeVelocityDeg: 0, label: 'fair' };
  }

  const meanHeadV = headVelocities.reduce((s, v) => s + v, 0) / headVelocities.length;
  const meanGazeV = gazeVelocities.reduce((s, v) => s + v, 0) / gazeVelocities.length;

  const isHeadStationary = meanHeadV < 15.0; // Head velocity < 15°/s is stationary / pursuit

  // VOR Gain = Gaze Velocity / Head Velocity (requires active head rotation >= 15°/s)
  const gain = isHeadStationary ? 0 : Math.min(meanGazeV / meanHeadV, 1.5);

  const label: VORScore['label'] =
    isHeadStationary ? 'good' :
    gain >= 0.9 ? 'excellent' :
    gain >= 0.7 ? 'good' :
    gain >= 0.5 ? 'fair' : 'impaired';

  const phaseErrorDeg = estimatePhaseError(gazeSeries, headSeries);
  const cycles = countHeadCycles(headSeries);

  return {
    gain: parseFloat(gain.toFixed(3)),
    phaseErrorDeg: parseFloat(phaseErrorDeg.toFixed(1)),
    cycles,
    meanHeadVelocityDeg: parseFloat(meanHeadV.toFixed(1)),
    meanGazeVelocityDeg: parseFloat(meanGazeV.toFixed(1)),
    label,
    isHeadStationary,
  };
}

function countHeadCycles(headSeries: Array<{ t: number; yaw: number }>): number {
  let reversals = 0;
  let prevDir = 0;
  for (let i = 1; i < headSeries.length; i++) {
    const d = headSeries[i].yaw - headSeries[i - 1].yaw;
    const dir = d > 0.5 ? 1 : d < -0.5 ? -1 : 0;
    if (dir !== 0 && dir !== prevDir && prevDir !== 0) reversals++;
    if (dir !== 0) prevDir = dir;
  }
  return Math.floor(reversals / 2);
}

function estimatePhaseError(
  gazeSeries: GazePoint[],
  headSeries: Array<{ t: number; yaw: number }>,
): number {
  // Very lightweight cross-correlation: shift gaze by ±50 ms windows
  // and find the shift that maximises anti-correlation (eye opposing head).
  const SHIFTS = [-50, -40, -30, -20, -10, 0, 10, 20, 30, 40, 50];
  let bestShift = 0;
  let bestCorr = -Infinity;

  for (const shift of SHIFTS) {
    let corr = 0;
    let n = 0;
    for (let i = 0; i < headSeries.length; i++) {
      const t = headSeries[i].t + shift;
      const g = interpolateGaze(gazeSeries, t);
      if (!g) continue;
      // VOR: gaze should oppose head yaw, so gaze.x should anti-correlate with head.yaw
      const headNorm = headSeries[i].yaw / 80; // normalised
      const gazeNorm = (g.x - 0.5) * 2;        // centred on 0
      corr += headNorm * gazeNorm;
      n++;
    }
    if (n > 0) {
      const meanCorr = corr / n;
      if (meanCorr < bestCorr) {
        bestCorr = meanCorr;
        bestShift = shift;
      }
    }
  }
  // Convert ms lag to approximate degrees (at 1 Hz head motion, 1 ms ≈ 0.36°)
  return bestShift * 0.36;
}

function interpolateGaze(gazeSeries: GazePoint[], t: number): GazePoint | null {
  if (gazeSeries.length === 0) return null;
  if (t <= gazeSeries[0].t) return gazeSeries[0];
  if (t >= gazeSeries[gazeSeries.length - 1].t) return gazeSeries[gazeSeries.length - 1];
  for (let i = 1; i < gazeSeries.length; i++) {
    if (gazeSeries[i].t >= t) {
      const alpha = (t - gazeSeries[i - 1].t) / (gazeSeries[i].t - gazeSeries[i - 1].t);
      return {
        x: gazeSeries[i - 1].x + alpha * (gazeSeries[i].x - gazeSeries[i - 1].x),
        y: gazeSeries[i - 1].y + alpha * (gazeSeries[i].y - gazeSeries[i - 1].y),
        t,
        hasIris: gazeSeries[i].hasIris,
      };
    }
  }
  return null;
}

/* =========================================================== nystagmus heuristic */

/**
 * Nystagmus detector for the gaze signal.
 *
 * Nystagmus is a *sawtooth*: a slow drift phase in one direction followed by a
 * fast corrective flick back. That asymmetry is what separates it from the
 * roughly sinusoidal, symmetric oscillation a patient produces voluntarily
 * while tracking a target or performing a VOR drill — both of which land in the
 * same 1–3 Hz band and would otherwise trip a pure amplitude + rate test,
 * telling a patient doing their exercises correctly to go see a clinician.
 *
 * The flag therefore requires all four of:
 *   1. Oscillation amplitude above the noise floor.
 *   2. Frequency inside the physiological 1–6 Hz nystagmus band.
 *   3. Slow-phase / fast-phase velocity asymmetry (the sawtooth signature).
 *   4. A head that is not actively rotating — gaze oscillation during a head
 *      turn is the VOR working, not nystagmus.
 *
 * NOT a clinical diagnostic — a positive flag should prompt clinician review.
 *
 * @param gazeHistory Gaze samples for the window under test.
 * @param headSeries  Optional head yaw over the same window. When supplied, an
 *                    actively rotating head suppresses the flag.
 */
export function detectNystagmusHeuristic(
  gazeHistory: GazePoint[],
  headSeries?: Array<{ t: number; yaw: number }>,
): NystagmusFlag {
  const NONE: NystagmusFlag = { detected: false, frequencyHz: 0, direction: 'none', amplitude: 0 };

  if (gazeHistory.length < 20) return NONE;

  // A rotating head drives compensatory eye movement by design; scoring that as
  // nystagmus would fire on every VOR repetition.
  if (headSeries && headSeries.length >= 2) {
    const headV: number[] = [];
    for (let i = 1; i < headSeries.length; i++) {
      const gapMs = headSeries[i].t - headSeries[i - 1].t;
      if (gapMs <= 0 || gapMs > MAX_SAMPLE_GAP_MS) continue;
      headV.push(Math.abs(headSeries[i].yaw - headSeries[i - 1].yaw) / (gapMs / 1000));
    }
    if (headV.length > 0) {
      const meanHeadV = headV.reduce((s, v) => s + v, 0) / headV.length;
      if (meanHeadV > NYSTAGMUS_MAX_HEAD_VELOCITY) return NONE;
    }
  }

  // De-mean the x and y signals
  const xs = gazeHistory.map(p => p.x);
  const ys = gazeHistory.map(p => p.y);
  const meanX = xs.reduce((s, v) => s + v, 0) / xs.length;
  const meanY = ys.reduce((s, v) => s + v, 0) / ys.length;
  const dx = xs.map(v => v - meanX);
  const dy = ys.map(v => v - meanY);

  const ampX = rms(dx);
  const ampY = rms(dy);
  const amplitude = Math.max(ampX, ampY);

  if (amplitude < NYSTAGMUS_MIN_AMPLITUDE) return NONE;

  // Count zero crossings in the dominant axis to estimate frequency
  const dominant = ampX >= ampY ? dx : dy;
  const direction: NystagmusFlag['direction'] = ampX >= ampY ? 'horizontal' : 'vertical';

  const zeroCrossings = countZeroCrossings(dominant);
  const durationSec = (gazeHistory[gazeHistory.length - 1].t - gazeHistory[0].t) / 1000;
  const frequencyHz = durationSec > 0 ? zeroCrossings / (2 * durationSec) : 0;

  if (frequencyHz < NYSTAGMUS_MIN_HZ || frequencyHz > NYSTAGMUS_MAX_HZ) return NONE;

  // Sawtooth test: real nystagmus flicks back far faster than it drifts out.
  if (slowFastAsymmetry(dominant, gazeHistory) < NYSTAGMUS_MIN_ASYMMETRY) return NONE;

  return {
    detected: true,
    frequencyHz: parseFloat(frequencyHz.toFixed(2)),
    direction,
    amplitude: parseFloat(amplitude.toFixed(4)),
  };
}

/**
 * Ratio of mean velocity in the faster direction to the slower one along a
 * de-meaned axis. A symmetric sine returns ≈1; a sawtooth returns well above 1.
 */
function slowFastAsymmetry(signal: number[], samples: GazePoint[]): number {
  let posSum = 0, posN = 0;
  let negSum = 0, negN = 0;

  for (let i = 1; i < signal.length; i++) {
    const gapMs = samples[i].t - samples[i - 1].t;
    if (gapMs <= 0 || gapMs > MAX_SAMPLE_GAP_MS) continue;
    const v = (signal[i] - signal[i - 1]) / (gapMs / 1000);
    if (v > 0) { posSum += v; posN++; }
    else if (v < 0) { negSum -= v; negN++; }
  }

  if (posN === 0 || negN === 0) return 0;
  const posMean = posSum / posN;
  const negMean = negSum / negN;
  if (posMean === 0 || negMean === 0) return 0;

  return Math.max(posMean / negMean, negMean / posMean);
}

function rms(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.sqrt(values.reduce((s, v) => s + v * v, 0) / values.length);
}

function countZeroCrossings(values: number[]): number {
  let count = 0;
  for (let i = 1; i < values.length; i++) {
    if (values[i - 1] * values[i] < 0) count++;
  }
  return count;
}

/* =========================================================== anti-saccade */

/**
 * Anti-saccade error rate: during a head turn to the RIGHT, the gaze should
 * move LEFT to maintain fixation (VOR). An anti-saccade error occurs when
 * the gaze initially moves in the same direction as the head (reflexive
 * prosaccade), which is a marker of vestibular insufficiency.
 *
 * @param saccades     Detected saccades.
 * @param headSeries   Head yaw time-series.
 * @returns Error rate [0, 1].
 */
export function computeAntiSaccadeErrorRate(
  saccades: Saccade[],
  headSeries: Array<{ t: number; yaw: number }>,
): number {
  if (saccades.length === 0) return 0;

  let errors = 0;
  let evaluated = 0;

  for (const saccade of saccades) {
    // Find head yaw at saccade start
    const headAtStart = interpolateHead(headSeries, saccade.startT);
    const headAtEnd = interpolateHead(headSeries, saccade.endT);
    if (headAtStart === null || headAtEnd === null) continue;

    const headDir = headAtEnd - headAtStart;
    if (Math.abs(headDir) < 1) continue; // not enough head motion to evaluate

    // VOR: gaze should move OPPOSITE to head
    // saccade.direction.x: positive = rightward gaze movement
    // headDir: positive = rightward head turn
    // Error: gaze moves in SAME direction as head
    const gazeDir = saccade.direction.x;
    const sameDirection = headDir * gazeDir > 0;

    if (sameDirection) errors++;
    evaluated++;
  }

  return evaluated > 0 ? errors / evaluated : 0;
}

function interpolateHead(
  headSeries: Array<{ t: number; yaw: number }>,
  t: number,
): number | null {
  if (headSeries.length === 0) return null;
  if (t <= headSeries[0].t) return headSeries[0].yaw;
  if (t >= headSeries[headSeries.length - 1].t) return headSeries[headSeries.length - 1].yaw;
  for (let i = 1; i < headSeries.length; i++) {
    if (headSeries[i].t >= t) {
      const alpha = (t - headSeries[i - 1].t) / (headSeries[i].t - headSeries[i - 1].t);
      return headSeries[i - 1].yaw + alpha * (headSeries[i].yaw - headSeries[i - 1].yaw);
    }
  }
  return null;
}

/* =========================================================== AI insight generator */

/**
 * Generate a natural-language clinical insight from session analytics.
 * Designed to be shown in the "AI Insight" card without alarming the patient.
 */
export function generateInsight(analytics: GazeAnalytics, locale: 'en' | 'hi' = 'en'): string {
  const { vorScore, nystagmus, antiSaccadeErrorRate, meanFixationDuration, fixations, saccades } = analytics;

  if (locale === 'hi') {
    if (!vorScore || vorScore.gain === 0) {
      return 'इस सत्र में पर्याप्त डेटा नहीं मिला। बेहतर परिणाम के लिए कैमरे के सामने स्थिर बैठें।';
    }
    const gainText = vorScore.gain >= 0.9 ? 'उत्कृष्ट' : vorScore.gain >= 0.7 ? 'अच्छा' : vorScore.gain >= 0.5 ? 'ठीक-ठाक' : 'कमज़ोर';
    const nystText = nystagmus.detected ? ` आँखों में अनियमित कंपन (${nystagmus.frequencyHz} Hz) देखा गया — डॉक्टर को दिखाएं।` : '';
    const fixText = meanFixationDuration > 150 ? ' फोकस स्थिरता अच्छी है।' : ' फोकस की अवधि बढ़ाने का प्रयास करें।';
    return `VOR लाभ ${gainText} (${vorScore.gain.toFixed(2)}) — आपकी वेस्टिबुलर प्रणाली अच्छी प्रतिक्रिया दे रही है।${fixText}${nystText}`;
  }

  if (!vorScore || vorScore.gain === 0) {
    return 'Not enough data collected this session. Sit still facing the camera for best results.';
  }

  const gainLabel = vorScore.label;
  const gainVal = vorScore.gain.toFixed(2);
  const fixCount = fixations.length;
  const saccCount = saccades.length;

  let text = `VOR gain ${gainVal} (${gainLabel}). `;

  if (vorScore.gain >= 0.9) {
    text += `Your vestibular system is compensating eye movements very effectively. `;
  } else if (vorScore.gain >= 0.7) {
    text += `Good vestibular compensation — continue daily exercises to strengthen it further. `;
  } else if (vorScore.gain >= 0.5) {
    text += `Moderate VOR — your inner ear reflex is working but may benefit from more frequent sessions. `;
  } else {
    text += `Low VOR gain — consider discussing this with your clinician at your next visit. `;
  }

  if (meanFixationDuration > 200) {
    text += `Excellent gaze stability (${Math.round(meanFixationDuration)} ms mean fixation). `;
  } else if (meanFixationDuration > 100) {
    text += `Good gaze control with ${fixCount} fixations detected. `;
  } else {
    text += `Try to hold your gaze on the target card more steadily. `;
  }

  if (antiSaccadeErrorRate > 0.4) {
    text += `Some reflexive eye movements detected — focus on keeping your eyes on the target during head turns. `;
  }

  if (nystagmus.detected) {
    text += `⚠️ Involuntary eye oscillation detected (${nystagmus.frequencyHz} Hz, ${nystagmus.direction}). Please mention this to your clinician.`;
  } else if (saccCount > 0) {
    text += `${saccCount} saccades recorded at mean ${Math.round(analytics.meanSaccadeVelocity)}°/s.`;
  }

  return text.trim();
}

/* =========================================================== full analytics pipeline */

/**
 * Run the complete analytics pipeline on a completed session's data.
 */
export function analyseSession(
  gazeHistory: GazePoint[],
  headSeries: Array<{ t: number; yaw: number }>,
  locale: 'en' | 'hi' = 'en',
): GazeAnalytics {
  const fixations = detectFixations(gazeHistory);
  const saccades = detectSaccades(gazeHistory);
  const vorScore = headSeries.length > 4 ? scoreVOR(gazeHistory, headSeries) : null;
  const nystagmus = detectNystagmusHeuristic(gazeHistory, headSeries);

  const meanFixationDuration = fixations.length > 0
    ? fixations.reduce((s, f) => s + f.duration, 0) / fixations.length
    : 0;

  const meanSaccadeVelocity = saccades.length > 0
    ? saccades.reduce((s, sa) => s + sa.peakVelocityDeg, 0) / saccades.length
    : 0;

  const antiSaccadeErrorRate = computeAntiSaccadeErrorRate(saccades, headSeries);

  const totalDuration = gazeHistory.length > 1
    ? gazeHistory[gazeHistory.length - 1].t - gazeHistory[0].t
    : 0;
  const totalFixationTime = fixations.reduce((s, f) => s + f.duration, 0);
  const fixationFraction = totalDuration > 0 ? totalFixationTime / totalDuration : 0;

  const partial: GazeAnalytics = {
    fixations,
    saccades,
    vorScore,
    nystagmus,
    meanFixationDuration,
    meanSaccadeVelocity,
    antiSaccadeErrorRate,
    fixationFraction,
    clinicalGuidance: '',
    centralPeripheralLoc: 'inconclusive',
    insight: '',
  };

  partial.insight = generateInsight(partial, locale);
  return partial;
}

/* =========================================================== localStorage persistence */

const GAZE_SESSIONS_KEY = 'dhanwantari-gaze-sessions';

export function loadGazeSessions(): GazeSession[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(GAZE_SESSIONS_KEY) ?? '[]') as GazeSession[];
  } catch {
    return [];
  }
}

export function saveGazeSession(session: GazeSession): GazeSession[] {
  const sessions = loadGazeSessions();
  sessions.push(session);
  // Keep last 90 sessions to avoid localStorage bloat
  const trimmed = sessions.slice(-90);
  try {
    localStorage.setItem(GAZE_SESSIONS_KEY, JSON.stringify(trimmed));
  } catch {
    // Quota exceeded — remove oldest half
    const half = trimmed.slice(Math.floor(trimmed.length / 2));
    localStorage.setItem(GAZE_SESSIONS_KEY, JSON.stringify(half));
  }
  return trimmed;
}

export function summariseGazeAdherence(sessions: GazeSession[]): {
  totalSessions: number;
  meanVORGain: number;
  meanFixationMs: number;
  trend: 'improving' | 'stable' | 'declining' | 'insufficient';
} {
  if (sessions.length === 0) {
    return { totalSessions: 0, meanVORGain: 0, meanFixationMs: 0, trend: 'insufficient' };
  }

  const gains = sessions
    .map(s => s.analytics.vorScore?.gain ?? 0)
    .filter(g => g > 0);

  const meanVORGain = gains.length > 0 ? gains.reduce((s, v) => s + v, 0) / gains.length : 0;
  const meanFixationMs = sessions.reduce((s, sess) => s + sess.analytics.meanFixationDuration, 0) / sessions.length;

  let trend: 'improving' | 'stable' | 'declining' | 'insufficient' = 'insufficient';
  if (gains.length >= 5) {
    const recentMean = gains.slice(-3).reduce((s, v) => s + v, 0) / 3;
    const earlyMean = gains.slice(0, 3).reduce((s, v) => s + v, 0) / 3;
    if (recentMean > earlyMean + 0.05) trend = 'improving';
    else if (recentMean < earlyMean - 0.05) trend = 'declining';
    else trend = 'stable';
  }

  return { totalSessions: sessions.length, meanVORGain, meanFixationMs, trend };
}

/* =========================================================== Red-Dot Smooth Pursuit & Target Tracking */

export interface PursuitTargetPoint {
  x: number; // normalised 0-1
  y: number; // normalised 0-1
  t: number; // ms
  mode: 'horizontal' | 'vertical' | 'circular' | 'vor-x2' | 'saccadic' | 'optokinetic';
}

export interface PursuitScore {
  /** Pursuit Gain = mean(eye velocity) / mean(target velocity). Ideal = 1.0 */
  pursuitGain: number;
  /** Mean spatial tracking error in normalized percentage (0-100%) */
  meanTrackingErrorPct: number;
  /** Number of catch-up prosaccades executed to re-align with target */
  catchUpSaccadeCount: number;
  /** Subjective score label */
  quality: 'excellent' | 'good' | 'fair' | 'impaired';
  /** Clinical recommendation based on 2-Point Rule */
  guidance: string;
}

function interpolateTargetXY(
  targetSeries: PursuitTargetPoint[],
  t: number,
): { x: number; y: number } | null {
  if (targetSeries.length === 0) return null;
  if (t <= targetSeries[0].t) return targetSeries[0];
  if (t >= targetSeries[targetSeries.length - 1].t) return targetSeries[targetSeries.length - 1];
  for (let i = 1; i < targetSeries.length; i++) {
    if (targetSeries[i].t >= t) {
      const alpha = (t - targetSeries[i - 1].t) / (targetSeries[i].t - targetSeries[i - 1].t);
      return {
        x: targetSeries[i - 1].x + alpha * (targetSeries[i].x - targetSeries[i - 1].x),
        y: targetSeries[i - 1].y + alpha * (targetSeries[i].y - targetSeries[i - 1].y),
      };
    }
  }
  return null;
}

/**
 * Score a Smooth Pursuit / Moving Red-Dot Test session.
 * Compares actual gaze series against moving dot target series.
 */
export function scoreSmoothPursuit(
  targetSeries: PursuitTargetPoint[],
  gazeSeries: GazePoint[],
  saccades: Saccade[],
  locale: 'en' | 'hi' = 'en'
): PursuitScore {
  if (targetSeries.length < 5 || gazeSeries.length < 5) {
    return {
      pursuitGain: 0,
      meanTrackingErrorPct: 0,
      catchUpSaccadeCount: 0,
      quality: 'fair',
      guidance: locale === 'hi' ? 'पर्याप्त डेटा एकत्र नहीं हुआ।' : 'Insufficient data collected for pursuit score.',
    };
  }

  let totalError = 0;
  let sampleCount = 0;

  const targetVelocities: number[] = [];
  const gazeVelocities: number[] = [];

  for (let i = 1; i < targetSeries.length; i++) {
    const tgt = targetSeries[i];
    const prevTgt = targetSeries[i - 1];
    const dt = (tgt.t - prevTgt.t) / 1000;
    if (dt <= 0) continue;

    const gaze = interpolateGaze(gazeSeries, tgt.t);
    if (!gaze) continue;

    // Distance error
    const dx = gaze.x - tgt.x;
    const dy = gaze.y - tgt.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    totalError += dist;
    sampleCount++;

    // Target velocity
    const tdx = tgt.x - prevTgt.x;
    const tdy = tgt.y - prevTgt.y;
    const tgtVel = Math.sqrt(tdx * tdx + tdy * tdy) / dt;
    targetVelocities.push(tgtVel);

    // Gaze velocity
    const prevGaze = interpolateGaze(gazeSeries, prevTgt.t);
    if (prevGaze) {
      const gdx = gaze.x - prevGaze.x;
      const gdy = gaze.y - prevGaze.y;
      const gazeVel = Math.sqrt(gdx * gdx + gdy * gdy) / dt;
      gazeVelocities.push(gazeVel);
    }
  }

  // Compute standard deviation of target and gaze displacements
  const targetXs = targetSeries.map(t => t.x);
  const gazeXs = gazeSeries.map(g => g.x);
  const targetYs = targetSeries.map(t => t.y);
  const gazeYs = gazeSeries.map(g => g.y);

  const meanTgtX = targetXs.reduce((s, v) => s + v, 0) / targetXs.length;
  const meanGazeX = gazeXs.reduce((s, v) => s + v, 0) / gazeXs.length;
  const meanTgtY = targetYs.reduce((s, v) => s + v, 0) / targetYs.length;
  const meanGazeY = gazeYs.reduce((s, v) => s + v, 0) / gazeYs.length;

  const stdTgtX = Math.sqrt(targetXs.reduce((s, v) => s + (v - meanTgtX) ** 2, 0) / targetXs.length);
  const stdGazeX = Math.sqrt(gazeXs.reduce((s, v) => s + (v - meanGazeX) ** 2, 0) / gazeXs.length);
  const stdTgtY = Math.sqrt(targetYs.reduce((s, v) => s + (v - meanTgtY) ** 2, 0) / targetYs.length);
  const stdGazeY = Math.sqrt(gazeYs.reduce((s, v) => s + (v - meanGazeY) ** 2, 0) / gazeYs.length);

  const stdTgt = Math.sqrt(stdTgtX * stdTgtX + stdTgtY * stdTgtY);
  const stdGaze = Math.sqrt(stdGazeX * stdGazeX + stdGazeY * stdGazeY);

  // Pursuit Gain = Ratio of Gaze Amplitude to Target Amplitude
  const rawGain = stdTgt > 0.01 ? stdGaze / stdTgt : 0;
  const pursuitGain = Math.min(Math.max(parseFloat(rawGain.toFixed(2)), 0), 1.5);

  const meanError = sampleCount > 0 ? (totalError / sampleCount) * 100 : 0;

  // Catch-up saccades: saccades whose gaze lagged the target by a meaningful
  // margin at onset, and whose direction moves gaze back toward the target
  // (not merely any eye movement that happens to occur during the test).
  const CATCH_UP_MIN_ERROR = 0.04; // ~4% of screen — below this, treat as noise
  const CATCH_UP_MIN_ALIGNMENT = 0.3; // cosine similarity threshold
  let catchUpSaccadeCount = 0;
  for (const s of saccades) {
    const target = interpolateTargetXY(targetSeries, s.startT);
    if (!target) continue;
    const ex = target.x - s.from.x;
    const ey = target.y - s.from.y;
    const errMag = Math.sqrt(ex * ex + ey * ey);
    if (errMag < CATCH_UP_MIN_ERROR) continue;
    const alignment = (s.direction.x * ex + s.direction.y * ey) / errMag;
    if (alignment > CATCH_UP_MIN_ALIGNMENT) catchUpSaccadeCount++;
  }

  const quality: PursuitScore['quality'] =
    pursuitGain >= 0.85 && meanError < 15 ? 'excellent' :
    pursuitGain >= 0.70 && meanError < 25 ? 'good' :
    pursuitGain >= 0.50 ? 'fair' : 'impaired';

  let guidance = '';
  if (locale === 'hi') {
    if (quality === 'excellent') guidance = 'स्मूथ परस्यूट उत्कृष्ट है — आपकी नज़र चलती हुई बिंदु का सटीक पीछा कर रही है।';
    else if (quality === 'good') guidance = 'अच्छा ट्रैकिंग प्रदर्शन — नज़र में हल्का विचलन है, अभ्यास जारी रखें।';
    else if (quality === 'fair') guidance = 'मध्यम ट्रैकिंग — बिंदु से नज़र हटने पर कैच-अप सैकेड देखे गए।';
    else guidance = 'स्मूथ परस्यूट प्रभावित है — 2-पॉइंट नियम का पालन करें और अत्यधिक थकान से बचें।';
  } else {
    if (quality === 'excellent') guidance = 'Excellent smooth pursuit — gaze accurately locked onto the moving target.';
    else if (quality === 'good') guidance = 'Good tracking performance with minor gaze lag — continue daily practice.';
    else if (quality === 'fair') guidance = 'Moderate pursuit control — catch-up saccades observed as gaze fell behind target.';
    else guidance = 'Impaired smooth pursuit — monitor symptom escalation strictly (+2 Point Rule).';
  }

  return {
    pursuitGain,
    meanTrackingErrorPct: parseFloat(meanError.toFixed(1)),
    catchUpSaccadeCount,
    quality,
    guidance,
  };
}

/* =========================================================== One Euro Filter */

/**
 * One Euro Filter for adaptive low-pass signal smoothing.
 * Reference: Casiez et al., "1€ Filter: A Simple Speed-Based Low-Pass Filter for Noisy Input in Interactive Systems", CHI 2012.
 */
export class OneEuroFilter {
  private minCutoff: number;
  private beta: number;
  private dCutoff: number;
  private xPrev: number | null = null;
  private dxPrev: number = 0;
  private tPrev: number | null = null;

  constructor(minCutoff = 1.0, beta = 0.5, dCutoff = 1.0) {
    this.minCutoff = minCutoff;
    this.beta = beta;
    this.dCutoff = dCutoff;
  }

  reset() {
    this.xPrev = null;
    this.dxPrev = 0;
    this.tPrev = null;
  }

  filter(x: number, t: number): number {
    if (this.tPrev === null || this.xPrev === null) {
      this.xPrev = x;
      this.tPrev = t;
      return x;
    }

    const dt = (t - this.tPrev) / 1000;
    if (dt <= 0) return this.xPrev;

    this.tPrev = t;

    // Estimate derivative (velocity)
    const dx = (x - this.xPrev) / dt;
    const edx = this.lowPassFilter(dx, this.dxPrev, this.alpha(dt, this.dCutoff));
    this.dxPrev = edx;

    // Cutoff frequency adapts with speed
    const cutoff = this.minCutoff + this.beta * Math.abs(edx);
    const smoothed = this.lowPassFilter(x, this.xPrev, this.alpha(dt, cutoff));
    this.xPrev = smoothed;

    return smoothed;
  }

  private alpha(dt: number, cutoff: number): number {
    const tau = 1.0 / (2 * Math.PI * cutoff);
    return 1.0 / (1.0 + tau / dt);
  }

  private lowPassFilter(x: number, xPrev: number, alpha: number): number {
    return alpha * x + (1.0 - alpha) * xPrev;
  }
}

/* =========================================================== 5-Point Calibration Math */

/**
 * Fit a bilinear regression model from 5 calibration samples:
 * screenX = a0 + a1*rawX + a2*rawY
 * screenY = b0 + b1*rawX + b2*rawY
 */
export function solve5PointCalibration(samples: CalibrationPointSample[]): CalibrationCoefficients {
  if (samples.length < 5) {
    return { a0: 0.5, a1: -10, a2: 0, b0: 0.5, b1: 0, b2: 10, isCalibrated: false };
  }

  let sumX = 0, sumY = 0, sumXX = 0, sumYY = 0, sumXY = 0;
  let sumTgtX = 0, sumTgtY = 0;
  let sumX_TgtX = 0, sumY_TgtX = 0;
  let sumX_TgtY = 0, sumY_TgtY = 0;
  const n = samples.length;

  for (const s of samples) {
    const rx = s.rawOffset.x;
    const ry = s.rawOffset.y;
    const tx = s.target.x;
    const ty = s.target.y;

    sumX += rx; sumY += ry;
    sumXX += rx * rx; sumYY += ry * ry; sumXY += rx * ry;
    sumTgtX += tx; sumTgtY += ty;
    sumX_TgtX += rx * tx; sumY_TgtX += ry * tx;
    sumX_TgtY += rx * ty; sumY_TgtY += ry * ty;
  }

  const det = n * (sumXX * sumYY - sumXY * sumXY) - sumX * (sumX * sumYY - sumY * sumXY) + sumY * (sumX * sumXY - sumY * sumXX);

  if (Math.abs(det) < 1e-8) {
    return { a0: 0.5, a1: -10, a2: 0, b0: 0.5, b1: 0, b2: 10, isCalibrated: false };
  }

  const solve3x3 = (rhs0: number, rhs1: number, rhs2: number) => {
    const detA0 = rhs0 * (sumXX * sumYY - sumXY * sumXY) - sumX * (rhs1 * sumYY - rhs2 * sumXY) + sumY * (rhs1 * sumXY - rhs2 * sumXX);
    const detA1 = n * (rhs1 * sumYY - rhs2 * sumXY) - rhs0 * (sumX * sumYY - sumY * sumXY) + sumY * (sumX * rhs2 - sumY * rhs1);
    const detA2 = n * (sumXX * rhs2 - sumXY * rhs1) - sumX * (sumX * rhs2 - sumY * rhs1) + rhs0 * (sumX * sumXY - sumY * sumXX);
    return [detA0 / det, detA1 / det, detA2 / det];
  };

  const [a0, a1, a2] = solve3x3(sumTgtX, sumX_TgtX, sumY_TgtX);
  const [b0, b1, b2] = solve3x3(sumTgtY, sumX_TgtY, sumY_TgtY);

  return { a0, a1, a2, b0, b1, b2, isCalibrated: true };
}

/* =========================================================== GazeStabilizer */

/**
 * Complete Gaze Stabilization Pipeline:
 * Blink Rejection -> Outlier Spike Suppressor -> 5-Point Calibration -> One Euro Filtering
 */
export class GazeStabilizer {
  private xFilter = new OneEuroFilter(1.0, 0.5, 1.0);
  private yFilter = new OneEuroFilter(1.0, 0.5, 1.0);
  private lastValidGaze: GazePoint | null = null;
  private calibration: CalibrationCoefficients | null = null;

  setCalibration(cal: CalibrationCoefficients | null) {
    this.calibration = cal;
  }

  reset() {
    this.xFilter.reset();
    this.yFilter.reset();
    this.lastValidGaze = null;
  }

  process(rawGaze: GazePoint): GazePoint {
    const t = rawGaze.t;

    // 1. Blink handling
    if (rawGaze.isBlink) {
      if (this.lastValidGaze) {
        return {
          ...this.lastValidGaze,
          t,
          isBlink: true,
          confidence: 0.05,
        };
      }
      return { ...rawGaze, isBlink: true, confidence: 0.05 };
    }

    let inputX = rawGaze.x;
    let inputY = rawGaze.y;

    // 2. Apply 5-point calibration if available
    if (this.calibration && this.calibration.isCalibrated && rawGaze.rawOffsetX !== undefined && rawGaze.rawOffsetY !== undefined) {
      const rx = rawGaze.rawOffsetX;
      const ry = rawGaze.rawOffsetY;
      const { a0, a1, a2, b0, b1, b2 } = this.calibration;
      inputX = Math.min(Math.max(a0 + a1 * rx + a2 * ry, 0.02), 0.98);
      inputY = Math.min(Math.max(b0 + b1 * rx + b2 * ry, 0.02), 0.98);
    }

    // 3. Outlier spike rejection
    if (this.lastValidGaze && !this.lastValidGaze.isBlink) {
      const dt = (t - this.lastValidGaze.t) / 1000;
      const dist = Math.hypot(inputX - this.lastValidGaze.x, inputY - this.lastValidGaze.y);
      if (dt < 0.035 && dist > 0.4) {
        return {
          ...this.lastValidGaze,
          t,
          confidence: 0.2,
        };
      }
    }

    // 4. One Euro Temporal Smoothing
    const smoothedX = this.xFilter.filter(inputX, t);
    const smoothedY = this.yFilter.filter(inputY, t);

    const stabilized: GazePoint = {
      ...rawGaze,
      x: Math.min(Math.max(smoothedX, 0.02), 0.98),
      y: Math.min(Math.max(smoothedY, 0.02), 0.98),
    };

    this.lastValidGaze = stabilized;
    return stabilized;
  }
}

