"use client";

import React from "react";
import { useVestibularSessionListener } from "@/lib/use-vestibular-session-listener";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  EyeOff,
  Volume2,
  ShieldAlert,
  Compass,
  RotateCw,
} from "lucide-react";

interface LiveMonitorProps {
  sessionId: string;
  patientName?: string;
}

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

  const { telemetry, safetyStatus, eyesClosedCompliancePercent, overallCompliancePercent } = session;

  return (
    <div className="w-full max-w-4xl p-6 rounded-3xl bg-slate-950 border border-slate-800 text-slate-100 shadow-2xl space-y-6">
      {/* Header Status Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center space-x-2">
            <h3 className="text-xl font-bold text-white tracking-tight">{session.exerciseTitle}</h3>
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

        {/* Safety Status Badge */}
        <div className="flex items-center space-x-2">
          {safetyStatus === "NORMAL" ? (
            <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-emerald-950/80 border border-emerald-700/50 text-emerald-300 text-xs font-semibold">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>STABILITY OPTIMAL</span>
            </div>
          ) : safetyStatus === "STABILITY_WARNING" ? (
            <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-amber-950/80 border border-amber-700/50 text-amber-300 text-xs font-semibold">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>HIGH SWAY DETECTED</span>
            </div>
          ) : (
            <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-rose-950/80 border border-rose-700/50 text-rose-300 text-xs font-semibold animate-bounce">
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              <span>SAFETY STOP TRIGGERED</span>
            </div>
          )}
        </div>
      </div>

      {/* Telemetry Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Postural Sway Gauge */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>MAX POSTURAL SWAY</span>
            <Compass className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-white">
              {telemetry?.maxLateralSwayCm?.toFixed(1) ?? 0.0}
            </span>
            <span className="text-slate-400 text-sm font-medium">cm lateral</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                (telemetry?.maxLateralSwayCm ?? 0) > 4
                  ? "bg-rose-500"
                  : (telemetry?.maxLateralSwayCm ?? 0) > 2.5
                  ? "bg-amber-500"
                  : "bg-indigo-500"
              }`}
              style={{
                width: `${Math.min(100, ((telemetry?.maxLateralSwayCm ?? 0) / 6) * 100)}%`,
              }}
            />
          </div>
        </div>

        {/* Eyes Closed Compliance (EAR) */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>EYES-CLOSED COMPLIANCE</span>
            <EyeOff className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-cyan-300">
              {eyesClosedCompliancePercent ?? 0}%
            </span>
            <span className="text-slate-400 text-sm font-medium">verified EAR</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
            <div
              className="h-full bg-cyan-400 transition-all duration-300"
              style={{ width: `${eyesClosedCompliancePercent ?? 0}%` }}
            />
          </div>
        </div>

        {/* Real-time Voice Guidance Cues Log */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>VOICE GUIDANCE CUES</span>
            <Volume2 className="w-4 h-4 text-purple-400" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-purple-300">
              {telemetry?.voiceCuesTriggeredCount ?? 0}
            </span>
            <span className="text-slate-400 text-sm font-medium">cues spoken</span>
          </div>
          <p className="text-xs text-slate-400">
            Audio mode: <span className="text-slate-200 font-medium">Neural Real-time TTS</span>
          </p>
        </div>
      </div>

      {/* 3D Head Orientation Angles (Roll, Pitch, Yaw) */}
      <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
          <span className="flex items-center space-x-1.5">
            <RotateCw className="w-4 h-4 text-indigo-400" />
            <span>3D HEAD POSE ORIENTATION (CAMERA ESTIMATION)</span>
          </span>
          <span className="text-slate-500 font-mono">6-DoF Matrix</span>
        </div>

        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
            <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Roll (Tilt)</p>
            <p className="text-xl font-bold text-slate-100 mt-1">
              {telemetry?.meanHeadRollDegrees?.toFixed(1) ?? "0.0"}°
            </p>
          </div>
          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
            <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Pitch (Nod)</p>
            <p className="text-xl font-bold text-slate-100 mt-1">
              {telemetry?.meanHeadPitchDegrees?.toFixed(1) ?? "0.0"}°
            </p>
          </div>
          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
            <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Yaw (Turn)</p>
            <p className="text-xl font-bold text-slate-100 mt-1">
              {telemetry?.meanHeadYawDegrees?.toFixed(1) ?? "0.0"}°
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
