import { DailyStats, WorkoutSession, WorkoutType, HeartRateSample } from '../types/health';
import { calculateDailyStats } from './statsCalculator';

// Google Activity Code -> WorkoutType 매핑
// Google Fit Activity Types: 7: Walking, 8: Running, 1: Biking, 72: Strength training, etc.
function mapGoogleActivityType(activityCode: number): { type: WorkoutType; name: string } {
  switch (activityCode) {
    case 8:
      return { type: 'running', name: '야외 러닝' };
    case 1:
      return { type: 'cycling', name: '사이클링' };
    case 82:
    case 83:
    case 84:
      return { type: 'swimming', name: '수영' };
    case 7:
      return { type: 'walking', name: '걷기' };
    case 35:
      return { type: 'hiking', name: '등산' };
    case 72:
    case 73:
      return { type: 'strength', name: '웨이트/근력 트레이닝' };
    case 114:
    case 115:
    case 116:
      return { type: 'hiit', name: '고강도 인터벌(HIIT)' };
    case 100:
      return { type: 'yoga', name: '요가' };
    case 97:
      return { type: 'pilates', name: '필라테스' };
    default:
      return { type: 'other', name: '운동 세션' };
  }
}

/**
 * Google Fit REST API Aggregate 호출 함수
 */
export async function fetchGoogleFitAggregateData(
  accessToken: string,
  startTimeMillis: number,
  endTimeMillis: number
): Promise<any> {
  const response = await fetch('https://fitness.googleapis.com/fitness/v1/users/me/dataset:aggregate', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      aggregateBy: [
        { dataTypeName: 'com.google.step_count.delta' },
        { dataTypeName: 'com.google.calories.expended' },
        { dataTypeName: 'com.google.heart_rate.bpm' },
        { dataTypeName: 'com.google.activity.segment' }
      ],
      bucketByTime: { durationMillis: 86400000 }, // 1일 단위 버킷
      startTimeMillis,
      endTimeMillis
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Google Fit API 호출 실패 (${response.status}): ${errText}`);
  }

  return response.json();
}

/**
 * Google Fit Aggregate 응답 데이터를 DailyStats 맵으로 파싱
 */
export function parseGoogleFitAggregateResponse(apiResponse: any): { [dateStr: string]: DailyStats } {
  const result: { [dateStr: string]: DailyStats } = {};

  if (!apiResponse || !apiResponse.bucket) return result;

  apiResponse.bucket.forEach((bucket: any) => {
    const startTimeMs = parseInt(bucket.startTimeMillis, 10);
    const dateObj = new Date(startTimeMs);
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const d = String(dateObj.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${d}`;

    let totalSteps = 0;
    let caloriesBurned = 0;
    let peakHeartRate = 0;
    const hrSamples: HeartRateSample[] = [];
    const workouts: WorkoutSession[] = [];

    bucket.dataset?.forEach((dataset: any) => {
      const dataTypeName = dataset.dataSourceId || '';

      dataset.point?.forEach((pt: any) => {
        // 1. 걸음 수
        if (dataTypeName.includes('step_count')) {
          const stepVal = pt.value?.[0]?.intVal || 0;
          totalSteps += stepVal;
        }
        // 2. 칼로리
        else if (dataTypeName.includes('calories')) {
          const calVal = pt.value?.[0]?.fpVal || 0;
          caloriesBurned += Math.round(calVal);
        }
        // 3. 심박수 (avg, max, min)
        else if (dataTypeName.includes('heart_rate')) {
          // fpVal: [avg, max, min]
          const maxVal = pt.value?.[1]?.fpVal || pt.value?.[0]?.fpVal || 0;
          if (maxVal > peakHeartRate) {
            peakHeartRate = Math.round(maxVal);
          }
          const ptTime = new Date(parseInt(pt.startTimeNanos || '0', 10) / 1000000);
          hrSamples.push({
            time: `${String(ptTime.getHours()).padStart(2, '0')}:${String(ptTime.getMinutes()).padStart(2, '0')}`,
            bpm: Math.round(maxVal)
          });
        }
        // 4. 활동 세그먼트 (운동)
        else if (dataTypeName.includes('activity.segment')) {
          const actCode = pt.value?.[0]?.intVal || 0;
          // 가만히 있는 경우(3: still), 알 수 없는 경우(4: unknown) 제외
          if (actCode !== 3 && actCode !== 4 && actCode !== 0) {
            const startMs = parseInt(pt.startTimeNanos, 10) / 1000000;
            const endMs = parseInt(pt.endTimeNanos, 10) / 1000000;
            const durMin = Math.max(1, Math.round((endMs - startMs) / 60000));
            const actInfo = mapGoogleActivityType(actCode);

            workouts.push({
              id: `gfit-${dateStr}-${workouts.length}`,
              type: actInfo.type,
              name: actInfo.name,
              startTime: new Date(startMs).toISOString(),
              endTime: new Date(endMs).toISOString(),
              durationMinutes: durMin,
              caloriesBurned: undefined, // 미측정 시 임의 추정값을 넣지 않음
              maxHeartRate: peakHeartRate > 0 ? peakHeartRate : undefined,
              notes: 'Google Fit 동기화'
            });
          }
        }
      });
    });

    result[dateStr] = calculateDailyStats(
      dateStr,
      totalSteps,
      workouts,
      hrSamples
    );
  });

  return result;
}

/**
 * Google Takeout JSON 파일 파서
 */
export function parseGoogleTakeoutJson(jsonText: string): { [dateStr: string]: DailyStats } {
  const data = JSON.parse(jsonText);
  // 단일 객체 또는 리스트 지원
  const items = Array.isArray(data) ? data : (data.days || [data]);
  const result: Record<string, DailyStats> = {};

  items.forEach((item: any) => {
    const dateStr = item.date || item.dateStr;
    if (!dateStr) return;

    const steps = Number(item.steps || item.stepCount || 0);
    const workouts: WorkoutSession[] = (item.workouts || []).map((w: any, idx: number) => ({
      id: `takeout-${dateStr}-${idx}`,
      type: (w.type as WorkoutType) || 'running',
      name: w.name || '구글 피트니스 운동',
      startTime: w.startTime || `${dateStr}T09:00:00`,
      endTime: w.endTime || `${dateStr}T10:00:00`,
      durationMinutes: typeof w.durationMinutes === 'number' ? w.durationMinutes : (typeof w.duration === 'number' ? w.duration : 0),
      caloriesBurned: typeof w.caloriesBurned === 'number' ? w.caloriesBurned : (typeof w.calories === 'number' ? w.calories : undefined),
      maxHeartRate: typeof w.maxHeartRate === 'number' && w.maxHeartRate > 0 ? w.maxHeartRate : (typeof w.maxHr === 'number' && w.maxHr > 0 ? w.maxHr : undefined),
      avgHeartRate: typeof w.avgHeartRate === 'number' && w.avgHeartRate > 0 ? w.avgHeartRate : undefined,
      notes: 'Google Takeout 가져오기'
    }));

    const hrSamples: HeartRateSample[] = item.heartRateSamples || [];
    result[dateStr] = calculateDailyStats(dateStr, steps, workouts, hrSamples);
  });

  return result;
}
