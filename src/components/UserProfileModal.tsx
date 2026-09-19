import React, { useState } from 'react';
import { UserProfile } from '../types/health';
import { 
  X, 
  User, 
  Users, 
  Plus, 
  Check, 
  Trash2, 
  ShieldCheck, 
  ExternalLink,
  Sparkles,
  Info
} from 'lucide-react';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profiles: UserProfile[];
  currentProfileId: string;
  onSelectProfile: (profileId: string) => void;
  onCreateProfile: (name: string, email?: string) => void;
  onDeleteProfile: (profileId: string) => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  profiles,
  currentProfileId,
  onSelectProfile,
  onCreateProfile,
  onDeleteProfile
}) => {
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  if (!isOpen) return null;

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim()) return;
    onCreateProfile(newUserName.trim(), newUserEmail.trim() || undefined);
    setNewUserName('');
    setNewUserEmail('');
    setIsCreating(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* 모달 상단 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                사용자 프로필 관리 센터
                <span className="text-[10px] font-medium text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20">
                  Multi-Profile
                </span>
              </h3>
              <p className="text-xs text-slate-400">사용자별 독립된 운동 데이터와 대시보드 레이아웃을 관리합니다.</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-slate-100 hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 본문 */}
        <div className="p-6 space-y-5">
          
          {/* 아키텍처 안내 배너 */}
          <div className="p-3.5 rounded-2xl bg-slate-800/40 border border-slate-700/60 text-xs space-y-2">
            <div className="font-bold text-slate-200 flex items-center gap-1.5">
              <Info className="w-4 h-4 text-cyan-400" />
              <span>계정 연동 방식 안내 (구글 ID vs 간편 프로필)</span>
            </div>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              FitStats는 <strong>"간편 아이디 생성 + 선택적 구글 계정 연동"</strong>의 하이브리드 방식을 지원합니다. 가입 절차 없이 1초 만에 프로필을 생성해 가족이나 친구와 개별 운동 통계를 분리할 수 있으며, 구글 계정을 연결하여 Google Fit API 데이터를 자동으로 동기화할 수도 있습니다.
            </p>
          </div>

          {/* 프로필 리스트 */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300 block mb-2">
              등록된 사용자 프로필 ({profiles.length}명)
            </label>

            {profiles.map((profile) => {
              const isSelected = profile.id === currentProfileId;
              return (
                <div
                  key={profile.id}
                  onClick={() => onSelectProfile(profile.id)}
                  className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-center justify-between gap-3 ${
                    isSelected
                      ? 'bg-purple-950/40 border-purple-500 text-slate-100 ring-1 ring-purple-500'
                      : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl ${profile.avatarColor} flex items-center justify-center font-black text-slate-950 text-sm shadow-md`}>
                      {profile.name.charAt(0)}
                    </div>
                    <div>
                      <div className="text-xs font-bold flex items-center gap-1.5">
                        <span>{profile.name}</span>
                        {isSelected && (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-purple-500 text-slate-950">
                            현재 사용 중
                          </span>
                        )}
                        {profile.googleConnected && (
                          <span className="text-[10px] text-cyan-400 bg-cyan-500/10 px-1.5 py-0.2 rounded border border-cyan-500/20">
                            Google 연동됨
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {profile.email || '로컬 독립 프로필'} • 생성일: {profile.createdAt.substring(0, 10)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {isSelected ? (
                      <div className="p-1.5 rounded-lg bg-purple-500/20 text-purple-400">
                        <Check className="w-4 h-4" />
                      </div>
                    ) : (
                      profiles.length > 1 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`'${profile.name}' 프로필을 삭제하시겠습니까?`)) {
                              onDeleteProfile(profile.id);
                            }
                          }}
                          className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-700 transition-colors"
                          title="프로필 삭제"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* 새 프로필 생성 버튼 or 폼 */}
          {!isCreating ? (
            <button
              onClick={() => setIsCreating(true)}
              className="w-full py-3 rounded-2xl border border-dashed border-slate-700 hover:border-purple-500/60 text-slate-300 hover:text-purple-400 text-xs font-bold flex items-center justify-center gap-1.5 transition-all bg-slate-950/30"
            >
              <Plus className="w-4 h-4" />
              새로운 사용자 프로필 추가하기
            </button>
          ) : (
            <form onSubmit={handleCreateSubmit} className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700 space-y-3 animate-in fade-in duration-200">
              <div className="text-xs font-bold text-slate-200 flex items-center justify-between">
                <span>새 프로필 정보 입력</span>
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="text-slate-400 hover:text-slate-200 text-xs"
                >
                  취소
                </button>
              </div>

              <div>
                <input
                  type="text"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="사용자 이름 / 닉네임 (예: 철인 민우)"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-purple-500"
                  required
                />
              </div>

              <div>
                <input
                  type="email"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder="이메일 (선택 사항)"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-purple-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-purple-500 hover:bg-purple-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-md transition-all"
              >
                <Check className="w-3.5 h-3.5" />
                프로필 생성 완료
              </button>
            </form>
          )}

        </div>

      </div>
    </div>
  );
};
