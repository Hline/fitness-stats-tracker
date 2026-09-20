import React from 'react';
import { 
  Activity, 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Share2, 
  PlusCircle, 
  RefreshCw, 
  Smartphone,
  Flame,
  Layers,
  Sliders,
  Users,
  MessageSquarePlus,
  Map,
  UserCheck,
  Sparkles,
  Cloud
} from 'lucide-react';
import { UserProfile } from '../types/health';
import { UserAccount } from '../types/auth';

interface HeaderProps {
  currentDateStr: string;
  onDateChange: (newDateStr: string) => void;
  onOpenSyncModal: () => void;
  onOpenWorkoutModal: () => void;
  onOpenShareModal: () => void;
  onOpenWidgetSettings: () => void;
  onOpenProfileModal: () => void;
  onOpenInquiryModal: () => void;
  onOpenRouteModal?: () => void;
  onOpenAuthModal: () => void;
  onLoadDemoData: () => void;
  onCloudSync?: () => void;
  isSyncing?: boolean;
  lastSyncedText?: string;
  viewMode: 'daily' | 'monthly';
  onViewModeChange: (mode: 'daily' | 'monthly') => void;
  currentProfile?: UserProfile;
  currentUser?: UserAccount;
}

export const Header: React.FC<HeaderProps> = ({
  currentDateStr,
  onDateChange,
  onOpenSyncModal,
  onOpenWorkoutModal,
  onOpenShareModal,
  onOpenWidgetSettings,
  onOpenProfileModal,
  onOpenInquiryModal,
  onOpenRouteModal,
  onOpenAuthModal,
  onLoadDemoData,
  onCloudSync,
  isSyncing = false,
  lastSyncedText,
  viewMode,
  onViewModeChange,
  currentProfile,
  currentUser
}) => {
  const changeDateByDays = (days: number) => {
    const [y, m, d] = currentDateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    date.setDate(date.getDate() + days);
    const ny = date.getFullYear();
    const nm = String(date.getMonth() + 1).padStart(2, '0');
    const nd = String(date.getDate()).padStart(2, '0');
    onDateChange(`${ny}-${nm}-${nd}`);
  };

  const setToday = () => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    onDateChange(`${y}-${m}-${d}`);
  };

  const [year, month, day] = currentDateStr.split('-').map(Number);
  const dateObj = new Date(year, month - 1, day);
  const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
  const dayOfWeek = dayNames[dateObj.getDay()];

  const isToday = () => {
    const today = new Date();
    return (
      today.getFullYear() === year &&
      today.getMonth() + 1 === month &&
      today.getDate() === day
    );
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 lg:px-8 py-2.5 transition-all">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-2.5">
        
        {/* 좌측: 로고 & 뷰 토글 */}
        <div className="flex items-center justify-between w-full md:w-auto gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-cyan-500 p-0.5 shadow-lg shadow-emerald-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Activity className="w-4 h-4 text-emerald-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-lg font-black tracking-tight bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
                  FitStats
                </h1>
                <span className="text-[9px] font-bold uppercase px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Pro
                </span>
              </div>
            </div>
          </div>

          {/* 일간 / 월간 뷰 토글 탭 */}
          <div className="flex items-center bg-slate-800/80 p-1 rounded-xl border border-slate-700/60">
            <button
              onClick={() => onViewModeChange('daily')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1 ${
                viewMode === 'daily'
                  ? 'bg-emerald-500 text-slate-950 shadow-md font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Flame className="w-3.5 h-3.5" />
              1일 통계
            </button>
            <button
              onClick={() => onViewModeChange('monthly')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1 ${
                viewMode === 'monthly'
                  ? 'bg-emerald-500 text-slate-950 shadow-md font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              월간 통계
            </button>
          </div>
        </div>

        {/* 중앙: 날짜 네비게이터 */}
        <div className="flex items-center bg-slate-800/70 border border-slate-700/80 rounded-xl px-2 py-0.5 shadow-inner">
          <button
            onClick={() => changeDateByDays(-1)}
            aria-label="이전 날"
            className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-slate-100 transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>

          <div className="px-2 text-center min-w-[155px]">
            <div className="text-xs font-semibold text-slate-100 flex items-center justify-center gap-1.5">
              <CalendarIcon className="w-3 h-3 text-emerald-400" />
              <span>{year}년 {month}월 {day}일 ({dayOfWeek})</span>
            </div>
          </div>

          <button
            onClick={() => changeDateByDays(1)}
            aria-label="다음 날"
            className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-slate-100 transition-colors"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>

          {!isToday() && (
            <button
              onClick={setToday}
              className="ml-1 text-[10px] px-1.5 py-0.5 bg-slate-700 hover:bg-slate-600 text-emerald-300 font-medium rounded transition-colors"
            >
              오늘
            </button>
          )}
        </div>

        {/* 우측 액션 버튼 그룹 */}
        <div className="flex items-center flex-wrap justify-end gap-1.5 w-full md:w-auto">

          {/* 즉시사용 + 회원가입/계정 버튼 (⭐ 핵심 신규 요구) */}
          <button
            onClick={onOpenAuthModal}
            className={`px-2.5 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all ${
              currentUser?.isGuest
                ? 'bg-purple-500/15 border-purple-500/40 text-purple-300 hover:bg-purple-500/25'
                : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
            }`}
            title="계정 관리 / 간편 가입"
          >
            <UserCheck className="w-3.5 h-3.5 text-purple-400" />
            {currentUser?.isGuest ? (
              <span className="flex items-center gap-1">
                <span>게스트</span>
                <span className="text-[9px] bg-purple-500 text-slate-950 font-bold px-1 rounded">가입</span>
              </span>
            ) : (
              <span className="max-w-[70px] truncate">{currentUser?.nickname}</span>
            )}
          </button>

          {/* 데이터 동기화 버튼 (애플 헬스 / 구글 핏 불러오기) */}
          <button
            onClick={onOpenSyncModal}
            className="px-2.5 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all bg-slate-800 hover:bg-slate-700 text-cyan-400 border-cyan-500/30 shadow-sm"
            title="애플 헬스 / 구글 핏 데이터 동기화 및 불러오기"
          >
            <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
            <span>동기화</span>
          </button>

          {/* 대시보드 레이아웃 설정 버튼 */}
          <button
            onClick={onOpenWidgetSettings}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-emerald-400 rounded-xl border border-slate-700 transition-all"
            title="대시보드 위젯 순서 및 표시 설정"
          >
            <Sliders className="w-4 h-4" />
          </button>

          {/* 문의 및 피드백 버튼 */}
          <button
            onClick={onOpenInquiryModal}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-teal-400 rounded-xl border border-teal-500/30 transition-all"
            title="기능 제안 및 문의사항 접수"
          >
            <MessageSquarePlus className="w-4 h-4" />
          </button>

          {/* 운동 기록 추가 버튼 */}
          <button
            onClick={onOpenWorkoutModal}
            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 text-xs font-semibold rounded-xl border border-emerald-500/30 flex items-center gap-1 transition-all"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>기록</span>
          </button>

          {/* SNS 캡처 공유 버튼 */}
          <button
            onClick={onOpenShareModal}
            className="px-3 py-1.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 text-xs font-bold rounded-xl shadow-lg shadow-emerald-500/25 flex items-center gap-1.5 transition-all transform active:scale-95"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>SNS 카드 📸</span>
          </button>

        </div>

      </div>
    </header>
  );
};
