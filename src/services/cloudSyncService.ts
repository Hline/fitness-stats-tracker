import { getSupabase, isSupabaseConfigured } from './supabaseClient';
import { DailyStats, WorkoutSession, SyncScopeConfig, DEFAULT_SYNC_SCOPE } from '../types/health';
import { UserAccount, RegisterRequest, LoginRequest } from '../types/auth';

const LAST_SYNCED_PREFIX = 'fitstats_last_synced_';
const SYNC_SCOPE_PREFIX = 'fitstats_sync_scope_';
const INITIAL_CONFIGURED_PREFIX = 'fitstats_scope_configured_';

export interface SyncResult {
  success: boolean;
  message: string;
  uploadedCount?: number;
  downloadedCount?: number;
  mergedData?: Record<string, DailyStats>;
  lastSyncedAt?: string;
}

// 1. 기기별 마지막 동기화 일시 관리
export function getLastSyncedAt(userId: string): string | null {
  if (typeof localStorage === 'undefined') return null;
  return localStorage.getItem(`${LAST_SYNCED_PREFIX}${userId}`) || null;
}

export function setLastSyncedAt(userId: string, timestamp: string): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(`${LAST_SYNCED_PREFIX}${userId}`, timestamp);
}

// 1-1. DB 저장 vs 로컬 전용 항목 설정(SyncScopeConfig) 관리
export function getSyncScopeConfig(userId = 'default'): SyncScopeConfig {
  if (typeof localStorage === 'undefined') return { ...DEFAULT_SYNC_SCOPE };
  try {
    const saved = localStorage.getItem(`${SYNC_SCOPE_PREFIX}${userId}`);
    if (saved) return JSON.parse(saved);
  } catch {}
  return { ...DEFAULT_SYNC_SCOPE };
}

export function saveSyncScopeConfig(config: SyncScopeConfig, userId = 'default'): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(`${SYNC_SCOPE_PREFIX}${userId}`, JSON.stringify(config));
  localStorage.setItem(`${INITIAL_CONFIGURED_PREFIX}${userId}`, 'true');
}

export function hasConfiguredInitialSyncScope(userId = 'default'): boolean {
  if (typeof localStorage === 'undefined') return false;
  return localStorage.getItem(`${INITIAL_CONFIGURED_PREFIX}${userId}`) === 'true';
}

// 2. Supabase 클라우드 회원가입
export async function registerWithCloud(
  req: RegisterRequest
): Promise<{ success: boolean; message: string; user?: UserAccount }> {
  const supabase = getSupabase();
  if (!supabase) {
    return { success: false, message: 'Supabase 연결이 설정되어 있지 않습니다.' };
  }

  try {
    const trimmedUsername = req.username.trim().toLowerCase();
    const email = req.email.trim();

    // 1) Supabase Auth 회원가입
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password: req.password,
      options: {
        data: {
          username: trimmedUsername,
          nickname: req.nickname?.trim() || req.username
        }
      }
    });

    if (authError || !authData.user) {
      return { success: false, message: authError?.message || '클라우드 회원가입에 실패했습니다.' };
    }

    const userId = authData.user.id;
    const avatarColors = ['bg-emerald-400', 'bg-cyan-400', 'bg-orange-400', 'bg-purple-400', 'bg-rose-400', 'bg-teal-400'];
    const avatarColor = avatarColors[Math.floor(Math.random() * avatarColors.length)];

    // 2) fitstats_profiles 테이블에 프로필 저장
    const { error: profileError } = await supabase.from('fitstats_profiles').upsert({
      id: userId,
      username: trimmedUsername,
      email,
      nickname: req.nickname?.trim() || req.username,
      birthday: req.birthday || null,
      gender: req.gender || 'unspecified',
      avatar_color: avatarColor,
      updated_at: new Date().toISOString()
    });

    if (profileError) {
      console.warn('프로필 저장 경고 (테이블 미생성 가능성):', profileError);
    }

    const newUser: UserAccount = {
      id: userId,
      username: trimmedUsername,
      email,
      passwordHash: '',
      nickname: req.nickname?.trim() || req.username,
      birthday: req.birthday,
      gender: req.gender || 'unspecified',
      avatarColor,
      createdAt: new Date().toISOString(),
      isGuest: false
    };

    return { success: true, message: '클라우드 계정이 생성되었습니다!', user: newUser };
  } catch (err: any) {
    return { success: false, message: err.message || '서버 통신 중 오류가 발생했습니다.' };
  }
}

// 3. Supabase 클라우드 로그인
export async function loginWithCloud(
  req: LoginRequest
): Promise<{ success: boolean; message: string; user?: UserAccount }> {
  const supabase = getSupabase();
  if (!supabase) {
    return { success: false, message: 'Supabase 연결이 설정되어 있지 않습니다.' };
  }

  try {
    const input = req.username.trim();
    let email = input;

    // 아이디로 입력한 경우 이메일 조회
    if (!input.includes('@')) {
      const { data: profile } = await supabase
        .from('fitstats_profiles')
        .select('email')
        .eq('username', input.toLowerCase())
        .maybeSingle();

      if (profile && profile.email) {
        email = profile.email;
      } else {
        // 혹시 가입 시 생성된 기본 이메일 형태인 경우
        email = `${input.toLowerCase()}@fitstats.local`;
      }
    }

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password: req.password
    });

    if (authError || !authData.user) {
      return { success: false, message: authError?.message || '아이디 또는 비밀번호가 올바르지 않습니다.' };
    }

    const userId = authData.user.id;

    // 프로필 정보 조회
    const { data: profile } = await supabase
      .from('fitstats_profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    const user: UserAccount = {
      id: userId,
      username: profile?.username || authData.user.user_metadata?.username || input,
      email: authData.user.email || '',
      passwordHash: '',
      nickname: profile?.nickname || authData.user.user_metadata?.nickname || input,
      birthday: profile?.birthday,
      gender: profile?.gender || 'unspecified',
      avatarColor: profile?.avatar_color || 'bg-emerald-400',
      createdAt: profile?.created_at || new Date().toISOString(),
      isGuest: false
    };

    return { success: true, message: '클라우드 계정으로 로그인되었습니다.', user };
  } catch (err: any) {
    return { success: false, message: err.message || '로그인 중 오류가 발생했습니다.' };
  }
}

// 4. Supabase 로그아웃
export async function logoutCloud(): Promise<void> {
  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase.auth.signOut();
    } catch {
      // 무시
    }
  }
}

/**
 * 5. 양방향 증분 동기화 엔진 (Incremental Sync Engine)
 * - 로컬 데이터 중 lastSyncedAt 이후 수정된 항목만 선별하여 Supabase에 Upsert (소급 적용)
 * - Supabase에서 lastSyncedAt 이후 수정된 레코드만 수신하여 로컬 데이터와 결합
 */
export async function syncIncrementalWithCloud(
  userId: string,
  localData: Record<string, DailyStats>,
  customScope?: SyncScopeConfig
): Promise<SyncResult> {
  const supabase = getSupabase();
  if (!supabase || !isSupabaseConfigured()) {
    return {
      success: false,
      message: 'Supabase 클라우드 설정(URL 및 Anon Key)이 등록되지 않았습니다.'
    };
  }

  const syncScope = customScope || getSyncScopeConfig(userId);
  const syncStartTime = new Date().toISOString();
  const lastSynced = getLastSyncedAt(userId);

  try {
    // ----------------------------------------------------
    // STEP 1: 로컬 ➜ 클라우드 업로드 (증분 대상 선별 및 필드 스코프 적용)
    // ----------------------------------------------------
    const datesToUpload = Object.keys(localData).filter(dateStr => {
      const item = localData[dateStr];
      if (!lastSynced) return true; // 첫 동기화면 전체 업로드
      return !item.updatedAt || item.updatedAt > lastSynced;
    });

    let uploadedDays = 0;
    if (datesToUpload.length > 0) {
      const dailyRows = datesToUpload.map(d => {
        const item = localData[d];
        return {
          user_id: userId,
          date: d,
          // 사용자가 "DB 저장"으로 설정한 항목만 클라우드 전송 (미선택 시 null 유지로 로컬 전용 보존)
          steps: syncScope.steps ? (item.totalSteps ?? null) : null,
          active_calories: syncScope.activeCalories ? (item.activeCalories ?? null) : null,
          total_calories: syncScope.activeCalories ? (item.totalCalories ?? null) : null,
          workout_count: syncScope.workouts ? (item.workoutCount ?? null) : null,
          max_workout_hr: syncScope.heartRate ? (item.peakHeartRate ?? null) : null,
          resting_hr: syncScope.heartRate ? (item.restingHeartRate ?? null) : null,
          hourly_steps: [],
          heart_rate_samples: syncScope.heartRate ? (item.heartRateSamples || []) : [],
          updated_at: item.updatedAt || syncStartTime
        };
      });

      // Daily Stats Upsert
      const { error: dailyErr } = await supabase
        .from('fitstats_daily_stats')
        .upsert(dailyRows, { onConflict: 'user_id,date' });

      if (dailyErr) {
        console.error('클라우드 일별 통계 업로드 오류:', dailyErr);
        throw new Error(`일별 데이터 동기화 실패: ${dailyErr.message}`);
      }

      // 개별 운동 세션 Upsert (운동 세션 저장이 켜져 있을 때만 전송)
      if (syncScope.workouts) {
        const workoutRows: any[] = [];
        datesToUpload.forEach(d => {
          const item = localData[d];
          (item.workouts || []).forEach(w => {
            workoutRows.push({
              id: w.id,
              user_id: userId,
              date: d,
              activity_type: w.type,
              duration_minutes: w.durationMinutes || 0,
              active_calories: syncScope.activeCalories ? (w.caloriesBurned ?? null) : null,
              avg_heart_rate: syncScope.heartRate ? (w.avgHeartRate ?? null) : null,
              max_heart_rate: syncScope.heartRate ? (w.maxHeartRate ?? null) : null,
              distance_km: w.distanceKm ?? null,
              route_points: syncScope.routes ? ((w as any).routePoints || []) : [],
              source: w.notes || 'sync',
              updated_at: syncStartTime
            });
          });
        });

        if (workoutRows.length > 0) {
          const { error: wErr } = await supabase
            .from('fitstats_workouts')
            .upsert(workoutRows, { onConflict: 'user_id,id' });

          if (wErr) {
            console.warn('운동 세션 업로드 경고:', wErr);
          }
        }
      }

      uploadedDays = datesToUpload.length;
    }

    // ----------------------------------------------------
    // STEP 2: 클라우드 ➜ 로컬 다운로드 (증분 대상 수신)
    // ----------------------------------------------------
    let query = supabase.from('fitstats_daily_stats').select('*').eq('user_id', userId);
    if (lastSynced) {
      query = query.gt('updated_at', lastSynced);
    }

    const { data: remoteDailyList, error: fetchErr } = await query;
    if (fetchErr) {
      throw new Error(`클라우드 변경사항 조회 실패: ${fetchErr.message}`);
    }

    let workoutQuery = supabase.from('fitstats_workouts').select('*').eq('user_id', userId);
    if (lastSynced) {
      workoutQuery = workoutQuery.gt('updated_at', lastSynced);
    }
    const { data: remoteWorkoutsList } = await workoutQuery;

    // 수신된 운동 세션 날짜별 그룹화
    const remoteWorkoutsByDate: Record<string, WorkoutSession[]> = {};
    (remoteWorkoutsList || []).forEach((row: any) => {
      if (!remoteWorkoutsByDate[row.date]) {
        remoteWorkoutsByDate[row.date] = [];
      }
      remoteWorkoutsByDate[row.date].push({
        id: row.id,
        type: row.activity_type,
        name: row.activity_type,
        startTime: `${row.date}T00:00:00`,
        endTime: `${row.date}T01:00:00`,
        durationMinutes: row.duration_minutes || 0,
        caloriesBurned: row.active_calories || 0,
        avgHeartRate: row.avg_heart_rate || undefined,
        maxHeartRate: row.max_heart_rate || 0,
        distanceKm: row.distance_km || undefined,
        notes: row.source
      });
    });

    // ----------------------------------------------------
    // STEP 3: 최신 타임스탬프 기반 병합 (Merge)
    // ----------------------------------------------------
    const mergedData: Record<string, DailyStats> = { ...localData };
    let downloadedDays = 0;

    (remoteDailyList || []).forEach((row: any) => {
      const dateStr = row.date;
      const existing = mergedData[dateStr];

      // 로컬 데이터가 없거나, 원격 데이터가 더 최신인 경우 덮어쓰기
      if (!existing || !existing.updatedAt || row.updated_at >= existing.updatedAt) {
        downloadedDays++;
        mergedData[dateStr] = {
          date: dateStr,
          totalSteps: row.steps || 0,
          stepGoal: 10000,
          activeCalories: row.active_calories || 0,
          calorieGoal: 600,
          totalCalories: row.total_calories || (row.active_calories + 1800),
          workoutCount: row.workout_count || 0,
          workouts: remoteWorkoutsByDate[dateStr] || existing?.workouts || [],
          peakHeartRate: row.max_workout_hr || 0,
          restingHeartRate: row.resting_hr || 60,
          heartRateSamples: row.heart_rate_samples || [],
          updatedAt: row.updated_at
        };
      }
    });

    // ----------------------------------------------------
    // STEP 4: 동기화 시점 갱신 및 결과 반환
    // ----------------------------------------------------
    setLastSyncedAt(userId, syncStartTime);

    return {
      success: true,
      message: `동기화 완료! (업로드: ${uploadedDays}일, 다운로드: ${downloadedDays}일)`,
      uploadedCount: uploadedDays,
      downloadedCount: downloadedDays,
      mergedData,
      lastSyncedAt: syncStartTime
    };
  } catch (err: any) {
    console.error('클라우드 동기화 실패:', err);
    return {
      success: false,
      message: err.message || '클라우드 동기화 중 오류가 발생했습니다.'
    };
  }
}

/**
 * 6. 실시간 웹소켓 구독 (Realtime Sync)
 * 모바일이나 다른 기기에서 데이터가 변경되었을 때 실시간 콜백 실행
 */
export function subscribeToRealtimeSync(
  userId: string,
  onRemoteChange: () => void
): () => void {
  const supabase = getSupabase();
  if (!supabase || !isSupabaseConfigured() || !userId) {
    return () => {};
  }

  const channel = supabase
    .channel(`fitstats_user_${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'fitstats_daily_stats',
        filter: `user_id=eq.${userId}`
      },
      () => {
        onRemoteChange();
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
