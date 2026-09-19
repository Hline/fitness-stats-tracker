import React from 'react';
import { DailyStats } from '../../types/health';
import { Flame, Clock, Footprints } from 'lucide-react';

interface ActivityRingsWidgetProps {
  stats: DailyStats;
}

export const ActivityRingsWidget: React.FC<ActivityRingsWidgetProps> = ({ stats }) => {
  // 1. 칼로리 달성률 (목표: stats.calorieGoal 기본 600kcal)
  const calPercent = Math.min(100, Math.round((stats.activeCalories / stats.calorieGoal) * 100));

  // 2. 운동 시간 달성률 (목표 45분)
  const totalMinutes = stats.workouts.reduce((sum, w) => sum + (w.durationMinutes || 0), 0);
  const exerciseGoal = 45;
  const exercisePercent = Math.min(100, Math.round((totalMinutes / exerciseGoal) * 100));

  // 3. 걸음수 달성률 (목표: stats.stepGoal 기본 10,000보)
  const stepPercent = Math.min(100, Math.round((stats.totalSteps / stats.stepGoal) * 100));

  // SVG 원주 계산
  const size = 180;
  const strokeWidth = 14;

  const getRingParams = (radius: number, percent: number) => {
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (percent / 100) * circumference;
    return { circumference, strokeDashoffset };
  };

  const calRing = getRingParams(70, calPercent);
  const exRing = getRingParams(52, exercisePercent);
  const stepRing = getRingParams(34, stepPercent);

  return (
    <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-5 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <span>오늘의 활동 링 (Activity Rings)</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
              3-Ring System
            </span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">칼로리, 운동 시간, 걸음 수 3대 목표 종합 달성도</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-around gap-6">
        {/* SVG 동심원 3단 링 */}
        <div className="relative w-[180px] h-[180px] flex-shrink-0">
          <svg width={size} height={size} className="transform -rotate-90">
            {/* 1. 칼로리 링 (빨강) */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r="70"
              stroke="#4c0519"
              strokeWidth={strokeWidth}
              fill="none"
            />
            <circle
              cx={size / 2}
              cy={size / 2}
              r="70"
              stroke="#f43f5e"
              strokeWidth={strokeWidth}
              strokeDasharray={calRing.circumference}
              strokeDashoffset={calRing.strokeDashoffset}
              strokeLinecap="round"
              fill="none"
              className="transition-all duration-1000 ease-out"
            />

            {/* 2. 운동시간 링 (초록) */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r="52"
              stroke="#064e3b"
              strokeWidth={strokeWidth}
              fill="none"
            />
            <circle
              cx={size / 2}
              cy={size / 2}
              r="52"
              stroke="#10b981"
              strokeWidth={strokeWidth}
              strokeDasharray={exRing.circumference}
              strokeDashoffset={exRing.strokeDashoffset}
              strokeLinecap="round"
              fill="none"
              className="transition-all duration-1000 ease-out"
            />

            {/* 3. 걸음수 링 (파랑) */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r="34"
              stroke="#083344"
              strokeWidth={strokeWidth}
              fill="none"
            />
            <circle
              cx={size / 2}
              cy={size / 2}
              r="34"
              stroke="#06b6d4"
              strokeWidth={strokeWidth}
              strokeDasharray={stepRing.circumference}
              strokeDashoffset={stepRing.strokeDashoffset}
              strokeLinecap="round"
              fill="none"
              className="transition-all duration-1000 ease-out"
            />
          </svg>

          {/* 중앙 달성 뱃지 */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-xl font-black text-slate-100">
              {Math.round((calPercent + exercisePercent + stepPercent) / 3)}%
            </span>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">평균 달성</span>
          </div>
        </div>

        {/* 우측 3대 링 상세 지표 리스트 */}
        <div className="flex-1 w-full space-y-3">
          {/* 활동 칼로리 */}
          <div className="p-2.5 rounded-xl bg-slate-800/50 border border-slate-700/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-rose-500" />
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 text-rose-400" />
                활동 칼로리
              </span>
            </div>
            <div className="text-right">
              <span className="text-xs font-bold text-rose-400">{stats.activeCalories}</span>
              <span className="text-[11px] text-slate-400"> / {stats.calorieGoal} kcal ({calPercent}%)</span>
            </div>
          </div>

          {/* 운동 시간 */}
          <div className="p-2.5 rounded-xl bg-slate-800/50 border border-slate-700/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-400" />
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-emerald-400" />
                운동 시간
              </span>
            </div>
            <div className="text-right">
              <span className="text-xs font-bold text-emerald-400">{totalMinutes}</span>
              <span className="text-[11px] text-slate-400"> / {exerciseGoal} 분 ({exercisePercent}%)</span>
            </div>
          </div>

          {/* 걸음 수 */}
          <div className="p-2.5 rounded-xl bg-slate-800/50 border border-slate-700/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-cyan-400" />
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1">
                <Footprints className="w-3.5 h-3.5 text-cyan-400" />
                오늘 걸음
              </span>
            </div>
            <div className="text-right">
              <span className="text-xs font-bold text-cyan-400">{stats.totalSteps.toLocaleString()}</span>
              <span className="text-[11px] text-slate-400"> / {stats.stepGoal.toLocaleString()} 보 ({stepPercent}%)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
