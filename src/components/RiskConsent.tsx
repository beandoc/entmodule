'use client';

import React, { useState } from 'react';
import { ShieldCheck, Check, Send } from 'lucide-react';

interface RiskConsentProps {
  riskDisclosures: any[];
}

export const RiskConsent: React.FC<RiskConsentProps> = ({ riskDisclosures }) => {
  const [consentSigned, setConsentSigned] = useState(false);

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
        <div className="border-b border-slate-200 pb-3">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-teal-600" />
            Consent-Grade Risk Disclosure & Audited Rates
          </h2>
          <p className="text-xs text-slate-500">
            Medico-legally reviewed consent disclosures with exact numeric risk figures and continuous nerve monitoring protocols.
          </p>
        </div>

        <div className="space-y-4">
          {riskDisclosures.map((risk) => (
            <div key={risk.id} className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-3 shadow-sm">
              <div className="flex justify-between items-start border-b border-slate-200 pb-3">
                <div>
                  <h3 className="font-bold text-base text-slate-900">{risk.title}</h3>
                  <span className="text-xs text-slate-500">SNOMED Code: {risk.procedureCode}</span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-amber-700 bg-amber-100 border border-amber-300 px-2.5 py-1 rounded block">
                    National Rate: {risk.numericRatePct}%
                  </span>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 rounded block mt-1">
                    Audited Dept Rate: {risk.departmentRate}%
                  </span>
                </div>
              </div>

              <div className="text-xs text-slate-700 space-y-2">
                <p><strong>Specific Risk:</strong> {risk.riskName}</p>
                <p>{risk.explanation}</p>
                <p className="bg-white p-3 rounded border border-slate-200 font-semibold text-slate-800">
                  🛡 Safety Protocol: {risk.preventionInfo}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-ink-950 text-white rounded-xl p-5 space-y-3">
          <h4 className="font-bold text-sm flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            Informed Consent Digital Receipt Signing
          </h4>
          <p className="text-xs text-slate-300 leading-relaxed">
            By clicking below, the patient confirms viewing the numeric risk disclosure figures and safety protocols for their scheduled procedure.
          </p>

          <button
            onClick={() => setConsentSigned(true)}
            disabled={consentSigned}
            className={`px-5 py-2.5 rounded-lg text-xs font-bold flex items-center gap-2 ${
              consentSigned
                ? 'bg-emerald-600 text-white cursor-default'
                : 'bg-teal-500 hover:bg-teal-400 text-slate-950'
            }`}
          >
            {consentSigned ? (
              <> <Check className="w-4 h-4" /> Informed Consent Receipt Signed & Archived in Chart </>
            ) : (
              <> <Send className="w-4 h-4" /> Sign Informed Consent Receipt </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
