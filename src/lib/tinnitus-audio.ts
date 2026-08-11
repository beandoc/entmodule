/**
 * Tinnitus Relief Studio — Web Audio synthesis engine.
 *
 * Implements Acoustic Coordinated Reset Neuromodulation (ACRN) after Tass et al.,
 * plus notched and broadband maskers. Everything is synthesised at runtime, so the
 * offline PWA ships no audio assets.
 *
 * ACRN coefficients and timing follow the reference implementation at
 * https://github.com/r4ai/tinnitus-reducer-acrn (src/lib/Sequence.svelte, constants.ts).
 *
 * SAFETY: output here is uncalibrated dBFS, not dB SPL. Real ear level depends on the
 * patient's headphones and device volume, so this is not a diagnostic audiometer.
 * Every path is clamped by MASTER_CEILING and ramped — never stepped — to avoid the
 * onset transients that are poorly tolerated in hyperacusis.
 */

export type NoiseColor = 'white' | 'pink' | 'brown';
export type SoundscapePreset = 'none' | 'ocean' | 'rain' | 'stream';
export type BinauralPreset = 'none' | 'delta' | 'theta' | 'alpha' | 'beta';
export type EngineMode = 'idle' | 'pitch' | 'tone' | 'acrn' | 'notched' | 'broadband' | 'binaural' | 'soundscape';

export interface BinauralConfig {
  name: string;
  nameHi: string;
  baseHz: number;
  beatHz: number;
  desc: string;
  descHi: string;
}

export const BINAURAL_PRESETS: Record<Exclude<BinauralPreset, 'none'>, BinauralConfig> = {
  alpha: {
    name: 'Alpha (10 Hz)',
    nameHi: 'अल्फा (10 Hz)',
    baseHz: 400,
    beatHz: 10.0,
    desc: 'Restful awareness & tinnitus distress reduction',
    descHi: 'शांत एकाग्रता और टिनिटस तनाव में कमी',
  },
  theta: {
    name: 'Theta (6 Hz)',
    nameHi: 'थीटा (6 Hz)',
    baseHz: 350,
    beatHz: 6.0,
    desc: 'Deep relaxation & pre-sleep transition',
    descHi: 'गहरी विश्रांति और नींद से पहले की स्थिति',
  },
  delta: {
    name: 'Delta (2.5 Hz)',
    nameHi: 'डेल्टा (2.5 Hz)',
    baseHz: 250,
    beatHz: 2.5,
    desc: 'Deep sleep onset & night-time tinnitus relief',
    descHi: 'गहरी नींद और रात के समय टिनिटस से राहत',
  },
  beta: {
    name: 'Beta (18 Hz)',
    nameHi: 'बीटा (18 Hz)',
    baseHz: 400,
    beatHz: 18.0,
    desc: 'Active focus & daytime mental clarity',
    descHi: 'सक्रिय ध्यान और दिन के समय मानसिक स्पष्टता',
  },
};

export const EQ_FREQUENCIES = [125, 500, 1000, 3000, 6000, 12000] as const;
export type EqGains = [number, number, number, number, number, number];
export const DEFAULT_EQ_GAINS: EqGains = [0, 0, 0, 0, 0, 0];

/** What the filters will accept. The patient-facing control is cut-only — see EQ_UI_GAIN_LIMIT_DB. */
export const EQ_GAIN_LIMIT_DB = { min: -12, max: 12 };

/**
 * Boost is deliberately withheld from the patient. Shaping for comfort means taking energy out;
 * adding up to +12 dB at 6-12 kHz for hours a day — the region already damaged in the
 * noise-exposed and presbycusic — is hearing-aid prescription, and this output is uncalibrated.
 */
export const EQ_UI_GAIN_LIMIT_DB = { min: -12, max: 0 };

/**
 * Linear coefficients applied to the matched tinnitus frequency to derive the four
 * ACRN treatment tones — two below fT, two above.
 */
export const ACRN_COEFFICIENTS = [
  { m: 0.773, c: -44.5 },
  { m: 0.903, c: -21.5 },
  { m: 1.09, c: 52.0 },
  { m: 1.395, c: 26.5 },
];

export const ACRN_DEFAULTS = {
  /** 180 bpm gives a cycle repetition rate of 1.5 Hz (T = 0.667 s) per the source paper. */
  bpm: 180,
  /** Cycles of four tones played before the rest block. */
  loopRepeat: 3,
  /** Silent slots appended after the tone cycles. */
  restLength: 8,
};

export const ACRN_LIMITS = {
  MIN_BPM: 60,
  MAX_BPM: 540,
  MIN_LOOP_REPEAT: 1,
  MAX_LOOP_REPEAT: 10,
  MIN_REST_LENGTH: 0,
  MAX_REST_LENGTH: 64,
};

export const AUDIO_LIMITS = {
  MIN_FREQUENCY: 100,
  MAX_FREQUENCY: 14000,
  MIN_LEVEL_DB: -80,
  MAX_LEVEL_DB: 0,
  DEFAULT_LEVEL_DB: -45,
  /**
   * Hard linear ceiling on the master bus (~-12 dBFS). Even at slider maximum with the
   * device turned all the way up, output stays below a level that could startle or hurt.
   */
  MASTER_CEILING: 0.25,
  /** Fade applied to every start and stop, in seconds. */
  FADE_SECONDS: 0.15,
  MAX_SESSION_MINUTES: 180,
  DEFAULT_SESSION_MINUTES: 60,
};

/** Tone.js PolySynth envelope defaults carried over from the reference implementation. */
export const TONE_ENVELOPE = {
  attack: 0.1,
  decay: 0,
  sustain: 0.07,
  release: 0.08,
};

/**
 * A zero-length decay ramp produces a step discontinuity, which is audible as a click.
 * One millisecond is inaudible as a slope but removes the transient.
 */
const DECAY_EPSILON = 0.001;

const SCHEDULER_INTERVAL_MS = 25;
const SCHEDULE_AHEAD_SECONDS = 0.1;
const PARAM_RAMP_SECONDS = 0.05;
const NOISE_BUFFER_SECONDS = 4;

/**
 * All noise colours are normalised to this RMS. Raw white noise is roughly 9 dB hotter
 * than the pink and brown generators, so without this, changing colour mid-session
 * would step the loudness — the exact jump the fades elsewhere exist to prevent.
 */
const NOISE_TARGET_RMS = 0.2;

/** Per-section Q for the notch cascade. Narrow enough that three sections stack without the
 *  skirts spilling an octave either side of fT. */
const NOTCH_Q = 4;

export function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, value));
}

export function clampFrequency(hz: number): number {
  return clamp(hz, AUDIO_LIMITS.MIN_FREQUENCY, AUDIO_LIMITS.MAX_FREQUENCY);
}

export function clampLevelDb(db: number): number {
  return clamp(db, AUDIO_LIMITS.MIN_LEVEL_DB, AUDIO_LIMITS.MAX_LEVEL_DB);
}

/** Convert a relative dB value to a linear gain in 0..1. */
export function dbToGain(db: number): number {
  const clamped = clampLevelDb(db);
  if (clamped <= AUDIO_LIMITS.MIN_LEVEL_DB) return 0;
  return Math.pow(10, clamped / 20);
}

/**
 * Derive the four ACRN treatment tones from a matched tinnitus frequency.
 * @example generateAcrnFrequencies(1000) // [728, 881, 1142, 1421]
 */
export function generateAcrnFrequencies(fT: number): number[] {
  return ACRN_COEFFICIENTS.map(({ m, c }) => Math.floor(fT * m + c));
}

/** Fisher-Yates. ACRN requires a fresh random order for every cycle of four tones. */
export function shuffled<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/** Duration of a single sequence slot (an eighth note) in seconds. */
export function slotSeconds(bpm: number): number {
  return 30 / clamp(bpm, ACRN_LIMITS.MIN_BPM, ACRN_LIMITS.MAX_BPM);
}

/** Total slots in one full ACRN pattern: tone cycles followed by rests. */
export function patternLength(loopRepeat: number, restLength: number): number {
  return loopRepeat * 4 + restLength;
}

/**
 * Build one period of noise, loudness-matched across colours. A single looping buffer is
 * far cheaper than generating noise per-sample in a ScriptProcessor, and four seconds is
 * long enough that the loop point is not perceptible.
 */
export function createNoiseBuffer(
  ctx: BaseAudioContext,
  color: NoiseColor,
  seconds: number = NOISE_BUFFER_SECONDS
): AudioBuffer {
  const length = Math.floor(ctx.sampleRate * seconds);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);

  if (color === 'white') {
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
  } else if (color === 'brown') {
    let last = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.5;
    }
  } else {
    // Pink: Paul Kellet's refined filter bank, ~-3 dB/octave.
    let b0 = 0;
    let b1 = 0;
    let b2 = 0;
    let b3 = 0;
    let b4 = 0;
    let b5 = 0;
    let b6 = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.969 * b2 + white * 0.153852;
      b3 = 0.8665 * b3 + white * 0.3104856;
      b4 = 0.55 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.016898;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    }
  }

  normaliseNoise(data);
  return buffer;
}

/**
 * Scale to NOISE_TARGET_RMS, remove any DC offset the integrators introduced, and back
 * off if that would push a peak past full scale.
 */
function normaliseNoise(data: Float32Array): void {
  const length = data.length;
  if (length === 0) return;

  let sum = 0;
  for (let i = 0; i < length; i++) sum += data[i];
  const mean = sum / length;

  let sumSquares = 0;
  for (let i = 0; i < length; i++) {
    data[i] -= mean;
    sumSquares += data[i] * data[i];
  }

  const rms = Math.sqrt(sumSquares / length);
  if (rms === 0) return;

  let scale = NOISE_TARGET_RMS / rms;
  let peak = 0;
  for (let i = 0; i < length; i++) peak = Math.max(peak, Math.abs(data[i]));
  if (peak * scale > 1) scale = 1 / peak;

  for (let i = 0; i < length; i++) data[i] *= scale;
}

export interface AcrnOptions {
  bpm: number;
  loopRepeat: number;
  restLength: number;
}

export interface EngineParams {
  frequency: number;
  levelDb: number;
  pan: number;
  noiseColor: NoiseColor;
  bgNoiseColor: NoiseColor | 'none';
  soundscape: SoundscapePreset;
  binaural: BinauralPreset;
  eqGains: EqGains;
  acrn: AcrnOptions;
}

const DEFAULT_PARAMS: EngineParams = {
  frequency: 8000,
  levelDb: AUDIO_LIMITS.DEFAULT_LEVEL_DB,
  pan: 0,
  noiseColor: 'pink',
  bgNoiseColor: 'none',
  soundscape: 'none',
  binaural: 'none',
  eqGains: [...DEFAULT_EQ_GAINS],
  acrn: { ...ACRN_DEFAULTS },
};

/**
 * Owns a single AudioContext and the node graph:
 *
 *   source -> [notch] -> engineGain -> [6-Band EQ] -> panner -> masterGain -> destination
 *
 * engineGain carries the patient's level setting; masterGain carries the fade envelope
 * and is capped at MASTER_CEILING.
 */
export class TinnitusEngine {
  private ctx: AudioContext | null = null;
  private engineGain: GainNode | null = null;
  private masterGain: GainNode | null = null;
  private panner: StereoPannerNode | null = null;
  private notchFilters: BiquadFilterNode[] = [];
  private eqFilters: BiquadFilterNode[] = [];

  private oscillator: OscillatorNode | null = null;
  private binauralOscL: OscillatorNode | null = null;
  private binauralOscR: OscillatorNode | null = null;
  private noiseSource: AudioBufferSourceNode | null = null;
  private soundscapeSource: AudioBufferSourceNode | null = null;
  private soundscapeLfo: OscillatorNode | null = null;
  private soundscapeLfoGain: GainNode | null = null;
  private soundscapeVolLfo: OscillatorNode | null = null;
  private soundscapeVolGain: GainNode | null = null;
  private noiseBuffers = new Map<NoiseColor, AudioBuffer>();

  private schedulerId: ReturnType<typeof setInterval> | null = null;
  private teardownId: ReturnType<typeof setTimeout> | null = null;
  private nextSlotTime = 0;
  private slotIndex = 0;
  private cycleQueue: number[] = [];

  private params: EngineParams = { ...DEFAULT_PARAMS, eqGains: [...DEFAULT_EQ_GAINS], acrn: { ...ACRN_DEFAULTS } };
  private mode: EngineMode = 'idle';

  /** Fires at the start of each ACRN cycle with the shuffled tone order. */
  onCycle: ((frequencies: number[]) => void) | null = null;

  get currentMode(): EngineMode {
    return this.mode;
  }

  get isPlaying(): boolean {
    return this.mode !== 'idle';
  }

  /** The four ACRN tones for the currently set frequency. */
  get acrnFrequencies(): number[] {
    return generateAcrnFrequencies(this.params.frequency);
  }

  /**
   * Must be called from inside a user-gesture handler — browsers refuse to start an
   * AudioContext otherwise.
   */
  async start(mode: Exclude<EngineMode, 'idle'>, params?: Partial<EngineParams>): Promise<void> {
    if (params) this.applyParams(params);
    // A stop() still inside its fade window has a teardown pending. Without this it would fire
    // ~180 ms from now and silently kill the sources we are about to start.
    this.cancelPendingTeardown();
    this.stopSources();

    const ctx = this.ensureContext();
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    this.mode = mode;
    if (mode === 'pitch' || mode === 'tone') {
      this.startOscillator();
    } else if (mode === 'notched' || mode === 'broadband') {
      this.startNoise(mode === 'notched');
    } else if (mode === 'binaural') {
      this.startBinauralBeats(this.params.binaural !== 'none' ? this.params.binaural : 'alpha');
    } else if (mode === 'soundscape') {
      this.startSoundscape(this.params.soundscape !== 'none' ? this.params.soundscape : 'ocean');
    } else {
      this.startAcrnScheduler();
      if (this.params.bgNoiseColor && this.params.bgNoiseColor !== 'none') {
        this.startNoise(false, 0.35, this.params.bgNoiseColor);
      }
    }

    this.fadeMaster(AUDIO_LIMITS.MASTER_CEILING);
  }

  /** Fade out, then tear down the sources. Safe to call when already idle. */
  stop(): void {
    if (!this.ctx || this.mode === 'idle') {
      this.mode = 'idle';
      return;
    }
    this.mode = 'idle';
    this.fadeMaster(0);
    const fadeMs = AUDIO_LIMITS.FADE_SECONDS * 1000;
    this.cancelPendingTeardown();
    this.teardownId = setTimeout(() => {
      this.teardownId = null;
      this.stopSources();
    }, fadeMs + 30);
  }

  private cancelPendingTeardown(): void {
    if (this.teardownId !== null) {
      clearTimeout(this.teardownId);
      this.teardownId = null;
    }
  }

  /** Releases the AudioContext. Browsers cap how many can exist at once. */
  dispose(): void {
    this.mode = 'idle';
    this.cancelPendingTeardown();
    this.clearScheduler();
    this.stopSources();
    this.noiseBuffers.clear();
    if (this.ctx) {
      void this.ctx.close().catch(() => {
        /* already closed */
      });
      this.ctx = null;
    }
    this.engineGain = null;
    this.masterGain = null;
    this.panner = null;
  }

  setFrequency(hz: number): void {
    this.params.frequency = clampFrequency(hz);
    const ctx = this.ctx;
    if (!ctx) return;
    const target = ctx.currentTime + PARAM_RAMP_SECONDS;
    // Glide rather than jump, so sweeping the slider does not produce zipper noise.
    this.oscillator?.frequency.linearRampToValueAtTime(this.params.frequency, target);
    // The cascade keeps its half-octave spacing as fT moves.
    const edge = Math.pow(2, 0.25);
    const centres = [this.params.frequency / edge, this.params.frequency, this.params.frequency * edge];
    this.notchFilters.forEach((filter, i) => {
      filter.frequency.linearRampToValueAtTime(clampFrequency(centres[i]), target);
    });
  }

  setLevelDb(db: number): void {
    this.params.levelDb = clampLevelDb(db);
    if (!this.ctx || !this.engineGain) return;
    this.engineGain.gain.linearRampToValueAtTime(
      dbToGain(this.params.levelDb),
      this.ctx.currentTime + PARAM_RAMP_SECONDS
    );
  }

  setPan(pan: number): void {
    this.params.pan = clamp(pan, -1, 1);
    if (!this.ctx || !this.panner) return;
    this.panner.pan.linearRampToValueAtTime(this.params.pan, this.ctx.currentTime + PARAM_RAMP_SECONDS);
  }

  setNoiseColor(color: NoiseColor): void {
    if (this.params.noiseColor === color) return;
    this.params.noiseColor = color;
    if (this.mode !== 'notched' && this.mode !== 'broadband') return;

    // Swapping the buffer source is a step discontinuity. Duck the master first so the change
    // lands in silence — the same reason every other transition here is ramped.
    const notched = this.mode === 'notched';
    this.fadeMaster(0);
    this.cancelPendingTeardown();
    this.teardownId = setTimeout(() => {
      this.teardownId = null;
      if (this.mode !== 'notched' && this.mode !== 'broadband') return;
      this.stopNoise();
      this.startNoise(notched);
      this.fadeMaster(AUDIO_LIMITS.MASTER_CEILING);
    }, AUDIO_LIMITS.FADE_SECONDS * 1000 + 30);
  }

  setSoundscape(preset: SoundscapePreset): void {
    if (this.params.soundscape === preset && this.soundscapeSource) return;
    this.params.soundscape = preset;
    if (this.mode !== 'soundscape') return;

    this.fadeMaster(0);
    this.cancelPendingTeardown();
    this.teardownId = setTimeout(() => {
      this.teardownId = null;
      if (this.mode !== 'soundscape') return;
      this.stopSoundscape();
      if (preset !== 'none') {
        this.startSoundscape(preset);
      }
      this.fadeMaster(AUDIO_LIMITS.MASTER_CEILING);
    }, AUDIO_LIMITS.FADE_SECONDS * 1000 + 30);
  }

  setAcrnOptions(options: Partial<AcrnOptions>): void {
    this.params.acrn = {
      bpm: clamp(options.bpm ?? this.params.acrn.bpm, ACRN_LIMITS.MIN_BPM, ACRN_LIMITS.MAX_BPM),
      loopRepeat: clamp(
        options.loopRepeat ?? this.params.acrn.loopRepeat,
        ACRN_LIMITS.MIN_LOOP_REPEAT,
        ACRN_LIMITS.MAX_LOOP_REPEAT
      ),
      restLength: clamp(
        options.restLength ?? this.params.acrn.restLength,
        ACRN_LIMITS.MIN_REST_LENGTH,
        ACRN_LIMITS.MAX_REST_LENGTH
      ),
    };
  }

  /** Plays a short tone hard-panned to one ear, for the headphone orientation check. */
  async playChannelCheck(side: 'left' | 'right', seconds = 1.2): Promise<void> {
    const ctx = this.ensureContext();
    if (ctx.state === 'suspended') await ctx.resume();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const panner = ctx.createStereoPanner();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(clampFrequency(this.params.frequency), ctx.currentTime);
    panner.pan.setValueAtTime(side === 'left' ? -1 : 1, ctx.currentTime);

    const peak = dbToGain(this.params.levelDb) * AUDIO_LIMITS.MASTER_CEILING;
    const t = ctx.currentTime;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(peak, t + AUDIO_LIMITS.FADE_SECONDS);
    gain.gain.setValueAtTime(peak, t + seconds);
    gain.gain.linearRampToValueAtTime(0, t + seconds + AUDIO_LIMITS.FADE_SECONDS);

    osc.connect(gain).connect(panner).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + seconds + AUDIO_LIMITS.FADE_SECONDS + 0.05);
    osc.onended = () => {
      try {
        osc.disconnect();
        gain.disconnect();
        panner.disconnect();
      } catch {
        /* already disconnected */
      }
    };
  }

  private applyParams(params: Partial<EngineParams>): void {
    if (params.frequency !== undefined) this.params.frequency = clampFrequency(params.frequency);
    if (params.levelDb !== undefined) this.params.levelDb = clampLevelDb(params.levelDb);
    if (params.pan !== undefined) this.params.pan = clamp(params.pan, -1, 1);
    if (params.noiseColor !== undefined) this.params.noiseColor = params.noiseColor;
    if (params.bgNoiseColor !== undefined) this.params.bgNoiseColor = params.bgNoiseColor;
    if (params.soundscape !== undefined) {
      if (this.params.soundscape !== params.soundscape && this.mode === 'soundscape') {
        this.setSoundscape(params.soundscape);
      } else {
        this.params.soundscape = params.soundscape;
      }
    }
    if (params.binaural !== undefined) this.params.binaural = params.binaural;
    if (params.eqGains !== undefined) {
      this.params.eqGains = params.eqGains.map((g) => clamp(g, EQ_GAIN_LIMIT_DB.min, EQ_GAIN_LIMIT_DB.max)) as EqGains;
      // The graph may already exist from an earlier session; push the gains through so a
      // change made while idle is not lost.
      if (this.eqFilters.length > 0) this.setEqGains(this.params.eqGains);
    }
    if (params.acrn) this.setAcrnOptions(params.acrn);
  }

  private ensureContext(): AudioContext {
    if (this.ctx) return this.ctx;

    const Ctor: typeof AudioContext =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctor();

    const engineGain = ctx.createGain();
    engineGain.gain.setValueAtTime(dbToGain(this.params.levelDb), ctx.currentTime);

    // Create 6-Band Graphic Equalizer (125, 500, 1000, 3000, 6000, 12000 Hz)
    const eqFilters: BiquadFilterNode[] = EQ_FREQUENCIES.map((freq, index) => {
      const filter = ctx.createBiquadFilter();
      if (index === 0) {
        filter.type = 'lowshelf';
      } else if (index === EQ_FREQUENCIES.length - 1) {
        filter.type = 'highshelf';
      } else {
        filter.type = 'peaking';
        filter.Q.setValueAtTime(1.4, ctx.currentTime);
      }
      filter.frequency.setValueAtTime(freq, ctx.currentTime);
      filter.gain.setValueAtTime(this.params.eqGains[index] ?? 0, ctx.currentTime);
      return filter;
    });

    const panner = ctx.createStereoPanner();
    panner.pan.setValueAtTime(this.params.pan, ctx.currentTime);

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0, ctx.currentTime);

    // Chain: engineGain -> eqFilters[0..5] -> panner -> masterGain -> destination
    let lastNode: AudioNode = engineGain;
    for (const filter of eqFilters) {
      lastNode.connect(filter);
      lastNode = filter;
    }
    lastNode.connect(panner).connect(masterGain).connect(ctx.destination);

    this.ctx = ctx;
    this.engineGain = engineGain;
    this.eqFilters = eqFilters;
    this.panner = panner;
    this.masterGain = masterGain;
    return ctx;
  }

  setEqGains(gains: EqGains): void {
    this.params.eqGains = [...gains];
    if (!this.ctx || this.eqFilters.length === 0) return;
    this.eqFilters.forEach((filter, i) => {
      filter.gain.linearRampToValueAtTime(
        clamp(gains[i] ?? 0, EQ_GAIN_LIMIT_DB.min, EQ_GAIN_LIMIT_DB.max),
        this.ctx!.currentTime + PARAM_RAMP_SECONDS
      );
    });
  }

  private fadeMaster(target: number): void {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    this.masterGain.gain.cancelScheduledValues(now);
    this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
    this.masterGain.gain.linearRampToValueAtTime(target, now + AUDIO_LIMITS.FADE_SECONDS);
  }

  private startOscillator(): void {
    const ctx = this.ctx;
    if (!ctx || !this.engineGain) return;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(this.params.frequency, ctx.currentTime);
    osc.connect(this.engineGain);
    osc.start();
    this.oscillator = osc;
  }

  private startNoise(notched: boolean, gainFactor = 1.0, overrideColor?: NoiseColor): void {
    const ctx = this.ctx;
    if (!ctx || !this.engineGain) return;

    const color = overrideColor ?? this.params.noiseColor;
    let buffer = this.noiseBuffers.get(color);
    if (!buffer) {
      buffer = createNoiseBuffer(ctx, color);
      this.noiseBuffers.set(color, buffer);
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    let node: AudioNode = source;
    if (notched) {
      for (const filter of this.buildNotchCascade(ctx)) {
        node.connect(filter);
        node = filter;
      }
    }
    if (gainFactor < 1.0) {
      const subGain = ctx.createGain();
      subGain.gain.setValueAtTime(gainFactor, ctx.currentTime);
      node.connect(subGain);
      node = subGain;
    }
    node.connect(this.engineGain);

    source.start();
    this.noiseSource = source;
  }

  /**
   * Notched sound therapy needs energy removed across roughly half an octave around fT, with
   * steep edges. One biquad cannot do that — it nulls only within a few hundred Hz of centre
   * while its -3 dB skirt runs close to a full octave. Three narrower notches spaced across the
   * target band approximate the stopband far better, and the skirts stay tight.
   */
  private buildNotchCascade(ctx: BaseAudioContext): BiquadFilterNode[] {
    const fT = clampFrequency(this.params.frequency);
    // Half-octave band: fT / 2^0.25 .. fT * 2^0.25.
    const edge = Math.pow(2, 0.25);
    const centres = [fT / edge, fT, fT * edge];

    const filters = centres.map((centre) => {
      const filter = ctx.createBiquadFilter();
      filter.type = 'notch';
      filter.frequency.setValueAtTime(clampFrequency(centre), ctx.currentTime);
      filter.Q.setValueAtTime(NOTCH_Q, ctx.currentTime);
      return filter;
    });

    this.notchFilters = filters;
    return filters;
  }

  private startAcrnScheduler(): void {
    const ctx = this.ctx;
    if (!ctx) return;
    this.clearScheduler();
    this.slotIndex = 0;
    this.cycleQueue = [];
    this.nextSlotTime = ctx.currentTime + 0.05;
    // setInterval alone drifts audibly; it only decides *when to schedule*, while the
    // AudioContext clock decides when tones actually sound.
    this.schedulerId = setInterval(() => this.tick(), SCHEDULER_INTERVAL_MS);
    this.tick();
  }

  private tick(): void {
    const ctx = this.ctx;
    if (!ctx || this.mode !== 'acrn') return;

    const { bpm, loopRepeat, restLength } = this.params.acrn;
    const slot = slotSeconds(bpm);
    const total = patternLength(loopRepeat, restLength);
    const toneSlots = loopRepeat * 4;

    while (this.nextSlotTime < ctx.currentTime + SCHEDULE_AHEAD_SECONDS) {
      const index = this.slotIndex % total;
      if (index < toneSlots) {
        if (index % 4 === 0) {
          this.cycleQueue = shuffled(this.acrnFrequencies);
          this.onCycle?.(this.cycleQueue);
        }
        this.scheduleTone(this.cycleQueue[index % 4], this.nextSlotTime, slot);
      }
      this.nextSlotTime += slot;
      this.slotIndex++;
    }
  }

  private scheduleTone(frequency: number, at: number, duration: number): void {
    const ctx = this.ctx;
    if (!ctx || !this.engineGain) return;

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(clampFrequency(frequency), at);

    const gain = ctx.createGain();
    const { attack, decay, sustain, release } = TONE_ENVELOPE;
    // At high bpm the slot can be shorter than the attack; keep the attack inside it.
    const attackTime = Math.min(attack, duration * 0.8);
    const attackEnd = at + attackTime;
    const decayEnd = attackEnd + Math.max(decay, DECAY_EPSILON);

    gain.gain.setValueAtTime(0, at);
    gain.gain.linearRampToValueAtTime(1, attackEnd);
    gain.gain.linearRampToValueAtTime(sustain, decayEnd);
    gain.gain.setValueAtTime(sustain, at + duration);
    gain.gain.linearRampToValueAtTime(0, at + duration + release);

    osc.connect(gain).connect(this.engineGain);
    osc.start(at);
    osc.stop(at + duration + release + 0.02);
    osc.onended = () => {
      try {
        osc.disconnect();
        gain.disconnect();
      } catch {
        /* already disconnected */
      }
    };
  }

  private clearScheduler(): void {
    if (this.schedulerId !== null) {
      clearInterval(this.schedulerId);
      this.schedulerId = null;
    }
  }

  private startBinauralBeats(preset: Exclude<BinauralPreset, 'none'>): void {
    const ctx = this.ctx;
    if (!ctx || !this.engineGain) return;

    const config = BINAURAL_PRESETS[preset] ?? BINAURAL_PRESETS.alpha;
    const fLeft = config.baseHz;
    const fRight = config.baseHz + config.beatHz;

    // Left channel oscillator
    const oscL = ctx.createOscillator();
    oscL.type = 'sine';
    oscL.frequency.setValueAtTime(fLeft, ctx.currentTime);
    const pannerL = ctx.createStereoPanner();
    pannerL.pan.setValueAtTime(-1.0, ctx.currentTime);

    // Right channel oscillator
    const oscR = ctx.createOscillator();
    oscR.type = 'sine';
    oscR.frequency.setValueAtTime(fRight, ctx.currentTime);
    const pannerR = ctx.createStereoPanner();
    pannerR.pan.setValueAtTime(1.0, ctx.currentTime);

    oscL.connect(pannerL).connect(this.engineGain);
    oscR.connect(pannerR).connect(this.engineGain);

    oscL.start();
    oscR.start();

    this.binauralOscL = oscL;
    this.binauralOscR = oscR;
  }

  private startSoundscape(preset: Exclude<SoundscapePreset, 'none'>): void {
    const ctx = this.ctx;
    if (!ctx || !this.engineGain) return;

    const noiseColor: NoiseColor = preset === 'stream' ? 'brown' : 'pink';
    let buffer = this.noiseBuffers.get(noiseColor);
    if (!buffer) {
      buffer = createNoiseBuffer(ctx, noiseColor);
      this.noiseBuffers.set(noiseColor, buffer);
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const filter = ctx.createBiquadFilter();
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();

    if (preset === 'ocean') {
      // Swelling ocean waves: 0.1 Hz LFO (10s cycle) modulating lowpass filter cutoff & volume
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(300, ctx.currentTime);
      
      lfo.type = 'sine';
      lfo.frequency.setValueAtTime(0.1, ctx.currentTime); // 10s swell cycle
      lfoGain.gain.setValueAtTime(350, ctx.currentTime);
      lfo.connect(lfoGain);
      lfoGain.connect(filter.frequency);

      // Synchronized volume swell gain for ocean waves
      const volGain = ctx.createGain();
      volGain.gain.setValueAtTime(0.6, ctx.currentTime);

      const volLfoGain = ctx.createGain();
      volLfoGain.gain.setValueAtTime(0.35, ctx.currentTime);

      lfo.connect(volLfoGain);
      volLfoGain.connect(volGain.gain);

      source.connect(filter).connect(volGain).connect(this.engineGain);
      this.soundscapeVolGain = volGain;
    } else if (preset === 'rain') {
      // Gentle rain: highpass filter at 900 Hz with 2.2 Hz LFO shimmer
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(900, ctx.currentTime);
      
      lfo.type = 'sine';
      lfo.frequency.setValueAtTime(2.2, ctx.currentTime); // 2.2 Hz shimmer
      lfoGain.gain.setValueAtTime(300, ctx.currentTime);
      lfo.connect(lfoGain);
      lfoGain.connect(filter.frequency);

      source.connect(filter).connect(this.engineGain);
    } else {
      // Forest stream: resonant bandpass filter around 550 Hz (babbling brook)
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(550, ctx.currentTime);
      filter.Q.setValueAtTime(2.2, ctx.currentTime);

      lfo.type = 'sine';
      lfo.frequency.setValueAtTime(0.45, ctx.currentTime); // 2.2s ripple cycle
      lfoGain.gain.setValueAtTime(300, ctx.currentTime);
      lfo.connect(lfoGain);
      lfoGain.connect(filter.frequency);

      source.connect(filter).connect(this.engineGain);
    }

    lfo.start();
    source.start();

    this.soundscapeSource = source;
    this.soundscapeLfo = lfo;
    this.soundscapeLfoGain = lfoGain;
  }

  private stopSoundscape(): void {
    if (this.soundscapeSource) {
      try { this.soundscapeSource.stop(); } catch { /* ignore */ }
      this.soundscapeSource.disconnect();
      this.soundscapeSource = null;
    }
    if (this.soundscapeLfo) {
      try { this.soundscapeLfo.stop(); } catch { /* ignore */ }
      this.soundscapeLfo.disconnect();
      this.soundscapeLfo = null;
    }
    if (this.soundscapeLfoGain) {
      this.soundscapeLfoGain.disconnect();
      this.soundscapeLfoGain = null;
    }
    if (this.soundscapeVolLfo) {
      try { this.soundscapeVolLfo.stop(); } catch { /* ignore */ }
      this.soundscapeVolLfo.disconnect();
      this.soundscapeVolLfo = null;
    }
    if (this.soundscapeVolGain) {
      this.soundscapeVolGain.disconnect();
      this.soundscapeVolGain = null;
    }
  }

  private stopNoise(): void {
    if (this.noiseSource) {
      try {
        this.noiseSource.stop();
      } catch {
        /* already stopped */
      }
      this.noiseSource.disconnect();
      this.noiseSource = null;
    }
    for (const filter of this.notchFilters) {
      try {
        filter.disconnect();
      } catch {
        /* already disconnected */
      }
    }
    this.notchFilters = [];
  }

  private stopSources(): void {
    this.clearScheduler();
    if (this.oscillator) {
      try {
        this.oscillator.stop();
      } catch {
        /* already stopped */
      }
      this.oscillator.disconnect();
      this.oscillator = null;
    }
    if (this.binauralOscL) {
      try { this.binauralOscL.stop(); } catch { /* ignore */ }
      this.binauralOscL.disconnect();
      this.binauralOscL = null;
    }
    if (this.binauralOscR) {
      try { this.binauralOscR.stop(); } catch { /* ignore */ }
      this.binauralOscR.disconnect();
      this.binauralOscR = null;
    }
    this.stopSoundscape();
    this.stopNoise();
  }
}
