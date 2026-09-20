import React, { useState } from 'react';
import { DailyStats, MonthlyStats, WorkoutType } from '../types/health';
import { calculateMonthlyStats, calculateYearlyStats, YearlyStats } from '../services/statsCalculator';
import { WorkoutRoute } from '../types/route';
import { RouteOverlayView } from './RouteOverlayView';
import { 
  Calendar as CalendarIcon, 
  Dumbbell, 
  Flame, 
  Footprints, 
  Heart, 
  ChevronLeft, 
  ChevronRight,
  ChevronDown,
  Trophy,
  Activity,
  CheckCircle,
  TrendingUp,
  X,
  Sparkles,
  BarChart3,
  Layers
} from 'lucide-react';

interface MonthlyStatsViewProps {
  currentDateStr: string;
  dailyDataMap: { [dateStr: string]: DailyStats };
  onSelectDate: (dateStr: string) => void;
  onOpenWorkoutModal: () => void;
  routes: WorkoutRoute[];
  onAddRoute?: (route: WorkoutRoute) => void;
}

export const MonthlyStatsView: React.FC<MonthlyStatsViewProps> = ({
  currentDateStr,
  dailyDataMap,
  onSelectDate,
  onOpenWorkoutModal,
  routes,
  onAddRoute
}) => {
  // 조회 범위: 'month' (월간) vs 'year' (연간)
  const [viewScope, setViewScope] = useState<'month' | 'year'>('month');

  // 현재 조회 중인 월 (YYYY-MM)
  const currentMonthStr = currentDateStr.substring(0, 7);
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);

  const [year, month] = selectedMonth.split('-').map(Number);
  const [selectedYear, setSelectedYear] = useState<number>(year);

  // 날짜/기간 선택 팝오버 상태
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [pickerTab, setPickerTab] = useState<'month' | 'year'>('month');
  const [pickerYear, setPickerYear] = useState<number>(year);

  // 월간 통계 계산
  const monthlyStats: MonthlyStats = calculateMonthlyStats(selectedMonth, dailyDataMap);

  // 연간 통계 계산
  const yearlyStats: YearlyStats = calculateYearlyStats(selectedYear, dailyDataMap);

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
    setSelectedYear(newYear);
  };

  // 연도 이동
  const changeYear = (offset: number) => {
    const nextY = selectedYear + offset;
    setSelectedYear(nextY);
    setSelectedMonth(`${nextY}-${String(month).padStart(2, '0')}`);
  };

  // 월 직접 선택 처리 (2026년 5월 등)
  const handleSelectSpecificMonth = (targetYear: number, targetMonth: number) => {
    const mStr = `${targetYear}-${String(targetMonth).padStart(2, '0')}`;
    setSelectedMonth(mStr);
    setSelectedYear(targetYear);
    setViewScope('month');
    setIsPickerOpen(false);
  };

  // 연간 전체 모드 선택 처리
  const handleSelectYearlyScope = (targetYear: number) => {
    setSelectedYear(targetYear);
    setViewScope('year');
    setIsPickerOpen(false);
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

  const availableYears = [2023, 2024, 2025, 2026, 2027];

  return (
    <div className="space-y-6">
      {/* 상단 월/연도 선택 네비게이터 & 헤더 */}
      <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Trophy className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
              {viewScope === 'month' ? 'MONTHLY ATHLETIC REPORT' : 'ANNUAL ATHLETIC REPORT'}
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
              {viewScope === 'month' ? '월간 통계' : '연간 전체 통계'}
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-slate-100 flex items-center gap-2">
            {viewScope === 'month' ? `${year}년 ${month}월 운동 종합 통계` : `${selectedYear}년 연간 전체 종합 통계`}
          </h2>

          <p className="text-xs text-slate-400 mt-0.5">
            {viewScope === 'month' ? (
              <>이번 달 총 <span className="text-emerald-400 font-bold">{monthlyStats.totalWorkouts}회</span> 운동 세션을 완료했습니다!</>
            ) : (
              <>{selectedYear}년 누적 총 <span className="text-amber-400 font-bold">{yearlyStats.totalWorkouts}회</span> 세션 및 12개월 데이터를 종합 집계했습니다.</>
            )}
          </p>
        </div>

        {/* 네비게이터 & 날짜/기간 선택 버튼 */}
        <div className="flex items-center flex-wrap gap-2">
          {viewScope === 'year' && (
            <button
              onClick={() => setViewScope('month')}
              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 text-xs font-semibold border border-emerald-500/30 transition-all flex items-center gap-1"
            >
              <CalendarIcon className="w-3.5 h-3.5" />
              <span>월별 보기</span>
            </button>
          )}

          <div className="flex items-center gap-1.5 bg-slate-800/80 p-1.5 rounded-xl border border-slate-700">
            <button
              onClick={() => viewScope === 'month' ? changeMonth(-1) : changeYear(-1)}
              className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-slate-100 transition-colors"
              title={viewScope === 'month' ? "이전 달" : "이전 연도"}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* ⭐ 핵심 요구사항: 날짜를 클릭하여 월단위 또는 연도단위 선택 */}
            <button
              onClick={() => {
                setPickerYear(selectedYear);
                setPickerTab(viewScope);
                setIsPickerOpen(true);
              }}
              className="px-3 py-1 rounded-lg bg-slate-700/60 hover:bg-slate-700 text-slate-100 hover:text-emerald-300 font-bold text-sm transition-all flex items-center gap-1.5 border border-slate-600/50"
              title="클릭하여 원하는 월 또는 연도를 직접 선택"
            >
              {viewScope === 'month' ? (
                <>
                  <CalendarIcon className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{year}년 {month}월</span>
                </>
              ) : (
                <>
                  <Trophy className="w-3.5 h-3.5 text-amber-400" />
                  <span>{selectedYear}년 연간</span>
                </>
              )}
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            <button
              onClick={() => viewScope === 'month' ? changeMonth(1) : changeYear(1)}
              className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-slate-100 transition-colors"
              title={viewScope === 'month' ? "다음 달" : "다음 연도"}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 날짜/연도 선택 팝오버 모달 (⭐ 사용자의 핵심 요구) */}
      {isPickerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-emerald-400" />
                <h3 className="text-base font-bold text-slate-100">조회 기간 직접 선택</h3>
              </div>
              <button
                onClick={() => setIsPickerOpen(false)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 선택 모드 탭 (월 단위 선택 vs 연도 단위 선택) */}
            <div className="flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700">
              <button
                onClick={() => setPickerTab('month')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  pickerTab === 'month' ? 'bg-emerald-500 text-slate-950 shadow' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <CalendarIcon className="w-3.5 h-3.5" />
                <span>월 단위 선택</span>
              </button>
              <button
                onClick={() => setPickerTab('year')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  pickerTab === 'year' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Trophy className="w-3.5 h-3.5" />
                <span>연도 단위 선택</span>
              </button>
            </div>

            {/* 1. 월 단위 선택 탭 */}
            {pickerTab === 'month' && (
              <div className="space-y-4 pt-1">
                {/* 연도 조정 바 */}
                <div className="flex items-center justify-between bg-slate-950/70 p-2 rounded-xl border border-slate-800">
                  <button
                    onClick={() => setPickerYear(y => y - 1)}
                    className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-100"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="font-bold text-slate-200">{pickerYear}년</span>
                  <button
                    onClick={() => setPickerYear(y => y + 1)}
                    className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-100"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {/* 12개월 그리드 */}
                <div className="grid grid-cols-4 gap-2">
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((mNum) => {
                    const isCurrent = pickerYear === year && mNum === month;
                    return (
                      <button
                        key={mNum}
                        onClick={() => handleSelectSpecificMonth(pickerYear, mNum)}
                        className={`py-2.5 rounded-xl font-bold text-xs transition-all border ${
                          isCurrent
                            ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md scale-105'
                            : 'bg-slate-800/80 hover:bg-slate-700 text-slate-200 border-slate-700 hover:border-emerald-500/40'
                        }`}
                      >
                        {mNum}월
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 2. 연도 단위 선택 탭 */}
            {pickerTab === 'year' && (
              <div className="space-y-4 pt-1">
                <p className="text-xs text-slate-400">
                  연간 전체 통계를 선택하면 12개월간의 누적 수치와 1년 치 운동 경로가 한 지도에 겹쳐진 풀 히트맵을 감상할 수 있습니다.
                </p>

                <div className="grid grid-cols-3 gap-2">
                  {availableYears.map((yNum) => {
                    return (
                      <button
                        key={yNum}
                        onClick={() => setPickerYear(yNum)}
                        className={`py-3 rounded-xl font-bold text-xs transition-all border ${
                          pickerYear === yNum
                            ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md font-black'
                            : 'bg-slate-800/80 hover:bg-slate-700 text-slate-200 border-slate-700'
                        }`}
                      >
                        {yNum}년
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => handleSelectYearlyScope(pickerYear)}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black text-xs shadow-lg hover:brightness-110 transition-all flex items-center justify-center gap-1.5"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{pickerYear}년 연간 전체 통계 & 누적 경로 보기</span>
                </button>
              </div>
            )}

          </div>
        </div>
      )}

      {/* 4대 핵심 지표 카드 그리드 (월간 vs 연간) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. 누적 운동 횟수 */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-lg hover:border-emerald-500/40 transition-all">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold mb-2">
            <span className="flex items-center gap-1.5">
              <Dumbbell className="w-4 h-4 text-emerald-400" />
              {viewScope === 'month' ? '월 누적 운동 횟수' : '연간 누적 운동 횟수'}
            </span>
            <span className="text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 text-[10px]">
              {viewScope === 'month' ? '목표 15회+' : '연간 누적'}
            </span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-4xl font-black text-emerald-400">
              {viewScope === 'month' ? monthlyStats.totalWorkouts : yearlyStats.totalWorkouts}
            </span>
            <span className="text-sm font-semibold text-slate-400">회 완료</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            운동한 일수: <strong className="text-slate-200">
              {viewScope === 'month' ? monthlyStats.workoutDaysCount : yearlyStats.workoutDaysCount}일
            </strong>
          </p>
        </div>

        {/* 2. 총 걸음 수 */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-lg hover:border-cyan-500/40 transition-all">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold mb-2">
            <span className="flex items-center gap-1.5">
              <Footprints className="w-4 h-4 text-cyan-400" />
              {viewScope === 'month' ? '월 총 걸음 수' : '연간 총 걸음 수'}
            </span>
            <span className="text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/20 text-[10px]">
              일평균 {(viewScope === 'month' ? monthlyStats.avgDailySteps : yearlyStats.avgDailySteps).toLocaleString()}보
            </span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-4xl font-black text-cyan-400">
              {(viewScope === 'month' ? monthlyStats.totalSteps : yearlyStats.totalSteps).toLocaleString()}
            </span>
            <span className="text-sm font-semibold text-slate-400">보</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            누적 이동거리: 약 <strong className="text-slate-200">
              {((viewScope === 'month' ? monthlyStats.totalSteps : yearlyStats.totalSteps) * 0.00075).toFixed(1)} km
            </strong>
          </p>
        </div>

        {/* 3. 총 활동 칼로리 */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-lg hover:border-orange-500/40 transition-all">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold mb-2">
            <span className="flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-orange-400" />
              {viewScope === 'month' ? '월 활동 칼로리' : '연간 활동 칼로리'}
            </span>
            <span className="text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-full border border-orange-500/20 text-[10px]">
              Active Burn
            </span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-4xl font-black text-orange-400">
              {(viewScope === 'month' ? monthlyStats.totalCalories : yearlyStats.totalCalories).toLocaleString()}
            </span>
            <span className="text-sm font-semibold text-slate-400">kcal</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            체지방 환산: 약 <strong className="text-slate-200">
              {(((viewScope === 'month' ? monthlyStats.totalCalories : yearlyStats.totalCalories) / 7700)).toFixed(1)} kg
            </strong> 소모
          </p>
        </div>

        {/* 4. 최고 심박수 */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-lg hover:border-rose-500/40 transition-all">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold mb-2">
            <span className="flex items-center gap-1.5">
              <Heart className="w-4 h-4 text-rose-500" />
              {viewScope === 'month' ? '평균 최고 심박수' : '연간 최고 피크 심박'}
            </span>
            <span className="text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20 text-[10px]">
              Peak Intensity
            </span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-4xl font-black text-rose-400">
              {viewScope === 'month' 
                ? (monthlyStats.avgPeakHeartRate > 0 ? monthlyStats.avgPeakHeartRate : 'N/A')
                : (yearlyStats.peakHeartRate > 0 ? yearlyStats.peakHeartRate : 'N/A')
              }
            </span>
            {((viewScope === 'month' ? monthlyStats.avgPeakHeartRate : yearlyStats.peakHeartRate) > 0) && (
              <span className="text-sm font-semibold text-slate-400">BPM</span>
            )}
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            {viewScope === 'month' ? 'Zone 4 고강도 유산소 구간' : '1년 중 가장 치열했던 심박 피크'}
          </p>
        </div>
      </div>

      {/* ⭐ 핵심 요구사항: 1일 통계의 경로가 쌓여서 월간/연간으로 표시되는 누적 경로 겹쳐보기 섹션 내장 */}
      <RouteOverlayView
        mode={viewScope === 'month' ? 'monthly' : 'yearly'}
        selectedPeriodStr={viewScope === 'month' ? selectedMonth : String(selectedYear)}
        routes={routes}
        onAddRoute={onAddRoute}
        isWidget={false}
      />

      {/* 월간 뷰 vs 연간 뷰 분기 */}
      {viewScope === 'month' ? (
        <>
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

            {/* 날짜 그리드 */}
            <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
              {calendarDays.map((day, idx) => {
                if (day.dayNum === null) {
                  return (
                    <div 
                      key={`empty-${idx}`} 
                      className="min-h-[70px] sm:min-h-[85px] rounded-xl bg-slate-950/30 border border-slate-800/40 opacity-40"
                    />
                  );
                }

                const s = day.stats;
                const count = s?.workoutCount || 0;
                const hasWorkouts = count > 0;
                const isSelected = day.dateStr === currentDateStr;

                return (
                  <button
                    key={day.dateStr}
                    onClick={() => day.dateStr && onSelectDate(day.dateStr)}
                    className={`min-h-[70px] sm:min-h-[85px] p-2 rounded-xl border text-left transition-all relative flex flex-col justify-between group ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-500/15 shadow-md shadow-emerald-500/10'
                        : hasWorkouts
                        ? 'border-slate-700/80 bg-slate-800/80 hover:border-emerald-500/60'
                        : 'border-slate-800/80 bg-slate-900/50 hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-bold ${isSelected ? 'text-emerald-400' : 'text-slate-300'}`}>
                        {day.dayNum}
                      </span>
                      {hasWorkouts && (
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                          count >= 2 
                            ? 'bg-emerald-500 text-slate-950' 
                            : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        }`}>
                          {count}회
                        </span>
                      )}
                    </div>

                    <div className="space-y-0.5 mt-1">
                      {s && s.totalSteps > 0 && (
                        <div className="text-[10px] text-cyan-400/90 font-medium truncate">
                          {s.totalSteps.toLocaleString()}보
                        </div>
                      )}
                      {s && s.activeCalories > 0 && (
                        <div className="text-[10px] text-orange-400/90 font-medium truncate">
                          {s.activeCalories}kcal
                        </div>
                      )}
                    </div>
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
        </>
      ) : (
        /* 연간 뷰: 12개월 월별 분포 차트 & 연간 종목 분석 */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-lg">
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2 mb-4">
              <BarChart3 className="w-4 h-4 text-amber-400" />
              {selectedYear}년 12개월 월별 운동 추이
            </h3>

            <div className="space-y-3">
              {yearlyStats.monthlySummaries.map((m) => {
                const maxWorkouts = Math.max(...yearlyStats.monthlySummaries.map(s => s.workouts), 1);
                const percent = Math.min(100, Math.round((m.workouts / maxWorkouts) * 100));

                return (
                  <div 
                    key={m.month}
                    onClick={() => handleSelectSpecificMonth(selectedYear, m.month)}
                    className="p-2.5 rounded-xl bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 hover:border-emerald-500/40 transition-all cursor-pointer group"
                    title="클릭하여 해당 월 상세 보기로 이동"
                  >
                    <div className="flex items-center justify-between text-xs font-semibold mb-1">
                      <span className="text-slate-200 group-hover:text-emerald-300 font-bold">
                        {m.month}월
                      </span>
                      <span className="text-amber-400 font-bold">
                        {m.workouts}회 완료 ({m.steps.toLocaleString()}보)
                      </span>
                    </div>

                    <div className="w-full h-2 bg-slate-700/80 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-amber-500 rounded-full transition-all duration-500"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 연간 종목별 총 세션 */}
          <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-lg">
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2 mb-4">
              <Activity className="w-4 h-4 text-cyan-400" />
              {selectedYear}년 연간 종목별 총 세션
            </h3>

            <div className="space-y-3">
              {Object.keys(yearlyStats.workoutTypeBreakdown).length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-500">
                  해당 연도에 기록된 운동 세션이 없습니다.
                </div>
              ) : (
                Object.entries(yearlyStats.workoutTypeBreakdown).map(([type, info]) => {
                  if (!info || info.count === 0) return null;
                  const percent = Math.round((info.count / (yearlyStats.totalWorkouts || 1)) * 100);

                  return (
                    <div key={type} className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60">
                      <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
                        <span className="text-slate-200 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-cyan-400" />
                          {getTypeName(type)}
                        </span>
                        <span className="text-cyan-400 font-bold">{info.count}회 ({percent}%)</span>
                      </div>

                      <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden mb-2">
                        <div 
                          className="h-full bg-cyan-400 rounded-full" 
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
        </div>
      )}
    </div>
  );
};

