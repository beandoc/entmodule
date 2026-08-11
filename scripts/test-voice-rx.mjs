import assert from 'node:assert/strict';
import {
  VHI10_ITEMS, VHI10_OPTIONS, scoreVhi10, vhi10BandFor, VHI10_MCID, VHI10_ABNORMAL_ABOVE,
  EAT10_ITEMS, scoreEat10, eat10BandFor, EAT10_ABNORMAL_AT_OR_ABOVE,
  SYMPTOM_ITEMS, COHORTS, cohortFor, VOICE_PROTOCOL,
  buildVoiceSession, evaluateRedFlags, computeBaseline, summariseVoiceTrend, generateVoiceInsight,
  VOICE_MDC, BASELINE_SESSIONS, MIN_SESSIONS_FOR_ACOUSTIC, CONSECUTIVE_BREACHES,
  MIN_PASSAGE_DURATION_SEC,
} from '../src/lib/voice-rx.ts';

console.log('--------------------------------------------------------');
console.log('Running Voice Rx Tests (VHI-10 + EAT-10 + alerting)');
console.log('--------------------------------------------------------\n');

// ----------------------------------------------------
// 1. Instrument integrity
// ----------------------------------------------------
console.log('1. Testing instrument definitions...');
{
  assert.equal(VHI10_ITEMS.length, 10, 'VHI-10 must have exactly 10 items');
  assert.equal(EAT10_ITEMS.length, 10, 'EAT-10 must have exactly 10 items');
  assert.equal(VHI10_OPTIONS.length, 5, 'VHI-10 uses a 0-4 scale');

  for (const list of [VHI10_ITEMS, EAT10_ITEMS, SYMPTOM_ITEMS, COHORTS, VOICE_PROTOCOL]) {
    const ids = list.map((i) => i.id);
    assert.equal(new Set(ids).size, ids.length, 'ids must be unique');
    for (const item of list) {
      const en = item.text ?? item.label ?? item.instruction;
      const hi = item.textHi ?? item.labelHi ?? item.instructionHi;
      assert.ok(en && en.length > 0, `missing English string on ${item.id}`);
      assert.ok(hi && hi.length > 0, `missing Hindi string on ${item.id}`);
      assert.notEqual(en, hi, `Hindi string on ${item.id} is untranslated`);
    }
  }

  // The protocol must measure CPPS before MPT: maximum phonation drives the
  // patient to residual volume and would corrupt a CPPS taken afterwards.
  const order = VOICE_PROTOCOL.map((t) => t.id);
  assert.ok(
    order.indexOf('cpps_phonation') < order.indexOf('mpt'),
    'comfortable phonation must precede maximum phonation time',
  );
  assert.equal(order[0], 'calibration', 'the room check must come first');
  assert.equal(VOICE_PROTOCOL.find((t) => t.id === 'mpt').trials, 3, 'MPT requires three trials');
  console.log('   PASS: item counts, bilingual coverage, protocol ordering\n');
}

// ----------------------------------------------------
// 2. Scoring and bands
// ----------------------------------------------------
console.log('2. Testing scoring and banding...');
{
  const all = (items, v) => Object.fromEntries(items.map((i) => [i.id, v]));

  assert.equal(scoreVhi10(all(VHI10_ITEMS, 0)), 0);
  assert.equal(scoreVhi10(all(VHI10_ITEMS, 4)), 40, 'VHI-10 maximum is 40');
  assert.equal(scoreVhi10({}), 0, 'unanswered items score zero');
  assert.equal(scoreVhi10({ v1: 3, v2: 2 }), 5, 'partial answers sum correctly');

  assert.equal(scoreEat10(all(EAT10_ITEMS, 4)), 40, 'EAT-10 maximum is 40');

  // Band edges. The published VHI-10 abnormal threshold is >11, so 11 must sit
  // in the normal band and 12 must not.
  assert.equal(vhi10BandFor(0).grade, 0);
  assert.equal(vhi10BandFor(VHI10_ABNORMAL_ABOVE).grade, 0, '11 is still within normal limits');
  assert.equal(vhi10BandFor(VHI10_ABNORMAL_ABOVE + 1).grade, 1, '12 is a mild handicap');
  assert.equal(vhi10BandFor(40).grade, 3);
  assert.ok(vhi10BandFor(999), 'out-of-range scores still return a band');

  assert.equal(eat10BandFor(EAT10_ABNORMAL_AT_OR_ABOVE - 1).grade, 0, '2 is normal');
  assert.equal(eat10BandFor(EAT10_ABNORMAL_AT_OR_ABOVE).grade, 1, '3 is abnormal');

  // Every band must carry usable guidance in both languages.
  for (const score of [0, 11, 12, 25, 40]) {
    const b = vhi10BandFor(score);
    assert.ok(b.guidance.length > 20 && b.guidanceHi.length > 10, `thin guidance at ${score}`);
  }
  assert.equal(cohortFor('chemoradiation').id, 'chemoradiation');
  assert.equal(cohortFor('nonsense').id, 'partial_laryngectomy', 'unknown cohort falls back safely');
  console.log('   PASS: score bounds, band edges at published cutoffs, guidance\n');
}

// ----------------------------------------------------
// 3. Session assembly and quality gating
// ----------------------------------------------------
console.log('3. Testing session assembly...');

const goodTake = (over = {}) => buildVoiceSession({
  cohort: 'partial_laryngectomy',
  noiseFloorDb: -60,
  deviceFingerprint: 'phone-a',
  processingDisabled: true,
  cpps: { cppsDb: 12, voicedFrameRatio: 0.8, frameValues: [], frameCount: 100 },
  mptTrials: [
    { detected: true, durationSec: 9.0, onsetSec: 0, offsetSec: 9, meanDb: -20, dropoutCount: 0 },
    { detected: true, durationSec: 11.0, onsetSec: 0, offsetSec: 11, meanDb: -20, dropoutCount: 0 },
    { detected: true, durationSec: 10.0, onsetSec: 0, offsetSec: 10, meanDb: -20, dropoutCount: 0 },
  ],
  amr: { count: 30, ratePerSec: 6.0, intervalCvPct: 5, peakTimes: [] },
  smr: { count: 24, ratePerSec: 4.8, intervalCvPct: 8, peakTimes: [] },
  symptoms: [],
  ...over,
});

{
  const s = goodTake();
  assert.equal(s.mptSec, 11.0, 'MPT must be the best of three trials, not the mean');
  assert.deepEqual(s.mptTrials, [9, 11, 10], 'all trials are retained for audit');
  assert.equal(s.cppsDb, 12);
  assert.deepEqual(s.qualityFlags, [], 'a clean take carries no flags');

  // A take with too few voiced frames yields no CPPS at all rather than a
  // plausible-looking number.
  const thin = goodTake({ cpps: { cppsDb: 12, voicedFrameRatio: 0.1, frameValues: [], frameCount: 100 } });
  assert.equal(thin.cppsDb, null, 'unreliable CPPS must be stored as null');
  assert.ok(thin.qualityFlags.includes('cpps_unreliable'));

  const clipped = goodTake({ clippedFractions: [0.02] });
  assert.ok(clipped.qualityFlags.includes('clipping'));
  assert.equal(clipped.cppsDb, null, 'clipping invalidates CPPS');

  const noisy = goodTake({ noiseFloorDb: -20 });
  assert.ok(noisy.qualityFlags.includes('noisy_room'));

  const processed = goodTake({ processingDisabled: false });
  assert.ok(
    processed.qualityFlags.includes('device_processing_on'),
    'a device that kept its own gain processing must be recorded as such',
  );

  const partial = goodTake({
    mptTrials: [
      { detected: true, durationSec: 8, onsetSec: 0, offsetSec: 8, meanDb: -20, dropoutCount: 0 },
      { detected: false, durationSec: 0, onsetSec: 0, offsetSec: 0, meanDb: -120, dropoutCount: 0 },
      { detected: true, durationSec: 9, onsetSec: 0, offsetSec: 9, meanDb: -20, dropoutCount: 0 },
    ],
  });
  assert.equal(partial.mptSec, 9, 'failed trials are excluded, not counted as zero');
  assert.ok(partial.qualityFlags.includes('mpt_trial_missing'));

  const sparseDdk = goodTake({ amr: { count: 2, ratePerSec: 6, intervalCvPct: 3, peakTimes: [] } });
  assert.equal(sparseDdk.ddkAmrRate, null, 'a two-syllable take is not a DDK measurement');
  console.log('   PASS: best-of-three, quality gating, null-over-plausible\n');
}

// ----------------------------------------------------
// 3b. Praat sidecar / AVQI gating
// ----------------------------------------------------
console.log('3b. Testing Praat sidecar integration and AVQI gating...');
{
  const reliablePraat = {
    available: true,
    durationSec: MIN_PASSAGE_DURATION_SEC + 5,
    f0MedianHz: 140, cppsDb: 11.2, hnrDb: 14.1,
    shimmerLocalPct: 3.1, shimmerLocalDb: 0.4,
    ltasSlopeDb: -28, ltasTiltDb: -6,
    avqi: null, avqiUnavailableReason: 'avqi_regression_not_verified',
    abi: null, abiUnavailableReason: 'abi_regression_not_verified',
  };

  const noPraat = goodTake();
  assert.equal(noPraat.passageDurationSec, null, 'no passage task run, no duration');
  assert.equal(noPraat.avqiReliabilityFlag, null);
  assert.equal(noPraat.avqi, null);
  assert.equal(noPraat.praatCppsDb, null, 'the Praat CPPS field must not be filled from the JS CPPS engine');

  const reliable = goodTake({ praat: reliablePraat });
  assert.equal(reliable.passageDurationSec, MIN_PASSAGE_DURATION_SEC + 5);
  assert.equal(reliable.avqiReliabilityFlag, true);
  assert.equal(reliable.praatCppsDb, 11.2);
  assert.equal(reliable.hnrDb, 14.1);
  assert.equal(reliable.avqi, null, 'AVQI stays null until a verified regression exists, even on a reliable take');
  assert.equal(reliable.avqiUnavailableReason, 'avqi_regression_not_verified');
  assert.ok(!reliable.qualityFlags.includes('passage_too_short_for_avqi'));

  // Even if a future build populates praat.avqi, a short take must still
  // force it back to null - the reliability gate applies regardless of what
  // the sidecar returns.
  const shortButScored = goodTake({
    praat: { ...reliablePraat, durationSec: MIN_PASSAGE_DURATION_SEC - 2, avqi: 3.4, avqiUnavailableReason: null },
  });
  assert.equal(shortButScored.avqiReliabilityFlag, false);
  assert.equal(shortButScored.avqi, null, 'a short passage must never surface an AVQI score');
  assert.equal(shortButScored.avqiUnavailableReason, 'passage_too_short');
  assert.ok(shortButScored.qualityFlags.includes('passage_too_short_for_avqi'));

  const sidecarDown = goodTake({ praat: { ...reliablePraat, available: false, durationSec: null, cppsDb: null } });
  assert.ok(sidecarDown.qualityFlags.includes('praat_sidecar_unavailable'));
  assert.equal(sidecarDown.avqiReliabilityFlag, null, 'no duration to judge reliability against');

  console.log('   PASS: praat fields pass through, AVQI stays gated on reliability and verification\n');
}

// ----------------------------------------------------
// 4. Baseline statistics
// ----------------------------------------------------
console.log('4. Testing baseline and control limits...');
{
  assert.equal(computeBaseline([10, 11], 3), null, 'a baseline needs three sessions');

  const steady = computeBaseline([10, 10, 10], VOICE_MDC.mptSec);
  assert.equal(steady.median, 10);
  assert.equal(steady.sd, 0);
  // With zero variance the MDC floor is what sets the limit, not 2*SD = 0.
  assert.equal(
    steady.controlLimit, 10 - VOICE_MDC.mptSec,
    'the MDC must floor the control limit when SD collapses',
  );

  // A wildly variable patient gets a correspondingly wider limit.
  const variable = computeBaseline([6, 12, 18], VOICE_MDC.mptSec);
  assert.ok(
    variable.controlLimit < steady.controlLimit,
    'a more variable patient must get a wider limit, not a tighter one',
  );

  // Median, not mean: one bad first take must not drag the baseline down.
  const outlier = computeBaseline([2, 10, 11], VOICE_MDC.mptSec);
  assert.equal(outlier.median, 10, 'median resists a single bad early session');

  // Only the first BASELINE_SESSIONS establish the reference.
  const later = computeBaseline([10, 10, 10, 1, 1, 1], VOICE_MDC.mptSec);
  assert.equal(later.median, 10, 'later sessions must not move the baseline');
  assert.equal(later.n, BASELINE_SESSIONS);
  console.log('   PASS: minimum n, MDC floor, median robustness, fixed window\n');
}

// ----------------------------------------------------
// 5. The alert engine
// ----------------------------------------------------
console.log('5. Testing red-flag alerting...');

// Sessions are stored newest-first, so build chronologically then reverse.
const history = (mpts, over = {}) => mpts
  .map((mpt) => goodTake({
    mptTrials: [{ detected: true, durationSec: mpt, onsetSec: 0, offsetSec: mpt, meanDb: -20, dropoutCount: 0 }],
    ...over,
  }))
  .reverse();

{
  // Symptoms fire immediately, on the very first session, with no baseline.
  const first = [goodTake({ symptoms: ['stridor'] })];
  const symptomAlerts = evaluateRedFlags(first);
  assert.equal(symptomAlerts.length, 1);
  assert.equal(symptomAlerts[0].severity, 'urgent', 'stridor is an airway emergency');
  assert.equal(symptomAlerts[0].source, 'symptom');
  assert.ok(symptomAlerts[0].messageHi.length > 0, 'alerts must be bilingual');

  const review = evaluateRedFlags([goodTake({ symptoms: ['neck_lump', 'weight_loss'] })]);
  assert.equal(review.length, 2);
  assert.ok(review.every((a) => a.severity === 'review'));

  assert.deepEqual(evaluateRedFlags([]), [], 'no sessions, no alerts');

  // No acoustic alert before a baseline exists, however bad the numbers look.
  const tooEarly = history([10, 10, 1]);
  assert.equal(tooEarly.length, BASELINE_SESSIONS);
  assert.deepEqual(
    evaluateRedFlags(tooEarly), [],
    'acoustic alerting must stay silent until a baseline is established',
  );

  // A single dip is noise and must not fire. This is the exact failure mode of
  // the naive ">40% drop over two tests" rule.
  const singleDip = history([10, 10, 10, 2]);
  assert.deepEqual(
    evaluateRedFlags(singleDip), [],
    'one bad session must not raise an alert',
  );

  // Two consecutive breaches do fire.
  const sustained = history([10, 10, 10, 2, 2]);
  const declineAlerts = evaluateRedFlags(sustained);
  assert.equal(declineAlerts.length, 1, `expected one decline alert, got ${declineAlerts.length}`);
  assert.equal(declineAlerts[0].kind, 'mpt_decline');
  assert.equal(declineAlerts[0].source, 'acoustic');
  assert.equal(declineAlerts[0].severity, 'review', 'acoustic decline is never urgent on its own');
  console.log(`   decline detail: ${declineAlerts[0].detail}`);

  // A drop that stays inside the MDC is not a breach, even sustained.
  const withinNoise = history([10, 10, 10, 8.5, 8.5]);
  assert.deepEqual(
    evaluateRedFlags(withinNoise), [],
    'a fall smaller than the minimal detectable change is not a signal',
  );

  // Recovery above baseline must never alert.
  assert.deepEqual(evaluateRedFlags(history([10, 10, 10, 15, 16])), []);

  // Comparability: the same decline measured on a different phone is suppressed.
  const swapped = history([10, 10, 10, 2, 2]);
  swapped[0] = goodTake({
    deviceFingerprint: 'phone-b',
    mptTrials: [{ detected: true, durationSec: 2, onsetSec: 0, offsetSec: 2, meanDb: -20, dropoutCount: 0 }],
  });
  assert.deepEqual(
    evaluateRedFlags(swapped), [],
    'a device change must suppress acoustic alerting',
  );

  // Same for a recording made in a noisy room.
  const noisy = history([10, 10, 10, 2, 2]);
  noisy[0] = goodTake({
    noiseFloorDb: -20,
    mptTrials: [{ detected: true, durationSec: 2, onsetSec: 0, offsetSec: 2, meanDb: -20, dropoutCount: 0 }],
  });
  assert.deepEqual(evaluateRedFlags(noisy), [], 'a noisy room must suppress acoustic alerting');

  // Suppression applies only to acoustic alerts - symptoms still get through.
  const noisyWithSymptom = history([10, 10, 10, 2, 2]);
  noisyWithSymptom[0] = goodTake({
    noiseFloorDb: -20,
    symptoms: ['hemoptysis'],
    mptTrials: [{ detected: true, durationSec: 2, onsetSec: 0, offsetSec: 2, meanDb: -20, dropoutCount: 0 }],
  });
  const mixed = evaluateRedFlags(noisyWithSymptom);
  assert.equal(mixed.length, 1, 'symptoms must survive acoustic suppression');
  assert.equal(mixed[0].kind, 'hemoptysis');

  // A missing metric is treated as no observation, never as a decline.
  const missing = history([10, 10, 10, 2, 2]);
  missing[0] = goodTake({
    mptTrials: [{ detected: false, durationSec: 0, onsetSec: 0, offsetSec: 0, meanDb: -120, dropoutCount: 0 }],
  });
  assert.deepEqual(
    evaluateRedFlags(missing), [],
    'an absent measurement must not be read as a decline',
  );
  console.log('   PASS: symptom immediacy, baseline gating, single-dip rejection,');
  console.log('         MDC floor, device/noise suppression, null handling\n');
}

// ----------------------------------------------------
// 6. Trend and patient-facing copy
// ----------------------------------------------------
console.log('6. Testing trend summary and insight copy...');
{
  const empty = summariseVoiceTrend([]);
  assert.equal(empty.direction, 'unknown');
  assert.ok(generateVoiceInsight(empty).includes('No recordings yet'));
  assert.ok(generateVoiceInsight(empty, 'hi').length > 0, 'Hindi copy must exist for every state');

  const early = summariseVoiceTrend(history([10, 10]));
  assert.equal(early.direction, 'unknown', 'no direction before a baseline');
  assert.ok(
    generateVoiceInsight(early).includes('more recording'),
    'early copy should say how many recordings remain, not reassure',
  );

  const improving = summariseVoiceTrend(history([10, 10, 10, 16, 17]));
  assert.equal(improving.direction, 'improving');

  const declining = summariseVoiceTrend(history([10, 10, 10, 2, 2]));
  assert.equal(declining.direction, 'declining');
  const decliningCopy = generateVoiceInsight(declining);
  assert.ok(decliningCopy.includes('not a diagnosis'), 'decline copy must disclaim diagnosis');

  const stable = summariseVoiceTrend(history([10, 10, 10, 10, 10]));
  assert.equal(stable.direction, 'stable');
  assert.equal(stable.sessionCount, 5);
  assert.ok(stable.baselineMpt !== null);

  // The module must never imply anything about cancer.
  const forbidden = ['cancer', 'recurrence', 'tumour', 'tumor', 'malignan'];
  for (const trend of [empty, early, improving, declining, stable]) {
    for (const locale of ['en', 'hi']) {
      const copy = generateVoiceInsight(trend, locale).toLowerCase();
      for (const word of forbidden) {
        assert.ok(!copy.includes(word), `patient copy must not mention "${word}": ${copy}`);
      }
    }
  }
  console.log('   PASS: direction, honest early-state copy, diagnosis disclaimer\n');
}

console.log('--------------------------------------------------------');
console.log('All voice Rx tests passed.');
console.log('--------------------------------------------------------');
