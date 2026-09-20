import React, { useRef, useState } from 'react';
import { DailyStats, SnsRatio, SnsTheme } from '../types/health';
import { toPng, toBlob } from 'html-to-image';
import { 
  X, 
  Download, 
  Copy, 
  Share2, 
  Sparkles, 
  Flame, 
  Heart, 
  Footprints, 
  Dumbbell, 
  Check, 
  Smartphone,
  Layers,
  Palette,
  Clock
} from 'lucide-react';

interface SnsShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  stats: DailyStats;
}

export const SnsShareModal: React.FC<SnsShareModalProps> = ({
  isOpen,
  onClose,
  stats
}) => {
  const cardRef = useRef<HTMLDivElement>(null);

  // 설정 상태
  const [ratio, setRatio] = useState<SnsRatio>('9:16');
  const [theme, setTheme] = useState<SnsTheme>('cyber-neon');
  const [userName, setUserName] = useState('오운완러');
  const [customComment, setCustomComment] = useState('오늘도 한계를 넘었다! 🔥 #오운완 #운동스타그램');
  const [isExporting, setIsExporting] = useState(false);
  const [copiedSuccess, setCopiedSuccess] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  if (!isOpen) return null;

  // 날짜 포맷팅
  const [year, month, day] = stats.date.split('-').map(Number);
  const dateObj = new Date(year, month - 1, day);
  const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const formattedDate = `${year}.${String(month).padStart(2, '0')}.${String(day).padStart(2, '0')} ${dayNames[dateObj.getDay()]}`;

  // 테마별 스타일 정의
  const getThemeStyles = () => {
    switch (theme) {
      case 'cyber-neon':
        return {
          container: 'bg-slate-950 text-slate-100 border border-emerald-500/30',
          glow: 'bg-emerald-500/20',
          accentGradient: 'from-emerald-400 via-teal-300 to-cyan-400',
          badgeBg: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30',
          highlightBox: 'bg-slate-900/90 border border-slate-800'
        };
      case 'apple-ring':
        return {
          container: 'bg-black text-white border border-rose-500/30',
          glow: 'bg-rose-500/20',
          accentGradient: 'from-rose-500 via-amber-400 to-emerald-400',
          badgeBg: 'bg-rose-500/20 text-rose-300 border border-rose-500/40',
          highlightBox: 'bg-neutral-900 border border-neutral-800'
        };
      case 'sunset-glow':
        return {
          container: 'bg-gradient-to-b from-slate-950 via-purple-950/40 to-slate-950 text-white border border-orange-500/30',
          glow: 'bg-orange-500/20',
          accentGradient: 'from-orange-400 via-rose-400 to-purple-400',
          badgeBg: 'bg-orange-500/20 text-orange-300 border border-orange-500/40',
          highlightBox: 'bg-slate-900/80 border border-purple-900/40'
        };
      case 'modern-dark':
      default:
        return {
          container: 'bg-zinc-950 text-zinc-100 border border-zinc-800',
          glow: 'bg-zinc-600/10',
          accentGradient: 'from-white via-zinc-200 to-zinc-400',
          badgeBg: 'bg-zinc-800 text-zinc-300 border border-zinc-700',
          highlightBox: 'bg-zinc-900/90 border border-zinc-800'
        };
    }
  };

  const themeStyle = getThemeStyles();

  // 비율별 크기 (픽셀 기준)
  const getDimensionClass = () => {
    switch (ratio) {
      case '9:16':
        return 'w-[360px] min-h-[640px]'; // 인스타 스토리 규격
      case '1:1':
        return 'w-[400px] min-h-[400px]'; // 인스타 피드 규격
      case '16:9':
        return 'w-[520px] min-h-[300px]'; // 가로 썸네일 규격
    }
  };

  // 1. 고해상도 PNG 다운로드
  const handleDownloadImage = async () => {
    if (!cardRef.current) return;
    setIsExporting(true);
    try {
      const dataUrl = await toPng(cardRef.current, {
        pixelRatio: 2, // 선명한 2배 레티나 해상도
        cacheBust: true
      });
      const link = document.createElement('a');
      link.download = `fitstats_${stats.date}_${ratio.replace(':', 'x')}.png`;
      link.href = dataUrl;
      link.click();
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 2500);
    } catch (err) {
      console.error('이미지 생성 오류:', err);
      alert('이미지 생성에 실패했습니다. 브라우저 설정을 확인해주세요.');
    } finally {
      setIsExporting(false);
    }
  };

  // 2. 클립보드 이미지 복사 (SNS에 Ctrl+V로 붙여넣기)
  const handleCopyClipboard = async () => {
    if (!cardRef.current) return;
    setIsExporting(true);
    try {
      const blob = await toBlob(cardRef.current, {
        pixelRatio: 2,
        cacheBust: true
      });
      if (!blob) throw new Error('Blob 생성 실패');

      if (navigator.clipboard && window.ClipboardItem) {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob })
        ]);
        setCopiedSuccess(true);
        setTimeout(() => setCopiedSuccess(false), 2500);
      } else {
        alert('이 브라우저에서는 클립보드 이미지 복사를 직접 지원하지 않습니다. [이미지 저장]을 이용해주세요.');
      }
    } catch (err) {
      console.error('클립보드 복사 오류:', err);
      alert('클립보드 복사에 실패했습니다. [이미지 저장] 버튼을 이용해주세요.');
    } finally {
      setIsExporting(false);
    }
  };

  // 3. Web Share API (모바일 시스템 공유 시트: 인스타/카톡 직접 공유)
  const handleNativeShare = async () => {
    if (!cardRef.current) return;
    setIsExporting(true);
    try {
      const blob = await toBlob(cardRef.current, {
        pixelRatio: 2,
        cacheBust: true
      });
      if (!blob) throw new Error('Blob 생성 실패');

      const file = new File([blob], `fitstats_${stats.date}.png`, { type: 'image/png' });
      
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: '오늘의 운동 기록 - FitStats',
          text: customComment
        });
      } else {
        // 폴백: 다운로드 실행
        handleDownloadImage();
      }
    } catch (err) {
      console.error('공유 실패:', err);
    } finally {
      setIsExporting(false);
    }
  };

  // 애플 헬스 3대 활동 링 계산
  const calGoal = stats.calorieGoal || 600;
  const calPercent = Math.min(100, Math.round(((stats.activeCalories || 0) / calGoal) * 100));

  const totalMinutes = stats.workouts.reduce((sum, w) => sum + (w.durationMinutes || 0), 0);
  const exGoal = 30; // 30분 운동 목표 (애플 건강 표준)
  const exPercent = Math.min(100, Math.round((totalMinutes / exGoal) * 100));

  const stepGoal = stats.stepGoal || 10000;
  const stepPercent = Math.min(100, Math.round(((stats.totalSteps || 0) / stepGoal) * 100));

  const avgRingPercent = Math.round((calPercent + exPercent + stepPercent) / 3);

  const getRingParams = (radius: number, percent: number) => {
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (Math.min(100, Math.max(0, percent)) / 100) * circumference;
    return { circumference, strokeDashoffset };
  };

  const calRing = getRingParams(50, calPercent);
  const exRing = getRingParams(38, exPercent);
  const stepRing = getRingParams(26, stepPercent);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-6 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* 모달 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-emerald-500 to-cyan-500 text-slate-950 font-bold">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                SNS 공유 카드 스튜디오
                <span className="text-[11px] font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  Instagram & SNS Ready
                </span>
              </h3>
              <p className="text-xs text-slate-400">오운완 인증용 감각적인 이미지 카드를 생성하고 바로 공유하세요.</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-slate-100 hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 모달 본문 (좌측 옵션 패널 + 우측 라이브 프리뷰) */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* 좌측: 스타일 및 내용 커스텀 컨트롤러 */}
          <div className="lg:col-span-5 space-y-5">
            
            {/* 1. 비율 선택 */}
            <div>
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 mb-2.5">
                <Smartphone className="w-4 h-4 text-cyan-400" />
                SNS 규격 비율
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: '9:16', label: '인스타 스토리', sub: '9:16 세로' },
                  { id: '1:1', label: '인스타 피드', sub: '1:1 정방형' },
                  { id: '16:9', label: '블로그 / X', sub: '16:9 와이드' }
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setRatio(item.id as SnsRatio)}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      ratio === item.id
                        ? 'bg-emerald-500/15 border-emerald-500 text-emerald-300 font-bold'
                        : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    <div className="text-xs font-semibold">{item.label}</div>
                    <div className="text-[10px] text-slate-500">{item.sub}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* 2. 테마 스타일 선택 */}
            <div>
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 mb-2.5">
                <Palette className="w-4 h-4 text-emerald-400" />
                비주얼 컬러 테마
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'cyber-neon', name: '네온 사이버', dot: 'bg-emerald-400' },
                  { id: 'apple-ring', name: '애플 액티비티', dot: 'bg-rose-500' },
                  { id: 'sunset-glow', name: '선셋 글로우', dot: 'bg-orange-400' },
                  { id: 'modern-dark', name: '미니멀 블랙', dot: 'bg-slate-300' }
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTheme(t.id as SnsTheme)}
                    className={`p-2.5 rounded-xl border flex items-center gap-2 transition-all ${
                      theme === t.id
                        ? 'bg-slate-800 border-emerald-500 text-slate-100 font-bold'
                        : 'bg-slate-800/40 border-slate-700/60 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    <span className={`w-3 h-3 rounded-full ${t.dot}`} />
                    <span className="text-xs">{t.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 3. 닉네임 & 커스텀 문구 */}
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">
                  닉네임 / 러너 이름
                </label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="예: 러너 민수"
                  className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">
                  오운완 한마디 코멘트
                </label>
                <textarea
                  value={customComment}
                  onChange={(e) => setCustomComment(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 resize-none"
                />
              </div>
            </div>

            {/* 출력 액션 버튼 3종 */}
            <div className="pt-2 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleDownloadImage}
                  disabled={isExporting}
                  className="py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all active:scale-95 disabled:opacity-50"
                >
                  {downloadSuccess ? (
                    <>
                      <Check className="w-4 h-4" />
                      저장 완료!
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      이미지 다운로드
                    </>
                  )}
                </button>

                <button
                  onClick={handleCopyClipboard}
                  disabled={isExporting}
                  className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                >
                  {copiedSuccess ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span className="text-emerald-400">복사 완료!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      클립보드 복사
                    </>
                  )}
                </button>
              </div>

              <button
                onClick={handleNativeShare}
                disabled={isExporting}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all active:scale-95 disabled:opacity-50"
              >
                <Share2 className="w-4 h-4" />
                모바일 SNS 바로 공유 (인스타 / 카톡)
              </button>
            </div>

          </div>

          {/* 우측: 라이브 캡처 카드 프리뷰 영역 */}
          <div className="lg:col-span-7 flex flex-col items-center justify-center bg-slate-950/60 rounded-2xl p-4 sm:p-6 border border-slate-800/80 overflow-x-auto">
            
            {/* 캡처 대상 실제 DOM 컨테이너 */}
            <div
              ref={cardRef}
              className={`${getDimensionClass()} ${themeStyle.container} p-6 sm:p-8 rounded-3xl shadow-2xl relative overflow-hidden flex flex-col justify-between transition-all duration-300`}
            >
              {/* 배경 블러 장식 */}
              <div className={`absolute -right-10 -top-10 w-48 h-48 ${themeStyle.glow} rounded-full blur-3xl pointer-events-none`} />
              <div className={`absolute -left-10 -bottom-10 w-48 h-48 ${themeStyle.glow} rounded-full blur-3xl pointer-events-none`} />

              {/* 1. 상단 브랜딩 & 날짜 */}
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                    <span className="text-[11px] font-black tracking-widest uppercase text-slate-400">
                      FITSTATS DAILY RECAP
                    </span>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${themeStyle.badgeBg}`}>
                    {formattedDate}
                  </span>
                </div>

                <div className="mb-4">
                  <h2 className={`text-2xl sm:text-3xl font-black tracking-tight bg-gradient-to-r ${themeStyle.accentGradient} bg-clip-text text-transparent`}>
                    TODAY'S WORKOUT
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Athlete: <strong className="text-slate-200">{userName}</strong>
                  </p>
                </div>
              </div>

              {/* 2. 4대 핵심 지표 그리드 (걸음 수, 소모 칼로리, 운동 시간, 최고 심박수) */}
              <div className="relative z-10 grid grid-cols-2 gap-2.5 my-auto py-1.5">
                
                {/* 지표 1: 오늘 걸음 수 */}
                <div className={`p-3 rounded-2xl ${themeStyle.highlightBox}`}>
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mb-1">
                    <Footprints className="w-3.5 h-3.5 text-cyan-400" />
                    <span>오늘 걸음 수</span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-xl sm:text-2xl font-black text-cyan-400">
                      {stats.totalSteps.toLocaleString()}
                    </span>
                    <span className="text-xs text-slate-400 font-semibold">보</span>
                  </div>
                </div>

                {/* 지표 2: 소모 칼로리 */}
                <div className={`p-3 rounded-2xl ${themeStyle.highlightBox}`}>
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mb-1">
                    <Flame className="w-3.5 h-3.5 text-orange-400" />
                    <span>소모 칼로리</span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-xl sm:text-2xl font-black text-orange-400">
                      {stats.activeCalories.toLocaleString()}
                    </span>
                    <span className="text-xs text-slate-400 font-semibold">kcal</span>
                  </div>
                </div>

                {/* 지표 3: 운동 시간 */}
                <div className={`p-3 rounded-2xl ${themeStyle.highlightBox}`}>
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mb-1">
                    <Clock className="w-3.5 h-3.5 text-emerald-400" />
                    <span>운동 시간</span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-xl sm:text-2xl font-black text-emerald-400">
                      {totalMinutes}
                    </span>
                    <span className="text-xs text-slate-400 font-semibold">분</span>
                  </div>
                </div>

                {/* 지표 4: 운동시간 동안 최고 심박수 */}
                <div className={`p-3 rounded-2xl ${themeStyle.highlightBox}`}>
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mb-1">
                    <Heart className="w-3.5 h-3.5 text-rose-500" />
                    <span>최고 심박수</span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-xl sm:text-2xl font-black text-rose-400">
                      {stats.peakHeartRate > 0 ? stats.peakHeartRate : 0}
                    </span>
                    <span className="text-xs text-slate-400 font-semibold">
                      BPM {stats.peakHeartRate <= 0 && '(미측정)'}
                    </span>
                  </div>
                </div>

              </div>

              {/* 3. 애플 헬스 3단 활동 링 (Activity Rings - 사용자 요청 반영) */}
              <div className={`relative z-10 p-3.5 sm:p-4 rounded-2xl ${themeStyle.highlightBox} my-1.5 flex items-center justify-around gap-4`}>
                {/* 3단 동심원 SVG 링 */}
                <div className="relative w-[120px] h-[120px] flex-shrink-0 flex items-center justify-center">
                  <svg width="120" height="120" className="transform -rotate-90">
                    {/* 1. 움직임/칼로리 링 (빨강) */}
                    <circle cx="60" cy="60" r="48" stroke="#380512" strokeWidth="9" fill="none" />
                    <circle
                      cx="60" cy="60" r="48"
                      stroke="#ff2453" strokeWidth="9"
                      strokeDasharray={calRing.circumference}
                      strokeDashoffset={calRing.strokeDashoffset}
                      strokeLinecap="round" fill="none"
                    />

                    {/* 2. 운동시간 링 (초록) */}
                    <circle cx="60" cy="60" r="36" stroke="#08331d" strokeWidth="9" fill="none" />
                    <circle
                      cx="60" cy="60" r="36"
                      stroke="#30e36b" strokeWidth="9"
                      strokeDasharray={exRing.circumference}
                      strokeDashoffset={exRing.strokeDashoffset}
                      strokeLinecap="round" fill="none"
                    />

                    {/* 3. 일일 걸음수 링 (시안) */}
                    <circle cx="60" cy="60" r="24" stroke="#082f49" strokeWidth="9" fill="none" />
                    <circle
                      cx="60" cy="60" r="24"
                      stroke="#00e5ff" strokeWidth="9"
                      strokeDasharray={stepRing.circumference}
                      strokeDashoffset={stepRing.strokeDashoffset}
                      strokeLinecap="round" fill="none"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                    <span className="text-[9px] font-black tracking-widest text-slate-400">RINGS</span>
                    <span className="text-sm font-extrabold text-slate-100">{avgRingPercent}%</span>
                  </div>
                </div>

                {/* 링 세부 목표 달성치 게이지 */}
                <div className="flex-1 space-y-2 min-w-0">
                  {/* 움직임 (칼로리) */}
                  <div className="space-y-0.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="flex items-center gap-1 font-bold text-rose-400">
                        <Flame className="w-3 h-3" />
                        <span>움직임</span>
                      </span>
                      <span className="font-mono text-slate-300 font-semibold text-[10px]">
                        {stats.activeCalories} / {calGoal} kcal
                      </span>
                    </div>
                    <div className="w-full bg-slate-950/70 rounded-full h-1.5 overflow-hidden">
                      <div className="bg-rose-500 h-full rounded-full transition-all" style={{ width: `${Math.min(100, calPercent)}%` }} />
                    </div>
                  </div>

                  {/* 운동하기 (시간) */}
                  <div className="space-y-0.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="flex items-center gap-1 font-bold text-emerald-400">
                        <Clock className="w-3 h-3" />
                        <span>운동하기</span>
                      </span>
                      <span className="font-mono text-slate-300 font-semibold text-[10px]">
                        {totalMinutes} / {exGoal} 분
                      </span>
                    </div>
                    <div className="w-full bg-slate-950/70 rounded-full h-1.5 overflow-hidden">
                      <div className="bg-emerald-400 h-full rounded-full transition-all" style={{ width: `${Math.min(100, exPercent)}%` }} />
                    </div>
                  </div>

                  {/* 일일 걸음 */}
                  <div className="space-y-0.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="flex items-center gap-1 font-bold text-cyan-400">
                        <Footprints className="w-3 h-3" />
                        <span>일일 걸음</span>
                      </span>
                      <span className="font-mono text-slate-300 font-semibold text-[10px]">
                        {stats.totalSteps.toLocaleString()} / {stepGoal.toLocaleString()} 보
                      </span>
                    </div>
                    <div className="w-full bg-slate-950/70 rounded-full h-1.5 overflow-hidden">
                      <div className="bg-cyan-400 h-full rounded-full transition-all" style={{ width: `${Math.min(100, stepPercent)}%` }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* 4. 커스텀 코멘트 & 푸터 */}
              <div className="relative z-10 space-y-2 mt-auto pt-2">
                {customComment && (
                  <div className="text-xs font-medium text-slate-300 bg-slate-900/60 border border-slate-800/80 px-3 py-2 rounded-xl italic">
                    "{customComment}"
                  </div>
                )}

                {/* 푸터 워터마크 */}
                <div className="flex items-center justify-between text-[9px] text-slate-500 pt-2 border-t border-slate-800/60">
                  <span>Tracked with FitStats Studio</span>
                  <span>#AppleHealth #ActivityRings #오운완</span>
                </div>
              </div>

            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
