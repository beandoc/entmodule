'use client';

import React from 'react';
import { ShieldAlert, Printer } from 'lucide-react';

interface StomaEmergencyCardProps {
  stomaCards: any[];
}

export const StomaEmergencyCard: React.FC<StomaEmergencyCardProps> = ({ stomaCards }) => {
  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
        <div className="border-b border-slate-200 pb-3">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-red-600" />
            Emergency Stoma & Neck Breather Wallet Card
          </h2>
          <p className="text-xs text-slate-500">
            Printable & mobile-viewable wallet card for Tracheostomy and Laryngectomy patients.
          </p>
        </div>

        {stomaCards.map((card) => (
          <div key={card.id} className="max-w-md mx-auto bg-red-900 text-white rounded-xl p-6 border-4 border-amber-400 shadow-2xl space-y-4">
            <div className="bg-amber-400 text-slate-950 text-center font-extrabold text-sm py-1.5 rounded uppercase tracking-wider">
              {card.headlineText}
            </div>

            <div className="space-y-2 text-xs">
              <div><strong>PATIENT NAME:</strong> {card.patientName} (MRN: {card.patientMrn})</div>
              <div className="bg-red-950 p-3 rounded border border-red-700 leading-relaxed font-medium">
                {card.instructions}
              </div>
              <div className="text-center font-bold text-amber-300">
                EMERGENCY HOTLINE: {card.emergencyPhone}
              </div>
            </div>

            <button
              onClick={() => window.print()}
              className="w-full bg-white text-red-900 font-bold py-2 rounded text-xs flex items-center justify-center gap-2 shadow"
            >
              <Printer className="w-4 h-4" /> Print / Save Wallet Card PDF
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
