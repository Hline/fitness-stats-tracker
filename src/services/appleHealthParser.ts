import { DailyStats, WorkoutSession, WorkoutType, HeartRateSample } from '../types/health';
import { calculateDailyStats } from './statsCalculator';

// HKWorkoutActivityType -> WorkoutType 매핑
function mapActivityType(hkType: string): WorkoutType {
  const lower = hkType.toLowerCase();
  if (lower.includes('running')) return 'running';
  if (lower.includes('cycling')) return 'cycling';
  if (lower.includes('swimming')) return 'swimming';
  if (lower.includes('walking')) return 'walking';
  if (lower.includes('hiking')) return 'hiking';
  if (lower.includes('strength') || lower.includes('functionalstrength') || lower.includes('traditionalstrength')) return 'strength';
  if (lower.includes('highintensityintervaltraining') || lower.includes('hiit')) return 'hiit';
  if (lower.includes('yoga') || lower.includes('mindandbody')) return 'yoga';
  if (lower.includes('pilates')) return 'pilates';
  return 'other';
}

function mapActivityName(type: WorkoutType): string {
  const names: Record<WorkoutType, string> = {
    running: '러닝',
    strength: '근력 운동',
    cycling: '사이클링',
    swimming: '수영',
    walking: '걷기',
    hiking: '등산',
    hiit: '고강도 인터벌(HIIT)',
    yoga: '요가',
    pilates: '필라테스',
    other: '기타 운동'
  };
  return names[type] || '운동';
}

/**
 * 날짜 문자열 정규화 (YYYY-MM-DD 추출)
 */
function extractDateStr(rawDate: string): string {
  // rawDate: "2026-09-13 08:15:00 +0900" or ISO format
  if (!rawDate) return '';
  const match = rawDate.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    return `${match[1]}-${match[2]}-${match[3]}`;
  }
  return '';
}

/**
 * Apple Health export.xml 파싱 (브라우저 메모리 안전 정규식 및 청크 파싱)
 */
export function parseAppleHealthXml(xmlText: string): { [dateStr: string]: DailyStats } {
  const dailyStepsMap: Record<string, number> = {};
  const dailyWorkoutsMap: Record<string, WorkoutSession[]> = {};
  const dailyHrSamplesMap: Record<string, HeartRateSample[]> = {};

  // 1. 걸음수 파싱
  const stepRegex = /<Record[^>]+type="HKQuantityTypeIdentifierStepCount"[^>]+value="([^"]+)"[^>]+startDate="([^"]+)"/g;
  let match: RegExpExecArray | null;
  while ((match = stepRegex.exec(xmlText)) !== null) {
    const val = parseFloat(match[1]);
    const dateStr = extractDateStr(match[2]);
    if (dateStr && !isNaN(val)) {
      dailyStepsMap[dateStr] = (dailyStepsMap[dateStr] || 0) + val;
    }
  }

  // 2. 심박수 파싱
  const hrRegex = /<Record[^>]+type="HKQuantityTypeIdentifierHeartRate"[^>]+value="([^"]+)"[^>]+startDate="([^"]+)"/g;
  while ((match = hrRegex.exec(xmlText)) !== null) {
    const bpm = parseFloat(match[1]);
    const dateStr = extractDateStr(match[2]);
    const timeMatch = match[2].match(/(\d{2}):(\d{2})/);
    const timeStr = timeMatch ? `${timeMatch[1]}:${timeMatch[2]}` : '00:00';
    if (dateStr && !isNaN(bpm) && bpm > 30 && bpm < 250) {
      if (!dailyHrSamplesMap[dateStr]) dailyHrSamplesMap[dateStr] = [];
      // 너무 많은 샘플이 몰리지 않도록 일부 샘플링
      if (dailyHrSamplesMap[dateStr].length < 60) {
        dailyHrSamplesMap[dateStr].push({ time: timeStr, bpm: Math.round(bpm) });
      }
    }
  }

  // 3. 운동 세션 파싱 (<Workout ... > ... </Workout> 또는 단일 태그)
  const workoutRegex = /<Workout\s+([^>]+)(?:\/>|>([\s\S]*?)<\/Workout>)/g;
  let wIndex = 0;
  while ((match = workoutRegex.exec(xmlText)) !== null) {
    const attrs = match[1];
    const innerContent = match[2] || '';

    const typeMatch = attrs.match(/workoutActivityType="([^"]+)"/);
    const durMatch = attrs.match(/duration="([^"]+)"/);
    const calMatch = attrs.match(/totalEnergyBurned="([^"]+)"/);
    const startMatch = attrs.match(/startDate="([^"]+)"/);
    const endMatch = attrs.match(/endDate="([^"]+)"/);
    const distMatch = attrs.match(/totalDistance="([^"]+)"/);

    const startDateStr = startMatch ? startMatch[1] : '';
    const dateStr = extractDateStr(startDateStr);
    if (!dateStr) continue;

    const workoutType = mapActivityType(typeMatch ? typeMatch[1] : '');

    // 운동 시간(분): duration 속성 파싱, 없으면 시작/종료 시각 차이로 계산, 둘 다 없으면 0
    let durationMinutes = 0;
    if (durMatch) {
      durationMinutes = Math.round(parseFloat(durMatch[1]));
    } else if (startMatch && endMatch) {
      const startMs = new Date(startMatch[1]).getTime();
      const endMs = new Date(endMatch[1]).getTime();
      if (!isNaN(startMs) && !isNaN(endMs) && endMs > startMs) {
        durationMinutes = Math.round((endMs - startMs) / 60000);
      }
    }

    // 소모 칼로리: 측정되지 않은 경우 임의값을 채우지 않고 undefined 유지
    const caloriesBurned = calMatch ? Math.round(parseFloat(calMatch[1])) : undefined;
    const distanceKm = distMatch ? parseFloat(parseFloat(distMatch[1]).toFixed(2)) : undefined;

    // 메타데이터에서 최고 심박수 추출 (미측정 시 임의 추정값을 절대 생성하지 않고 undefined)
    let maxHeartRate: number | undefined = undefined;
    const maxHrMatch = innerContent.match(/key="HKMaximumHeartRate"\s+value="(\d+)/);
    if (maxHrMatch) {
      maxHeartRate = parseInt(maxHrMatch[1], 10);
    }

    // 평균 심박수: 측정 기록이 없으면 임의 비율(0.85)을 곱하지 않고 undefined 유지
    let avgHeartRate: number | undefined = undefined;
    const avgHrMatch = innerContent.match(/key="HKAverageHeartRate"\s+value="(\d+)/);
    if (avgHrMatch) {
      avgHeartRate = parseInt(avgHrMatch[1], 10);
    }

    const session: WorkoutSession = {
      id: `apple-${dateStr}-${wIndex++}`,
      type: workoutType,
      name: mapActivityName(workoutType),
      startTime: startDateStr,
      endTime: endMatch ? endMatch[1] : startDateStr,
      durationMinutes,
      caloriesBurned,
      maxHeartRate,
      avgHeartRate,
      distanceKm,
      notes: '아이폰 건강(Apple Health) 동기화'
    };

    if (!dailyWorkoutsMap[dateStr]) dailyWorkoutsMap[dateStr] = [];
    dailyWorkoutsMap[dateStr].push(session);
  }

  // 4. DailyStats 객체로 통합 변환
  const allDates = new Set([
    ...Object.keys(dailyStepsMap),
    ...Object.keys(dailyWorkoutsMap),
    ...Object.keys(dailyHrSamplesMap)
  ]);

  const result: Record<string, DailyStats> = {};
  allDates.forEach(dateStr => {
    const steps = Math.round(dailyStepsMap[dateStr] || 0);
    const workouts = dailyWorkoutsMap[dateStr] || [];
    const hrSamples = dailyHrSamplesMap[dateStr] || [];

    result[dateStr] = calculateDailyStats(dateStr, steps, workouts, hrSamples);
  });

  return result;
}

/**
 * 아이폰 단축어(Shortcuts) JSON 임포트 파서
 */
export function parseAppleShortcutsJson(jsonText: string): { [dateStr: string]: DailyStats } {
  const parsed = JSON.parse(jsonText);
  const items = Array.isArray(parsed) ? parsed : [parsed];
  const result: Record<string, DailyStats> = {};

  items.forEach((item, idx) => {
    const dateStr = item.date || item.dateStr || extractDateStr(item.timestamp || new Date().toISOString());
    if (!dateStr) return;

    const steps = Number(item.steps || item.stepCount || 0);
    const rawWorkouts = item.workouts || [];
    const workouts: WorkoutSession[] = rawWorkouts.map((w: any, wIdx: number) => ({
      id: `shortcut-${dateStr}-${idx}-${wIdx}`,
      type: (w.type as WorkoutType) || 'other',
      name: w.name || mapActivityName((w.type as WorkoutType) || 'other'),
      startTime: w.startTime || `${dateStr}T00:00:00`,
      endTime: w.endTime || `${dateStr}T00:00:00`,
      durationMinutes: typeof w.durationMinutes === 'number' ? w.durationMinutes : (typeof w.duration === 'number' ? w.duration : 0),
      caloriesBurned: typeof w.caloriesBurned === 'number' ? w.caloriesBurned : (typeof w.calories === 'number' ? w.calories : undefined),
      maxHeartRate: typeof w.maxHeartRate === 'number' ? w.maxHeartRate : (typeof w.maxHr === 'number' ? w.maxHr : undefined),
      avgHeartRate: typeof w.avgHeartRate === 'number' ? w.avgHeartRate : undefined,
      distanceKm: typeof w.distanceKm === 'number' ? w.distanceKm : undefined,
      notes: w.notes || '아이폰 단축어 임포트'
    }));

    const hrSamples: HeartRateSample[] = item.heartRateSamples || [];

    result[dateStr] = calculateDailyStats(dateStr, steps, workouts, hrSamples);
  });

  return result;
}
