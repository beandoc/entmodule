'use client';

import React, { useState } from 'react';
import {
  ShieldCheck,
  Lock,
  AlertTriangle,
  FileText,
  CheckCircle2,
  Building2,
  UserCheck,
  KeyRound,
  Share2,
  Code2,
  Download,
  Send,
  Sparkles,
} from 'lucide-react';

interface AbhaConsentPanelProps {
  patientMrn?: string;
  initialAbhaNumber?: string;
}

export const AbhaConsentPanel: React.FC<AbhaConsentPanelProps> = ({
  patientMrn = 'MRN: 88491',
  initialAbhaNumber = '91-4821-9034-7712',
}) => {
  const [abhaNumber, setAbhaNumber] = useState(initialAbhaNumber);
  const [abhaAddress, setAbhaAddress] = useState('sachin.srivastava@abdm');
  const [selectedHospital, setSelectedHospital] = useState('Command Hospital (SC), Pune');
  const [selectedDoctor, setSelectedDoctor] = useState('Dr. Vishal Gaurav (ENT Surgeon - HPR-IN-987654)');
  const [shareSymptomLogs, setShareSymptomLogs] = useState(true);
  const [sharePromScores, setSharePromScores] = useState(true);
  const [shareAudiogram, setShareAudiogram] = useState(true);
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);
  const [consentSaved, setConsentSaved] = useState(false);

  // Sharing Record Modal & States
  const [targetPlatform, setTargetPlatform] = useState('ABDM National Health Locker (NDHM Gateway)');
  const [isSharing, setIsSharing] = useState(false);
  const [sharingReceipt, setSharingReceipt] = useState<any>(null);
  const [showFhirModal, setShowFhirModal] = useState(false);
  const [fhirData, setFhirData] = useState<any>(null);
  const [loadingFhir, setLoadingFhir] = useState(false);

  const handleSaveConsent = () => {
    if (!disclaimerAccepted) {
      alert('Please review and accept the non-emergency OPD care assessment disclaimer before authorizing.');
      return;
    }
    setConsentSaved(true);
  };

  const handleFetchFhirBundle = async () => {
    setLoadingFhir(true);
    setShowFhirModal(true);
    try {
      const res = await fetch('/api/fhir/patient-bundle?patientRefId=pt_101');
      const data = await res.json();
      if (data.success) {
        setFhirData(data.bundle);
      }
    } catch (e) {
      console.error('Error fetching FHIR Bundle:', e);
    } finally {
      setLoadingFhir(false);
    }
  };

  const handlePushRecordToPlatform = async () => {
    if (!consentSaved) {
      alert('Please save and authorize digital health consent first.');
      return;
    }
    setIsSharing(true);
    try {
      const res = await fetch('/api/consent/share-record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientRefId: 'pt_101',
          abhaNumber,
          targetPlatform,
          authorizedDoctor: selectedDoctor,
          consentedScopes: [
            shareSymptomLogs && 'Symptom Logs',
            sharePromScores && 'PROMs (SNOT-22/THI)',
            shareAudiogram && 'Pure Tone Audiometry Report (Mr Lokanath Sahoo)',
          ].filter(Boolean),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSharingReceipt(data.receipt);
      }
    } catch (e) {
      console.error('Error sharing record:', e);
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6 text-slate-800 dark:text-slate-100">
        {/* Header Banner */}
        <div className="border-b border-slate-200 dark:border-slate-800 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                ABDM & HL7 FHIR R4 COMPLIANT
              </span>
              <span className="text-xs font-mono text-slate-400">ISO 22621 & ABDM HIP/HIU</span>
            </div>
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2 mt-1">
              <ShieldCheck className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              ABHA Digital Health Consent & Interoperability Engine
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Authorize treating doctors and export HL7 FHIR R4 compliant bundles to external hospitals and ABDM health lockers under explicit patient consent.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleFetchFhirBundle}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 transition"
            >
              <Code2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>View FHIR R4 Bundle</span>
            </button>
          </div>
        </div>

        {/* Mandatory Non-Emergency Disclaimer */}
        <div className="bg-amber-50 dark:bg-amber-950/40 border-l-4 border-amber-500 p-4 rounded-r-xl space-y-2">
          <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 font-bold text-sm">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
            CRITICAL DISCLAIMER: NON-EMERGENCY OPD CARE ASSESSMENT ONLY
          </div>
          <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
            <strong>Important Notice for Patients:</strong> Sharing your daily symptom logs, audiological evaluations, and outcome scores (PROMs) via ABHA is designed strictly for routine OPD care. <strong>Do NOT rely on this for emergency response</strong>. Seek immediate casualty care for acute distress.
          </p>
        </div>

        {/* Step 1: ABHA ID & Hospital Linkage */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 dark:bg-slate-950 p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
          <div className="space-y-3">
            <label className="block text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
              <KeyRound className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              Ayushman Bharat Health Account (ABHA Number)
            </label>
            <input
              type="text"
              value={abhaNumber}
              onChange={(e) => setAbhaNumber(e.target.value)}
              placeholder="e.g. 14-digit ABHA Number (12-3456-7890-1234)"
              className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl font-mono focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
            <p className="text-[11px] text-slate-500">Linked Patient MRN: <strong className="text-slate-800 dark:text-slate-200">{patientMrn}</strong></p>
          </div>

          <div className="space-y-3">
            <label className="block text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
              <UserCheck className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              ABHA Address (PHR Handle)
            </label>
            <input
              type="text"
              value={abhaAddress}
              onChange={(e) => setAbhaAddress(e.target.value)}
              placeholder="e.g. name@abdm"
              className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> ABDM Health Data Repository Connected
            </p>
          </div>
        </div>

        {/* Step 2: Hospital & Authorized Doctor Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 dark:bg-slate-950 p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
          <div className="space-y-3">
            <label className="block text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
              <Building2 className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              Authorized Hospital / HIS System
            </label>
            <select
              value={selectedHospital}
              onChange={(e) => setSelectedHospital(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none"
            >
              <option value="Command Hospital (SC), Pune">Command Hospital (SC), Pune (Integrated HIS)</option>
              <option value="Base Hospital, New Delhi">Base Hospital, New Delhi (Integrated HIS)</option>
              <option value="AIIMS New Delhi ABDM Gateway">AIIMS New Delhi ABDM Gateway</option>
            </select>
          </div>

          <div className="space-y-3">
            <label className="block text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
              <UserCheck className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              Authorized Doctor (HPR ID)
            </label>
            <select
              value={selectedDoctor}
              onChange={(e) => setSelectedDoctor(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none"
            >
              <option value="Dr. Vishal Gaurav (ENT Surgeon - HPR-IN-987654)">Dr. Vishal Gaurav (ENT Surgeon - HPR-IN-987654)</option>
              <option value="Mr Lokanath Sahoo (Chief Audiologist - AUD-IN-88412)">Mr Lokanath Sahoo (Chief Audiologist - AUD-IN-88412)</option>
              <option value="Prof. Dr. A. Sharma (Senior ENT Specialist - HPR-IN-987655)">Prof. Dr. A. Sharma (Senior ENT Specialist - HPR-IN-987655)</option>
            </select>
          </div>
        </div>

        {/* Step 3: Consent Scope Toggles */}
        <div className="space-y-4 bg-slate-50 dark:bg-slate-950 p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">Sharing Data Scope Permissions</h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <label className="flex items-start gap-3 cursor-pointer p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
              <input
                type="checkbox"
                checked={shareSymptomLogs}
                onChange={(e) => setShareSymptomLogs(e.target.checked)}
                className="mt-1 w-4 h-4 text-sky-600 rounded border-slate-300 focus:ring-sky-500"
              />
              <div>
                <span className="text-xs font-bold text-slate-900 dark:text-white">ENT Symptom Logs</span>
                <p className="text-[11px] text-slate-500">Nasal blockage, ear pain, tinnitus ratings.</p>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
              <input
                type="checkbox"
                checked={sharePromScores}
                onChange={(e) => setSharePromScores(e.target.checked)}
                className="mt-1 w-4 h-4 text-sky-600 rounded border-slate-300 focus:ring-sky-500"
              />
              <div>
                <span className="text-xs font-bold text-slate-900 dark:text-white">PROMs Questionnaires</span>
                <p className="text-[11px] text-slate-500">SNOT-22, THI & VHI-10 scores.</p>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
              <input
                type="checkbox"
                checked={shareAudiogram}
                onChange={(e) => setShareAudiogram(e.target.checked)}
                className="mt-1 w-4 h-4 text-sky-600 rounded border-slate-300 focus:ring-sky-500"
              />
              <div>
                <span className="text-xs font-bold text-slate-900 dark:text-white">Audiometry & Sound Rx</span>
                <p className="text-[11px] text-slate-500">PTA threshold audiogram & sound therapy.</p>
              </div>
            </label>
          </div>
        </div>

        {/* Step 4: Checkbox Consent & Sign Action */}
        <div className="p-5 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl border border-emerald-200 dark:border-emerald-800/60 space-y-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={disclaimerAccepted}
              onChange={(e) => setDisclaimerAccepted(e.target.checked)}
              className="mt-0.5 w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
            />
            <span className="text-xs text-emerald-950 dark:text-emerald-200 font-medium leading-relaxed">
              I authorize the hospital HIS and my assigned treating doctor to view my logged symptom logs, audiological evaluations, and PROMs for routine OPD care. I acknowledge that this is <strong>NOT for emergency medical response</strong>.
            </span>
          </label>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleSaveConsent}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2"
            >
              <FileText className="w-4 h-4" /> Authorize & Link ABHA Digital Consent
            </button>
          </div>
        </div>

        {/* Active Digital Consent Receipt & Consented Record Sharing Tool */}
        {consentSaved && (
          <div className="space-y-4">
            <div className="bg-slate-900 text-white p-5 rounded-2xl border-2 border-emerald-500 space-y-3 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-700 pb-3">
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" /> ABHA Digital Health Consent Certificate Active
                </span>
                <span className="text-[10px] text-slate-400 font-mono">ID: ABDM-CONSENT-2026-991A</span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">ABHA Number</span>
                  <span className="font-mono text-emerald-300">{abhaNumber}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Hospital HIS</span>
                  <span className="text-slate-200">{selectedHospital}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Authorized Doctor</span>
                  <span className="text-slate-200">{selectedDoctor}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Validity</span>
                  <span className="text-slate-200">1 Year (OPD Care)</span>
                </div>
              </div>
            </div>

            {/* Consented Record Sharing Box */}
            <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-950 to-indigo-950 border border-blue-800/60 text-white space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm flex items-center gap-2">
                  <Share2 className="w-4 h-4 text-sky-400" />
                  <span>Push Consented Record to External Medical Platform</span>
                </h3>
                <span className="text-[10px] font-mono bg-sky-500/20 text-sky-300 px-2 py-0.5 rounded border border-sky-500/30">
                  HL7 MDM^T02 & FHIR R4 Bundle
                </span>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3">
                <select
                  value={targetPlatform}
                  onChange={(e) => setTargetPlatform(e.target.value)}
                  className="w-full sm:w-auto flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold text-white focus:outline-none"
                >
                  <option value="ABDM National Health Locker (NDHM Gateway)">ABDM National Health Locker (NDHM Gateway)</option>
                  <option value="Command Hospital (SC) Pune Integrated HIS">Command Hospital (SC) Pune Integrated HIS</option>
                  <option value="Apollo Hospitals EMR Platform">Apollo Hospitals EMR Platform</option>
                  <option value="AIIMS New Delhi ABDM HIP Node">AIIMS New Delhi ABDM HIP Node</option>
                </select>

                <button
                  onClick={handlePushRecordToPlatform}
                  disabled={isSharing}
                  className="w-full sm:w-auto px-5 py-2.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center justify-center gap-1.5 shrink-0 disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  <span>{isSharing ? 'Transmitting...' : 'Transmit FHIR Record'}</span>
                </button>
              </div>

              {sharingReceipt && (
                <div className="p-4 rounded-xl bg-slate-900 border border-sky-500/40 text-xs space-y-2 animate-fade-in">
                  <div className="flex items-center justify-between text-emerald-400 font-bold">
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" /> {sharingReceipt.status}
                    </span>
                    <span className="font-mono text-[10px] text-slate-400">{sharingReceipt.exchangeId}</span>
                  </div>
                  <p className="text-slate-300">
                    Record successfully transmitted to <strong>{sharingReceipt.targetPlatform}</strong>.
                  </p>
                  <div className="font-mono text-[10px] text-slate-400 bg-slate-950 p-2 rounded border border-slate-800 break-all">
                    SHA-256 Hash: {sharingReceipt.sha256VerificationHash}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* FHIR R4 Bundle Modal */}
      {showFhirModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
          <div className="relative w-full max-w-3xl max-h-[85vh] bg-slate-950 text-slate-100 rounded-2xl border border-slate-800 shadow-2xl flex flex-col overflow-hidden">
            <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Code2 className="w-5 h-5 text-sky-400" />
                <h3 className="font-bold text-sm text-white">
                  HL7 FHIR R4 Patient Bundle (ABDM Standard)
                </h3>
              </div>
              <button
                onClick={() => setShowFhirModal(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <div className="p-4 flex-1 overflow-y-auto font-mono text-xs text-sky-300 bg-slate-950">
              {loadingFhir ? (
                <div className="text-center py-12 text-slate-400">Loading FHIR R4 Specification Bundle...</div>
              ) : (
                <pre className="whitespace-pre-wrap">{JSON.stringify(fhirData, null, 2)}</pre>
              )}
            </div>

            <div className="p-4 bg-slate-900 border-t border-slate-800 flex justify-end gap-2">
              <button
                onClick={() => setShowFhirModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-bold text-white hover:bg-slate-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
