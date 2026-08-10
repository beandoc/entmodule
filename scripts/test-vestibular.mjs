import assert from 'node:assert/strict';
import {
  eulerFromMatrix, matrixFromEuler, poseFromAnchors, clampPose, relativePose,
  mirrorPose, CERVICAL_ROM_LIMIT,
  createOneEuroState, oneEuroStep, createPoseSmoothingState, smoothPose,
  createRepState, stepRepCounter, DEFAULT_REP_CONFIG, repConfigFor,
  scoreSession, coachingCue, VOR_MIN_VELOCITY,
  EXERCISES, exerciseById, EPLEY, BRANDT_DAROFF, manoeuvreDuration, renderInstruction,
  RED_FLAGS, hasRedFlags,
  DHI_ITEMS, DHI_OPTIONS, DHI_SUBSCALE_MAX, scoreDhi, scoreDhiSubscale, dhiBandFor, DHI_BANDS,
  summariseAdherence, mergeSessions,
} from '../src/lib/vestibular-rx.ts';

console.log('--------------------------------------------------------');
console.log('Running Vestibular Rehab Tests (pose + reps + DHI + plan)');
console.log('--------------------------------------------------------\n');

const approx = (a, b, tol, msg) =>
  assert.ok(Math.abs(a - b) <= tol, `${msg} — expected ~${b}, got ${a}`);

// 1. Euler decomposition round-trips through the rotation matrix
console.log('1. Testing head-pose matrix decomposition...');
for (const pose of [
  { yaw: 0, pitch: 0, roll: 0 },
  { yaw: 30, pitch: 0, roll: 0 },
  { yaw: 0, pitch: -25, roll: 0 },
  { yaw: 0, pitch: 0, roll: 18 },
  { yaw: -42, pitch: 12, roll: -9 },
  { yaw: 65, pitch: -33, roll: 21 },
]) {
  const recovered = eulerFromMatrix(matrixFromEuler(pose));
  approx(recovered.yaw, pose.yaw, 0.15, `yaw round-trip for ${JSON.stringify(pose)}`);
  approx(recovered.pitch, pose.pitch, 0.15, `pitch round-trip for ${JSON.stringify(pose)}`);
  approx(recovered.roll, pose.roll, 0.15, `roll round-trip for ${JSON.stringify(pose)}`);
}
console.log('   [PASS] YXZ decomposition round-trips within 0.15° across the cervical range');

assert.deepEqual(eulerFromMatrix([]), { yaw: 0, pitch: 0, roll: 0 }, 'a short matrix must not throw');
assert.deepEqual(eulerFromMatrix(new Float32Array(16)), { yaw: 0, pitch: 0, roll: 0 });
console.log('   [PASS] malformed / zero matrices degrade to a neutral pose instead of NaN');

// Row-major input must be read differently from column-major
const asymmetric = matrixFromEuler({ yaw: 40, pitch: 0, roll: 0 });
assert.notDeepEqual(
  eulerFromMatrix(asymmetric, true),
  eulerFromMatrix(asymmetric, false),
  'the columnMajor flag must actually change the reading'
);
console.log('   [PASS] columnMajor flag is honoured');

// 2. 2D-anchor fallback
console.log('\n2. Testing the 2D landmark fallback...');
const level = {
  nose: { x: 320, y: 250 },
  leftEye: { x: 280, y: 220 },
  rightEye: { x: 360, y: 220 },
  leftContour: { x: 240, y: 240 },
  rightContour: { x: 400, y: 240 },
  chin: { x: 320, y: 320 },
  forehead: { x: 320, y: 150 },
};
const levelPose = poseFromAnchors(level);
approx(levelPose.yaw, 0, 0.5, 'a centred nose must read as zero yaw');
approx(levelPose.roll, 0, 0.5, 'a level eye line must read as zero roll');

// Nose displaced halfway towards the right contour ⇒ asin(0.5) = 30°
const turned = poseFromAnchors({ ...level, nose: { x: 320 + 40, y: 250 } });
approx(turned.yaw, 30, 0.5, 'a half-width nose offset must read as 30° yaw');
assert.ok(turned.yaw > 0, 'turning towards the right contour must be positive yaw');

// A tilted eye line reads as roll
const tilted = poseFromAnchors({
  ...level,
  leftEye: { x: 280, y: 200 },
  rightEye: { x: 360, y: 240 },
});
approx(tilted.roll, 26.6, 1, 'a 40/80 eye-line slope must read as ~26.6° roll');

// Degenerate geometry must not produce NaN
const degenerate = poseFromAnchors({ ...level, leftContour: { x: 320, y: 240 }, rightContour: { x: 320, y: 240 } });
assert.deepEqual(degenerate, { yaw: 0, pitch: 0, roll: 0 }, 'zero face width must not divide by zero');
console.log('   [PASS] yaw/roll/pitch derive correctly and degenerate geometry is safe');

// 3. Clamping, calibration, mirroring
console.log('\n3. Testing clamping, calibration and mirroring...');
const wild = clampPose({ yaw: 250, pitch: -900, roll: 1000 });
assert.equal(wild.yaw, CERVICAL_ROM_LIMIT.yaw);
assert.equal(wild.pitch, -CERVICAL_ROM_LIMIT.pitch);
assert.equal(wild.roll, CERVICAL_ROM_LIMIT.roll);
assert.equal(clampPose({ yaw: NaN, pitch: NaN, roll: NaN }).yaw, -CERVICAL_ROM_LIMIT.yaw, 'NaN must clamp, not propagate');

const calibrated = relativePose({ yaw: 12, pitch: 5, roll: -7 }, { yaw: 10, pitch: 4, roll: -8 });
assert.deepEqual(calibrated, { yaw: 2, pitch: 1, roll: 1 }, 'calibration must subtract the neutral pose');
assert.deepEqual(mirrorPose({ yaw: 20, pitch: 10, roll: -5 }), { yaw: -20, pitch: 10, roll: 5 });
console.log('   [PASS] ROM clamping, neutral-pose calibration and selfie mirroring');

// 4. One-Euro head smoothing: lags when still, tracks when fast
console.log('\n4. Testing One-Euro head smoothing...');
const FRAME_MS = 1000 / 60;

// A tiny step held for several frames is landmark-noise-scale motion and must
// stay damped rather than being followed exactly.
let s1 = createOneEuroState();
let t1 = 0;
s1 = oneEuroStep(s1, 0, t1).state; // prime at rest
let lastSmall = 0;
for (let i = 0; i < 8; i++) {
  t1 += FRAME_MS;
  const r = oneEuroStep(s1, 1, t1);
  s1 = r.state;
  lastSmall = r.value;
}
assert.ok(lastSmall < 0.95, `a tiny 1° step must be damped, not followed exactly, got ${lastSmall}`);
console.log(`   [PASS] a 1° step damps to ${lastSmall.toFixed(2)}° after 8 frames at 60 fps`);

// A genuine fast head thrust (VOR-speed) must pass through with negligible lag.
let s2 = createOneEuroState();
let t2 = 0;
s2 = oneEuroStep(s2, 0, t2).state; // prime at rest
t2 += FRAME_MS;
const fast = oneEuroStep(s2, 60, t2).value;
assert.ok(fast > 50, `a fast head thrust must not be lagged, got ${fast}`);
console.log(`   [PASS] a 60° single-frame thrust passes at ${fast.toFixed(1)}°`);

// Frame-rate independence: the same physical motion filtered at 30 fps and at
// 60 fps must converge to comparable values — the old speed-per-frame blend was
// frame-rate dependent because it never divided by dt. (A very short handful-
// of-samples movement legitimately differs a little between rates — that is
// ordinary discretisation, not a bug — so this uses a clinically realistic
// 300 ms thrust where both rates have enough samples to agree closely.)
const trackRamp = (hz) => {
  let s = createOneEuroState();
  let t = 0;
  s = oneEuroStep(s, 0, t).state;
  let last = 0;
  const dtMs = 1000 / hz;
  const totalMs = 300; // ~133 deg/s, a brisk VOR head thrust
  for (let elapsed = dtMs; elapsed <= totalMs; elapsed += dtMs) {
    t = elapsed;
    const target = (elapsed / totalMs) * 40; // ramps 0 -> 40 deg
    const r = oneEuroStep(s, target, t);
    s = r.state;
    last = r.value;
  }
  return last;
};
const at30 = trackRamp(30);
const at60 = trackRamp(60);
assert.ok(
  Math.abs(at30 - at60) < 1,
  `30 fps and 60 fps must track the same ramp comparably, got ${at30.toFixed(1)} vs ${at60.toFixed(1)}`
);
console.log(`   [PASS] a 40° / 300 ms thrust tracks to ${at30.toFixed(1)}° at 30 fps and ${at60.toFixed(1)}° at 60 fps`);

// A tracking dropout must reset rather than compute a velocity across the gap.
let s3 = createOneEuroState();
s3 = oneEuroStep(s3, 0, 0).state;
s3 = oneEuroStep(s3, 5, FRAME_MS).state;
const afterGap = oneEuroStep(s3, 30, FRAME_MS + 1000); // 1 s dropout, then a new pose
assert.equal(afterGap.value, 30, 'a long dropout must snap to the new sample, not smooth across it');
console.log('   [PASS] a 1 s dropout resets the filter instead of manufacturing a huge velocity');

// Pure and deterministic: replaying the same input twice from the same state
// must produce identical output (no hidden mutable state).
const seedState = oneEuroStep(createOneEuroState(), 10, 0).state;
const replayA = oneEuroStep(seedState, 15, FRAME_MS).value;
const replayB = oneEuroStep(seedState, 15, FRAME_MS).value;
assert.equal(replayA, replayB, 'the same state and input must produce the same output');
console.log('   [PASS] oneEuroStep is pure — replaying the same state is deterministic');

// smoothPose applies the filter across all three axes together.
let poseState = createPoseSmoothingState();
poseState = smoothPose(poseState, { yaw: 0, pitch: 0, roll: 0 }, 0).state;
const posed = smoothPose(poseState, { yaw: 60, pitch: -30, roll: 10 }, FRAME_MS);
assert.ok(Math.abs(posed.pose.yaw) > 40, 'yaw must track a fast thrust');
assert.ok(posed.pose.pitch < -20, 'pitch must track independently of yaw');
console.log(`   [PASS] smoothPose tracks yaw ${posed.pose.yaw}° and pitch ${posed.pose.pitch}° independently`);

// 5. Repetition state machine
console.log('\n5. Testing the repetition state machine...');
const config = { ...DEFAULT_REP_CONFIG, targetAngle: 40, requireAlternation: false };

// Drive a clean left-right-left-right sweep
const sweep = (state, cfg, path, startAt = 1000, stepMs = 100) => {
  let s = state;
  let t = startAt;
  const events = [];
  for (const v of path) {
    const r = stepRepCounter(s, cfg, v, t);
    s = r.state;
    events.push(r.event);
    t += stepMs;
  }
  return { state: s, events, endAt: t };
};

const excursion = (peak) => [0, peak * 0.5, peak, peak * 0.5, 0];
let run = sweep(createRepState(), config, [
  ...excursion(45), ...excursion(-45), ...excursion(45), ...excursion(-45),
]);
assert.equal(run.state.reps, 4, `four excursions must count four reps, got ${run.state.reps}`);
assert.equal(run.state.phase, 'neutral');
assert.deepEqual(run.state.peaks, [45, 45, 45, 45]);
console.log('   [PASS] four full excursions -> 4 reps, peaks recorded');

// Holding at the peak must not accumulate reps
run = sweep(createRepState(), config, [0, 45, 45, 45, 45, 45, 45, 45, 45]);
assert.equal(run.state.reps, 0, 'holding at end range must not count reps');
assert.equal(run.state.phase, 'excursion');
console.log('   [PASS] a held position counts zero reps (counting happens on the return)');

// Movement that never clears the peak threshold counts nothing
run = sweep(createRepState(), config, [0, 20, 25, 20, 0, 22, 0]);
assert.equal(run.state.reps, 0, 'sub-threshold wobble must not count');
console.log('   [PASS] sub-threshold movement is ignored (hysteresis holds)');

// Returning only partway must not close the rep
run = sweep(createRepState(), config, [0, 45, 20, 45, 20, 45]);
assert.equal(run.state.reps, 0, 'the head must reach the neutral band to close a rep');
console.log('   [PASS] a partial return does not close a repetition');

// Alternation is enforced when the drill demands it
const alternating = { ...config, requireAlternation: true };
run = sweep(createRepState(), alternating, [...excursion(45), ...excursion(45), ...excursion(-45)]);
assert.equal(run.state.reps, 2, `same-side repeats must be rejected, got ${run.state.reps}`);
assert.ok(run.events.includes('rejected-same-side'), 'a same-side rejection must be reported');
console.log('   [PASS] alternation enforced — a repeated side is rejected, the opposite side is accepted');

// The debounce rejects tremor
const twitchy = { ...config, minRepMs: 1000 };
run = sweep(createRepState(), twitchy, [...excursion(45), ...excursion(-45)], 0, 50);
assert.ok(run.state.reps <= 1, `a 1000 ms debounce must suppress 50 ms-per-frame tremor (got ${run.state.reps})`);
console.log('   [PASS] the minimum-interval debounce suppresses tremor');

// The very first repetition is never swallowed by the debounce
run = sweep(createRepState(), { ...config, minRepMs: 5000 }, excursion(45), 0, 50);
assert.equal(run.state.reps, 1, 'the first rep must count however soon it arrives');
console.log('   [PASS] the first repetition is never debounced');

// Head 45 degree (cawthorne-diagonal) habituation nodding test
const cawthorne = repConfigFor(exerciseById('cawthorne-diagonal'));
const cawthorneExcursion = [0, 15, 22, 10, 0];
let cawthorneRun = sweep(createRepState(), cawthorne, [
  ...cawthorneExcursion, ...cawthorneExcursion, ...cawthorneExcursion
], 0, 400);
assert.equal(cawthorneRun.state.reps, 3, `Head 45 degree must count 3 consecutive nods, got ${cawthorneRun.state.reps}`);
console.log('   [PASS] Head 45 degree counts consecutive same-direction nods with realistic 20° pitch excursions');

// Velocity is measured, and a slow sweep reads slower than a fast one
const slow = sweep(createRepState(), config, excursion(45), 0, 400);
const quick = sweep(createRepState(), config, excursion(45), 0, 60);
assert.equal(slow.state.reps, 1);
assert.equal(quick.state.reps, 1);
assert.ok(
  quick.state.velocities[0] > slow.state.velocities[0] * 3,
  `a fast sweep must record much higher peak velocity (${quick.state.velocities[0]} vs ${slow.state.velocities[0]})`
);
console.log(`   [PASS] peak velocity tracked: slow ${slow.state.velocities[0]}°/s vs fast ${quick.state.velocities[0]}°/s`);

// Purity — the input state is never mutated
const before = createRepState();
const snapshot = JSON.stringify(before);
stepRepCounter(before, config, 45, 1000);
assert.equal(JSON.stringify(before), snapshot, 'stepRepCounter must not mutate its input state');
console.log('   [PASS] stepRepCounter is pure');

// 6. Session quality scoring
console.log('\n6. Testing session quality scoring...');
const empty = scoreSession(createRepState(), 40, true);
assert.deepEqual(empty, { romPercent: 0, meanPeakAngle: 0, meanPeakVelocity: 0, score: 0, consistency: 0 });

const strong = scoreSession(
  { ...createRepState(), peaks: [40, 41, 39, 40], velocities: [160, 155, 165, 158] },
  40,
  true
);
assert.ok(strong.score > 85, `full-range fast reps should score highly, got ${strong.score}`);
assert.equal(strong.romPercent, 100);
assert.ok(strong.consistency > 95, 'even peaks must read as consistent');

const shallow = scoreSession(
  { ...createRepState(), peaks: [18, 30, 12, 25], velocities: [40, 35, 45, 38] },
  40,
  true
);
assert.ok(shallow.score < strong.score / 2, 'shallow, slow, erratic reps must score far lower');
assert.ok(shallow.consistency < 80, 'uneven peaks must read as inconsistent');

// Velocity must only matter where it is clinically relevant
const slowButFull = { ...createRepState(), peaks: [40, 40, 40], velocities: [30, 30, 30] };
assert.ok(
  scoreSession(slowButFull, 40, false).score > scoreSession(slowButFull, 40, true).score,
  'a slow full-range rep must be penalised only on velocity-sensitive drills'
);
console.log('   [PASS] ROM, velocity and consistency combine; velocity only counts where it should');

// 7. Coaching cues
console.log('\n7. Testing coaching cues...');
assert.equal(
  coachingCue({ ...createRepState(), phase: 'excursion', peakMagnitude: 12 }, config, true),
  'go-further'
);
assert.equal(
  coachingCue({ ...createRepState(), phase: 'excursion', peakMagnitude: 40 }, config, true),
  'return-to-centre'
);
assert.equal(
  coachingCue({ ...createRepState(), peaks: [40, 40, 40], velocities: [50, 50, 50] }, config, true),
  'go-faster',
  `slow VOR reps must prompt more speed (threshold ${VOR_MIN_VELOCITY}°/s)`
);
assert.equal(
  coachingCue({ ...createRepState(), peaks: [40, 40, 40], velocities: [50, 50, 50] }, config, false),
  'good',
  'the same slow reps are fine on a non-velocity drill'
);
assert.equal(
  coachingCue({ ...createRepState(), peaks: [40, 40, 40], velocities: [160, 160, 160] }, config, true),
  'good'
);
console.log('   [PASS] cues prioritise range, then speed, and respect the drill type');

// 8. Exercise catalogue and per-drill config
console.log('\n8. Testing the exercise catalogue...');
assert.ok(EXERCISES.length >= 5);
const ids = EXERCISES.map((e) => e.id);
assert.equal(new Set(ids).size, ids.length, 'exercise ids must be unique');
for (const ex of EXERCISES) {
  assert.ok(ex.titleEn && ex.titleHi, `${ex.id} needs both languages`);
  assert.ok(ex.descEn && ex.descHi, `${ex.id} needs both descriptions`);
  assert.ok((ex.targetAngle > 0 || ex.axis === null) && ex.targetReps > 0, `${ex.id} needs a sane prescription`);
  if (ex.axis) {
    const cfg = repConfigFor(ex);
    const peak = ex.targetAngle * cfg.peakFraction;
    assert.ok(
      peak < CERVICAL_ROM_LIMIT[ex.axis],
      `${ex.id}: the peak threshold (${peak.toFixed(1)}°) must be reachable inside the ${ex.axis} clamp of ${CERVICAL_ROM_LIMIT[ex.axis]}°`
    );
  }
}
assert.equal(exerciseById('nope').id, EXERCISES[0].id, 'an unknown id must fall back, not crash');
assert.ok(repConfigFor(exerciseById('cawthorne-diagonal')).minRepMs > repConfigFor(exerciseById('vor-x1-horizontal')).minRepMs,
  'slow habituation drills need a longer debounce than fast VOR drills');
console.log('   [PASS] catalogue is well-formed and every target angle is physically reachable');

// 9. Manoeuvres
console.log('\n9. Testing repositioning manoeuvres...');
assert.equal(EPLEY.steps.length, 5, 'the Epley manoeuvre has five positions');
assert.equal(manoeuvreDuration(EPLEY), 240, 'Epley step timings must total four minutes');
assert.ok(manoeuvreDuration(BRANDT_DAROFF) > 0);
for (const m of [EPLEY, BRANDT_DAROFF]) {
  for (const step of m.steps) {
    assert.ok(step.seconds >= 30, `${step.id}: a repositioning hold under 30 s is not therapeutic`);
    assert.ok(step.instructionEn && step.instructionHi, `${step.id} needs both languages`);
  }
}
assert.equal(
  renderInstruction('Turn towards the {side} ear, the {side} one.', 'left', false),
  'Turn towards the left ear, the left one.',
  'every {side} token must be substituted'
);
assert.ok(renderInstruction('{side}', 'right', true).includes('दाएं'), 'Hindi side labels must localise');
console.log('   [PASS] Epley = 5 steps / 240 s, all holds >= 30 s, side tokens substitute in both languages');

// 10. Red flags
console.log('\n10. Testing red-flag triage...');
assert.ok(RED_FLAGS.length >= 5);
assert.equal(hasRedFlags({}), false);
assert.equal(hasRedFlags({ 'rf-headache': false }), false);
assert.equal(hasRedFlags({ 'rf-headache': true }), true);
assert.equal(hasRedFlags({ 'not-a-flag': true }), false, 'unknown keys must not trigger triage');
console.log('   [PASS] red-flag detection is exact');

// 11. DHI-25
console.log('\n11. Testing the DHI-25...');
assert.equal(DHI_ITEMS.length, 25);
assert.equal(new Set(DHI_ITEMS.map((i) => i.id)).size, 25, 'DHI item ids must be unique');
const counts = { P: 0, E: 0, F: 0 };
for (const item of DHI_ITEMS) {
  counts[item.subscale]++;
  assert.ok(item.text && item.textHi, `${item.id} needs both languages`);
}
assert.deepEqual(counts, { P: 7, E: 9, F: 9 }, 'Jacobson & Newman subscale split must be 7/9/9');

const allYes = Object.fromEntries(DHI_ITEMS.map((i) => [i.id, 4]));
assert.equal(scoreDhi(allYes), 100, 'the DHI maximum is 100');
assert.equal(scoreDhi({}), 0, 'an unanswered inventory scores zero');
for (const sub of ['P', 'E', 'F']) {
  assert.equal(scoreDhiSubscale(allYes, sub), DHI_SUBSCALE_MAX[sub], `${sub} subscale maximum`);
}
assert.equal(
  scoreDhiSubscale(allYes, 'P') + scoreDhiSubscale(allYes, 'E') + scoreDhiSubscale(allYes, 'F'),
  100,
  'the subscales must sum to the total'
);
assert.equal(scoreDhi({ d1: 4, 'not-an-item': 99 }), 4, 'stray keys must be ignored');

for (const opt of DHI_OPTIONS) assert.ok([0, 2, 4].includes(opt.score));
assert.equal(dhiBandFor(0).grade, 0);
assert.equal(dhiBandFor(14).grade, 0);
assert.equal(dhiBandFor(16).grade, 1);
assert.equal(dhiBandFor(34).grade, 1);
assert.equal(dhiBandFor(36).grade, 2);
assert.equal(dhiBandFor(52).grade, 2);
assert.equal(dhiBandFor(54).grade, 3);
assert.equal(dhiBandFor(100).grade, 3);
assert.equal(dhiBandFor(500).grade, 3, 'an out-of-range score must still band');
let lastMax = -1;
for (const band of DHI_BANDS) {
  assert.ok(band.max > lastMax, 'bands must ascend');
  assert.ok(band.label && band.labelHi && band.guidance && band.guidanceHi);
  lastMax = band.max;
}
assert.equal(DHI_BANDS[DHI_BANDS.length - 1].max, 100, 'the last band must reach the maximum');
console.log('   [PASS] 25 items, 7/9/9 split, 0-100 scoring, and contiguous ascending severity bands');

// 12. Adherence
console.log('\n12. Testing adherence and streaks...');
const mk = (date, before, after, quality) => ({
  id: date + quality, date, exerciseId: 'vor-x1-horizontal', reps: 20, targetReps: 20,
  meanPeakAngle: 40, meanPeakVelocity: 150, qualityScore: quality,
  dizzinessBefore: before, dizzinessAfter: after, mode: 'coach', createdAt: `${date}T10:00:00Z`,
});

assert.deepEqual(summariseAdherence([], '2026-08-06'), {
  totalSessions: 0, daysThisWeek: 0, streak: 0, meanRelief: 0, meanQuality: 0,
});

const consecutive = summariseAdherence(
  [mk('2026-08-06', 6, 3, 80), mk('2026-08-05', 6, 4, 70), mk('2026-08-04', 7, 4, 60)],
  '2026-08-06'
);
assert.equal(consecutive.streak, 3);
assert.equal(consecutive.daysThisWeek, 3);
assert.equal(consecutive.meanRelief, 2.7);
assert.equal(consecutive.meanQuality, 70);

// Two sessions on one day are one day of adherence
const sameDay = summariseAdherence([mk('2026-08-06', 5, 2, 80), mk('2026-08-06', 4, 2, 60)], '2026-08-06');
assert.equal(sameDay.totalSessions, 2);
assert.equal(sameDay.daysThisWeek, 1, 'two sessions on one day count as one day');
assert.equal(sameDay.streak, 1);

// A streak that ends yesterday still counts — today's session may not be logged yet
assert.equal(
  summariseAdherence([mk('2026-08-05', 5, 2, 80), mk('2026-08-04', 5, 2, 80)], '2026-08-06').streak,
  2,
  'a streak running up to yesterday must survive an as-yet-unlogged today'
);

// A gap breaks the streak
assert.equal(
  summariseAdherence([mk('2026-08-06', 5, 2, 80), mk('2026-08-03', 5, 2, 80)], '2026-08-06').streak,
  1,
  'a missed day must break the streak'
);

// Sessions older than a week fall out of the weekly count but not the total
const older = summariseAdherence([mk('2026-08-06', 5, 2, 80), mk('2026-07-01', 5, 2, 80)], '2026-08-06');
assert.equal(older.totalSessions, 2);
assert.equal(older.daysThisWeek, 1, 'the weekly window is a trailing 7 days');

// Streaks must cross a month boundary
assert.equal(
  summariseAdherence([mk('2026-08-01', 5, 2, 80), mk('2026-07-31', 5, 2, 80), mk('2026-07-30', 5, 2, 80)], '2026-08-01').streak,
  3,
  'streaks must span month boundaries'
);
console.log('   [PASS] streaks, trailing-week adherence, same-day dedupe and month boundaries');

// 10. Backend session merge
console.log('\n10. Testing local/backend session merge...');
const mkVSession = (id, createdAt, reps) => ({
  id, date: createdAt.slice(0, 10), exerciseId: 'vor-x1-horizontal', reps, targetReps: 20,
  meanPeakAngle: 30, meanPeakVelocity: 120, qualityScore: 80,
  dizzinessBefore: 5, dizzinessAfter: 3, mode: 'coach', createdAt,
});
const remoteOnlyS = mkVSession('a', '2026-01-01T00:00:00.000Z', 10);
const localOnlyS = mkVSession('b', '2026-01-02T00:00:00.000Z', 15);
const conflictRemoteS = mkVSession('c', '2026-01-03T00:00:00.000Z', 5);
const conflictLocalS = mkVSession('c', '2026-01-03T00:00:00.000Z', 20);

const mergedS = mergeSessions([localOnlyS, conflictLocalS], [remoteOnlyS, conflictRemoteS]);
assert.equal(mergedS.length, 3, `merging must de-duplicate by id, got ${mergedS.length}`);
assert.deepEqual(mergedS.map((s) => s.id), ['c', 'b', 'a'], 'merged sessions must sort newest-first by createdAt');
assert.equal(
  mergedS.find((s) => s.id === 'c').reps, 20,
  'on an id conflict the local copy must win'
);
console.log('   [PASS] mergeSessions de-duplicates by id, sorts newest-first, and local wins conflicts');

console.log('\n--------------------------------------------------------');
console.log('All vestibular rehabilitation tests passed.');
console.log('--------------------------------------------------------');
