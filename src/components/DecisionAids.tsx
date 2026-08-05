'use client';

import React, { useState } from 'react';
import { Users } from 'lucide-react';

interface DecisionAidsProps {
  decisionAids: any[];
}

export const DecisionAids: React.FC<DecisionAidsProps> = ({ decisionAids }) => {
  const [sdmPreference, setSdmPreference] = useState<'ci' | 'ha' | null>(null);
  const [sdmSummarySaved, setSdmSummarySaved] = useState(false);

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
        <div className="border-b border-slate-200 pb-3">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-teal-600" />
            Shared Decision-Making Aids & 100-Person Icon Arrays
          </h2>
          <p className="text-xs text-slate-500">
            Structured option grids using 100-person visual diagrams to replace vague terms like "uncommon" with exact figures.
          </p>
        </div>

        {decisionAids.map((aid) => (
          <div key={aid.id} className="bg-slate-50 border border-slate-200 rounded-xl p-6 space-y-6">
            <div>
              <span className="text-xs font-bold text-teal-700 uppercase tracking-wider">Otology Option Grid</span>
              <h3 className="text-lg font-bold text-slate-900 mt-1">{aid.title}</h3>
              <p className="text-xs text-slate-600 mt-1">{aid.description}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Option A: Cochlear Implant */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4 shadow-sm">
                <div className="border-b border-slate-100 pb-3">
                  <h4 className="font-bold text-base text-slate-900">{aid.optionA}</h4>
                  <span className="text-xs text-teal-700 font-semibold">Surgical Implantation Pathway</span>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-semibold text-slate-800">
                    <span>Speech Understanding Benefit:</span>
                    <strong className="text-emerald-700">{aid.benefitRateA} out of 100 people</strong>
                  </div>
                  <div className="grid grid-cols-10 gap-1 bg-slate-100 p-3 rounded-lg">
                    {Array.from({ length: 100 }).map((_, i) => (
                      <div
                        key={i}
                        className={`w-3 h-3 rounded-full ${
                          i < aid.benefitRateA ? 'bg-emerald-600' : 'bg-slate-300'
                        }`}
                        title={i < aid.benefitRateA ? 'Speech benefit achieved' : 'No benefit'}
                      />
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => setSdmPreference('ci')}
                  className={`w-full py-2 rounded-lg text-xs font-bold border transition-colors ${
                    sdmPreference === 'ci'
                      ? 'bg-teal-600 text-white border-teal-600'
                      : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-teal-50'
                  }`}
                >
                  {sdmPreference === 'ci' ? '✓ Selected My Preferred Option' : 'Select Option A'}
                </button>
              </div>

              {/* Option B: Power Hearing Aid */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4 shadow-sm">
                <div className="border-b border-slate-100 pb-3">
                  <h4 className="font-bold text-base text-slate-900">{aid.optionB}</h4>
                  <span className="text-xs text-slate-500 font-semibold">Non-Surgical Trial Pathway</span>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-semibold text-slate-800">
                    <span>Speech Understanding Benefit:</span>
                    <strong className="text-amber-700">{aid.benefitRateB} out of 100 people</strong>
                  </div>
                  <div className="grid grid-cols-10 gap-1 bg-slate-100 p-3 rounded-lg">
                    {Array.from({ length: 100 }).map((_, i) => (
                      <div
                        key={i}
                        className={`w-3 h-3 rounded-full ${
                          i < aid.benefitRateB ? 'bg-amber-500' : 'bg-slate-300'
                        }`}
                        title={i < aid.benefitRateB ? 'Benefit achieved' : 'Limited benefit in profound loss'}
                      />
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => setSdmPreference('ha')}
                  className={`w-full py-2 rounded-lg text-xs font-bold border transition-colors ${
                    sdmPreference === 'ha'
                      ? 'bg-teal-600 text-white border-teal-600'
                      : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-teal-50'
                  }`}
                >
                  {sdmPreference === 'ha' ? '✓ Selected My Preferred Option' : 'Select Option B'}
                </button>
              </div>
            </div>

            {sdmPreference && (
              <div className="bg-emerald-50 border border-emerald-300 p-4 rounded-xl space-y-2 text-xs text-emerald-950">
                <div className="font-bold flex items-center justify-between text-sm">
                  <span>Patient Values Preference Summary</span>
                  <button
                    onClick={() => setSdmSummarySaved(true)}
                    className="bg-emerald-600 text-white px-3 py-1 rounded font-bold hover:bg-emerald-700"
                  >
                    {sdmSummarySaved ? '✓ Preference Saved to Consultation Note' : 'Save Summary for Surgeon'}
                  </button>
                </div>
                <p>
                  Selected Preference: <strong>{sdmPreference === 'ci' ? aid.optionA : aid.optionB}</strong>. This values summary will be automatically printed and attached to your OPD chart for your next consultation.
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
