import React from 'react';
import { DailyStats } from '../types/health';
import { getHeartRateZone } from '../services/statsCalculator';
import { 
  Flame, 
  Footprints, 
  Heart, 
  Dumbbell, 
  TrendingUp, 
  CheckCircle2, 
  AlertCircle,
  Zap,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface DailyOverviewProps {
  stats: DailyStats;
  onOpenWorkoutModal: () => void;
}

const FOLD_STORAGE_KEY = 'fitstats_core_metrics_folded_v1';

export const DailyOverview: React.FC<DailyOverviewProps> = ({ stats, onOpenWorkoutModal }) => {
  // 1일 4대 핵심 지표 폴딩(접기/펼치기) 상태 관리
  const [isFolded, setIsFolded] = React.useState<boolean>(() => {
    try {
      return localStorage.getItem(FOLD_STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const toggleFold = () => {
    setIsFolded(prev => {
      const next = !prev;
      try {
        localStorage.setItem(FOLD_STORAGE_KEY, String(next));
      } catch (e) {
        console.warn('폴딩 상태 로컬 저장 실패:', e);
      }
      return next;
    });
  };

  // 걸음 수 달성률
  const stepPercent = Math.min(100, Math.round((stats.totalSteps / stats.stepGoal) * 100));
  // 칼로리 달성률
  const calPercent = Math.min(100, Math.round((stats.activeCalories / stats.calorieGoal) * 100));

  // 최고 심박수 존 분석
  const hrZone = getHeartRateZone(stats.peakHeartRate);

  return (
    <div className="space-y-5">
      {/* 1. 상단 안내 & 오늘의 성취 배너 (DAILY PERFORMANCE SUMMARY 메인 타이틀) */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-700/60 p-5 shadow-xl">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                DAILY PERFORMANCE SUMMARY
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-100 flex items-center gap-2">
              오늘의 운동 통계
              {stats.workoutCount > 0 ? (
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  오운완 달성! ({stats.workoutCount}회)
                </span>
              ) : (
                <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                  휴식 또는 운동 대기 중
                </span>
              )}
            </h2>
          </div>

          <button
            onClick={onOpenWorkoutModal}
            className="text-xs font-semibold px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-500/30 hover:border-emerald-500/60 transition-all flex items-center gap-1.5 shadow-sm"
          >
            <Zap className="w-3.5 h-3.5" />
            세션 기록하기
          </button>
        </div>
      </div>

      {/* 2. 분리된 "1일 4대 핵심 지표" 섹션 (폴딩 기능 탑재) */}
      <div className="space-y-3">
        {/* 서브헤더 및 폴딩(접기/펼치기) 컨트롤 바 */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-4 bg-emerald-400 rounded-full" />
            <h3 className="text-sm sm:text-base font-bold text-slate-200 flex items-center gap-2">
              1일 4대 핵심 지표
              <span className="text-xs font-normal text-slate-400 hidden sm:inline">
                (운동 · 걸음 · 칼로리 · 최고 심박수)
              </span>
            </h3>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 border border-slate-700/60">
              {isFolded ? '접힘' : '펼침'}
            </span>
          </div>

          <button
            onClick={toggleFold}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-emerald-400 border border-slate-700/80 hover:border-emerald-500/30 transition-all cursor-pointer shadow-sm active:scale-95"
            aria-expanded={!isFolded}
            aria-label={isFolded ? '1일 4대 핵심 지표 펼치기' : '1일 4대 핵심 지표 접기'}
          >
            {isFolded ? (
              <>
                <span>지표 펼치기</span>
                <ChevronDown className="w-4 h-4 text-emerald-400 transition-transform duration-200" />
              </>
            ) : (
              <>
                <span>지표 접기</span>
                <ChevronUp className="w-4 h-4 text-slate-400 transition-transform duration-200" />
              </>
            )}
          </button>
        </div>

        {/* 폴딩 접힘 상태일 때 표시되는 1줄 요약 바 (클릭 시 펼치기 가능) */}
        {isFolded && (
          <div
            onClick={toggleFold}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') toggleFold(); }}
            className="group cursor-pointer rounded-xl bg-slate-900/80 hover:bg-slate-900 border border-slate-800/80 hover:border-emerald-500/40 p-3.5 transition-all shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
          >
            <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-slate-300">
              <span className="flex items-center gap-1.5">
                <Dumbbell className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-slate-400">운동</span>
                <strong className="text-slate-100 font-bold">{stats.workoutCount}회</strong>
              </span>
              <span className="text-slate-700 hidden sm:inline">|</span>
              <span className="flex items-center gap-1.5">
                <Footprints className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-slate-400">걸음</span>
                <strong className="text-slate-100 font-bold">{stats.totalSteps.toLocaleString()}보</strong>
                <span className="text-[10px] text-cyan-400/90 font-medium">({stepPercent}%)</span>
              </span>
              <span className="text-slate-700 hidden sm:inline">|</span>
              <span className="flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-orange-400" />
                <span className="text-slate-400">활동</span>
                <strong className="text-slate-100 font-bold">{stats.activeCalories.toLocaleString()} kcal</strong>
              </span>
              <span className="text-slate-700 hidden sm:inline">|</span>
              <span className="flex items-center gap-1.5">
                <Heart className="w-3.5 h-3.5 text-rose-400" />
                <span className="text-slate-400">최고 심박</span>
                <strong className="text-slate-100 font-bold">{stats.peakHeartRate > 0 ? `${stats.peakHeartRate} BPM` : '0 BPM (미측정)'}</strong>
              </span>
            </div>

            <div className="flex items-center gap-1 text-[11px] font-medium text-slate-400 group-hover:text-emerald-400 transition-colors self-end sm:self-auto">
              <span>카드 펼치기</span>
              <ChevronDown className="w-3.5 h-3.5 group-hover:translate-y-0.5 transition-transform" />
            </div>
          </div>
        )}

        {/* 펼침 상태일 때: 4대 핵심 지표 카드 그리드 */}
        {!isFolded && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* 1. 1일 운동 횟수 카드 */}
        <div className="relative overflow-hidden rounded-2xl bg-slate-900/90 border border-slate-800 p-5 shadow-lg transition-all hover:border-emerald-500/40 hover:shadow-emerald-500/10 group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold tracking-wider text-slate-400 uppercase flex items-center gap-1.5">
              <Dumbbell className="w-4 h-4 text-emerald-400" />
              1일 운동 횟수
            </span>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              세션 합산
            </span>
          </div>

          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-4xl font-black text-slate-100 tracking-tight">
              {stats.workoutCount}
            </span>
            <span className="text-sm font-semibold text-slate-400">회 완료</span>
          </div>

          {/* 진행 상태 및 설명 */}
          <div className="mt-4 pt-3 border-t border-slate-800/80 text-xs text-slate-400 flex items-center justify-between">
            <span>목표 1회 이상</span>
            <span className={`font-semibold ${stats.workoutCount >= 1 ? 'text-emerald-400' : 'text-slate-500'}`}>
              {stats.workoutCount >= 1 ? '달성 완료 (+100%)' : '0% 진행중'}
            </span>
          </div>
        </div>

        {/* 2. 걸음 수 카드 */}
        <div className="relative overflow-hidden rounded-2xl bg-slate-900/90 border border-slate-800 p-5 shadow-lg transition-all hover:border-cyan-500/40 hover:shadow-cyan-500/10 group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold tracking-wider text-slate-400 uppercase flex items-center gap-1.5">
              <Footprints className="w-4 h-4 text-cyan-400" />
              오늘 걸음 수
            </span>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              {stepPercent}% 달성
            </span>
          </div>

          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-4xl font-black text-slate-100 tracking-tight">
              {stats.totalSteps.toLocaleString()}
            </span>
            <span className="text-sm font-semibold text-slate-400">/ {stats.stepGoal.toLocaleString()} 보</span>
          </div>

          {/* 프로그레스 바 */}
          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden mt-3">
            <div 
              className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-700 ease-out"
              style={{ width: `${stepPercent}%` }}
            />
          </div>

          <div className="mt-2 text-right text-[11px] text-slate-400 font-medium">
            {stats.totalSteps >= stats.stepGoal ? (
              <span className="text-cyan-400">목표 초과 달성! 👏</span>
            ) : (
              <span>{(stats.stepGoal - stats.totalSteps).toLocaleString()}보 남음</span>
            )}
          </div>
        </div>

        {/* 3. 소모 칼로리 카드 */}
        <div className="relative overflow-hidden rounded-2xl bg-slate-900/90 border border-slate-800 p-5 shadow-lg transition-all hover:border-orange-500/40 hover:shadow-orange-500/10 group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold tracking-wider text-slate-400 uppercase flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-orange-400 animate-flame" />
              소모 칼로리
            </span>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20">
              활동 {stats.activeCalories} kcal
            </span>
          </div>

          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-4xl font-black text-slate-100 tracking-tight text-orange-400">
              {stats.activeCalories.toLocaleString()}
            </span>
            <span className="text-sm font-semibold text-slate-400">
              kcal (총 {(stats.totalCalories || 0).toLocaleString()})
            </span>
          </div>

          {/* 프로그레스 바 */}
          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden mt-3">
            <div 
              className="h-full bg-gradient-to-r from-orange-500 to-amber-500 rounded-full transition-all duration-700 ease-out"
              style={{ width: `${calPercent}%` }}
            />
          </div>

          <div className="mt-2 text-right text-[11px] text-slate-400 font-medium">
            목표 {stats.calorieGoal} kcal ({calPercent}%)
          </div>
        </div>

        {/* 4. 운동시간 동안 최고 심박수 카드 (⭐ 핵심 요구) */}
        <div className="relative overflow-hidden rounded-2xl bg-slate-900/90 border border-slate-800 p-5 shadow-lg transition-all hover:border-rose-500/40 hover:shadow-rose-500/10 group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold tracking-wider text-slate-400 uppercase flex items-center gap-1.5">
              <Heart className="w-4 h-4 text-rose-500 animate-heartbeat" />
              운동 중 최고 심박수
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${hrZone.color}`}>
              {hrZone.zone > 0 ? `Zone ${hrZone.zone}` : 'Zone 0 (미측정)'}
            </span>
          </div>

          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-4xl font-black text-rose-400 tracking-tight">
              {stats.peakHeartRate > 0 ? stats.peakHeartRate : 0}
            </span>
            <span className="text-sm font-semibold text-slate-400">
              BPM {stats.peakHeartRate <= 0 && <span className="text-xs text-slate-500 font-normal">(워치 미착용)</span>}
            </span>
          </div>

          {/* 심박수 존 안내 */}
          <div className="mt-3 pt-2.5 border-t border-slate-800/80">
            <div className="text-xs font-medium text-slate-300">
              {hrZone.name}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
              {hrZone.description}
            </p>
          </div>
        </div>
          </div>
        )}
      </div>
    </div>
  );
};

