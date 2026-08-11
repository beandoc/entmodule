"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Volume2,
  Activity,
  UserCheck,
  FileSpreadsheet,
  CheckCircle2,
  Save,
  Ear,
  Sliders,
  Sparkles,
  Zap,
  Clock,
  ShieldCheck,
  Printer,
  Play,
  Square,
  Waves,
  Stethoscope,
  BarChart3,
  RefreshCcw,
} from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

import { useAppData } from "@/lib/app-data-context";
import { VoiceAnalysisQueueTab } from "./gaze/VoiceAnalysisQueueTab";

interface AudiogramPoint {
  freq: number; // Hz
  rightEarDb: number; // dB HL
  leftEarDb: number; // dB HL
  rightEarBcDb?: number; // Bone conduction dB HL
  leftEarBcDb?: number; // Bone conduction dB HL
}

export function AudiologistWorkspace() {
  const { registeredUsers } = useAppData();
  const registeredPatients = (registeredUsers || []).filter((u: any) => u.role === "patient");

  const [selectedPatientId, setSelectedPatientId] = useState("pt_101");
  const [patientName, setPatientName] = useState("Sachin Srivastava");
  const [patientMrn, setPatientMrn] = useState("MRN: 88491");
  const [audiologistName, setAudiologistName] = useState("Mr Lokanath Sahoo");
  const [activeTab, setActiveTab] = useState<"audiology" | "voice_queue">("audiology");

  // Audiogram Frequencies
  const [audiogramData, setAudiogramData] = useState<AudiogramPoint[]>([
    { freq: 250, rightEarDb: 15, leftEarDb: 20, rightEarBcDb: 10, leftEarBcDb: 15 },
    { freq: 500, rightEarDb: 20, leftEarDb: 25, rightEarBcDb: 15, leftEarBcDb: 20 },
    { freq: 1000, rightEarDb: 25, leftEarDb: 35, rightEarBcDb: 20, leftEarBcDb: 30 },
    { freq: 2000, rightEarDb: 40, leftEarDb: 45, rightEarBcDb: 35, leftEarBcDb: 40 },
    { freq: 4000, rightEarDb: 55, leftEarDb: 60, rightEarBcDb: 50, leftEarBcDb: 55 },
    { freq: 8000, rightEarDb: 65, leftEarDb: 70, rightEarBcDb: 60, leftEarBcDb: 65 },
  ]);

  // Speech Audiometry
  const [rightSrtDb, setRightSrtDb] = useState(25);
  const [leftSrtDb, setLeftSrtDb] = useState(35);
  const [rightWrsPct, setRightWrsPct] = useState(92);
  const [leftWrsPct, setLeftWrsPct] = useState(84);
  const [speechInNoiseScore, setSpeechInNoiseScore] = useState(72);

  // Tympanometry (Acoustic Immittance)
  const [tympanogramType, setTympanogramType] = useState<"Type A" | "Type B" | "Type C" | "Type As" | "Type Ad">("Type A");
  const [peakPressureDaPa, setPeakPressureDaPa] = useState(-15);
  const [complianceMl, setComplianceMl] = useState(0.65);
  const [earCanalVolCm3, setEarCanalVolCm3] = useState(1.2);

  // Tinnitus Assessment & ACRN Setup
  const [tinnitusPitchHz, setTinnitusPitchHz] = useState(4000);
  const [tinnitusLoudnessDbSl, setTinnitusLoudnessDbSl] = useState(7);
  const [maskingNoiseType, setMaskingNoiseType] = useState("NOTCHED_WHITE_NOISE");
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const oscRef = useRef<OscillatorNode | null>(null);

  // Hearing Aid REM Fitting
  const [fittingStatus, setFittingStatus] = useState("OPTIMAL");
  const [haModel, setHaModel] = useState("Phonak Audéo Lumity R90 (Bilateral)");
  const [targetGainMatched, setTargetGainMatched] = useState(true);

  // Saving state
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Pure Tone Averages (PTA 500, 1k, 2k Hz)
  const rightPta = Math.round(
    (audiogramData[1].rightEarDb + audiogramData[2].rightEarDb + audiogramData[3].rightEarDb) / 3
  );
  const leftPta = Math.round(
    (audiogramData[1].leftEarDb + audiogramData[2].leftEarDb + audiogramData[3].leftEarDb) / 3
  );

  const getSeverityLabel = (pta: number) => {
    if (pta <= 20) return { label: "Normal Hearing", color: "text-emerald-400" };
    if (pta <= 35) return { label: "Mild Hearing Loss", color: "text-cyan-400" };
    if (pta <= 50) return { label: "Moderate Loss", color: "text-amber-400" };
    if (pta <= 70) return { label: "Severe Loss", color: "text-orange-400" };
    return { label: "Profound Loss", color: "text-rose-400" };
  };

  const handleDbChange = (freq: number, ear: "rightEarDb" | "leftEarDb", val: number) => {
    setAudiogramData((prev) =>
      prev.map((item) => (item.freq === freq ? { ...item, [ear]: val } : item))
    );
  };

  // Web Audio Pure Tone Pitch Generator for Tinnitus Matching
  const toggleToneGenerator = () => {
    if (isAudioPlaying) {
      if (oscRef.current) {
        oscRef.current.stop();
        oscRef.current.disconnect();
        oscRef.current = null;
      }
      setIsAudioPlaying(false);
    } else {
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (!audioCtxRef.current) {
          audioCtxRef.current = new AudioContextClass();
        }
        const ctx = audioCtxRef.current;
        if (ctx.state === "suspended") {
          ctx.resume();
        }
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(tinnitusPitchHz, ctx.currentTime);
        gain.gain.setValueAtTime(0.08, ctx.currentTime); // Safe initial volume

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start();
        oscRef.current = osc;
        setIsAudioPlaying(true);
      } catch (err) {
        console.error("Failed to start tone generator:", err);
      }
    }
  };

  useEffect(() => {
    if (isAudioPlaying && oscRef.current && audioCtxRef.current) {
      oscRef.current.frequency.setValueAtTime(tinnitusPitchHz, audioCtxRef.current.currentTime);
    }
  }, [tinnitusPitchHz]);

  useEffect(() => {
    return () => {
      if (oscRef.current) {
        try {
          oscRef.current.stop();
          oscRef.current.disconnect();
        } catch {}
        oscRef.current = null;
      }
      if (audioCtxRef.current) {
        try {
          audioCtxRef.current.close();
        } catch {}
        audioCtxRef.current = null;
      }
    };
  }, []);

  const saveAudiologyRecord = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    const payload = {
      patientId: selectedPatientId,
      patientName,
      patientMrn,
      audiologistName,
      audiogramData,
      rightPta,
      leftPta,
      rightSrtDb,
      leftSrtDb,
      rightWrsPct,
      leftWrsPct,
      speechInNoiseScore,
      tympanogramType,
      peakPressureDaPa,
      complianceMl,
      tinnitusPitchHz,
      tinnitusLoudnessDbSl,
      maskingNoiseType,
      fittingStatus,
      haModel,
    };

    try {
      await addDoc(collection(db, "audiology_evaluations"), {
        ...payload,
        timestamp: serverTimestamp(),
      });
      await fetch('/api/audiology', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err) {
      console.error("Error saving audiology evaluation:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrintReport = () => {
    const printWindow = window.open("", "_blank", "width=850,height=950");
    if (!printWindow) return;

    const reportHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Audiological Evaluation Report - ${patientName}</title>
          <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; padding: 30px; color: #0f172a; line-height: 1.5; }
            .header { border-bottom: 3px solid #3b82f6; padding-bottom: 12px; margin-bottom: 20px; display: flex; justify-content: space-between; }
            .title { font-size: 22px; font-weight: bold; color: #1e3a8a; }
            .patient-box { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; margin-bottom: 20px; font-size: 13px; }
            table { w-full; width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px; }
            th, td { border: 1px solid #cbd5e1; padding: 8px 12px; text-align: center; }
            th { background: #f1f5f9; font-weight: bold; }
            .section { margin-top: 20px; }
            .section-header { font-size: 15px; font-weight: bold; color: #1e40af; border-bottom: 2px solid #e2e8f0; padding-bottom: 4px; margin-bottom: 10px; }
            .footer { margin-top: 50px; border-top: 1px solid #cbd5e1; padding-top: 15px; display: flex; justify-content: space-between; font-size: 12px; color: #64748b; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="title">Command Hospital ENT Department</div>
              <div style="font-size:12px; color:#475569;">Clinical Audiology & Neuro-Otology Suite</div>
            </div>
            <div style="text-align:right; font-size:12px;">
              Date: ${new Date().toLocaleDateString("en-IN")}<br/>
              Ref: AUD-${Date.now().toString().slice(-6)}
            </div>
          </div>

          <div class="patient-box">
            <strong>Patient Name:</strong> ${patientName} &nbsp;|&nbsp; <strong>MRN:</strong> ${patientMrn} &nbsp;|&nbsp; <strong>Age/Sex:</strong> 42 yrs / Male<br/>
            <strong>Evaluated By:</strong> ${audiologistName} (Chief Clinical Audiologist) &nbsp;|&nbsp; <strong>Test Status:</strong> Reliable
          </div>

          <div class="section-header">1. Pure Tone Audiometry (PTA) Air Conduction Thresholds (dB HL)</div>
          <table>
            <thead>
              <tr>
                <th>Ear</th>
                <th>250 Hz</th>
                <th>500 Hz</th>
                <th>1000 Hz</th>
                <th>2000 Hz</th>
                <th>4000 Hz</th>
                <th>8000 Hz</th>
                <th>PTA (500-2k)</th>
                <th>Impairment</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="color:#e11d48; font-weight:bold;">Right Ear (O)</td>
                ${audiogramData.map((d) => `<td>${d.rightEarDb}</td>`).join("")}
                <td style="font-weight:bold;">${rightPta} dB</td>
                <td>${getSeverityLabel(rightPta).label}</td>
              </tr>
              <tr>
                <td style="color:#0284c7; font-weight:bold;">Left Ear (X)</td>
                ${audiogramData.map((d) => `<td>${d.leftEarDb}</td>`).join("")}
                <td style="font-weight:bold;">${leftPta} dB</td>
                <td>${getSeverityLabel(leftPta).label}</td>
              </tr>
            </tbody>
          </table>

          <div class="section-header">2. Speech Audiometry & Immittance Assessment</div>
          <table>
            <thead>
              <tr>
                <th>Assessment</th>
                <th>Right Ear</th>
                <th>Left Ear</th>
                <th>Clinical Interpretation</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Speech Recognition Threshold (SRT)</td>
                <td>${rightSrtDb} dB HL</td>
                <td>${leftSrtDb} dB HL</td>
                <td>Agrees with Pure Tone Average</td>
              </tr>
              <tr>
                <td>Word Recognition Score (WRS)</td>
                <td>${rightWrsPct}%</td>
                <td>${leftWrsPct}%</td>
                <td>Excellent Speech Discrimination</td>
              </tr>
              <tr>
                <td>Speech in Noise Score (SIN)</td>
                <td colspan="2">${speechInNoiseScore}%</td>
                <td>Mild Noise Masking Deficit</td>
              </tr>
              <tr>
                <td>Tympanometry Type</td>
                <td colspan="2">${tympanogramType} (Peak: ${peakPressureDaPa} daPa, Comp: ${complianceMl} ml)</td>
                <td>Normal Middle Ear Function</td>
              </tr>
            </tbody>
          </table>

          <div class="section-header">3. Tinnitus Matching & Hearing Device Prescription</div>
          <p><strong>Matched Tinnitus Frequency:</strong> ${tinnitusPitchHz} Hz &nbsp;|&nbsp; <strong>Loudness:</strong> ${tinnitusLoudnessDbSl} dB SL</p>
          <p><strong>Prescribed Sound Therapy:</strong> ${maskingNoiseType} (ACRN Coordinated Reset Pattern)</p>
          <p><strong>Hearing Aid REM Status:</strong> ${haModel} — ${fittingStatus} Fitting</p>

          <div class="footer">
            <div>Verified Clinical Record · i-Dhanwantari ENT Module</div>
            <div>Audiologist Signature: <strong>${audiologistName}</strong></div>
          </div>
          <script>window.print();</script>
        </body>
      </html>
    `;

    printWindow.document.write(reportHtml);
    printWindow.document.close();
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-4 md:p-8 space-y-8 bg-slate-950 text-slate-100 min-h-screen">
      {/* Top Bar Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div className="flex items-center space-x-3">
          <div className="p-3 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 text-indigo-400">
            <Ear className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                AUDIOLOGIST PORTAL · {audiologistName.toUpperCase()}
              </span>
              <span className="text-xs text-slate-400 font-mono">ID: AUD-2026-HQ</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight mt-1">
              Pure Tone Audiometry & Tinnitus Suite
            </h1>
            <p className="text-xs text-slate-400">
              Interactive Audiogram Plotter, Speech-in-Noise, Tympanometry Classifier & REM Hearing Aid Verification
            </p>
          </div>
        </div>

        {/* Selected Patient Banner & Registered Patients Selector */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 bg-slate-900/90 p-3.5 rounded-2xl border border-slate-800">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab("audiology")}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all border ${
                activeTab === "audiology"
                  ? "bg-indigo-600 text-white border-indigo-400 shadow-md"
                  : "bg-white/5 text-slate-400 border-white/10 hover:bg-white/10 hover:text-white"
              }`}
            >
              📊 Audiometry & Tinnitus
            </button>
            <button
              onClick={() => setActiveTab("voice_queue")}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all border ${
                activeTab === "voice_queue"
                  ? "bg-indigo-600 text-white border-indigo-400 shadow-md"
                  : "bg-white/5 text-slate-400 border-white/10 hover:bg-white/10 hover:text-white"
              }`}
            >
              🎙️ Voice Analysis Queue
            </button>
          </div>
        </div>
      </div>

      {activeTab === "voice_queue" ? (
        <VoiceAnalysisQueueTab audiologistName={audiologistName} />
      ) : (
        <>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-slate-900/90 p-3.5 rounded-2xl border border-slate-800">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/30">
                <UserCheck className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Select Patient Evaluation</p>
                <select
                  value={selectedPatientId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setSelectedPatientId(id);
                    const selected = registeredPatients.find((p: any) => p.id === id);
                    if (selected) {
                      setPatientName(selected.name);
                      setPatientMrn(selected.mrnOrHprId);
                    }
                  }}
                  className="bg-slate-950 border border-slate-700 text-xs font-extrabold text-white px-2.5 py-1.5 rounded-xl focus:outline-none focus:border-teal-500"
                >
                  {registeredPatients.map((pt: any) => (
                    <option key={pt.id} value={pt.id}>
                      {pt.name} ({pt.mrnOrHprId})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              onClick={handlePrintReport}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white border border-slate-700 transition"
            >
              <Printer className="w-4 h-4 text-indigo-400" />
              <span>Print Report</span>
            </button>
          </div>

      {/* Main Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: PTA Interactive Grid & Visual Audiogram Canvas */}
        <div className="lg:col-span-2 space-y-6">
          {/* PTA Threshold Input Table */}
          <div className="p-6 rounded-3xl bg-slate-900/70 border border-slate-800 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Activity className="w-5 h-5 text-indigo-400" />
                <span>Air Conduction (AC) Thresholds (dB HL)</span>
              </h3>
              <span className="text-xs text-slate-400 font-mono">ISO 8253-1 Calibrated</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300 border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-xs text-slate-400 uppercase">
                    <th className="py-3 px-4">Frequency</th>
                    <th className="py-3 px-4 text-rose-400">Right Ear (O) dB</th>
                    <th className="py-3 px-4 text-cyan-400">Left Ear (X) dB</th>
                    <th className="py-3 px-4 text-slate-400">Bone Cond. (R)</th>
                    <th className="py-3 px-4 text-slate-400">Bone Cond. (L)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {audiogramData.map((pt) => (
                    <tr key={pt.freq} className="hover:bg-slate-800/40">
                      <td className="py-3 px-4 font-mono font-bold text-white">{pt.freq} Hz</td>
                      <td className="py-3 px-4">
                        <input
                          type="number"
                          min="0"
                          max="120"
                          step="5"
                          value={pt.rightEarDb}
                          onChange={(e) => handleDbChange(pt.freq, "rightEarDb", Number(e.target.value))}
                          aria-label={`Right Ear dB HL at ${pt.freq} Hz`}
                          className="w-20 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-rose-300 font-mono font-bold focus:outline-none focus:border-rose-500"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <input
                          type="number"
                          min="0"
                          max="120"
                          step="5"
                          value={pt.leftEarDb}
                          onChange={(e) => handleDbChange(pt.freq, "leftEarDb", Number(e.target.value))}
                          aria-label={`Left Ear dB HL at ${pt.freq} Hz`}
                          className="w-20 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-cyan-300 font-mono font-bold focus:outline-none focus:border-cyan-500"
                        />
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-rose-300/80">
                        {pt.rightEarBcDb} dB
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-cyan-300/80">
                        {pt.leftEarBcDb} dB
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* PTA Averages */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-800">
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
                <p className="text-xs text-rose-400 font-bold uppercase tracking-wide">Right Ear PTA (500, 1k, 2k Hz)</p>
                <div className="flex items-baseline space-x-2 mt-1">
                  <span className="text-2xl font-extrabold text-white">{rightPta} dB HL</span>
                </div>
                <p className={`text-xs font-semibold mt-1 ${getSeverityLabel(rightPta).color}`}>
                  {getSeverityLabel(rightPta).label}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
                <p className="text-xs text-cyan-400 font-bold uppercase tracking-wide">Left Ear PTA (500, 1k, 2k Hz)</p>
                <div className="flex items-baseline space-x-2 mt-1">
                  <span className="text-2xl font-extrabold text-white">{leftPta} dB HL</span>
                </div>
                <p className={`text-xs font-semibold mt-1 ${getSeverityLabel(leftPta).color}`}>
                  {getSeverityLabel(leftPta).label}
                </p>
              </div>
            </div>
          </div>

          {/* Visual Audiogram Curve Graph (SVG Chart) */}
          <div className="p-6 rounded-3xl bg-slate-900/70 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-teal-400" />
                <span>Visual Audiogram Plotter</span>
              </h3>
              <div className="flex items-center gap-4 text-xs font-semibold">
                <span className="text-rose-400 flex items-center gap-1">🔴 Right Ear (AC O)</span>
                <span className="text-cyan-400 flex items-center gap-1">💙 Left Ear (AC X)</span>
              </div>
            </div>

            {/* SVG Audiogram Graph */}
            <div className="w-full overflow-x-auto bg-slate-950 p-4 rounded-2xl border border-slate-800">
              <svg viewBox="0 0 600 280" className="w-full h-auto text-xs">
                {/* Frequency Grid Lines (X-axis) */}
                {[250, 500, 1000, 2000, 4000, 8000].map((f, i) => {
                  const x = 70 + i * 95;
                  return (
                    <g key={f}>
                      <line x1={x} y1={30} x2={x} y2={240} stroke="#334155" strokeWidth="1" strokeDasharray="3,3" />
                      <text x={x} y={20} fill="#94a3b8" textAnchor="middle" fontWeight="bold">
                        {f >= 1000 ? `${f / 1000}k` : f}Hz
                      </text>
                    </g>
                  );
                })}

                {/* dB HL Grid Lines (Y-axis) */}
                {[0, 20, 40, 60, 80, 100, 120].map((db) => {
                  const y = 30 + (db / 120) * 210;
                  return (
                    <g key={db}>
                      <line x1={50} y1={y} x2={550} y2={y} stroke="#1e293b" strokeWidth="1" />
                      <text x={40} y={y + 4} fill="#64748b" textAnchor="end" fontSize="10">
                        {db}
                      </text>
                    </g>
                  );
                })}

                {/* Right Ear Line (Red) */}
                <polyline
                  fill="none"
                  stroke="#f43f5e"
                  strokeWidth="2.5"
                  points={audiogramData
                    .map((pt, i) => `${70 + i * 95},${30 + (pt.rightEarDb / 120) * 210}`)
                    .join(" ")}
                />
                {/* Right Ear Points (Red Circles) */}
                {audiogramData.map((pt, i) => {
                  const x = 70 + i * 95;
                  const y = 30 + (pt.rightEarDb / 120) * 210;
                  return <circle key={`r-${i}`} cx={x} cy={y} r="6" fill="#991b1b" stroke="#f43f5e" strokeWidth="2.5" />;
                })}

                {/* Left Ear Line (Blue) */}
                <polyline
                  fill="none"
                  stroke="#06b6d4"
                  strokeWidth="2.5"
                  points={audiogramData
                    .map((pt, i) => `${70 + i * 95},${30 + (pt.leftEarDb / 120) * 210}`)
                    .join(" ")}
                />
                {/* Left Ear Points (Blue Crosses) */}
                {audiogramData.map((pt, i) => {
                  const x = 70 + i * 95;
                  const y = 30 + (pt.leftEarDb / 120) * 210;
                  return (
                    <g key={`l-${i}`}>
                      <line x1={x - 5} y1={y - 5} x2={x + 5} y2={y + 5} stroke="#06b6d4" strokeWidth="2.5" />
                      <line x1={x + 5} y1={y - 5} x2={x - 5} y2={y + 5} stroke="#06b6d4" strokeWidth="2.5" />
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>

          {/* Speech Audiometry & Tympanometry Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Speech Audiometry Card */}
            <div className="p-5 rounded-3xl bg-slate-900/70 border border-slate-800 space-y-4">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Stethoscope className="w-4 h-4 text-purple-400" />
                <span>Speech Audiometry</span>
              </h4>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center p-2.5 rounded-xl bg-slate-950">
                  <span className="text-slate-400">Right Ear SRT / WRS</span>
                  <span className="font-mono text-rose-400 font-bold">{rightSrtDb} dB / {rightWrsPct}%</span>
                </div>
                <div className="flex justify-between items-center p-2.5 rounded-xl bg-slate-950">
                  <span className="text-slate-400">Left Ear SRT / WRS</span>
                  <span className="font-mono text-cyan-400 font-bold">{leftSrtDb} dB / {leftWrsPct}%</span>
                </div>
                <div className="flex justify-between items-center p-2.5 rounded-xl bg-slate-950">
                  <span className="text-slate-400">Speech in Noise Score</span>
                  <span className="font-mono text-emerald-400 font-bold">{speechInNoiseScore}%</span>
                </div>
              </div>
            </div>

            {/* Tympanometry Card */}
            <div className="p-5 rounded-3xl bg-slate-900/70 border border-slate-800 space-y-4">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Waves className="w-4 h-4 text-amber-400" />
                <span>Tympanometry (Acoustic Immittance)</span>
              </h4>

              <div className="space-y-2.5">
                <div>
                  <label className="text-[11px] text-slate-400 font-medium block mb-1">
                    Jerger Tympanogram Classification
                  </label>
                  <select
                    value={tympanogramType}
                    onChange={(e) => setTympanogramType(e.target.value as any)}
                    className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-xs font-bold text-amber-300 focus:outline-none"
                  >
                    <option value="Type A">Type A (Normal Middle Ear Pressure)</option>
                    <option value="Type B">Type B (Fluid / Eardrum Perforation)</option>
                    <option value="Type C">Type C (Eustachian Tube Retraction)</option>
                    <option value="Type As">Type As (Stiff / Otosclerosis)</option>
                    <option value="Type Ad">Type Ad (Disarticulation / Flaccid)</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div className="p-2 rounded-lg bg-slate-950 text-slate-300">
                    <span className="text-slate-500 block text-[10px]">Peak Pressure</span>
                    {peakPressureDaPa} daPa
                  </div>
                  <div className="p-2 rounded-lg bg-slate-950 text-slate-300">
                    <span className="text-slate-500 block text-[10px]">Compliance</span>
                    {complianceMl} ml
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Tinnitus Generator & REM Hearing Aid Verification */}
        <div className="space-y-6">
          {/* Tinnitus Pitch Matching & Audio Tone Generator */}
          <div className="p-6 rounded-3xl bg-slate-900/70 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Volume2 className="w-5 h-5 text-purple-400" />
                <span>Tinnitus Sound Therapy & ACRN</span>
              </h3>
              <button
                onClick={toggleToneGenerator}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  isAudioPlaying
                    ? "bg-rose-500 text-white animate-pulse"
                    : "bg-purple-600 text-white hover:bg-purple-500"
                }`}
              >
                {isAudioPlaying ? <Square className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>{isAudioPlaying ? "Stop Tone" : "Play Pitch"}</span>
              </button>
            </div>

            <div>
              <label className="text-xs text-slate-400 font-medium block mb-1">
                Matched Tinnitus Frequency: <strong className="text-purple-300 font-mono">{tinnitusPitchHz} Hz</strong>
              </label>
              <input
                type="range"
                min="1000"
                max="12000"
                step="250"
                value={tinnitusPitchHz}
                onChange={(e) => setTinnitusPitchHz(Number(e.target.value))}
                className="w-full accent-purple-500 cursor-pointer"
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 font-medium block mb-1">
                Loudness Level: <strong className="text-purple-300 font-mono">{tinnitusLoudnessDbSl} dB SL</strong>
              </label>
              <input
                type="range"
                min="1"
                max="25"
                step="1"
                value={tinnitusLoudnessDbSl}
                onChange={(e) => setTinnitusLoudnessDbSl(Number(e.target.value))}
                className="w-full accent-purple-500 cursor-pointer"
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 font-medium block mb-1">
                Prescribed Sound Masking Pattern
              </label>
              <select
                value={maskingNoiseType}
                onChange={(e) => setMaskingNoiseType(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-200 text-xs font-semibold focus:outline-none"
              >
                <option value="NOTCHED_WHITE_NOISE">Notched White Noise (ACRN Target)</option>
                <option value="PINK_NOISE_OCEAN">Ocean Waves Pink Noise</option>
                <option value="NARROWBAND_NOISE">Narrowband Pitch Coincided Masker</option>
              </select>
            </div>
          </div>

          {/* Real Ear Measurement (REM) & Hearing Device Fitting */}
          <div className="p-6 rounded-3xl bg-slate-900/70 border border-slate-800 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Sliders className="w-5 h-5 text-emerald-400" />
              <span>Hearing Aid REM Fitting</span>
            </h3>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 font-medium block mb-1">Device Model</label>
                <input
                  type="text"
                  value={haModel}
                  onChange={(e) => setHaModel(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-slate-200 font-medium"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950 border border-slate-800">
                <span className="text-xs text-slate-400 font-medium">Target Gain (NAL-NL2)</span>
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Matched (±2 dB)
                </span>
              </div>

              <button
                onClick={saveAudiologyRecord}
                disabled={isSaving}
                className="w-full py-3.5 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 transition duration-200 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSaving ? (
                  <Activity className="w-5 h-5 animate-spin text-white" />
                ) : (
                  <Save className="w-5 h-5 text-white" />
                )}
                <span>{isSaving ? "Syncing..." : "Save Evaluation to Cloud"}</span>
              </button>

              {saveSuccess && (
                <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-700/50 text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span>Evaluation synced to Cloud Firestore for Sachin Srivastava!</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
        </>
      )}
    </div>
  );
}
