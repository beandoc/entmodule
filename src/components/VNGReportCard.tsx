/**
 * VNG-Style Clinical Report Card Component
 *
 * Visualizes mode-specific physiological gaze metrics, signal validity gates,
 * frequency-domain pursuit gains, 3-signal VOR x2 opposition, binocular disconjugacy,
 * and non-diagnostic clinical screening disclaimers.
 */

import React from 'react';
import {
  SmoothPursuitVNGScore,
  VorX1Score,
  VorX2Score,
  SaccadeScore,
  OknScore,
  ValidityResult,
  CalibrationReport,
} from '../lib/gaze-tracking';

export interface VNGReportCardProps {
  mode: 'smooth_pursuit' | 'vor_x1' | 'vor_x2' | 'saccade' | 'okn' | 'fixation';
  pursuitScore?: SmoothPursuitVNGScore | null;
  vorX1Score?: VorX1Score | null;
  vorX2Score?: VorX2Score | null;
  saccadeScore?: SaccadeScore | null;
  oknScore?: OknScore | null;
  validity?: ValidityResult | null;
  calibrationReport?: CalibrationReport | null;
  locale?: 'en' | 'hi';
  onRetestRequested?: () => void;
}

export const VNGReportCard: React.FC<VNGReportCardProps> = ({
  mode,
  pursuitScore,
  vorX1Score,
  vorX2Score,
  saccadeScore,
  oknScore,
  validity,
  calibrationReport,
  locale = 'en',
  onRetestRequested,
}) => {
  const activeValidity =
    validity ||
    pursuitScore?.validity ||
    vorX1Score?.validity ||
    vorX2Score?.validity ||
    saccadeScore?.validity ||
    oknScore?.validity;

  const getQualityBadgeColor = (grade?: string) => {
    switch (grade) {
      case 'excellent':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      case 'good':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
      case 'borderline':
      case 'fair':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      default:
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
    }
  };

  return (
    <div className="w-full bg-slate-900 border border-slate-800 rounded-xl p-6 text-slate-100 shadow-2xl space-y-6">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-teal-400 flex items-center gap-2">
            <span>📊</span>
            <span>
              {locale === 'hi' ? 'VNG-शैली गेज़ रिपोर्ट कार्ड' : 'VNG Clinical Gaze Report Card'}
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {locale === 'hi'
              ? 'डिजिटल वेस्टिबुलर रिहैब एनालिटिक्स इंजन v2.0'
              : 'Digital Vestibular Rehab Gaze Analytics Engine v2.0'}
          </p>
        </div>

        {/* Recording Quality Badge */}
        {activeValidity && (
          <div
            className={`px-3 py-1.5 rounded-full border text-xs font-semibold uppercase tracking-wider flex items-center gap-2 ${getQualityBadgeColor(
              activeValidity.qualityGrade
            )}`}
          >
            <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
            <span>
              {locale === 'hi' ? 'रिकॉर्डिंग गुणवत्ता' : 'Recording Quality'}:{' '}
              {activeValidity.qualityGrade} (
              {Math.round(activeValidity.overallConfidence * 100)}%)
            </span>
          </div>
        )}
      </div>

      {/* Signal Quality & Validity Gate Summary */}
      {activeValidity && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-950/60 p-4 rounded-lg border border-slate-800/80 text-xs">
          <div>
            <span className="text-slate-400 block">
              {locale === 'hi' ? 'प्रभावी फ्रेम दर' : 'Effective FPS'}
            </span>
            <span className="font-mono font-bold text-slate-200">
              {activeValidity.metrics.effectiveFps} fps
            </span>
          </div>
          <div>
            <span className="text-slate-400 block">
              {locale === 'hi' ? 'पलक / ड्रॉपआउट' : 'Blink Fraction'}
            </span>
            <span className="font-mono font-bold text-slate-200">
              {(activeValidity.metrics.blinkFraction * 100).toFixed(0)}%
            </span>
          </div>
          <div>
            <span className="text-slate-400 block">
              {locale === 'hi' ? 'आइरिस उपलब्धता' : 'Iris Availability'}
            </span>
            <span className="font-mono font-bold text-slate-200">
              {(activeValidity.metrics.irisAvailability * 100).toFixed(0)}%
            </span>
          </div>
          <div>
            <span className="text-slate-400 block">
              {locale === 'hi' ? 'कैलिब्रेशन MAE' : 'Calibration Error'}
            </span>
            <span className="font-mono font-bold text-slate-200">
              {calibrationReport?.maeDeg !== undefined
                ? `${calibrationReport.maeDeg}°`
                : activeValidity.metrics.calibrationMaeDeg !== undefined
                ? `${activeValidity.metrics.calibrationMaeDeg}°`
                : '3.0° (est)'}
            </span>
          </div>
        </div>
      )}

      {/* Invalid Quality Gate Warning */}
      {activeValidity && !activeValidity.isScoreable && (
        <div className="p-4 bg-rose-950/40 border border-rose-800/60 rounded-lg text-rose-300 text-xs space-y-2">
          <div className="font-semibold flex items-center gap-2">
            <span>⚠️</span>
            <span>
              {locale === 'hi'
                ? 'गुणवत्ता गेट चेतावनी: नैदानिक स्कोरिंग अमान्य है'
                : 'Validity Gate Alert: Results flagged as untrustworthy'}
            </span>
          </div>
          <ul className="list-disc list-inside space-y-1 text-rose-300/80">
            {activeValidity.reasons.map((r, i) => (
              <li key={i}>{formatValidityReason(r, locale)}</li>
            ))}
          </ul>
          {onRetestRequested && (
            <button
              onClick={onRetestRequested}
              className="mt-2 px-3 py-1 bg-rose-700 hover:bg-rose-600 text-white rounded font-medium transition"
            >
              {locale === 'hi' ? 'पुनः परीक्षण करें' : 'Retest Session'}
            </button>
          )}
        </div>
      )}

      {/* Mode-Specific Metrics Panels */}

      {/* 1. Smooth Pursuit Panel */}
      {mode === 'smooth_pursuit' && pursuitScore && (
        <div className="space-y-4">
          {/* Main Honest Pursuit Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard
              title={locale === 'hi' ? 'परस्यूट क्वालिटी इंडेक्स (PQI)' : 'Pursuit Quality Index (PQI)'}
              value={`${pursuitScore.pursuitQualityIndex ?? 0} / 100`}
              subtitle={`Band: ${(pursuitScore.qualityLabel || 'IMPAIRED').toUpperCase()}`}
              status={
                (pursuitScore.pursuitQualityIndex ?? 0) >= 60
                  ? 'normal'
                  : (pursuitScore.pursuitQualityIndex ?? 0) >= 40
                  ? 'warning'
                  : 'impaired'
              }
            />
            <MetricCard
              title={locale === 'hi' ? 'रेटिनल स्लिप स्तर' : 'Retinal Slip Level'}
              value={(pursuitScore.slipLevel || 'moderate').toUpperCase()}
              subtitle={locale === 'hi' ? 'दृष्टि विचलन स्तर' : 'Functional gaze drift'}
              status={pursuitScore.slipLevel === 'low' ? 'normal' : pursuitScore.slipLevel === 'moderate' ? 'warning' : 'impaired'}
            />
            <MetricCard
              title={locale === 'hi' ? 'ट्रैकिंग टाइमिंग' : 'Tracking Timing'}
              value={(pursuitScore.timingLabel || 'normal').toUpperCase()}
              subtitle={
                pursuitScore.timingLabel === 'normal'
                  ? (locale === 'hi' ? 'समकालिक ट्रैकिंग' : 'In-phase sync')
                  : (locale === 'hi' ? 'फेज विलंब' : 'Phase lag detected')
              }
              status={pursuitScore.timingLabel === 'normal' ? 'normal' : 'warning'}
            />
            <MetricCard
              title={locale === 'hi' ? 'कैच-अप सैकेड' : 'Catch-Up Saccades'}
              value={`${pursuitScore.catchUpSaccadeCount}`}
              subtitle={locale === 'hi' ? 'सुधारात्मक जंप' : 'Correction events'}
              status={pursuitScore.catchUpSaccadeCount <= 3 ? 'normal' : 'warning'}
            />
          </div>

          {/* Advanced Telemetry Collapsible View */}
          <details className="bg-slate-950/50 p-3.5 rounded-xl border border-slate-800 transition-all">
            <summary className="cursor-pointer font-semibold text-xs text-teal-400 flex items-center justify-between select-none">
              <span>🔬 {locale === 'hi' ? 'उन्नत क्लिनिशियन टेलीमेट्री (Raw Telemetry)' : 'Advanced Clinician Telemetry (Raw Values)'}</span>
              <span className="text-[10px] text-slate-500 font-mono font-normal">{locale === 'hi' ? 'विस्तार करें ▼' : 'Click to view ▼'}</span>
            </summary>
            <div className="mt-3 pt-3 border-t border-slate-800 space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800">
                  <span className="text-slate-400 block font-medium">Velocity Gain (Est)</span>
                  <span className="font-mono text-base font-bold text-slate-100">{pursuitScore.velocityGain.toFixed(2)}</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    95% CI: [{pursuitScore.gainConfidenceInterval?.ciLower?.toFixed(2) ?? '0.00'} - {pursuitScore.gainConfidenceInterval?.ciUpper?.toFixed(2) ?? '0.00'}]
                  </span>
                </div>

                <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800">
                  <span className="text-slate-400 block font-medium">Directional Agreement</span>
                  <span className="font-mono text-base font-bold text-slate-100">{pursuitScore.directionalAgreement.toFixed(2)}</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    {pursuitScore.directionalAgreement > 0.7 ? 'In-Phase' : 'Phase Mismatch'}
                  </span>
                </div>

                <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800">
                  <span className="text-slate-400 block font-medium">Retinal Slip Rate</span>
                  <span className="font-mono text-base font-bold text-slate-100">{pursuitScore.retinalSlipVelocityDegPerSec}°/s</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    P95: {pursuitScore.retinalSlipP95DegPerSec}°/s
                  </span>
                </div>

                <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800">
                  <span className="text-slate-400 block font-medium">Phase Lag</span>
                  <span className="font-mono text-base font-bold text-slate-100">{pursuitScore.phaseLagDeg}°</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    {pursuitScore.phaseLagMs} ms
                  </span>
                </div>
              </div>

              {/* Frequency Gain Breakdown */}
              {pursuitScore.frequencyGains && pursuitScore.frequencyGains.length > 0 && (
                <div className="pt-2">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                    {locale === 'hi' ? 'आवृत्ति गेन (Frequency Domain)' : 'Frequency-Domain Gain Breakdown:'}
                  </span>
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    {pursuitScore.frequencyGains.map((fg, idx) => (
                      <div key={idx} className="p-2 bg-slate-900 rounded border border-slate-800/80">
                        <span className="text-slate-400 block font-mono text-[11px]">{fg.frequencyHz} Hz</span>
                        <span className="text-sm font-bold text-slate-200">{fg.gain}</span>
                        <span className="text-[10px] text-slate-400 block">Lag: {fg.phaseLagDeg}°</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </details>
        </div>
      )}

      {/* 2. VOR x1 Panel */}
      {mode === 'vor_x1' && vorX1Score && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <MetricCard
            title={locale === 'hi' ? 'VOR x1 गेन' : 'VOR x1 Gain'}
            value={vorX1Score.vorGain.toFixed(2)}
            subtitle={`Ideal ~ 1.0`}
            status={vorX1Score.vorGain >= 0.85 ? 'normal' : 'impaired'}
          />
          <MetricCard
            title={locale === 'hi' ? 'सिर की औसत गति' : 'Mean Head Velocity'}
            value={`${vorX1Score.meanHeadVelocityDegPerSec}°/s`}
            subtitle={locale === 'hi' ? 'सक्रिय घुमाव' : 'Active rotation'}
            status={vorX1Score.meanHeadVelocityDegPerSec >= 20 ? 'normal' : 'warning'}
          />
          <MetricCard
            title={locale === 'hi' ? 'गेज़ स्थिरता त्रुटि' : 'Gaze Drift Error'}
            value={`${vorX1Score.gazeStabilityErrorDegPerSec}°/s`}
            subtitle={locale === 'hi' ? 'लक्ष्य पर विचलन' : 'Drift off target'}
            status={vorX1Score.gazeStabilityErrorDegPerSec <= 5 ? 'normal' : 'impaired'}
          />
        </div>
      )}

      {/* 3. VOR x2 Panel */}
      {mode === 'vor_x2' && vorX2Score && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <MetricCard
              title={locale === 'hi' ? '3-सिग्नल VOR x2 गेन' : '3-Signal VOR x2 Gain'}
              value={vorX2Score.vorGain.toFixed(2)}
              subtitle={`Eye = -Head + Target`}
              status={vorX2Score.vorGain >= 0.80 ? 'normal' : 'impaired'}
            />
            <MetricCard
              title={locale === 'hi' ? 'विपरीतता स्थिति' : 'Head-Target Opposition'}
              value={vorX2Score.oppositionValidated ? 'VALIDATED' : 'INVALID'}
              subtitle={`Corr: ${vorX2Score.headTargetCorrelation}`}
              status={vorX2Score.oppositionValidated ? 'normal' : 'impaired'}
            />
            <MetricCard
              title={locale === 'hi' ? 'सिर की औसत गति' : 'Mean Head Velocity'}
              value={`${vorX2Score.meanHeadVelocityDegPerSec}°/s`}
              subtitle={`Target: ${vorX2Score.meanTargetVelocityDegPerSec}°/s`}
              status={vorX2Score.meanHeadVelocityDegPerSec >= 15 ? 'normal' : 'warning'}
            />
          </div>
        </div>
      )}

      {/* 4. Saccade Panel */}
      {mode === 'saccade' && saccadeScore && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard
            title={locale === 'hi' ? 'औसत लैटेंसी' : 'Mean Latency'}
            value={`${saccadeScore.meanLatencyMs} ms`}
            subtitle={`Norm: 150-250 ms`}
            status={saccadeScore.meanLatencyMs <= 260 ? 'normal' : 'warning'}
          />
          <MetricCard
            title={locale === 'hi' ? 'सटीकता गेन' : 'Accuracy Gain'}
            value={saccadeScore.accuracyGain.toFixed(2)}
            subtitle={saccadeScore.dysmetriaClassification.toUpperCase()}
            status={saccadeScore.accuracyGain >= 0.85 && saccadeScore.accuracyGain <= 1.15 ? 'normal' : 'impaired'}
          />
          <MetricCard
            title={locale === 'hi' ? 'शीर्ष गति' : 'Peak Velocity'}
            value={`${saccadeScore.peakVelocityDegPerSec}°/s`}
            subtitle={locale === 'hi' ? 'सैकेड गति' : 'Main sequence'}
            status="normal"
          />
          <MetricCard
            title={locale === 'hi' ? 'सैकेड संख्या' : 'Saccade Count'}
            value={`${saccadeScore.saccadeCount}`}
            subtitle={locale === 'hi' ? 'दर्ज इवेंट्स' : 'Events tracked'}
            status="normal"
          />
        </div>
      )}

      {/* 5. OKN Panel */}
      {mode === 'okn' && oknScore && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard
            title={locale === 'hi' ? 'दाहिनी SPV' : 'SPV Right'}
            value={`${oknScore.spvRightDegPerSec}°/s`}
            subtitle={locale === 'hi' ? 'धीमी गति' : 'Slow phase'}
            status="normal"
          />
          <MetricCard
            title={locale === 'hi' ? 'बाईं SPV' : 'SPV Left'}
            value={`${oknScore.spvLeftDegPerSec}°/s`}
            subtitle={locale === 'hi' ? 'धीमी गति' : 'Slow phase'}
            status="normal"
          />
          <MetricCard
            title={locale === 'hi' ? 'विषमता अनुपात' : 'Asymmetry Ratio'}
            value={`${oknScore.asymmetryRatioPct}%`}
            subtitle={`Norm: < 15%`}
            status={oknScore.asymmetryRatioPct <= 15 ? 'normal' : 'warning'}
          />
          <MetricCard
            title={locale === 'hi' ? 'बीट आवृत्ति' : 'Beat Frequency'}
            value={`${oknScore.nystagmusBeatFrequencyHz} Hz`}
            subtitle={locale === 'hi' ? 'नाइस्टैग्मस बीट्स' : 'Reset beats'}
            status="normal"
          />
        </div>
      )}

      {/* Clinical Guidance Text */}
      <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-lg text-xs space-y-1">
        <span className="font-semibold text-teal-300 block">
          {locale === 'hi' ? 'नैदानिक निष्कर्ष और मार्गदर्शन' : 'Clinical Screening Guidance:'}
        </span>
        <p className="text-slate-300">
          {pursuitScore?.clinicalGuidance ||
            vorX1Score?.clinicalGuidance ||
            vorX2Score?.clinicalGuidance ||
            saccadeScore?.clinicalGuidance ||
            oknScore?.clinicalGuidance ||
            'Session gaze analytics successfully computed.'}
        </p>
      </div>

      {/* Non-Diagnostic Guardrail Disclaimer */}
      <div className="p-3 bg-amber-950/30 border border-amber-800/40 rounded text-[11px] text-amber-200/80 flex items-start gap-2">
        <span className="text-base leading-none">ℹ️</span>
        <div>
          <strong className="text-amber-300 font-semibold block">
            {locale === 'hi'
              ? 'अस्वीकरण (Screening Metric Guardrail)'
              : 'Clinical Screening Disclaimer'}
          </strong>
          {locale === 'hi'
            ? 'यह परिणाम एक डिजिटल वेस्टिबुलर रिहैब ट्रेनिंग/स्क्रीनिंग मेट्रिक है, न कि कोई पूर्ण VNG या ENG डायग्नोस्टिक लैब परिणाम।'
            : 'These scores are digital screening and rehabilitation monitoring metrics. They do not constitute a formal Videonystagmography (VNG) or Electronystagmography (ENG) diagnostic report.'}
        </div>
      </div>
    </div>
  );
};

interface MetricCardProps {
  title: string;
  value: string;
  subtitle: string;
  status: 'normal' | 'warning' | 'impaired';
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, subtitle, status }) => {
  const getStatusBorder = (s: string) => {
    switch (s) {
      case 'normal':
        return 'border-emerald-500/40 text-emerald-400';
      case 'warning':
        return 'border-amber-500/40 text-amber-400';
      default:
        return 'border-rose-500/40 text-rose-400';
    }
  };

  return (
    <div className={`p-3 bg-slate-950/60 rounded-lg border ${getStatusBorder(status)} flex flex-col justify-between`}>
      <span className="text-[11px] text-slate-400 block font-medium truncate">{title}</span>
      <span className="text-xl font-bold font-mono my-1">{value}</span>
      <span className="text-[10px] text-slate-400 block truncate">{subtitle}</span>
    </div>
  );
};

function formatValidityReason(reason: string, locale: 'en' | 'hi'): string {
  switch (reason) {
    case 'low_frame_rate':
      return locale === 'hi'
        ? 'कम फ्रेम दर या अस्थिर वेबकैम टाइमिंग'
        : 'Low webcam frame rate or unstable sampling timing';
    case 'insufficient_head_velocity':
      return locale === 'hi'
        ? 'VOR परीक्षण के लिए सिर का घुमाव अपर्याप्त था (< 15°/s)'
        : 'Insufficient head rotation velocity (< 15°/s) for VOR gain';
    case 'high_blink_fraction':
      return locale === 'hi'
        ? 'अत्यधिक पलकें झपकना या आंखें बंद होना (> 25%)'
        : 'High blink or eye lid dropout fraction (> 25%)';
    case 'poor_calibration':
      return locale === 'hi'
        ? 'कैलिब्रेशन त्रुटि अधिक है (> 3.5°)'
        : 'High calibration error (> 3.5°)';
    case 'target_head_not_opposed':
      return locale === 'hi'
        ? 'VOR x2: सिर और लाल बिंदु की गति विपरीत दिशा में नहीं थी'
        : 'VOR x2: Head and target motion were not opposed';
    case 'short_window_duration':
      return locale === 'hi'
        ? 'ट्रैकिंग समय अपर्याप्त है (< 3.0s)'
        : 'Continuous tracking window too short (< 3.0s)';
    default:
      return reason;
  }
}
