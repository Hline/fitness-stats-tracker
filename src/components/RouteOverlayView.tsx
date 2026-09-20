import React, { useState, useEffect, useRef } from 'react';
import { WorkoutRoute, BoundingBox } from '../types/route';
import { processRoutesAsync, projectLatLng, parseGpxXml } from '../services/routeProcessor';
import { 
  Map, 
  Flame, 
  Zap, 
  Upload, 
  Maximize2, 
  X, 
  Compass, 
  Layers, 
  Info,
  Sparkles,
  RefreshCw
} from 'lucide-react';

interface RouteOverlayViewProps {
  mode: 'daily' | 'monthly' | 'yearly';
  currentDateStr?: string;      // YYYY-MM-DD (일간 뷰)
  selectedPeriodStr?: string;   // YYYY-MM (월간) 또는 YYYY (연간)
  routes: WorkoutRoute[];
  onAddRoute?: (route: WorkoutRoute) => void;
  title?: string;
  isWidget?: boolean;
}

export const RouteOverlayView: React.FC<RouteOverlayViewProps> = ({
  mode,
  currentDateStr,
  selectedPeriodStr,
  routes,
  onAddRoute,
  title,
  isWidget = true
}) => {
  const [colorMode, setColorMode] = useState<'heatmap' | 'neon'>('heatmap');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showFallbackDemo, setShowFallbackDemo] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const modalCanvasRef = useRef<HTMLCanvasElement>(null);

  // 대상 기간에 따른 경로 필터링
  const getFilteredRoutes = (): WorkoutRoute[] => {
    if (mode === 'daily') {
      const daily = routes.filter(r => r.date === currentDateStr);
      if (daily.length > 0 || !showFallbackDemo) return daily;
      // 데모 보기 토글 시 최근 경로 최대 2개 오버레이
      return routes.slice(0, 2);
    }
    if (mode === 'monthly' && selectedPeriodStr) {
      return routes.filter(r => r.date.startsWith(selectedPeriodStr));
    }
    if (mode === 'yearly' && selectedPeriodStr) {
      return routes.filter(r => r.date.startsWith(selectedPeriodStr));
    }
    return routes;
  };

  const filteredRoutes = getFilteredRoutes();

  const [processedData, setProcessedData] = useState<{
    processedRoutes: WorkoutRoute[];
    boundingBox: BoundingBox;
    totalDistanceKm: number;
    totalMinutes: number;
  } | null>(null);

  // 경로 데이터 비동기 연산
  useEffect(() => {
    if (filteredRoutes.length === 0) {
      setProcessedData(null);
      return;
    }

    const isInstant = mode === 'daily' && filteredRoutes.length <= 2;
    setIsProcessing(true);
    setProgress({ current: 0, total: filteredRoutes.length });

    processRoutesAsync(filteredRoutes, isInstant, (cur, tot) => {
      setProgress({ current: cur, total: tot });
    }).then(result => {
      setProcessedData(result);
      setIsProcessing(false);
    });
  }, [mode, currentDateStr, selectedPeriodStr, routes, showFallbackDemo]);

  // 캔버스 렌더러 함수
  const drawOnCanvas = (canvas: HTMLCanvasElement | null) => {
    if (!canvas || !processedData) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // 1. 다크 배경 및 그리드
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 8]);
    for (let x = 0; x < width; x += 80) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += 80) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // 한강 워터마크 스타일 곡선
    ctx.strokeStyle = '#0f2942';
    ctx.lineWidth = Math.min(24, Math.max(12, width * 0.03));
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(width * 0.1, height * 0.35);
    ctx.bezierCurveTo(width * 0.35, height * 0.28, width * 0.65, height * 0.55, width * 0.95, height * 0.45);
    ctx.stroke();

    const { processedRoutes, boundingBox } = processedData;

    // 2. 경로 오버레이 렌더링
    ctx.globalCompositeOperation = colorMode === 'heatmap' ? 'lighter' : 'source-over';

    processedRoutes.forEach((route, rIdx) => {
      if (route.points.length < 2) return;

      const pts = route.points.map(pt => projectLatLng(pt.lat, pt.lng, boundingBox, width, height));

      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) {
        ctx.lineTo(pts[i].x, pts[i].y);
      }

      if (colorMode === 'heatmap') {
        // 단일 히트맵 모드: 누적될수록 밝게 발광
        ctx.strokeStyle = 'rgba(249, 115, 22, 0.45)';
        ctx.lineWidth = 4.5;
        ctx.shadowColor = '#f97316';
        ctx.shadowBlur = 8;
        ctx.stroke();

        ctx.strokeStyle = 'rgba(253, 224, 71, 0.6)';
        ctx.lineWidth = 1.8;
        ctx.shadowBlur = 0;
        ctx.stroke();
      } else {
        // 네온 멀티컬러 모드
        const colors = ['#10b981', '#06b6d4', '#f97316', '#a855f7', '#f43f5e', '#eab308'];
        const col = route.color || colors[rIdx % colors.length];

        ctx.strokeStyle = col;
        ctx.lineWidth = 3.5;
        ctx.shadowColor = col;
        ctx.shadowBlur = 6;
        ctx.stroke();
      }

      // 시작점/종료점
      ctx.shadowBlur = 0;
      ctx.globalCompositeOperation = 'source-over';
      
      // 시작점 (초록)
      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.arc(pts[0].x, pts[0].y, 4, 0, Math.PI * 2);
      ctx.fill();

      // 종료점 (빨강)
      const lastPt = pts[pts.length - 1];
      ctx.fillStyle = '#f43f5e';
      ctx.beginPath();
      ctx.arc(lastPt.x, lastPt.y, 4, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.globalCompositeOperation = 'source-over';
  };

  useEffect(() => {
    drawOnCanvas(canvasRef.current);
  }, [processedData, colorMode]);

  useEffect(() => {
    if (isModalOpen) {
      setTimeout(() => drawOnCanvas(modalCanvasRef.current), 50);
    }
  }, [isModalOpen, processedData, colorMode]);

  // GPX 업로드 핸들러
  const handleGpxUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const parsed = parseGpxXml(text, file.name.replace('.gpx', ''));
      if (parsed) {
        if (mode === 'daily' && currentDateStr) {
          parsed.date = currentDateStr;
        }
        onAddRoute?.(parsed);
        alert(`'${parsed.name}' (${parsed.distanceKm}km) 경로가 성공적으로 추가되었습니다!`);
      } else {
        alert('GPX 파일에서 유효한 좌표를 찾지 못했습니다.');
      }
    };
    reader.readAsText(file);
  };

  const getHeaderTitle = () => {
    if (title) return title;
    if (mode === 'daily') return '오늘의 운동 경로 보기 (데일리 오버레이)';
    if (mode === 'monthly') return `${selectedPeriodStr} 월간 운동 경로 누적 겹쳐보기 (히트맵)`;
    return `${selectedPeriodStr} 연간 운동 경로 누적 겹쳐보기 (풀 히트맵)`;
  };

  const getSubTitle = () => {
    if (mode === 'daily') {
      return '선택한 날짜에 완료한 야외 달리기, 사이클 경로를 지도 위에 오버레이하여 보여줍니다.';
    }
    if (mode === 'monthly') {
      return '해당 월에 달린 모든 데일리 코스들이 쌓여, 자주 달린 코스가 밝게 빛나는 월간 히트맵입니다.';
    }
    return '1년 동안 기록된 모든 야외 운동 경로가 한곳에 누적된 연간 종합 퍼스널 히트맵입니다.';
  };

  return (
    <div className={`rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl overflow-hidden ${isWidget ? 'p-5' : 'p-6'}`}>
      {/* 상단 헤더 영역 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Map className="w-4 h-4" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
              {mode === 'daily' ? 'DAILY ROUTE OVERLAY' : mode === 'monthly' ? 'MONTHLY ROUTE STACK' : 'YEARLY ROUTE HEATMAP'}
            </span>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
              {mode === 'daily' ? '1일 경로' : mode === 'monthly' ? '월간 누적' : '연간 누적'}
            </span>
          </div>
          <h3 className="text-base sm:text-lg font-black text-slate-100 flex items-center gap-2">
            {getHeaderTitle()}
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            {getSubTitle()}
          </p>
        </div>

        {/* 컨트롤 액션 바 */}
        <div className="flex items-center flex-wrap gap-2">
          {/* 스타일 토글 */}
          <div className="flex items-center bg-slate-800/80 p-0.5 rounded-xl border border-slate-700 text-xs">
            <button
              onClick={() => setColorMode('heatmap')}
              className={`px-2 py-1 rounded-lg font-semibold transition-all flex items-center gap-1 ${
                colorMode === 'heatmap' ? 'bg-orange-500 text-slate-950 shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Flame className="w-3 h-3" />
              <span>히트맵</span>
            </button>
            <button
              onClick={() => setColorMode('neon')}
              className={`px-2 py-1 rounded-lg font-semibold transition-all flex items-center gap-1 ${
                colorMode === 'neon' ? 'bg-cyan-500 text-slate-950 shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Zap className="w-3 h-3" />
              <span>네온</span>
            </button>
          </div>

          {/* GPX 추가 버튼 */}
          <label className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 border border-slate-700 cursor-pointer flex items-center gap-1 transition-all">
            <Upload className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">GPX</span>
            <input type="file" accept=".gpx,.xml" onChange={handleGpxUpload} className="hidden" />
          </label>

          {/* 크게 보기 팝업 토글 */}
          {processedData && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700 transition-colors"
              title="전체화면으로 크게 보기"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* 연산 진행 프로그레스 바 */}
      {isProcessing && (
        <div className="mb-3 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            <span>경로 좌표 연산 및 오버레이 처리 중... ({progress.current}/{progress.total})</span>
          </div>
          <span className="font-bold">{progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0}%</span>
        </div>
      )}

      {/* 캔버스 및 통계 컨텐츠 */}
      {processedData ? (
        <div className="space-y-3">
          {/* 지도 캔버스 뷰포트 */}
          <div className="relative w-full h-64 sm:h-80 md:h-96 rounded-xl overflow-hidden border border-slate-800 bg-[#090d16]">
            <canvas
              ref={canvasRef}
              width={960}
              height={480}
              className="w-full h-full object-cover"
            />
            
            {/* 캔버스 위 워터마크 안내 배지 */}
            <div className="absolute left-3 top-3 px-2.5 py-1 rounded-lg bg-slate-900/80 backdrop-blur border border-slate-700/80 text-[11px] text-slate-300 flex items-center gap-1.5">
              <Compass className="w-3 h-3 text-emerald-400" />
              <span>{processedData.processedRoutes.length}개 코스 오버레이</span>
            </div>

            <div className="absolute right-3 bottom-3 px-2.5 py-1 rounded-lg bg-slate-900/80 backdrop-blur border border-slate-700/80 text-[10px] text-slate-400">
              🟢 시작점 · 🔴 종료점
            </div>
          </div>

          {/* 지표 서머리 스트립 */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3 text-center">
            <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
              <span className="text-[10px] sm:text-xs text-slate-400 font-semibold block">누적 코스 수</span>
              <strong className="text-base sm:text-lg font-black text-amber-400">
                {processedData.processedRoutes.length}개
              </strong>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
              <span className="text-[10px] sm:text-xs text-slate-400 font-semibold block">총 이동 거리</span>
              <strong className="text-base sm:text-lg font-black text-cyan-400">
                {processedData.totalDistanceKm.toFixed(1)} km
              </strong>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
              <span className="text-[10px] sm:text-xs text-slate-400 font-semibold block">총 운동 시간</span>
              <strong className="text-base sm:text-lg font-black text-emerald-400">
                {processedData.totalMinutes}분
              </strong>
            </div>
          </div>
        </div>
      ) : (
        /* 경로 없음 빈 상태 */
        <div className="py-12 px-4 rounded-xl border border-dashed border-slate-800 text-center bg-slate-950/40">
          <Map className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <h4 className="text-sm font-bold text-slate-300">
            {mode === 'daily' ? `${currentDateStr} 당일 기록된 야외 GPS 경로가 없습니다.` : '해당 기간에 기록된 야외 GPS 경로가 없습니다.'}
          </h4>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            실내 운동이거나 GPS가 기록되지 않은 날입니다. 상단의 [GPX] 버튼으로 코스를 등록하거나 예시 코스를 켜서 확인해보세요.
          </p>
          <div className="mt-4 flex items-center justify-center gap-2">
            <button
              onClick={() => setShowFallbackDemo(prev => !prev)}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-amber-400 border border-amber-500/30 transition-all flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{showFallbackDemo ? '예시 끄기' : '한강 대표 코스 예시 겹쳐보기'}</span>
            </button>
          </div>
        </div>
      )}

      {/* 크게 보기 모달 */}
      {isModalOpen && processedData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-3 sm:p-6 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-6xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Map className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-slate-100">
                  {getHeaderTitle()} (전체화면)
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto flex-1 flex flex-col gap-4">
              <div className="relative w-full h-[60vh] rounded-2xl overflow-hidden border border-slate-800 bg-[#090d16]">
                <canvas
                  ref={modalCanvasRef}
                  width={1400}
                  height={750}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400 px-2">
                <div>
                  코스: <strong className="text-amber-400">{processedData.processedRoutes.length}개</strong> | 
                  총 거리: <strong className="text-cyan-400">{processedData.totalDistanceKm.toFixed(1)} km</strong> | 
                  시간: <strong className="text-emerald-400">{processedData.totalMinutes}분</strong>
                </div>
                <div className="text-slate-500">
                  더 많이 겹쳐질수록 선이 밝아지는 스트라바/나이키 스타일 퍼스널 히트맵
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
