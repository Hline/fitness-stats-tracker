import React, { useState, useEffect } from 'react';
import { DailyStats, WorkoutSession, UserProfile, DashboardWidgetConfig, WidgetId, SyncScopeConfig } from './types/health';
import { UserAccount, AuthSession } from './types/auth';
import { getCurrentSession, saveCurrentSession } from './services/authService';
import { generateDemoFitnessData, formatDate } from './services/demoData';
import { calculateDailyStats } from './services/statsCalculator';
import { parseAppleShortcutsJson } from './services/appleHealthParser';
import { DEFAULT_WIDGET_CONFIGS, DEFAULT_PROFILES } from './services/widgetDefaults';
import { 
  syncIncrementalWithCloud, 
  getLastSyncedAt, 
  subscribeToRealtimeSync,
  getSyncScopeConfig,
  saveSyncScopeConfig,
  hasConfiguredInitialSyncScope
} from './services/cloudSyncService';
import { isSupabaseConfigured } from './services/supabaseClient';

import { Header } from './components/Header';
import { DailyOverview } from './components/DailyOverview';
import { WorkoutTimeline } from './components/WorkoutTimeline';
import { HeartRateChart } from './components/HeartRateChart';
import { MonthlyStatsView } from './components/MonthlyStatsView';
import { SnsShareModal } from './components/SnsShareModal';
import { SyncModal } from './components/SyncModal';
import { WorkoutModal } from './components/WorkoutModal';
import { WidgetSettingsModal } from './components/WidgetSettingsModal';
import { UserProfileModal } from './components/UserProfileModal';
import { InquiryModal } from './components/InquiryModal';
import { AuthModal } from './components/AuthModal';
import { RouteOverlayMapModal } from './components/RouteOverlayMapModal';
import { SyncScopeModal } from './components/SyncScopeModal';

import { ActivityRingsWidget } from './components/widgets/ActivityRingsWidget';
import { CardioZoneWidget } from './components/widgets/CardioZoneWidget';
import { HydrationWidget } from './components/widgets/HydrationWidget';
import { RecoverySleepWidget } from './components/widgets/RecoverySleepWidget';
import { Sparkles, ArrowRight, UserCheck } from 'lucide-react';

const PROFILES_STORAGE_KEY = 'fitstats_profiles_v1';
const CURRENT_PROFILE_ID_KEY = 'fitstats_current_profile_id_v1';

export const App: React.FC = () => {
  // 1. 인증 세션 상태 ("즉시사용 + 필요시 회원가입")
  const [authSession, setAuthSession] = useState<AuthSession>(() => getCurrentSession());

  // 2. 프로필 관리 상태
  const [profiles, setProfiles] = useState<UserProfile[]>(() => {
    try {
      const saved = localStorage.getItem(PROFILES_STORAGE_KEY);
      return saved ? JSON.parse(saved) : DEFAULT_PROFILES;
    } catch {
      return DEFAULT_PROFILES;
    }
  });

  const [currentProfileId, setCurrentProfileId] = useState<string>(() => {
    return localStorage.getItem(CURRENT_PROFILE_ID_KEY) || profiles[0]?.id || 'user-default-1';
  });

  const currentProfile = profiles.find(p => p.id === currentProfileId) || profiles[0];

  useEffect(() => {
    try {
      localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(profiles));
      localStorage.setItem(CURRENT_PROFILE_ID_KEY, currentProfileId);
    } catch (e) {
      console.warn('프로필 저장 실패:', e);
    }
  }, [profiles, currentProfileId]);

  // 3. 날짜 관리
  const todayStr = formatDate(new Date());
  const [currentDateStr, setCurrentDateStr] = useState<string>(todayStr);

  // 4. 뷰 모드 ('daily' | 'monthly')
  const [viewMode, setViewMode] = useState<'daily' | 'monthly'>('daily');

  // 5. 사용자별 데이터 격리 스토리지 로드
  const getDataStorageKey = (profileId: string) => `fitstats_data_${profileId}`;

  const [dailyDataMap, setDailyDataMap] = useState<{ [dateStr: string]: DailyStats }>(() => {
    try {
      const saved = localStorage.getItem(getDataStorageKey(currentProfileId));
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('데이터 파싱 오류:', e);
    }
    return generateDemoFitnessData(new Date());
  });

  const handleSelectProfile = (profileId: string) => {
    setCurrentProfileId(profileId);
    try {
      const saved = localStorage.getItem(getDataStorageKey(profileId));
      if (saved) {
        setDailyDataMap(JSON.parse(saved));
      } else {
        const newDemo = generateDemoFitnessData(new Date());
        setDailyDataMap(newDemo);
        localStorage.setItem(getDataStorageKey(profileId), JSON.stringify(newDemo));
      }
    } catch (e) {
      console.error('프로필 데이터 전환 오류:', e);
    }
  };

  const handleCreateProfile = (name: string, email?: string) => {
    const avatarColors = ['bg-emerald-400', 'bg-cyan-400', 'bg-orange-400', 'bg-purple-400', 'bg-rose-400', 'bg-amber-400'];
    const newId = `user-${Date.now()}`;
    const newProfile: UserProfile = {
      id: newId,
      name,
      email,
      avatarColor: avatarColors[profiles.length % avatarColors.length],
      googleConnected: false,
      createdAt: new Date().toISOString(),
      widgetConfigs: [...DEFAULT_WIDGET_CONFIGS]
    };
    const updated = [...profiles, newProfile];
    setProfiles(updated);
    handleSelectProfile(newId);
  };

  const handleDeleteProfile = (profileId: string) => {
    if (profiles.length <= 1) return;
    const filtered = profiles.filter(p => p.id !== profileId);
    setProfiles(filtered);
    if (currentProfileId === profileId) {
      handleSelectProfile(filtered[0].id);
    }
  };

  useEffect(() => {
    try {
      localStorage.setItem(getDataStorageKey(currentProfileId), JSON.stringify(dailyDataMap));
    } catch (e) {
      console.warn('데이터 저장 실패:', e);
    }
  }, [dailyDataMap, currentProfileId]);

  // 6. 모달 상태
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [isWorkoutModalOpen, setIsWorkoutModalOpen] = useState(false);
  const [isWidgetSettingsOpen, setIsWidgetSettingsOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isInquiryModalOpen, setIsInquiryModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isRouteModalOpen, setIsRouteModalOpen] = useState(false);

  // 6-1. 클라우드 증분 동기화 상태
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncNotification, setSyncNotification] = useState<string | null>(null);
  const [lastSyncedText, setLastSyncedText] = useState<string>('');

  // 6-2. 선택적 동기화 범위 모달 및 보류 데이터 (최초 동기화/가져오기 대응)
  const [isSyncScopeModalOpen, setIsSyncScopeModalOpen] = useState(false);
  const [pendingImportedData, setPendingImportedData] = useState<{ [dateStr: string]: DailyStats } | null>(null);

  const updateLastSyncedDisplay = () => {
    const last = getLastSyncedAt(authSession.currentUser.id);
    if (!last) {
      setLastSyncedText('');
      return;
    }
    const diff = Date.now() - new Date(last).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) setLastSyncedText('방금 전');
    else if (mins < 60) setLastSyncedText(`${mins}분 전`);
    else {
      const hours = Math.floor(mins / 60);
      setLastSyncedText(`${hours}시간 전`);
    }
  };

  const handleCloudSync = async (isBackground = false) => {
    if (authSession.isGuest || !isSupabaseConfigured()) {
      if (!isBackground) setIsAuthModalOpen(true);
      return;
    }

    if (!isBackground) setIsSyncing(true);

    try {
      const scope = getSyncScopeConfig(authSession.currentUser.id);
      const result = await syncIncrementalWithCloud(authSession.currentUser.id, dailyDataMap, scope);
      if (result.success && result.mergedData) {
        setDailyDataMap(result.mergedData);
        updateLastSyncedDisplay();
        if (!isBackground) {
          setSyncNotification(result.message);
          setTimeout(() => setSyncNotification(null), 3500);
        }
      } else if (!result.success && !isBackground) {
        setSyncNotification(`❌ ${result.message}`);
        setTimeout(() => setSyncNotification(null), 4000);
      }
    } catch (e: any) {
      if (!isBackground) {
        setSyncNotification(`❌ 동기화 실패: ${e.message}`);
        setTimeout(() => setSyncNotification(null), 4000);
      }
    } finally {
      if (!isBackground) setIsSyncing(false);
    }
  };

  // 로그인 시 및 마운트 시 동기화 시점 확인 및 백그라운드 동기화
  useEffect(() => {
    updateLastSyncedDisplay();
    if (!authSession.isGuest && isSupabaseConfigured()) {
      handleCloudSync(true);
    }
  }, [authSession.currentUser.id]);

  // 실시간 동기화 구독 (다른 기기나 모바일에서 변경 시 즉시 반영)
  useEffect(() => {
    if (!authSession.isGuest && isSupabaseConfigured()) {
      const unsub = subscribeToRealtimeSync(authSession.currentUser.id, () => {
        handleCloudSync(true);
      });
      return () => unsub();
    }
  }, [authSession.currentUser.id]);

  // 7. 위젯 설정 업데이트
  const handleUpdateWidgetConfigs = (configs: DashboardWidgetConfig[]) => {
    setProfiles(prev => prev.map(p => 
      p.id === currentProfileId ? { ...p, widgetConfigs: configs } : p
    ));
  };

  const handleResetWidgetConfigs = () => {
    handleUpdateWidgetConfigs([...DEFAULT_WIDGET_CONFIGS]);
  };

  // 8. 현재 날짜 DailyStats
  const currentDailyStats: DailyStats = dailyDataMap[currentDateStr] || calculateDailyStats(
    currentDateStr,
    0,
    [],
    []
  );

  const handleLoadDemo = () => {
    const newDemo = generateDemoFitnessData(new Date());
    setDailyDataMap(newDemo);
    localStorage.setItem(getDataStorageKey(currentProfileId), JSON.stringify(newDemo));
  };

  const applyImportedData = async (data: { [dateStr: string]: DailyStats }, scopeConfig?: SyncScopeConfig) => {
    const nowIso = new Date().toISOString();
    const tagged: { [dateStr: string]: DailyStats } = {};
    Object.keys(data).forEach(k => {
      tagged[k] = {
        ...data[k],
        updatedAt: nowIso
      };
    });
    const merged = {
      ...dailyDataMap,
      ...tagged
    };
    setDailyDataMap(merged);

    // 로그인된 회원이면 선택된 동기화 범위에 따라 클라우드 DB에도 자동 반영
    if (!authSession.isGuest && isSupabaseConfigured()) {
      const scope = scopeConfig || getSyncScopeConfig(authSession.currentUser.id);
      setIsSyncing(true);
      try {
        const result = await syncIncrementalWithCloud(authSession.currentUser.id, merged, scope);
        if (result.success && result.mergedData) {
          setDailyDataMap(result.mergedData);
          updateLastSyncedDisplay();
          setSyncNotification('선택된 항목이 클라우드 DB에 동기화되었습니다.');
          setTimeout(() => setSyncNotification(null), 3500);
        }
      } catch (err: any) {
        console.warn('선택적 클라우드 동기화 실패:', err);
      } finally {
        setIsSyncing(false);
      }
    }
  };

  const handleDataImported = (importedData: { [dateStr: string]: DailyStats }) => {
    const userId = authSession.currentUser.id;
    // 최초 동기화 / 최초 데이터 가져오기할 때 한번 설정할 수 있도록 화면에 표시 (사용자 요구)
    if (!hasConfiguredInitialSyncScope(userId)) {
      setPendingImportedData(importedData);
      setIsSyncScopeModalOpen(true);
    } else {
      applyImportedData(importedData);
    }
  };

  const handleSaveInitialScope = (config: SyncScopeConfig) => {
    const userId = authSession.currentUser.id;
    saveSyncScopeConfig(config, userId);
    if (pendingImportedData) {
      applyImportedData(pendingImportedData, config);
      setPendingImportedData(null);
    }
  };

  // 아이폰 단축어로 URL을 통해 전달된 건강 데이터 자동 감지 및 반영 (#shortcuts_data=...)
  useEffect(() => {
    try {
      const hash = window.location.hash;
      const search = window.location.search;
      let rawData: string | null = null;

      if (hash.includes('shortcuts_data=')) {
        rawData = hash.split('shortcuts_data=')[1];
      } else if (search.includes('shortcuts_data=')) {
        const params = new URLSearchParams(search);
        rawData = params.get('shortcuts_data');
      }

      if (rawData) {
        const decoded = decodeURIComponent(rawData);
        const parsed = parseAppleShortcutsJson(decoded);
        const count = Object.keys(parsed).length;
        if (count > 0) {
          handleDataImported(parsed);
          setSyncNotification(`🎉 아이폰 단축어로 ${count}일치 건강 데이터가 자동 동기화되었습니다!`);
          setTimeout(() => setSyncNotification(null), 4000);
          window.history.replaceState(null, '', window.location.pathname);
        }
      }
    } catch (e) {
      console.warn('아이폰 단축어 URL 데이터 파싱 오류:', e);
    }
  }, []);

  const handleUpdateWater = (newMl: number) => {
    setDailyDataMap(prev => ({
      ...prev,
      [currentDateStr]: {
        ...currentDailyStats,
        waterIntakeMl: newMl,
        updatedAt: new Date().toISOString()
      }
    }));
  };

  const handleAddWorkout = (newWorkout: WorkoutSession) => {
    const current = currentDailyStats;
    const updatedWorkouts = [...current.workouts, newWorkout];

    const updatedHrSamples = [...current.heartRateSamples];
    const timeMatch = newWorkout.startTime.match(/T(\d{2}:\d{2})/);
    if (timeMatch && newWorkout.maxHeartRate && newWorkout.maxHeartRate > 0) {
      updatedHrSamples.push({
        time: timeMatch[1],
        bpm: newWorkout.maxHeartRate
      });
      updatedHrSamples.sort((a, b) => a.time.localeCompare(b.time));
    }

    const updatedStats = calculateDailyStats(
      currentDateStr,
      current.totalSteps,
      updatedWorkouts,
      updatedHrSamples,
      current.stepGoal,
      current.calorieGoal,
      current.restingHeartRate
    );

    setDailyDataMap(prev => ({
      ...prev,
      [currentDateStr]: {
        ...updatedStats,
        waterIntakeMl: current.waterIntakeMl,
        sleepHours: current.sleepHours,
        recoveryScore: current.recoveryScore,
        updatedAt: new Date().toISOString()
      }
    }));
  };

  const handleDeleteWorkout = (workoutId: string) => {
    const current = currentDailyStats;
    const updatedWorkouts = current.workouts.filter(w => w.id !== workoutId);

    const updatedStats = calculateDailyStats(
      currentDateStr,
      current.totalSteps,
      updatedWorkouts,
      current.heartRateSamples,
      current.stepGoal,
      current.calorieGoal,
      current.restingHeartRate
    );

    setDailyDataMap(prev => ({
      ...prev,
      [currentDateStr]: {
        ...updatedStats,
        waterIntakeMl: current.waterIntakeMl,
        sleepHours: current.sleepHours,
        recoveryScore: current.recoveryScore,
        updatedAt: new Date().toISOString()
      }
    }));
  };

  // 인증 성공 처리 (게스트 ➔ 정식 회원)
  const handleAuthSuccess = (user: UserAccount) => {
    setAuthSession({
      currentUser: user,
      isAuthenticated: !user.isGuest,
      isGuest: user.isGuest
    });
    // 프로필 이름도 동기화
    setProfiles(prev => {
      const idx = prev.findIndex(p => p.id === currentProfileId);
      if (idx !== -1) {
        const next = [...prev];
        next[idx] = { ...next[idx], name: user.nickname, email: user.email };
        return next;
      }
      return prev;
    });
  };

  const handleLogout = () => {
    const guestSession = getCurrentSession();
    setAuthSession(guestSession);
  };

  // 위젯 동적 디스패처
  const renderWidget = (widgetId: WidgetId) => {
    switch (widgetId) {
      case 'daily-overview':
        return (
          <DailyOverview
            key="daily-overview"
            stats={currentDailyStats}
            onOpenWorkoutModal={() => setIsWorkoutModalOpen(true)}
          />
        );
      case 'activity-rings':
        return (
          <ActivityRingsWidget
            key="activity-rings"
            stats={currentDailyStats}
          />
        );
      case 'heart-rate-chart':
        return (
          <HeartRateChart
            key="heart-rate-chart"
            samples={currentDailyStats.heartRateSamples}
            peakHeartRate={currentDailyStats.peakHeartRate}
            restingHeartRate={currentDailyStats.restingHeartRate}
            workouts={currentDailyStats.workouts}
          />
        );
      case 'cardio-zones':
        return (
          <CardioZoneWidget
            key="cardio-zones"
            stats={currentDailyStats}
          />
        );
      case 'workout-timeline':
        return (
          <WorkoutTimeline
            key="workout-timeline"
            workouts={currentDailyStats.workouts}
            onDeleteWorkout={handleDeleteWorkout}
            onOpenWorkoutModal={() => setIsWorkoutModalOpen(true)}
          />
        );
      case 'hydration':
        return (
          <HydrationWidget
            key="hydration"
            initialWaterMl={currentDailyStats.waterIntakeMl || 1500}
            onUpdateWater={handleUpdateWater}
          />
        );
      case 'recovery-sleep':
        return (
          <RecoverySleepWidget
            key="recovery-sleep"
            sleepHours={currentDailyStats.sleepHours || 7.6}
            recoveryScore={currentDailyStats.recoveryScore || 88}
          />
        );
      default:
        return null;
    }
  };

  const activeWidgets = (currentProfile?.widgetConfigs || DEFAULT_WIDGET_CONFIGS)
    .filter(w => w.enabled)
    .sort((a, b) => a.order - b.order);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-emerald-500 selection:text-slate-950">
      
      {/* 상단 통합 헤더 */}
      <Header
        currentDateStr={currentDateStr}
        onDateChange={setCurrentDateStr}
        onOpenSyncModal={() => setIsSyncModalOpen(true)}
        onOpenWorkoutModal={() => setIsWorkoutModalOpen(true)}
        onOpenShareModal={() => setIsShareModalOpen(true)}
        onOpenWidgetSettings={() => setIsWidgetSettingsOpen(true)}
        onOpenProfileModal={() => setIsProfileModalOpen(true)}
        onOpenInquiryModal={() => setIsInquiryModalOpen(true)}
        onOpenRouteModal={() => setIsRouteModalOpen(true)}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onLoadDemoData={handleLoadDemo}
        onCloudSync={() => handleCloudSync(false)}
        isSyncing={isSyncing}
        lastSyncedText={lastSyncedText}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        currentProfile={currentProfile}
        currentUser={authSession.currentUser}
      />

      {/* 클라우드 동기화 완료/오류 토스트 알림 */}
      {syncNotification && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-3 duration-300">
          <div className="px-4 py-2.5 rounded-2xl bg-slate-900/95 border border-sky-500/40 text-sky-200 text-xs font-semibold shadow-2xl backdrop-blur-md flex items-center gap-2">
            <span>{syncNotification}</span>
          </div>
        </div>
      )}

      {/* 게스트 상태 전용 안내 띠 배너 */}
      {authSession.isGuest && (
        <div className="bg-gradient-to-r from-purple-950/60 via-slate-900 to-slate-900 border-b border-purple-900/40 px-4 py-2 text-xs text-slate-300">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span>
                <strong>즉시 사용 모드:</strong> 회원가입 없이 모든 기능을 이용 중입니다. 데이터의 안전한 보관을 위해 간편 가입을 권장합니다.
              </span>
            </div>
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="font-bold text-purple-400 hover:text-purple-300 flex items-center gap-1 transition-colors"
            >
              <span>아이디/패스워드로 간편 가입</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* 메인 뷰 컨테이너 */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {viewMode === 'daily' ? (
          <div className="space-y-6 animate-in fade-in duration-200">
            {activeWidgets.length === 0 ? (
              <div className="py-16 text-center rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                <p className="text-sm font-semibold text-slate-300">대시보드에 활성화된 위젯이 없습니다.</p>
                <button
                  onClick={() => setIsWidgetSettingsOpen(true)}
                  className="px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs"
                >
                  위젯 설정 열기
                </button>
              </div>
            ) : (
              activeWidgets.map(config => renderWidget(config.id))
            )}
          </div>
        ) : (
          <div className="animate-in fade-in duration-200">
            <MonthlyStatsView
              currentDateStr={currentDateStr}
              dailyDataMap={dailyDataMap}
              onSelectDate={(dStr) => {
                setCurrentDateStr(dStr);
                setViewMode('daily');
              }}
              onOpenWorkoutModal={() => setIsWorkoutModalOpen(true)}
            />
          </div>
        )}

      </main>

      {/* 하단 푸터 */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>FitStats &copy; 2026 - 스마트 헬스케어 운동 통계 & SNS 공유 스튜디오</p>
          <div className="flex items-center gap-4 text-slate-400">
            <button onClick={() => setIsRouteModalOpen(true)} className="hover:text-amber-400 transition-colors">
              운동 경로 겹쳐보기 🗺️
            </button>
            <span>•</span>
            <button onClick={() => setIsInquiryModalOpen(true)} className="hover:text-teal-400 transition-colors">
              문의 및 피드백
            </button>
            <span>•</span>
            <button onClick={() => setIsWidgetSettingsOpen(true)} className="hover:text-emerald-400 transition-colors">
              레이아웃 설정
            </button>
          </div>
        </div>
      </footer>

      {/* 모달 모음 */}
      <SnsShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        stats={currentDailyStats}
      />

      <SyncModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        onDataImported={handleDataImported}
        onLoadDemo={handleLoadDemo}
      />

      <WorkoutModal
        isOpen={isWorkoutModalOpen}
        onClose={() => setIsWorkoutModalOpen(false)}
        currentDateStr={currentDateStr}
        onAddWorkout={handleAddWorkout}
      />

      <WidgetSettingsModal
        isOpen={isWidgetSettingsOpen}
        onClose={() => setIsWidgetSettingsOpen(false)}
        widgetConfigs={currentProfile?.widgetConfigs || DEFAULT_WIDGET_CONFIGS}
        onUpdateConfigs={handleUpdateWidgetConfigs}
        onResetConfigs={handleResetWidgetConfigs}
      />

      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        profiles={profiles}
        currentProfileId={currentProfileId}
        onSelectProfile={handleSelectProfile}
        onCreateProfile={handleCreateProfile}
        onDeleteProfile={handleDeleteProfile}
      />

      <InquiryModal
        isOpen={isInquiryModalOpen}
        onClose={() => setIsInquiryModalOpen(false)}
        currentUserId={authSession.currentUser.id}
        currentUserName={authSession.currentUser.nickname}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        currentUser={authSession.currentUser}
        onAuthSuccess={handleAuthSuccess}
        onLogout={handleLogout}
      />

      <RouteOverlayMapModal
        isOpen={isRouteModalOpen}
        onClose={() => setIsRouteModalOpen(false)}
      />

      <SyncScopeModal
        isOpen={isSyncScopeModalOpen}
        onClose={() => {
          setIsSyncScopeModalOpen(false);
          if (pendingImportedData) {
            applyImportedData(pendingImportedData);
            setPendingImportedData(null);
          }
        }}
        onSave={handleSaveInitialScope}
        initialConfig={getSyncScopeConfig(authSession.currentUser.id)}
        isInitialSetup={true}
      />

    </div>
  );
};
