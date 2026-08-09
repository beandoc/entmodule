import { GazePoint, GazeAnalytics, oknTargetX } from '@/lib/gaze-tracking';

export type Tab = 'live' | 'pursuit' | 'session' | 'longitudinal';
export type CameraState = 'idle' | 'starting' | 'live' | 'error';
export type PursuitPattern = 'horizontal' | 'vertical' | 'circular' | 'vor-x2' | 'saccadic' | 'optokinetic';

export interface LiveData {
  gazeX: number;
  gazeY: number;
  hasIris: boolean;
  leftIris: { x: number; y: number } | null;
  rightIris: { x: number; y: number } | null;
  faceVisible: boolean;
  fps: number;
  rawOffsetX?: number;
  rawOffsetY?: number;
  confidence?: number;
  isBlink?: boolean;
  is5PointCalibrated?: boolean;
  gazeT: number;
  headYaw: number;
  leftEyeX?: number;
  leftEyeY?: number;
  rightEyeX?: number;
  rightEyeY?: number;
  distanceCm?: number;
  distanceStatus?: 'optimal' | 'too_far' | 'too_close' | 'searching';
}

export interface SessionData {
  gazeHistory: GazePoint[];
  headHistory: Array<{ t: number; yaw: number }>;
  analytics: GazeAnalytics | null;
  durationMs: number;
}

export const EMPTY_LIVE: LiveData = {
  gazeX: 0.5, gazeY: 0.5, hasIris: false,
  leftIris: null, rightIris: null,
  faceVisible: false, fps: 0,
  rawOffsetX: 0, rawOffsetY: 0,
  confidence: 0, isBlink: false, is5PointCalibrated: false,
  gazeT: 0, headYaw: 0,
  leftEyeX: 0.5, leftEyeY: 0.5,
  rightEyeX: 0.5, rightEyeY: 0.5,
  distanceCm: 55,
  distanceStatus: 'searching',
};

export const EMPTY_SESSION: SessionData = {
  gazeHistory: [], headHistory: [], analytics: null, durationMs: 0,
};

export const HUD_SYNC_INTERVAL_MS = 80;

export interface EyeTracingPoint {
  t: number;             // Timestamp (ms)
  targetX: number;       // Normalised target X [0, 1]
  targetY: number;       // Normalised target Y [0, 1]
  rightEyeX: number;     // Normalised right eye position X [0, 1]
  rightEyeY: number;     // Normalised right eye position Y [0, 1]
  leftEyeX: number;      // Normalised left eye position X [0, 1]
  leftEyeY: number;      // Normalised left eye position Y [0, 1]
  isBlink?: boolean;
}

/**
 * Position of the pursuit target at a given moment, normalised to [0,1].
 */
export function targetPositionAt(
  elapsedSec: number,
  pattern: PursuitPattern,
  speedHz: number,
): { x: number; y: number } {
  const phase = elapsedSec * speedHz * Math.PI * 2;
  switch (pattern) {
    case 'horizontal': return { x: 0.5 + 0.35 * Math.sin(phase), y: 0.5 };
    case 'vertical':   return { x: 0.5, y: 0.5 + 0.30 * Math.sin(phase) };
    case 'circular':   return { x: 0.5 + 0.30 * Math.cos(phase), y: 0.5 + 0.25 * Math.sin(phase) };
    case 'vor-x2':     return { x: 0.5 - 0.35 * Math.sin(phase), y: 0.5 };
    case 'saccadic': {
      const stepIdx = Math.floor(elapsedSec / 1.5) % 4;
      const positions = [0.15, 0.5, 0.85, 0.5];
      return { x: positions[stepIdx], y: 0.5 };
    }
    case 'optokinetic':
      return { x: oknTargetX(elapsedSec), y: 0.5 };
  }
}

export const VOR_COLOUR = (gain: number) =>
  gain >= 0.9 ? '#10b981' : gain >= 0.7 ? '#22c55e' : gain >= 0.5 ? '#f59e0b' : '#ef4444';

export function drawGazeOverlay(
  ctx: CanvasRenderingContext2D,
  w: number, h: number,
  face: { points: Array<{ x: number; y: number }> },
  gp: GazePoint,
) {
  ctx.fillStyle = 'rgba(20,184,166,0.35)';
  for (const pt of face.points) {
    ctx.fillRect(pt.x - 1, pt.y - 1, 2.5, 2.5);
  }

  if (gp.leftIris) {
    drawIrisCircle(ctx, gp.leftIris.x, gp.leftIris.y, '#22d3ee');
  }
  if (gp.rightIris) {
    drawIrisCircle(ctx, gp.rightIris.x, gp.rightIris.y, '#22d3ee');
  }
}

export function drawIrisCircle(ctx: CanvasRenderingContext2D, x: number, y: number, color: string) {
  ctx.beginPath();
  ctx.arc(x, y, 8, 0, Math.PI * 2);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(x, y, 2, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
}

export function drawSearching(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = 'rgba(15,23,42,0.7)';
  ctx.fillRect(0, 0, w, h);
}
