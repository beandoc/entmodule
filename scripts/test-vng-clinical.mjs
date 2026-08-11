import assert from 'node:assert/strict';
import {
  computeHospitalPursuitGains,
  computeHospitalSaccadeReport,
  scoreVhitBattery,
  reconstructHermite240HzTrajectory,
} from '../src/lib/vng-analytics.ts';

console.log('--------------------------------------------------------');
console.log('Running Clinical VNG & Rehabilitation Analytics Tests');
console.log('--------------------------------------------------------\n');

// 1. Test Empty Inputs Return Zero (No Fabricated Data)
console.log('1. Testing No-Data Guard (Zero Placeholder Return)...');
const emptyPursuitGains = computeHospitalPursuitGains([], []);
assert.equal(emptyPursuitGains.freq01Hz.rightEye.leftwardGainPct, 0, 'Empty pursuit track should return 0% gain');
assert.equal(emptyPursuitGains.freq01Hz.leftEye.rightwardGainPct, 0, 'Empty pursuit track should return 0% gain');

const emptySaccadeReport = computeHospitalSaccadeReport([], [], []);
assert.equal(emptySaccadeReport.leftCycleRightEye.latencyMs, 0, 'Empty saccade input should return 0 latency');
assert.equal(emptySaccadeReport.points.length, 0, 'Empty saccade input should produce 0 scatter points');

const emptyVhitReport = scoreVhitBattery([], []);
assert.equal(emptyVhitReport.lateralLeft.vorGain, 0, 'Empty vHIT input should return 0 VOR gain');
assert.equal(emptyVhitReport.validityGrade, 'fair', 'Empty vHIT input should have fair/unscoreable grade');
console.log('   [PASS] Unmeasured/empty inputs return 0 without emitting hardcoded clinical placeholders.');

// 2. Test Synthetic Pursuit Track Gain Extraction
console.log('\n2. Testing Pursuit Gain Extraction on Synthetic Track...');
const syntheticGazes = Array.from({ length: 600 }, (_, i) => ({
  x: 0.5 + 0.2 * Math.sin((i * 16.666 * 2 * Math.PI * 0.1) / 1000),
  y: 0.5,
  t: i * 16.666,
  hasIris: true,
}));
const syntheticTargets = Array.from({ length: 600 }, (_, i) => ({
  x: 0.5 + 0.2 * Math.sin((i * 16.666 * 2 * Math.PI * 0.1) / 1000),
  y: 0.5,
  t: i * 16.666,
}));
const syntheticPursuitGains = computeHospitalPursuitGains(syntheticTargets, syntheticGazes);
assert.ok(syntheticPursuitGains.freq01Hz.rightEye.leftwardGainPct > 50, 'Synthetic matching pursuit track gain > 50%');
console.log('   [PASS] 0.1Hz pursuit gain correctly derived from matching synthetic tracking stream.');

// 3. Test Hermite Trajectory Upsampler
console.log('\n3. Testing Trajectory Interpolation...');
const rawGazes = Array.from({ length: 10 }, (_, i) => ({
  x: 0.1 + i * 0.05,
  y: 0.5,
  t: i * 16.666,
  hasIris: true,
}));
const upsampled = reconstructHermite240HzTrajectory(rawGazes, 240);
assert.ok(upsampled.length > rawGazes.length * 2, 'Hermite upsampler must increase sample density');
console.log(`   [PASS] 60 FPS trajectory upsampled from ${rawGazes.length} to ${upsampled.length} virtual samples.`);

console.log('\n--------------------------------------------------------');
console.log('All clinical VNG & Rehabilitation Analytics tests passed!');
console.log('--------------------------------------------------------\n');

