import React from 'react';
import { DailyStats } from '../../types/health';
import { Heart, Activity, Zap } from 'lucide-react';

interface CardioZoneWidgetProps {
  stats: DailyStats;
}

export const CardioZoneWidget: React.FC<CardioZoneWidgetProps> = ({ stats }) => {
  // 총 운동 시간
  const totalWorkoutMinutes = stats.workouts.reduce((sum, w) => sum + (w.durationMinutes || 0), 0);

  // 심박존 체류 시간 분석 (미측정 시 N/A 처리)
  const hasData = stats.peakHeartRate > 0 || totalWorkoutMinutes > 0;
  const maxHr = stats.peakHeartRate;
  
  // 피크 심박수에 따라 고강도 비중 차등 계산
  const isHighIntensity = maxHr >= 170;
  
  const zoneDistribution = [
    { zone: 5, name: 'Zone 5 (무산소 피크)', percent: !hasData ? 0 : (isHighIntensity ? 15 : 5), color: 'bg-rose-500', text: 'text-rose-400' },
    { zone: 4, name: 'Zone 4 (고강도 심폐)', percent: !hasData ? 0 : (isHighIntensity ? 35 : 20), color: 'bg-orange-500', text: 'text-orange-400' },
    { zone: 3, name: 'Zone 3 (유산소)', percent: !hasData ? 0 : 30, color: 'bg-amber-500', text: 'text-amber-400' },
    { zone: 2, name: 'Zone 2 (지방 연소)', percent: !hasData ? 0 : (isHighIntensity ? 15 : 25), color: 'bg-emerald-500', text: 'text-emerald-400' },
    { zone: 1, name: 'Zone 1 (워밍/회복)', percent: !hasData ? 0 : (isHighIntensity ? 5 : 20), color: 'bg-cyan-500', text: 'text-cyan-400' }
  ];

  return (
    <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-5 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Activity className="w-4 h-4 text-orange-400" />
            <span>심박존(Cardio Zone) 체류 시간 분석</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            {stats.peakHeartRate > 0 ? (
              <>운동 중 최고 심박수 <strong className="text-rose-400">{stats.peakHeartRate} BPM</strong> 도달 기반 강도 분석</>
            ) : (
              <span className="text-slate-500">운동 중 심박수 미측정 (N/A)</span>
            )}
          </p>
        </div>

        <div className="text-right">
          <span className="text-xs font-bold text-slate-200">
            {totalWorkoutMinutes > 0 ? `총 운동 ${totalWorkoutMinutes}분` : '총 운동: N/A'}
          </span>
        </div>
      </div>

      {/* 스택 바 차트 */}
      <div className="w-full h-4 bg-slate-800 rounded-full overflow-hidden flex mb-4 shadow-inner">
        {zoneDistribution.map((item) => (
          <div
            key={item.zone}
            className={`${item.color} h-full transition-all duration-700 ease-out`}
            style={{ width: `${item.percent}%` }}
            title={`${item.name}: ${item.percent}%`}
          />
        ))}
      </div>

      {/* 존별 리스트 */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {zoneDistribution.map((item) => {
          const minutes = Math.round((totalWorkoutMinutes * item.percent) / 100);
          return (
            <div key={item.zone} className="bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/60 text-center">
              <div className="flex items-center justify-center gap-1 text-[11px] font-semibold text-slate-400">
                <span className={`w-2 h-2 rounded-full ${item.color}`} />
                <span>Zone {item.zone}</span>
              </div>
              <div className={`text-sm font-black ${item.text} mt-1`}>
                {hasData ? `${minutes}분` : 'N/A'}
              </div>
              <div className="text-[10px] text-slate-500">
                {hasData ? `(${item.percent}%)` : '-'}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
