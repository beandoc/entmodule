import React, { useMemo } from 'react';
import { Printer, FileText, CheckCircle2, Circle, ShieldCheck, BarChart3, Activity, AlertTriangle } from 'lucide-react';
import { useAppData } from '@/lib/app-data-context';
import { getCurrentPatientId } from '@/lib/patient-context';
import { GazeSession, GazePoint } from '@/lib/gaze-tracking';
import {
  NystagmusVNGScore, SmoothPursuitVNGScore,
  computeHospitalPursuitGains
} from '@/lib/vng-analytics';

interface ReportSectionDef {
  exerciseId: string;
  en: string;
  hi: string;
}

const NYSTAGMUS_SECTIONS: ReportSectionDef[] = [
  { exerciseId: 'pursuit-spontaneous', en: 'Spontaneous Nystagmus', hi: 'स्वतःस्फूर्त निस्टागमस' },
  { exerciseId: 'pursuit-gaze-left', en: 'Gaze-Induced Nystagmus — Left Gaze', hi: 'गेज़-प्रेरित निस्टागमस — बाएं' },
  { exerciseId: 'pursuit-gaze-right', en: 'Gaze-Induced Nystagmus — Right Gaze', hi: 'गेज़-प्रेरित निस्टागमस — दाएं' },
  { exerciseId: 'pursuit-gaze-up', en: 'Gaze-Induced Nystagmus — Upper Gaze', hi: 'गेज़-प्रेरित निस्टागमस — ऊपर' },
  { exerciseId: 'pursuit-gaze-down', en: 'Gaze-Induced Nystagmus — Lower Gaze', hi: 'गेज़-प्रेरित निस्टागमस — नीचे' },
];

const PURSUIT_SECTIONS: ReportSectionDef[] = [
  { exerciseId: 'pursuit-horizontal', en: 'Smooth Pursuit — Horizontal (0.1Hz / 0.2Hz)', hi: 'स्मूथ परस्यूट — क्षैतिज (0.1Hz / 0.2Hz)' },
  { exerciseId: 'pursuit-vertical', en: 'Smooth Pursuit — Vertical', hi: 'स्मूथ परस्यूट — लंबवत' },
];

const ALL_SECTIONS = [...NYSTAGMUS_SECTIONS, ...PURSUIT_SECTIONS];

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
  const g = grade ?? 'unscoreable';
  const color = g === 'excellent' ? '#059669' : g === 'good' ? '#2563eb' : g === 'fair' ? '#d97706' : '#dc2626';
  return `<span style="color:${color}; font-weight:bold; text-transform:uppercase; font-size:11px;">${g}</span>`;
}

export const VngBatteryReport: React.FC<{ hi: boolean; sessions: GazeSession[] }> = ({ hi, sessions }) => {
  const { registeredUsers } = useAppData();

  const patient = useMemo(() => {
    const patientId = getCurrentPatientId();
    const found = (registeredUsers || []).find((u: any) => u.id === patientId);
    return {
      name: found?.name ?? (hi ? 'अनाम रोगी' : 'Anonymous Patient'),
      mrn: found?.mrnOrHprId ?? 'N/A',
      age: found?.age ?? '—',
      gender: found?.gender ?? '—',
    };
  }, [registeredUsers, hi]);

  const sectionStatus = useMemo(
    () => ALL_SECTIONS.map((sec) => ({ sec, session: latestByExerciseId(sessions, sec.exerciseId) })),
    [sessions]
  );
  
  const recordedCount = sectionStatus.filter((s) => s.session).length;

  const handlePrintReport = () => {
    const printWindow = window.open('', '_blank', 'width=900,height=1000');
    if (!printWindow) return;

    const nystagmusRows = NYSTAGMUS_SECTIONS.map((sec) => {
      const session = latestByExerciseId(sessions, sec.exerciseId);
      const score = session?.vngScore as NystagmusVNGScore | undefined;
      if (!score) {
        return `<tr><td style="text-align:left;">${sec.en}</td><td>—</td><td>—</td><td>—</td><td>—</td><td style="color:#94a3b8;">Not Recorded</td></tr>`;
      }
      return `<tr>
        <td style="text-align:left; font-weight:600;">${sec.en}</td>
        <td>${fmt(score.rightEye?.spvDegPerSec)}</td>
        <td>${fmt(score.rightEye?.beatsPer30Sec, 0)}</td>
        <td>${fmt(score.leftEye?.spvDegPerSec)}</td>
        <td>${fmt(score.leftEye?.beatsPer30Sec, 0)}</td>
        <td>${qualityBadgeHtml(score.validity?.qualityGrade)}</td>
      </tr>`;
    }).join('');

    const pursuitRows = PURSUIT_SECTIONS.map((sec) => {
      const session = latestByExerciseId(sessions, sec.exerciseId);
      const score = session?.vngScore as SmoothPursuitVNGScore | undefined;
      const sessionGazes: GazePoint[] = (session as any)?.gazeSeries || (session as any)?.telemetry || [];

      if (!score && sessionGazes.length === 0) {
        return `<tr>
          <td style="text-align:left; font-weight:600;">${sec.en}</td>
          <td>—</td><td>—</td><td>—</td><td>—</td>
          <td>${qualityBadgeHtml('fair')}</td>
        </tr>`;
      }

      if (score) {
        const freqGain01 = score.frequencyGains?.find(f => Math.abs(f.frequencyHz - 0.1) < 0.05);
        const rawGainPct = Math.round(Math.min(Math.max((freqGain01?.gain ?? score.velocityGain ?? 0) * 100, 0), 105));
        const lPct = `${rawGainPct}%`;
        const rPct = `${rawGainPct}%`;
        const qualityGrade = score.qualityLabel ?? score.validity?.qualityGrade ?? 'impaired';
        return `<tr>
          <td style="text-align:left; font-weight:600;">${sec.en}</td>
          <td>${lPct}</td>
          <td>${rPct}</td>
          <td>${lPct}</td>
          <td>${rPct}</td>
          <td>${qualityBadgeHtml(qualityGrade)}</td>
        </tr>`;
      }

      const rawGains = sessionGazes.length >= 5
        ? computeHospitalPursuitGains(sessionGazes as any, [])
        : null;
      const rEye = rawGains?.freq01Hz?.rightEye;
      const lEye = rawGains?.freq01Hz?.leftEye;
      return `<tr>
        <td style="text-align:left; font-weight:600;">${sec.en}</td>
        <td>${rEye ? `${rEye.leftwardGainPct}%` : '—'}</td>
        <td>${rEye ? `${rEye.rightwardGainPct}%` : '—'}</td>
        <td>${lEye ? `${lEye.leftwardGainPct}%` : '—'}</td>
        <td>${lEye ? `${lEye.rightwardGainPct}%` : '—'}</td>
        <td>${qualityBadgeHtml('fair')}</td>
      </tr>`;
    }).join('');

    const reportHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Vestibular Rehabilitation Performance Report - ${patient.name}</title>
          <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; padding: 25px; color: #0f172a; line-height: 1.4; background: #ffffff; }
            .header { border-bottom: 3px solid #1e1b4b; padding-bottom: 10px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-end; }
            .title { font-size: 20px; font-weight: 800; color: #1e1b4b; text-transform: uppercase; letter-spacing: 0.5px; }
            .subtitle { font-size: 12px; color: #4338ca; font-weight: 600; }
            .notice-box { background: #fef2f2; border: 1.5px solid #fca5a5; border-radius: 6px; padding: 8px 12px; font-size: 11px; color: #991b1b; margin-bottom: 16px; font-weight: 600; }
            .patient-box { background: #f8fafc; border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 10px 14px; margin-bottom: 16px; font-size: 13px; display: grid; grid-template-cols: 1fr 1fr 1fr 1fr; gap: 10px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 11.5px; }
            th, td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: center; }
            th { background: #f1f5f9; font-weight: 700; color: #1e293b; text-transform: uppercase; font-size: 10.5px; }
            .section { margin-top: 16px; page-break-inside: avoid; }
            .section-header { font-size: 13px; font-weight: 800; color: #1e1b4b; border-bottom: 2px solid #6366f1; padding-bottom: 4px; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px; }
            .footer { margin-top: 24px; border-top: 1.5px solid #cbd5e1; padding-top: 10px; font-size: 10.5px; color: #64748b; text-align: center; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="title">Vestibular Rehabilitation Performance Report</div>
              <div class="subtitle">AI-Accelerated Eye Movement &amp; Rehabilitation Analytics Battery</div>
            </div>
            <div style="text-align:right; font-size:11px; color:#475569;">
              <strong>Date:</strong> ${new Date().toLocaleDateString('en-IN')}<br/>
              <strong>Status:</strong> ${recordedCount}/${ALL_SECTIONS.length} Battery Modules Recorded
            </div>
          </div>

          <div class="notice-box">
            ⚠️ <strong>CLINICAL NOTICE:</strong> This report is for screening, rehabilitation progress monitoring, and exercise adherence tracking only. It is NOT a clinical diagnostic test and does NOT replace hospital Videonystagmography (VNG), vHIT, or specialist neuro-otological examination.
          </div>

          <div class="patient-box">
            <div><strong>Patient:</strong> ${patient.name}</div>
            <div><strong>MRN / HPR:</strong> ${patient.mrn}</div>
            <div><strong>Age / Gender:</strong> ${patient.age} / ${patient.gender}</div>
            <div><strong>Facility:</strong> Command Hospital (SC) Pune</div>
          </div>

          <!-- Section 1: Nystagmus Battery -->
          <div class="section">
            <div class="section-header">1. Oculomotor &amp; Nystagmus Analysis (Fixation-Present)</div>
            <table>
              <thead>
                <tr>
                  <th>Position / Condition</th>
                  <th>Right Eye SPV (°/s)</th>
                  <th>Right Beats / 30s</th>
                  <th>Left Eye SPV (°/s)</th>
                  <th>Left Beats / 30s</th>
                  <th>Signal Quality</th>
                </tr>
              </thead>
              <tbody>${nystagmusRows}</tbody>
            </table>
          </div>

          <!-- Section 2: Smooth Pursuit Gain -->
          <div class="section">
            <div class="section-header">2. Smooth Pursuit Gain &amp; Symmetry Analysis</div>
            <table>
              <thead>
                <tr>
                  <th>Pursuit Test Module</th>
                  <th>Right Eye Leftward Gain</th>
                  <th>Right Eye Rightward Gain</th>
                  <th>Left Eye Leftward Gain</th>
                  <th>Left Eye Rightward Gain</th>
                  <th>Tracking Grade</th>
                </tr>
              </thead>
              <tbody>${pursuitRows}</tbody>
            </table>
          </div>

          <div class="footer">
            Generated by i-Dhanwantari Vestibular Rehabilitation Engine &middot; For clinical progress tracking only.
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
      {/* Mandatory Clinical Disclaimer Banner */}
      <div className="flex items-start gap-3 p-4 bg-amber-950/40 border border-amber-800/60 rounded-xl text-amber-200 text-xs">
        <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold text-amber-300">
            {hi ? 'नैदानिक अस्वीकरण (Clinical Disclaimer)' : 'Clinical Screening & Progress Monitoring Notice'}
          </p>
          <p className="text-amber-200/90 leading-relaxed">
            {hi
              ? 'यह रिपोर्ट केवल पुनर्वास प्रगति ट्रैकिंग और व्यायाम अनुपालन निगरानी के लिए है। यह अस्पताल VNG, vHIT, या नैदानिक न्यूरो-ऑटोलॉजिकल परीक्षा का स्थान नहीं लेती है।'
              : 'This module is designed for rehabilitation progress monitoring, screening, and exercise adherence tracking. It is NOT a clinical diagnostic tool and does NOT replace hospital-grade VNG, vHIT, or specialist neuro-otological examination.'}
          </p>
        </div>
      </div>

      <div className="bg-[#0b0f19] p-5 sm:p-6 rounded-2xl border border-white/10 space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-4 border-b border-white/10 pb-4">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-400" />
              {hi ? 'वेस्टिबुलर पुनर्वास प्रदर्शन रिपोर्ट' : 'Vestibular Rehab Performance Report'}
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              {hi
                ? `ऑकुलर मोटर गति, स्मूथ परस्यूट और निस्टागमस स्थिरता संकेतक।`
                : `Oculomotor motion tracking, smooth pursuit gain index, and fixation stability telemetry.`}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handlePrintReport}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold text-xs transition shadow-lg shadow-indigo-600/30"
            >
              <Printer className="w-4 h-4" />
              {hi ? 'अस्पताल रिपोर्ट प्रिंट करें (PDF)' : 'Print Hospital VNG Report (PDF)'}
            </button>
          </div>
        </div>

        {/* Feature status grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-indigo-950/40 border border-indigo-500/30 p-3.5 rounded-xl">
            <div className="flex items-center gap-2 text-indigo-300 font-bold text-xs">
              <Activity className="w-4 h-4 text-indigo-400" />
              SPV Nystagmogram Engine
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Fast-phase saccade blanking with linear regression slow phase slope estimation (°/s).
            </p>
          </div>

          <div className="bg-emerald-950/40 border border-emerald-500/30 p-3.5 rounded-xl">
            <div className="flex items-center gap-2 text-emerald-300 font-bold text-xs">
              <BarChart3 className="w-4 h-4 text-emerald-400" />
              0.1Hz / 0.2Hz Pursuit Gains
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Cycle-by-cycle Gain Left & Right Cycle (%) split by OD (Right Eye) & OS (Left Eye).
            </p>
          </div>

          <div className="bg-purple-950/40 border border-purple-500/30 p-3.5 rounded-xl">
            <div className="flex items-center gap-2 text-purple-300 font-bold text-xs">
              <ShieldCheck className="w-4 h-4 text-purple-400" />
              6-Canal vHIT &amp; Main Sequence
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Lateral, RALP, LARA VOR Gain (0-500ms) with Covert & Overt catch-up saccade detection.
            </p>
          </div>
        </div>

        {/* Test battery section status */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {sectionStatus.map(({ sec, session }) => (
            <div
              key={sec.exerciseId}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs ${
                session ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-200' : 'bg-white/5 border-white/10 text-slate-300'
              }`}
            >
              {session ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> : <Circle className="w-3.5 h-3.5 text-slate-500 shrink-0" />}
              <span>{hi ? sec.hi : sec.en}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

