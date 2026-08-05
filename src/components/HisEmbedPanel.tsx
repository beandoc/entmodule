'use client';

import React from 'react';
import { Stethoscope, Lock, Unlock } from 'lucide-react';

interface HisEmbedPanelProps {
  orders: any[];
  handleReleaseEmbargo: (id: string) => void;
}

export const HisEmbedPanel: React.FC<HisEmbedPanelProps> = ({ orders, handleReleaseEmbargo }) => {
  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
      <div className="border-b border-slate-200 pb-4 flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Stethoscope className="w-5 h-5 text-teal-600" />
            Clinician Prescribe Panel (i-Dhanwantari HIS Embed)
          </h2>
          <p className="text-xs text-slate-500">
            Embedded order entry component with auto-suggested pathways and sensitive disclosure gating controls.
          </p>
        </div>
        <span className="bg-teal-100 text-teal-800 text-xs font-bold px-2.5 py-1 rounded">
          Dr. Vishal Gaurav (Base Hospital ND / Command Hospital Pune) — HPR-IN-987654
        </span>
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-bold text-slate-900">Active Patient Care Plans & Embargo Status</h3>
        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-900">
              <tr>
                <th className="p-3">Patient MRN</th>
                <th className="p-3">Prescribed Pathway</th>
                <th className="p-3">Sensitive Disclosure State</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {orders.map((o) => (
                <tr key={o.id} className="hover:bg-slate-50">
                  <td className="p-3 font-semibold">{o.patientRef.mrn}</td>
                  <td className="p-3">{o.pathwayTemplate.title}</td>
                  <td className="p-3">
                    {o.disclosureState === 'embargoed' ? (
                      <span className="bg-amber-100 text-amber-800 border border-amber-300 px-2 py-0.5 rounded font-bold flex items-center gap-1 w-fit">
                        <Lock className="w-3 h-3 text-amber-600" /> EMBARGOED (Gated)
                      </span>
                    ) : (
                      <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded font-bold flex items-center gap-1 w-fit">
                        <Unlock className="w-3 h-3 text-emerald-600" /> RELEASED
                      </span>
                    )}
                  </td>
                  <td className="p-3">
                    {o.disclosureState === 'embargoed' ? (
                      <button
                        onClick={() => handleReleaseEmbargo(o.id)}
                        className="bg-teal-600 hover:bg-teal-700 text-white font-bold px-3 py-1.5 rounded flex items-center gap-1"
                      >
                        <Unlock className="w-3.5 h-3.5" /> Release Embargo
                      </button>
                    ) : (
                      <span className="text-slate-400 italic">Delivered to Portal</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
