import React, { useState } from 'react';
import { DailyStats, MonthlyStats, WorkoutType } from '../types/health';
import { calculateMonthlyStats } from '../services/statsCalculator';
import { 
  Calendar as CalendarIcon, 
  Dumbbell, 
  Flame, 
  Footprints, 
  Heart, 
  ChevronLeft, 
  ChevronRight,
  Trophy,
  Activity,
  CheckCircle,
  TrendingUp
} from 'lucide-react';

interface MonthlyStatsViewProps {
  currentDateStr: string;
  dailyDataMap: { [dateStr: string]: DailyStats };
  onSelectDate: (dateStr: string) => void;
  onOpenWorkoutModal: () => void;
}

export const MonthlyStatsView: React.FC<MonthlyStatsViewProps> = ({
  currentDateStr,
  dailyDataMap,
  onSelectDate,
  onOpenWorkoutModal
}) => {
  // 현재 조회 중인 월 (YYYY-MM)
  const currentMonthStr = currentDateStr.substring(0, 7);
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);

  const [year, month] = selectedMonth.split('-').map(Number);

  // 월간 통계 계산
  const monthlyStats: MonthlyStats = calculateMonthlyStats(selectedMonth, dailyDataMap);

  // 월 이동
  const changeMonth = (offset: number) => {
    let newYear = year;
    let newMonth = month + offset;
    if (newMonth < 1) {
      newYear -= 1;
      newMonth = 12;
    } else if (newMonth > 12) {
      newYear += 1;
      newMonth = 1;
    }
    const newMonthStr = `${newYear}-${String(newMonth).padStart(2, '0')}`;
    setSelectedMonth(newMonthStr);
  };

  // 달력 데이터 생성
  const firstDayOfMonth = new Date(year, month - 1, 1).getDay(); // 0: 일요일
  const daysInMonth = new Date(year, month, 0).getDate();

  const calendarDays: { dayNum: number | null; dateStr: string | null; stats?: DailyStats }[] = [];
  
  // 첫 주 빈칸 채우기
  for (let i = 0; i < firstDayOfMonth; i++) {
    calendarDays.push({ dayNum: null, dateStr: null });
  }

  // 실제 날짜 채우기
  for (let d = 1; d <= daysInMonth; d++) {
    const dStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    calendarDays.push({
      dayNum: d,
      dateStr: dStr,
      stats: dailyDataMap[dStr]
    });
  }

  const getTypeName = (type: string) => {
    const map: Record<string, string> = {
      running: '러닝',
      strength: '웨이트/근력',
      cycling: '사이클',
      swimming: '수영',
      walking: '걷기',
      hiking: '등산',
      hiit: 'HIIT/인터벌',
      yoga: '요가/스트레칭',
      pilates: '필라테스',
      other: '기타'
    };
    return map[type] || type;
  };

  return (
    <div className="space-y-6">
      {/* 상단 월 선택 네비게이터 & 헤더 */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Trophy className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
              MONTHLY ATHLETIC REPORT
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-100">
            {year}년 {month}월 운동 종합 통계
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            이번 달 총 <span className="text-emerald-400 font-bold">{monthlyStats.totalWorkouts}회</span> 운동 세션을 완료했습니다!
          </p>
        </div>

        <div className="flex items-center gap-2 bg-slate-800/80 p-1.5 rounded-xl border border-slate-700">
          <button
            onClick={() => changeMonth(-1)}
            className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-slate-100 transition-colors"
            title="이전 달"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="px-3 text-sm font-bold text-slate-200">
            {year}년 {month}월
          </span>
          <button
            onClick={() => changeMonth(1)}
            className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-slate-100 transition-colors"
            title="다음 달"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 월간 4대 핵심 지표 카드 그리드 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* 1. 월 누적 운동 횟수 (⭐ 핵심) */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-lg hover:border-emerald-500/40 transition-all">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold mb-2">
            <span className="flex items-center gap-1.5">
              <Dumbbell className="w-4 h-4 text-emerald-400" />
              월 누적 운동 횟수
            </span>
            <span className="text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 text-[10px]">
              목표 15회+
            </span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-4xl font-black text-emerald-400">
              {monthlyStats.totalWorkouts}
            </span>
            <span className="text-sm font-semibold text-slate-400">회 완료</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            운동한 일수: <strong className="text-slate-200">{monthlyStats.workoutDaysCount}일</strong> / 주간 평균 {(monthlyStats.totalWorkouts / 4.2).toFixed(1)}회
          </p>
        </div>

        {/* 2. 월 총 걸음 수 */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-lg hover:border-cyan-500/40 transition-all">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold mb-2">
            <span className="flex items-center gap-1.5">
              <Footprints className="w-4 h-4 text-cyan-400" />
              월 총 걸음 수
            </span>
            <span className="text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/20 text-[10px]">
              일평균 {monthlyStats.avgDailySteps.toLocaleString()}보
            </span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-4xl font-black text-cyan-400">
              {monthlyStats.totalSteps.toLocaleString()}
            </span>
            <span className="text-sm font-semibold text-slate-400">보</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            누적 이동거리: 약 <strong className="text-slate-200">{(monthlyStats.totalSteps * 0.00075).toFixed(1)} km</strong>
          </p>
        </div>

        {/* 3. 월 총 활동 칼로리 */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-lg hover:border-orange-500/40 transition-all">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold mb-2">
            <span className="flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-orange-400" />
              월 총 활동 칼로리
            </span>
            <span className="text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-full border border-orange-500/20 text-[10px]">
              Active Burn
            </span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-4xl font-black text-orange-400">
              {monthlyStats.totalCalories.toLocaleString()}
            </span>
            <span className="text-sm font-semibold text-slate-400">kcal</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            체지방 환산: 약 <strong className="text-slate-200">{(monthlyStats.totalCalories / 7700).toFixed(1)} kg</strong> 소모
          </p>
        </div>

        {/* 4. 월 평균 최고 심박수 */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-lg hover:border-rose-500/40 transition-all">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold mb-2">
            <span className="flex items-center gap-1.5">
              <Heart className="w-4 h-4 text-rose-500" />
              평균 최고 심박수
            </span>
            <span className="text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20 text-[10px]">
              Peak Intensity
            </span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-4xl font-black text-rose-400">
              {monthlyStats.avgPeakHeartRate > 0 ? monthlyStats.avgPeakHeartRate : 'N/A'}
            </span>
            {monthlyStats.avgPeakHeartRate > 0 && (
              <span className="text-sm font-semibold text-slate-400">BPM</span>
            )}
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            심폐 능력: <strong className="text-slate-200">{monthlyStats.avgPeakHeartRate > 0 ? 'Zone 4 (유산소/무산소 경계)' : 'N/A (심박 미측정)'}</strong>
          </p>
        </div>

      </div>

      {/* 월간 캘린더 히트맵 (운동 스탬프 달력) */}
      <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-emerald-400" />
              월간 운동 스탬프 캘린더 (오운완 잔디)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">날짜를 클릭하면 해당 일자의 상세 1일 통계로 바로 이동합니다.</p>
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-emerald-500/20 border border-emerald-500/50" />
              1회 운동
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-emerald-500 text-slate-950 font-bold" />
              2회+ 열정 운동
            </span>
          </div>
        </div>

        {/* 요일 헤더 */}
        <div className="grid grid-cols-7 gap-1.5 text-center text-xs font-semibold text-slate-400 mb-2">
          <div className="text-rose-400 py-1">일</div>
          <div className="py-1">월</div>
          <div className="py-1">화</div>
          <div className="py-1">수</div>
          <div className="py-1">목</div>
          <div className="py-1">금</div>
          <div className="text-cyan-400 py-1">토</div>
        </div>

        {/* 달력 그리드 */}
        <div className="grid grid-cols-7 gap-1.5">
          {calendarDays.map((item, idx) => {
            if (!item.dayNum || !item.dateStr) {
              return <div key={`empty-${idx}`} className="h-20 sm:h-24 rounded-xl bg-slate-950/20 border border-transparent" />;
            }

            const stats = item.stats;
            const workoutCount = stats?.workoutCount || 0;
            const hasWorkout = workoutCount > 0;
            const isSelected = item.dateStr === currentDateStr;

            return (
              <button
                key={item.dateStr}
                onClick={() => onSelectDate(item.dateStr!)}
                className={`h-20 sm:h-24 p-2 rounded-xl border text-left transition-all relative flex flex-col justify-between group ${
                  isSelected 
                    ? 'ring-2 ring-emerald-400 border-emerald-500 bg-slate-800' 
                    : hasWorkout 
                      ? workoutCount >= 2 
                        ? 'bg-emerald-950/40 border-emerald-500/50 hover:border-emerald-400' 
                        : 'bg-slate-800/80 border-slate-700/80 hover:border-emerald-500/30'
                      : 'bg-slate-900/50 border-slate-800/80 hover:bg-slate-800/40'
                }`}
              >
                {/* 상단 날짜 숫자 및 운동 뱃지 */}
                <div className="flex items-center justify-between w-full">
                  <span className={`text-xs font-bold ${
                    idx % 7 === 0 ? 'text-rose-400' : idx % 7 === 6 ? 'text-cyan-400' : 'text-slate-300'
                  }`}>
                    {item.dayNum}
                  </span>

                  {hasWorkout && (
                    <span className={`text-[10px] font-black px-1.5 py-0.2 rounded-full ${
                      workoutCount >= 2 
                        ? 'bg-emerald-500 text-slate-950' 
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    }`}>
                      {workoutCount}회
                    </span>
                  )}
                </div>

                {/* 하단 지표 요약 */}
                {stats ? (
                  <div className="space-y-0.5">
                    {stats.totalSteps > 0 && (
                      <div className="text-[10px] text-cyan-300/80 font-medium truncate">
                        👟 {(stats.totalSteps / 1000).toFixed(1)}k
                      </div>
                    )}
                    {stats.peakHeartRate > 0 && (
                      <div className="text-[10px] text-rose-400 font-bold truncate">
                        ❤️ {stats.peakHeartRate}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-[10px] text-slate-600">-</div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 종목별 운동 분포 & 주간 추이 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        
        {/* 종목별 세부 분석 */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-lg">
          <h3 className="text-base font-bold text-slate-100 flex items-center gap-2 mb-3">
            <Activity className="w-4 h-4 text-emerald-400" />
            이번 달 종목별 운동 현황
          </h3>

          <div className="space-y-3">
            {Object.entries(monthlyStats.workoutTypeBreakdown).length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">기록된 운동 세션이 없습니다.</p>
            ) : (
              Object.entries(monthlyStats.workoutTypeBreakdown).map(([type, info]) => {
                if (!info) return null;
                const percent = Math.round((info.count / (monthlyStats.totalWorkouts || 1)) * 100);
                return (
                  <div key={type} className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/50">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-200 mb-1.5">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        {getTypeName(type)}
                      </span>
                      <span className="text-emerald-400">{info.count}회 ({percent}%)</span>
                    </div>

                    {/* 막대 */}
                    <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden mb-2">
                      <div 
                        className="h-full bg-emerald-400 rounded-full" 
                        style={{ width: `${percent}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>총 {info.minutes}분 소요</span>
                      <span>소모 {info.calories.toLocaleString()} kcal</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* 월간 달성 배지 & 팁 */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-lg flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2 mb-3">
              <Trophy className="w-4 h-4 text-amber-400" />
              월간 어슬릿 달성 뱃지
            </h3>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="p-3 rounded-xl bg-slate-800/60 border border-amber-500/30 text-center">
                <div className="text-2xl mb-1">🔥</div>
                <div className="text-xs font-bold text-amber-400">오운완 마스터</div>
                <div className="text-[10px] text-slate-400 mt-0.5">월 15회 이상 운동 달성</div>
              </div>

              <div className="p-3 rounded-xl bg-slate-800/60 border border-cyan-500/30 text-center">
                <div className="text-2xl mb-1">👟</div>
                <div className="text-xs font-bold text-cyan-400">만보 클럽</div>
                <div className="text-[10px] text-slate-400 mt-0.5">일평균 10,000보 초과</div>
              </div>

              <div className="p-3 rounded-xl bg-slate-800/60 border border-rose-500/30 text-center">
                <div className="text-2xl mb-1">⚡</div>
                <div className="text-xs font-bold text-rose-400">심폐 강화러</div>
                <div className="text-[10px] text-slate-400 mt-0.5">최고 심박수 170+ 돌파</div>
              </div>

              <div className="p-3 rounded-xl bg-slate-800/60 border border-emerald-500/30 text-center">
                <div className="text-2xl mb-1">🌟</div>
                <div className="text-xs font-bold text-emerald-400">올라운더</div>
                <div className="text-[10px] text-slate-400 mt-0.5">3종목 이상 복합 운동</div>
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300">
            💡 <strong>트레이닝 팁:</strong> 이번 달 최고 심박수 평균은 {monthlyStats.avgPeakHeartRate} BPM입니다. 고강도 인터벌 세션 후에는 충분한 회복(Zone 1)과 수면을 유지하면 심폐 지구력이 20% 향상됩니다.
          </div>
        </div>

      </div>
    </div>
  );
};
