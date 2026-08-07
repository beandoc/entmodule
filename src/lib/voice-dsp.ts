/**
 * voice-dsp.ts - acoustic analysis primitives for post-operative voice monitoring.
 *
 * Deliberately React-free and alias-free so scripts/test-voice.mjs can import it
 * directly under `node --experimental-strip-types`, matching gaze-tracking.ts
 * and vestibular-rx.ts.
 *
 * Scope note: this module is built for cohorts that retain a glottal source
 * (partial laryngectomy / cordectomy, and organ-preservation chemoradiation).
 *
 * Metric selection rationale
 * --------------------------
 * Jitter and shimmer are deliberately NOT implemented. The usual justification
 * is codec damage, which is actually avoidable - see voice-capture.ts, which
 * never touches MediaRecorder and keeps raw Float32 throughout. The real reason
 * is clinical: cycle-to-cycle perturbation measures require reliable cycle
 * boundaries, and they lose meaning exactly where this cohort lives, on
 * aperiodic and severely dysphonic voices.
 *
 * CPPS is used instead because it degrades gracefully on aperiodic voices and
 * needs no F0 tracking. Every metric here is either a duration, a rate or a
 * relative spectral measure, so none depends on absolute recording level - which
 * matters because iOS Safari does not reliably honour autoGainControl:false.
 *
 * Portability warning: absolute CPPS is NOT comparable across microphones,
 * mouth-to-mic distances or analysis window settings, and published cutoffs are
 * tied to the rig that produced them. Consumers must interpret these values as
 * within-patient change against that patient's own baseline. See voice-rx.ts.
 */

export type Samples = Float32Array | number[];

const EPS = 1e-12;

// ----------------------------------------------------
// Small helpers
// ----------------------------------------------------

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function toFloat32(input: Samples): Float32Array {
  return input instanceof Float32Array ? input : Float32Array.from(input);
}

export function rms(frame: Samples): number {
  const x = toFloat32(frame);
  if (x.length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < x.length; i += 1) sum += x[i] * x[i];
  return Math.sqrt(sum / x.length);
}

/** Full-scale-referenced level. Silence floors at -120 dBFS rather than -Infinity. */
export function rmsDb(frame: Samples): number {
  return Math.max(-120, 20 * Math.log10(rms(frame) + EPS));
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function stdev(values: number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  return Math.sqrt(values.reduce((a, b) => a + (b - m) * (b - m), 0) / (values.length - 1));
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = clamp(Math.round((p / 100) * (sorted.length - 1)), 0, sorted.length - 1);
  return sorted[idx];
}

function nextPow2(n: number): number {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

// ----------------------------------------------------
// FFT
// ----------------------------------------------------

/**
 * In-place iterative radix-2 Cooley-Tukey FFT. `re` and `im` must be the same
 * power-of-two length.
 *
 * Written by hand because the repo carries no DSP dependency (five runtime deps
 * total) and because AnalyserNode is unusable for this work: it applies its own
 * temporal smoothing and exposes only magnitudes, while cepstral analysis needs
 * unsmoothed spectra frame by frame.
 */
export function fft(re: Float32Array, im: Float32Array): void {
  const n = re.length;
  if (n <= 1) return;
  if ((n & (n - 1)) !== 0) throw new Error(`fft: length ${n} is not a power of two`);

  // Bit-reversal permutation.
  for (let i = 1, j = 0; i < n; i += 1) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      const tr = re[i]; re[i] = re[j]; re[j] = tr;
      const ti = im[i]; im[i] = im[j]; im[j] = ti;
    }
  }

  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wRe = Math.cos(ang);
    const wIm = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let curRe = 1;
      let curIm = 0;
      for (let k = 0; k < len / 2; k += 1) {
        const aRe = re[i + k];
        const aIm = im[i + k];
        const bRe = re[i + k + len / 2] * curRe - im[i + k + len / 2] * curIm;
        const bIm = re[i + k + len / 2] * curIm + im[i + k + len / 2] * curRe;
        re[i + k] = aRe + bRe;
        im[i + k] = aIm + bIm;
        re[i + k + len / 2] = aRe - bRe;
        im[i + k + len / 2] = aIm - bIm;
        const nextRe = curRe * wRe - curIm * wIm;
        curIm = curRe * wIm + curIm * wRe;
        curRe = nextRe;
      }
    }
  }
}

/** Periodic Hann window of length n. */
export function hann(n: number): Float32Array {
  const w = new Float32Array(n);
  for (let i = 0; i < n; i += 1) w[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / n);
  return w;
}

// ----------------------------------------------------
// Framing
// ----------------------------------------------------

export interface FrameGrid {
  frames: Float32Array[];
  frameLen: number;
  hopLen: number;
  /** Centre time of each frame, seconds. */
  times: number[];
}

export function frameSignal(
  pcm: Samples,
  sampleRate: number,
  frameMs: number,
  hopMs: number,
): FrameGrid {
  const x = toFloat32(pcm);
  const frameLen = Math.max(2, Math.round((frameMs / 1000) * sampleRate));
  const hopLen = Math.max(1, Math.round((hopMs / 1000) * sampleRate));
  const frames: Float32Array[] = [];
  const times: number[] = [];
  for (let start = 0; start + frameLen <= x.length; start += hopLen) {
    frames.push(x.subarray(start, start + frameLen));
    times.push((start + frameLen / 2) / sampleRate);
  }
  return { frames, frameLen, hopLen, times };
}

// ----------------------------------------------------
// Noise floor, clipping
// ----------------------------------------------------

/**
 * Room noise floor in dBFS, taken as the 10th percentile of short-frame levels
 * so that incidental speech or knocks in the calibration take do not inflate it.
 */
export function estimateNoiseFloorDb(pcm: Samples, sampleRate: number): number {
  const { frames } = frameSignal(pcm, sampleRate, 20, 10);
  if (frames.length === 0) return -120;
  return percentile(frames.map(rmsDb), 10);
}

/**
 * Fraction of samples at or beyond full scale. A clipped take invalidates CPPS
 * (clipping adds broadband harmonic energy that inflates the cepstral peak), so
 * callers should reject rather than analyse.
 */
export function clippedFraction(pcm: Samples, threshold = 0.99): number {
  const x = toFloat32(pcm);
  if (x.length === 0) return 0;
  let n = 0;
  for (let i = 0; i < x.length; i += 1) if (Math.abs(x[i]) >= threshold) n += 1;
  return n / x.length;
}

// ----------------------------------------------------
// Biquad and envelope
// ----------------------------------------------------

/**
 * Second-order RBJ high-pass, applied forward only.
 *
 * Needed for DDK: the acoustic landmark of an unvoiced stop (/p/, /t/, /k/) is a
 * broadband burst, not a peak in the raw amplitude envelope. Counting peaks on
 * the unfiltered envelope undercounts /pa-ta-ka/ badly, because low-frequency
 * vowel energy dominates and smears the burst boundaries.
 */
export function biquadHighpass(
  pcm: Samples,
  sampleRate: number,
  cutoffHz: number,
  q = 0.707,
): Float32Array {
  const x = toFloat32(pcm);
  const w0 = (2 * Math.PI * cutoffHz) / sampleRate;
  const cosW0 = Math.cos(w0);
  const alpha = Math.sin(w0) / (2 * q);

  const b0 = (1 + cosW0) / 2;
  const b1 = -(1 + cosW0);
  const b2 = (1 + cosW0) / 2;
  const a0 = 1 + alpha;
  const a1 = -2 * cosW0;
  const a2 = 1 - alpha;

  const nb0 = b0 / a0;
  const nb1 = b1 / a0;
  const nb2 = b2 / a0;
  const na1 = a1 / a0;
  const na2 = a2 / a0;

  const y = new Float32Array(x.length);
  let x1 = 0; let x2 = 0; let y1 = 0; let y2 = 0;
  for (let i = 0; i < x.length; i += 1) {
    const xi = x[i];
    const yi = nb0 * xi + nb1 * x1 + nb2 * x2 - na1 * y1 - na2 * y2;
    y[i] = yi;
    x2 = x1; x1 = xi;
    y2 = y1; y1 = yi;
  }
  return y;
}

/** Rectify and one-pole smooth. Fast attack, slower release, as in a level meter. */
export function amplitudeEnvelope(
  pcm: Samples,
  sampleRate: number,
  attackMs = 3,
  releaseMs = 15,
): Float32Array {
  const x = toFloat32(pcm);
  const aAtt = Math.exp(-1 / ((attackMs / 1000) * sampleRate));
  const aRel = Math.exp(-1 / ((releaseMs / 1000) * sampleRate));
  const env = new Float32Array(x.length);
  let e = 0;
  for (let i = 0; i < x.length; i += 1) {
    const v = Math.abs(x[i]);
    const a = v > e ? aAtt : aRel;
    e = a * e + (1 - a) * v;
    env[i] = e;
  }
  return env;
}

// ----------------------------------------------------
// CPPS - smoothed cepstral peak prominence
// ----------------------------------------------------

// Search band for the rahmonic peak, expressed as the F0 range it corresponds
// to. Wide enough to cover low male and high female post-operative voices.
const CPPS_F0_MIN_HZ = 60;
const CPPS_F0_MAX_HZ = 300;

const CPPS_FRAME_MS = 40;
const CPPS_HOP_MS = 10;

// Smoothing spans, in frames and in quefrency bins respectively. This is the
// "S" in CPPS: Hillenbrand-style averaging across both axes before peak picking.
const CPPS_TIME_SMOOTH_FRAMES = 7;
const CPPS_QUEFRENCY_SMOOTH_BINS = 11;

// A frame contributes only if it is within this many dB of the take's loudest
// frame. Keeps trailing breath and inter-token silence out of the average.
const CPPS_VOICING_RANGE_DB = 30;

// Per-frame spectral dynamic-range limit, dB below that frame's strongest bin.
//
// Without this the log of a near-empty inter-harmonic bin produces a huge
// negative excursion, and because those nulls fall between FFT bins
// unpredictably they scatter broadband noise through the cepstrum, inflating
// the regression baseline and competing with the true rahmonic. The effect is
// invisible on real recordings, which always carry a noise floor between
// harmonics, but it makes the measure non-monotonic on clean synthetic input
// and it is a latent instability on any very quiet, very periodic take.
const CPPS_SPECTRAL_FLOOR_DB = 50;

export interface CppsResult {
  /** Mean cepstral peak prominence over voiced frames, dB. */
  cppsDb: number;
  /** Fraction of frames that passed the level gate. Low values mean a poor take. */
  voicedFrameRatio: number;
  /** Per-frame CPP for voiced frames, in time order. */
  frameValues: number[];
  frameCount: number;
}

/**
 * Smoothed cepstral peak prominence.
 *
 * Pipeline per frame: Hann window -> FFT -> power spectrum -> log -> FFT again
 * -> real cepstrum in dB. Cepstra are then smoothed across time and quefrency,
 * the peak is located within the quefrency band implied by CPPS_F0_MIN/MAX_HZ,
 * and prominence is measured against a least-squares regression line fitted over
 * the cepstrum from the band's lower edge outward.
 *
 * MUST NOT be run on an MPT take. Maximum phonation drives the patient to
 * residual lung volume and voice quality collapses over the final seconds, which
 * biases CPPS downward by an amount that varies with effort rather than with
 * pathology. Use the separate comfortable-effort phonation.
 */
export function computeCPPS(pcm: Samples, sampleRate: number): CppsResult {
  const empty: CppsResult = { cppsDb: 0, voicedFrameRatio: 0, frameValues: [], frameCount: 0 };

  const { frames } = frameSignal(pcm, sampleRate, CPPS_FRAME_MS, CPPS_HOP_MS);
  if (frames.length === 0) return empty;

  const frameLen = frames[0].length;
  const fftLen = nextPow2(frameLen);
  const window = hann(frameLen);

  // Quefrency band, in cepstral bin indices. Bin index k corresponds to a
  // quefrency of k / sampleRate seconds, i.e. an F0 of sampleRate / k Hz.
  const qMin = Math.max(2, Math.floor(sampleRate / CPPS_F0_MAX_HZ));
  const qMax = Math.min(Math.floor(fftLen / 2) - 1, Math.ceil(sampleRate / CPPS_F0_MIN_HZ));
  if (qMax <= qMin + 2) return empty;

  // Stage 1: cepstrum per frame, in dB.
  const cepstra: Float32Array[] = [];
  const levels: number[] = [];

  for (const frame of frames) {
    levels.push(rmsDb(frame));

    const re = new Float32Array(fftLen);
    const im = new Float32Array(fftLen);
    for (let i = 0; i < frameLen; i += 1) re[i] = frame[i] * window[i];
    fft(re, im);

    // Log power spectrum, then treat it as a signal and transform again.
    const power = new Float32Array(fftLen);
    let maxPower = 0;
    for (let i = 0; i < fftLen; i += 1) {
      power[i] = re[i] * re[i] + im[i] * im[i];
      if (power[i] > maxPower) maxPower = power[i];
    }
    const floorPower = maxPower * Math.pow(10, -CPPS_SPECTRAL_FLOOR_DB / 10);

    const lre = new Float32Array(fftLen);
    const lim = new Float32Array(fftLen);
    for (let i = 0; i < fftLen; i += 1) {
      lre[i] = Math.log(Math.max(power[i], floorPower) + EPS);
    }
    fft(lre, lim);

    const cep = new Float32Array(Math.floor(fftLen / 2));
    for (let i = 0; i < cep.length; i += 1) {
      const magnitude = Math.sqrt(lre[i] * lre[i] + lim[i] * lim[i]) / fftLen;
      cep[i] = 20 * Math.log10(magnitude + EPS);
    }
    cepstra.push(cep);
  }

  // Stage 2: smooth across quefrency, then across time.
  const cepLen = cepstra[0].length;
  const qSmoothed = cepstra.map((cep) => movingAverage(cep, CPPS_QUEFRENCY_SMOOTH_BINS));
  const smoothed: Float32Array[] = [];
  const halfT = Math.floor(CPPS_TIME_SMOOTH_FRAMES / 2);
  for (let f = 0; f < qSmoothed.length; f += 1) {
    const acc = new Float32Array(cepLen);
    let count = 0;
    for (let d = -halfT; d <= halfT; d += 1) {
      const idx = f + d;
      if (idx < 0 || idx >= qSmoothed.length) continue;
      const src = qSmoothed[idx];
      for (let i = 0; i < cepLen; i += 1) acc[i] += src[i];
      count += 1;
    }
    for (let i = 0; i < cepLen; i += 1) acc[i] /= count;
    smoothed.push(acc);
  }

  // Stage 3: level gate, peak pick, prominence against the regression line.
  const peakLevel = levels.length ? Math.max(...levels) : -120;
  const gate = peakLevel - CPPS_VOICING_RANGE_DB;

  const frameValues: number[] = [];
  for (let f = 0; f < smoothed.length; f += 1) {
    if (levels[f] < gate) continue;

    const cep = smoothed[f];
    let peakIdx = qMin;
    let peakVal = cep[qMin];
    for (let i = qMin + 1; i <= qMax; i += 1) {
      if (cep[i] > peakVal) { peakVal = cep[i]; peakIdx = i; }
    }

    const baseline = regressionAt(cep, qMin, cepLen - 1, peakIdx);
    frameValues.push(peakVal - baseline);
  }

  if (frameValues.length === 0) return { ...empty, frameCount: frames.length };

  return {
    cppsDb: mean(frameValues),
    voicedFrameRatio: frameValues.length / frames.length,
    frameValues,
    frameCount: frames.length,
  };
}

/** Centred moving average with edge clamping. */
function movingAverage(input: Float32Array, span: number): Float32Array {
  const out = new Float32Array(input.length);
  const half = Math.floor(span / 2);
  for (let i = 0; i < input.length; i += 1) {
    let sum = 0;
    let count = 0;
    for (let d = -half; d <= half; d += 1) {
      const idx = i + d;
      if (idx < 0 || idx >= input.length) continue;
      sum += input[idx];
      count += 1;
    }
    out[i] = sum / count;
  }
  return out;
}

/** Least-squares line fitted over [from, to], evaluated at `at`. */
function regressionAt(values: Float32Array, from: number, to: number, at: number): number {
  const n = to - from + 1;
  if (n < 2) return values[clamp(at, 0, values.length - 1)];
  let sx = 0; let sy = 0; let sxx = 0; let sxy = 0;
  for (let i = from; i <= to; i += 1) {
    sx += i; sy += values[i]; sxx += i * i; sxy += i * values[i];
  }
  const denom = n * sxx - sx * sx;
  if (Math.abs(denom) < EPS) return sy / n;
  const slope = (n * sxy - sx * sy) / denom;
  const intercept = (sy - slope * sx) / n;
  return slope * at + intercept;
}

// ----------------------------------------------------
// Maximum phonation time
// ----------------------------------------------------

// Voice must exceed the measured room floor by this margin to count. Referencing
// the actual floor rather than a fixed threshold is what makes this work in a
// ward as well as a quiet room.
const MPT_VAD_MARGIN_DB = 12;

// Brief creak, a swallow or a codec-free dropout should not split one phonation
// into two. Anything longer is a genuine break and ends the take.
const MPT_BRIDGE_MS = 150;

// Shorter runs are throat-clearing, not phonation.
const MPT_MIN_RUN_MS = 300;

const MPT_FRAME_MS = 20;
const MPT_HOP_MS = 10;

export interface PhonationResult {
  onsetSec: number;
  offsetSec: number;
  /** Maximum phonation time for this trial, seconds. */
  durationSec: number;
  meanDb: number;
  /** Bridged gaps inside the phonation. A rising count suggests glottal insufficiency. */
  dropoutCount: number;
  detected: boolean;
}

/**
 * Locate the single longest sustained phonation and time it.
 *
 * Callers must run three trials and keep the maximum. Single-trial MPT is not
 * usable: within-subject variability is large and dominated by inspiratory
 * effort, so one forgotten deep breath looks exactly like clinical decline.
 */
export function detectPhonation(
  pcm: Samples,
  sampleRate: number,
  noiseFloorDb: number,
): PhonationResult {
  const none: PhonationResult = {
    onsetSec: 0, offsetSec: 0, durationSec: 0, meanDb: -120, dropoutCount: 0, detected: false,
  };

  const { frames, times } = frameSignal(pcm, sampleRate, MPT_FRAME_MS, MPT_HOP_MS);
  if (frames.length === 0) return none;

  const levels = frames.map(rmsDb);
  const threshold = noiseFloorDb + MPT_VAD_MARGIN_DB;
  const active = levels.map((db) => db >= threshold);

  const bridgeFrames = Math.round(MPT_BRIDGE_MS / MPT_HOP_MS);
  const minRunFrames = Math.round(MPT_MIN_RUN_MS / MPT_HOP_MS);

  // Collect runs of active frames, merging those separated by a short gap.
  type Run = { start: number; end: number; dropouts: number };
  const runs: Run[] = [];
  let current: Run | null = null;
  let gap = 0;

  for (let i = 0; i < active.length; i += 1) {
    if (active[i]) {
      if (current && gap > 0 && gap <= bridgeFrames) current.dropouts += 1;
      if (!current) current = { start: i, end: i, dropouts: 0 };
      current.end = i;
      gap = 0;
    } else if (current) {
      gap += 1;
      if (gap > bridgeFrames) { runs.push(current); current = null; gap = 0; }
    }
  }
  if (current) runs.push(current);

  const viable = runs.filter((r) => r.end - r.start + 1 >= minRunFrames);
  if (viable.length === 0) return none;

  const best = viable.reduce((a, b) => ((b.end - b.start) > (a.end - a.start) ? b : a));

  // Frame centres, so the half-filled frames at onset and offset roughly cancel.
  const onsetSec = times[best.start];
  const offsetSec = times[best.end];
  const inRange = levels.slice(best.start, best.end + 1);

  return {
    onsetSec,
    offsetSec,
    durationSec: Math.max(0, offsetSec - onsetSec),
    meanDb: mean(inRange),
    dropoutCount: best.dropouts,
    detected: true,
  };
}

// ----------------------------------------------------
// Diadochokinesis
// ----------------------------------------------------

const DDK_HIGHPASS_HZ = 500;

// Maximum sustainable human syllable rate is around 7-8 /s, so two peaks closer
// than this are one burst being double-counted.
const DDK_REFRACTORY_MS = 80;

// Hysteresis, as fractions of the take's 95th-percentile envelope. Using a high
// percentile rather than the maximum keeps a single loud burst from raising the
// threshold above every other syllable.
const DDK_OPEN_FRACTION = 0.30;
const DDK_CLOSE_FRACTION = 0.15;

// Those thresholds are relative to the take's own envelope, so on their own they
// would find "syllables" in anything, including an empty room. Two absolute
// gates bound them: the take must sit clear of the measured room floor, and its
// envelope must actually be bursty rather than stationary.
const DDK_MIN_SNR_DB = 12;
const DDK_MIN_ENVELOPE_CONTRAST = 3;

export interface DdkResult {
  count: number;
  /** Syllables per second, measured peak-to-peak rather than over the raw window. */
  ratePerSec: number;
  /**
   * Coefficient of variation of inter-syllable interval, percent. This is the
   * neuromuscular-consistency measure and it matters more than rate alone: a
   * patient can hold rate while becoming markedly more irregular.
   */
  intervalCvPct: number;
  peakTimes: number[];
}

/**
 * Count syllable bursts in a DDK take.
 *
 * High-passes to expose stop bursts, follows the envelope, then counts with a
 * hysteresis state machine and a refractory period - the same open/close plus
 * too-fast-rejection shape as stepRepCounter in vestibular-rx.ts.
 *
 * `noiseFloorDb` comes from the calibration take at the start of the protocol,
 * exactly as for detectPhonation.
 */
export function countDdkSyllables(
  pcm: Samples,
  sampleRate: number,
  noiseFloorDb: number,
): DdkResult {
  const empty: DdkResult = { count: 0, ratePerSec: 0, intervalCvPct: 0, peakTimes: [] };
  const x = toFloat32(pcm);
  if (x.length < sampleRate * 0.2) return empty;

  const filtered = biquadHighpass(x, sampleRate, DDK_HIGHPASS_HZ);
  const env = amplitudeEnvelope(filtered, sampleRate);

  // Subsample the envelope before percentile-sorting; full-rate sorting is
  // needlessly expensive and the estimate is unchanged.
  const stride = Math.max(1, Math.floor(sampleRate / 1000));
  const sampled: number[] = [];
  for (let i = 0; i < env.length; i += stride) sampled.push(env[i]);
  const reference = percentile(sampled, 95);
  if (reference <= EPS) return empty;

  // Absolute gate: is there anything here above the room?
  if (20 * Math.log10(reference + EPS) < noiseFloorDb + DDK_MIN_SNR_DB) return empty;

  // Contrast gate: bursts alternate with gaps, stationary noise does not.
  const quiet = percentile(sampled, 10);
  if (reference < quiet * DDK_MIN_ENVELOPE_CONTRAST) return empty;

  const openLevel = reference * DDK_OPEN_FRACTION;
  const closeLevel = reference * DDK_CLOSE_FRACTION;
  const refractory = Math.round((DDK_REFRACTORY_MS / 1000) * sampleRate);

  const peakTimes: number[] = [];
  let armed = true;
  let inBurst = false;
  let peakVal = 0;
  let peakIdx = 0;
  let lastPeakIdx = -Infinity;

  for (let i = 0; i < env.length; i += 1) {
    const v = env[i];
    if (!inBurst) {
      if (armed && v >= openLevel) { inBurst = true; peakVal = v; peakIdx = i; }
    } else {
      if (v > peakVal) { peakVal = v; peakIdx = i; }
      if (v < closeLevel) {
        inBurst = false;
        if (peakIdx - lastPeakIdx >= refractory) {
          peakTimes.push(peakIdx / sampleRate);
          lastPeakIdx = peakIdx;
        }
      }
    }
    armed = true;
  }
  // A burst still open when the take ends is a real syllable.
  if (inBurst && peakIdx - lastPeakIdx >= refractory) peakTimes.push(peakIdx / sampleRate);

  if (peakTimes.length < 2) {
    return { count: peakTimes.length, ratePerSec: 0, intervalCvPct: 0, peakTimes };
  }

  const intervals: number[] = [];
  for (let i = 1; i < peakTimes.length; i += 1) intervals.push(peakTimes[i] - peakTimes[i - 1]);

  const span = peakTimes[peakTimes.length - 1] - peakTimes[0];
  const m = mean(intervals);

  return {
    count: peakTimes.length,
    ratePerSec: span > 0 ? (peakTimes.length - 1) / span : 0,
    intervalCvPct: m > 0 ? (stdev(intervals) / m) * 100 : 0,
    peakTimes,
  };
}

// ----------------------------------------------------
// Resampling
// ----------------------------------------------------

/**
 * Decimate with a one-pole anti-alias pre-filter and linear interpolation.
 *
 * Capture runs at whatever the device gives (typically 44.1 or 48 kHz) because
 * requesting a specific rate through getUserMedia constraints can push iOS into
 * its voice-processing path. Analysis at native rate is fine; this exists for
 * callers that want to shrink a retained take before upload.
 */
export function resample(pcm: Samples, fromRate: number, toRate: number): Float32Array {
  const x = toFloat32(pcm);
  if (fromRate === toRate || x.length === 0) return Float32Array.from(x);

  let source = x;
  if (toRate < fromRate) {
    const cutoff = toRate / 2;
    const alpha = Math.exp((-2 * Math.PI * cutoff) / fromRate);
    const filtered = new Float32Array(x.length);
    let y = 0;
    for (let i = 0; i < x.length; i += 1) { y = alpha * y + (1 - alpha) * x[i]; filtered[i] = y; }
    source = filtered;
  }

  const ratio = fromRate / toRate;
  const outLen = Math.floor(x.length / ratio);
  const out = new Float32Array(outLen);
  for (let i = 0; i < outLen; i += 1) {
    const pos = i * ratio;
    const i0 = Math.floor(pos);
    const i1 = Math.min(i0 + 1, source.length - 1);
    const frac = pos - i0;
    out[i] = source[i0] * (1 - frac) + source[i1] * frac;
  }
  return out;
}
