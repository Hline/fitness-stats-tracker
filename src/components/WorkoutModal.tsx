import React, { useState } from 'react';
import { WorkoutSession, WorkoutType } from '../types/health';
import { X, Dumbbell, Flame, Heart, Clock, MapPin, Plus } from 'lucide-react';

interface WorkoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentDateStr: string;
  onAddWorkout: (workout: WorkoutSession) => void;
}

export const WorkoutModal: React.FC<WorkoutModalProps> = ({
  isOpen,
  onClose,
  currentDateStr,
  onAddWorkout
}) => {
  const [type, setType] = useState<WorkoutType>('running');
  const [name, setName] = useState('야외 러닝');
  const [startTime, setStartTime] = useState('08:00');
  const [durationMinutes, setDurationMinutes] = useState(45);
  const [caloriesBurned, setCaloriesBurned] = useState(420);
  const [maxHeartRate, setMaxHeartRate] = useState<number | ''>(''); // 운동 중 최고 심박수 (워치 없을 시 빈값 허용)
  const [avgHeartRate, setAvgHeartRate] = useState<number | ''>('');
  const [distanceKm, setDistanceKm] = useState<string>('5.2');
  const [notes, setNotes] = useState('상쾌한 아침 유산소 세션 🔥');

  if (!isOpen) return null;

  // 종목 변경 시 기본 프리셋 자동 입력 (심박수는 워치 없는 사용자를 위해 강제하지 않음)
  const handleTypeChange = (selectedType: WorkoutType) => {
    setType(selectedType);
    switch (selectedType) {
      case 'running':
        setName('야외 러닝');
        setDurationMinutes(45);
        setCaloriesBurned(420);
        setDistanceKm('5.5');
        break;
      case 'strength':
        setName('웨이트 트레이닝');
        setDurationMinutes(60);
        setCaloriesBurned(350);
        setDistanceKm('');
        break;
      case 'cycling':
        setName('로드 사이클링');
        setDurationMinutes(60);
        setCaloriesBurned(450);
        setDistanceKm('20.0');
        break;
      case 'hiit':
        setName('타바타 고강도 인터벌');
        setDurationMinutes(30);
        setCaloriesBurned(320);
        setDistanceKm('');
        break;
      case 'swimming':
        setName('실내 자유형 수영');
        setDurationMinutes(40);
        setCaloriesBurned(380);
        setDistanceKm('1.2');
        break;
      case 'yoga':
        setName('빈야사 요가');
        setDurationMinutes(50);
        setCaloriesBurned(170);
        setDistanceKm('');
        break;
      default:
        setName('운동 세션');
        break;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const [h, m] = startTime.split(':').map(Number);
    const startIso = `${currentDateStr}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
    
    // 종료 시간 계산
    const endHour = h + Math.floor((m + durationMinutes) / 60);
    const endMin = (m + durationMinutes) % 60;
    const endIso = `${currentDateStr}T${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}:00`;

    const newSession: WorkoutSession = {
      id: `manual-${Date.now()}`,
      type,
      name: name || '운동 세션',
      startTime: startIso,
      endTime: endIso,
      durationMinutes: Number(durationMinutes),
      caloriesBurned: Number(caloriesBurned),
      maxHeartRate: maxHeartRate ? Number(maxHeartRate) : 0,
      avgHeartRate: avgHeartRate ? Number(avgHeartRate) : undefined,
      distanceKm: distanceKm ? parseFloat(distanceKm) : undefined,
      notes: notes || undefined
    };

    onAddWorkout(newSession);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* 모달 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Dumbbell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">
                운동 세션 기록하기
              </h3>
              <p className="text-xs text-slate-400">{currentDateStr} 운동 추가</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-slate-100 hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 폼 본문 */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {/* 1. 종목 선택 */}
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-2">
              운동 종목
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'running', label: '🏃‍♂️ 러닝' },
                { id: 'strength', label: '🏋️ 웨이트' },
                { id: 'cycling', label: '🚴 사이클' },
                { id: 'hiit', label: '⚡ HIIT' },
                { id: 'swimming', label: '🏊 수영' },
                { id: 'yoga', label: '🧘 요가' }
              ].map((item) => (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => handleTypeChange(item.id as WorkoutType)}
                  className={`p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                    type === item.id
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                      : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:border-slate-600'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* 2. 세션 이름 */}
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1">
              세션 이름
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
              required
            />
          </div>

          {/* 3. 시간 및 소요시간 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                시작 시간
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                required
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                운동 시간 (분)
              </label>
              <input
                type="number"
                min="1"
                max="600"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                required
              />
            </div>
          </div>

          {/* 4. 칼로리 & 운동 중 최고 심박수 (⭐ 필수 요구) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1 flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 text-orange-400" />
                소모 칼로리 (kcal)
              </label>
              <input
                type="number"
                min="0"
                value={caloriesBurned}
                onChange={(e) => setCaloriesBurned(Number(e.target.value))}
                className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-xs text-orange-400 font-bold focus:outline-none focus:border-orange-500"
                required
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Heart className="w-3.5 h-3.5 text-rose-500" />
                  최고 심박수 (BPM)
                </span>
                <span className="text-[10px] text-slate-500 font-normal">선택 (워치 착용 시)</span>
              </label>
              <input
                type="number"
                min="40"
                max="240"
                value={maxHeartRate}
                onChange={(e) => setMaxHeartRate(e.target.value ? Number(e.target.value) : '')}
                placeholder="미측정 (워치 없을 시 빈칸)"
                className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-xs text-rose-400 font-bold focus:outline-none focus:border-rose-500 placeholder:text-slate-500 placeholder:font-normal"
              />
            </div>
          </div>

          {/* 5. 평균 심박수 & 거리 (선택) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1">
                평균 심박수 (선택)
              </label>
              <input
                type="number"
                min="40"
                max="220"
                value={avgHeartRate}
                onChange={(e) => setAvgHeartRate(e.target.value ? Number(e.target.value) : '')}
                placeholder="예: 145 (선택)"
                className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 placeholder:text-slate-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-cyan-400" />
                거리 km (선택)
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={distanceKm}
                onChange={(e) => setDistanceKm(e.target.value)}
                placeholder="예: 5.2"
                className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          {/* 6. 메모 */}
          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1">
              운동 메모
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="예: 인터벌 페이스 4:30 달성"
              className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* 제출 버튼 */}
          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/20 transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              운동 세션 추가 완료
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
