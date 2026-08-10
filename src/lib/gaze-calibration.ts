/**
 * Gaze Calibration & Screen Geometry Normalization Engine
 *
 * Provides physical unit conversion (pixels/normalized -> visual angle in degrees)
 * and 5-point calibration quality metrics (per-point error, MAE, outlier rejection).
 */

export interface DisplayGeometry {
  /** Viewing distance in centimeters (default: 60cm ~ typical laptop distance) */
  viewingDistanceCm: number;
  /** Physical screen width in millimeters (default: 345mm ~ 15.6" laptop) */
  screenWidthMm: number;
  /** Physical screen height in millimeters (default: 194mm) */
  screenHeightMm: number;
  /** Screen width in pixels (e.g. 1920) */
  screenWidthPx: number;
  /** Screen height in pixels (e.g. 1080) */
  screenHeightPx: number;
}

export const DEFAULT_DISPLAY_GEOMETRY: DisplayGeometry = {
  viewingDistanceCm: 60,
  screenWidthMm: 345,
  screenHeightMm: 194,
  screenWidthPx: 1920,
  screenHeightPx: 1080,
};

export interface Point2D {
  x: number;
  y: number;
}

export interface CalibrationEvaluationPoint {
  target: Point2D;
  measuredGaze: Point2D;
  errorDeg: number;
  isOutlier: boolean;
}

export interface CalibrationReport {
  /** Overall Mean Absolute Error in degrees of visual angle */
  maeDeg: number;
  /** Median error in degrees */
  medianErrorDeg: number;
  /** Array of detailed per-point evaluation metrics */
  pointErrors: CalibrationEvaluationPoint[];
  /** Count of rejected outlier points */
  rejectedOutliersCount: number;
  /** True if calibration quality is sufficient for clinical analysis (MAE <= 3.5 deg) */
  isValidForClinicalScoring: boolean;
  /** Recommended DEG_PER_UNIT scaling factor derived from actual viewing geometry */
  effectiveDegPerUnit: number;
}

/**
 * Calculates degrees of visual angle subtended by a displacement in normalized [0,1] screen space.
 */
export function normalizedToVisualAngleDeg(
  normDx: number,
  normDy: number,
  geometry: DisplayGeometry = DEFAULT_DISPLAY_GEOMETRY
): number {
  const dxMm = Math.abs(normDx) * geometry.screenWidthMm;
  const dyMm = Math.abs(normDy) * geometry.screenHeightMm;
  const distMm = Math.sqrt(dxMm * dxMm + dyMm * dyMm);
  const viewingDistMm = geometry.viewingDistanceCm * 10;

  // Visual angle formula: 2 * arctan( d / (2 * D) )
  const angleRad = 2 * Math.atan(distMm / (2 * viewingDistMm));
  return angleRad * (180 / Math.PI);
}

/**
 * Computes effective DEG_PER_UNIT constant for 1.0 unit of normalized screen diagonal distance.
 */
export function computeEffectiveDegPerUnit(geometry: DisplayGeometry = DEFAULT_DISPLAY_GEOMETRY): number {
  return normalizedToVisualAngleDeg(1.0, 0, geometry);
}

/**
 * Evaluates calibration accuracy across 5 (or more) calibration target points.
 */
export function evaluateCalibrationQuality(
  samples: Array<{ target: Point2D; measuredGaze: Point2D }>,
  geometry: DisplayGeometry = DEFAULT_DISPLAY_GEOMETRY
): CalibrationReport {
  if (!samples || samples.length === 0) {
    return {
      maeDeg: 99,
      medianErrorDeg: 99,
      pointErrors: [],
      rejectedOutliersCount: 0,
      isValidForClinicalScoring: false,
      effectiveDegPerUnit: computeEffectiveDegPerUnit(geometry),
    };
  }

  const pointErrors: CalibrationEvaluationPoint[] = samples.map((s) => {
    const dx = s.measuredGaze.x - s.target.x;
    const dy = s.measuredGaze.y - s.target.y;
    const errorDeg = normalizedToVisualAngleDeg(dx, dy, geometry);
    return {
      target: s.target,
      measuredGaze: s.measuredGaze,
      errorDeg,
      isOutlier: false,
    };
  });

  // Outlier detection via Median Absolute Deviation (MAD)
  const errors = pointErrors.map((p) => p.errorDeg).sort((a, b) => a - b);
  const medianError = errors[Math.floor(errors.length / 2)] ?? 0;
  const absDevs = errors.map((e) => Math.abs(e - medianError)).sort((a, b) => a - b);
  const mad = absDevs[Math.floor(absDevs.length / 2)] ?? 0.1;

  let rejectedOutliersCount = 0;
  pointErrors.forEach((p) => {
    // Flag point if error exceeds median + 2.5 * MAD (or > 6.0 deg hard limit)
    if (p.errorDeg > Math.max(medianError + 2.5 * mad, 6.0)) {
      p.isOutlier = true;
      rejectedOutliersCount++;
    }
  });

  // Calculate MAE excluding outliers (if any valid points remain)
  const validPoints = pointErrors.filter((p) => !p.isOutlier);
  const targetGroup = validPoints.length > 0 ? validPoints : pointErrors;
  const maeDeg = targetGroup.reduce((sum, p) => sum + p.errorDeg, 0) / targetGroup.length;

  const isValidForClinicalScoring = maeDeg <= 3.5;

  return {
    maeDeg: parseFloat(maeDeg.toFixed(2)),
    medianErrorDeg: parseFloat(medianError.toFixed(2)),
    pointErrors,
    rejectedOutliersCount,
    isValidForClinicalScoring,
    effectiveDegPerUnit: parseFloat(computeEffectiveDegPerUnit(geometry).toFixed(2)),
  };
}/**
 * Affine calibration model: maps raw pupil-offset space → normalised screen space.
 *
 * The 2D affine transform has 6 degrees of freedom:
 *   screenX = a[0] + a[1]*rawX + a[2]*rawY
 *   screenY = a[3] + a[4]*rawX + a[5]*rawY
 *
 * Fitted by least-squares on ≥4 calibration samples, this corrects:
 *   - Scale difference between horizontal and vertical axes
 *   - Camera tilt (rotation ≡ shear in affine space)
 *   - Systematic offset (patient not centred)
 *
 * It does NOT correct barrel/pincushion lens distortion — that requires a
 * homography and is negligible at webcam accuracy budgets.
 */
export interface AffineCalibration {
  /** 6-element coefficient vector [a0, a1, a2, b0, b1, b2] */
  coefficients: Float64Array;
  /** True when ≥4 valid samples were available for fitting */
  isValid: boolean;
  /** RMS residual error across calibration samples in degrees */
  rmsResidualDeg: number;
}

/**
 * Fit a 2D affine mapping from raw pupil offsets to normalised screen positions.
 *
 * Accepts ≥4 samples. Uses normal-equations least squares (3×3 matrix inversion).
 * Returns an identity-like fallback if fewer than 4 non-degenerate samples exist.
 */
export function fitAffineCalibration(
  samples: Array<{ target: Point2D; rawOffset: Point2D }>,
  geometry: DisplayGeometry = DEFAULT_DISPLAY_GEOMETRY,
): AffineCalibration {
  const fallback: AffineCalibration = {
    coefficients: new Float64Array([0.5, 1, 0, 0.5, 0, 1]),
    isValid: false,
    rmsResidualDeg: 99,
  };

  if (!samples || samples.length < 4) return fallback;

  const n = samples.length;

  // Build design matrix A (n×3) where each row is [1, rawX, rawY]
  // and targets bX (screenX) and bY (screenY).
  // Normal equations: (A'A) * coeff = A' * b
  // A'A is 3×3; we solve analytically via Cramer's rule (exact, no lib needed).

  let s1 = 0, sRx = 0, sRy = 0, sRxRx = 0, sRxRy = 0, sRyRy = 0;
  let sTx = 0, sTy = 0, sRxTx = 0, sRxTy = 0, sRyTx = 0, sRyTy = 0;

  for (const s of samples) {
    const rx = s.rawOffset.x;
    const ry = s.rawOffset.y;
    const tx = s.target.x;
    const ty = s.target.y;
    s1   += 1;
    sRx  += rx;  sRy  += ry;
    sRxRx += rx*rx; sRxRy += rx*ry; sRyRy += ry*ry;
    sTx  += tx;  sTy  += ty;
    sRxTx += rx*tx; sRxTy += rx*ty;
    sRyTx += ry*tx; sRyTy += ry*ty;
  }

  // 3×3 matrix M = A'A
  //   [ n     sRx   sRy  ]
  //   [ sRx   sRxRx sRxRy]
  //   [ sRy   sRxRy sRyRy]
  const m = [
    [s1,   sRx,   sRy],
    [sRx,  sRxRx, sRxRy],
    [sRy,  sRxRy, sRyRy],
  ];

  // Determinant via cofactor expansion
  const det =
    m[0][0] * (m[1][1]*m[2][2] - m[1][2]*m[2][1]) -
    m[0][1] * (m[1][0]*m[2][2] - m[1][2]*m[2][0]) +
    m[0][2] * (m[1][0]*m[2][1] - m[1][1]*m[2][0]);

  if (Math.abs(det) < 1e-12) return fallback;

  const inv = (row: number, col: number): number => {
    // 2×2 minor cofactor
    const r = [0, 1, 2].filter(x => x !== row);
    const c = [0, 1, 2].filter(x => x !== col);
    const sign = (row + col) % 2 === 0 ? 1 : -1;
    return sign * (m[r[0]][c[0]] * m[r[1]][c[1]] - m[r[0]][c[1]] * m[r[1]][c[0]]) / det;
  };

  // Solve for X coefficients: [a0, a1, a2]
  const bx = [sTx, sRxTx, sRyTx];
  const by = [sTy, sRxTy, sRyTy];

  const ax = [
    bx[0]*inv(0,0) + bx[1]*inv(1,0) + bx[2]*inv(2,0),
    bx[0]*inv(0,1) + bx[1]*inv(1,1) + bx[2]*inv(2,1),
    bx[0]*inv(0,2) + bx[1]*inv(1,2) + bx[2]*inv(2,2),
  ];
  const ay = [
    by[0]*inv(0,0) + by[1]*inv(1,0) + by[2]*inv(2,0),
    by[0]*inv(0,1) + by[1]*inv(1,1) + by[2]*inv(2,1),
    by[0]*inv(0,2) + by[1]*inv(1,2) + by[2]*inv(2,2),
  ];

  const coeff = new Float64Array([ax[0], ax[1], ax[2], ay[0], ay[1], ay[2]]);

  // RMS residual in degrees
  let sumSq = 0;
  for (const s of samples) {
    const predX = ax[0] + ax[1]*s.rawOffset.x + ax[2]*s.rawOffset.y;
    const predY = ay[0] + ay[1]*s.rawOffset.x + ay[2]*s.rawOffset.y;
    const dx = predX - s.target.x;
    const dy = predY - s.target.y;
    sumSq += normalizedToVisualAngleDeg(dx, dy, geometry) ** 2;
  }
  const rmsResidualDeg = Math.sqrt(sumSq / n);

  return { coefficients: coeff, isValid: true, rmsResidualDeg };
}

/**
 * Apply a fitted affine calibration to a raw pupil-offset point.
 *
 * If `cal.isValid` is false (insufficient calibration samples), returns
 * the raw point mapped through a simple centre-biased identity: (0.5 + rawX, 0.5 + rawY).
 */
export function applyAffineCalibration(raw: Point2D, cal: AffineCalibration): Point2D {
  if (!cal.isValid) {
    return { x: Math.min(Math.max(0.5 + raw.x, 0), 1), y: Math.min(Math.max(0.5 + raw.y, 0), 1) };
  }
  const [a0, a1, a2, b0, b1, b2] = cal.coefficients;
  return {
    x: Math.min(Math.max(a0 + a1*raw.x + a2*raw.y, 0), 1),
    y: Math.min(Math.max(b0 + b1*raw.x + b2*raw.y, 0), 1),
  };
}
