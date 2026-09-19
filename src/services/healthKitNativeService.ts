import { Capacitor } from '@capacitor/core';
import { Health, Workout as CapWorkout, HealthSample } from '@capgo/capacitor-health';
import { DailyStats, WorkoutSession, WorkoutType, HeartRateSample } from '../types/health';
import { calculateDailyStats } from './statsCalculator';

/**
 * 네이티브 앱 환경(iOS/Android Capacitor 컨테이너) 여부 확인
 */
export const isNativePlatform = (): boolean => {
  return Capacitor.isNativePlatform();
};

/**
 * 현재 플랫폼 반환 ('ios' | 'android' | 'web')
 */
export const getPlatformName = (): 'ios' | 'android' | 'web' => {
  const p = Capacitor.getPlatform();
  if (p === 'ios') return 'ios';
  if (p === 'android') return 'android';
  return 'web';
};

/**
 * WorkoutType 매핑 함수
 */
function mapCapacitorWorkoutType(capType: string): { type: WorkoutType; name: string } {
  const lower = (capType || '').toLowerCase();
  if (lower.includes('running')) return { type: 'running', name: '러닝' };
  if (lower.includes('walking')) return { type: 'walking', name: '걷기' };
  if (lower.includes('cycling') || lower.includes('biking')) return { type: 'cycling', name: '사이클' };
  if (lower.includes('swimming')) return { type: 'swimming', name: '수영' };
  if (lower.includes('hiking')) return { type: 'hiking', name: '등산' };
  if (lower.includes('yoga')) return { type: 'yoga', name: '요가' };
  if (lower.includes('pilates')) return { type: 'pilates', name: '필라테스' };
  if (lower.includes('highintensity') || lower.includes('hiit') || lower.includes('interval')) return { type: 'hiit', name: '고강도 인터벌(HIIT)' };
  if (lower.includes('strength') || lower.includes('weight') || lower.includes('deadlift') || lower.includes('bench')) return { type: 'strength', name: '웨이트 트레이닝' };
  return { type: 'other', name: '운동' };
}

/**
 * 애플 건강 / 헬스 커넥트 공식 시스템 권한 요청
 */
export async function requestNativeHealthAuthorization(): Promise<boolean> {
  if (!isNativePlatform()) return false;
  try {
    const isAvail = await Health.isAvailable();
    if (!isAvail.available) {
      console.warn('건강 데이터 서비스를 사용할 수 없습니다:', isAvail.reason);
      return false;
    }

    const authResult = await Health.requestAuthorization({
      read: [
        'steps',
        'calories',
        'heartRate',
        'workouts',
        'distance',
        'exerciseTime'
      ]
    });

    return authResult.readAuthorized.length > 0;
  } catch (err) {
    console.error('네이티브 건강 권한 요청 실패:', err);
    return false;
  }
}

export interface NativeSyncResult {
  success: boolean;
  message: string;
  stats?: { [dateStr: string]: DailyStats };
}

/**
 * 네이티브 HealthKit / Health Connect로부터 최근 N일간의 건강 데이터 원클릭 동기화
 */
export async function syncFromNativeHealth(daysBack: number = 14): Promise<NativeSyncResult> {
  if (!isNativePlatform()) {
    return {
      success: false,
      message: '네이티브 앱 환경에서만 직접 건강 연동이 가능합니다. (웹 브라우저에서는 파일 또는 단축어를 이용해주세요)'
    };
  }

  try {
    // 1. 권한 확인 및 요청
    const authorized = await requestNativeHealthAuthorization();
    if (!authorized) {
      return {
        success: false,
        message: '애플 건강(HealthKit) 접근 권한이 허용되지 않았습니다. 아이폰 설정 > 건강 > FitStats에서 읽기 권한을 허용해주세요.'
      };
    }

    // 2. 조회 기간 설정 (오늘 자정 ~ 과거 N일)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - daysBack);
    startDate.setHours(0, 0, 0, 0);

    const startIso = startDate.toISOString();
    const endIso = endDate.toISOString();

    // 3. 걸음 수 샘플 조회
    const stepsResult = await Health.readSamples({
      dataType: 'steps',
      startDate: startIso,
      endDate: endIso,
      limit: 5000
    });

    // 4. 운동 세션 조회
    const workoutsResult = await Health.queryWorkouts({
      startDate: startIso,
      endDate: endIso,
      limit: 500
    });

    // 5. 심박수 샘플 조회
    const hrResult = await Health.readSamples({
      dataType: 'heartRate',
      startDate: startIso,
      endDate: endIso,
      limit: 2000
    });

    // 6. 일자별 데이터 집계
    const dailyStepsMap: { [dateStr: string]: number } = {};
    const dailyWorkoutsMap: { [dateStr: string]: WorkoutSession[] } = {};
    const dailyHrMap: { [dateStr: string]: HeartRateSample[] } = {};

    // 걸음 수 집계
    (stepsResult.samples || []).forEach((sample: HealthSample) => {
      const dateStr = sample.startDate.split('T')[0];
      if (!dailyStepsMap[dateStr]) dailyStepsMap[dateStr] = 0;
      dailyStepsMap[dateStr] += Number(sample.value || 0);
    });

    // 운동 세션 변환
    (workoutsResult.workouts || []).forEach((w: CapWorkout, idx: number) => {
      const dateStr = w.startDate.split('T')[0];
      if (!dailyWorkoutsMap[dateStr]) dailyWorkoutsMap[dateStr] = [];

      const { type, name } = mapCapacitorWorkoutType(w.workoutType);
      const durationMinutes = Math.round((w.duration || 0) / 60);
      const caloriesBurned = w.totalEnergyBurned ? Math.round(w.totalEnergyBurned) : undefined;
      const distanceKm = w.totalDistance ? parseFloat((w.totalDistance / 1000).toFixed(2)) : undefined;

      dailyWorkoutsMap[dateStr].push({
        id: `native-${dateStr}-${idx}`,
        type,
        name,
        startTime: w.startDate,
        endTime: w.endDate,
        durationMinutes,
        caloriesBurned,
        distanceKm,
        notes: '애플 건강(HealthKit) 네이티브 연동'
      });
    });

    // 심박수 샘플 변환
    (hrResult.samples || []).forEach((sample: HealthSample) => {
      const dateStr = sample.startDate.split('T')[0];
      if (!dailyHrMap[dateStr]) dailyHrMap[dateStr] = [];

      if (dailyHrMap[dateStr].length < 60) {
        const timeStr = sample.startDate.includes('T')
          ? sample.startDate.split('T')[1].substring(0, 5)
          : '00:00';
        dailyHrMap[dateStr].push({
          time: timeStr,
          bpm: Math.round(Number(sample.value || 0))
        });
      }
    });

    // 모든 날짜 통합
    const allDates = new Set([
      ...Object.keys(dailyStepsMap),
      ...Object.keys(dailyWorkoutsMap),
      ...Object.keys(dailyHrMap)
    ]);

    const resultStats: { [dateStr: string]: DailyStats } = {};
    allDates.forEach(dateStr => {
      const steps = Math.round(dailyStepsMap[dateStr] || 0);
      const workouts = dailyWorkoutsMap[dateStr] || [];
      const hrSamples = dailyHrMap[dateStr] || [];

      resultStats[dateStr] = calculateDailyStats(dateStr, steps, workouts, hrSamples);
    });

    const totalDays = Object.keys(resultStats).length;
    return {
      success: true,
      message: `성공! 애플 건강에서 최근 ${totalDays}일치 건강 데이터가 파일 없이 즉시 연동되었습니다!`,
      stats: resultStats
    };
  } catch (err: any) {
    console.error('네이티브 건강 데이터 동기화 실패:', err);
    return {
      success: false,
      message: `애플 건강 연동 중 오류가 발생했습니다: ${err.message || err}`
    };
  }
}
