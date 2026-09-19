import { DailyStats, WorkoutSession, HeartRateSample, WorkoutType } from '../types/health';
import { calculateDailyStats } from './statsCalculator';

// 날짜 포맷 함수 (YYYY-MM-DD)
export function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * 현실적인 30일치 피트니스 데모 데이터 생성 (애플 헬스 / 구글 핏 양식 완벽 호환)
 */
export function generateDemoFitnessData(referenceDate: Date = new Date()): { [dateStr: string]: DailyStats } {
  const data: { [dateStr: string]: DailyStats } = {};

  const workoutTemplates: {
    type: WorkoutType;
    name: string;
    duration: number;
    calories: number;
    maxHr: number;
    avgHr: number;
    distance?: number;
  }[] = [
    { type: 'running', name: '야외 인터벌 러닝', duration: 45, calories: 480, maxHr: 174, avgHr: 152, distance: 7.2 },
    { type: 'strength', name: '웨이트 트레이닝 (상체/하체)', duration: 60, calories: 350, maxHr: 158, avgHr: 128 },
    { type: 'cycling', name: '한강 야외 사이클링', duration: 55, calories: 420, maxHr: 165, avgHr: 140, distance: 18.5 },
    { type: 'hiit', name: '고강도 타바타 HIIT', duration: 30, calories: 340, maxHr: 181, avgHr: 160 },
    { type: 'swimming', name: '실내 자유형 수영', duration: 40, calories: 360, maxHr: 155, avgHr: 135, distance: 1.2 },
    { type: 'walking', name: '저녁 파워 워킹', duration: 35, calories: 160, maxHr: 122, avgHr: 108, distance: 3.4 },
    { type: 'yoga', name: '빈야사 요가 및 코어 스트레칭', duration: 50, calories: 180, maxHr: 115, avgHr: 98 }
  ];

  // 최근 35일치 데이터 생성
  for (let i = 34; i >= 0; i--) {
    const targetDate = new Date(referenceDate);
    targetDate.setDate(targetDate.getDate() - i);
    const dateStr = formatDate(targetDate);

    // 요일 기반 운동 패턴 (주 4~5회 운동)
    const dayOfWeek = targetDate.getDay(); // 0: 일, 1: 월, ...
    const isWorkoutDay = (dayOfWeek !== 1 && dayOfWeek !== 5) || (i === 0); // 오늘은 무조건 운동 포함!

    const workouts: WorkoutSession[] = [];
    const heartRateSamples: HeartRateSample[] = [];

    // 일일 걸음수 (8,000 ~ 13,500보)
    const stepVariation = Math.sin(i * 0.8) * 2500 + Math.cos(i * 1.5) * 1200;
    const steps = Math.max(5200, Math.round(10200 + stepVariation));

    // 하루 24시간 심박수 샘플 (안정 심박수 58~72)
    const baseRestingHr = 62 + Math.round(Math.sin(i) * 3);
    for (let h = 6; h <= 23; h += 2) {
      heartRateSamples.push({
        time: `${String(h).padStart(2, '0')}:00`,
        bpm: baseRestingHr + Math.floor(Math.random() * 15)
      });
    }

    if (isWorkoutDay) {
      // 1일 운동 횟수: 주말이나 오늘은 2회, 평일은 1회
      const numSessions = (dayOfWeek === 0 || dayOfWeek === 6 || i === 0) ? 2 : 1;

      for (let s = 0; s < numSessions; s++) {
        const templateIndex = (i * 3 + s * 2) % workoutTemplates.length;
        const tpl = workoutTemplates[templateIndex];

        const startHour = s === 0 ? 7 : 19;
        const startMin = 15;
        const endHour = startHour + Math.floor((startMin + tpl.duration) / 60);
        const endMin = (startMin + tpl.duration) % 60;

        const startTime = `${dateStr}T${String(startHour).padStart(2, '0')}:${String(startMin).padStart(2, '0')}:00`;
        const endTime = `${dateStr}T${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}:00`;

        workouts.push({
          id: `demo-${dateStr}-${s}`,
          type: tpl.type,
          name: tpl.name,
          startTime,
          endTime,
          durationMinutes: tpl.duration,
          caloriesBurned: tpl.calories,
          avgHeartRate: tpl.avgHr,
          maxHeartRate: tpl.maxHr,
          distanceKm: tpl.distance,
          notes: s === 0 ? '개운한 아침 유산소 세션' : '저녁 집중 트레이닝'
        });

        // 운동 시간대 고심박수 샘플 추가
        heartRateSamples.push({
          time: `${String(startHour).padStart(2, '0')}:${String(startMin + 15).padStart(2, '0')}`,
          bpm: tpl.avgHr
        });
        heartRateSamples.push({
          time: `${String(startHour).padStart(2, '0')}:${String(startMin + 25).padStart(2, '0')}`,
          bpm: tpl.maxHr // 최고 심박수 반영!
        });
      }
    }

    // 시간순 정렬
    heartRateSamples.sort((a, b) => a.time.localeCompare(b.time));

    data[dateStr] = calculateDailyStats(
      dateStr,
      steps,
      workouts,
      heartRateSamples,
      10000,
      600,
      baseRestingHr
    );
  }

  return data;
}
