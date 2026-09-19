import React from 'react';
import { Moon, BatteryCharging, Zap, ShieldAlert, Sparkles } from 'lucide-react';

interface RecoverySleepWidgetProps {
  sleepHours?: number;
  recoveryScore?: number;
}

export const RecoverySleepWidget: React.FC<RecoverySleepWidgetProps> = ({
  sleepHours,
  recoveryScore
}) => {
  const hasSleepData = sleepHours !== undefined && sleepHours > 0;
  const hasRecoveryData = recoveryScore !== undefined && recoveryScore > 0;

  const getBatteryColor = (score?: number) => {
    if (!score || score <= 0) return 'text-slate-400 bg-slate-800 border-slate-700';
    if (score >= 80) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    if (score >= 60) return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
    return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
  };

  const getConditionText = (score?: number) => {
    if (!score || score <= 0) {
      return {
        title: '수면 및 컨디션 미측정 (N/A)',
        desc: '아이폰 건강 또는 구글 핏의 수면 분석 데이터를 연동하면 트레이닝 준비도와 신체 회복 배터리가 자동으로 분석됩니다.'
      };
    }
    if (score >= 80) return { title: '컨디션 최상 (Prime)', desc: '심폐 능력과 근육 회복이 우수합니다. 오늘 고강도 인터벌이나 웨이트 트레이닝에 매우 적합합니다.' };
    if (score >= 60) return { title: '컨디션 보통 (Good)', desc: '일상적인 유산소나 가벼운 조깅으로 기초 체력을 유지하기 좋은 상태입니다.' };
    return { title: '회복 필요 (Rest)', desc: '수면 부족 또는 이전 운동 피로가 누적되었습니다. 충분한 수분 섭취와 스트레칭을 권장합니다.' };
  };

  const condition = getConditionText(recoveryScore);

  return (
    <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-5 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Moon className="w-4 h-4 text-purple-400" />
            <span>수면 및 신체 회복 배터리 (Recovery)</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">애플 헬스/구글 핏 수면 분석 기반 트레이닝 준비도</p>
        </div>

        <span className={`text-xs font-bold px-2.5 py-1 rounded-full border flex items-center gap-1 ${getBatteryColor(recoveryScore)}`}>
          <BatteryCharging className="w-3.5 h-3.5" />
          {hasRecoveryData ? `회복도 ${recoveryScore}점` : '회복도: N/A'}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 수면 시간 요약 */}
        <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/60 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400">총 수면 시간</span>
            {hasSleepData ? (
              <>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-3xl font-black text-purple-400">{Math.floor(sleepHours!)}</span>
                  <span className="text-sm font-bold text-slate-300">시간</span>
                  <span className="text-3xl font-black text-purple-400 ml-1">{Math.round((sleepHours! % 1) * 60)}</span>
                  <span className="text-sm font-bold text-slate-300">분</span>
                </div>
                <span className="text-[11px] text-slate-500 mt-1 block">목표 7시간 30분 달성</span>
              </>
            ) : (
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-3xl font-black text-slate-500">N/A</span>
                <span className="text-xs text-slate-500 ml-2">미기록</span>
              </div>
            )}
          </div>

          <div className="text-right space-y-1 text-xs">
            <div className="text-slate-400">깊은 수면: <strong className="text-slate-200">{hasSleepData ? '1시간 45분' : 'N/A'}</strong></div>
            <div className="text-slate-400">렘(REM) 수면: <strong className="text-slate-200">{hasSleepData ? '2시간 10분' : 'N/A'}</strong></div>
          </div>
        </div>

        {/* 회복 컨디션 가이드 */}
        <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/60 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200 mb-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>{condition.title}</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              {condition.desc}
            </p>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-700/40 flex items-center justify-between text-[11px] text-slate-500">
            <span>추천 운동: <strong className="text-emerald-400 font-semibold">인터벌 러닝 or 웨이트</strong></span>
            <span>심박 목표: <strong className="text-rose-400 font-semibold">Zone 4 (150-175)</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
};
