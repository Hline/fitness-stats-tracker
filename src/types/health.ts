export type WorkoutType = 
  | 'running' 
  | 'strength' 
  | 'cycling' 
  | 'swimming' 
  | 'walking' 
  | 'hiking' 
  | 'hiit' 
  | 'yoga' 
  | 'pilates' 
  | 'other';

export interface WorkoutSession {
  id: string;
  type: WorkoutType;
  name: string;
  startTime: string; // ISO String (e.g. 2026-09-13T07:30:00)
  endTime: string;   // ISO String
  durationMinutes: number;
  caloriesBurned?: number;
  avgHeartRate?: number;
  maxHeartRate?: number; // 운동시간 동안 최고 심박수 (미측정 시 undefined/0)
  distanceKm?: number;
  notes?: string;
}

export interface HeartRateSample {
  time: string; // HH:mm or ISO
  bpm: number;
}

export interface DailyStats {
  date: string; // YYYY-MM-DD
  totalSteps: number;
  stepGoal: number;
  activeCalories: number;
  calorieGoal: number;
  totalCalories: number; // 활동 + 기초
  workoutCount: number;  // 1일 운동 횟수
  workouts: WorkoutSession[];
  peakHeartRate: number; // 운동시간 동안 최고 심박수
  restingHeartRate?: number;
  heartRateSamples: HeartRateSample[];
  waterIntakeMl?: number; // 수분 섭취량 (ml)
  sleepHours?: number;     // 수면 시간 (시간)
  recoveryScore?: number;  // 회복 점수 (0-100)
  updatedAt?: string;      // 최종 수정 시각 (증분 동기화용 ISO string)
}

export interface MonthlyStats {
  month: string; // YYYY-MM
  monthName: string;
  totalWorkouts: number;
  workoutDaysCount: number;
  totalSteps: number;
  totalCalories: number;
  avgDailySteps: number;
  avgPeakHeartRate: number;
  dailyData: { [dateStr: string]: DailyStats };
  workoutTypeBreakdown: { [type in WorkoutType]?: { count: number; minutes: number; calories: number } };
}

export type SnsRatio = '9:16' | '1:1' | '16:9';
export type SnsTheme = 'cyber-neon' | 'apple-ring' | 'modern-dark' | 'sunset-glow';

export interface SnsShareConfig {
  ratio: SnsRatio;
  theme: SnsTheme;
  customMessage: string;
  userName: string;
  dateStr: string;
  showWorkouts: boolean;
  showHeartRate: boolean;
  showSteps: boolean;
  showCalories: boolean;
}

// 대시보드 위젯 식별자
export type WidgetId = 
  | 'daily-overview'     // 1일 4대 핵심 지표 (운동횟수, 걸음수, 칼로리, 최고심박수)
  | 'activity-rings'     // 3단 활동 서클 링
  | 'heart-rate-chart'   // 일일 심박수 추이 & 운동 피크 SVG 차트
  | 'cardio-zones'       // Zone 1~5 심박존 체류 시간 분석
  | 'workout-timeline'   // 오늘의 운동 세션 타임라인
  | 'hydration'          // 수분 섭취 트래커
  | 'recovery-sleep'     // 수면 및 컨디션 회복 배터리
  | 'route-map';         // 운동 경로 보기 (데일리 오버레이)

export interface DashboardWidgetConfig {
  id: WidgetId;
  title: string;
  description: string;
  category: 'core' | 'health' | 'lifestyle';
  enabled: boolean;
  order: number;
}

// 사용자 프로필 및 계정 관리
export interface UserProfile {
  id: string;
  name: string;
  email?: string;
  avatarColor: string;
  googleConnected: boolean;
  createdAt: string;
  widgetConfigs: DashboardWidgetConfig[];
}

// 문의 및 요청하기
export type InquiryType = 'feature' | 'bug' | 'sync' | 'general';

export interface UserInquiry {
  id: string;
  userId: string;
  userName: string;
  type: InquiryType;
  title: string;
  content: string;
  email?: string;
  createdAt: string;
  status: 'pending' | 'reviewed';
}

// 클라우드 DB 저장 vs 로컬 전용 저장 항목 설정 (필드별 동기화 스코프)
export interface SyncScopeConfig {
  steps: boolean;          // 걸음 수
  activeCalories: boolean; // 소모 칼로리
  workouts: boolean;       // 운동 세션 기록
  heartRate: boolean;      // 최고 및 평균 심박수
  routes: boolean;         // GPS 운동 경로
  lifestyle: boolean;      // 수분/수면 등 라이프스타일
}

export const DEFAULT_SYNC_SCOPE: SyncScopeConfig = {
  steps: true,
  activeCalories: true,
  workouts: true,
  heartRate: true,
  routes: false,
  lifestyle: false
};
