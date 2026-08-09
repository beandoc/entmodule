import React, { useState, useEffect, useRef } from 'react';
import { Sparkles } from 'lucide-react';
import { LiveData } from './GazeCanvasHelpers';
import { CalibrationPointSample } from '@/lib/gaze-tracking';

const CALIBRATION_POINTS = [
  { name: 'Center', x: 0.50, y: 0.50 },
  { name: 'Top-Left', x: 0.15, y: 0.15 },
  { name: 'Top-Right', x: 0.85, y: 0.15 },
  { name: 'Bottom-Left', x: 0.15, y: 0.85 },
  { name: 'Bottom-Right', x: 0.85, y: 0.85 },
];

export const Calibration5PointModal: React.FC<{
  hi: boolean;
  liveData: LiveData;
  onSave: (samples: CalibrationPointSample[]) => void;
  onClose: () => void;
}> = ({ hi, liveData, onSave, onClose }) => {
  const [step, setStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const samplesRef = useRef<CalibrationPointSample[]>([]);
  const currentAccumulatorRef = useRef<Array<{ x: number; y: number }>>([]);
  const liveDataRef = useRef(liveData);

  useEffect(() => {
    liveDataRef.current = liveData;
  }, [liveData]);

  const currentPoint = CALIBRATION_POINTS[step];

  useEffect(() => {
    currentAccumulatorRef.current = [];
    setProgress(0);

    const interval = setInterval(() => {
      const ld = liveDataRef.current;
      if (ld.hasIris && ld.rawOffsetX !== undefined && ld.rawOffsetY !== undefined) {
        currentAccumulatorRef.current.push({ x: ld.rawOffsetX, y: ld.rawOffsetY });
      }

      setProgress(prev => {
        const next = prev + 5;
        if (next >= 100) {
          clearInterval(interval);

          const accum = currentAccumulatorRef.current;
          const meanRawX = accum.length > 0 ? accum.reduce((s, v) => s + v.x, 0) / accum.length : (liveDataRef.current.rawOffsetX ?? 0);
          const meanRawY = accum.length > 0 ? accum.reduce((s, v) => s + v.y, 0) / accum.length : (liveDataRef.current.rawOffsetY ?? 0);

          samplesRef.current.push({
            target: { x: currentPoint.x, y: currentPoint.y },
            rawOffset: { x: meanRawX, y: meanRawY },
          });

          if (step < CALIBRATION_POINTS.length - 1) {
            setStep(s => s + 1);
          } else {
            onSave(samplesRef.current);
            onClose();
          }
          return 0;
        }
        return next;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [step, currentPoint, onSave, onClose]);

  return (
    <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-2xl flex flex-col justify-between p-6 sm:p-10 select-none">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-cyan-400" />
            {hi ? '5-बिंदु सटीक गेज़ कैलिब्रेशन' : '5-Point Precision Gaze Calibration'}
          </h2>
          <p className="text-xs text-slate-400">
            {hi ? 'बिंदु ' : 'Point '}{step + 1} / 5: <span className="text-cyan-300 font-bold">{currentPoint.name}</span>
          </p>
        </div>
        <button
          onClick={onClose}
          className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-slate-300"
        >
          {hi ? 'रद्द करें' : 'Cancel'}
        </button>
      </div>

      {/* Target Marker */}
      <div className="relative w-full h-full my-6 flex items-center justify-center">
        <div
          className="absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-2 transition-all duration-300"
          style={{
            left: `${currentPoint.x * 100}%`,
            top: `${currentPoint.y * 100}%`,
          }}
        >
          <div className="relative w-16 h-16 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border-2 border-cyan-400 animate-ping opacity-75" />
            <div className="w-12 h-12 rounded-full bg-cyan-500/30 border-2 border-cyan-300 flex items-center justify-center backdrop-blur-sm shadow-xl shadow-cyan-500/50">
              <div className="w-4 h-4 rounded-full bg-white shadow-inner" />
            </div>
          </div>
          <span className="text-[11px] font-bold text-cyan-200 bg-black/80 px-2 py-0.5 rounded-full border border-cyan-500/30 backdrop-blur-md">
            {Math.round(progress)}%
          </span>
        </div>
      </div>

      {/* Footer Instructions */}
      <div className="max-w-md mx-auto text-center space-y-3">
        <p className="text-sm font-semibold text-slate-200">
          {hi
            ? 'चमकते हुए नीले बिंदु पर नज़र टिकाए रखें।'
            : 'Keep your eyes steadily locked on the glowing target.'}
        </p>
        <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-teal-400 to-cyan-400 transition-all duration-100 rounded-full"
            style={{ width: `${((step * 100 + progress) / 500) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
};
