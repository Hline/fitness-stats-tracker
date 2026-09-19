import React, { useState, useEffect } from 'react';
import { SyncScopeConfig, DEFAULT_SYNC_SCOPE } from '../types/health';
import { 
  X, 
  Database, 
  Smartphone, 
  Check, 
  ShieldCheck, 
  Footprints, 
  Flame, 
  Dumbbell, 
  Heart, 
  MapPin, 
  Moon,
  Info,
  ArrowRight
} from 'lucide-react';

interface SyncScopeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: SyncScopeConfig) => void;
  initialConfig?: SyncScopeConfig;
  isInitialSetup?: boolean;
}

export const SyncScopeModal: React.FC<SyncScopeModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialConfig,
  isInitialSetup = false
}) => {
  const [scope, setScope] = useState<SyncScopeConfig>(() => initialConfig || { ...DEFAULT_SYNC_SCOPE });

  useEffect(() => {
    if (initialConfig) {
      setScope(initialConfig);
    }
  }, [initialConfig, isOpen]);

  if (!isOpen) return null;

  const toggleItem = (key: keyof SyncScopeConfig) => {
    setScope(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleConfirm = () => {
    onSave(scope);
    onClose();
  };

  const items: {
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* 상단 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">
                {isInitialSetup ? '데이터 동기화 저장 범위 설정' : '동기화 항목 관리 (DB vs 로컬)'}
              </h3>
              <p className="text-xs text-slate-400">
                {isInitialSetup ? '최초 동기화 전, 클라우드 DB에 보관할 항목을 지정하세요' : '클라우드 DB에 저장할 항목과 기기 로컬 전용 항목 설정'}
              </p>
            </div>
          </div>

          {!isInitialSetup && (
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-slate-100 hover:bg-slate-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* 안내사항 박스 (필수 요구사항) */}
        <div className="p-6 space-y-4">
          <div className="p-4 rounded-2xl bg-slate-950/70 border border-emerald-500/30 text-xs space-y-2.5">
            <div className="font-bold text-emerald-300 flex items-center gap-1.5 text-xs">
              <Info className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>동기화 항목 안내사항</span>
            </div>
            <div className="space-y-1.5 text-[11px] leading-relaxed">
              <p className="text-slate-200">
                <strong className="text-emerald-400 font-bold">☁️ DB에 저장할 항목으로 선택할 경우:</strong> 어디서든 로그인만 하면 모바일, PC 등 다른 기기에서도 확인 가능합니다.
              </p>
              <p className="text-slate-400">
                <strong className="text-slate-300 font-bold">📱 설정하지 않을 경우 (로컬 전용):</strong> 현재 화면/기기에서만 확인 가능하며, 외부 데이터베이스로 전송되지 않습니다.
              </p>
            </div>
          </div>

          {/* 항목별 체크리스트 */}
          <div className="space-y-2">
            {items.map((item) => {
              const isChecked = scope[item.key];
              return (
                <div
                  key={item.key}
                  onClick={() => toggleItem(item.key)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                    isChecked
                      ? 'bg-emerald-500/10 border-emerald-500/40 text-slate-100'
                      : 'bg-slate-800/40 border-slate-700/60 text-slate-400 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl border ${isChecked ? 'bg-emerald-500/20 border-emerald-500/30' : 'bg-slate-800 border-slate-700'}`}>
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
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {item.description}
                      </p>
                    </div>
                  </div>

                  {/* 커스텀 체크박스 토글 */}
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

          {/* 하단 버튼 */}
          <div className="pt-2 flex items-center gap-2.5">
            {!isInitialSetup && (
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-all"
              >
                닫기
              </button>
            )}

            <button
              type="button"
              onClick={handleConfirm}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 text-xs font-bold shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-1.5 active:scale-95"
            >
              <span>{isInitialSetup ? '설정 저장하고 계속하기' : '동기화 항목 설정 저장'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
