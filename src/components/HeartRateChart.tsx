import React from 'react';
import { HeartRateSample, WorkoutSession } from '../types/health';
import { Heart, TrendingUp } from 'lucide-react';

interface HeartRateChartProps {
  samples: HeartRateSample[];
  peakHeartRate: number;
  restingHeartRate?: number;
  workouts: WorkoutSession[];
}

export const HeartRateChart: React.FC<HeartRateChartProps> = ({
  samples,
  peakHeartRate,
  restingHeartRate,
  workouts
}) => {
  if (!samples || samples.length === 0) {
    return (
      <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-5 shadow-lg">
        <h3 className="text-base font-bold text-slate-100 flex items-center gap-2 mb-2">
          <Heart className="w-4 h-4 text-rose-500" />
          일일 심박수 추이 & 운동 피크
        </h3>
        <p className="text-xs text-slate-500 py-6 text-center">
          기록된 심박수 샘플이 없습니다. (N/A)
        </p>
      </div>
    );
  }

  // SVG 차트 크기 및 계산
  const width = 800;
  const height = 220;
  const padding = { top: 25, right: 30, bottom: 35, left: 45 };

  const baselineHr = restingHeartRate && restingHeartRate > 0 ? restingHeartRate : Math.min(...samples.map(s => s.bpm));
  const minBpm = Math.max(35, Math.min(baselineHr - 10, ...samples.map(s => s.bpm)));
  const maxBpm = Math.max(peakHeartRate > 0 ? peakHeartRate + 10 : 160, ...samples.map(s => s.bpm + 5));

  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // 포인트 좌표 계산
  const points = samples.map((sample, index) => {
    const x = padding.left + (index / (samples.length - 1 || 1)) * chartWidth;
    const y = padding.top + chartHeight - ((sample.bpm - minBpm) / (maxBpm - minBpm || 1)) * chartHeight;
    return { x, y, sample };
  });

  // SVG 패스 생성
  const pathD = points.reduce((acc, pt, idx) => {
    return idx === 0 ? `M ${pt.x},${pt.y}` : `${acc} L ${pt.x},${pt.y}`;
  }, '');

  // 영역 채우기용 패스
  const areaD = `${pathD} L ${points[points.length - 1]?.x || 0},${padding.top + chartHeight} L ${points[0]?.x || 0},${padding.top + chartHeight} Z`;

  // 피크 심박수 포인트 찾기
  const peakPoint = points.find(p => p.sample.bpm === peakHeartRate) || points[points.length - 1];

  return (
    <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-5 shadow-lg">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div>
          <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Heart className="w-4 h-4 text-rose-500" />
            일일 심박수 추이 & 운동 피크 분석
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            운동 중 최고 심박수 <span className="text-rose-400 font-bold">{peakHeartRate > 0 ? `${peakHeartRate} BPM` : 'N/A'}</span> / 안정 심박수 <span className="text-cyan-400 font-bold">{restingHeartRate && restingHeartRate > 0 ? `${restingHeartRate} BPM` : 'N/A'}</span>
          </p>
        </div>

        {/* 범례 */}
        <div className="flex items-center gap-3 text-[11px] text-slate-400">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            피크 심박수
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
            안정 심박수
          </span>
        </div>
      </div>

      {/* SVG 차트 컨테이너 */}
      <div className="w-full overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto min-w-[500px]">
          <defs>
            {/* 영역 채우기 그라디언트 */}
            <linearGradient id="hrGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.35" />
              <stop offset="60%" stopColor="#06b6d4" stopOpacity="0.1" />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0" />
            </linearGradient>

            {/* 라인 그라디언트 */}
            <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#06b6d4" />
              <stop offset="60%" stopColor="#f97316" />
              <stop offset="100%" stopColor="#f43f5e" />
            </linearGradient>
          </defs>

          {/* 수평 가이드 라인 (BPM) */}
          {[minBpm, Math.round((minBpm + maxBpm) / 2), maxBpm].map((val, idx) => {
            const y = padding.top + chartHeight - ((val - minBpm) / (maxBpm - minBpm || 1)) * chartHeight;
            return (
              <g key={idx}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  stroke="#334155"
                  strokeDasharray="4 4"
                  strokeWidth="1"
                />
                <text
                  x={padding.left - 8}
                  y={y + 4}
                  fill="#94a3b8"
                  fontSize="11"
                  textAnchor="end"
                  fontFamily="sans-serif"
                >
                  {val}
                </text>
              </g>
            );
          })}

          {/* 그라디언트 영역 */}
          <path d={areaD} fill="url(#hrGradient)" />

          {/* 메인 심박수 곡선 */}
          <path
            d={pathD}
            fill="none"
            stroke="url(#lineGradient)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* 데이터 포인트 점들 */}
          {points.map((pt, idx) => (
            <circle
              key={idx}
              cx={pt.x}
              cy={pt.y}
              r={pt.sample.bpm === peakHeartRate ? "5" : "3"}
              fill={pt.sample.bpm === peakHeartRate ? "#f43f5e" : "#06b6d4"}
              stroke="#0f172a"
              strokeWidth="2"
            />
          ))}

          {/* X축 시간 라벨 */}
          {points.filter((_, i) => i % Math.ceil(points.length / 7) === 0 || i === points.length - 1).map((pt, idx) => (
            <text
              key={idx}
              x={pt.x}
              y={height - 10}
              fill="#64748b"
              fontSize="11"
              textAnchor="middle"
              fontFamily="sans-serif"
            >
              {pt.sample.time}
            </text>
          ))}

          {/* 피크 심박수 콜아웃 핀 */}
          {peakPoint && (
            <g transform={`translate(${peakPoint.x}, ${peakPoint.y - 12})`}>
              <rect
                x="-36"
                y="-22"
                width="72"
                height="20"
                rx="6"
                fill="#f43f5e"
                className="shadow-lg"
              />
              <text
                x="0"
                y="-8"
                fill="#ffffff"
                fontSize="11"
                fontWeight="bold"
                textAnchor="middle"
                fontFamily="sans-serif"
              >
                🔥 {peakHeartRate} BPM
              </text>
            </g>
          )}
        </svg>
      </div>
    </div>
  );
};
