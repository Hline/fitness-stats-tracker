import React, { useState } from 'react';
import { Droplet, Plus, Minus, CheckCircle } from 'lucide-react';

interface HydrationWidgetProps {
  initialWaterMl?: number;
  onUpdateWater?: (newMl: number) => void;
}

export const HydrationWidget: React.FC<HydrationWidgetProps> = ({
  initialWaterMl = 0,
  onUpdateWater
}) => {
  const [waterMl, setWaterMl] = useState(initialWaterMl);
  const targetMl = 2000;

  React.useEffect(() => {
    setWaterMl(initialWaterMl);
  }, [initialWaterMl]);

  const changeWater = (delta: number) => {
    const next = Math.max(0, waterMl + delta);
    setWaterMl(next);
    if (onUpdateWater) onUpdateWater(next);
  };

  const percent = Math.min(100, Math.round((waterMl / targetMl) * 100));
  const glasses = (waterMl / 250).toFixed(1);

  return (
    <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-5 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Droplet className="w-4 h-4 text-cyan-400 fill-cyan-400/30" />
            <span>수분 섭취 트래커 (Hydration)</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">운동 중 충분한 수분 보충은 심박수 안정과 피로 회복을 돕습니다.</p>
        </div>

        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
          {percent}% 달성
        </span>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-5 bg-slate-800/40 p-4 rounded-xl border border-slate-700/60">
        {/* 잔 게이지 & 수치 */}
        <div className="flex items-center gap-4">
          <div className="relative w-14 h-20 bg-slate-900 rounded-b-2xl border-2 border-cyan-500/50 overflow-hidden flex items-end">
            <div
              className="w-full bg-gradient-to-t from-cyan-600 to-cyan-400 transition-all duration-500 rounded-b-xl"
              style={{ height: `${percent}%` }}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <Droplet className="w-5 h-5 text-white/70" />
            </div>
          </div>

          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-black text-cyan-400">{waterMl.toLocaleString()}</span>
              <span className="text-xs font-semibold text-slate-400">/ {targetMl.toLocaleString()} ml</span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              약 <strong className="text-slate-200">{glasses}잔</strong> 섭취 (1잔 250ml 기준)
            </p>
          </div>
        </div>

        {/* 증감 컨트롤러 */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => changeWater(-250)}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-100 border border-slate-700 transition-all"
            title="250ml 차감"
          >
            <Minus className="w-4 h-4" />
          </button>

          <button
            onClick={() => changeWater(250)}
            className="px-3 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-1 shadow-md transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            +1잔 (250ml)
          </button>

          <button
            onClick={() => changeWater(500)}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold text-xs border border-cyan-500/30 flex items-center gap-1 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            +텀블러 (500ml)
          </button>
        </div>
      </div>
    </div>
  );
};
