'use client';

import React from 'react';
import { Award } from 'lucide-react';

interface IndiaSchemesProps {
  entitlements: any[];
}

export const IndiaSchemes: React.FC<IndiaSchemesProps> = ({ entitlements }) => {
  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
        <div className="border-b border-slate-200 pb-3">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Award className="w-5 h-5 text-teal-600" />
            India Schemes & Entitlement Navigator
          </h2>
          <p className="text-xs text-slate-500">
            Ayushman Bharat (PM-JAY), ADIP Assistance Scheme, and UDID Disability Certification guidance.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {entitlements.map((ent) => (
            <div key={ent.id} className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-3 shadow-sm flex flex-col justify-between">
              <div className="space-y-2">
                <span className="bg-teal-100 text-teal-800 text-[10px] font-bold px-2 py-0.5 rounded border border-teal-300">
                  {ent.schemeCode}
                </span>
                <h3 className="font-bold text-sm text-slate-900">{ent.title}</h3>
                <div className="text-xs text-slate-700 space-y-1">
                  <p><strong>Eligibility:</strong> {ent.eligibility}</p>
                  <p><strong>Coverage:</strong> {ent.coverage}</p>
                </div>
              </div>

              <div className="bg-white p-3 rounded-lg border border-slate-200 text-xs space-y-1">
                <strong className="text-slate-900 block font-bold">Required Documents:</strong>
                <ul className="list-disc pl-4 text-slate-600 space-y-0.5 text-[11px]">
                  {JSON.parse(ent.documents).map((doc: string, idx: number) => (
                    <li key={idx}>{doc}</li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
