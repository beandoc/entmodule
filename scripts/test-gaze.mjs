import assert from 'node:assert/strict';
import {
  detectFixations, detectSaccades, scoreVOR, detectNystagmusHeuristic,
  computeAntiSaccadeErrorRate, scoreSmoothPursuit, analyseSession,
  summariseGazeAdherence, generateInsight,
} from '../src/lib/gaze-tracking.ts';

console.log('--------------------------------------------------------');
console.log('Running Gaze Analytics Tests (fixations + saccades + VOR)');
console.log('--------------------------------------------------------\n');

/** Build a gaze series at a fixed sample rate from a position function. */
const series = (n, hz, fn, startT = 0) =>
  Array.from({ length: n }, (_, i) => {
    const t = startT + (i * 1000) / hz;
    const { x, y } = fn(i, t);
    return { x, y, t, hasIris: true };
  });

const headSeries = (n, hz, fn, startT = 0) =>
  Array.from({ length: n }, (_, i) => {
    const t = startT + (i * 1000) / hz;
    return { t, yaw: fn(i, t) };
  });

// 1. Fixation detection
console.log('1. Testing I-DT fixation detection...');

// A steady gaze with sub-threshold jitter is one fixation
const steady = series(60, 60, (i) => ({ x: 0.5 + (i % 2) * 0.001, y: 0.5 }));
let fix = detectFixations(steady);
assert.equal(fix.length, 1, `a steady gaze must be one fixation, got ${fix.length}`);
assert.ok(fix[0].duration >= 900, `a 1 s hold must report ~1 s, got ${fix[0].duration}`);
assert.ok(Math.abs(fix[0].centroid.x - 0.5) < 0.01, 'centroid must sit on the held position');
console.log(`   [PASS] a 1 s steady hold reads as a single ${Math.round(fix[0].duration)} ms fixation`);

// A fast continuous sweep outruns the dispersion threshold every sample
const sweeping = series(60, 60, (i) => ({ x: 0.05 + i * 0.015, y: 0.5 }));
assert.equal(detectFixations(sweeping).length, 0, 'a fast sweep must not register as a fixation');
console.log('   [PASS] a fast continuous sweep yields no fixation');

// A slow drift still segments into short fixations — standard I-DT behaviour —
// but none of them may be mistaken for a sustained hold.
const drifting = series(60, 60, (i) => ({ x: 0.2 + i * 0.01, y: 0.5 }));
for (const f of detectFixations(drifting)) {
  assert.ok(f.duration < 300, `a drift must not yield a long fixation, got ${f.duration} ms`);
}
console.log('   [PASS] a slow drift segments into short fixations, never a sustained hold');

// A tracking dropout splits one apparent fixation into two
const beforeGap = series(30, 60, () => ({ x: 0.5, y: 0.5 }), 0);
const afterGap = series(30, 60, () => ({ x: 0.5, y: 0.5 }), 2000); // 1.5 s dropout
const split = detectFixations([...beforeGap, ...afterGap]);
assert.equal(split.length, 2, `a dropout must split the fixation, got ${split.length}`);
for (const f of split) {
  assert.ok(f.duration < 600, `neither half may absorb the 1.5 s gap (got ${f.duration} ms)`);
}
console.log('   [PASS] a 1.5 s tracking dropout splits the hold instead of inflating one fixation');

// Degenerate input must not throw
assert.deepEqual(detectFixations([]), []);
assert.deepEqual(detectFixations([{ x: 0.5, y: 0.5, t: 0, hasIris: true }]), []);
console.log('   [PASS] empty and single-sample input degrade safely');

// Long sessions stay fast (the detector must not be quadratic)
const long = series(20000, 60, () => ({ x: 0.5, y: 0.5 }));
const t0 = performance.now();
detectFixations(long);
const elapsed = performance.now() - t0;
assert.ok(elapsed < 1000, `20k samples must process well under 1 s, took ${elapsed.toFixed(0)} ms`);
console.log(`   [PASS] 20 000 samples processed in ${elapsed.toFixed(0)} ms (linear, not quadratic)`);

// 2. Saccade detection
console.log('\n2. Testing velocity-threshold saccade detection...');

// A fast jump between two holds is one saccade
const withSaccade = [
  ...series(20, 60, () => ({ x: 0.3, y: 0.5 }), 0),
  ...series(3, 60, (i) => ({ x: 0.3 + (i + 1) * 0.1, y: 0.5 }), 340),
  ...series(20, 60, () => ({ x: 0.7, y: 0.5 }), 400),
];
const sacc = detectSaccades(withSaccade);
assert.ok(sacc.length >= 1, `a 0.4-unit jump must register a saccade, got ${sacc.length}`);
assert.ok(sacc[0].peakVelocityDeg > 30, 'a saccade must exceed the velocity threshold');
assert.ok(sacc[0].direction.x > 0, 'a rightward jump must read as positive x direction');
console.log(`   [PASS] a rightward jump reads as a saccade at ${Math.round(sacc[0].peakVelocityDeg)}°/s`);

// A steady hold produces no saccades
assert.equal(detectSaccades(steady).length, 0, 'a steady hold must produce no saccades');
console.log('   [PASS] a steady hold produces no saccades');

// CRITICAL: a tracking dropout must not manufacture a phantom saccade
const dropoutJump = [
  ...series(20, 60, () => ({ x: 0.2, y: 0.5 }), 0),
  ...series(20, 60, () => ({ x: 0.9, y: 0.5 }), 3000), // reappears elsewhere after 3 s
];
assert.equal(
  detectSaccades(dropoutJump).length, 0,
  'a position jump across a 3 s dropout is unmeasured motion, not a saccade'
);
console.log('   [PASS] a jump across a 3 s dropout produces no phantom saccade');

// 3. VOR scoring
console.log('\n3. Testing VOR gain and phase...');

// Head rotating with a compensating eye: gain near 1
const N = 180, HZ = 60;
const headYaw = (i) => 10 * Math.sin((i / HZ) * 2 * Math.PI); // 1 Hz, ±10°
const head = headSeries(N, HZ, headYaw);
// Eye moves opposite the head, matched in angular terms. Normalised gaze units
// convert at DEG_PER_UNIT = 30, so an equal-and-opposite eye is yaw/30.
const compensating = series(N, HZ, (i) => ({ x: 0.5 - headYaw(i) / 30, y: 0.5 }));
const vor = scoreVOR(compensating, head);
assert.ok(vor.gain > 0.7, `a compensating eye must score high gain, got ${vor.gain}`);
assert.ok(vor.meanHeadVelocityDeg > 15, 'the head must read as actively rotating');
assert.ok(!vor.isHeadStationary, 'an actively rotating head must not read as stationary');
console.log(`   [PASS] a compensating eye scores gain ${vor.gain} (${vor.label})`);

// A frozen eye during head rotation: gain near zero
const frozen = series(N, HZ, () => ({ x: 0.5, y: 0.5 }));
const vorFrozen = scoreVOR(frozen, head);
assert.ok(vorFrozen.gain < 0.2, `a frozen eye must score near-zero gain, got ${vorFrozen.gain}`);
assert.equal(vorFrozen.label, 'impaired');
console.log(`   [PASS] a frozen eye scores gain ${vorFrozen.gain} (impaired)`);

// A stationary head cannot yield a VOR measurement
const stillHead = headSeries(N, HZ, () => 0);
const vorStill = scoreVOR(compensating, stillHead);
assert.ok(vorStill.isHeadStationary, 'a still head must be flagged as stationary');
assert.equal(vorStill.gain, 0, 'no head rotation means no VOR gain to report');
console.log('   [PASS] a stationary head reports no gain rather than a spurious one');

// Short input degrades instead of throwing
assert.equal(scoreVOR([], []).gain, 0);
assert.equal(scoreVOR(compensating.slice(0, 2), head.slice(0, 2)).gain, 0);
console.log('   [PASS] short input degrades to zero gain');

// 4. Nystagmus heuristic
console.log('\n4. Testing the nystagmus heuristic...');

// A sawtooth (slow drift + fast flick) at 3 Hz is nystagmus
const sawtooth = series(240, 60, (i) => {
  const phase = (i % 20) / 20; // 3 Hz at 60 Hz sampling
  // slow drift over 90% of the cycle, fast flick back over 10%
  const x = phase < 0.9 ? 0.5 + phase * 0.06 : 0.5 + (1 - (phase - 0.9) / 0.1) * 0.054;
  return { x, y: 0.5 };
});
const nyst = detectNystagmusHeuristic(sawtooth);
assert.ok(nyst.detected, 'a 3 Hz sawtooth must be flagged');
assert.equal(nyst.direction, 'horizontal');
assert.ok(nyst.frequencyHz >= 1 && nyst.frequencyHz <= 6, `frequency must land in band, got ${nyst.frequencyHz}`);
console.log(`   [PASS] a sawtooth is flagged at ${nyst.frequencyHz} Hz (${nyst.direction})`);

// CRITICAL: a symmetric sine — voluntary tracking — must NOT be flagged
const voluntarySine = series(240, 60, (i) => ({
  x: 0.5 + 0.05 * Math.sin((i / 60) * 2 * Math.PI * 2), // 2 Hz, same band, same amplitude
  y: 0.5,
}));
assert.equal(
  detectNystagmusHeuristic(voluntarySine).detected, false,
  'symmetric voluntary oscillation must not be reported as nystagmus'
);
console.log('   [PASS] symmetric 2 Hz voluntary tracking is NOT flagged (no false alarm)');

// CRITICAL: gaze oscillation while the head rotates is VOR, not nystagmus
const rotatingHead = headSeries(240, 60, (i) => 25 * Math.sin((i / 60) * 2 * Math.PI * 2));
assert.equal(
  detectNystagmusHeuristic(sawtooth, rotatingHead).detected, false,
  'an actively rotating head must suppress the nystagmus flag'
);
assert.ok(
  detectNystagmusHeuristic(sawtooth, headSeries(240, 60, () => 0)).detected,
  'a still head must leave the flag intact'
);
console.log('   [PASS] head rotation suppresses the flag; a still head leaves it intact');

// A flat signal is never nystagmus
assert.equal(detectNystagmusHeuristic(steady).detected, false, 'a steady gaze is not nystagmus');
assert.equal(detectNystagmusHeuristic([]).detected, false, 'empty input is not nystagmus');
console.log('   [PASS] steady and empty signals are not flagged');

// 5. Anti-saccade error rate
console.log('\n5. Testing anti-saccade error rate...');
const rightwardHead = headSeries(60, 60, (i) => i * 0.5); // steady rightward turn
// Gaze moving the SAME way as the head is a prosaccade error
const errorSacc = [{
  startT: 100, endT: 150, duration: 50, peakVelocityDeg: 90,
  direction: { x: 1, y: 0 }, from: { x: 0.4, y: 0.5 }, to: { x: 0.6, y: 0.5 }, amplitudeDeg: 6,
}];
assert.equal(computeAntiSaccadeErrorRate(errorSacc, rightwardHead), 1, 'same-direction gaze is an error');
const goodSacc = [{ ...errorSacc[0], direction: { x: -1, y: 0 } }];
assert.equal(computeAntiSaccadeErrorRate(goodSacc, rightwardHead), 0, 'opposing gaze is correct');
assert.equal(computeAntiSaccadeErrorRate([], rightwardHead), 0, 'no saccades means no error rate');
console.log('   [PASS] same-direction saccades count as errors, opposing ones do not');

// 6. Smooth pursuit scoring
console.log('\n6. Testing smooth pursuit scoring...');
const PN = 300;
const targetAt = (i) => ({ x: 0.5 + 0.35 * Math.sin((i / 60) * 2 * Math.PI * 0.4), y: 0.5 });
const targets = Array.from({ length: PN }, (_, i) => ({
  ...targetAt(i), t: (i * 1000) / 60, mode: 'horizontal',
}));

// Perfect tracking: gain near 1, error near 0
const perfect = series(PN, 60, (i) => targetAt(i));
const perfectScore = scoreSmoothPursuit(targets, perfect, detectSaccades(perfect));
assert.ok(perfectScore.pursuitGain > 0.9, `perfect tracking must score high gain, got ${perfectScore.pursuitGain}`);
assert.ok(perfectScore.meanTrackingErrorPct < 5, `perfect tracking must have low error, got ${perfectScore.meanTrackingErrorPct}%`);
assert.equal(perfectScore.quality, 'excellent');
console.log(`   [PASS] perfect tracking scores gain ${perfectScore.pursuitGain}, error ${perfectScore.meanTrackingErrorPct}%`);

// A frozen eye tracks nothing
const frozenPursuit = series(PN, 60, () => ({ x: 0.5, y: 0.5 }));
const frozenScore = scoreSmoothPursuit(targets, frozenPursuit, detectSaccades(frozenPursuit));
assert.ok(frozenScore.pursuitGain < 0.2, `a frozen eye must score near-zero gain, got ${frozenScore.pursuitGain}`);
assert.equal(frozenScore.quality, 'impaired');
console.log(`   [PASS] a frozen eye scores gain ${frozenScore.pursuitGain} (impaired)`);

// Catch-up saccades are only those moving TOWARD the target. Build a gaze that
// makes one corrective saccade toward a target parked on the right, then one
// away from it — only the first is a catch-up.
const parked = Array.from({ length: 66 }, (_, i) => ({
  x: 0.8, y: 0.5, t: (i * 1000) / 60, mode: 'horizontal',
}));
const correcting = [
  ...series(20, 60, () => ({ x: 0.30, y: 0.5 }), 0),                              // hold left
  ...series(3, 60, (i) => ({ x: 0.30 + (i + 1) * 0.1, y: 0.5 }), (20 * 1000) / 60), // jump right, toward target
  ...series(20, 60, () => ({ x: 0.60, y: 0.5 }), (23 * 1000) / 60),               // hold
  ...series(3, 60, (i) => ({ x: 0.60 - (i + 1) * 0.083, y: 0.5 }), (43 * 1000) / 60), // jump left, away
  ...series(20, 60, () => ({ x: 0.35, y: 0.5 }), (46 * 1000) / 60),               // hold
];
const correctingSaccades = detectSaccades(correcting);
assert.equal(correctingSaccades.length, 2, `the fixture must contain two saccades, got ${correctingSaccades.length}`);
const correctingScore = scoreSmoothPursuit(parked, correcting, correctingSaccades);
assert.equal(
  correctingScore.catchUpSaccadeCount, 1,
  `only the toward-target saccade counts, got ${correctingScore.catchUpSaccadeCount} of 2`
);
assert.equal(
  scoreSmoothPursuit(targets, perfect, []).catchUpSaccadeCount, 0,
  'no saccades means no catch-up saccades'
);
console.log('   [PASS] of two saccades, only the one moving toward the target counts as catch-up');

// Insufficient data degrades with guidance rather than a bogus score
const thin = scoreSmoothPursuit(targets.slice(0, 2), perfect.slice(0, 2), []);
assert.equal(thin.pursuitGain, 0);
assert.ok(thin.guidance.length > 0, 'a degraded score must still explain itself');
console.log('   [PASS] insufficient data yields a zero score with guidance');

// 7. Full pipeline and reporting
console.log('\n7. Testing the session pipeline...');
const analytics = analyseSession(compensating, head, 'en');
assert.ok(analytics.vorScore, 'a session with head data must produce a VOR score');
assert.ok(analytics.insight.length > 0, 'a session must produce an insight string');
assert.ok(analytics.fixationFraction >= 0 && analytics.fixationFraction <= 1, 'fixation fraction must be a proportion');
assert.ok(Number.isFinite(analytics.meanSaccadeVelocity), 'mean saccade velocity must be finite');
assert.ok(analyseSession([], [], 'en').insight.length > 0, 'an empty session must still report something');
assert.ok(analyseSession(compensating, head, 'hi').insight.length > 0, 'Hindi insights must render');
console.log('   [PASS] the pipeline produces finite metrics and bilingual insights');

// Adherence summary
const mkSession = (gain, fixMs) => ({
  id: String(Math.random()), date: '2026-08-07', exerciseId: 'gaze-session',
  analytics: { ...analytics, vorScore: { ...analytics.vorScore, gain }, meanFixationDuration: fixMs },
  durationMs: 60000, createdAt: '2026-08-07T10:00:00Z',
});
assert.equal(summariseGazeAdherence([]).trend, 'insufficient');
const improving = summariseGazeAdherence([
  mkSession(0.5, 100), mkSession(0.5, 100), mkSession(0.6, 100),
  mkSession(0.8, 100), mkSession(0.9, 100), mkSession(0.9, 100),
]);
assert.equal(improving.trend, 'improving', `rising gains must read as improving, got ${improving.trend}`);
assert.equal(improving.totalSessions, 6);
const declining = summariseGazeAdherence([
  mkSession(0.9, 100), mkSession(0.9, 100), mkSession(0.8, 100),
  mkSession(0.6, 100), mkSession(0.5, 100), mkSession(0.5, 100),
]);
assert.equal(declining.trend, 'declining', `falling gains must read as declining, got ${declining.trend}`);
console.log('   [PASS] adherence trends track direction across sessions');

console.log('\n--------------------------------------------------------');
console.log('All gaze analytics tests passed.');
console.log('--------------------------------------------------------');
