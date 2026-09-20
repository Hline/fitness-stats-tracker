import { describe, it, expect } from 'vitest';
import { calculateDailyStats, calculateMonthlyStats, getHeartRateZone, calculateYearlyStats } from '../services/statsCalculator';
import { parseAppleHealthXml, parseAppleShortcutsJson } from '../services/appleHealthParser';
import { parseGoogleTakeoutJson } from '../services/googleFitService';
import { DEFAULT_WIDGET_CONFIGS, DEFAULT_PROFILES } from '../services/widgetDefaults';
import { registerAccount, loginAccount, createGuestAccount, exportUserDataPackage, importUserDataPackage } from '../services/authService';
import { processRoutesAsync, calculateBoundingBox, simplifyGpsPoints, parseGpxXml } from '../services/routeProcessor';
import { generateDemoRoutes } from '../services/demoRoutes';
import { WorkoutSession, HeartRateSample, DailyStats, DashboardWidgetConfig } from '../types/health';

describe('1. calculateDailyStats (1일 운동통계 산출)', () => {
  it('정상적인 운동 2건과 걸음수가 주어졌을 때 1일 운동횟수, 걸음수, 칼로리, 최고심박수가 정확히 계산된다', () => {
    const workouts: WorkoutSession[] = [
      {
        id: 'w1',
        type: 'running',
        name: '아침 러닝',
        startTime: '2026-09-13T07:00:00',
        endTime: '2026-09-13T07:45:00',
        durationMinutes: 45,
        caloriesBurned: 450,
        maxHeartRate: 174,
        avgHeartRate: 152
      },
      {
        id: 'w2',
        type: 'strength',
        name: '저녁 웨이트',
        startTime: '2026-09-13T19:00:00',
        endTime: '2026-09-13T20:00:00',
        durationMinutes: 60,
        caloriesBurned: 350,
        maxHeartRate: 158,
        avgHeartRate: 125
      }
    ];

    const result = calculateDailyStats('2026-09-13', 10500, workouts);
    expect(result.workoutCount).toBe(2);
    expect(result.totalSteps).toBe(10500);
    expect(result.peakHeartRate).toBe(174);
    expect(result.activeCalories).toBeGreaterThan(800);
  });

  it('운동이 전혀 없는 휴식일인 경우 workoutCount는 0이어야 한다', () => {
    const result = calculateDailyStats('2026-09-14', 4200, []);
    expect(result.workoutCount).toBe(0);
    expect(result.workouts.length).toBe(0);
    expect(result.totalSteps).toBe(4200);
  });

  it('걸음수가 음수로 주어지더라도 0으로 안전하게 보정된다', () => {
    const result = calculateDailyStats('2026-09-15', -500, []);
    expect(result.totalSteps).toBe(0);
  });

  it('심박수 샘플에 운동 중 더 높은 피크가 있으면 해당 피크로 갱신된다', () => {
    const workouts: WorkoutSession[] = [
      {
        id: 'w1',
        type: 'running',
        name: '인터벌',
        startTime: '2026-09-13T08:00:00',
        endTime: '2026-09-13T08:30:00',
        durationMinutes: 30,
        caloriesBurned: 300,
        maxHeartRate: 168
      }
    ];

    const samples: HeartRateSample[] = [
      { time: '2026-09-13T08:15:00', bpm: 178 },
      { time: '2026-09-13T14:00:00', bpm: 85 }
    ];

    const result = calculateDailyStats('2026-09-13', 8000, workouts, samples);
    expect(result.peakHeartRate).toBe(178);
  });
});

describe('2. calculateMonthlyStats (월간 운동통계 산출)', () => {
  it('월간 데이터가 주어졌을 때 월 누적 운동횟수와 종목별 집계가 올바르게 산출된다', () => {
    const dailyMap: Record<string, DailyStats> = {
      '2026-09-01': calculateDailyStats('2026-09-01', 9000, [
        { id: '1', type: 'running', name: '러닝', startTime: '', endTime: '', durationMinutes: 40, caloriesBurned: 400, maxHeartRate: 170 }
      ]),
      '2026-09-02': calculateDailyStats('2026-09-02', 8000, [
        { id: '2', type: 'strength', name: '웨이트', startTime: '', endTime: '', durationMinutes: 50, caloriesBurned: 300, maxHeartRate: 155 },
        { id: '3', type: 'walking', name: '걷기', startTime: '', endTime: '', durationMinutes: 30, caloriesBurned: 120, maxHeartRate: 110 }
      ]),
      '2026-09-03': calculateDailyStats('2026-09-03', 5000, [])
    };

    const monthly = calculateMonthlyStats('2026-09', dailyMap);
    expect(monthly.totalWorkouts).toBe(3);
    expect(monthly.workoutDaysCount).toBe(2);
    expect(monthly.workoutTypeBreakdown.running?.count).toBe(1);
    expect(monthly.workoutTypeBreakdown.strength?.count).toBe(1);
    expect(monthly.workoutTypeBreakdown.walking?.count).toBe(1);
  });
});

describe('3. getHeartRateZone (심박수 존 분석)', () => {
  it('175 BPM은 고강도 Zone 4 또는 5로 분류된다', () => {
    const zone = getHeartRateZone(175, 190);
    expect(zone.zone).toBeGreaterThanOrEqual(4);
    expect(zone.name).toContain('Zone');
  });

  it('낮은 심박수(100 BPM)는 Zone 1 또는 2로 분류된다', () => {
    const zone = getHeartRateZone(100, 190);
    expect(zone.zone).toBeLessThanOrEqual(2);
  });
});

describe('4. parseAppleHealthXml (애플 건강 XML 파서)', () => {
  it('표준 Apple Health XML 스니펫을 정상적으로 파싱하여 DailyStats 맵을 반환한다', () => {
    const sampleXml = `
      <HealthData>
        <Record type="HKQuantityTypeIdentifierStepCount" value="3500" startDate="2026-09-13 09:00:00 +0900" />
        <Record type="HKQuantityTypeIdentifierStepCount" value="2500" startDate="2026-09-13 11:00:00 +0900" />
        <Record type="HKQuantityTypeIdentifierHeartRate" value="168" startDate="2026-09-13 10:15:00 +0900" />
        <Workout workoutActivityType="HKWorkoutActivityTypeRunning" duration="40" totalEnergyBurned="380" startDate="2026-09-13 10:00:00 +0900" endDate="2026-09-13 10:40:00 +0900">
          <MetadataEntry key="HKMaximumHeartRate" value="175 count/min" />
        </Workout>
      </HealthData>
    `;

    const parsed = parseAppleHealthXml(sampleXml);
    expect(parsed['2026-09-13']).toBeDefined();
    const day = parsed['2026-09-13'];
    expect(day.totalSteps).toBe(6000);
    expect(day.workoutCount).toBe(1);
    expect(day.workouts[0].type).toBe('running');
    expect(day.peakHeartRate).toBe(175);
  });

  it('빈 XML이 주어지면 에러 없이 빈 객체를 반환한다', () => {
    const parsed = parseAppleHealthXml('');
    expect(Object.keys(parsed).length).toBe(0);
  });
});

describe('5. parseAppleShortcutsJson (아이폰 단축어 JSON 파서)', () => {
  it('단축어 JSON 형식을 올바르게 파싱한다', () => {
    const jsonStr = JSON.stringify([
      {
        date: '2026-09-13',
        steps: 8500,
        workouts: [
          {
            type: 'cycling',
            name: '사이클',
            durationMinutes: 50,
            caloriesBurned: 400,
            maxHeartRate: 162
          }
        ]
      }
    ]);

    const parsed = parseAppleShortcutsJson(jsonStr);
    expect(parsed['2026-09-13']).toBeDefined();
    expect(parsed['2026-09-13'].workoutCount).toBe(1);
    expect(parsed['2026-09-13'].peakHeartRate).toBe(162);
  });
});

describe('6. 대시보드 위젯 커스터마이징 & 정렬 로직 검증', () => {
  it('기본 위젯 8종이 올바른 순서(order)로 초기화되어 있어야 한다', () => {
    expect(DEFAULT_WIDGET_CONFIGS.length).toBe(8);
    const sorted = [...DEFAULT_WIDGET_CONFIGS].sort((a, b) => a.order - b.order);
    expect(sorted[0].id).toBe('daily-overview');
    expect(sorted[1].id).toBe('activity-rings');
    expect(sorted[2].id).toBe('heart-rate-chart');
  });

  it('위젯을 비활성화(숨김)했을 때 활성화 목록에서 정확히 제외된다', () => {
    const customConfigs: DashboardWidgetConfig[] = DEFAULT_WIDGET_CONFIGS.map(c => 
      c.id === 'hydration' ? { ...c, enabled: false } : c
    );
    const active = customConfigs.filter(c => c.enabled);
    expect(active.length).toBe(7);
    expect(active.some(c => c.id === 'hydration')).toBe(false);
  });

  it('위젯 순서를 바꿨을 때 order 기준으로 재정렬된다', () => {
    const reordered: DashboardWidgetConfig[] = [...DEFAULT_WIDGET_CONFIGS];
    const temp = reordered[0];
    reordered[0] = reordered[1];
    reordered[1] = temp;
    reordered.forEach((c, idx) => { c.order = idx; });

    expect(reordered[0].id).toBe('activity-rings');
    expect(reordered[1].id).toBe('daily-overview');
  });
});

describe('7. 간편 회원가입 및 즉시 사용(게스트) 계정 체계 검증', () => {
  it('아이디, 비밀번호, 이메일, 생년월일, 성별을 입력하여 정식 계정을 생성할 수 있다', () => {
    const regResult = registerAccount({
      username: `testuser_${Date.now()}`,
      password: 'password123',
      email: 'runner@fitstats.test',
      nickname: '러너테스터',
      birthday: '1995-05-20',
      gender: 'male'
    });

    expect(regResult.success).toBe(true);
    expect(regResult.user).toBeDefined();
    expect(regResult.user?.isGuest).toBe(false);
    expect(regResult.user?.birthday).toBe('1995-05-20');
    expect(regResult.user?.gender).toBe('male');
  });

  it('잘못된 이메일이나 너무 짧은 아이디는 가입이 거절된다', () => {
    const invalidEmail = registerAccount({
      username: 'abc',
      password: '123',
      email: 'invalid-email'
    });
    expect(invalidEmail.success).toBe(false);
  });

  it('기본 게스트 계정은 isGuest가 true이어야 한다', () => {
    const guest = createGuestAccount();
    expect(guest.isGuest).toBe(true);
    expect(guest.username).toBe('guest');
  });
});

describe('8. 운동 경로 겹쳐보기 & 백단 비동기 청크 연산 검증', () => {
  const routes = generateDemoRoutes();

  it('1일치(단일 세션)는 isInstant 모드로 즉각 연산된다', async () => {
    const singleRoute = [routes[0]];
    const start = performance.now();
    const result = await processRoutesAsync(singleRoute, true);
    const duration = performance.now() - start;

    expect(result.processedRoutes.length).toBe(1);
    expect(result.totalDistanceKm).toBeGreaterThan(0);
    expect(duration).toBeLessThan(50); // 50ms 미만 즉각 완료!
  });

  it('장기간(다중 세션) 비동기 처리 시 프로그레스가 0%에서 100%까지 호출된다', async () => {
    const progressLog: number[] = [];
    const result = await processRoutesAsync(routes, false, (cur, tot) => {
      progressLog.push(Math.round((cur / tot) * 100));
    });

    expect(result.processedRoutes.length).toBe(routes.length);
    expect(progressLog.length).toBeGreaterThan(0);
    expect(progressLog[progressLog.length - 1]).toBe(100);
  });

  it('표준 GPX XML 문자열을 파싱하여 WorkoutRoute로 변환한다', () => {
    const gpxSnippet = `
      <gpx version="1.1" creator="Strava">
        <trk><trkseg>
          <trkpt lat="37.5120" lon="127.0010"><ele>15.2</ele></trkpt>
          <trkpt lat="37.5140" lon="127.0030"><ele>16.0</ele></trkpt>
        </trkseg></trk>
      </gpx>
    `;
    const route = parseGpxXml(gpxSnippet, '테스트 GPX 코스');
    expect(route).not.toBeNull();
    expect(route?.points.length).toBe(2);
    expect(route?.points[0].lat).toBe(37.5120);
  });
});

describe('9. 기기 간 데이터 내보내기/가져오기 동기화 검증', () => {
  it('동기화 JSON 코드를 정상적으로 파싱하고 계정을 복원할 수 있다', () => {
    const mockSyncPayload = JSON.stringify({
      version: '1.0',
      exportedAt: new Date().toISOString(),
      account: {
        id: 'sync_user_123',
        username: 'synced_runner',
        email: 'runner@sync.test',
        passwordHash: 'h_12345',
        nickname: '동기화러너',
        avatarColor: 'bg-emerald-400',
        createdAt: new Date().toISOString(),
        isGuest: false
      },
      workoutData: {},
      profiles: []
    });

    // importUserDataPackage 호출 검증
    const res = importUserDataPackage(mockSyncPayload);
    expect(res.success).toBe(true);
    expect(res.user?.username).toBe('synced_runner');
  });

  it('잘못된 동기화 코드는 거절된다', () => {
    const res = importUserDataPackage('invalid json');
    expect(res.success).toBe(false);
  });
});

describe('10. 미측정 데이터 임의값 주입 방지 및 정확성 검증 (Zero Arbitrary Fallbacks)', () => {
  it('Apple Health 단축어에서 칼로리/심박수가 미측정(생략)된 경우 임의 추정값을 채우지 않고 undefined를 유지한다', () => {
    const jsonStr = JSON.stringify([
      {
        date: '2026-09-19',
        steps: 5000,
        workouts: [
          {
            type: 'running',
            name: '조깅',
            durationMinutes: 20
            // caloriesBurned, maxHeartRate 생략
          }
        ]
      }
    ]);

    const parsed = parseAppleShortcutsJson(jsonStr);
    const day = parsed['2026-09-19'];
    expect(day.workouts[0].caloriesBurned).toBeUndefined();
    expect(day.workouts[0].maxHeartRate).toBeUndefined();
    expect(day.peakHeartRate).toBe(0); // 0은 UI에서 N/A로 표시
  });

  it('Google Takeout에서 칼로리/심박수가 미측정(생략)된 경우 임의 추정값(300, 165 등)을 채우지 않는다', () => {
    const jsonStr = JSON.stringify({
      days: [
        {
          date: '2026-09-19',
          steps: 4000,
          workouts: [
            {
              type: 'strength',
              name: '홈트레이닝',
              durationMinutes: 30
              // caloriesBurned, maxHeartRate 생략
            }
          ]
        }
      ]
    });

    const parsed = parseGoogleTakeoutJson(jsonStr);
    const day = parsed['2026-09-19'];
    expect(day.workouts[0].caloriesBurned).toBeUndefined();
    expect(day.workouts[0].maxHeartRate).toBeUndefined();
    expect(day.peakHeartRate).toBe(0);
  });

  it('심박수가 0 이하일 때 getHeartRateZone은 Zone 0 및 미측정(N/A)을 반환해야 한다', () => {
    const zone0 = getHeartRateZone(0);
    expect(zone0.zone).toBe(0);
    expect(zone0.name).toContain('미측정');
    expect(zone0.name).toContain('N/A');
  });
});

describe('11. 네이티브 HealthKit 브릿지 및 플랫폼 감지 검증', () => {
  it('테스트/웹 환경에서는 isNativePlatform이 false를 반환하고 플랫폼은 web이어야 한다', async () => {
    const { isNativePlatform, getPlatformName } = await import('../services/healthKitNativeService');
    expect(isNativePlatform()).toBe(false);
    expect(getPlatformName()).toBe('web');
  });

  it('비네이티브(웹) 환경에서 syncFromNativeHealth 호출 시 충돌 없이 안내 메시지를 반환한다', async () => {
    const { syncFromNativeHealth } = await import('../services/healthKitNativeService');
    const result = await syncFromNativeHealth(7);
    expect(result.success).toBe(false);
    expect(result.message).toContain('네이티브 앱 환경에서만');
  });
});

describe('12. 연간 통계(YearlyStats) 계산 로직 검증', () => {
  it('1년치 데이터를 바탕으로 총 운동시간, 총 칼로리, 월별 통계를 정확히 집계한다', () => {
    const mockDailyStats: Record<string, DailyStats> = {
      '2026-01-15': {
        date: '2026-01-15',
        totalSteps: 8000,
        stepGoal: 10000,
        activeCalories: 300,
        calorieGoal: 500,
        totalCalories: 300,
        workoutCount: 1,
        peakHeartRate: 150,
        heartRateSamples: [],
        workouts: [{
          id: 'w1',
          type: 'running',
          name: '겨울 러닝',
          startTime: '2026-01-15T07:00:00',
          endTime: '2026-01-15T07:45:00',
          durationMinutes: 45,
          caloriesBurned: 300
        }]
      },
      '2026-05-20': {
        date: '2026-05-20',
        totalSteps: 10000,
        stepGoal: 10000,
        activeCalories: 500,
        calorieGoal: 500,
        totalCalories: 500,
        workoutCount: 1,
        peakHeartRate: 165,
        heartRateSamples: [],
        workouts: [{
          id: 'w2',
          type: 'cycling',
          name: '봄철 라이딩',
          startTime: '2026-05-20T09:00:00',
          endTime: '2026-05-20T10:00:00',
          durationMinutes: 60,
          caloriesBurned: 500
        }]
      }
    };

    const yearly = calculateYearlyStats(2026, mockDailyStats);
    expect(yearly.year).toBe(2026);
    expect(yearly.totalWorkouts).toBe(2);
    expect(yearly.totalCalories).toBe(800);
    expect(yearly.totalSteps).toBe(18000);
    expect(yearly.peakHeartRate).toBe(165);
    expect(yearly.monthlySummaries.length).toBe(12);
    expect(yearly.monthlySummaries[0].workouts).toBe(1); // 1월
    expect(yearly.monthlySummaries[4].workouts).toBe(1); // 5월
    expect(yearly.workoutTypeBreakdown['running']?.count).toBe(1);
    expect(yearly.workoutTypeBreakdown['cycling']?.count).toBe(1);
    expect(yearly.workoutTypeBreakdown['running']?.minutes).toBe(45);
    expect(yearly.workoutTypeBreakdown['cycling']?.minutes).toBe(60);
  });
});




