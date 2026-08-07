/**
 * voice-capture.ts - microphone I/O for the post-operative voice protocol.
 *
 * Device layer only: opens the mic, streams raw PCM, encodes WAV. All analysis
 * lives in voice-dsp.ts. This mirrors the split between vestibular-tracking.ts
 * (device) and gaze-tracking.ts (analysis).
 *
 * Two decisions here are load-bearing.
 *
 * 1. MediaRecorder is never used. It encodes to Opus or AAC, and lossy coding of
 *    a dysphonic voice is exactly the kind of damage that makes phone-recorded
 *    acoustic measures untrustworthy. Capturing through an AudioWorklet keeps
 *    Float32 PCM end to end, so there is no lossy stage to design around.
 *
 * 2. No sampleRate constraint is requested. Asking for a specific rate can push
 *    iOS into its voice-processing path, which is the thing we are trying to
 *    avoid. Capture runs at whatever the device offers and voice-dsp resamples
 *    if a caller needs it.
 *
 * Note on getUserMedia audio constraints: setting autoGainControl,
 * echoCancellation and noiseSuppression to false is necessary but NOT
 * sufficient. iOS Safari may report the constraints as applied while still
 * running its own processing. That is why every session persists the settings
 * actually granted (see describeDevice) and why the metric set in voice-dsp.ts
 * is restricted to durations, rates and relative spectral measures - none of
 * which depend on absolute gain being untouched.
 */

/* ------------------------------------------------------------------ types */

export interface MicSettings {
  sampleRate: number;
  channelCount?: number;
  autoGainControl?: boolean;
  echoCancellation?: boolean;
  noiseSuppression?: boolean;
  deviceId?: string;
  label?: string;
}

export interface MicHandle {
  stream: MediaStream;
  context: AudioContext;
  sampleRate: number;
  /** MediaTrackSettings as actually granted, not as requested. */
  settings: MicSettings;
  /** Begin buffering PCM. Returns immediately. */
  start(): void;
  /** Stop buffering and return everything captured since the last start(). */
  takeBuffer(): Float32Array;
  /** Live level in dBFS for the meter. Cheap; safe to poll from rAF. */
  level(): number;
  stop(): void;
}

export type MicErrorKey = 'denied' | 'not-found' | 'in-use' | 'insecure' | 'unsupported' | 'unknown';

/* ------------------------------------------------------------ worklet source */

// Registered from a Blob URL because the repo has no static worklet asset
// pipeline - the same runtime-loading approach vestibular-tracking.ts uses for
// MediaPipe. Forwards raw frames untouched; all decisions happen on the main
// thread so this stays trivially auditable.
const WORKLET_SOURCE = `
class VoiceCaptureProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.recording = false;
    this.port.onmessage = (e) => {
      if (e.data === 'start') this.recording = true;
      else if (e.data === 'stop') this.recording = false;
    };
  }
  process(inputs) {
    const input = inputs[0];
    if (!input || !input[0]) return true;
    const channel = input[0];
    let peak = 0;
    let sumSq = 0;
    for (let i = 0; i < channel.length; i += 1) {
      const v = channel[i];
      sumSq += v * v;
      const a = v < 0 ? -v : v;
      if (a > peak) peak = a;
    }
    this.port.postMessage({
      rms: Math.sqrt(sumSq / channel.length),
      peak,
      pcm: this.recording ? new Float32Array(channel) : null,
    });
    return true;
  }
}
registerProcessor('voice-capture', VoiceCaptureProcessor);
`;

/* ---------------------------------------------------------------- open mic */

export async function openMicrophone(): Promise<MicHandle> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    throw new Error('no-media-devices');
  }

  // Deliberately no sampleRate here - see the file header.
  const wanted: MediaStreamConstraints = {
    audio: {
      channelCount: { ideal: 1 },
      autoGainControl: false,
      echoCancellation: false,
      noiseSuppression: false,
    },
    video: false,
  };

  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia(wanted);
  } catch (err) {
    const name = (err as { name?: string })?.name;
    // A permission refusal must not be retried as a constraint problem.
    if (name === 'NotAllowedError' || name === 'SecurityError') throw err;
    // Some Android builds reject the processing flags outright rather than
    // ignoring them. A plain stream still yields usable duration and rate
    // measures; describeDevice() records that the flags did not stick.
    stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
  }

  const Ctor: typeof AudioContext | undefined =
    typeof window !== 'undefined'
      ? window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      : undefined;
  if (!Ctor) {
    stream.getTracks().forEach((t) => t.stop());
    throw new Error('no-audio-context');
  }

  const context = new Ctor();
  if (context.state === 'suspended') await context.resume();

  const source = context.createMediaStreamSource(stream);

  const chunks: Float32Array[] = [];
  let recording = false;
  let lastRms = 0;
  let node: AudioNode;
  let post: ((msg: string) => void) | null = null;

  const ingest = (pcm: Float32Array | null, rms: number) => {
    lastRms = rms;
    if (pcm) chunks.push(pcm);
  };

  if (context.audioWorklet) {
    const url = URL.createObjectURL(new Blob([WORKLET_SOURCE], { type: 'application/javascript' }));
    try {
      await context.audioWorklet.addModule(url);
    } finally {
      URL.revokeObjectURL(url);
    }
    const worklet = new AudioWorkletNode(context, 'voice-capture');
    worklet.port.onmessage = (e) => ingest(e.data.pcm as Float32Array | null, e.data.rms as number);
    post = (msg) => worklet.port.postMessage(msg);
    node = worklet;
  } else {
    // Older Safari. Deprecated and runs on the main thread, but it still yields
    // untouched Float32 - which is the only property that matters here.
    const BUFFER = 2048;
    const legacy = context.createScriptProcessor(BUFFER, 1, 1);
    legacy.onaudioprocess = (e) => {
      const channel = e.inputBuffer.getChannelData(0);
      let sumSq = 0;
      for (let i = 0; i < channel.length; i += 1) sumSq += channel[i] * channel[i];
      ingest(recording ? new Float32Array(channel) : null, Math.sqrt(sumSq / channel.length));
    };
    node = legacy;
  }

  source.connect(node);
  // A zero-gain sink keeps the graph pulling without any monitoring path back to
  // the speaker, which would otherwise feed back into the mic.
  const sink = context.createGain();
  sink.gain.value = 0;
  node.connect(sink);
  sink.connect(context.destination);

  const track = stream.getAudioTracks()[0];
  const granted = (track?.getSettings?.() ?? {}) as MediaTrackSettings;

  return {
    stream,
    context,
    sampleRate: context.sampleRate,
    settings: {
      sampleRate: context.sampleRate,
      channelCount: granted.channelCount,
      autoGainControl: granted.autoGainControl,
      echoCancellation: granted.echoCancellation,
      noiseSuppression: granted.noiseSuppression,
      deviceId: granted.deviceId,
      label: track?.label,
    },
    start() {
      chunks.length = 0;
      recording = true;
      post?.('start');
    },
    takeBuffer() {
      recording = false;
      post?.('stop');
      const total = chunks.reduce((a, c) => a + c.length, 0);
      const out = new Float32Array(total);
      let offset = 0;
      for (const c of chunks) { out.set(c, offset); offset += c.length; }
      chunks.length = 0;
      return out;
    },
    level() {
      return Math.max(-120, 20 * Math.log10(lastRms + 1e-12));
    },
    stop() {
      try { post?.('stop'); } catch { /* node already torn down */ }
      try { source.disconnect(); node.disconnect(); sink.disconnect(); } catch { /* idem */ }
      stream.getTracks().forEach((t) => t.stop());
      if (context.state !== 'closed') void context.close();
    },
  };
}

/** Human-readable reason a microphone failed to open. */
export function micErrorKey(err: unknown): MicErrorKey {
  if (typeof window !== 'undefined' && !window.isSecureContext) return 'insecure';
  const name = (err as { name?: string })?.name;
  if (name === 'NotAllowedError' || name === 'SecurityError') return 'denied';
  if (name === 'NotFoundError' || name === 'OverconstrainedError') return 'not-found';
  if (name === 'NotReadableError' || name === 'AbortError') return 'in-use';
  const message = (err as Error)?.message;
  if (message === 'no-media-devices') return 'not-found';
  if (message === 'no-audio-context') return 'unsupported';
  return 'unknown';
}

/* ------------------------------------------------------------ device record */

export interface DeviceDescriptor {
  /** Stable per-device string. Longitudinal comparison is only valid within one. */
  fingerprint: string;
  settings: MicSettings;
  /**
   * True when the browser confirmed all three processing flags are off. False
   * means gain may have been altered under us - notably on iOS, which reports
   * success while still processing. Recorded rather than acted on: it is the
   * clinician's cue that a level-sensitive comparison is unsafe.
   */
  processingDisabled: boolean;
}

export function describeDevice(handle: MicHandle): DeviceDescriptor {
  const s = handle.settings;
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown';
  return {
    fingerprint: `${hashString(ua)}-${s.sampleRate}-${hashString(s.label ?? s.deviceId ?? '')}`,
    settings: s,
    processingDisabled:
      s.autoGainControl === false && s.echoCancellation === false && s.noiseSuppression === false,
  };
}

/** FNV-1a. Not cryptographic - this only needs to be stable and short. */
function hashString(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

/* -------------------------------------------------------------------- WAV */

/**
 * 16-bit PCM WAV. Used only when a patient has separately consented to raw audio
 * retention; the default path stores derived features and discards the audio.
 */
export function encodeWav(pcm: Float32Array, sampleRate: number): Blob {
  const buffer = new ArrayBuffer(44 + pcm.length * 2);
  const view = new DataView(buffer);

  const writeAscii = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i += 1) view.setUint8(offset + i, text.charCodeAt(i));
  };

  writeAscii(0, 'RIFF');
  view.setUint32(4, 36 + pcm.length * 2, true);
  writeAscii(8, 'WAVE');
  writeAscii(12, 'fmt ');
  view.setUint32(16, 16, true);          // PCM chunk size
  view.setUint16(20, 1, true);           // format: PCM
  view.setUint16(22, 1, true);           // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // byte rate
  view.setUint16(32, 2, true);           // block align
  view.setUint16(34, 16, true);          // bits per sample
  writeAscii(36, 'data');
  view.setUint32(40, pcm.length * 2, true);

  for (let i = 0; i < pcm.length; i += 1) {
    const s = Math.max(-1, Math.min(1, pcm[i]));
    view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Blob([buffer], { type: 'audio/wav' });
}

/* ------------------------------------------------------------------ timing */

/** Buffer for `seconds`, then resolve with what was captured. */
export function recordFor(handle: MicHandle, seconds: number): Promise<Float32Array> {
  handle.start();
  return new Promise((resolve) => {
    setTimeout(() => resolve(handle.takeBuffer()), seconds * 1000);
  });
}
