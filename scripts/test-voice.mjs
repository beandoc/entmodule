import assert from 'node:assert/strict';
import {
  fft, hann, rmsDb, estimateNoiseFloorDb, clippedFraction,
  computeCPPS, detectPhonation, countDdkSyllables, resample,
} from '../src/lib/voice-dsp.ts';

console.log('--------------------------------------------------------');
console.log('Running Voice DSP Tests (CPPS + MPT + DDK)');
console.log('--------------------------------------------------------\n');

const SR = 16000;

/** Deterministic PRNG so noise-dependent assertions are reproducible. */
function mulberry32(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20260807);
const noiseSample = () => rand() * 2 - 1;

/**
 * A crude but serviceable voice source: a bandlimited glottal pulse train with
 * a -12 dB/octave harmonic rolloff, which is what gives a real vowel its
 * strong single cepstral rahmonic.
 */
function glottalTrain(durationSec, f0, sampleRate = SR, harmonics = 40) {
  const n = Math.floor(durationSec * sampleRate);
  const out = new Float32Array(n);
  for (let h = 1; h <= harmonics; h += 1) {
    const freq = f0 * h;
    if (freq >= sampleRate / 2) break;
    const amp = 1 / (h * h);
    const phase = rand() * Math.PI * 2;
    for (let i = 0; i < n; i += 1) {
      out[i] += amp * Math.sin((2 * Math.PI * freq * i) / sampleRate + phase);
    }
  }
  let peak = 0;
  for (let i = 0; i < n; i += 1) peak = Math.max(peak, Math.abs(out[i]));
  if (peak > 0) for (let i = 0; i < n; i += 1) out[i] /= peak;
  return out;
}

/** Mix a signal with white noise at a given SNR in dB. */
function atSnr(signal, snrDb) {
  const out = Float32Array.from(signal);
  let sp = 0;
  for (let i = 0; i < out.length; i += 1) sp += out[i] * out[i];
  sp /= out.length;
  const np = sp / Math.pow(10, snrDb / 10);
  const scale = Math.sqrt(np);
  for (let i = 0; i < out.length; i += 1) out[i] += noiseSample() * scale;
  return out;
}

function concat(...parts) {
  const total = parts.reduce((a, p) => a + p.length, 0);
  const out = new Float32Array(total);
  let off = 0;
  for (const p of parts) { out.set(p, off); off += p.length; }
  return out;
}

function silence(durationSec, level = 0.0004, sampleRate = SR) {
  const n = Math.floor(durationSec * sampleRate);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i += 1) out[i] = noiseSample() * level;
  return out;
}

// ----------------------------------------------------
// 1. FFT
// ----------------------------------------------------
console.log('1. Testing radix-2 FFT...');
{
  // A pure bin-centred sinusoid must put all its energy in one bin.
  const N = 64;
  const re = new Float32Array(N);
  const im = new Float32Array(N);
  const k = 8;
  for (let i = 0; i < N; i += 1) re[i] = Math.cos((2 * Math.PI * k * i) / N);
  fft(re, im);
  const mag = (j) => Math.hypot(re[j], im[j]);
  assert.ok(mag(k) > N / 2 - 1e-3, `expected energy at bin ${k}, got ${mag(k)}`);
  for (let j = 0; j < N / 2; j += 1) {
    if (j === k) continue;
    assert.ok(mag(j) < 1e-3, `bin ${j} should be empty, got ${mag(j)}`);
  }

  assert.throws(() => fft(new Float32Array(6), new Float32Array(6)), /power of two/);
  console.log('   PASS: impulse-in-one-bin and non-power-of-two guard\n');
}

// ----------------------------------------------------
// 2. Levels, noise floor, clipping
// ----------------------------------------------------
console.log('2. Testing level helpers...');
{
  const fullScale = new Float32Array(1000).fill(1);
  assert.ok(Math.abs(rmsDb(fullScale)) < 0.01, 'DC at full scale should read ~0 dBFS');
  assert.equal(rmsDb(new Float32Array(100)), -120, 'digital silence floors at -120');

  const quiet = silence(1, 0.001);
  const floor = estimateNoiseFloorDb(quiet, SR);
  assert.ok(floor < -50 && floor > -90, `quiet room floor out of range: ${floor}`);

  // A loud burst inside the calibration take must not inflate the floor,
  // because the estimator uses the 10th percentile rather than the mean.
  const contaminated = concat(silence(1, 0.001), glottalTrain(0.3, 120), silence(1, 0.001));
  const contaminatedFloor = estimateNoiseFloorDb(contaminated, SR);
  assert.ok(
    Math.abs(contaminatedFloor - floor) < 6,
    `stray sound shifted the floor too far: ${floor} -> ${contaminatedFloor}`,
  );

  assert.ok(clippedFraction(new Float32Array(100).fill(1)) === 1);
  assert.ok(clippedFraction(new Float32Array(100).fill(0.5)) === 0);
  console.log('   PASS: dBFS reference, percentile floor, clipping detection\n');
}

// ----------------------------------------------------
// 3. CPPS
// ----------------------------------------------------
console.log('3. Testing CPPS...');
{
  const voice = glottalTrain(2.0, 120);

  // The load-bearing property: CPPS must fall monotonically as the harmonic
  // structure is buried in noise. Absolute values are NOT asserted, because
  // they are not portable across rigs and the module never uses them that way.
  const snrs = [40, 30, 20, 10, 0];
  const values = snrs.map((snr) => computeCPPS(atSnr(voice, snr), SR).cppsDb);
  console.log('   CPPS by SNR:', snrs.map((s, i) => `${s}dB=${values[i].toFixed(2)}`).join('  '));

  for (let i = 1; i < values.length; i += 1) {
    assert.ok(
      values[i] < values[i - 1],
      `CPPS must decrease as SNR drops: ${snrs[i - 1]}dB=${values[i - 1].toFixed(2)} -> ${snrs[i]}dB=${values[i].toFixed(2)}`,
    );
  }
  assert.ok(
    values[0] - values[values.length - 1] > 2,
    'clean vs noise-dominated CPPS should differ by a clinically meaningful margin',
  );

  // Pure noise has no rahmonic structure at all.
  const noiseOnly = computeCPPS(silence(2, 0.2), SR);
  assert.ok(
    noiseOnly.cppsDb < values[0],
    `noise must score below a clean voice: ${noiseOnly.cppsDb.toFixed(2)} vs ${values[0].toFixed(2)}`,
  );

  // F0 invariance: a healthy male and a healthy female voice should both score
  // well. If the quefrency search band were wrong, one of them would collapse.
  const low = computeCPPS(atSnr(glottalTrain(2.0, 100), 35), SR).cppsDb;
  const high = computeCPPS(atSnr(glottalTrain(2.0, 220), 35), SR).cppsDb;
  console.log(`   CPPS F0 100Hz=${low.toFixed(2)}  220Hz=${high.toFixed(2)}`);
  assert.ok(low > 0 && high > 0, 'both F0 extremes must yield positive prominence');

  const gated = computeCPPS(concat(silence(1, 0.0002), voice, silence(1, 0.0002)), SR);
  assert.ok(
    gated.voicedFrameRatio > 0.3 && gated.voicedFrameRatio < 0.8,
    `level gate should exclude the silent halves, got ratio ${gated.voicedFrameRatio.toFixed(2)}`,
  );

  assert.equal(computeCPPS(new Float32Array(10), SR).cppsDb, 0, 'too-short input returns zero');
  console.log('   PASS: monotonic SNR response, F0 invariance, level gating\n');
}

// ----------------------------------------------------
// 4. Maximum phonation time
// ----------------------------------------------------
console.log('4. Testing MPT phonation detection...');
{
  const floor = estimateNoiseFloorDb(silence(1, 0.001), SR);

  // 7.00 s of phonation with room noise either side.
  const take = concat(silence(0.2, 0.001), glottalTrain(7.0, 130), silence(0.2, 0.001));
  const r = detectPhonation(take, SR, floor);
  console.log(`   measured MPT = ${r.durationSec.toFixed(3)}s (truth 7.000s)`);
  assert.ok(r.detected, 'phonation should be detected');
  assert.ok(
    Math.abs(r.durationSec - 7.0) < 0.1,
    `MPT must land within 100ms of truth, got ${r.durationSec.toFixed(3)}s`,
  );
  assert.ok(Math.abs(r.onsetSec - 0.2) < 0.1, `onset off: ${r.onsetSec.toFixed(3)}s`);

  // A 100 ms creak must be bridged, not treated as the end of the take.
  const withCreak = concat(
    silence(0.2, 0.001), glottalTrain(3.0, 130),
    silence(0.1, 0.001), glottalTrain(3.0, 130), silence(0.2, 0.001),
  );
  const creak = detectPhonation(withCreak, SR, floor);
  console.log(`   bridged take = ${creak.durationSec.toFixed(3)}s, dropouts=${creak.dropoutCount}`);
  assert.ok(creak.durationSec > 6.0, `short gap should be bridged, got ${creak.durationSec.toFixed(3)}s`);
  assert.ok(creak.dropoutCount >= 1, 'the bridged gap should be reported as a dropout');

  // A 400 ms break is a genuine stop; only the longer segment should be timed.
  const twoTakes = concat(
    silence(0.2, 0.001), glottalTrain(2.0, 130),
    silence(0.4, 0.001), glottalTrain(5.0, 130), silence(0.2, 0.001),
  );
  const split = detectPhonation(twoTakes, SR, floor);
  console.log(`   longest of two takes = ${split.durationSec.toFixed(3)}s (truth 5.000s)`);
  assert.ok(
    Math.abs(split.durationSec - 5.0) < 0.15,
    `should time the longer segment only, got ${split.durationSec.toFixed(3)}s`,
  );

  // Throat-clearing is below the minimum run length.
  const tiny = detectPhonation(concat(silence(0.5, 0.001), glottalTrain(0.15, 130), silence(0.5, 0.001)), SR, floor);
  assert.equal(tiny.detected, false, 'a 150ms grunt is not phonation');

  assert.equal(detectPhonation(silence(2, 0.001), SR, floor).detected, false, 'silence yields nothing');

  // A noisy ward raises the floor; the same take must still be timed correctly
  // because the threshold is referenced to the measured floor, not a constant.
  const wardFloorNoise = 0.02;
  const wardFloor = estimateNoiseFloorDb(silence(1, wardFloorNoise), SR);
  const wardTake = concat(silence(0.2, wardFloorNoise), glottalTrain(7.0, 130), silence(0.2, wardFloorNoise));
  const ward = detectPhonation(wardTake, SR, wardFloor);
  console.log(`   noisy-room MPT = ${ward.durationSec.toFixed(3)}s (floor ${wardFloor.toFixed(1)} dBFS)`);
  assert.ok(
    Math.abs(ward.durationSec - 7.0) < 0.15,
    `adaptive threshold should survive a raised floor, got ${ward.durationSec.toFixed(3)}s`,
  );
  console.log('   PASS: timing accuracy, gap bridging, run selection, adaptive floor\n');
}

// ----------------------------------------------------
// 5. Diadochokinesis
// ----------------------------------------------------
console.log('5. Testing DDK syllable counting...');

/** A stop burst: broadband transient, then a short voiced vowel. */
function syllable(sampleRate = SR, burstMs = 12, vowelMs = 70, f0 = 120) {
  const burstN = Math.floor((burstMs / 1000) * sampleRate);
  const burst = new Float32Array(burstN);
  for (let i = 0; i < burstN; i += 1) {
    burst[i] = noiseSample() * Math.exp(-i / (burstN / 3));
  }
  const vowel = glottalTrain(vowelMs / 1000, f0, sampleRate);
  for (let i = 0; i < vowel.length; i += 1) {
    const t = i / vowel.length;
    vowel[i] *= 0.8 * Math.sin(Math.PI * t);
  }
  return concat(burst, vowel);
}

function ddkTake(count, rateHz, jitterFrac = 0, sampleRate = SR) {
  const period = 1 / rateHz;
  const totalSec = count * period + 0.3;
  const out = new Float32Array(Math.ceil(totalSec * sampleRate));
  for (let s = 0; s < count; s += 1) {
    const jitter = jitterFrac ? (rand() * 2 - 1) * jitterFrac * period : 0;
    const at = Math.floor((0.1 + s * period + jitter) * sampleRate);
    const syl = syllable(sampleRate);
    for (let i = 0; i < syl.length && at + i < out.length; i += 1) out[at + i] += syl[i];
  }
  for (let i = 0; i < out.length; i += 1) out[i] += noiseSample() * 0.0008;
  return out;
}

{
  const floor = estimateNoiseFloorDb(silence(1, 0.0008), SR);

  const d = countDdkSyllables(ddkTake(30, 6), SR, floor);
  console.log(`   count=${d.count} (truth 30)  rate=${d.ratePerSec.toFixed(2)}/s (truth 6.00)  CV=${d.intervalCvPct.toFixed(1)}%`);
  assert.ok(Math.abs(d.count - 30) <= 1, `expected 30 syllables +/-1, got ${d.count}`);
  assert.ok(Math.abs(d.ratePerSec - 6.0) < 0.3, `expected ~6/s, got ${d.ratePerSec.toFixed(2)}`);
  assert.ok(d.intervalCvPct < 8, `evenly spaced take should have low CV, got ${d.intervalCvPct.toFixed(1)}%`);

  // Rate must track across the clinically relevant range.
  for (const rate of [3, 5, 7]) {
    const m = countDdkSyllables(ddkTake(20, rate), SR, floor);
    console.log(`   rate ${rate}/s -> measured ${m.ratePerSec.toFixed(2)}/s, count ${m.count}`);
    assert.ok(Math.abs(m.ratePerSec - rate) < 0.4, `rate ${rate} mismeasured as ${m.ratePerSec.toFixed(2)}`);
    assert.ok(Math.abs(m.count - 20) <= 1, `rate ${rate}: expected 20 +/-1, got ${m.count}`);
  }

  // Irregularity is the point of the CV measure: same rate, worse consistency.
  const even = countDdkSyllables(ddkTake(25, 5, 0), SR, floor);
  const ragged = countDdkSyllables(ddkTake(25, 5, 0.35), SR, floor);
  console.log(`   CV even=${even.intervalCvPct.toFixed(1)}%  ragged=${ragged.intervalCvPct.toFixed(1)}%`);
  assert.ok(
    ragged.intervalCvPct > even.intervalCvPct + 8,
    `jittered take should show clearly higher CV: ${even.intervalCvPct.toFixed(1)} vs ${ragged.intervalCvPct.toFixed(1)}`,
  );

  // The refractory period must stop a single burst being counted twice.
  const single = countDdkSyllables(ddkTake(1, 6), SR, floor);
  assert.ok(single.count <= 1, `one syllable must not be double-counted, got ${single.count}`);

  // Absolute gates. The hysteresis thresholds are relative to the take's own
  // envelope, so without these an empty room would yield syllables.
  assert.equal(
    countDdkSyllables(silence(2, 0.0008), SR, floor).count, 0,
    'room noise at the calibrated floor must not produce syllables',
  );
  assert.equal(
    countDdkSyllables(silence(2, 0.2), SR, estimateNoiseFloorDb(silence(1, 0.2), SR)).count, 0,
    'loud but stationary noise must not produce syllables',
  );
  assert.equal(
    countDdkSyllables(ddkTake(20, 5), SR, 0).count, 0,
    'a take below the stated floor must be rejected outright',
  );
  console.log('   PASS: count accuracy, rate tracking, CV sensitivity, refractory, absolute gates\n');
}

// ----------------------------------------------------
// 6. Resampling
// ----------------------------------------------------
console.log('6. Testing resampler...');
{
  const src = glottalTrain(1.0, 120, 48000);
  const out = resample(src, 48000, 16000);
  assert.ok(Math.abs(out.length - 16000) <= 1, `expected ~16000 samples, got ${out.length}`);

  // Downsampling must not destroy the cepstral structure the analysis depends on.
  const before = computeCPPS(atSnr(src, 35), 48000).cppsDb;
  const after = computeCPPS(resample(atSnr(src, 35), 48000, 16000), 16000).cppsDb;
  console.log(`   CPPS 48k=${before.toFixed(2)}  resampled 16k=${after.toFixed(2)}`);
  assert.ok(after > 0, 'resampled signal should still show clear cepstral prominence');

  const same = resample(src, 48000, 48000);
  assert.equal(same.length, src.length, 'no-op resample preserves length');
  console.log('   PASS: length, structure preservation, no-op\n');
}

console.log('--------------------------------------------------------');
console.log('All voice DSP tests passed.');
console.log('--------------------------------------------------------');
