import React, { useState } from 'react';
import { UserInquiry, InquiryType } from '../types/health';
import { 
  X, 
  MessageSquarePlus, 
  Send, 
  CheckCircle2, 
  Mail, 
  Bug, 
  Sparkles, 
  Smartphone, 
  HelpCircle,
  History,
  Info
} from 'lucide-react';

interface InquiryModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserId: string;
  currentUserName: string;
}

const INQUIRIES_STORAGE_KEY = 'fitstats_user_inquiries_v1';

export const InquiryModal: React.FC<InquiryModalProps> = ({
  isOpen,
  onClose,
  currentUserId,
  currentUserName
}) => {
  const [tab, setTab] = useState<'write' | 'history'>('write');
  const [type, setType] = useState<InquiryType>('feature');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [email, setEmail] = useState('');
  const [includeEnv, setIncludeEnv] = useState(true);
  const [isSuccess, setIsSuccess] = useState(false);

  // 이전 문의 내역 불러오기
  const [inquiries, setInquiries] = useState<UserInquiry[]>(() => {
    try {
      const saved = localStorage.getItem(INQUIRIES_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    const envInfo = includeEnv 
      ? `[브라우저 환경] UserAgent: ${navigator.userAgent.substring(0, 80)}, 화면 해상도: ${window.innerWidth}x${window.innerHeight}` 
      : undefined;

    const newInquiry: UserInquiry = {
      id: `inquiry-${Date.now()}`,
      userId: currentUserId,
      userName: currentUserName,
      type,
      title: title.trim(),
      content: content.trim() + (envInfo ? `\n\n${envInfo}` : ''),
      email: email.trim() || undefined,
      createdAt: new Date().toISOString(),
      status: 'pending'
    };

    const updated = [newInquiry, ...inquiries];
    setInquiries(updated);
    try {
      localStorage.setItem(INQUIRIES_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('문의 저장 실패:', e);
    }

    setIsSuccess(true);
    setTimeout(() => {
      setIsSuccess(false);
      setTitle('');
      setContent('');
      setTab('history');
    }, 1500);
  };

  // 메일 클라이언트로 직접 발송 (mailto:)
  const handleSendMailto = () => {
    const subject = encodeURIComponent(`[FitStats 문의] [${type}] ${title}`);
    const body = encodeURIComponent(`작성자: ${currentUserName}\n이메일: ${email || '미기재'}\n\n${content}`);
    window.open(`mailto:support@fitstats.app?subject=${subject}&body=${body}`, '_blank');
  };

  const getTypeName = (t: InquiryType) => {
    switch (t) {
      case 'feature': return { label: '기능 제안', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' };
      case 'bug': return { label: '버그 신고', color: 'text-rose-400 bg-rose-500/10 border-rose-500/20' };
      case 'sync': return { label: '연동 문의', color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20' };
      case 'general': return { label: '일반 문의', color: 'text-slate-300 bg-slate-800 border-slate-700' };
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20">
              <MessageSquarePlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                문의 및 요청하기
                <span className="text-[10px] font-medium text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded-full border border-teal-500/20">
                  Feedback & Support
                </span>
              </h3>
              <p className="text-xs text-slate-400">원하시는 기능 제안이나 오류 사항을 자유롭게 남겨주세요.</p>
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
        <div className="flex border-b border-slate-800 bg-slate-950/40 px-6 pt-3 gap-3">
          <button
            onClick={() => setTab('write')}
            className={`pb-3 px-2 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              tab === 'write'
                ? 'border-teal-400 text-teal-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <MessageSquarePlus className="w-3.5 h-3.5" />
            <span>새 문의 작성</span>
          </button>

          <button
            onClick={() => setTab('history')}
            className={`pb-3 px-2 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              tab === 'history'
                ? 'border-teal-400 text-teal-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>접수 내역 ({inquiries.length})</span>
          </button>
        </div>

        {/* 본문 */}
        <div className="p-6">
          {isSuccess ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-slate-100">문의가 성공적으로 접수되었습니다!</h4>
              <p className="text-xs text-slate-400">보내주신 소중한 피드백은 FitStats 기능 개선에 적극 반영됩니다.</p>
            </div>
          ) : tab === 'write' ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* 1. 문의 유형 */}
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-2">
                  문의 유형
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'feature', label: '✨ 기능 제안' },
                    { id: 'bug', label: '🐛 버그 신고' },
                    { id: 'sync', label: '📲 연동 문의' },
                    { id: 'general', label: '💬 일반 문의' }
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setType(item.id as InquiryType)}
                      className={`p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                        type === item.id
                          ? 'bg-teal-500/20 border-teal-400 text-teal-300'
                          : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. 제목 */}
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  제목
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="예: 애플 건강 수면 데이터 연동 위젯도 추가해주세요"
                  className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-teal-500"
                  required
                />
              </div>

              {/* 3. 내용 */}
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  문의 및 요청 내용
                </label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={4}
                  placeholder="불편하셨던 점이나 추가되었으면 하는 기능, 개선 아이디어를 자세히 적어주세요."
                  className="w-full bg-slate-800/80 border border-slate-700 rounded-xl p-3 text-xs text-slate-100 focus:outline-none focus:border-teal-500 resize-none"
                  required
                />
              </div>

              {/* 4. 회신 이메일 (선택) */}
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  회신받으실 이메일 (선택)
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="답변을 받아보실 이메일 주소"
                  className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-teal-500"
                />
              </div>

              {/* 브라우저 환경 정보 첨부 옵션 */}
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-400">
                <input
                  type="checkbox"
                  checked={includeEnv}
                  onChange={(e) => setIncludeEnv(e.target.checked)}
                  className="rounded bg-slate-800 border-slate-700 text-teal-500 focus:ring-0"
                />
                <span>빠른 오류 분석을 위해 브라우저 환경 정보를 함께 전송합니다.</span>
              </label>

              {/* 액션 버튼 */}
              <div className="pt-2 flex items-center gap-2">
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-teal-500/20 transition-all active:scale-95"
                >
                  <Send className="w-4 h-4" />
                  문의 접수하기
                </button>

                <button
                  type="button"
                  onClick={handleSendMailto}
                  className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold border border-slate-700 transition-all"
                  title="기본 메일 앱으로 발송"
                >
                  <Mail className="w-4 h-4" />
                </button>
              </div>

            </form>
          ) : (
            // 접수 내역 탭
            <div className="space-y-3 max-h-[50vh] overflow-y-auto">
              {inquiries.length === 0 ? (
                <div className="py-10 text-center text-xs text-slate-500">
                  접수된 문의 내역이 없습니다.
                </div>
              ) : (
                inquiries.map((item) => {
                  const typeInfo = getTypeName(item.type);
                  return (
                    <div key={item.id} className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${typeInfo.color}`}>
                          {typeInfo.label}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          {item.createdAt.substring(0, 10)}
                        </span>
                      </div>
                      <h5 className="text-xs font-bold text-slate-100">{item.title}</h5>
                      <p className="text-xs text-slate-400 whitespace-pre-line">{item.content}</p>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
