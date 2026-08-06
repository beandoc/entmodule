/**
 * Browser-side face tracking for the vertigo coach.
 *
 * Everything that touches the DOM, the camera, or the MediaPipe WASM runtime
 * lives here; the angle maths it feeds lives in `vestibular-rx.ts` and is
 * unit-tested in isolation.
 *
 * When `refineLandmarks: true` is set, the FaceLandmarker model returns 478
 * points (standard 468 + 10 iris refinement points). This enables gaze
 * tracking via extractGazeFromLandmarks().
 */

import {
  eulerFromMatrix, poseFromAnchors, clampPose, mirrorPose,
  type HeadPose, type FaceAnchors, type Point2D,
} from './vestibular-rx';
import { extractGazeFromLandmarks, type GazePoint } from './gaze-tracking';

const TASKS_VISION_VERSION = '0.10.14';
const CDN = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${TASKS_VISION_VERSION}`;
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

/**
 * FaceMesh canonical indices. The landmarker emits 478 points; these are the
 * ones the pose fallback and the skeleton overlay need.
 */
export const LANDMARK = {
  noseTip: 1,
  leftEye: 33,
  rightEye: 263,
  leftContour: 234,
  rightContour: 454,
  chin: 152,
  forehead: 10,
} as const;

/** A sparse ring of contour points, enough to read as a face mesh without 478 dots. */
export const OVERLAY_POINTS = [
  10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378,
  400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21,
  54, 103, 67, 109, 33, 133, 263, 362, 1, 168, 6, 197, 195, 5, 4, 61, 291, 13, 14,
];

export type TrackerBackend = 'facelandmarker' | 'unavailable';

export interface TrackerStatus {
  backend: TrackerBackend;
  /** True once the model is ready to accept frames. */
  ready: boolean;
  /** 'gpu' or 'cpu' — the delegate that actually initialised. */
  delegate: 'gpu' | 'cpu' | null;
  error: string | null;
}

export interface TrackedFace {
  pose: HeadPose;
  /** Whether the pose came from the 4x4 transformation matrix or the 2D fallback. */
  source: 'matrix' | 'anchors';
  /** Landmark positions in canvas pixels, already mirrored for the selfie view. */
  points: Point2D[];
  anchors: FaceAnchors;
  /**
   * Normalised gaze point [0,1] derived from iris landmarks (when refineLandmarks
   * returns 478 points) or from eye-anchor midpoint as fallback.
   */
  gazePoint: GazePoint;
}

let loadPromise: Promise<any> | null = null;

/**
 * Load the tasks-vision bundle straight from the CDN. `webpackIgnore` keeps
 * Next's bundler from trying to resolve the URL at build time, so the app still
 * builds — and still runs, degraded — on a machine with no network.
 */
async function loadVisionModule(): Promise<any> {
  if (!loadPromise) {
    loadPromise = import(
      /* webpackIgnore: true */
      // @ts-ignore - resolved at runtime from the CDN, not by the bundler
      `${CDN}/vision_bundle.mjs`
    ).catch((err) => {
      // Let a later attempt retry rather than caching the rejection forever.
      loadPromise = null;
      throw err;
    });
  }
  return loadPromise;
}

export interface FaceTracker {
  status: TrackerStatus;
  /** Returns null when no face is in frame. */
  detect(
    video: HTMLVideoElement,
    timestampMs: number,
    width: number,
    height: number,
    neutralGazeOffset?: { x: number; y: number },
  ): TrackedFace | null;
  close(): void;
}

export async function createFaceTracker(): Promise<FaceTracker> {
  const vision = await loadVisionModule();
  const fileset = await vision.FilesetResolver.forVisionTasks(`${CDN}/wasm`);

  let landmarker: any = null;
  let delegate: 'gpu' | 'cpu' = 'gpu';

  const options = (d: 'GPU' | 'CPU') => ({
    baseOptions: { modelAssetPath: MODEL_URL, delegate: d },
    runningMode: 'VIDEO',
    numFaces: 1,
    outputFacialTransformationMatrixes: true,
    outputFaceBlendshapes: false,
    // refineLandmarks: true unlocks iris landmark points (indices 468–477)
    // giving us precise pupil centres for gaze tracking at no extra model cost.
    refineLandmarks: true,
  });

  try {
    landmarker = await vision.FaceLandmarker.createFromOptions(fileset, options('GPU'));
  } catch {
    // Software rendering, a locked-down GPU driver, or a headless browser.
    landmarker = await vision.FaceLandmarker.createFromOptions(fileset, options('CPU'));
    delegate = 'cpu';
  }

  const status: TrackerStatus = { backend: 'facelandmarker', ready: true, delegate, error: null };
  let lastTimestamp = -1;

  return {
    status,

    detect(video, timestampMs, width, height, neutralGazeOffset) {
      if (!landmarker) return null;
      // detectForVideo rejects a non-increasing timestamp outright.
      if (timestampMs <= lastTimestamp) timestampMs = lastTimestamp + 1;
      lastTimestamp = timestampMs;

      let result: any;
      try {
        result = landmarker.detectForVideo(video, timestampMs);
      } catch {
        return null;
      }

      const landmarks = result?.faceLandmarks?.[0];
      if (!landmarks || landmarks.length === 0) return null;

      // The preview is mirrored, so x is flipped on the way into canvas space.
      const toCanvas = (i: number): Point2D => ({
        x: (1 - landmarks[i].x) * width,
        y: landmarks[i].y * height,
      });

      const anchors: FaceAnchors = {
        nose: toCanvas(LANDMARK.noseTip),
        leftEye: toCanvas(LANDMARK.leftEye),
        rightEye: toCanvas(LANDMARK.rightEye),
        leftContour: toCanvas(LANDMARK.leftContour),
        rightContour: toCanvas(LANDMARK.rightContour),
        chin: toCanvas(LANDMARK.chin),
        forehead: toCanvas(LANDMARK.forehead),
      };

      const matrix = result?.facialTransformationMatrixes?.[0]?.data;
      let pose: HeadPose;
      let source: TrackedFace['source'];

      if (matrix && matrix.length >= 16) {
        pose = clampPose(mirrorPose(eulerFromMatrix(matrix)));
        source = 'matrix';
      } else {
        pose = poseFromAnchors(anchors);
        source = 'anchors';
      }

      const points = OVERLAY_POINTS.filter((i) => i < landmarks.length).map(toCanvas);

      // Extract gaze point from iris landmarks (or fallback if < 478 pts) with head pose compensation
      const gazePoint = extractGazeFromLandmarks(landmarks, width, height, timestampMs, neutralGazeOffset, pose);

      return { pose, source, points, anchors, gazePoint };
    },

    close() {
      try {
        landmarker?.close?.();
      } catch {
        // Already torn down.
      }
      landmarker = null;
      status.ready = false;
    },
  };
}

/* ------------------------------------------------------------------ camera */

export interface CameraHandle {
  stream: MediaStream;
  stop(): void;
}

export async function openCamera(video: HTMLVideoElement): Promise<CameraHandle> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    throw new Error('no-media-devices');
  }

  let stream: MediaStream;
  try {
    // Explicitly request 60 FPS stream for dynamic head-turn tracking
    stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: 'user',
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { ideal: 60, min: 30 },
      },
      audio: false,
    });
  } catch (err) {
    const name = (err as { name?: string })?.name;
    // A permission refusal must not be retried as a constraint problem.
    if (name === 'NotAllowedError' || name === 'SecurityError') throw err;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', frameRate: { ideal: 60, min: 30 } },
        audio: false,
      });
    } catch {
      stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    }
  }

  video.srcObject = stream;
  video.muted = true;
  video.setAttribute('playsinline', 'true'); // iOS Safari refuses to play inline without it
  await video.play();

  return {
    stream,
    stop() {
      stream.getTracks().forEach((track) => track.stop());
      if (video.srcObject === stream) video.srcObject = null;
    },
  };
}

/** Human-readable reason a camera failed to open. */
export function cameraErrorKey(err: unknown): 'denied' | 'not-found' | 'in-use' | 'insecure' | 'unknown' {
  if (typeof window !== 'undefined' && !window.isSecureContext) return 'insecure';
  const name = (err as { name?: string })?.name;
  if (name === 'NotAllowedError' || name === 'SecurityError') return 'denied';
  if (name === 'NotFoundError' || name === 'OverconstrainedError') return 'not-found';
  if (name === 'NotReadableError' || name === 'AbortError') return 'in-use';
  if ((err as Error)?.message === 'no-media-devices') return 'not-found';
  return 'unknown';
}
