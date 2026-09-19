import React, { useState, useEffect, useRef } from 'react';
import { WorkoutRoute, HeatmapPeriod, BoundingBox } from '../types/route';
import { generateDemoRoutes } from '../services/demoRoutes';
import { processRoutesAsync, projectLatLng, parseGpxXml } from '../services/routeProcessor';
import { 
  X, 
  Map, 
  Layers, 
  Calendar, 
  Flame, 
  Upload, 
  Check, 
  Sparkles, 
  Activity, 
  Compass, 
  RefreshCw,
  Zap,
  Info
} from 'lucide-react';

interface RouteOverlayMapModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RouteOverlayMapModal: React.FC<RouteOverlayMapModalProps> = ({
  isOpen,
  onClose
}) => {
  const [allRoutes, setAllRoutes] = useState<WorkoutRoute[]>(() => generateDemoRoutes());
  const [period, setPeriod] = useState<HeatmapPeriod>('month');
  
  // 백단 비동기 연산 상태
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [processedData, setProcessedData] = useState<{
    processedRoutes: WorkoutRoute[];
    boundingBox: BoundingBox;
    totalDistanceKm: number;
    totalMinutes: number;
  } | null>(null);

  // 뷰 모드 ('neon' 네온 멀티컬러 vs 'heatmap' 단일 스트라바 히트맵)
  const [colorMode, setColorMode] = useState<'neon' | 'heatmap'>('heatmap');

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // 기간별 라우트 필터링
  const getFilteredRoutes = (selectedPeriod: HeatmapPeriod): WorkoutRoute[] => {
    switch (selectedPeriod) {
      case 'today':
        return allRoutes.filter(r => r.date === '2026-09-13');
      case 'week':
        return allRoutes.slice(0, 4); // 최근 4개 코스
      case 'month':
      case 'all':
      default:
        return allRoutes; // 전체 누적 코스
    }
  };

  // 기간 변경 시 비동기 백단 경로 처리 트리거
  useEffect(() => {
    if (!isOpen) return;

    const filtered = getFilteredRoutes(period);
    const isInstant = period === 'today'; // 하루치는 즉시 처리!

    setIsProcessing(true);
    setProgress({ current: 0, total: filtered.length });

    processRoutesAsync(filtered, isInstant, (cur, tot) => {
      setProgress({ current: cur, total: tot });
    }).then(result => {
      setProcessedData(result);
      setIsProcessing(false);
    });
  }, [period, isOpen, allRoutes]);

  // 캔버스 렌더링 (경로 겹치기 및 히트맵 렌더링)
  useEffect(() => {
    if (!processedData || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // 1. 다크 배경 및 맵 그리드
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, width, height);

    // 가이드 그리드 라인
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

    // 한강 워터마크 스타일 곡선 (서울 배경 가이드)
    ctx.strokeStyle = '#0f2942';
    ctx.lineWidth = 24;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(width * 0.1, height * 0.35);
    ctx.bezierCurveTo(width * 0.35, height * 0.28, width * 0.65, height * 0.55, width * 0.95, height * 0.45);
    ctx.stroke();

    const { processedRoutes, boundingBox } = processedData;

    // 2. 경로 오버레이 렌더링 (스트라바 히트맵 블렌딩)
    // 겹칠수록 밝아지도록 screen 또는 lighter 블렌딩 모드 적용!
    ctx.globalCompositeOperation = colorMode === 'heatmap' ? 'lighter' : 'source-over';

    processedRoutes.forEach((route, rIdx) => {
      if (route.points.length < 2) return;

      const pts = route.points.map(pt => projectLatLng(pt.lat, pt.lng, boundingBox, width, height));

      // 메인 경로 스트로크
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) {
        ctx.lineTo(pts[i].x, pts[i].y);
      }

      if (colorMode === 'heatmap') {
        // 단일 히트맵 모드: 강렬한 오렌지/네온 앰버 발광
        ctx.strokeStyle = 'rgba(249, 115, 22, 0.45)';
        ctx.lineWidth = 4.5;
        ctx.shadowColor = '#f97316';
        ctx.shadowBlur = 8;
        ctx.stroke();

        // 중심선 코어 (더 밝은 옐로우)
        ctx.strokeStyle = 'rgba(253, 224, 71, 0.6)';
        ctx.lineWidth = 1.8;
        ctx.shadowBlur = 0;
        ctx.stroke();
      } else {
        // 네온 멀티컬러 모드: 각 경로 고유 색상
        const colors = ['#10b981', '#06b6d4', '#f97316', '#a855f7', '#f43f5e', '#eab308'];
        const col = route.color || colors[rIdx % colors.length];

        ctx.strokeStyle = col;
        ctx.lineWidth = 3.5;
        ctx.shadowColor = col;
        ctx.shadowBlur = 6;
        ctx.stroke();
      }

      // 시작점 및 종료점 마커
      ctx.shadowBlur = 0;
      ctx.globalCompositeOperation = 'source-over';
      
      // 시작점 (초록 점)
      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.arc(pts[0].x, pts[0].y, 4, 0, Math.PI * 2);
      ctx.fill();

      // 종료점 (빨강 점)
      const lastPt = pts[pts.length - 1];
      ctx.fillStyle = '#f43f5e';
      ctx.beginPath();
      ctx.arc(lastPt.x, lastPt.y, 4, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.globalCompositeOperation = 'source-over';
  }, [processedData, colorMode]);

  // GPX 파일 업로드 처리
  const handleGpxUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const parsed = parseGpxXml(text, file.name.replace('.gpx', ''));
      if (parsed) {
        setAllRoutes(prev => [parsed, ...prev]);
        alert(`'${parsed.name}' (${parsed.distanceKm}km) 경로가 지도에 성공적으로 추가되었습니다!`);
      } else {
        alert('GPX 파일에서 유효한 트랙 좌표를 찾지 못했습니다.');
      }
    };
    reader.readAsText(file);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-6 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-5xl max-h-[94vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* 모달 상단 헤더 */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90 gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 text-slate-950 font-bold shadow-md">
              <Map className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                운동 경로 누적 겹쳐보기
                <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                  Personal Heatmap
                </span>
              </h3>
              <p className="text-xs text-slate-400">선택한 기간 동안 달린 모든 코스를 지도에 겹쳐서 자주 달린 코스를 밝게 시각화합니다.</p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            {/* GPX 추가 업로드 버튼 */}
            <label className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 border border-slate-700 cursor-pointer flex items-center gap-1.5 transition-all">
              <Upload className="w-3.5 h-3.5 text-amber-400" />
              <span>GPX 추가</span>
              <input type="file" accept=".gpx,.xml" onChange={handleGpxUpload} className="hidden" />
            </label>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-slate-100 hover:bg-slate-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 컨트롤 패널: 기간 선택 및 시각화 모드 */}
        <div className="px-6 py-3 bg-slate-950/60 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
          
          {/* 기간 선택 탭 */}
          <div className="flex items-center bg-slate-800/80 p-1 rounded-xl border border-slate-700">
            {[
              { id: 'today', label: '오늘 (1일)', sub: '즉시 표시' },
              { id: 'week', label: '최근 7일', sub: '백단 연산' },
              { id: 'month', label: '이번 달 (30일)', sub: '백단 연산' },
              { id: 'all', label: '전체 코스 누적', sub: '풀 히트맵' }
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setPeriod(p.id as HeatmapPeriod)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  period === p.id
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>{p.label}</span>
                {period === p.id && (
                  <span className="text-[9px] bg-slate-950/20 px-1 rounded uppercase">{p.sub}</span>
                )}
              </button>
            ))}
          </div>

          {/* 시각화 모드 토글 (히트맵 vs 네온 코스) */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 hidden sm:inline">스타일:</span>
            <div className="flex items-center bg-slate-800/80 p-1 rounded-xl border border-slate-700">
              <button
                onClick={() => setColorMode('heatmap')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1 ${
                  colorMode === 'heatmap' ? 'bg-orange-500 text-slate-950' : 'text-slate-400'
                }`}
              >
                <Flame className="w-3 h-3" />
                스트라바 히트맵
              </button>
              <button
                onClick={() => setColorMode('neon')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1 ${
                  colorMode === 'neon' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400'
                }`}
              >
                <Zap className="w-3 h-3" />
                네온 개별 코스
              </button>
            </div>
          </div>

        </div>

        {/* 백그라운드 연산 진행 알림 바 */}
        {isProcessing && (
          <div className="bg-amber-500/15 border-b border-amber-500/30 px-6 py-2 flex items-center justify-between text-xs text-amber-300">
            <div className="flex items-center gap-2">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>
                <strong>백그라운드 청크 연산 중:</strong> UI 멈춤 없이 {progress.total}개 코스의 GPS 경로를 백단에서 최적화 중입니다... ({progress.current}/{progress.total})
              </span>
            </div>
            <span className="font-bold">
              {Math.round((progress.current / (progress.total || 1)) * 100)}%
            </span>
          </div>
        )}

        {/* 지도 캔버스 영역 */}
        <div className="relative flex-1 bg-slate-950 min-h-[420px] flex items-center justify-center overflow-hidden">
          <canvas
            ref={canvasRef}
            width={960}
            height={520}
            className="w-full h-full object-contain"
          />

          {/* 지도 위 플로팅 통계 뱃지 */}
          {processedData && (
            <div className="absolute top-4 left-4 bg-slate-900/90 backdrop-blur-md border border-slate-800 p-3.5 rounded-2xl shadow-xl space-y-1 text-xs">
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1">
                <Compass className="w-3 h-3 text-amber-400" />
                OVERLAY SUMMARY
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-black text-slate-100">
                  {processedData.processedRoutes.length}개 코스
                </span>
                <span className="text-xs text-amber-400 font-bold">
                  총 {processedData.totalDistanceKm.toFixed(1)} km
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                누적 시간: {Math.floor(processedData.totalMinutes / 60)}시간 {processedData.totalMinutes % 60}분
              </p>
            </div>
          )}

          {/* 범례 */}
          <div className="absolute bottom-4 right-4 bg-slate-900/90 backdrop-blur-md border border-slate-800 px-3 py-2 rounded-xl shadow-lg flex items-center gap-3 text-[11px] text-slate-300">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              출발지
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              도착지
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-1 rounded bg-orange-400" />
              중복 누적 구간 (발광)
            </span>
          </div>
        </div>

        {/* 하단 코스 리스트 및 설명 */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-400">
            <Info className="w-4 h-4 text-cyan-400 flex-shrink-0" />
            <span>
              💡 <strong>개인 히트맵 원리:</strong> 같은 길을 여러 번 달릴수록 경로 광도가 누적되어 더욱 밝게 표시됩니다. 1일치는 즉시 표시되며 긴 기간은 백그라운드 청크 스레드로 UI 프리징 없이 부드럽게 렌더링됩니다.
            </span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition-all self-end sm:self-auto"
          >
            닫기
          </button>
        </div>

      </div>
    </div>
  );
};
