'use client';

/**
 * VNG-Style Battery Report — compiles the most recent recording of each gaze
 * test (from `historySessions`) into a printable, clinical-lab-style report,
 * modelled on a conventional VNG unit's PDF export (patient header, one
 * section per test with a data table, footer sign-off line).
 *
 * Deliberately excludes Caloric, video Head Impulse Test (vHIT) and cVEMP —
 * those require dedicated hardware (a caloric irrigator, a >=250Hz head-
 * impulse camera, and EMG electrodes respectively) that a webcam cannot
 * substitute for. This report only covers what the webcam-based oculomotor
 * pipeline can validly measure.
 */

import React, { useMemo } from 'react';
import { Printer, FileText, CheckCircle2, Circle } from 'lucide-react';
import { useAppData } from '@/lib/app-data-context';
import { getCurrentPatientId } from '@/lib/patient-context';
import { GazeSession } from '@/lib/gaze-tracking';
import { NystagmusVNGScore, SmoothPursuitVNGScore, SaccadeScore, OknScore, VorX2Score } from '@/lib/vng-analytics';

interface ReportSectionDef {
  exerciseId: string;
  en: string;
  hi: string;
}

const NYSTAGMUS_SECTIONS: ReportSectionDef[] = [
  { exerciseId: 'pursuit-spontaneous', en: 'Spontaneous Nystagmus', hi: 'स्वतःस्फूर्त निस्टागमस' },
  { exerciseId: 'pursuit-gaze-left', en: 'Gaze-Induced Nystagmus — Left Gaze', hi: 'गेज़-प्रेरित निस्टागमस — बाएं' },
  { exerciseId: 'pursuit-gaze-right', en: 'Gaze-Induced Nystagmus — Right Gaze', hi: 'गेज़-प्रेरित निस्टागमस — दाएं' },
  { exerciseId: 'pursuit-gaze-up', en: 'Gaze-Induced Nystagmus — Up Gaze', hi: 'गेज़-प्रेरित निस्टागमस — ऊपर' },
  { exerciseId: 'pursuit-gaze-down', en: 'Gaze-Induced Nystagmus — Down Gaze', hi: 'गेज़-प्रेरित निस्टागमस — नीचे' },
];

const PURSUIT_SECTIONS: ReportSectionDef[] = [
  { exerciseId: 'pursuit-horizontal', en: 'Smooth Pursuit — Horizontal', hi: 'स्मूथ परस्यूट — क्षैतिज' },
  { exerciseId: 'pursuit-vertical', en: 'Smooth Pursuit — Vertical', hi: 'स्मूथ परस्यूट — लंबवत' },
];

const SACCADE_SECTIONS: ReportSectionDef[] = [
  { exerciseId: 'pursuit-saccadic', en: 'Fixed Saccade', hi: 'फिक्स्ड सैकेड' },
  { exerciseId: 'pursuit-random-saccade', en: 'Random Saccade', hi: 'रैंडम सैकेड' },
];

const OTHER_SECTIONS: ReportSectionDef[] = [
  { exerciseId: 'pursuit-optokinetic', en: 'Optokinetic (OKN)', hi: 'ऑप्टोकाइनेटिक (OKN)' },
  { exerciseId: 'pursuit-vor-x2', en: 'VOR x2 (supplementary — not part of a standard VNG battery)', hi: 'VOR x2 (अतिरिक्त — मानक VNG बैटरी का भाग नहीं)' },
];

const ALL_SECTIONS = [...NYSTAGMUS_SECTIONS, ...PURSUIT_SECTIONS, ...SACCADE_SECTIONS, ...OTHER_SECTIONS];

function latestByExerciseId(sessions: GazeSession[], exerciseId: string): GazeSession | null {
  let latest: GazeSession | null = null;
  for (const s of sessions) {
    if (s.exerciseId !== exerciseId) continue;
    if (!latest || s.createdAt > latest.createdAt) latest = s;
  }
  return latest;
}

function fmt(v: number | undefined, digits = 1, suffix = ''): string {
  return v === undefined || v === null || Number.isNaN(v) ? '—' : `${v.toFixed(digits)}${suffix}`;
}

function qualityBadgeHtml(grade: string | undefined): string {
  const g = grade ?? 'invalid';
  const color = g === 'excellent' ? '#059669' : g === 'good' ? '#2563eb' : g === 'borderline' ? '#d97706' : '#dc2626';
  return `<span style="color:${color}; font-weight:bold; text-transform:uppercase; font-size:11px;">${g}</span>`;
}

export const VngBatteryReport: React.FC<{ hi: boolean; sessions: GazeSession[] }> = ({ hi, sessions }) => {
  const { registeredUsers } = useAppData();

  const patient = useMemo(() => {
    const patientId = getCurrentPatientId();
    const found = (registeredUsers || []).find((u: any) => u.id === patientId);
    return {
      name: found?.name ?? 'Sachin Srivastava',
      mrn: found?.mrnOrHprId ?? 'MRN: 88491',
      age: found?.age ?? 42,
      gender: found?.gender ?? 'Male',
    };
  }, [registeredUsers]);

  const sectionStatus = useMemo(
    () => ALL_SECTIONS.map((sec) => ({ sec, session: latestByExerciseId(sessions, sec.exerciseId) })),
    [sessions]
  );
  const recordedCount = sectionStatus.filter((s) => s.session).length;

  const handlePrintReport = () => {
    const printWindow = window.open('', '_blank', 'width=850,height=950');
    if (!printWindow) return;

    const nystagmusRows = NYSTAGMUS_SECTIONS.map((sec) => {
      const session = latestByExerciseId(sessions, sec.exerciseId);
      const score = session?.vngScore as NystagmusVNGScore | undefined;
      if (!score) {
        return `<tr><td style="text-align:left;">${sec.en}</td><td colspan="5" style="color:#94a3b8;">Not yet recorded</td></tr>`;
      }
      return `<tr>
        <td style="text-align:left;">${sec.en}</td>
        <td>${fmt(score.rightEye.spvDegPerSec)}</td>
        <td>${fmt(score.rightEye.beatsPer30Sec, 0)}</td>
        <td>${fmt(score.leftEye.spvDegPerSec)}</td>
        <td>${fmt(score.leftEye.beatsPer30Sec, 0)}</td>
        <td>${qualityBadgeHtml(score.validity.qualityGrade)}</td>
      </tr>`;
    }).join('');

    const pursuitRows = PURSUIT_SECTIONS.map((sec) => {
      const session = latestByExerciseId(sessions, sec.exerciseId);
      const score = session?.vngScore as SmoothPursuitVNGScore | undefined;
      if (!score) {
        return `<tr><td style="text-align:left;">${sec.en}</td><td colspan="5" style="color:#94a3b8;">Not yet recorded</td></tr>`;
      }
      const gains = score.frequencyGains.map((g) => `${g.frequencyHz}Hz: ${fmt(g.gain, 2)}`).join(', ') || '—';
      return `<tr>
        <td style="text-align:left;">${sec.en}</td>
        <td>${fmt(score.velocityGain, 2)}</td>
        <td>${fmt(score.directionalAgreement, 2)}</td>
        <td>${fmt(score.retinalSlipVelocityDegPerSec)}</td>
        <td>${score.catchUpSaccadeCount}</td>
        <td style="font-size:11px;">${gains}</td>
        <td>${qualityBadgeHtml(score.validity.qualityGrade)}</td>
      </tr>`;
    }).join('');

    const saccadeRows = SACCADE_SECTIONS.map((sec) => {
      const session = latestByExerciseId(sessions, sec.exerciseId);
      const score = session?.vngScore as SaccadeScore | undefined;
      if (!score) {
        return `<tr><td style="text-align:left;">${sec.en}</td><td colspan="5" style="color:#94a3b8;">Not yet recorded</td></tr>`;
      }
      return `<tr>
        <td style="text-align:left;">${sec.en}</td>
        <td>${score.saccadeCount}</td>
        <td>${score.meanLatencyMs} ms</td>
        <td>${score.peakVelocityDegPerSec} deg/s</td>
        <td>${fmt(score.accuracyGain * 100, 0, '%')}</td>
        <td>${score.dysmetriaClassification}</td>
        <td>${qualityBadgeHtml(score.validity.qualityGrade)}</td>
      </tr>`;
    }).join('');

    const oknSession = latestByExerciseId(sessions, 'pursuit-optokinetic');
    const oknScore = oknSession?.vngScore as OknScore | undefined;
    const oknRow = oknScore
      ? `<tr>
          <td style="text-align:left;">Optokinetic (OKN)</td>
          <td>${fmt(oknScore.spvRightDegPerSec)}</td>
          <td>${fmt(oknScore.spvLeftDegPerSec)}</td>
          <td>${fmt(oknScore.asymmetryRatioPct, 1, '%')}</td>
          <td>${fmt(oknScore.nystagmusBeatFrequencyHz, 1, ' Hz')}</td>
          <td>${qualityBadgeHtml(oknScore.validity.qualityGrade)}</td>
        </tr>`
      : `<tr><td style="text-align:left;">Optokinetic (OKN)</td><td colspan="5" style="color:#94a3b8;">Not yet recorded</td></tr>`;

    const vorSession = latestByExerciseId(sessions, 'pursuit-vor-x2');
    const vorScore = vorSession?.vngScore as VorX2Score | undefined;
    const vorRow = vorScore
      ? `<tr>
          <td style="text-align:left;">VOR x2</td>
          <td>${fmt(vorScore.vorGain, 2)}</td>
          <td>${vorScore.oppositionValidated ? 'Yes' : 'No'}</td>
          <td>${fmt(vorScore.headTargetCorrelation, 2)}</td>
          <td>${fmt(vorScore.meanHeadVelocityDegPerSec)}</td>
          <td>${qualityBadgeHtml(vorScore.validity.qualityGrade)}</td>
        </tr>`
      : `<tr><td style="text-align:left;">VOR x2</td><td colspan="5" style="color:#94a3b8;">Not yet recorded</td></tr>`;

    const reportHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>AI Gaze &amp; Vestibular Screening Report - ${patient.name}</title>
          <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; padding: 30px; color: #0f172a; line-height: 1.5; }
            .header { border-bottom: 3px solid #4f46e5; padding-bottom: 12px; margin-bottom: 20px; display: flex; justify-content: space-between; }
            .title { font-size: 22px; font-weight: bold; color: #312e81; }
            .patient-box { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; margin-bottom: 16px; font-size: 13px; }
            .disclaimer { background: #fffbeb; border: 1px solid #fbbf24; border-radius: 8px; padding: 12px; margin-bottom: 20px; font-size: 12px; color: #78350f; line-height: 1.6; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 18px; font-size: 12px; }
            th, td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: center; }
            th { background: #f1f5f9; font-weight: bold; }
            .section { margin-top: 18px; }
            .section-header { font-size: 14px; font-weight: bold; color: #3730a3; border-bottom: 2px solid #e2e8f0; padding-bottom: 4px; margin-bottom: 8px; }
            .footer { margin-top: 40px; border-top: 1px solid #cbd5e1; padding-top: 15px; font-size: 12px; color: #64748b; }
            .footer .sig { margin-top: 24px; display: flex; justify-content: space-between; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="title">i-Dhanwantari ENT Module</div>
              <div style="font-size:12px; color:#475569;">AI Gaze &amp; Vestibular Rehab Screening — Webcam Oculomotor Battery</div>
            </div>
            <div style="text-align:right; font-size:12px;">
              Date: ${new Date().toLocaleDateString('en-IN')}<br/>
              Ref: VNG-${Date.now().toString().slice(-6)}
            </div>
          </div>

          <div class="patient-box">
            <strong>Patient Name:</strong> ${patient.name} &nbsp;|&nbsp; <strong>ID:</strong> ${patient.mrn} &nbsp;|&nbsp; <strong>Age/Sex:</strong> ${patient.age} yrs / ${patient.gender}
          </div>

          <div class="disclaimer">
            <strong>Not a diagnostic VNG / vHIT / caloric / cVEMP report.</strong> This is a webcam-based AI oculomotor screening and rehab-monitoring tool, not calibrated or validated clinical VNG hardware. Caloric, video Head Impulse Test (vHIT), and cVEMP sections are not included &mdash; they require a caloric irrigator, a &ge;250Hz head-impulse camera, and EMG electrodes respectively, none of which a webcam can substitute for.
            Nystagmus screening below was recorded with the patient fixating a visible on-screen target (no infrared/Frenzel goggles denying vision) &mdash; visual fixation suppression stayed active throughout, unlike a clinical VNG run in darkness. A normal result therefore does not rule out a fixation-suppressed peripheral nystagmus; only positive findings are informative on their own.
            All findings require review and sign-off by a qualified clinician before any diagnostic or treatment decision.
          </div>

          <div class="section">
            <div class="section-header">1. Spontaneous &amp; Gaze-Induced Nystagmus</div>
            <table>
              <thead><tr><th>Test</th><th>Right Eye SPV (deg/s)</th><th>Right Eye Beats/30s</th><th>Left Eye SPV (deg/s)</th><th>Left Eye Beats/30s</th><th>Signal Quality</th></tr></thead>
              <tbody>${nystagmusRows}</tbody>
            </table>
          </div>

          <div class="section">
            <div class="section-header">2. Smooth Pursuit</div>
            <table>
              <thead><tr><th>Test</th><th>Velocity Gain</th><th>Directional Agreement</th><th>Retinal Slip (deg/s)</th><th>Catch-up Saccades</th><th>Frequency Gains</th><th>Signal Quality</th></tr></thead>
              <tbody>${pursuitRows}</tbody>
            </table>
          </div>

          <div class="section">
            <div class="section-header">3. Fixed &amp; Random Saccade</div>
            <table>
              <thead><tr><th>Test</th><th>Saccade Count</th><th>Mean Latency</th><th>Peak Velocity</th><th>Accuracy Gain</th><th>Dysmetria</th><th>Signal Quality</th></tr></thead>
              <tbody>${saccadeRows}</tbody>
            </table>
          </div>

          <div class="section">
            <div class="section-header">4. Optokinetic &amp; VOR x2</div>
            <table>
              <thead><tr><th>Test</th><th>Metric A</th><th>Metric B</th><th>Metric C</th><th>Metric D</th><th>Signal Quality</th></tr></thead>
              <tbody>${oknRow}${vorRow}</tbody>
            </table>
            <p style="font-size:11px; color:#64748b;">OKN columns: SPV Right, SPV Left, Asymmetry, Beat Frequency. VOR x2 columns: Gain, Head-Target Opposition Validated, Head-Target Correlation, Mean Head Velocity (deg/s).</p>
          </div>

          <div class="footer">
            <div>Not FDA/CE cleared as a diagnostic device &middot; Generated by i-Dhanwantari ENT Module &middot; Sections marked "Not yet recorded" were not run in this device's session history.</div>
            <div class="sig">
              <div>Reviewed by (clinician signature): ______________________</div>
              <div>Date: ______________</div>
            </div>
          </div>
          <script>window.print();</script>
        </body>
      </html>
    `;

    printWindow.document.write(reportHtml);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6">
      <div className="bg-[#0b0f19] p-4 sm:p-6 rounded-2xl border border-white/10 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-400" />
              {hi ? 'VNG-शैली की पूर्ण बैटरी रिपोर्ट' : 'Full VNG-Style Battery Report'}
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              {hi
                ? `${recordedCount} / ${ALL_SECTIONS.length} खंड इस डिवाइस पर दर्ज किए गए हैं। प्रत्येक टेस्ट टैब में जाकर बाकी खंड पूरे करें, फिर रिपोर्ट प्रिंट करें।`
                : `${recordedCount} / ${ALL_SECTIONS.length} sections recorded on this device. Run the remaining tests in the Red-Dot Pursuit tab, then print.`}
            </p>
          </div>
          <button
            onClick={handlePrintReport}
            disabled={recordedCount === 0}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-indigo-900/40 transition-all"
          >
            <Printer className="w-4 h-4" />
            {hi ? 'रिपोर्ट प्रिंट करें / PDF सहेजें' : 'Print Report / Save as PDF'}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {sectionStatus.map(({ sec, session }) => (
            <div
              key={sec.exerciseId}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs ${
                session ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-200' : 'bg-white/5 border-white/10 text-slate-400'
              }`}
            >
              {session ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> : <Circle className="w-3.5 h-3.5 shrink-0" />}
              <span>{hi ? sec.hi : sec.en}</span>
            </div>
          ))}
        </div>

        <p className="text-[11px] text-amber-200 bg-amber-950/40 border border-amber-500/30 p-3 rounded-xl leading-relaxed">
          {hi
            ? 'यह एक AI-सहायता प्राप्त वेबकैम स्क्रीनिंग उपकरण है — कैलिब्रेटेड क्लिनिकल VNG/vHIT/कैलोरिक/cVEMP उपकरण का विकल्प नहीं। Caloric, vHIT और cVEMP खंड शामिल नहीं हैं क्योंकि इनके लिए विशेष हार्डवेयर आवश्यक है। सभी निष्कर्षों की समीक्षा किसी योग्य चिकित्सक द्वारा की जानी चाहिए।'
            : 'This is an AI-assisted webcam screening tool, not a substitute for calibrated clinical VNG/vHIT/caloric/cVEMP hardware. Caloric, vHIT, and cVEMP sections are intentionally excluded — they require dedicated hardware a webcam cannot replicate. All findings require clinician review before any diagnostic or treatment decision.'}
        </p>
      </div>
    </div>
  );
};
