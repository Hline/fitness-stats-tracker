import React, { useState, useEffect } from 'react';
import { UserAccount, RegisterRequest, LoginRequest, GenderType } from '../types/auth';
import { registerAccount, loginAccount, logoutAccount } from '../services/authService';
import { registerWithCloud, loginWithCloud, logoutCloud, getSyncScopeConfig, saveSyncScopeConfig } from '../services/cloudSyncService';
import { isSupabaseConfigured } from '../services/supabaseClient';
import { SyncScopeConfig, DEFAULT_SYNC_SCOPE } from '../types/health';
import { 
  X, 
  UserCheck, 
  Lock, 
  Mail, 
  Calendar, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  LogOut, 
  ShieldCheck,
  User,
  ArrowRight,
  RefreshCw,
  Database,
  Info,
  Check,
  Footprints,
  Flame,
  Dumbbell,
  Heart,
  MapPin,
  Moon,
  Cloud
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserAccount;
  onAuthSuccess: (user: UserAccount) => void;
  onLogout: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onAuthSuccess,
  onLogout
}) => {
  const [tab, setTab] = useState<'register' | 'login' | 'profile'>(
    currentUser.isGuest ? 'register' : 'profile'
  );

  // 회원가입 폼 상태
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regNickname, setRegNickname] = useState('');
  const [regBirthday, setRegBirthday] = useState('');
  const [regGender, setRegGender] = useState<GenderType>('unspecified');

  // 로그인 폼 상태
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const [useCloudAuth, setUseCloudAuth] = useState(isSupabaseConfigured());
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 동기화 항목 설정 상태 (DB 저장 vs 로컬만 저장)
  const [syncScope, setSyncScope] = useState<SyncScopeConfig>(() => getSyncScopeConfig(currentUser.id));
  const [scopeSavedMessage, setScopeSavedMessage] = useState<string | null>(null);

  useEffect(() => {
    setSyncScope(getSyncScopeConfig(currentUser.id));
  }, [currentUser.id, isOpen]);

  const toggleScopeItem = (key: keyof SyncScopeConfig) => {
    setSyncScope(prev => {
      const next = { ...prev, [key]: !prev[key] };
      saveSyncScopeConfig(next, currentUser.id);
      setScopeSavedMessage('설정이 저장되었습니다');
      setTimeout(() => setScopeSavedMessage(null), 2000);
      return next;
    });
  };

  const syncScopeItems: {
    key: keyof SyncScopeConfig;
    title: string;
    description: string;
    icon: React.ReactNode;
  }[] = [
    {
      key: 'steps',
      title: '걸음 수 (Steps)',
      description: '일일 총 걸음 수 및 활동 목표 달성률',
      icon: <Footprints className="w-4 h-4 text-cyan-400" />
    },
    {
      key: 'activeCalories',
      title: '소모 칼로리 (Calories)',
      description: '운동 및 생활 활동으로 소모된 칼로리',
      icon: <Flame className="w-4 h-4 text-orange-400" />
    },
    {
      key: 'workouts',
      title: '운동 세션 기록 (Workouts)',
      description: '러닝, 헬스, 사이클링 등 개별 운동 종류 및 시간',
      icon: <Dumbbell className="w-4 h-4 text-purple-400" />
    },
    {
      key: 'heartRate',
      title: '심박수 데이터 (Heart Rate)',
      description: '운동시간 동안 최고 심박수 및 심박수 타임라인',
      icon: <Heart className="w-4 h-4 text-rose-400" />
    },
    {
      key: 'routes',
      title: 'GPS 운동 경로 (GPS Routes)',
      description: '야외 러닝/하이킹 GPS 좌표 및 개인 히트맵',
      icon: <MapPin className="w-4 h-4 text-emerald-400" />
    },
    {
      key: 'lifestyle',
      title: '수분 & 수면 라이프스타일',
      description: '일일 수분 섭취량(ml) 및 수면 회복 점수',
      icon: <Moon className="w-4 h-4 text-blue-400" />
    }
  ];

  // 피드백 메시지 상태
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    setUseCloudAuth(isSupabaseConfigured());
  }, [isOpen]);

  if (!isOpen) return null;

  // 1. 회원가입 제출
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    const req: RegisterRequest = {
      username: regUsername,
      password: regPassword,
      email: regEmail,
      nickname: regNickname || regUsername,
      birthday: regBirthday || undefined,
      gender: regGender
    };

    // 1) 클라우드 DB 연동 가입
    if (useCloudAuth && isSupabaseConfigured()) {
      try {
        const cloudRes = await registerWithCloud(req);
        if (!cloudRes.success) {
          setErrorMessage(cloudRes.message);
          setIsSubmitting(false);
          return;
        }

        // 로컬 브라우저에도 세션 및 계정 등록
        registerAccount(req, currentUser.isGuest ? currentUser.id : undefined);

        setSuccessMessage('🎉 Supabase 클라우드 계정이 생성되었습니다! PC와 모바일 어디서나 동일하게 로그인 가능합니다.');
        setTimeout(() => {
          onAuthSuccess(cloudRes.user!);
          onClose();
        }, 1200);
      } catch (err: any) {
        setErrorMessage(err.message || '클라우드 회원가입 중 오류가 발생했습니다.');
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // 2) 로컬 계정 등록 (오프라인 모드)
    const res = registerAccount(req, currentUser.isGuest ? currentUser.id : undefined);
    setIsSubmitting(false);
    if (!res.success) {
      setErrorMessage(res.message);
      return;
    }

    setSuccessMessage('회원가입이 완료되었습니다! 기존 게스트 운동 데이터가 계정에 연동되었습니다.');
    setTimeout(() => {
      onAuthSuccess(res.user!);
      onClose();
    }, 1200);
  };

  // 2. 로그인 제출
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    const req: LoginRequest = {
      username: loginUsername,
      password: loginPassword
    };

    // 1) 클라우드 DB 로그인
    if (useCloudAuth && isSupabaseConfigured()) {
      try {
        const cloudRes = await loginWithCloud(req);
        if (!cloudRes.success) {
          setErrorMessage(cloudRes.message);
          setIsSubmitting(false);
          return;
        }

        setSuccessMessage('☁️ Supabase 클라우드 계정으로 로그인되었습니다. 클라우드 운동 데이터가 동기화됩니다.');
        setTimeout(() => {
          onAuthSuccess(cloudRes.user!);
          onClose();
        }, 1000);
      } catch (err: any) {
        setErrorMessage(err.message || '클라우드 로그인 중 오류가 발생했습니다.');
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // 2) 로컬 계정 로그인
    const res = loginAccount(req);
    setIsSubmitting(false);
    if (!res.success) {
      setErrorMessage(res.message);
      return;
    }

    setSuccessMessage('로그인 성공! 계정 데이터를 불러왔습니다.');
    setTimeout(() => {
      onAuthSuccess(res.user!);
      onClose();
    }, 1000);
  };

  // 3. 로그아웃
  const handleLogoutClick = async () => {
    await logoutCloud();
    logoutAccount();
    onLogout();
    setTab('register');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* 모달 상단 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-emerald-500 to-cyan-500 text-slate-950 font-bold">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">
                {currentUser.isGuest ? '간편 회원가입 & 로그인' : '내 계정 & 동기화 설정'}
              </h3>
              <p className="text-xs text-slate-400">PC & 모바일 기기 간 계정 및 운동 데이터 동기화 관리</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-slate-100 hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 탭 네비게이션 */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 px-6 pt-3 gap-2">
          {currentUser.isGuest ? (
            <>
              <button
                onClick={() => { setTab('register'); setErrorMessage(null); }}
                className={`pb-3 px-3 text-xs font-bold border-b-2 transition-all ${
                  tab === 'register' ? 'border-emerald-400 text-emerald-400' : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                회원가입
              </button>
              <button
                onClick={() => { setTab('login'); setErrorMessage(null); }}
                className={`pb-3 px-3 text-xs font-bold border-b-2 transition-all ${
                  tab === 'login' ? 'border-cyan-400 text-cyan-400' : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                로그인
              </button>
            </>
          ) : (
            <button
              onClick={() => { setTab('profile'); setErrorMessage(null); }}
              className={`pb-3 px-3 text-xs font-bold border-b-2 transition-all ${
                tab === 'profile' ? 'border-emerald-400 text-emerald-400' : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              내 계정 & 동기화 설정
            </button>
          )}
        </div>

        {/* 본문 */}
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          
          {/* 상태 알림 메시지 */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* 1. 회원가입 폼 */}
          {tab === 'register' && (
            <form onSubmit={handleRegister} className="space-y-3.5">
              {/* 클라우드 연동 상태 배너 */}
              {isSupabaseConfigured() ? (
                <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-500/20 text-xs text-sky-300 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Cloud className="w-4 h-4 text-sky-400" />
                    <span><strong>Supabase 클라우드 동기화 활성화됨:</strong> 가입 즉시 모바일과 연동됩니다.</span>
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-400" />
                    <span>로컬 모드로 가입됩니다. (클라우드 환경 설정 시 모바일과 자동 연동 가능)</span>
                  </div>
                </div>
              )}

              {/* 1) 아이디 */}
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  아이디 <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={regUsername}
                  onChange={(e) => setRegUsername(e.target.value)}
                  placeholder="영문, 숫자 3자 이상 (예: runner26)"
                  className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              {/* 2) 비밀번호 */}
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  비밀번호 <span className="text-rose-400">*</span>
                </label>
                <input
                  type="password"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="비밀번호 4자 이상"
                  className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              {/* 3) 이메일 */}
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  이메일 주소 <span className="text-rose-400">*</span>
                </label>
                <input
                  type="email"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="자주 쓰는 이메일 (예: runner@example.com)"
                  className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              {/* 4) 닉네임 */}
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">
                  닉네임 <span className="text-slate-500">(선택)</span>
                </label>
                <input
                  type="text"
                  value={regNickname}
                  onChange={(e) => setRegNickname(e.target.value)}
                  placeholder="미입력 시 아이디로 표시됩니다"
                  className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* 5) 생년월일 & 성별 (옵션 필드) */}
              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">
                    생년월일 <span className="text-slate-500">(선택)</span>
                  </label>
                  <input
                    type="date"
                    value={regBirthday}
                    onChange={(e) => setRegBirthday(e.target.value)}
                    className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">
                    성별 <span className="text-slate-500">(선택)</span>
                  </label>
                  <select
                    value={regGender}
                    onChange={(e) => setRegGender(e.target.value as GenderType)}
                    className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-2.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="unspecified">선택 안 함</option>
                    <option value="male">남성</option>
                    <option value="female">여성</option>
                    <option value="other">기타</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-2 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>가입 처리 중...</span>
                  </>
                ) : (
                  <>
                    <span>계정 생성 & 데이터 보관</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* 2. 로그인 폼 */}
          {tab === 'login' && (
            <form onSubmit={handleLogin} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  아이디 또는 이메일
                </label>
                <input
                  type="text"
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  placeholder="등록한 아이디 또는 이메일"
                  className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  비밀번호
                </label>
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="비밀번호"
                  className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>

              {isSupabaseConfigured() && (
                <div className="flex items-center gap-2 pt-1 text-xs text-slate-400">
                  <input
                    type="checkbox"
                    id="useCloud"
                    checked={useCloudAuth}
                    onChange={(e) => setUseCloudAuth(e.target.checked)}
                    className="rounded bg-slate-800 border-slate-700 text-sky-500 focus:ring-0"
                  />
                  <label htmlFor="useCloud" className="cursor-pointer">
                    ☁️ Supabase 클라우드 계정으로 로그인 (PC & 모바일 데이터 연동)
                  </label>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-2 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-cyan-500/20 transition-all disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>로그인 중...</span>
                  </>
                ) : (
                  <>
                    <span>로그인</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* 3. 내 계정 정보 & 동기화 항목 설정 탭 */}
          {tab === 'profile' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3.5 p-4 rounded-2xl bg-slate-800/70 border border-slate-700">
                <div className={`w-12 h-12 rounded-2xl ${currentUser.avatarColor} flex items-center justify-center text-slate-950 font-black text-lg shadow-md`}>
                  {currentUser.nickname.slice(0, 1)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-slate-100 truncate">
                      {currentUser.nickname}
                    </h4>
                    {isSupabaseConfigured() && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20">
                        클라우드 연동됨
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 truncate">@{currentUser.username}</p>
                  {currentUser.email && (
                    <p className="text-[11px] text-slate-500 truncate mt-0.5">{currentUser.email}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/60">
                  <span className="text-slate-400 block mb-1">생년월일</span>
                  <span className="font-semibold text-slate-200">
                    {currentUser.birthday || '미등록'}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/60">
                  <span className="text-slate-400 block mb-1">성별</span>
                  <span className="font-semibold text-slate-200">
                    {currentUser.gender === 'male' ? '남성' : currentUser.gender === 'female' ? '여성' : '선택 안 함'}
                  </span>
                </div>
              </div>

              {/* 동기화 항목 설정 (DB 저장 vs 로컬만 저장 항목 설정 관리) ⭐ 핵심 필수 요구사항 */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h5 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <Database className="w-4 h-4 text-emerald-400" />
                    <span>동기화 항목 설정 (DB 저장 vs 로컬만 저장)</span>
                  </h5>
                  {scopeSavedMessage && (
                    <span className="text-[11px] font-bold text-emerald-400 animate-in fade-in flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      {scopeSavedMessage}
                    </span>
                  )}
                </div>

                {/* 필수 안내사항 문구 박스 */}
                <div className="p-4 rounded-2xl bg-slate-950/70 border border-emerald-500/30 text-xs space-y-2">
                  <div className="font-bold text-emerald-300 flex items-center gap-1.5 text-xs">
                    <Info className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span>동기화 항목 안내사항</span>
                  </div>
                  <div className="space-y-1.5 text-[11px] leading-relaxed">
                    <p className="text-slate-200">
                      <strong className="text-emerald-400 font-bold">☁️ DB에 저장할 항목으로 선택할 경우:</strong> 어디서든 로그인만 하면 확인 가능합니다.
                    </p>
                    <p className="text-slate-400">
                      <strong className="text-slate-300 font-bold">📱 설정하지 않을 경우:</strong> 현재 화면에서만 확인 가능합니다.
                    </p>
                  </div>
                </div>

                {/* 항목별 체크박스 리스트 */}
                <div className="space-y-2">
                  {syncScopeItems.map((item) => {
                    const isChecked = syncScope[item.key];
                    return (
                      <div
                        key={item.key}
                        onClick={() => toggleScopeItem(item.key)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                          isChecked
                            ? 'bg-emerald-500/10 border-emerald-500/40 text-slate-100'
                            : 'bg-slate-800/40 border-slate-700/60 text-slate-400 hover:border-slate-600'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className={`p-1.5 rounded-lg border ${isChecked ? 'bg-emerald-500/20 border-emerald-500/30' : 'bg-slate-800 border-slate-700'}`}>
                            {item.icon}
                          </div>
                          <div>
                            <div className="font-bold text-xs flex items-center gap-1.5">
                              <span>{item.title}</span>
                              <span className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                                isChecked 
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                                  : 'bg-slate-800 text-slate-400 border border-slate-700'
                              }`}>
                                {isChecked ? '클라우드 DB 저장' : '로컬만 저장'}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              {item.description}
                            </p>
                          </div>
                        </div>

                        <div className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-colors ${
                          isChecked
                            ? 'bg-emerald-500 border-emerald-400 text-slate-950 font-bold'
                            : 'border-slate-600 bg-slate-800/80'
                        }`}>
                          {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <button
                onClick={handleLogoutClick}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 border border-slate-700 hover:border-rose-500/40 text-xs font-bold flex items-center justify-center gap-2 transition-all mt-4"
              >
                <LogOut className="w-4 h-4" />
                <span>로그아웃 (게스트 모드로 전환)</span>
              </button>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
