"use client";

import React, { useState } from "react";
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
} from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

interface AudiogramPoint {
  freq: number; // Hz
  rightEarDb: number; // dB HL
  leftEarDb: number; // dB HL
}

const DEFAULT_FREQUENCIES = [250, 500, 1000, 2000, 4000, 8000];

export function AudiologistWorkspace() {
  const [selectedPatientId, setSelectedPatientId] = useState("pt_102");
  const [patientName, setPatientName] = useState("Vikram Malhotra");
  const [audiogramData, setAudiogramData] = useState<AudiogramPoint[]>([
    { freq: 250, rightEarDb: 15, leftEarDb: 20 },
    { freq: 500, rightEarDb: 20, leftEarDb: 25 },
    { freq: 1000, rightEarDb: 25, leftEarDb: 35 },
    { freq: 2000, rightEarDb: 40, leftEarDb: 45 },
    { freq: 4000, rightEarDb: 55, leftEarDb: 60 },
    { freq: 8000, rightEarDb: 65, leftEarDb: 70 },
  ]);

  const [tinnitusPitchHz, setTinnitusPitchHz] = useState(4000);
  const [maskingNoiseType, setMaskingNoiseType] = useState("NOTCHED_WHITE_NOISE");
  const [speechInNoiseScore, setSpeechInNoiseScore] = useState(72);
  const [fittingStatus, setFittingStatus] = useState("OPTIMAL");
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Calculate Pure Tone Average (PTA) for 500, 1k, 2k Hz
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

  const saveAudiologyRecord = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      await addDoc(collection(db, "audiology_evaluations"), {
        patientId: selectedPatientId,
        patientName,
        audiogramData,
        rightPta,
        leftPta,
        tinnitusPitchHz,
        maskingNoiseType,
        speechInNoiseScore,
        fittingStatus,
        timestamp: serverTimestamp(),
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err) {
      console.error("Error saving audiology evaluation to Firestore:", err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-6 md:p-8 space-y-8 bg-slate-950 text-slate-100 min-h-screen">
      {/* Header & Role Navigation */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center space-x-3">
            <div className="p-3 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 text-indigo-400">
              <Ear className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
                Audiology & Tinnitus Clinical Suite
              </h1>
              <p className="text-sm text-slate-400 mt-0.5">
                Multi-Role Platform • Audiologist Portal & Pure Tone Audiometry Workspace
              </p>
            </div>
          </div>
        </div>

        {/* Patient Selection Dropdown */}
        <div className="flex items-center space-x-3 bg-slate-900/80 p-2.5 rounded-2xl border border-slate-800">
          <UserCheck className="w-5 h-5 text-indigo-400" />
          <div className="text-xs">
            <p className="text-slate-400 font-medium">Select Patient</p>
            <select
              value={selectedPatientId}
              onChange={(e) => {
                setSelectedPatientId(e.target.value);
                setPatientName(e.target.value === "pt_102" ? "Vikram Malhotra" : "Ananya Sharma");
              }}
              aria-label="Select Patient"
              className="bg-transparent text-white font-bold text-sm focus:outline-none cursor-pointer"
            >
              <option value="pt_102" className="bg-slate-900">Vikram Malhotra (MRN: 88491)</option>
              <option value="pt_105" className="bg-slate-900">Ananya Sharma (MRN: 74920)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Grid Layout: Audiogram Plotter & Pure Tone Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Interactive Audiogram Table & Threshold Adjuster */}
        <div className="lg:col-span-2 p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center space-x-2">
              <Activity className="w-5 h-5 text-indigo-400" />
              <span>Pure Tone Audiometry (PTA) Thresholds (dB HL)</span>
            </h2>
            <span className="text-xs text-slate-400 font-mono">Air Conduction (AC)</span>
          </div>

          {/* Interactive Threshold Grid */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300 border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-xs text-slate-400 uppercase">
                  <th className="py-3 px-4">Frequency (Hz)</th>
                  <th className="py-3 px-4 text-rose-400">Right Ear (O) dB</th>
                  <th className="py-3 px-4 text-cyan-400">Left Ear (X) dB</th>
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* PTA Summaries */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-800">
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
              <p className="text-xs text-rose-400 font-bold uppercase tracking-wide">Right Ear PTA (500-2k Hz)</p>
              <div className="flex items-baseline space-x-2 mt-1">
                <span className="text-2xl font-extrabold text-white">{rightPta} dB HL</span>
              </div>
              <p className={`text-xs font-semibold mt-1 ${getSeverityLabel(rightPta).color}`}>
                {getSeverityLabel(rightPta).label}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
              <p className="text-xs text-cyan-400 font-bold uppercase tracking-wide">Left Ear PTA (500-2k Hz)</p>
              <div className="flex items-baseline space-x-2 mt-1">
                <span className="text-2xl font-extrabold text-white">{leftPta} dB HL</span>
              </div>
              <p className={`text-xs font-semibold mt-1 ${getSeverityLabel(leftPta).color}`}>
                {getSeverityLabel(leftPta).label}
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Tinnitus Sound Therapy & Fitting Parameters */}
        <div className="space-y-6">
          {/* Tinnitus Masking Therapy Setup */}
          <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <Volume2 className="w-5 h-5 text-purple-400" />
              <span>Tinnitus Masking Rx</span>
            </h3>

            <div>
              <label className="text-xs text-slate-400 font-medium block mb-1.5">
                Matched Tinnitus Pitch (Hz)
              </label>
              <div className="flex items-center space-x-3">
                <input
                  type="range"
                  min="1000"
                  max="12000"
                  step="250"
                  value={tinnitusPitchHz}
                  onChange={(e) => setTinnitusPitchHz(Number(e.target.value))}
                  aria-label="Matched Tinnitus Pitch Frequency in Hertz"
                  className="w-full accent-purple-500 cursor-pointer"
                />
                <span className="font-mono text-sm text-purple-300 font-bold w-16">{tinnitusPitchHz} Hz</span>
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-400 font-medium block mb-1.5">
                Sound Masking Signal Type
              </label>
              <select
                value={maskingNoiseType}
                onChange={(e) => setMaskingNoiseType(e.target.value)}
                aria-label="Sound Masking Signal Type"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-200 text-sm font-semibold focus:outline-none"
              >
                <option value="NOTCHED_WHITE_NOISE">Notched White Noise (Pitch Coincided)</option>
                <option value="PINK_NOISE_OCEAN">Ocean Wave Pink Noise</option>
                <option value="NARROWBAND_NOISE">Narrowband Pitch Masker</option>
              </select>
            </div>
          </div>

          {/* Hearing Aid / Cochlear Fitting Metrics */}
          <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <Sliders className="w-5 h-5 text-emerald-400" />
              <span>Speech-in-Noise & Fitting Score</span>
            </h3>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/80 border border-slate-800">
              <span className="text-xs text-slate-400 font-medium">Speech Discrimination (SIN)</span>
              <span className="font-mono text-lg font-bold text-emerald-400">{speechInNoiseScore}%</span>
            </div>

            <button
              onClick={saveAudiologyRecord}
              disabled={isSaving}
              className="w-full py-3.5 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 transition duration-200 flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              {isSaving ? (
                <Activity className="w-5 h-5 animate-spin text-white" />
              ) : (
                <Save className="w-5 h-5 text-white" />
              )}
              <span>{isSaving ? "Saving to Firestore..." : "Save Audiology Evaluation"}</span>
            </button>

            {saveSuccess && (
              <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-700/50 text-emerald-300 text-xs font-semibold flex items-center space-x-2 animate-fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>Evaluation successfully synced to Cloud Firestore!</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
