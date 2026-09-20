import React from 'react';
import { WorkoutSession, WorkoutType } from '../types/health';
import { 
  Flame, 
  Heart, 
  Clock, 
  MapPin, 
  Trash2, 
  Dumbbell, 
  Zap,
  Activity,
  Plus
} from 'lucide-react';

interface WorkoutTimelineProps {
  workouts: WorkoutSession[];
  onDeleteWorkout: (workoutId: string) => void;
  onOpenWorkoutModal: () => void;
}

export const WorkoutTimeline: React.FC<WorkoutTimelineProps> = ({
  workouts,
  onDeleteWorkout,
  onOpenWorkoutModal
}) => {
  const getWorkoutIcon = (type: WorkoutType) => {
    switch (type) {
      case 'running':
      case 'walking':
      case 'hiking':
        return <Activity className="w-5 h-5 text-emerald-400" />;
      case 'strength':
        return <Dumbbell className="w-5 h-5 text-purple-400" />;
      case 'hiit':
        return <Zap className="w-5 h-5 text-amber-400" />;
      case 'cycling':
        return <Activity className="w-5 h-5 text-cyan-400" />;
      default:
        return <Activity className="w-5 h-5 text-rose-400" />;
    }
  };

  const formatTimeRange = (start: string, end: string) => {
    try {
      const s = new Date(start);
      const e = new Date(end);
      const sStr = `${String(s.getHours()).padStart(2, '0')}:${String(s.getMinutes()).padStart(2, '0')}`;
      const eStr = `${String(e.getHours()).padStart(2, '0')}:${String(e.getMinutes()).padStart(2, '0')}`;
      return `${sStr} ~ ${eStr}`;
    } catch {
      return '';
    }
  };

  return (
    <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-5 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <span>오늘의 운동 세션 타임라인</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-emerald-400 border border-emerald-500/20 font-semibold">
              총 {workouts.length}회 세션
            </span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">기록된 각 운동별 소모 칼로리와 최고 심박수 상세</p>
        </div>

        <button
          onClick={onOpenWorkoutModal}
          className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1 transition-all"
        >
          <Plus className="w-3.5 h-3.5 text-emerald-400" />
          운동 추가
        </button>
      </div>

      {workouts.length === 0 ? (
        <div className="py-10 text-center rounded-xl bg-slate-950/40 border border-dashed border-slate-800">
          <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-3 text-slate-500">
            <Dumbbell className="w-6 h-6" />
          </div>
          <p className="text-sm font-medium text-slate-300">오늘 완료된 운동 기록이 없습니다.</p>
          <p className="text-xs text-slate-500 mt-1 mb-4">건강 앱에서 데이터를 동기화하거나 직접 기록해보세요.</p>
          <button
            onClick={onOpenWorkoutModal}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl transition-all inline-flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            첫 운동 세션 추가하기
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {workouts.map((workout) => (
            <div
              key={workout.id}
              className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 hover:border-slate-600 transition-all flex flex-col justify-between group"
            >
              <div>
                {/* 헤더 */}
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-lg bg-slate-900 flex items-center justify-center border border-slate-700">
                      {getWorkoutIcon(workout.type)}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-100 group-hover:text-emerald-400 transition-colors">
                        {workout.name}
                      </h4>
                      <span className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-500" />
                        {formatTimeRange(workout.startTime, workout.endTime)} ({workout.durationMinutes}분)
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => onDeleteWorkout(workout.id)}
                    aria-label="운동 세션 삭제"
                    className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-700/60 rounded-lg transition-colors opacity-60 group-hover:opacity-100"
                    title="기록 삭제"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* 지표 그리드 */}
                <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-700/50">
                  {/* 칼로리 */}
                  <div className="bg-slate-900/60 rounded-lg p-2 text-center">
                    <span className="text-[10px] text-slate-400 flex items-center justify-center gap-1">
                      <Flame className="w-3 h-3 text-orange-400" />
                      칼로리
                    </span>
                    <span className="text-xs font-bold text-orange-400 mt-0.5 block">
                      {workout.caloriesBurned ? `${workout.caloriesBurned} kcal` : '0 kcal'}
                    </span>
                  </div>

                  {/* 최고 심박수 */}
                  <div className="bg-slate-900/60 rounded-lg p-2 text-center">
                    <span className="text-[10px] text-slate-400 flex items-center justify-center gap-1">
                      <Heart className="w-3 h-3 text-rose-500" />
                      최고 심박수
                    </span>
                    <span className="text-xs font-bold text-rose-400 mt-0.5 block">
                      {workout.maxHeartRate && workout.maxHeartRate > 0 ? `${workout.maxHeartRate} BPM` : '0 BPM (미측정)'}
                    </span>
                  </div>

                  {/* 세 번째 지표: 거리 or 평균 심박수 */}
                  <div className="bg-slate-900/60 rounded-lg p-2 text-center">
                    {workout.distanceKm ? (
                      <>
                        <span className="text-[10px] text-slate-400 flex items-center justify-center gap-1">
                          <MapPin className="w-3 h-3 text-cyan-400" />
                          이동 거리
                        </span>
                        <span className="text-xs font-bold text-cyan-400 mt-0.5 block">
                          {workout.distanceKm} km
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="text-[10px] text-slate-400 flex items-center justify-center gap-1">
                          <Heart className="w-3 h-3 text-slate-400" />
                          평균 심박
                        </span>
                        <span className="text-xs font-bold text-slate-300 mt-0.5 block">
                          {workout.avgHeartRate && workout.avgHeartRate > 0 ? `${workout.avgHeartRate} BPM` : '0 BPM (미측정)'}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {workout.notes && (
                <p className="text-[11px] text-slate-400 mt-2.5 bg-slate-900/40 px-2.5 py-1 rounded border border-slate-800">
                  💬 {workout.notes}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
