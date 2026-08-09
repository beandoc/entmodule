/**
 * Vestibular Rehabilitation — head-pose maths, repetition state machine, canal
 * repositioning protocols, the DHI-25, and local session persistence.
 *
 * Kept free of React and of `@/` path aliases so it can be imported directly by
 * scripts/test-vestibular.mjs.
 */

/* ------------------------------------------------------------------- types */

export type HeadAxis = 'yaw' | 'pitch' | 'roll';

export interface HeadPose {
  /** Rotation about the vertical axis — turning to look left/right. Degrees. */
  yaw: number;
  /** Rotation about the inter-aural axis — nodding up/down. Degrees. */
  pitch: number;
  /** Rotation about the naso-occipital axis — ear towards shoulder. Degrees. */
  roll: number;
}

export const ZERO_POSE: HeadPose = { yaw: 0, pitch: 0, roll: 0 };

/**
 * Physiological cervical range of motion, used to clamp estimates so a bad
 * frame cannot report an anatomically impossible angle.
 * Ref: AAOS cervical spine ROM norms.
 */
export const CERVICAL_ROM_LIMIT: Record<HeadAxis, number> = {
  yaw: 80,
  pitch: 60,
  roll: 45,
};

/* --------------------------------------------- head pose from a 4x4 matrix */

/**
 * Decompose MediaPipe's facial transformation matrix into head Euler angles.
 *
 * The matrix arrives column-major (OpenGL convention) and maps the canonical
 * face model into camera space. We extract in YXZ order, which is the order
 * that matches how a neck actually moves: yaw about the vertical axis first,
 * then pitch, then roll.
 *
 * For R = Ry(yaw) · Rx(pitch) · Rz(roll):
 *   r12 = -sin(pitch)
 *   yaw  = atan2(r02, r22)
 *   roll = atan2(r10, r11)
 */
export function eulerFromMatrix(matrix: ArrayLike<number>, columnMajor = true): HeadPose {
  if (!matrix || matrix.length < 16) return { ...ZERO_POSE };

  // r(row, col)
  const r = (row: number, col: number) =>
    columnMajor ? matrix[col * 4 + row] : matrix[row * 4 + col];

  const deg = 180 / Math.PI;
  const r12 = clamp(r(1, 2), -1, 1);

  const pitch = Math.asin(-r12) * deg;
  const yaw = Math.atan2(r(0, 2), r(2, 2)) * deg;
  const roll = Math.atan2(r(1, 0), r(1, 1)) * deg;

  return {
    yaw: roundTo(yaw, 1),
    pitch: roundTo(pitch, 1),
    roll: roundTo(roll, 1),
  };
}

/** Build a column-major YXZ rotation matrix — the inverse of eulerFromMatrix. */
export function matrixFromEuler(pose: HeadPose): number[] {
  const rad = Math.PI / 180;
  const cy = Math.cos(pose.yaw * rad);
  const sy = Math.sin(pose.yaw * rad);
  const cp = Math.cos(pose.pitch * rad);
  const sp = Math.sin(pose.pitch * rad);
  const cr = Math.cos(pose.roll * rad);
  const sr = Math.sin(pose.roll * rad);

  // R = Ry · Rx · Rz, written row-major then transposed into column-major.
  const rows = [
    [cy * cr + sy * sp * sr, sy * sp * cr - cy * sr, sy * cp],
    [cp * sr, cp * cr, -sp],
    [cy * sp * sr - sy * cr, sy * sr + cy * sp * cr, cy * cp],
  ];

  const out = new Array(16).fill(0);
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) out[col * 4 + row] = rows[row][col];
  }
  out[15] = 1;
  return out;
}

/* ----------------------------------------- head pose from 2D landmarks only */

export interface Point2D {
  x: number;
  y: number;
}

export interface FaceAnchors {
  nose: Point2D;
  leftEye: Point2D;
  rightEye: Point2D;
  /** Left face contour at ear level — FaceMesh index 234. */
  leftContour: Point2D;
  /** Right face contour at ear level — FaceMesh index 454. */
  rightContour: Point2D;
  chin: Point2D;
  forehead: Point2D;
}

/**
 * Empirical weak-perspective gain converting normalised nose displacement into
 * degrees of pitch. Derived by fitting the landmark ratio against matrix-derived
 * pitch across the ±40° range; only used when the transformation matrix is
 * unavailable.
 */
export const PITCH_GAIN = 115;

/**
 * Fallback head pose from 2D anchors, for the legacy FaceMesh solution which
 * does not emit a transformation matrix.
 *
 * Yaw uses the cylindrical-head approximation: the nose tip's horizontal
 * position between the two face contours varies as sin(yaw), so asin() of the
 * normalised offset recovers the angle far better than a linear scale.
 */
export function poseFromAnchors(a: FaceAnchors): HeadPose {
  const halfWidth = Math.abs(a.rightContour.x - a.leftContour.x) / 2;
  if (halfWidth < 1) return { ...ZERO_POSE };

  const midX = (a.leftContour.x + a.rightContour.x) / 2;
  const yawRatio = clamp((a.nose.x - midX) / halfWidth, -1, 1);
  const yaw = Math.asin(yawRatio) * (180 / Math.PI);

  const eyeMidY = (a.leftEye.y + a.rightEye.y) / 2;
  const faceHeight = Math.abs(a.chin.y - a.forehead.y);
  const pitch =
    faceHeight < 1 ? 0 : ((a.nose.y - eyeMidY) / faceHeight - NEUTRAL_NOSE_RATIO) * PITCH_GAIN;

  const roll =
    Math.atan2(a.rightEye.y - a.leftEye.y, Math.abs(a.rightEye.x - a.leftEye.x)) *
    (180 / Math.PI);

  return clampPose({ yaw, pitch, roll });
}

/**
 * Where the nose tip sits between the eye line and the chin on a face held
 * level. Individual anatomy shifts this, which is exactly why the UI offers a
 * neutral-pose calibration rather than trusting the constant.
 */
export const NEUTRAL_NOSE_RATIO = 0.42;

export function clampPose(pose: HeadPose): HeadPose {
  return {
    yaw: roundTo(clamp(pose.yaw, -CERVICAL_ROM_LIMIT.yaw, CERVICAL_ROM_LIMIT.yaw), 1),
    pitch: roundTo(clamp(pose.pitch, -CERVICAL_ROM_LIMIT.pitch, CERVICAL_ROM_LIMIT.pitch), 1),
    roll: roundTo(clamp(pose.roll, -CERVICAL_ROM_LIMIT.roll, CERVICAL_ROM_LIMIT.roll), 1),
  };
}

/** Subtract the calibrated neutral pose so resting head tilt reads as zero. */
export function relativePose(pose: HeadPose, neutral: HeadPose): HeadPose {
  return clampPose({
    yaw: pose.yaw - neutral.yaw,
    pitch: pose.pitch - neutral.pitch,
    roll: pose.roll - neutral.roll,
  });
}

/** Mirror a pose for a selfie-view preview, where left and right are swapped. */
export function mirrorPose(pose: HeadPose): HeadPose {
  return { yaw: -pose.yaw, pitch: pose.pitch, roll: -pose.roll };
}

/* ------------------------------------------------ one-euro head smoothing */

/**
 * One-Euro filter state for a single scalar signal — pure and threaded like
 * every other state machine in this module (see `RepCounterState`): the caller
 * owns the state and passes it back in each frame.
 * Reference: Casiez, Roussel & Vogel, "1€ Filter", CHI 2012.
 */
export interface OneEuroState {
  value: number | null;
  velocity: number;
  lastAt: number | null;
}

export function createOneEuroState(): OneEuroState {
  return { value: null, velocity: 0, lastAt: null };
}

/**
 * A tracking dropout longer than this resets the filter to the incoming
 * sample rather than computing a velocity across the gap — otherwise a long
 * pause (face lost, tab backgrounded) followed by a legitimate head turn would
 * read as a single very-slow drift and get heavily over-smoothed.
 */
const ONE_EURO_MAX_GAP_MS = 300;

export interface OneEuroStepResult {
  value: number;
  state: OneEuroState;
}

/**
 * Advance a One-Euro filter by one sample.
 *
 * The cutoff frequency rises with signal speed: a head held still is damped
 * heavily (killing landmark-noise tremor), while a fast VOR head thrust raises
 * the cutoff enough to pass through with negligible lag — the property gaze-
 * stabilisation training depends on. The velocity estimate that drives the
 * cutoff is itself low-pass filtered (via `dCutoff`), which is what separates
 * a real One-Euro filter from a plain speed-proportional blend: a single noisy
 * sample cannot spike the cutoff and let a jitter frame straight through.
 *
 * All input is in degrees and milliseconds; the filter is frame-rate
 * independent because every alpha is derived from the actual `dt`, not from an
 * assumed frame interval.
 */
export function oneEuroStep(
  state: OneEuroState,
  x: number,
  now: number,
  minCutoff = 1.0,
  beta = 0.3,
  dCutoff = 1.0
): OneEuroStepResult {
  if (state.value === null || state.lastAt === null || now - state.lastAt > ONE_EURO_MAX_GAP_MS) {
    return { value: x, state: { value: x, velocity: 0, lastAt: now } };
  }

  const dt = (now - state.lastAt) / 1000;
  if (dt <= 0) return { value: state.value, state };

  const rawVelocity = (x - state.value) / dt;
  const velocity = euroLowPass(rawVelocity, state.velocity, euroAlpha(dt, dCutoff));

  const cutoff = minCutoff + beta * Math.abs(velocity);
  const value = euroLowPass(x, state.value, euroAlpha(dt, cutoff));

  return { value, state: { value, velocity, lastAt: now } };
}

function euroAlpha(dt: number, cutoff: number): number {
  const tau = 1 / (2 * Math.PI * cutoff);
  return 1 / (1 + tau / dt);
}

function euroLowPass(x: number, xPrev: number, alpha: number): number {
  return alpha * x + (1 - alpha) * xPrev;
}

export interface PoseSmoothingState {
  yaw: OneEuroState;
  pitch: OneEuroState;
  roll: OneEuroState;
}

export function createPoseSmoothingState(): PoseSmoothingState {
  return { yaw: createOneEuroState(), pitch: createOneEuroState(), roll: createOneEuroState() };
}

export interface PoseSmoothingResult {
  pose: HeadPose;
  state: PoseSmoothingState;
}

/**
 * One-Euro-smooth all three head axes. `beta` is tuned lower than the gaze
 * filter's (`GazeStabilizer` in gaze-tracking.ts uses 0.5 over [0,1]-normalised
 * units): head angles run in tens of degrees rather than a unit square, so the
 * same responsiveness needs a proportionally smaller velocity coefficient.
 */
export function smoothPose(
  state: PoseSmoothingState,
  next: HeadPose,
  now: number
): PoseSmoothingResult {
  const yaw = oneEuroStep(state.yaw, next.yaw, now, HEAD_MIN_CUTOFF, HEAD_BETA);
  const pitch = oneEuroStep(state.pitch, next.pitch, now, HEAD_MIN_CUTOFF, HEAD_BETA);
  const roll = oneEuroStep(state.roll, next.roll, now, HEAD_MIN_CUTOFF, HEAD_BETA);

  return {
    pose: {
      yaw: roundTo(yaw.value, 1),
      pitch: roundTo(pitch.value, 1),
      roll: roundTo(roll.value, 1),
    },
    state: { yaw: yaw.state, pitch: pitch.state, roll: roll.state },
  };
}

const HEAD_MIN_CUTOFF = 1.0;
const HEAD_BETA = 0.3;

/* ------------------------------------------------- repetition state machine */

export interface RepCounterConfig {
  /** Excursion the patient is asked to reach, in degrees. */
  targetAngle: number;
  /** Fraction of the target that counts as reaching the peak. */
  peakFraction: number;
  /** Fraction of the target the head must return inside to close the rep. */
  neutralFraction: number;
  /** Debounce, in ms — anything faster than this is tremor, not a repetition. */
  minRepMs: number;
  /** Require left/right (or up/down) alternation, as VOR x1 drills do. */
  requireAlternation: boolean;
}

export const DEFAULT_REP_CONFIG: RepCounterConfig = {
  targetAngle: 45,
  peakFraction: 0.7,
  neutralFraction: 0.3,
  minRepMs: 350,
  requireAlternation: false,
};

export type RepPhase = 'neutral' | 'excursion';

export interface RepCounterState {
  reps: number;
  phase: RepPhase;
  /** Direction of the excursion in progress: +1, -1, or 0 when neutral. */
  direction: 0 | 1 | -1;
  /** Direction of the last completed repetition. */
  lastDirection: 0 | 1 | -1;
  /** Largest |angle| seen during the excursion in progress. */
  peakMagnitude: number;
  /** -Infinity until the first rep, so the debounce never swallows it. */
  lastRepAt: number;
  /** Peak excursion of every completed rep, for range-of-motion scoring. */
  peaks: number[];
  /** Peak angular velocity of every completed rep, in deg/s. */
  velocities: number[];
  lastValue: number;
  lastAt: number;
  peakVelocity: number;
}

export function createRepState(): RepCounterState {
  return {
    reps: 0,
    phase: 'neutral',
    direction: 0,
    lastDirection: 0,
    peakMagnitude: 0,
    lastRepAt: Number.NEGATIVE_INFINITY,
    peaks: [],
    velocities: [],
    lastValue: 0,
    lastAt: 0,
    peakVelocity: 0,
  };
}

export type RepEvent = 'none' | 'peak-reached' | 'rep-counted' | 'rejected-too-fast' | 'rejected-same-side';

export interface RepStepResult {
  state: RepCounterState;
  event: RepEvent;
  /** Angular velocity of this sample, deg/s. */
  velocity: number;
}

/**
 * Advance the repetition state machine by one sample.
 *
 * A repetition is neutral → excursion past the peak threshold → back inside the
 * neutral band. Counting on the *return* rather than on the peak is what stops a
 * patient who simply holds their head turned from racking up reps, and the
 * separate peak and neutral thresholds give the hysteresis that a single
 * threshold lacks.
 *
 * Scope: this drives the camera-tracked drills in `EXERCISES` below (VOR x1/x2,
 * the habituation and cervicogenic exercises) — sessions where the patient sits
 * upright, facing the camera, moving through an angle small enough that their
 * face stays in frame throughout. It does NOT drive the Epley or Brandt-Daroff
 * canal-repositioning manoeuvres further down this file: those put the patient
 * supine with the head hanging off the bed, turned away from any camera for
 * most of the sequence, so there is no reliable pose signal to hysteresis-gate.
 * `EPLEY` and `BRANDT_DAROFF` are deliberately a fixed-duration step sequence
 * (see `ManoeuvreStep.seconds`) rather than motion-tracked reps.
 *
 * Pure: the caller owns the state.
 */
export function stepRepCounter(
  state: RepCounterState,
  config: RepCounterConfig,
  value: number,
  now: number
): RepStepResult {
  const peakThreshold = Math.abs(config.targetAngle) * config.peakFraction;
  const neutralThreshold = Math.abs(config.targetAngle) * config.neutralFraction;

  const dt = state.lastAt ? (now - state.lastAt) / 1000 : 0;
  const velocity = dt > 0.001 ? Math.abs(value - state.lastValue) / dt : 0;

  const next: RepCounterState = {
    ...state,
    peaks: state.peaks,
    velocities: state.velocities,
    lastValue: value,
    lastAt: now,
  };

  const magnitude = Math.abs(value);

  if (next.phase === 'excursion') {
    if (magnitude > next.peakMagnitude) next.peakMagnitude = magnitude;
    if (velocity > next.peakVelocity) next.peakVelocity = velocity;
  }

  // Enter the excursion once the head clears the peak threshold.
  if (next.phase === 'neutral' && magnitude >= peakThreshold) {
    const direction: 1 | -1 = value > 0 ? 1 : -1;

    if (config.requireAlternation && direction === next.lastDirection) {
      return { state: next, event: 'rejected-same-side', velocity };
    }

    next.phase = 'excursion';
    next.direction = direction;
    next.peakMagnitude = magnitude;
    next.peakVelocity = velocity;
    return { state: next, event: 'peak-reached', velocity };
  }

  // Close the rep on the return to neutral.
  if (next.phase === 'excursion' && magnitude <= neutralThreshold) {
    if (now - next.lastRepAt < config.minRepMs) {
      next.phase = 'neutral';
      next.direction = 0;
      next.peakMagnitude = 0;
      next.peakVelocity = 0;
      return { state: next, event: 'rejected-too-fast', velocity };
    }

    next.reps = next.reps + 1;
    next.lastDirection = next.direction;
    next.lastRepAt = now;
    next.peaks = [...next.peaks, roundTo(next.peakMagnitude, 1)];
    next.velocities = [...next.velocities, roundTo(next.peakVelocity, 0)];
    next.phase = 'neutral';
    next.direction = 0;
    next.peakMagnitude = 0;
    next.peakVelocity = 0;
    return { state: next, event: 'rep-counted', velocity };
  }

  return { state: next, event: 'none', velocity };
}

/* ------------------------------------------------------- performance scores */

/**
 * Minimum peak head velocity for gaze-stabilisation training to drive vestibular
 * adaptation. Below roughly 100 deg/s the VOR is doing little work and the drill
 * becomes a neck-mobility exercise instead.
 * Ref: Herdman & Clendaniel, Vestibular Rehabilitation, 4th ed.
 */
export const VOR_MIN_VELOCITY = 100;
export const VOR_TARGET_VELOCITY = 150;

export interface SessionQuality {
  /** Mean peak excursion as a percentage of the prescribed target angle. */
  romPercent: number;
  meanPeakAngle: number;
  meanPeakVelocity: number;
  /** 0-100 composite of range achieved, speed, and consistency. */
  score: number;
  /** Coefficient of variation of peak angles — lower is steadier. */
  consistency: number;
}

export function scoreSession(state: RepCounterState, targetAngle: number, velocitySensitive: boolean): SessionQuality {
  const peaks = state.peaks;
  if (peaks.length === 0) {
    return { romPercent: 0, meanPeakAngle: 0, meanPeakVelocity: 0, score: 0, consistency: 0 };
  }

  const meanPeakAngle = mean(peaks);
  const meanPeakVelocity = state.velocities.length ? mean(state.velocities) : 0;
  const romPercent = clamp((meanPeakAngle / Math.abs(targetAngle)) * 100, 0, 130);

  const sd = Math.sqrt(mean(peaks.map((p) => (p - meanPeakAngle) ** 2)));
  const cv = meanPeakAngle > 0 ? sd / meanPeakAngle : 1;
  const consistency = clamp((1 - cv) * 100, 0, 100);

  const romScore = clamp(romPercent, 0, 100);
  const velocityScore = clamp((meanPeakVelocity / VOR_TARGET_VELOCITY) * 100, 0, 100);

  const score = velocitySensitive
    ? 0.45 * romScore + 0.35 * velocityScore + 0.2 * consistency
    : 0.65 * romScore + 0.35 * consistency;

  return {
    romPercent: roundTo(romPercent, 0),
    meanPeakAngle: roundTo(meanPeakAngle, 1),
    meanPeakVelocity: roundTo(meanPeakVelocity, 0),
    score: roundTo(score, 0),
    consistency: roundTo(consistency, 0),
  };
}

export type CoachCue =
  | 'go-further'
  | 'go-faster'
  | 'slow-down'
  | 'return-to-centre'
  | 'hold'
  | 'good';

/** The single most useful correction to speak right now. */
export function coachingCue(
  state: RepCounterState,
  config: RepCounterConfig,
  velocitySensitive: boolean
): CoachCue {
  if (state.phase === 'excursion') {
    if (state.peakMagnitude < Math.abs(config.targetAngle) * 0.85) return 'go-further';
    return 'return-to-centre';
  }
  if (state.peaks.length >= 3) {
    const recentPeak = mean(state.peaks.slice(-3));
    if (recentPeak < Math.abs(config.targetAngle) * 0.8) return 'go-further';
    if (velocitySensitive) {
      const recentVelocity = mean(state.velocities.slice(-3));
      if (recentVelocity < VOR_MIN_VELOCITY) return 'go-faster';
      if (recentVelocity > VOR_TARGET_VELOCITY * 2.5) return 'slow-down';
    }
  }
  return 'good';
}

/* ------------------------------------------------------- exercise catalogue */

export type ExerciseKind = 'vor' | 'habituation' | 'repositioning' | 'balance';

export type ExerciseCategory = 'eyes' | 'head_neck' | 'sitting' | 'standing' | 'moving' | 'positioning';

export interface VestibularExercise {
  id: string;
  kind: ExerciseKind;
  category?: ExerciseCategory;
  code: string;
  titleEn: string;
  titleHi: string;
  descEn: string;
  descHi: string;
  /** Axis the camera coach tracks, or null when the drill is not camera-trackable. */
  axis: HeadAxis | null;
  targetAngle: number;
  targetReps: number;
  /** Whether head speed matters clinically — true for gaze stabilisation. */
  velocitySensitive: boolean;
  requireAlternation: boolean;
  cautionEn?: string;
  cautionHi?: string;
  recommendedDurationMinutes?: number;
  recommendedFrequencyPerDay?: number;
}

export const EXERCISES: VestibularExercise[] = [
  {
    id: 'vor-x1-horizontal',
    kind: 'vor',
    category: 'head_neck',
    code: 'Head side to side',
    titleEn: 'Head side to side',
    titleHi: 'सिर दाएं-बाएं (गैज़ स्टेबिलाइज़ेशन)',
    descEn:
      'Stretch arm out in front with thumb pointing upwards. Turn head smoothly left and right while keeping eyes fixated on your thumb.',
    descHi:
      'अपना अंगूठा ऊपर की दिशा में रखकर हाथ सामने सीधा धरें। नज़र अंगूठे पर रोखकर सिर डावीकडे और उजवीकडे फिराएं।',
    axis: 'yaw',
    targetAngle: 40,
    targetReps: 20,
    velocitySensitive: true,
    requireAlternation: true,
    recommendedDurationMinutes: 2,
    recommendedFrequencyPerDay: 4,
  },
  {
    id: 'vor-x1-vertical',
    kind: 'vor',
    category: 'head_neck',
    code: 'Head up and down',
    titleEn: 'Head up and down',
    titleHi: 'सिर ऊपर-नीचे (गैज़ स्टेबिलाइज़ेशन)',
    descEn:
      'Stretch arm in front with thumb pointing upwards. Move your head up and down while keeping eyes fixated on your thumb.',
    descHi:
      'हाथ सामने सीधा रखकर अंगूठे पर नज़र टिकाएं। नज़र अंगूठे पर रोखकर सिर वर और खाली कराएं।',
    axis: 'pitch',
    targetAngle: 30,
    targetReps: 20,
    velocitySensitive: true,
    requireAlternation: true,
    recommendedDurationMinutes: 2,
    recommendedFrequencyPerDay: 4,
  },
  {
    id: 'cawthorne-diagonal',
    kind: 'habituation',
    category: 'head_neck',
    code: 'Head 45 degree',
    titleEn: 'Head 45 degree',
    titleHi: '45 डिग्री सिर झुकाव (अर्धवृत्ताकार नहर अभ्यास)',
    descEn:
      'Turn head 45° to one side then nod up and down. Targets anterior and posterior semicircular canals for vertigo habituation.',
    descHi:
      'सिर को 45° एक तरफ घुमाकर ऊपर-नीचे झुकाएं। यह बीपीपीवी हैबिचुएशन के लिए अग्र व पश्च नहरों को लक्षित करता है।',
    axis: 'pitch',
    targetAngle: 35,
    targetReps: 15,
    velocitySensitive: false,
    requireAlternation: true,
    recommendedDurationMinutes: 2,
    recommendedFrequencyPerDay: 3,
  },
  {
    id: 'eyes-focus-finger',
    kind: 'vor',
    category: 'eyes',
    code: 'Focus on finger',
    titleEn: 'Eyes focus on finger with arm outstretched',
    titleHi: 'हाथ फैलाकर उंगली पर नज़र केंद्रित करें',
    descEn:
      'Focus on your finger moving towards and away from your face, or let eyes converge at the nose site to train visual tracking.',
    descHi:
      'चेहऱ्याच्या दिशेने येणाऱ्या आणि विरुद्ध दिशेने जाणाऱ्या बोटावर लक्ष केंद्रित करा।',
    axis: null,
    targetAngle: 0,
    targetReps: 15,
    velocitySensitive: false,
    requireAlternation: false,
    recommendedDurationMinutes: 2,
    recommendedFrequencyPerDay: 3,
  },
  {
    id: 'eye-roll-up-down',
    kind: 'vor',
    category: 'eyes',
    code: 'Eye Roll Up/Down',
    titleEn: 'Roll eyes up and down',
    titleHi: 'आंखें ऊपर-नीचे घुमाएं',
    descEn:
      'Keep head stationary while looking up as far as comfortably possible, then down towards your chin.',
    descHi:
      'सिर स्थिर रखकर आंखों को ऊपर और नीचे की ओर बारी-बारी से घुमाएं।',
    axis: null,
    targetAngle: 0,
    targetReps: 15,
    velocitySensitive: false,
    requireAlternation: true,
    recommendedDurationMinutes: 1,
    recommendedFrequencyPerDay: 3,
  },
  {
    id: 'eye-alternate-left-right',
    kind: 'vor',
    category: 'eyes',
    code: 'Eye Left/Right',
    titleEn: 'Look left and right alternatively',
    titleHi: 'आंखें दाएं-बाएं बारी-बारी देखें',
    descEn:
      'Keep head completely still. Move eyes smoothly from extreme left to extreme right.',
    descHi:
      'आळीपाळीने उजवीकडे आणि डावीकडे बघा। सिर बिना हिलाए केवल आंखों से देखें।',
    axis: null,
    targetAngle: 0,
    targetReps: 15,
    velocitySensitive: false,
    requireAlternation: true,
    recommendedDurationMinutes: 1,
    recommendedFrequencyPerDay: 3,
  },
  {
    id: 'standing-exercise',
    kind: 'balance',
    category: 'standing',
    code: 'Standing exercise',
    titleEn: 'Standing exercise',
    titleHi: 'उठे रहने का अभ्यास (आंखें खुली व बंद)',
    descEn:
      'Maintain balance while standing with feet close together. Practice initially with eyes open and then eyes shut alternately for 15 reps.',
    descHi:
      'पैर पास रखकर खड़े हों। आधी डोळे उघडे ठेवून आणि मग बंद करून उठबस या उभे राहा।',
    axis: null,
    targetAngle: 0,
    targetReps: 15,
    velocitySensitive: false,
    requireAlternation: true,
    cautionEn: 'Perform near a wall or study table for support if feeling unsteady.',
    cautionHi: 'असंतुलित महसूस होने पर सहारा लेने के लिए दीवार के पास करें।',
    recommendedDurationMinutes: 2,
    recommendedFrequencyPerDay: 3,
  },
  {
    id: 'sitting-up-and-down',
    kind: 'balance',
    category: 'sitting',
    code: 'Sitting up and down',
    titleEn: 'Sitting up and down',
    titleHi: 'बैठकर उठने का अभ्यास',
    descEn:
      'Change from sitting to standing and sit back down, initially with eyes open and then eyes closed. Build up to 15 repetitions.',
    descHi:
      'उठबस करा और मध्य में गोल फिरें। आंखें खुली रखकर और बंद रखकर बैठकर उठें।',
    axis: null,
    targetAngle: 0,
    targetReps: 15,
    velocitySensitive: false,
    requireAlternation: true,
    recommendedDurationMinutes: 2,
    recommendedFrequencyPerDay: 3,
  },
  {
    id: 'walking-flat-surface',
    kind: 'balance',
    category: 'moving',
    code: 'Walking flat surface',
    titleEn: 'Walking on a flat surface',
    titleHi: 'समतल सतह पर चलना',
    descEn:
      'Walk across the room in a straight line with eyes open then closed. Turn head to one side after three steps and opposite side after three steps.',
    descHi:
      'एक सरळ रेषेत चाला। चालताना तीन पावलांनंतर डोके एका बाजूला वळवा आणि नंतर तीन पावलांनंतर दुसऱ्या बाजूला।',
    axis: null,
    targetAngle: 0,
    targetReps: 10,
    velocitySensitive: false,
    requireAlternation: true,
    recommendedDurationMinutes: 3,
    recommendedFrequencyPerDay: 3,
  },
  {
    id: 'walking-uneven-surface',
    kind: 'balance',
    category: 'moving',
    code: 'Uneven surface walk',
    titleEn: 'Walking on an uneven surface',
    titleHi: 'असमान सतह या गद्दी पर चलना',
    descEn:
      'Walk up and down steps or maintain balance standing on a soft mattress/firm cushion with eyes open then eyes closed.',
    descHi:
      'पायऱ्या चढा आणि उतरा किंवा मऊ गादीवर उभे राहून तोल सावरा।',
    axis: null,
    targetAngle: 0,
    targetReps: 10,
    velocitySensitive: false,
    requireAlternation: true,
    recommendedDurationMinutes: 3,
    recommendedFrequencyPerDay: 2,
  },
  {
    id: 'walking-heel-to-toe',
    kind: 'balance',
    category: 'moving',
    code: 'Heel-to-toe walk',
    titleEn: 'Walking heel-to-toe',
    titleHi: 'एड़ी से पंजा मिलाकर चलना (टैंडम वॉक)',
    descEn:
      'Maintain balance while standing or walking with arms crossed in front of chest and feet placed in a single line (one in front of another).',
    descHi:
      'हाताची घडी घालून तोल सावरून उभे राहा / एड़ी से पंजा मिलाकर एक लाइन में चलें।',
    axis: null,
    targetAngle: 0,
    targetReps: 12,
    velocitySensitive: false,
    requireAlternation: true,
    recommendedDurationMinutes: 2,
    recommendedFrequencyPerDay: 3,
  },
  {
    id: 'sit-and-lean-exercise',
    kind: 'habituation',
    category: 'sitting',
    code: 'Sit and lean',
    titleEn: 'Sit and lean exercise',
    titleHi: 'बैठकर आगे झुकने व तिरछे होने का अभ्यास',
    descEn:
      'Sit in a chair, bend forward and pick up objects from the floor, then return upright and turn head and trunk alternatively left and right.',
    descHi:
      'पुढे वाका आणि वस्तू उचला। डोके आणि धड आळीपाळीने उजवीकडे व डावीकडे वळवा।',
    axis: null,
    targetAngle: 0,
    targetReps: 12,
    velocitySensitive: false,
    requireAlternation: true,
    recommendedDurationMinutes: 2,
    recommendedFrequencyPerDay: 3,
  },
  {
    id: 'rolling-exercise',
    kind: 'repositioning',
    category: 'positioning',
    code: 'Rolling exercise',
    titleEn: 'Rolling exercise',
    titleHi: 'करवट बदलने और रोलिंग का अभ्यास (Brandt-Daroff)',
    descEn:
      'Sit upright on bed with head turned 45°. Drop to left side until head touches bed, wait 60 sec, then move to right side with forehead resting on bed.',
    descHi:
      'पलंगावर ताठ बसा, डोके 45° वळवा। डाव्या बाजूला पडा (६० सेकंद थांबवा), मग दुसऱ्या बाजूला पडा।',
    axis: null,
    targetAngle: 0,
    targetReps: 5,
    velocitySensitive: false,
    requireAlternation: true,
    cautionEn: 'Perform 3 times in morning, noon, and night until free from positional vertigo for 24 hours.',
    cautionHi: 'सुबह, दोपहर, रात दिन में 3 बार करें।',
    recommendedDurationMinutes: 5,
    recommendedFrequencyPerDay: 3,
  },
  {
    id: 'cervicogenic-shrug',
    kind: 'habituation',
    category: 'sitting',
    code: 'Shoulder Shrug',
    titleEn: 'Shrugging and rotating shoulders',
    titleHi: 'कंधे उठाना व गोल घुमाना',
    descEn:
      'Elevate shoulders smoothly towards ears while tucking chin slightly inward, hold for 2 seconds, and release to relieve cervical-vestibular muscle tension.',
    descHi:
      'खांदे वरखाली करा (खांदे उडवा) आणि गोल फिरवा। ठोड़ी अंदर दबाएं।',
    axis: 'pitch',
    targetAngle: 25,
    targetReps: 12,
    velocitySensitive: false,
    requireAlternation: false,
    recommendedDurationMinutes: 2,
    recommendedFrequencyPerDay: 4,
  },
  {
    id: 'ball-coordination',
    kind: 'balance',
    category: 'moving',
    code: 'Ball Throw',
    titleEn: 'Throwing & catching ball hand-to-hand',
    titleHi: 'हाथों से गेंद फेंकना व पकड़ना',
    descEn:
      'Throw a small ball in an arc shape from one hand to another above eye level or under knee, following the ball with eyes while walking or standing.',
    descHi:
      'एक छोटा चेंडू एका हाताने डोक्यावरून कमानित दुसऱ्या हाताकडे फेका आणि नजर चेंडूवर ठेवा।',
    axis: null,
    targetAngle: 0,
    targetReps: 15,
    velocitySensitive: false,
    requireAlternation: true,
    recommendedDurationMinutes: 3,
    recommendedFrequencyPerDay: 2,
  },
];

export function exerciseById(id: string): VestibularExercise {
  return EXERCISES.find((e) => e.id === id) || EXERCISES[0];
}

export function repConfigFor(exercise: VestibularExercise): RepCounterConfig {
  return {
    ...DEFAULT_REP_CONFIG,
    targetAngle: exercise.targetAngle,
    requireAlternation: exercise.requireAlternation,
    // Habituation drills are deliberately slow, so the debounce must be longer
    // or a slow return through neutral gets discarded as tremor.
    minRepMs: exercise.velocitySensitive ? 300 : 700,
  };
}

/* ------------------------------------------- canal repositioning manoeuvres */

export type Side = 'left' | 'right';

export interface ManoeuvreStep {
  id: string;
  seconds: number;
  titleEn: string;
  titleHi: string;
  /** {side} is substituted with the affected ear. */
  instructionEn: string;
  instructionHi: string;
}

export interface Manoeuvre {
  id: string;
  nameEn: string;
  nameHi: string;
  indicationEn: string;
  indicationHi: string;
  cyclesPerSession: number;
  steps: ManoeuvreStep[];
}

/** Epley, for posterior canal canalithiasis — the commonest BPPV by far. */
export const EPLEY: Manoeuvre = {
  id: 'epley',
  nameEn: 'Epley canalith repositioning',
  nameHi: 'एपली कैनालिथ रिपोज़िशनिंग',
  indicationEn: 'Posterior semicircular canal BPPV, confirmed on Dix-Hallpike.',
  indicationHi: 'पोस्टीरियर अर्धवृत्ताकार नलिका का बीपीपीवी, डिक्स-हॉलपाइक पर पुष्ट।',
  cyclesPerSession: 3,
  steps: [
    {
      id: 'epley-1',
      seconds: 30,
      titleEn: 'Sit and pre-turn',
      titleHi: 'बैठें और सिर घुमाएं',
      instructionEn: 'Sit upright on the bed with legs extended. Turn your head 45° towards the {side} ear.',
      instructionHi: 'पैर फैलाकर बिस्तर पर सीधे बैठें। सिर को {side} कान की ओर 45° घुमाएं।',
    },
    {
      id: 'epley-2',
      seconds: 60,
      titleEn: 'Lie back, head hanging',
      titleHi: 'पीठ के बल लेटें, सिर लटका हुआ',
      instructionEn:
        'Keeping the 45° turn, lie back quickly so the head hangs about 20° below the mattress on a pillow under the shoulders. Vertigo is expected — hold until it stops, then 30 seconds more.',
      instructionHi:
        '45° घुमाव बनाए रखते हुए तेज़ी से पीछे लेट जाएं ताकि कंधों के नीचे तकिया रखकर सिर लगभग 20° नीचे लटके। चक्कर आना अपेक्षित है — रुकने तक और फिर 30 सेकंड और रुकें।',
    },
    {
      id: 'epley-3',
      seconds: 45,
      titleEn: 'Rotate 90° across',
      titleHi: '90° विपरीत दिशा में घुमाएं',
      instructionEn: 'Without lifting the head, rotate it 90° to the opposite side so it now faces away from the {side} ear.',
      instructionHi: 'सिर उठाए बिना उसे 90° विपरीत दिशा में घुमाएं ताकि अब वह {side} कान से दूर देखे।',
    },
    {
      id: 'epley-4',
      seconds: 45,
      titleEn: 'Roll onto the shoulder',
      titleHi: 'कंधे के बल करवट लें',
      instructionEn: 'Roll the whole body onto that same shoulder, keeping the head fixed, so you are looking down at the floor.',
      instructionHi: 'सिर को स्थिर रखते हुए पूरे शरीर को उसी कंधे पर घुमाएं, ताकि आप फर्श की ओर देखें।',
    },
    {
      id: 'epley-5',
      seconds: 60,
      titleEn: 'Sit up slowly',
      titleHi: 'धीरे-धीरे उठकर बैठें',
      instructionEn: 'Swing the legs off the bed and sit up sideways, slowly. Stay sitting upright for a full minute before standing.',
      instructionHi: 'पैर बिस्तर से नीचे लाकर धीरे-धीरे बगल से उठें। खड़े होने से पहले पूरे एक मिनट सीधे बैठे रहें।',
    },
  ],
};

/** Brandt-Daroff, for home habituation when the affected side is unclear. */
export const BRANDT_DAROFF: Manoeuvre = {
  id: 'brandt-daroff',
  nameEn: 'Brandt-Daroff habituation',
  nameHi: 'ब्रांट-डैरोफ हैबिचुएशन',
  indicationEn: 'Residual positional dizziness, or BPPV where the affected side is not yet identified.',
  indicationHi: 'बचा हुआ स्थितिजन्य चक्कर, या ऐसा बीपीपीवी जिसमें प्रभावित पक्ष अभी तय नहीं है।',
  cyclesPerSession: 5,
  steps: [
    {
      id: 'bd-1',
      seconds: 30,
      titleEn: 'Sit at the edge',
      titleHi: 'किनारे पर बैठें',
      instructionEn: 'Sit upright on the edge of the bed and turn your head 45° to the {side}.',
      instructionHi: 'बिस्तर के किनारे सीधे बैठें और सिर को {side} ओर 45° घुमाएं।',
    },
    {
      id: 'bd-2',
      seconds: 30,
      titleEn: 'Lie to the opposite side',
      titleHi: 'विपरीत दिशा में लेटें',
      instructionEn: 'Lie down quickly onto the side opposite the head turn, so the back of the head touches the bed. Hold until dizziness settles.',
      instructionHi: 'सिर के घुमाव से विपरीत दिशा में तेज़ी से लेट जाएं, ताकि सिर का पिछला भाग बिस्तर को छुए। चक्कर शांत होने तक रुकें।',
    },
    {
      id: 'bd-3',
      seconds: 30,
      titleEn: 'Return to sitting',
      titleHi: 'वापस बैठें',
      instructionEn: 'Sit back up and face forward. Wait for any dizziness to settle before the next repetition.',
      instructionHi: 'वापस उठकर बैठें और सामने देखें। अगली पुनरावृत्ति से पहले चक्कर शांत होने दें।',
    },
  ],
};

export const MANOEUVRES: Manoeuvre[] = [EPLEY, BRANDT_DAROFF];

/** Substitute the affected-ear token in a manoeuvre instruction. */
export function renderInstruction(template: string, side: Side, hi: boolean): string {
  const label = hi ? (side === 'left' ? 'बाएं' : 'दाएं') : side;
  return template.replace(/\{side\}/g, label);
}

export function manoeuvreDuration(m: Manoeuvre): number {
  return m.steps.reduce((sum, s) => sum + s.seconds, 0);
}

/* --------------------------------------------------------------- red flags */

export interface RedFlag {
  id: string;
  en: string;
  hi: string;
}

/**
 * Central causes that must not be treated as BPPV. Broadly the HINTS-plus
 * territory: any of these alongside acute vertigo warrants emergency review
 * rather than a repositioning manoeuvre.
 */
export const RED_FLAGS: RedFlag[] = [
  { id: 'rf-headache', en: 'New severe headache or neck pain with the vertigo', hi: 'चक्कर के साथ नया तेज़ सिरदर्द या गर्दन में दर्द' },
  { id: 'rf-diplopia', en: 'Double vision, drooping face, or slurred speech', hi: 'दोहरा दिखना, चेहरा लटकना, या बोलने में लड़खड़ाहट' },
  { id: 'rf-weakness', en: 'Weakness or numbness in an arm or leg', hi: 'हाथ या पैर में कमज़ोरी या सुन्नपन' },
  { id: 'rf-gait', en: 'Cannot stand or walk unaided, even with support', hi: 'सहारे के बावजूद खड़ा होना या चलना संभव नहीं' },
  { id: 'rf-hearing', en: 'Sudden hearing loss in one ear alongside the vertigo', hi: 'चक्कर के साथ एक कान की अचानक सुनने की क्षमता जाना' },
  { id: 'rf-vertical', en: 'The room spins vertically, or vision jumps constantly at rest', hi: 'कमरा ऊपर-नीचे घूमता है, या आराम में भी दृष्टि लगातार हिलती है' },
];

export function hasRedFlags(checked: Record<string, boolean>): boolean {
  return RED_FLAGS.some((f) => checked[f.id]);
}

/* -------------------------------------------------------------------- DHI-25 */

export type DhiSubscale = 'P' | 'E' | 'F';

export interface DhiItem {
  id: string;
  subscale: DhiSubscale;
  text: string;
  textHi: string;
}

export interface DhiOption {
  label: string;
  labelHi: string;
  score: number;
}

export const DHI_OPTIONS: DhiOption[] = [
  { label: 'No', labelHi: 'नहीं', score: 0 },
  { label: 'Sometimes', labelHi: 'कभी-कभी', score: 2 },
  { label: 'Yes', labelHi: 'हाँ', score: 4 },
];

/**
 * Dizziness Handicap Inventory — Jacobson & Newman (1990).
 * P = physical (7 items), E = emotional (9), F = functional (9). Max 100.
 */
export const DHI_ITEMS: DhiItem[] = [
  { id: 'd1', subscale: 'P', text: 'Does looking up increase your problem?', textHi: 'क्या ऊपर देखने से आपकी समस्या बढ़ती है?' },
  { id: 'd2', subscale: 'E', text: 'Because of your problem, do you feel frustrated?', textHi: 'क्या अपनी समस्या के कारण आप निराश महसूस करते हैं?' },
  { id: 'd3', subscale: 'F', text: 'Because of your problem, do you restrict your travel for business or recreation?', textHi: 'क्या समस्या के कारण आप काम या घूमने की यात्रा सीमित कर देते हैं?' },
  { id: 'd4', subscale: 'P', text: 'Does walking down the aisle of a supermarket increase your problem?', textHi: 'क्या दुकान की गलियारों में चलने से आपकी समस्या बढ़ती है?' },
  { id: 'd5', subscale: 'F', text: 'Because of your problem, do you have difficulty getting into or out of bed?', textHi: 'क्या समस्या के कारण बिस्तर पर लेटने या उठने में कठिनाई होती है?' },
  { id: 'd6', subscale: 'F', text: 'Does your problem significantly restrict your participation in social activities such as going out to dinner, to the cinema, or to parties?', textHi: 'क्या समस्या के कारण खाने बाहर जाना, सिनेमा या समारोह जैसी सामाजिक गतिविधियाँ काफ़ी सीमित हो जाती हैं?' },
  { id: 'd7', subscale: 'F', text: 'Because of your problem, do you have difficulty reading?', textHi: 'क्या समस्या के कारण पढ़ने में कठिनाई होती है?' },
  { id: 'd8', subscale: 'P', text: 'Does performing more ambitious activities like sports, dancing, or household chores increase your problem?', textHi: 'क्या खेल, नृत्य या घर के भारी कामों से आपकी समस्या बढ़ती है?' },
  { id: 'd9', subscale: 'E', text: 'Because of your problem, are you afraid to leave your home without having someone accompany you?', textHi: 'क्या समस्या के कारण आपको किसी के साथ के बिना घर से निकलने में डर लगता है?' },
  { id: 'd10', subscale: 'E', text: 'Because of your problem, have you been embarrassed in front of others?', textHi: 'क्या समस्या के कारण आपको दूसरों के सामने शर्मिंदगी हुई है?' },
  { id: 'd11', subscale: 'P', text: 'Do quick movements of your head increase your problem?', textHi: 'क्या सिर की तेज़ हरकतों से आपकी समस्या बढ़ती है?' },
  { id: 'd12', subscale: 'F', text: 'Because of your problem, do you avoid heights?', textHi: 'क्या समस्या के कारण आप ऊँचाई से बचते हैं?' },
  { id: 'd13', subscale: 'P', text: 'Does turning over in bed increase your problem?', textHi: 'क्या बिस्तर पर करवट बदलने से आपकी समस्या बढ़ती है?' },
  { id: 'd14', subscale: 'F', text: 'Because of your problem, is it difficult for you to do strenuous housework or yard work?', textHi: 'क्या समस्या के कारण घर या बगीचे का भारी काम करना कठिन है?' },
  { id: 'd15', subscale: 'E', text: 'Because of your problem, are you afraid people may think you are intoxicated?', textHi: 'क्या आपको डर लगता है कि लोग समझेंगे कि आपने नशा किया है?' },
  { id: 'd16', subscale: 'F', text: 'Because of your problem, is it difficult for you to go for a walk by yourself?', textHi: 'क्या समस्या के कारण अकेले टहलने जाना कठिन है?' },
  { id: 'd17', subscale: 'P', text: 'Does walking down a footpath increase your problem?', textHi: 'क्या फुटपाथ पर चलने से आपकी समस्या बढ़ती है?' },
  { id: 'd18', subscale: 'E', text: 'Because of your problem, is it difficult for you to concentrate?', textHi: 'क्या समस्या के कारण ध्यान केंद्रित करना कठिन है?' },
  { id: 'd19', subscale: 'F', text: 'Because of your problem, is it difficult for you to walk around your house in the dark?', textHi: 'क्या समस्या के कारण अंधेरे में घर में चलना कठिन है?' },
  { id: 'd20', subscale: 'E', text: 'Because of your problem, are you afraid to stay home alone?', textHi: 'क्या समस्या के कारण अकेले घर पर रहने में डर लगता है?' },
  { id: 'd21', subscale: 'E', text: 'Because of your problem, do you feel handicapped?', textHi: 'क्या समस्या के कारण आप स्वयं को अक्षम महसूस करते हैं?' },
  { id: 'd22', subscale: 'E', text: 'Has your problem placed stress on your relationships with members of your family or friends?', textHi: 'क्या समस्या ने परिवार या मित्रों के साथ आपके संबंधों पर तनाव डाला है?' },
  { id: 'd23', subscale: 'E', text: 'Because of your problem, are you depressed?', textHi: 'क्या समस्या के कारण आप अवसाद महसूस करते हैं?' },
  { id: 'd24', subscale: 'F', text: 'Does your problem interfere with your job or household responsibilities?', textHi: 'क्या समस्या आपके काम या घरेलू जिम्मेदारियों में बाधा डालती है?' },
  { id: 'd25', subscale: 'P', text: 'Does bending over increase your problem?', textHi: 'क्या झुकने से आपकी समस्या बढ़ती है?' },
];

export const DHI_SUBSCALE_MAX: Record<DhiSubscale, number> = { P: 28, E: 36, F: 36 };

export function scoreDhi(answers: Record<string, number>): number {
  return DHI_ITEMS.reduce((sum, item) => sum + (answers[item.id] ?? 0), 0);
}

export function scoreDhiSubscale(answers: Record<string, number>, subscale: DhiSubscale): number {
  return DHI_ITEMS.filter((i) => i.subscale === subscale).reduce(
    (sum, item) => sum + (answers[item.id] ?? 0),
    0
  );
}

export type DhiTone = 'routine' | 'clinic' | 'emergency';

export interface DhiBand {
  max: number;
  grade: number;
  tone: DhiTone;
  label: string;
  labelHi: string;
  guidance: string;
  guidanceHi: string;
}

/** Severity bands per Whitney, Wrisley & Furman (2004). */
export const DHI_BANDS: DhiBand[] = [
  {
    max: 14,
    grade: 0,
    tone: 'routine',
    label: 'No appreciable handicap',
    labelHi: 'कोई विशेष अक्षमता नहीं',
    guidance:
      'Dizziness is not restricting your daily life. Keep up the gaze-stabilisation drills a few times a week to hold the gain you have made.',
    guidanceHi:
      'चक्कर आपके दैनिक जीवन को सीमित नहीं कर रहा। जो सुधार हुआ है उसे बनाए रखने के लिए सप्ताह में कुछ बार नज़र स्थिर रखने के अभ्यास जारी रखें।',
  },
  {
    max: 34,
    grade: 1,
    tone: 'routine',
    label: 'Mild handicap',
    labelHi: 'हल्की अक्षमता',
    guidance:
      'Symptoms show up in specific situations rather than constantly. Daily VOR x1 and habituation drills are the highest-value thing you can do.',
    guidanceHi:
      'लक्षण लगातार नहीं, बल्कि कुछ विशेष स्थितियों में आते हैं। रोज़ाना VOR x1 और हैबिचुएशन अभ्यास सबसे अधिक लाभदायक हैं।',
  },
  {
    max: 52,
    grade: 2,
    tone: 'clinic',
    label: 'Moderate handicap',
    labelHi: 'मध्यम अक्षमता',
    guidance:
      'Dizziness is shaping how you move through the day and carries a real fall risk. Bring this score to your next ENT or Audiology appointment.',
    guidanceHi:
      'चक्कर आपकी दिनचर्या को प्रभावित कर रहा है और गिरने का वास्तविक जोखिम है। यह स्कोर अगली ईएनटी या ऑडियोलॉजी विज़िट पर दिखाएं।',
  },
  {
    max: 100,
    grade: 3,
    tone: 'clinic',
    label: 'Severe handicap',
    labelHi: 'गंभीर अक्षमता',
    guidance:
      'This level of handicap needs a supervised vestibular rehabilitation programme, not home exercise alone. Ask for an ENT referral, and do balance work only with someone present.',
    guidanceHi:
      'इस स्तर की अक्षमता के लिए केवल घरेलू व्यायाम पर्याप्त नहीं — निगरानी में वेस्टिबुलर पुनर्वास कार्यक्रम चाहिए। ईएनटी रेफरल मांगें, और संतुलन अभ्यास किसी के सामने ही करें।',
  },
];

export function dhiBandFor(score: number): DhiBand {
  return DHI_BANDS.find((b) => score <= b.max) || DHI_BANDS[DHI_BANDS.length - 1];
}

/**
 * The DHI's minimal detectable change. A drop smaller than this is measurement
 * noise, not improvement — worth saying out loud so patients do not over-read a
 * four-point swing.
 */
export const DHI_MDC = 18;

/* ------------------------------------------------------------------ storage */

export const STORAGE_KEYS = {
  sessions: 'id-vestibular-sessions',
  dhi: 'id-vestibular-dhi',
  profile: 'id-vestibular-profile',
  symptomLog: 'id-symptom-log',
};

export interface VestibularSession {
  id: string;
  date: string;
  exerciseId: string;
  reps: number;
  targetReps: number;
  meanPeakAngle: number;
  meanPeakVelocity: number;
  qualityScore: number;
  dizzinessBefore: number;
  dizzinessAfter: number;
  /** 'coach' for camera-tracked, 'manual' for the checklist guide. */
  mode: 'coach' | 'manual';
  createdAt: string;
}

export interface DhiResult {
  id: string;
  date: string;
  score: number;
  grade: number;
  createdAt: string;
}

export interface VestibularProfile {
  affectedSide: Side;
  neutralPose: HeadPose | null;
  updatedAt: string;
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Quota exceeded or storage disabled — the session still works in memory.
  }
}

export function loadSessions(): VestibularSession[] {
  return readJson<VestibularSession[]>(STORAGE_KEYS.sessions, []);
}

export function saveSession(session: VestibularSession): VestibularSession[] {
  const next = [session, ...loadSessions()].slice(0, 300);
  writeJson(STORAGE_KEYS.sessions, next);
  return next;
}

export function loadDhiHistory(): DhiResult[] {
  return readJson<DhiResult[]>(STORAGE_KEYS.dhi, []);
}

export function saveDhiResult(result: DhiResult): DhiResult[] {
  const next = [result, ...loadDhiHistory()].slice(0, 60);
  writeJson(STORAGE_KEYS.dhi, next);
  return next;
}

export function loadProfile(): VestibularProfile {
  return readJson<VestibularProfile>(STORAGE_KEYS.profile, {
    affectedSide: 'right',
    neutralPose: null,
    updatedAt: new Date().toISOString(),
  });
}

export function saveProfile(profile: VestibularProfile): void {
  writeJson(STORAGE_KEYS.profile, { ...profile, updatedAt: new Date().toISOString() });
}

/** Push a DHI score into the shared symptom log, as the THI does. */
export function saveDhiToSymptomLog(score: number, gradeLabel: string): void {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.symptomLog);
    const entries = raw ? JSON.parse(raw) : [];
    const entry = {
      id: crypto.randomUUID(),
      date: new Date().toISOString().slice(0, 10),
      pain: 0,
      hearing: 0,
      // DHI runs 0-100; the symptom log runs 0-10.
      dizziness: Math.min(10, Math.round((score / 100) * 10)),
      notes: `Dizziness Handicap Inventory (DHI-25): ${score}/100 — ${gradeLabel}`,
      createdAt: new Date().toISOString(),
    };
    window.localStorage.setItem(STORAGE_KEYS.symptomLog, JSON.stringify([entry, ...entries]));
  } catch {
    // ignore local storage error
  }
}

/* ------------------------------------------------------------- adherence */

export interface AdherenceSummary {
  totalSessions: number;
  /** Distinct days practised in the trailing 7 days. */
  daysThisWeek: number;
  /** Consecutive days practised, counting back from today. */
  streak: number;
  /** Mean (before − after) dizziness across sessions that logged both. */
  meanRelief: number;
  meanQuality: number;
}

/** `today` is injectable so the calculation is testable without mocking the clock. */
export function summariseAdherence(
  sessions: VestibularSession[],
  today: string = new Date().toISOString().slice(0, 10)
): AdherenceSummary {
  if (sessions.length === 0) {
    return { totalSessions: 0, daysThisWeek: 0, streak: 0, meanRelief: 0, meanQuality: 0 };
  }

  const days = new Set(sessions.map((s) => s.date));
  const todayMs = Date.parse(`${today}T00:00:00Z`);
  const dayMs = 86400000;

  let daysThisWeek = 0;
  for (let i = 0; i < 7; i++) {
    if (days.has(new Date(todayMs - i * dayMs).toISOString().slice(0, 10))) daysThisWeek++;
  }

  // A streak may legitimately start yesterday — today's session might not be in yet.
  let streak = 0;
  const startOffset = days.has(today) ? 0 : 1;
  for (let i = startOffset; i < 400; i++) {
    if (!days.has(new Date(todayMs - i * dayMs).toISOString().slice(0, 10))) break;
    streak++;
  }

  const relief = sessions.map((s) => s.dizzinessBefore - s.dizzinessAfter);

  return {
    totalSessions: sessions.length,
    daysThisWeek,
    streak,
    meanRelief: roundTo(mean(relief), 1),
    meanQuality: roundTo(mean(sessions.map((s) => s.qualityScore)), 0),
  };
}

/* -------------------------------------------------------------------- utils */

export function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, value));
}

export function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  const rounded = Math.round(value * factor) / factor;
  // Math.round(-0.0) is -0, which renders as "-0°" and fails deep equality.
  return rounded === 0 ? 0 : rounded;
}

export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}
