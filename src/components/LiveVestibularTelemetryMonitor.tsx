"use client";

import React from "react";
import { useVestibularSessionListener } from "@/lib/use-vestibular-session-listener";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Gauge,
  RotateCw,
  Smile,
} from "lucide-react";

interface LiveMonitorProps {
  sessionId: string;
  patientName?: string;
}

/**
 * Clinician-facing live view of one patient's rep-counter exercise document
 * (`vestibular_sessions` collection) — reads `VestibularSessionDocument` via
 * `useVestibularSessionListener`, the same shape `saveSession()`/
 * `syncSessionToBackend()` write from `AIVertigoRehabCoach`.
 */
export function LiveVestibularTelemetryMonitor({
  sessionId,
  patientName = "Patient",
}: LiveMonitorProps) {
  const { session, loading, error, isLive } = useVestibularSessionListener(sessionId);

  if (loading) {
    return (
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 text-slate-300 animate-pulse flex items-center justify-center space-x-3">
        <Activity className="w-5 h-5 text-indigo-400 animate-spin" />
        <span>Connecting to Firestore Live Telemetry Stream...</span>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="p-6 rounded-2xl bg-slate-900/80 border border-rose-900/50 text-rose-300 flex items-center space-x-3">
        <AlertTriangle className="w-6 h-6 text-rose-400 flex-shrink-0" />
        <div>
          <p className="font-semibold text-rose-200">Telemetry Stream Error</p>
          <p className="text-sm text-rose-400">{error || "No active session found."}</p>
        </div>
      </div>
    );
  }

  const { reps, targetReps, meanPeakAngle, meanPeakVelocity, qualityScore, dizzinessBefore, dizzinessAfter, mode } = session;
  const repsPct = targetReps > 0 ? Math.min(100, (reps / targetReps) * 100) : 0;

  return (
    <div className="w-full max-w-4xl p-6 rounded-3xl bg-slate-950 border border-slate-800 text-slate-100 shadow-2xl space-y-6">
      {/* Header Status Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center space-x-2">
            <h3 className="text-xl font-bold text-white tracking-tight">{session.exerciseTitle || session.exerciseId}</h3>
            {isLive && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5"></span>
                LIVE FIRESTORE STREAM
              </span>
            )}
          </div>
          <p className="text-sm text-slate-400">
            Monitoring: <span className="text-slate-200 font-medium">{patientName}</span> • ID:{" "}
            <span className="font-mono text-xs text-indigo-300">{sessionId.slice(0, 8)}...</span>
          </p>
        </div>

        <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-300 text-xs font-semibold uppercase tracking-wide">
          {mode === "coach" ? "Camera-tracked" : "Manual checklist"}
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Reps progress */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>REPETITIONS</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-white">{reps}</span>
            <span className="text-slate-400 text-sm font-medium">/ {targetReps} target</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
            <div className="h-full bg-emerald-500 transition-all duration-300" style={{ width: `${repsPct}%` }} />
          </div>
        </div>

        {/* Quality score */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>SESSION QUALITY</span>
            <Gauge className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-indigo-300">{qualityScore}</span>
            <span className="text-slate-400 text-sm font-medium">/ 100</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                qualityScore >= 70 ? "bg-emerald-500" : qualityScore >= 40 ? "bg-amber-500" : "bg-rose-500"
              }`}
              style={{ width: `${Math.min(100, qualityScore)}%` }}
            />
          </div>
        </div>

        {/* Dizziness before/after */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>DIZZINESS (VAS)</span>
            <Smile className="w-4 h-4 text-purple-400" />
          </div>
          <div className="flex items-baseline space-x-3">
            <span className="text-2xl font-extrabold text-slate-300">{dizzinessBefore}</span>
            <span className="text-slate-600 text-sm">→</span>
            <span className={`text-2xl font-extrabold ${dizzinessAfter < dizzinessBefore ? "text-emerald-300" : "text-slate-300"}`}>
              {dizzinessAfter}
            </span>
          </div>
          <p className="text-xs text-slate-400">before → after, 0–10 scale</p>
        </div>
      </div>

      {/* Range of motion / velocity achieved */}
      <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
          <span className="flex items-center space-x-1.5">
            <RotateCw className="w-4 h-4 text-indigo-400" />
            <span>RANGE OF MOTION ACHIEVED (CAMERA ESTIMATION)</span>
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 text-center">
          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
            <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Mean Peak Angle</p>
            <p className="text-xl font-bold text-slate-100 mt-1">{meanPeakAngle.toFixed(1)}°</p>
          </div>
          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
            <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Mean Peak Velocity</p>
            <p className="text-xl font-bold text-slate-100 mt-1">{meanPeakVelocity.toFixed(0)}°/s</p>
          </div>
        </div>
      </div>
    </div>
  );
}
