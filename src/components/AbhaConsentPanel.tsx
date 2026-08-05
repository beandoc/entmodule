'use client';

import React, { useState } from 'react';
import { ShieldCheck, Lock, AlertTriangle, FileText, CheckCircle2, Building2, UserCheck, KeyRound } from 'lucide-react';

interface AbhaConsentPanelProps {
  patientMrn?: string;
  initialAbhaNumber?: string;
}

export const AbhaConsentPanel: React.FC<AbhaConsentPanelProps> = ({
  patientMrn = 'MRN-ENT-2026-8842',
  initialAbhaNumber = '91-4821-9034-7712'
}) => {
  const [abhaNumber, setAbhaNumber] = useState(initialAbhaNumber);
  const [abhaAddress, setAbhaAddress] = useState('sachin.srivastava@abdm');
  const [selectedHospital, setSelectedHospital] = useState('Base Hospital, New Delhi');
  const [selectedDoctor, setSelectedDoctor] = useState('Dr. Vishal Gaurav (ENT Surgeon - HPR-IN-987654)');
  const [shareSymptomLogs, setShareSymptomLogs] = useState(true);
  const [sharePromScores, setSharePromScores] = useState(true);
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);
  const [consentSaved, setConsentSaved] = useState(false);

  const handleSaveConsent = () => {
    if (!disclaimerAccepted) {
      alert('Please review and accept the non-emergency OPD care assessment disclaimer before authorizing.');
      return;
    }
    setConsentSaved(true);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
        <div className="border-b border-slate-200 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              ABHA ID Digital Health Consent & HIS PROM Sharing
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Authorize your treating hospital doctor to access your logged Symptom Logs & Patient-Reported Outcome Measures (SNOT-22, THI, VHI-10) for better OPD care.
            </p>
          </div>
          <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 text-xs font-semibold px-2.5 py-1 rounded-full border border-emerald-200">
            <Lock className="w-3.5 h-3.5" /> ABDM Compliant (ABHA)
          </span>
        </div>

        {/* Mandatory Non-Emergency Disclaimer */}
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl space-y-2">
          <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
            CRITICAL DISCLAIMER: NON-EMERGENCY OPD CARE ASSESSMENT ONLY
          </div>
          <p className="text-xs text-amber-800 leading-relaxed">
            <strong>Important Notice for Patients:</strong> Sharing your daily symptom logs and outcome scores (PROMs) via ABHA is designed strictly to help your doctor assess your progress during <strong>routine OPD consultation visits</strong>. This digital log is <strong>NOT monitored for real-time emergency response</strong>. If you experience emergency symptoms (such as acute breathing distress, severe active bleeding, high fever, or severe chest pain), <strong>do NOT rely on this log</strong>—seek immediate emergency medical care or visit the nearest casualty department.
          </p>
        </div>

        {/* Step 1: ABHA ID & Hospital Linkage */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-5 rounded-xl border border-slate-200">
          <div className="space-y-3">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <KeyRound className="w-4 h-4 text-sky-600" />
              Ayushman Bharat Health Account (ABHA Number)
            </label>
            <input
              type="text"
              value={abhaNumber}
              onChange={(e) => setAbhaNumber(e.target.value)}
              placeholder="e.g. 14-digit ABHA Number (12-3456-7890-1234)"
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 font-mono text-slate-800"
            />
            <p className="text-[11px] text-slate-500">Linked Patient MRN: <strong className="text-slate-700">{patientMrn}</strong></p>
          </div>

          <div className="space-y-3">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-sky-600" />
              ABHA Address (PHR Handle)
            </label>
            <input
              type="text"
              value={abhaAddress}
              onChange={(e) => setAbhaAddress(e.target.value)}
              placeholder="e.g. name@abdm"
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 text-slate-800"
            />
            <p className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> ABDM Health Data Repository Connected
            </p>
          </div>
        </div>

        {/* Step 2: Hospital & Authorized Doctor Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-5 rounded-xl border border-slate-200">
          <div className="space-y-3">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-sky-600" />
              Authorized Hospital / HIS System
            </label>
            <select
              value={selectedHospital}
              onChange={(e) => setSelectedHospital(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 text-slate-800"
            >
              <option value="Command Hospital (SC), Pune">Command Hospital (SC), Pune (Integrated HIS)</option>
              <option value="Base Hospital, New Delhi">Base Hospital, New Delhi (Integrated HIS)</option>
            </select>
          </div>

          <div className="space-y-3">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-sky-600" />
              Authorized Doctor (HPR ID)
            </label>
            <select
              value={selectedDoctor}
              onChange={(e) => setSelectedDoctor(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 text-slate-800"
            >
              <option value="Dr. Vishal Gaurav (ENT Surgeon - HPR-IN-987654)">Dr. Vishal Gaurav (ENT Surgeon - HPR-IN-987654)</option>
              <option value="Prof. Dr. A. Sharma (Senior ENT Specialist - HPR-IN-987655)">Prof. Dr. A. Sharma (Senior ENT Specialist - HPR-IN-987655)</option>
              <option value="Dr. R. Verma (Otology Specialist - HPR-IN-554321)">Dr. R. Verma (Otology Specialist - HPR-IN-554321)</option>
            </select>
          </div>
        </div>

        {/* Step 3: Consent Scope Toggles */}
        <div className="space-y-4 bg-slate-50 p-5 rounded-xl border border-slate-200">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Sharing Data Permissions</h3>

          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={shareSymptomLogs}
                onChange={(e) => setShareSymptomLogs(e.target.checked)}
                className="w-4 h-4 text-sky-600 rounded border-slate-300 focus:ring-sky-500"
              />
              <div>
                <span className="text-xs font-bold text-slate-900">Share Daily ENT Symptom Logs</span>
                <p className="text-[11px] text-slate-500">Includes nasal blockage, ear pain, tinnitus volume, and voice fatigue ratings.</p>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={sharePromScores}
                onChange={(e) => setSharePromScores(e.target.checked)}
                className="w-4 h-4 text-sky-600 rounded border-slate-300 focus:ring-sky-500"
              />
              <div>
                <span className="text-xs font-bold text-slate-900">Share Patient-Reported Outcome Measures (PROMs)</span>
                <p className="text-[11px] text-slate-500">Includes SNOT-22 (Sinusitis), THI (Tinnitus Handicap), and VHI-10 (Voice Handicap) questionnaire scores.</p>
              </div>
            </label>
          </div>
        </div>

        {/* Step 4: Checkbox Consent & Sign Action */}
        <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 space-y-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={disclaimerAccepted}
              onChange={(e) => setDisclaimerAccepted(e.target.checked)}
              className="mt-0.5 w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
            />
            <span className="text-xs text-emerald-950 font-medium leading-relaxed">
              I authorize the hospital HIS and my assigned treating doctor to view my logged symptom logs and PROMs for routine OPD care assessment. I understand and acknowledge that this feature is <strong>NOT for emergency medical response</strong>.
            </span>
          </label>

          <button
            onClick={handleSaveConsent}
            className="w-full md:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2"
          >
            <FileText className="w-4 h-4" /> Authorize & Link ABHA Consent to HIS
          </button>
        </div>

        {/* Active Digital Consent Receipt */}
        {consentSaved && (
          <div className="bg-slate-900 text-white p-5 rounded-xl border-2 border-emerald-500 space-y-3 animate-fade-in shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-700 pb-3">
              <span className="text-xs font-bold text-emerald-400 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" /> ABHA Digital Health Authorization Certificate Active
              </span>
              <span className="text-[10px] text-slate-400 font-mono">ID: ABDM-CONSENT-2026-991A</span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 block uppercase">ABHA Number</span>
                <span className="font-mono text-emerald-300">{abhaNumber}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block uppercase">Hospital HIS</span>
                <span className="text-slate-200">{selectedHospital}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block uppercase">Authorized Doctor</span>
                <span className="text-slate-200">{selectedDoctor}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block uppercase">Validity</span>
                <span className="text-slate-200">1 Year (OPD Assessment)</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
