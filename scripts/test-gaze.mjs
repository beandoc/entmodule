import assert from 'node:assert/strict';
import {
  detectFixations, detectSaccades, scoreVOR, detectNystagmusHeuristic,
  computeAntiSaccadeErrorRate, scoreSmoothPursuit, analyseSession,
  summariseGazeAdherence, generateInsight,
  computeSlowPhaseVelocity, computeOptokineticMetrics,
  oknTargetX, OKN_STIMULUS_DEG_PER_SEC, OKN_DIRECTION_PERIOD_SEC, DEG_PER_UNIT,
  downsampleSeries, mergeGazeSessions, validateVorX2Opposition,
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

// Phase: an eye that opposes the head with no delay reports no lag
assert.ok(
  Math.abs(vor.phaseLagMs) <= 10,
  `an instantaneous compensating eye must report ~0 ms lag, got ${vor.phaseLagMs}`
);
console.log(`   [PASS] an instantaneous compensating eye reports ${vor.phaseLagMs} ms lag`);

// CRITICAL: a known delay must actually be recovered. This is the regression
// guard for the search that used to be seeded so it could never update, and so
// reported 0° for every patient regardless of how late their eyes were.
for (const lagMs of [25, 50, 100]) {
  const delayed = series(N, HZ, (_i, t) => ({
    x: 0.5 - (10 * Math.sin(((t - lagMs) / 1000) * 2 * Math.PI)) / 30,
    y: 0.5,
  }));
  const delayedVor = scoreVOR(delayed, head);
  assert.ok(
    Math.abs(delayedVor.phaseLagMs - lagMs) <= 10,
    `a ${lagMs} ms delayed eye must read back as ~${lagMs} ms, got ${delayedVor.phaseLagMs}`
  );
  // At 1 Hz head motion, one cycle is 360°, so the angle tracks the delay.
  const expectedDeg = (lagMs / 1000) * 360;
  assert.ok(
    Math.abs(delayedVor.phaseErrorDeg - expectedDeg) <= 12,
    `${lagMs} ms at 1 Hz is ~${expectedDeg.toFixed(0)}°, got ${delayedVor.phaseErrorDeg}`
  );
}
console.log('   [PASS] 25, 50 and 100 ms eye delays are each recovered in ms and in degrees');

// A head that never moved gives the correlation nothing to lock onto, and an
// argmin over noise must not be dressed up as a measurement.
assert.equal(
  scoreVOR(compensating, stillHead).phaseLagMs, 0,
  'a stationary head must report no phase lag rather than a spurious one'
);
assert.equal(
  scoreVOR(frozen, head).phaseErrorDeg, 0,
  'a frozen eye correlates with nothing, so no phase angle may be reported'
);
console.log('   [PASS] uncorrelated signals report no phase rather than noise');

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

// Perfect tracking: gain near 1, error near 0, directional agreement near 1
const perfect = series(PN, 60, (i) => targetAt(i));
const perfectScore = scoreSmoothPursuit(targets, perfect, detectSaccades(perfect));
assert.ok(perfectScore.pursuitGain > 0.9, `perfect tracking must score high gain, got ${perfectScore.pursuitGain}`);
assert.ok(perfectScore.directionalAgreement > 0.9, `perfect tracking must have near-1 directional agreement, got ${perfectScore.directionalAgreement}`);
assert.ok(perfectScore.meanTrackingErrorPct < 5, `perfect tracking must have low error, got ${perfectScore.meanTrackingErrorPct}%`);
assert.equal(perfectScore.quality, 'excellent');
console.log(`   [PASS] perfect tracking scores gain ${perfectScore.pursuitGain}, agreement ${perfectScore.directionalAgreement}, error ${perfectScore.meanTrackingErrorPct}%`);

// A frozen eye tracks nothing
const frozenPursuit = series(PN, 60, () => ({ x: 0.5, y: 0.5 }));
const frozenScore = scoreSmoothPursuit(targets, frozenPursuit, detectSaccades(frozenPursuit));
assert.ok(frozenScore.pursuitGain < 0.2, `a frozen eye must score near-zero gain, got ${frozenScore.pursuitGain}`);
assert.equal(frozenScore.quality, 'impaired');
console.log(`   [PASS] a frozen eye scores gain ${frozenScore.pursuitGain} (impaired)`);

// CRITICAL (regression guard): tracking exactly opposite the target — equal
// amplitude and speed, 180° out of phase — used to score a falsely healthy
// gain near 1.0 from an amplitude-only ratio. It must now score negative gain,
// negative directional agreement, and 'impaired' — never 'excellent'/'good'.
const antiPhaseAt = (i) => ({ x: 0.5 - 0.35 * Math.sin((i / 60) * 2 * Math.PI * 0.4), y: 0.5 });
const antiPhase = series(PN, 60, (i) => antiPhaseAt(i));
const antiPhaseScore = scoreSmoothPursuit(targets, antiPhase, detectSaccades(antiPhase));
assert.ok(antiPhaseScore.pursuitGain < 0, `anti-phase tracking must score negative gain, got ${antiPhaseScore.pursuitGain}`);
assert.ok(antiPhaseScore.directionalAgreement < -0.5, `anti-phase tracking must show strong negative agreement, got ${antiPhaseScore.directionalAgreement}`);
assert.equal(antiPhaseScore.quality, 'impaired', 'anti-phase tracking must never read as good tracking');
console.log(`   [PASS] anti-phase tracking (equal amplitude, opposite direction) scores gain ${antiPhaseScore.pursuitGain}, agreement ${antiPhaseScore.directionalAgreement}, quality impaired`);

// Uncorrelated motion (same amplitude, unrelated frequency) must not pass as
// tracking just because the two happen to have similar speed on average.
const uncorrelated = series(PN, 60, (i) => ({ x: 0.5 + 0.35 * Math.sin((i / 60) * 2 * Math.PI * 1.7), y: 0.5 }));
const uncorrelatedScore = scoreSmoothPursuit(targets, uncorrelated, detectSaccades(uncorrelated));
assert.ok(Math.abs(uncorrelatedScore.directionalAgreement) < 0.5, `unrelated motion must show weak agreement, got ${uncorrelatedScore.directionalAgreement}`);
assert.equal(uncorrelatedScore.quality, 'impaired', 'weakly-correlated motion must not read as good tracking');
console.log(`   [PASS] motion at an unrelated frequency shows weak agreement (${uncorrelatedScore.directionalAgreement}) and reads impaired`);

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

// 6b. VOR x2 head/target opposition validation
console.log('\n6b. Testing VOR x2 head-target opposition validation...');

// A head genuinely turning opposite the moving dot must validate.
const opposingHead = headSeries(PN, 60, (i) => -25 * Math.sin((i / 60) * 2 * Math.PI * 0.4));
const opposed = validateVorX2Opposition(targets, opposingHead);
assert.ok(opposed.oppositionValidated, `head genuinely coupled to the target must validate, got r=${opposed.headTargetCorrelation}`);
console.log(`   [PASS] head opposing the target validates (r=${opposed.headTargetCorrelation})`);

// CRITICAL: a head that barely moved must NOT validate — this is the case
// scoreVOR's magnitude-only gain could previously score as "excellent" with
// no check that the VOR x2 manoeuvre (head opposing target) ever happened.
const stillHeadX2 = headSeries(PN, 60, () => 0);
const notOpposed = validateVorX2Opposition(targets, stillHeadX2);
assert.equal(notOpposed.oppositionValidated, false, 'a near-stationary head must not validate as opposing the target');
console.log('   [PASS] a stationary head does not validate opposition');

// A head moving at a frequency unrelated to the target must not validate either.
const unrelatedHead = headSeries(PN, 60, (i) => 25 * Math.sin((i / 60) * 2 * Math.PI * 1.7));
const unrelatedOpp = validateVorX2Opposition(targets, unrelatedHead);
assert.equal(unrelatedOpp.oppositionValidated, false, 'head motion unrelated to the target must not validate');
console.log(`   [PASS] head motion at an unrelated frequency does not validate (r=${unrelatedOpp.headTargetCorrelation})`);

// Degenerate input must not throw.
assert.equal(validateVorX2Opposition([], []).oppositionValidated, false);
console.log('   [PASS] empty input degrades safely');

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

// 8. Slow phase velocity
console.log('\n8. Testing slow phase velocity...');

// The 3 Hz sawtooth from section 4 drifts 0.054 units over 0.3 s. In degrees
// that is 0.054 x 30 = 1.62°, so SPV must come out at ~5.4 °/s.
const spv = computeSlowPhaseVelocity(sawtooth);
assert.equal(spv.axis, 'horizontal', 'the drifting axis must be the analysed one');
assert.ok(
  Math.abs(spv.spvDegPerSec - 5.4) < 0.6,
  `a 1.62° drift per 0.3 s beat is ~5.4 °/s, got ${spv.spvDegPerSec}`
);
assert.equal(spv.fastPhaseDirection, 'left', 'a rightward drift flicks back left-beating');
assert.ok(spv.signedSpvDegPerSec > 0, 'the drift itself runs rightward, so signed SPV is positive');
assert.ok(spv.beats >= 10 && spv.beats <= 13, `4 s at 3 Hz is ~12 beats, got ${spv.beats}`);
assert.ok(
  Math.abs(spv.beatsPerMinute - 180) < 30,
  `3 Hz is ~180 beats/min, got ${spv.beatsPerMinute}`
);
console.log(`   [PASS] the sawtooth measures ${spv.spvDegPerSec} °/s SPV, ${spv.fastPhaseDirection}-beating at ${spv.beatsPerMinute}/min`);

// Mirror the sawtooth and the beat must be named the other way round
const mirroredSaw = sawtooth.map(p => ({ ...p, x: 1 - p.x }));
const spvMirrored = computeSlowPhaseVelocity(mirroredSaw);
assert.equal(spvMirrored.fastPhaseDirection, 'right', 'a leftward drift flicks back right-beating');
assert.ok(
  Math.abs(spvMirrored.spvDegPerSec - spv.spvDegPerSec) < 0.3,
  'mirroring changes the beat direction, not the speed'
);
console.log('   [PASS] mirroring the drift flips the beat direction and preserves the speed');

// A vertical sawtooth is measured on the vertical axis
const verticalSaw = sawtooth.map(p => ({ ...p, x: 0.5, y: p.x }));
const spvVertical = computeSlowPhaseVelocity(verticalSaw);
assert.equal(spvVertical.axis, 'vertical', 'the larger excursion picks the axis');
assert.equal(spvVertical.fastPhaseDirection, 'up', 'a downward drift flicks back up-beating');
console.log('   [PASS] a vertical drift is measured on the vertical axis and named up-beating');

// A steady gaze has no beats to measure
const spvSteady = computeSlowPhaseVelocity(steady);
assert.equal(spvSteady.spvDegPerSec, 0, 'a steady gaze has no drift velocity');
assert.equal(spvSteady.fastPhaseDirection, 'none');
assert.equal(computeSlowPhaseVelocity([]).beats, 0, 'empty input degrades safely');
console.log('   [PASS] a steady gaze and empty input yield no slow phases');

// A tracking dropout must not be fitted as one long drift across the gap
const spvGapped = computeSlowPhaseVelocity([
  ...series(30, 60, (i) => ({ x: 0.40 + i * 0.002, y: 0.5 }), 0),
  ...series(30, 60, (i) => ({ x: 0.70 + i * 0.002, y: 0.5 }), 3000),
]);
for (const seg of spvGapped.segments) {
  assert.ok(seg.durationMs < 700, `no slow phase may span the 2.5 s dropout, got ${seg.durationMs} ms`);
}
console.log('   [PASS] a dropout breaks the drift instead of being fitted across');

// The nystagmus flag now carries the measurement, not just the alarm
const quantified = detectNystagmusHeuristic(sawtooth);
assert.ok(quantified.detected);
assert.ok(
  Math.abs(quantified.slowPhaseVelocityDegPerSec - 5.4) < 0.6,
  `the flag must carry its SPV, got ${quantified.slowPhaseVelocityDegPerSec}`
);
assert.equal(quantified.fastPhaseDirection, 'left');
assert.ok(quantified.beatsPerMinute > 0, 'the flag must carry a beat rate');

// A drift below the clinical floor is not worth alarming a patient over
const featherDrift = series(240, 60, (i) => {
  const phase = (i % 20) / 20;
  const x = phase < 0.9 ? 0.5 + phase * 0.012 : 0.5 + (1 - (phase - 0.9) / 0.1) * 0.0108;
  return { x, y: 0.5 };
});
assert.equal(
  detectNystagmusHeuristic(featherDrift).detected, false,
  'a sub-clinical drift (~1 °/s SPV) must not be flagged'
);
console.log('   [PASS] the flag carries SPV and beat direction, and sub-clinical drift is not flagged');

// 9. Optokinetic metrics
console.log('\n9. Testing optokinetic slow phase velocity...');

const OKN_HZ = 60;
const OKN_SECONDS = OKN_DIRECTION_PERIOD_SEC * 2;
const OKN_SAMPLES = OKN_SECONDS * OKN_HZ;
const BEAT_SEC = 0.3;
const SLOW_FRACTION = 0.85;

const oknTargets = Array.from({ length: OKN_SAMPLES }, (_, i) => {
  const t = (i * 1000) / OKN_HZ;
  return { x: oknTargetX(t / 1000), y: 0.5, t, mode: 'optokinetic' };
});

/** An eye following the sweep at `gainRight` one way and `gainLeft` the other. */
const oknGaze = (gainRight, gainLeft) =>
  series(OKN_SAMPLES, OKN_HZ, (_i, t) => {
    const sec = t / 1000;
    const rightward = Math.floor(sec / OKN_DIRECTION_PERIOD_SEC) % 2 === 0;
    const sign = rightward ? 1 : -1;
    const unitsPerSec = ((rightward ? gainRight : gainLeft) * OKN_STIMULUS_DEG_PER_SEC) / DEG_PER_UNIT;
    const slowSec = BEAT_SEC * SLOW_FRACTION;
    const amplitude = unitsPerSec * slowSec;
    const phase = sec % BEAT_SEC;
    const offset = phase < slowSec
      ? phase * unitsPerSec - amplitude / 2                                   // drift with the sweep
      : amplitude / 2 - ((phase - slowSec) / (BEAT_SEC - slowSec)) * amplitude; // flick back
    return { x: 0.5 + sign * offset, y: 0.5 };
  });

const oknSymmetric = computeOptokineticMetrics(oknGaze(1.0, 1.0), oknTargets);
assert.ok(
  Math.abs(oknSymmetric.slowPhaseVelocityRight - OKN_STIMULUS_DEG_PER_SEC) < 3,
  `a gain-1.0 eye must drift at the stimulus speed, got ${oknSymmetric.slowPhaseVelocityRight} °/s`
);
assert.ok(
  Math.abs(oknSymmetric.oknGainRight - 1) < 0.15 && Math.abs(oknSymmetric.oknGainLeft - 1) < 0.15,
  `gains must land near 1.0, got R ${oknSymmetric.oknGainRight} / L ${oknSymmetric.oknGainLeft}`
);
assert.ok(
  oknSymmetric.asymmetryPercent < 15,
  `a symmetric response must read below the 15% threshold, got ${oknSymmetric.asymmetryPercent}%`
);
console.log(`   [PASS] a symmetric gain-1.0 response reads R ${oknSymmetric.slowPhaseVelocityRight} / L ${oknSymmetric.slowPhaseVelocityLeft} °/s, ${oknSymmetric.asymmetryPercent}% asymmetry`);

// A weak response one way is exactly what the asymmetry figure exists to catch
const oknAsymmetric = computeOptokineticMetrics(oknGaze(1.0, 0.4), oknTargets);
assert.ok(
  oknAsymmetric.slowPhaseVelocityLeft < oknAsymmetric.slowPhaseVelocityRight,
  'the weaker direction must measure the lower SPV'
);
assert.ok(
  oknAsymmetric.asymmetryPercent > 15,
  `a 1.0 vs 0.4 response must exceed the 15% threshold, got ${oknAsymmetric.asymmetryPercent}%`
);
console.log(`   [PASS] a 1.0-vs-0.4 response reads ${oknAsymmetric.asymmetryPercent}% asymmetry (abnormal)`);

// An eye that ignored the sweep scores nothing rather than something
const oknFrozen = computeOptokineticMetrics(
  series(OKN_SAMPLES, OKN_HZ, () => ({ x: 0.5, y: 0.5 })),
  oknTargets,
);
assert.equal(oknFrozen.slowPhaseVelocityRight, 0, 'a frozen eye has no optokinetic response');
assert.equal(oknFrozen.asymmetryPercent, 0, 'no response means no asymmetry to report');
assert.equal(computeOptokineticMetrics([], []).oknGainRight, 0, 'empty input degrades safely');
console.log('   [PASS] a frozen eye and empty input report no response rather than a spurious one');

// The stimulus generator must actually run at the speed the gain divides by
// Sampled inside one sweep, clear of the wrap back to the far edge.
const sweepStart = oknTargetX(0.1);
const sweepEnd = oknTargetX(0.6);
assert.ok(
  Math.abs(((sweepEnd - sweepStart) * DEG_PER_UNIT) / 0.5 - OKN_STIMULUS_DEG_PER_SEC) < 0.5,
  `the sweep must travel at ${OKN_STIMULUS_DEG_PER_SEC} °/s`
);
assert.ok(
  oknTargetX(OKN_DIRECTION_PERIOD_SEC + 0.6) < oknTargetX(OKN_DIRECTION_PERIOD_SEC + 0.1),
  'the sweep must reverse direction on the second leg'
);
console.log(`   [PASS] the sweep runs at ${OKN_STIMULUS_DEG_PER_SEC} °/s and reverses after ${OKN_DIRECTION_PERIOD_SEC} s`);

// 10. Backend telemetry helpers
console.log('\n10. Testing telemetry downsampling and session merge...');

// A short series is returned unchanged — nothing to reduce.
const shortSeries = Array.from({ length: 50 }, (_, i) => ({ t: i }));
assert.deepEqual(downsampleSeries(shortSeries, 400), shortSeries, 'a series under the cap must pass through unchanged');
console.log('   [PASS] a series under the cap is returned unchanged');

// A long series is reduced to exactly the cap, keeping the first and last sample.
const longSeries = Array.from({ length: 10000 }, (_, i) => ({ t: i }));
const down = downsampleSeries(longSeries, 400);
assert.equal(down.length, 400, `downsampling to 400 must yield exactly 400 samples, got ${down.length}`);
assert.equal(down[0].t, 0, 'the first sample must survive downsampling');
assert.equal(down[down.length - 1].t, 9999, 'the last sample must survive downsampling');
// Monotonically increasing — the stride must not reorder or duplicate out of order.
for (let i = 1; i < down.length; i++) {
  assert.ok(down[i].t > down[i - 1].t, 'downsampled indices must stay strictly increasing');
}
console.log(`   [PASS] 10 000 samples downsample to exactly ${down.length}, first/last preserved, order intact`);

// Degenerate caps must not throw.
assert.deepEqual(downsampleSeries(longSeries, 0), [], 'a zero cap must yield an empty series');
assert.equal(downsampleSeries(longSeries, 1).length, 1, 'a cap of 1 must yield exactly one sample');
console.log('   [PASS] a zero cap and a cap of one degrade safely');

// mergeGazeSessions: de-duplicates by id, local wins on conflict, sorted oldest-first.
const mkSess = (id, createdAt, gain) => ({
  id, date: createdAt.slice(0, 10), exerciseId: 'gaze-session', durationMs: 1000, createdAt,
  analytics: { ...analytics, vorScore: { ...analytics.vorScore, gain } },
});
const remoteOnly = mkSess('a', '2026-01-01T00:00:00.000Z', 0.5);
const localOnly = mkSess('b', '2026-01-02T00:00:00.000Z', 0.6);
const conflictRemote = mkSess('c', '2026-01-03T00:00:00.000Z', 0.1);
const conflictLocal = mkSess('c', '2026-01-03T00:00:00.000Z', 0.9);

const merged = mergeGazeSessions([localOnly, conflictLocal], [remoteOnly, conflictRemote]);
assert.equal(merged.length, 3, `merging must de-duplicate by id, got ${merged.length}`);
assert.deepEqual(merged.map(s => s.id), ['a', 'b', 'c'], 'merged sessions must sort oldest-first by createdAt');
assert.equal(
  merged.find(s => s.id === 'c').analytics.vorScore.gain, 0.9,
  'on an id conflict the local copy must win'
);
console.log('   [PASS] mergeGazeSessions de-duplicates by id, sorts oldest-first, and local wins conflicts');

console.log('\n--------------------------------------------------------');
console.log('All gaze analytics tests passed.');
console.log('--------------------------------------------------------');
