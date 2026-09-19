import React from 'react';
import { DashboardWidgetConfig, WidgetId } from '../types/health';
import { 
  X, 
  Sliders, 
  ArrowUp, 
  ArrowDown, 
  Eye, 
  EyeOff, 
  RotateCcw, 
  Check, 
  GripVertical,
  Layers
} from 'lucide-react';

interface WidgetSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  widgetConfigs: DashboardWidgetConfig[];
  onUpdateConfigs: (configs: DashboardWidgetConfig[]) => void;
  onResetConfigs: () => void;
}

export const WidgetSettingsModal: React.FC<WidgetSettingsModalProps> = ({
  isOpen,
  onClose,
  widgetConfigs,
  onUpdateConfigs,
  onResetConfigs
}) => {
  if (!isOpen) return null;

  // 순서 변경 (위로 이동)
  const moveUp = (index: number) => {
    if (index === 0) return;
    const newConfigs = [...widgetConfigs];
    const temp = newConfigs[index];
    newConfigs[index] = newConfigs[index - 1];
    newConfigs[index - 1] = temp;
    // order 재할당
    newConfigs.forEach((c, idx) => { c.order = idx; });
    onUpdateConfigs(newConfigs);
  };

  // 순서 변경 (아래로 이동)
  const moveDown = (index: number) => {
    if (index === widgetConfigs.length - 1) return;
    const newConfigs = [...widgetConfigs];
    const temp = newConfigs[index];
    newConfigs[index] = newConfigs[index + 1];
    newConfigs[index + 1] = temp;
    // order 재할당
    newConfigs.forEach((c, idx) => { c.order = idx; });
    onUpdateConfigs(newConfigs);
  };

  // 표시 / 숨기기 토글
  const toggleEnabled = (id: WidgetId) => {
    const newConfigs = widgetConfigs.map(c => 
      c.id === id ? { ...c, enabled: !c.enabled } : c
    );
    onUpdateConfigs(newConfigs);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* 모달 상단 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                대시보드 레이아웃 설정
                <span className="text-[10px] font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  Custom Layout
                </span>
              </h3>
              <p className="text-xs text-slate-400">위젯의 우선순위(순서)를 바꾸거나 불필요한 항목을 숨겨보세요.</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-slate-100 hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 모달 본문 위젯 목록 */}
        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <span>활성화된 위젯: <strong className="text-emerald-400">{widgetConfigs.filter(w => w.enabled).length}개</strong> / 총 {widgetConfigs.length}개</span>
            <button
              onClick={onResetConfigs}
              className="text-xs text-slate-400 hover:text-emerald-400 flex items-center gap-1 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              기본 레이아웃 복원
            </button>
          </div>

          <div className="space-y-2.5">
            {widgetConfigs.map((config, index) => (
              <div
                key={config.id}
                className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                  config.enabled 
                    ? 'bg-slate-800/80 border-slate-700/80' 
                    : 'bg-slate-950/40 border-slate-800/50 opacity-60'
                }`}
              >
                {/* 좌측: 번호 & 위젯 정보 */}
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center text-xs font-bold text-slate-400">
                    {index + 1}
                  </span>

                  <div>
                    <div className="text-xs font-bold text-slate-100 flex items-center gap-2">
                      <span>{config.title}</span>
                      {!config.enabled && (
                        <span className="text-[10px] text-slate-500 bg-slate-800 px-1.5 py-0.2 rounded">숨김</span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">{config.description}</p>
                  </div>
                </div>

                {/* 우측 액션: 순서 변경 및 토글 */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {/* 위로 이동 */}
                  <button
                    onClick={() => moveUp(index)}
                    disabled={index === 0}
                    className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-700 text-slate-300 disabled:opacity-30 disabled:hover:bg-slate-900 transition-colors"
                    title="위로 이동"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>

                  {/* 아래로 이동 */}
                  <button
                    onClick={() => moveDown(index)}
                    disabled={index === widgetConfigs.length - 1}
                    className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-700 text-slate-300 disabled:opacity-30 disabled:hover:bg-slate-900 transition-colors"
                    title="아래로 이동"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>

                  {/* 활성화 토글 */}
                  <button
                    onClick={() => toggleEnabled(config.id)}
                    className={`p-1.5 rounded-lg border transition-all ${
                      config.enabled
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/30'
                        : 'bg-slate-900 text-slate-500 border-slate-800 hover:text-slate-300'
                    }`}
                    title={config.enabled ? '숨기기' : '대시보드에 추가'}
                  >
                    {config.enabled ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 하단 확인 버튼 */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/90 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 transition-all active:scale-95"
          >
            <Check className="w-4 h-4" />
            설정 완료
          </button>
        </div>

      </div>
    </div>
  );
};
