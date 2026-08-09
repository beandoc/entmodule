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
}
