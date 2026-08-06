import assert from 'node:assert/strict';
import {
  generateAcrnFrequencies, shuffled, slotSeconds, patternLength,
  dbToGain, clampFrequency, createNoiseBuffer, ACRN_DEFAULTS, AUDIO_LIMITS,
} from '../src/lib/tinnitus-audio.ts';
import {
  encodeRx, decodeRx, scoreThi, thiBandFor, scoreThiSubscale,
  THI_ITEMS, THI_OPTIONS,
} from '../src/lib/tinnitus-rx.ts';

console.log('----------------------------------------------------');
console.log('Running Tinnitus Relief Studio Tests (ACRN + Rx + THI)');
console.log('----------------------------------------------------\n');

// 1. ACRN frequency derivation
console.log('1. Testing ACRN four-tone derivation...');
assert.deepEqual(
  generateAcrnFrequencies(1000),
  [728, 881, 1142, 1421],
  'ACRN tones for 1000 Hz must match the reference implementation'
);
console.log('   [PASS] fT 1000 Hz -> 728, 881, 1142, 1421');

const tones8k = generateAcrnFrequencies(8000);
assert.equal(tones8k.length, 4);
assert.ok(tones8k[0] < 8000 && tones8k[1] < 8000, 'two tones must sit below fT');
assert.ok(tones8k[2] > 8000 && tones8k[3] > 8000, 'two tones must sit above fT');
assert.deepEqual([...tones8k].sort((a, b) => a - b), tones8k, 'tones must be ascending');
console.log(`   [PASS] fT 8000 Hz -> ${tones8k.join(', ')} (2 below, 2 above, ascending)`);

// 2. Shuffling preserves the tone set
console.log('\n2. Testing per-cycle shuffle...');
const source = generateAcrnFrequencies(4000);
for (let i = 0; i < 200; i++) {
  const order = shuffled(source);
  assert.equal(order.length, source.length);
  assert.deepEqual([...order].sort((a, b) => a - b), [...source].sort((a, b) => a - b));
}
assert.deepEqual(source, generateAcrnFrequencies(4000), 'shuffle must not mutate its input');
const orders = new Set();
for (let i = 0; i < 500; i++) orders.add(shuffled(source).join(','));
assert.ok(orders.size > 12, `expected many distinct orders, got ${orders.size}`);
console.log(`   [PASS] 200 shuffles preserve the tone multiset; ${orders.size}/24 permutations seen`);

// 3. Sequence timing
console.log('\n3. Testing sequence timing...');
const slot = slotSeconds(ACRN_DEFAULTS.bpm);
const cycleSeconds = slot * 4;
assert.ok(Math.abs(1 / cycleSeconds - 1.5) < 0.001, 'cycle repetition rate must be 1.5 Hz');
console.log(`   [PASS] ${ACRN_DEFAULTS.bpm} bpm -> slot ${slot.toFixed(4)}s, cycle ${cycleSeconds.toFixed(3)}s = ${(1 / cycleSeconds).toFixed(2)} Hz`);
assert.equal(patternLength(3, 8), 20);
assert.equal(patternLength(1, 0), 4);
console.log('   [PASS] pattern length 3x4 + 8 rests = 20 slots');

// 4. Level safety
console.log('\n4. Testing level clamping...');
assert.equal(dbToGain(0), 1);
assert.equal(dbToGain(-80), 0);
assert.equal(dbToGain(999), 1, 'levels above 0 dB must clamp to unity');
assert.ok(dbToGain(-45) * AUDIO_LIMITS.MASTER_CEILING < 0.01);
assert.ok(dbToGain(0) * AUDIO_LIMITS.MASTER_CEILING <= AUDIO_LIMITS.MASTER_CEILING);
assert.equal(clampFrequency(50), AUDIO_LIMITS.MIN_FREQUENCY);
assert.equal(clampFrequency(99999), AUDIO_LIMITS.MAX_FREQUENCY);
assert.equal(clampFrequency(Number.NaN), AUDIO_LIMITS.MIN_FREQUENCY);
console.log(`   [PASS] gain never exceeds MASTER_CEILING ${AUDIO_LIMITS.MASTER_CEILING}; frequency clamped to 100-14000 Hz`);

// 5. Noise generators — the brown integrator in particular can drift into clipping.
console.log('\n5. Testing noise buffer generation...');
const stubCtx = {
  sampleRate: 44100,
  createBuffer(_channels, length) {
    const data = new Float32Array(length);
    return { length, getChannelData: () => data };
  },
};
const measured = {};
for (const color of ['white', 'pink', 'brown']) {
  const buffer = createNoiseBuffer(stubCtx, color, 2);
  const data = buffer.getChannelData(0);
  assert.equal(data.length, 88200, `${color} buffer must be 2 s at 44.1 kHz`);
  let peak = 0;
  let sumSquares = 0;
  let sum = 0;
  for (let i = 0; i < data.length; i++) {
    peak = Math.max(peak, Math.abs(data[i]));
    sumSquares += data[i] * data[i];
    sum += data[i];
  }
  const rms = Math.sqrt(sumSquares / data.length);
  const dc = Math.abs(sum / data.length);
  assert.ok(Number.isFinite(peak), `${color} produced non-finite samples`);
  assert.ok(peak <= 1, `${color} peak ${peak.toFixed(3)} clips`);
  assert.ok(rms > 0.005, `${color} rms ${rms.toFixed(4)} is effectively silent`);
  assert.ok(dc < 1e-6, `${color} has a residual DC offset of ${dc}`);
  measured[color] = rms;
  console.log(`   [PASS] ${color.padEnd(5)} peak ${peak.toFixed(3)} rms ${rms.toFixed(4)} dc ${dc.toExponential(1)}`);
}

// Changing colour mid-session must not step the loudness.
const rmsValues = Object.values(measured);
const spreadDb = 20 * Math.log10(Math.max(...rmsValues) / Math.min(...rmsValues));
assert.ok(spreadDb < 1, `noise colours differ by ${spreadDb.toFixed(2)} dB — should be loudness-matched`);
console.log(`   [PASS] colours loudness-matched to within ${spreadDb.toFixed(3)} dB`);

// 6. Prescription codes
console.log('\n6. Testing prescription code round-trip...');
const rx = { fT: 8000, levelDb: -45, engine: 'ACRN', loopRepeat: 3, restLength: 8 };
const code = encodeRx(rx);
assert.equal(code, 'RX-8000-45-ACRN-3x8');
assert.deepEqual(decodeRx(code), rx);
assert.deepEqual(decodeRx('  rx-8000-45-acrn-3x8  '), rx, 'codes must be case- and space-insensitive');
assert.deepEqual(decodeRx(encodeRx({ fT: 440, levelDb: -60, engine: 'NOTCH', loopRepeat: 1, restLength: 0 })), {
  fT: 440, levelDb: -60, engine: 'NOTCH', loopRepeat: 1, restLength: 0,
});
console.log(`   [PASS] ${code} round-trips exactly`);

for (const bad of [
  '', 'RX', 'RX-8000-45-ACRN', 'RX-8000-45-XXXX-3x8', 'RX-99-45-ACRN-3x8',
  'RX-99999-45-ACRN-3x8', 'RX-8000-99-ACRN-3x8', 'RX-8000-45-ACRN-0x8',
  'RX-8000-45-ACRN-3x99', 'CH-ENT-1234',
]) {
  assert.equal(decodeRx(bad), null, `expected "${bad}" to be rejected`);
}
console.log('   [PASS] 10 malformed / out-of-range codes rejected');

// 7. THI-25
console.log('\n7. Testing THI-25 scoring...');
assert.equal(THI_ITEMS.length, 25);
// Newman et al. 1996: F = items 1,2,4,7,9,12,13,15,18,20,24; E = 3,6,10,14,16,17,21,22,25; C = 5,8,11,19,23
assert.deepEqual(THI_ITEMS.filter((i) => i.subscale === 'F').map((i) => i.id), ['t1', 't2', 't4', 't7', 't9', 't12', 't13', 't15', 't18', 't20', 't24']);
assert.deepEqual(THI_ITEMS.filter((i) => i.subscale === 'E').map((i) => i.id), ['t3', 't6', 't10', 't14', 't16', 't17', 't21', 't22', 't25']);
assert.deepEqual(THI_ITEMS.filter((i) => i.subscale === 'C').map((i) => i.id), ['t5', 't8', 't11', 't19', 't23']);
assert.deepEqual(THI_OPTIONS.map((o) => o.score), [0, 2, 4]);
assert.ok(THI_ITEMS.every((i) => i.text && i.textHi), 'every item needs both locales');
assert.equal(new Set(THI_ITEMS.map((i) => i.id)).size, 25, 'item ids must be unique');

const allNo = Object.fromEntries(THI_ITEMS.map((i) => [i.id, 0]));
const allYes = Object.fromEntries(THI_ITEMS.map((i) => [i.id, 4]));
assert.equal(scoreThi({}), 0, 'unanswered items score zero');
assert.equal(scoreThi(allNo), 0);
assert.equal(scoreThi(allYes), 100);
console.log('   [PASS] 25 items, range 0-100, subscales F=11 E=9 C=5 per Newman 1996');

for (const [score, grade] of [[0, 1], [16, 1], [18, 2], [36, 2], [38, 3], [56, 3], [58, 4], [76, 4], [78, 5], [100, 5]]) {
  const band = thiBandFor(score);
  assert.equal(band.grade, grade, `score ${score} should be grade ${grade}, got ${band.grade}`);
  assert.ok(band.label && band.labelHi && band.guidance && band.guidanceHi);
}
assert.equal(thiBandFor(999).grade, 5, 'out-of-range scores fall into the last band');
console.log('   [PASS] all 5 grade boundaries (16/18, 36/38, 56/58, 76/78) map correctly');

assert.equal(scoreThiSubscale(allYes, 'F'), 44);
assert.equal(scoreThiSubscale(allYes, 'E'), 36);
assert.equal(scoreThiSubscale(allYes, 'C'), 20);
assert.equal(
  scoreThiSubscale(allYes, 'F') + scoreThiSubscale(allYes, 'E') + scoreThiSubscale(allYes, 'C'),
  100,
  'subscales must sum to the total'
);
console.log('   [PASS] subscale maxima F=44 E=36 C=20 sum to 100');

console.log('\n----------------------------------------------------');
console.log('ALL TINNITUS STUDIO TESTS PASSED!');
console.log('----------------------------------------------------');
