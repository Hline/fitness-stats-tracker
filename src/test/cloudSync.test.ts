import { describe, it, expect, beforeEach } from 'vitest';
import { 
  getLastSyncedAt, 
  setLastSyncedAt, 
  syncIncrementalWithCloud,
  getSyncScopeConfig,
  saveSyncScopeConfig,
  hasConfiguredInitialSyncScope
} from '../services/cloudSyncService';
import { saveSupabaseConfig, isSupabaseConfigured, getSupabaseConfig } from '../services/supabaseClient';
import { DailyStats } from '../types/health';

describe('cloudSyncService & supabaseClient (증분 동기화 및 클라우드 설정)', () => {
  const mockStorage: Record<string, string> = {};

  beforeEach(() => {
    for (const k in mockStorage) delete mockStorage[k];
    (globalThis as any).localStorage = {
      getItem: (key: string) => mockStorage[key] || null,
      setItem: (key: string, value: string) => { mockStorage[key] = value; },
      removeItem: (key: string) => { delete mockStorage[key]; },
      clear: () => { for (const k in mockStorage) delete mockStorage[k]; }
    };
  });

  it('Supabase 미설정 상태일 때 isSupabaseConfigured는 false를 반환해야 한다', () => {
    saveSupabaseConfig({ url: '', anonKey: '' });
    expect(isSupabaseConfigured()).toBe(false);
  });

  it('Supabase 설정을 저장하고 정상적으로 조회할 수 있어야 한다', () => {
    const testConfig = {
      url: 'https://testproject.supabase.co',
      anonKey: 'test_anon_key_12345'
    };
    saveSupabaseConfig(testConfig);
    expect(isSupabaseConfigured()).toBe(true);
    expect(getSupabaseConfig().url).toBe('https://testproject.supabase.co');
  });

  it('마지막 동기화 시점(lastSyncedAt)을 저장하고 불러올 수 있어야 한다', () => {
    const userId = 'user_test_99';
    expect(getLastSyncedAt(userId)).toBeNull();

    const timestamp = '2026-09-19T12:34:56.000Z';
    setLastSyncedAt(userId, timestamp);
    expect(getLastSyncedAt(userId)).toBe(timestamp);
  });

  it('Supabase 미설정 시 syncIncrementalWithCloud는 적절한 안내 메시지와 실패를 반환해야 한다', async () => {
    saveSupabaseConfig({ url: '', anonKey: '' });
    const localData: Record<string, DailyStats> = {
      '2026-09-19': {
        date: '2026-09-19',
        totalSteps: 7000,
        stepGoal: 10000,
        activeCalories: 350,
        calorieGoal: 600,
        totalCalories: 2150,
        workoutCount: 1,
        workouts: [],
        peakHeartRate: 160,
        heartRateSamples: []
      }
    };

    const res = await syncIncrementalWithCloud('user_123', localData);
    expect(res.success).toBe(false);
    expect(res.message).toContain('설정');
  });

  it('동기화 항목 설정(SyncScopeConfig) 기본값 및 저장/조회가 정상 작동해야 한다', () => {
    const userId = 'user_scope_1';
    expect(hasConfiguredInitialSyncScope(userId)).toBe(false);

    const defaultScope = getSyncScopeConfig(userId);
    expect(defaultScope.steps).toBe(true);
    expect(defaultScope.workouts).toBe(true);
    expect(defaultScope.heartRate).toBe(true);

    // 사용자가 일부 항목만 DB 저장하도록 설정 변경
    const customScope = {
      ...defaultScope,
      heartRate: false,
      routes: false
    };
    saveSyncScopeConfig(customScope, userId);

    expect(hasConfiguredInitialSyncScope(userId)).toBe(true);
    const saved = getSyncScopeConfig(userId);
    expect(saved.steps).toBe(true);
    expect(saved.heartRate).toBe(false);
    expect(saved.routes).toBe(false);
  });
});

