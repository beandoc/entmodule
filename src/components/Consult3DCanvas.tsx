'use client';

import React, { useState } from 'react';
import { Layers, Send, Check } from 'lucide-react';

interface Consult3DCanvasProps {
  selectedOrderId: string;
}

export const Consult3DCanvas: React.FC<Consult3DCanvasProps> = ({ selectedOrderId }) => {
  const [annotationNotes, setAnnotationNotes] = useState('Marked graft placement site on superior posterior ear canal wall.');
  const [annotationPushed, setAnnotationPushed] = useState(false);

  const handlePushAnnotation = async () => {
    if (!selectedOrderId) return;
    try {
      const res = await fetch('/api/catalogue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          educationOrderId: selectedOrderId,
          structureName: 'Temporal Bone 3D Canvas',
          annotationJson: { notes: annotationNotes, timestamp: new Date().toISOString() },
          createdById: 'HPR-IN-908122'
        })
      });
      const data = await res.json();
      if (data.success) {
        setAnnotationPushed(true);
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
        <div className="border-b border-slate-200 pb-3 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-5 h-5 text-teal-600" />
              Clinician Consult 3D Anatomy Canvas & Live Annotation
            </h2>
            <p className="text-xs text-slate-500">
              Annotate a 3D Temporal Bone / Larynx model during consultation and push it directly to the patient's mobile timeline.
            </p>
          </div>
          <span className="bg-teal-100 text-teal-800 text-xs font-bold px-2 py-1 rounded">
            OPD Consult Mode
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-950 rounded-xl p-6 text-white aspect-square flex flex-col justify-between relative border border-slate-800 shadow-inner">
            <div className="flex justify-between text-xs text-slate-400">
              <span>3D Temporal Bone & Middle Ear Anatomy</span>
              <span className="text-emerald-400 font-bold">Interactive Rotation (Static Default)</span>
            </div>

            <div className="text-center space-y-2">
              <div className="w-32 h-32 mx-auto rounded-full border-4 border-teal-400 border-dashed flex items-center justify-center text-teal-300 font-bold text-xs">
                3D Anatomy Model [Ear / Tympanum]
              </div>
              <div className="bg-amber-500/20 text-amber-300 text-[11px] p-2 rounded border border-amber-500/40">
                ✏ Annotation Point: Perforation site on posterior inferior quadrant marked.
              </div>
            </div>

            <div className="flex gap-2 text-xs">
              <button className="bg-teal-600 px-3 py-1.5 rounded font-bold">Draw Circle</button>
              <button className="bg-teal-600 px-3 py-1.5 rounded font-bold">Add Arrow</button>
              <button className="bg-slate-700 px-3 py-1.5 rounded">Reset Canvas</button>
            </div>
          </div>

          <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-4 text-xs">
            <h3 className="font-bold text-sm text-slate-900">Surgeon Clinical Annotation Notes</h3>

            <div>
              <label className="font-semibold block mb-1 text-slate-700">Patient Consultation Notes:</label>
              <textarea
                value={annotationNotes}
                onChange={(e) => setAnnotationNotes(e.target.value)}
                className="w-full border border-slate-300 rounded p-3 bg-white h-32 text-slate-800"
              />
            </div>

            {annotationPushed && (
              <div className="bg-emerald-100 text-emerald-900 p-3 rounded font-semibold border border-emerald-300 flex items-center gap-2">
                <Check className="w-4 h-4" /> Annotated 3D Anatomy view successfully pushed to Patient Timeline!
              </div>
            )}

            <button
              onClick={handlePushAnnotation}
              className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-2.5 rounded flex items-center justify-center gap-2 text-xs shadow"
            >
              <Send className="w-4 h-4" /> Push Annotated 3D View to Patient Timeline
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
