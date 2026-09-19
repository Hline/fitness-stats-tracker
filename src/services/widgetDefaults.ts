import { DashboardWidgetConfig, UserProfile } from '../types/health';

export const DEFAULT_WIDGET_CONFIGS: DashboardWidgetConfig[] = [
  {
    id: 'daily-overview',
    title: '1일 4대 핵심 지표',
    description: '운동 횟수, 걸음 수, 소모 칼로리, 운동 중 최고 심박수 요약 카드',
    category: 'core',
    enabled: true,
    order: 0
  },
  {
    id: 'activity-rings',
    title: '3단 활동 링 (Activity Rings)',
    description: '칼로리, 운동 시간, 걸음 수 종합 달성 링',
    category: 'core',
    enabled: true,
    order: 1
  },
  {
    id: 'heart-rate-chart',
    title: '일일 심박수 추이 & 운동 피크',
    description: '24시간 심박 곡선과 운동 구간 피크 심박수 인터랙티브 차트',
    category: 'health',
    enabled: true,
    order: 2
  },
  {
    id: 'cardio-zones',
    title: '심박존(Cardio Zone) 체류 시간',
    description: 'Zone 1~5 심폐/지방연소 구간별 체류 시간 및 강도 분석',
    category: 'health',
    enabled: true,
    order: 3
  },
  {
    id: 'workout-timeline',
    title: '오늘의 운동 세션 타임라인',
    description: '완료한 운동 종목, 시간, 칼로리, 최고 심박수 상세 목록',
    category: 'core',
    enabled: true,
    order: 4
  },
  {
    id: 'hydration',
    title: '수분 섭취 트래커 (2,000ml)',
    description: '일일 수분 보충량 및 물 한 잔 원클릭 추가',
    category: 'lifestyle',
    enabled: true,
    order: 5
  },
  {
    id: 'recovery-sleep',
    title: '수면 및 회복 컨디션 배터리',
    description: '수면 시간 분석 및 오늘 트레이닝 준비도 점수',
    category: 'lifestyle',
    enabled: true,
    order: 6
  }
];

export const DEFAULT_PROFILES: UserProfile[] = [
  {
    id: 'user-default-1',
    name: '오운완러',
    email: 'runner@fitstats.app',
    avatarColor: 'bg-emerald-400',
    googleConnected: true,
    createdAt: '2026-09-01T00:00:00Z',
    widgetConfigs: DEFAULT_WIDGET_CONFIGS
  },
  {
    id: 'user-default-2',
    name: '헬스마니아',
    email: 'muscle@fitstats.app',
    avatarColor: 'bg-purple-400',
    googleConnected: false,
    createdAt: '2026-09-05T00:00:00Z',
    widgetConfigs: DEFAULT_WIDGET_CONFIGS
  }
];
