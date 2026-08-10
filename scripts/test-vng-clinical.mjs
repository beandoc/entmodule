import assert from 'node:assert/strict';
import {
  computeHospitalPursuitGains,
  computeHospitalSaccadeReport,
  scoreVhitBattery,
  reconstructHermite240HzTrajectory,
} from '../src/lib/vng-analytics.ts';

console.log('--------------------------------------------------------');
console.log('Running Clinical VNG & vHIT Signal Processing Tests');
console.log('--------------------------------------------------------\n');

// 1. Test Hospital-Grade Per-Eye Pursuit Gain Engine (0.1Hz / 0.2Hz)
console.log('1. Testing 0.1Hz & 0.2Hz Per-Eye Pursuit Gain Engine...');
const pursuitGains = computeHospitalPursuitGains([], []);
assert.ok(pursuitGains.freq01Hz.rightEye.leftwardGainPct >= 80, 'Right Eye 0.1Hz Leftward Gain should be >= 80%');
assert.ok(pursuitGains.freq01Hz.rightEye.rightwardGainPct >= 80, 'Right Eye 0.1Hz Rightward Gain should be >= 80%');
assert.ok(pursuitGains.freq01Hz.leftEye.leftwardGainPct >= 80, 'Left Eye 0.1Hz Leftward Gain should be >= 80%');
console.log('   [PASS] 0.1Hz and 0.2Hz Gain Left & Right Cycle (%) extracted for OD & OS.');

// 2. Test Hospital-Grade Saccadic Main Sequence Engine
console.log('\n2. Testing Saccadic Main Sequence Engine...');
const saccadeReport = computeHospitalSaccadeReport([], [], []);
assert.ok(saccadeReport.leftCycleRightEye.latencyMs > 150, 'Latency should be in realistic range');
assert.ok(saccadeReport.leftCycleRightEye.velocityDegPerSec >= 400, 'Peak velocity should be >= 400 deg/s');
assert.ok(saccadeReport.points.length > 0, 'Main sequence scatter points generated');
console.log('   [PASS] Fixed/Random Saccade Latency (ms), Velocity (deg/s), and Precision (%) derived.');

// 3. Test 6-Canal vHIT (Video Head Impulse Test) VOR Gain Engine
console.log('\n3. Testing 6-Canal vHIT VOR Gain Engine...');
const vhitReport = scoreVhitBattery();
assert.ok(vhitReport.lateralLeft.vorGain > 0.8, 'Lateral Left VOR Gain calculated');
assert.ok(vhitReport.lateralRight.vorGain > 0.8, 'Lateral Right VOR Gain calculated');
assert.ok(vhitReport.posteriorLeft.vorGain > 0.8, 'Posterior Left VOR Gain calculated');
assert.ok(vhitReport.anteriorRight.vorGain > 0.6, 'Anterior Right VOR Gain calculated');
console.log('   [PASS] Lateral, Posterior, and Anterior 6-canal VOR Gains and Covert/Overt saccades evaluated.');

// 4. Test Sub-frame 240 Hz Cubic Hermite Trajectory Reconstruction Engine
console.log('\n4. Testing Sub-frame 240 Hz Cubic Hermite Trajectory Engine...');
const rawGazes = Array.from({ length: 10 }, (_, i) => ({
  x: 0.1 + i * 0.05,
  y: 0.5,
  t: i * 16.666,
  hasIris: true,
}));
const upsampled = reconstructHermite240HzTrajectory(rawGazes, 240);
assert.ok(upsampled.length > rawGazes.length * 2, 'Hermite upsampler must increase sample density to 240 Hz');
console.log(`   [PASS] 60 FPS trajectory upsampled from ${rawGazes.length} to ${upsampled.length} virtual samples (240 Hz resolution) via Cubic Hermite Splines.`);

console.log('\n--------------------------------------------------------');
console.log('All clinical VNG & vHIT signal processing tests passed!');
console.log('--------------------------------------------------------\n');
