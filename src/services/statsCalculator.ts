import { DailyStats, MonthlyStats, WorkoutSession, WorkoutType, HeartRateSample } from '../types/health';

/**
 * 1일 통계 산출 함수
 * - 1일 운동 횟수: 완료된 운동 세션 총 개수
 * - 걸음 수: 일일 총 걸음 수
 * - 칼로리 수: 활동 칼로리 + 기초대사 칼로리
 * - 운동시간 동안 최고 심박수: 운동 세션의 maxHeartRate 중 최댓값 (또는 운동 시간대 심박 샘플 최고값)
 */
export function calculateDailyStats(
  date: string,
  totalSteps: number,
  workouts: WorkoutSession[] = [],
  heartRateSamples: HeartRateSample[] = [],
  stepGoal = 10000,
  calorieGoal = 600,
  restingHeartRate?: number
): DailyStats {
  const workoutCount = workouts.length;

  // 운동 칼로리 합산
  const workoutCalories = workouts.reduce((sum, w) => sum + (w.caloriesBurned || 0), 0);
  
  // 걸음 수 기반 추가 생활 활동 칼로리 (걸음수가 있을 때만 계산, 없으면 0)
  const nonWorkoutStepsCalories = totalSteps > 0 ? Math.round(totalSteps * 0.038) : 0;
  const activeCalories = workoutCalories + nonWorkoutStepsCalories;
  
  // 총 칼로리: 활동 데이터가 있으면 기초대사량(1,450) 가산, 전혀 없으면 0
  const totalCalories = activeCalories > 0 ? activeCalories + 1450 : 0;

  // 운동시간 동안 최고 심박수 산출
  let peakHeartRate = 0;
  if (workouts.length > 0) {
    // 1) 각 운동 세션에 기록된 maxHeartRate 중 최댓값
    const maxFromWorkouts = Math.max(...workouts.map(w => w.maxHeartRate || 0));
    peakHeartRate = maxFromWorkouts;

    // 2) 만약 심박 샘플이 있고 운동 시간대가 명시되어 있다면 해당 시간대 샘플과 대조
    if (heartRateSamples.length > 0) {
      workouts.forEach(w => {
        const start = new Date(w.startTime).getTime();
        const end = new Date(w.endTime).getTime();

        heartRateSamples.forEach(sample => {
          let sampleTime: number;
          if (sample.time.includes('T')) {
            sampleTime = new Date(sample.time).getTime();
          } else {
            // "HH:mm" 형식인 경우 해당 날짜와 조합
            const [hours, mins] = sample.time.split(':').map(Number);
            const d = new Date(date);
            d.setHours(hours, mins, 0, 0);
            sampleTime = d.getTime();
          }

          if (!isNaN(sampleTime) && sampleTime >= start && sampleTime <= end) {
            if (sample.bpm > peakHeartRate) {
              peakHeartRate = sample.bpm;
            }
          }
        });
      });
    }
  } else if (heartRateSamples.length > 0) {
    // 운동이 없는 날이면 일일 샘플 최고치를 참고값으로 제공 (0보다는 정보 제공)
    peakHeartRate = Math.max(...heartRateSamples.map(s => s.bpm));
  }

  return {
    date,
    totalSteps: Math.max(0, totalSteps),
    stepGoal,
    activeCalories,
    calorieGoal,
    totalCalories,
    workoutCount,
    workouts,
    peakHeartRate: Math.max(0, peakHeartRate),
    restingHeartRate,
    heartRateSamples
  };
}

/**
 * 월간 운동 통계 산출 함수
 * - 월 누적 운동 횟수
 * - 운동한 일수
 * - 월 누적 걸음수 및 칼로리
 * - 종목별 세부 분석
 */
export function calculateMonthlyStats(
  monthStr: string, // YYYY-MM
  dailyDataMap: { [dateStr: string]: DailyStats }
): MonthlyStats {
  const [year, month] = monthStr.split('-').map(Number);
  const monthName = `${year}년 ${month}월`;

  let totalWorkouts = 0;
  let workoutDaysCount = 0;
  let totalSteps = 0;
  let totalCalories = 0;
  let peakHeartRateSum = 0;
  let peakDaysCount = 0;

  const workoutTypeBreakdown: { [type in WorkoutType]?: { count: number; minutes: number; calories: number } } = {};

  // 해당 월에 속하는 날짜 필터링
  const monthEntries = Object.entries(dailyDataMap).filter(([dateStr]) => dateStr.startsWith(monthStr));

  monthEntries.forEach(([, stats]) => {
    totalSteps += stats.totalSteps;
    totalCalories += stats.activeCalories;

    if (stats.workoutCount > 0) {
      totalWorkouts += stats.workoutCount;
      workoutDaysCount += 1;
    }

    if (stats.peakHeartRate > 0) {
      peakHeartRateSum += stats.peakHeartRate;
      peakDaysCount += 1;
    }

    // 종목별 집계
    stats.workouts.forEach(w => {
      if (!workoutTypeBreakdown[w.type]) {
        workoutTypeBreakdown[w.type] = { count: 0, minutes: 0, calories: 0 };
      }
      const entry = workoutTypeBreakdown[w.type]!;
      entry.count += 1;
      entry.minutes += w.durationMinutes || 0;
      entry.calories += w.caloriesBurned || 0;
    });
  });

  const daysInMonth = monthEntries.length || 30;
  const avgDailySteps = Math.round(totalSteps / daysInMonth);
  const avgPeakHeartRate = peakDaysCount > 0 ? Math.round(peakHeartRateSum / peakDaysCount) : 0;

  return {
    month: monthStr,
    monthName,
    totalWorkouts,
    workoutDaysCount,
    totalSteps,
    totalCalories,
    avgDailySteps,
    avgPeakHeartRate,
    dailyData: Object.fromEntries(monthEntries),
    workoutTypeBreakdown
  };
}

export interface YearlyStats {
  year: number;
  totalWorkouts: number;
  workoutDaysCount: number;
  totalSteps: number;
  totalCalories: number;
  avgDailySteps: number;
  peakHeartRate: number;
  workoutTypeBreakdown: { [type in WorkoutType]?: { count: number; minutes: number; calories: number } };
  monthlySummaries: {
    month: number;
    monthStr: string;
    workouts: number;
    steps: number;
    calories: number;
  }[];
}

/**
 * 연간 종합 운동 통계 계산 (12개월 전체 집계)
 */
export function calculateYearlyStats(
  year: number,
  dailyDataMap: { [dateStr: string]: DailyStats }
): YearlyStats {
  const yearPrefix = String(year);
  const yearEntries = Object.entries(dailyDataMap).filter(([date]) => date.startsWith(yearPrefix));

  let totalSteps = 0;
  let totalCalories = 0;
  let totalWorkouts = 0;
  let workoutDaysCount = 0;
  let peakHeartRate = 0;

  const workoutTypeBreakdown: { [type in WorkoutType]?: { count: number; minutes: number; calories: number } } = {};

  const monthlyBuckets: { [m: number]: { workouts: number; steps: number; calories: number } } = {};
  for (let m = 1; m <= 12; m++) {
    monthlyBuckets[m] = { workouts: 0, steps: 0, calories: 0 };
  }

  yearEntries.forEach(([dateStr, stats]) => {
    totalSteps += stats.totalSteps;
    totalCalories += stats.activeCalories;

    if (stats.workoutCount > 0) {
      totalWorkouts += stats.workoutCount;
      workoutDaysCount += 1;
    }

    if (stats.peakHeartRate > peakHeartRate) {
      peakHeartRate = stats.peakHeartRate;
    }

    const m = parseInt(dateStr.split('-')[1], 10);
    if (monthlyBuckets[m]) {
      monthlyBuckets[m].workouts += stats.workoutCount;
      monthlyBuckets[m].steps += stats.totalSteps;
      monthlyBuckets[m].calories += stats.activeCalories;
    }

    stats.workouts.forEach(w => {
      if (!workoutTypeBreakdown[w.type]) {
        workoutTypeBreakdown[w.type] = { count: 0, minutes: 0, calories: 0 };
      }
      const entry = workoutTypeBreakdown[w.type]!;
      entry.count += 1;
      entry.minutes += w.durationMinutes || 0;
      entry.calories += w.caloriesBurned || 0;
    });
  });

  const totalDays = yearEntries.length || 365;
  const avgDailySteps = Math.round(totalSteps / totalDays);

  const monthlySummaries = Object.entries(monthlyBuckets).map(([mStr, data]) => ({
    month: Number(mStr),
    monthStr: `${year}-${mStr.padStart(2, '0')}`,
    workouts: data.workouts,
    steps: data.steps,
    calories: data.calories
  }));

  return {
    year,
    totalWorkouts,
    workoutDaysCount,
    totalSteps,
    totalCalories,
    avgDailySteps,
    peakHeartRate,
    workoutTypeBreakdown,
    monthlySummaries
  };
}

/**
 * 심박수 존(Zone) 분석 헬퍼 (최대 심박수 220-나이 공식 기반, 기본 나이 30세기준 190)
 */
export function getHeartRateZone(bpm: number, maxHr = 190): {
  zone: number;
  name: string;
  color: string;
  description: string;
} {
  if (!bpm || bpm <= 0) {
    return {
      zone: 0,
      name: '심박수 미측정 (N/A)',
      color: 'text-slate-400 bg-slate-800/60 border-slate-700',
      description: '기록된 심박수 데이터가 없습니다.'
    };
  }
  const percent = (bpm / maxHr) * 100;
  if (percent >= 90) {
    return { zone: 5, name: 'Zone 5 (최대 심폐/무산소)', color: 'text-rose-500 bg-rose-500/10 border-rose-500/30', description: '최고 강도 인터벌, 속도 향상' };
  } else if (percent >= 80) {
    return { zone: 4, name: 'Zone 4 (고강도 심폐)', color: 'text-orange-500 bg-orange-500/10 border-orange-500/30', description: '체력 증진, 젖산 역치 훈련' };
  } else if (percent >= 70) {
    return { zone: 3, name: 'Zone 3 (유산소)', color: 'text-amber-500 bg-amber-500/10 border-amber-500/30', description: '지구력 강화 및 유산소 능력 개발' };
  } else if (percent >= 60) {
    return { zone: 2, name: 'Zone 2 (지방 연소)', color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30', description: '체지방 감량, 기초 체력 유지' };
  } else {
    return { zone: 1, name: 'Zone 1 (워밍업/회복)', color: 'text-cyan-500 bg-cyan-500/10 border-cyan-500/30', description: '가벼운 스트레칭 및 회복' };
  }
}
