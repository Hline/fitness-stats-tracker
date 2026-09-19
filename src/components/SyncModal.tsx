import React, { useState } from 'react';
import { parseAppleHealthXml, parseAppleShortcutsJson } from '../services/appleHealthParser';
import { parseAppleHealthZip } from '../services/zipService';
import { parseGoogleTakeoutJson } from '../services/googleFitService';
import { isNativePlatform, syncFromNativeHealth } from '../services/healthKitNativeService';
import { DailyStats } from '../types/health';
import { 
  X, 
  Smartphone, 
  UploadCloud, 
  FileText, 
  HelpCircle, 
  CheckCircle2, 
  Sparkles,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  Clipboard,
  Zap,
  ChevronDown,
  ChevronUp,
  Copy,
  Check
} from 'lucide-react';

interface SyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataImported: (importedData: { [dateStr: string]: DailyStats }) => void;
  onLoadDemo: () => void;
}

export const SyncModal: React.FC<SyncModalProps> = ({
  isOpen,
  onClose,
  onDataImported,
  onLoadDemo
}) => {
  const [activeTab, setActiveTab] = useState<'apple' | 'google' | 'demo'>('apple');
  const [shortcutsJson, setShortcutsJson] = useState('');
  const [takeoutJson, setTakeoutJson] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [showShortcutGuide, setShowShortcutGuide] = useState(false);
  const [isTemplateCopied, setIsTemplateCopied] = useState(false);

  if (!isOpen) return null;

  // Apple Health XML / ZIP 파일 업로드 처리
  const handleAppleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    const fileNameLower = file.name.toLowerCase();

    // 1) ZIP 압축 파일 처리
    if (fileNameLower.endsWith('.zip')) {
      setStatusMessage('ZIP 압축 파일을 준비하는 중입니다...');
      try {
        const result = await parseAppleHealthZip(file, (percent, text) => {
          setStatusMessage(`${text} (${percent}%)`);
        });

        const count = Object.keys(result.stats).length;
        if (count === 0) {
          alert('ZIP 내부 export.xml에서 유효한 건강 데이터를 찾을 수 없습니다.');
        } else {
          onDataImported(result.stats);
          setStatusMessage(result.message);
          setTimeout(() => {
            onClose();
          }, 1500);
        }
      } catch (err: any) {
        console.error('ZIP 파싱 오류:', err);
        alert(err.message || 'ZIP 파일 압축 해제 및 분석 중 오류가 발생했습니다.');
      } finally {
        setIsProcessing(false);
      }
      return;
    }

    // 2) 일반 XML 파일 처리
    setStatusMessage('Apple Health XML 파일을 분석하는 중입니다...');
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = parseAppleHealthXml(text);
        const count = Object.keys(parsed).length;
        if (count === 0) {
          alert('유효한 건강 데이터를 찾을 수 없습니다. export.xml 형식을 확인해주세요.');
        } else {
          onDataImported(parsed);
          setStatusMessage(`성공! 총 ${count}일 분량의 Apple Health 데이터가 동기화되었습니다.`);
          setTimeout(() => {
            onClose();
          }, 1200);
        }
      } catch (err) {
        console.error('XML 파싱 오류:', err);
        alert('XML 파일 파싱 중 오류가 발생했습니다.');
      } finally {
        setIsProcessing(false);
      }
    };
    reader.readAsText(file);
  };

  // 아이폰 단축어 JSON 붙여넣기
  const handleShortcutsImport = () => {
    if (!shortcutsJson.trim()) return;
    try {
      const parsed = parseAppleShortcutsJson(shortcutsJson);
      const count = Object.keys(parsed).length;
      onDataImported(parsed);
      setStatusMessage(`아이폰 단축어로 ${count}일치 데이터가 성공적으로 반영되었습니다!`);
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err) {
      alert('올바른 JSON 형식이 아닙니다. 형식을 확인해주세요.');
    }
  };

  // 클립보드에서 직접 읽어와서 1초 만에 임포트
  const handleClipboardImport = async () => {
    try {
      if (!navigator.clipboard?.readText) {
        alert('브라우저 권한 정책으로 인해 클립보드 자동 읽기가 제한되었습니다. 아래 텍스트 상자에 붙여넣어주세요.');
        return;
      }
      const text = await navigator.clipboard.readText();
      if (!text || !text.trim()) {
        alert('클립보드가 비어 있습니다. 아이폰 단축어를 먼저 실행해 데이터를 복사해주세요.');
        return;
      }
      setShortcutsJson(text);
      const parsed = parseAppleShortcutsJson(text);
      const count = Object.keys(parsed).length;
      if (count === 0) {
        alert('클립보드에서 유효한 건강 데이터 형식을 찾을 수 없습니다.');
        return;
      }
      onDataImported(parsed);
      setStatusMessage(`성공! 클립보드에서 ${count}일치 건강 데이터가 자동 반영되었습니다!`);
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err) {
      alert('클립보드 읽기 권한이 허용되지 않았습니다. 텍스트 상자에 길게 눌러 직접 붙여넣어주세요.');
    }
  };

  // 🍎 네이티브 HealthKit 시스템 권한 및 원클릭 동기화 처리
  const handleNativeHealthSync = async () => {
    setIsProcessing(true);
    setStatusMessage('애플 건강(HealthKit) 시스템 권한을 확인하고 데이터를 조회하는 중입니다...');
    try {
      const result = await syncFromNativeHealth(14);
      if (result.success && result.stats) {
        onDataImported(result.stats);
        setStatusMessage(result.message);
        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        alert(result.message);
      }
    } catch (err: any) {
      alert(`동기화 실패: ${err.message || err}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Google Takeout JSON 붙여넣기 / 파일
  const handleTakeoutImport = () => {
    if (!takeoutJson.trim()) return;
    try {
      const parsed = parseGoogleTakeoutJson(takeoutJson);
      const count = Object.keys(parsed).length;
      onDataImported(parsed);
      setStatusMessage(`Google Takeout ${count}일치 데이터가 성공적으로 반영되었습니다!`);
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err) {
      alert('올바른 JSON 형식이 아닙니다. 형식을 확인해주세요.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* 모달 상단 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">
                건강 데이터 연동 센터
              </h3>
              <p className="text-xs text-slate-400">아이폰 건강(Apple Health) & 구글 핏(Google Fit) 연동</p>
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
        <div className="flex border-b border-slate-800 bg-slate-950/40 px-6 pt-3 gap-2">
          <button
            onClick={() => setActiveTab('apple')}
            className={`pb-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'apple'
                ? 'border-emerald-400 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>🍎 아이폰 건강 (Apple Health)</span>
          </button>

          <button
            onClick={() => setActiveTab('google')}
            className={`pb-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'google'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>🌐 구글 핏 (Google Fit)</span>
          </button>

          <button
            onClick={() => setActiveTab('demo')}
            className={`pb-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'demo'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>즉시 체험 데모</span>
          </button>
        </div>

        {/* 탭 본문 */}
        <div className="p-6 space-y-5">
          {statusMessage && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{statusMessage}</span>
            </div>
          )}

          {/* 1. Apple Health 탭 */}
          {activeTab === 'apple' && (
            <div className="space-y-4">
              {/* 네이티브 앱 환경일 때 최상단 원클릭 배너 */}
              {isNativePlatform() ? (
                <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-500/20 via-teal-500/10 to-slate-900 border-2 border-emerald-500/50 shadow-xl space-y-3.5">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-400 text-slate-950 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      iOS 네이티브 앱 모드 감지됨
                    </span>
                    <span className="text-[11px] text-emerald-400 font-semibold">
                      파일/단축어 불필요
                    </span>
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-slate-100 flex items-center gap-2">
                      <Smartphone className="w-5 h-5 text-emerald-400" />
                      애플 건강(HealthKit) 원클릭 자동 연동
                    </h4>
                    <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                      아래 버튼을 누르면 iOS 공식 시스템 권한 팝업이 뜨며, 승인 즉시 최근 14일간의 걸음 수, 칼로리, 심박수, 운동 기록을 파일 없이 1초 만에 바로 가져옵니다.
                    </p>
                  </div>
                  <button
                    onClick={handleNativeHealthSync}
                    disabled={isProcessing}
                    className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 text-slate-950 font-extrabold text-sm shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2.5 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 cursor-pointer"
                  >
                    <Zap className="w-4 h-4 fill-slate-950" />
                    <span>{isProcessing ? '애플 건강 데이터 조회 중...' : '🍎 애플 건강에서 데이터 1초 만에 가져오기'}</span>
                  </button>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <Smartphone className="w-4 h-4" />
                    아이폰 네이티브 앱(FitStats) 지원 모드
                  </div>
                  <p className="text-slate-300 leading-relaxed text-[11px]">
                    아이폰에 <strong>FitStats 네이티브 앱</strong>을 설치하여 실행하시면, 파일이나 단축어 설정 없이 <strong>[🍎 원클릭 공식 시스템 권한 팝업]</strong>으로 1초 만에 자동 연동됩니다. 현재 웹 브라우저 환경에서는 아래 단축어 또는 파일 업로드를 이용하실 수 있습니다.
                  </p>
                </div>
              )}

              <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60 text-xs text-slate-300 space-y-1.5">
                <div className="font-bold text-slate-100 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  100% 로컬 개인정보 보호 파싱
                </div>
                <p className="text-slate-400 leading-relaxed">
                  애플 건강 데이터는 서버로 전송되지 않으며, 사용자 브라우저 내부에서만 안전하게 연산되어 즉시 통계로 시각화됩니다.
                </p>
              </div>

              {/* 방법 1 (추천): 아이폰 단축어 1초 자동 연동 */}
              <div className="p-4 rounded-2xl bg-gradient-to-b from-emerald-950/30 to-slate-900 border border-emerald-500/30 space-y-3.5">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500 text-slate-950">
                        추천 1위
                      </span>
                      <h4 className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 text-emerald-400" />
                        아이폰 단축어로 파일 없이 1초 연동
                      </h4>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      아이폰 단축어로 건강 데이터를 복사한 후 버튼 한 번만 누르면 파일 선택 없이 즉시 동기화됩니다.
                    </p>
                  </div>
                </div>

                {/* 1초 원클릭 가져오기 버튼 */}
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    onClick={handleClipboardImport}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <Clipboard className="w-4 h-4" />
                    <span>📋 클립보드에서 1초 만에 가져오기</span>
                  </button>

                  <button
                    onClick={() => setShowShortcutGuide(!showShortcutGuide)}
                    className="py-2.5 px-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-slate-100 font-semibold text-xs border border-slate-700 flex items-center justify-center gap-1.5 transition-all"
                  >
                    <span>{showShortcutGuide ? '가이드 닫기' : '📖 3분 세팅 레시피'}</span>
                    {showShortcutGuide ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {/* 세팅 레시피 아코디언 */}
                {showShortcutGuide && (
                  <div className="pt-2 border-t border-slate-800 text-xs text-slate-300 space-y-3 animate-in fade-in duration-200">
                    <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                      <div className="font-bold text-emerald-300 flex items-center gap-1.5">
                        <span>📱 아이폰 단축어 3단계 레시피 (단 2분 소요)</span>
                      </div>
                      <ol className="list-decimal list-inside space-y-1.5 text-[11px] text-slate-300 leading-relaxed">
                        <li>
                          아이폰의 <strong>[단축어]</strong> 앱을 실행하고 오른쪽 상단 <code className="text-emerald-300 font-mono">+</code> 버튼을 누릅니다.
                        </li>
                        <li>
                          아래 3개 동작을 순서대로 추가합니다:
                          <div className="mt-1.5 ml-4 p-2 rounded-lg bg-slate-900 border border-slate-800 space-y-1 font-mono text-[10px] text-slate-300">
                            <div>1️⃣ <strong>[건강 샘플 찾기]</strong> ➔ 걸음 수 (시작일: 오늘) ➔ <strong>[합계]</strong> 계산</div>
                            <div>2️⃣ <strong>[텍스트]</strong> ➔ 아래 JSON 템플릿을 붙여넣고 [합계] 변수 삽입</div>
                            <div>3️⃣ <strong>[클립보드에 복사]</strong> 및 <strong>[URL 열기]</strong> (현재 웹사이트 주소)</div>
                          </div>
                        </li>
                        <li>
                          <strong>완료!</strong> 이제 홈 화면 단축어 버튼을 한 번만 누르면 웹이 열리고, <span className="text-emerald-400 font-semibold">[클립보드에서 1초 만에 가져오기]</span>만 누르면 끝납니다!
                        </li>
                      </ol>

                      {/* 자동화 꿀팁 */}
                      <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[10px] text-emerald-300">
                        💡 <strong>자동화 꿀팁:</strong> 단축어 앱 하단 [개인용 자동화] 탭에서 &apos;매일 밤 11시&apos;에 이 단축어가 자동 실행되도록 설정해 두면 손 하나 까딱 않고 매일 건강 데이터가 동기화됩니다.
                      </div>

                      {/* 템플릿 복사 */}
                      <div className="space-y-1 pt-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-semibold text-slate-400">단축어 [텍스트] 액션에 넣을 JSON 형식:</span>
                          <button
                            onClick={() => {
                              const template = `[\n  {\n    "date": "2026-09-19",\n    "steps": 9850,\n    "workouts": [\n      {\n        "type": "running",\n        "name": "야외 러닝",\n        "durationMinutes": 30,\n        "caloriesBurned": 280,\n        "maxHeartRate": 165\n      }\n    ]\n  }\n]`;
                              navigator.clipboard?.writeText(template);
                              setIsTemplateCopied(true);
                              setTimeout(() => setIsTemplateCopied(false), 2000);
                            }}
                            className="text-[10px] font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 bg-slate-800 px-2 py-0.5 rounded border border-slate-700"
                          >
                            {isTemplateCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            <span>{isTemplateCopied ? '복사 완료!' : '템플릿 복사'}</span>
                          </button>
                        </div>
                        <pre className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-[10px] text-slate-400 font-mono overflow-x-auto">
{`[
  {
    "date": "2026-09-19",
    "steps": 9850
  }
]`}
                        </pre>
                      </div>
                    </div>

                    {/* 수동 붙여넣기 보조 영역 */}
                    <div className="space-y-1.5 pt-1">
                      <label className="text-[11px] font-semibold text-slate-400 block">
                        또는 직접 복사한 단축어 JSON 텍스트를 여기에 붙여넣기:
                      </label>
                      <textarea
                        value={shortcutsJson}
                        onChange={(e) => setShortcutsJson(e.target.value)}
                        placeholder='[ { "date": "2026-09-19", "steps": 9850 } ]'
                        rows={2}
                        className="w-full bg-slate-950/60 border border-slate-700 rounded-xl p-2.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-emerald-500"
                      />
                      <div className="flex justify-end">
                        <button
                          onClick={handleShortcutsImport}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400 text-xs font-bold border border-emerald-500/30 transition-all"
                        >
                          입력된 텍스트 적용
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 방법 2: 대용량 내보내기 파일 (export.zip / export.xml) 업로드 */}
              <div className="pt-2 border-t border-slate-800">
                <label className="text-xs font-bold text-slate-300 block mb-2 flex items-center justify-between">
                  <span>방법 2: 건강 데이터 내보내기 파일 (export.zip / export.xml) 업로드</span>
                  <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                    ZIP 자동 해제 지원
                  </span>
                </label>
                <label className="border-2 border-dashed border-slate-700 hover:border-emerald-500/60 rounded-2xl p-5 flex flex-col items-center justify-center cursor-pointer bg-slate-950/40 hover:bg-slate-800/30 transition-all group">
                  <UploadCloud className="w-7 h-7 text-slate-400 group-hover:text-emerald-400 group-hover:scale-110 transition-all mb-1.5" />
                  <span className="text-xs font-semibold text-slate-300">
                    export.zip 또는 export.xml 파일 선택 (드래그 앤 드롭)
                  </span>
                  <span className="text-[11px] text-slate-500 mt-0.5">
                    (아이폰 [건강] ➜ 프로필 ➜ &quot;건강 데이터 내보내기&quot;로 생성된 zip 파일 원본 그대로 선택 가능)
                  </span>
                  <input
                    type="file"
                    accept=".zip,.xml,.txt"
                    onChange={handleAppleFileUpload}
                    className="hidden"
                    disabled={isProcessing}
                  />
                </label>
              </div>
            </div>
          )}

          {/* 2. Google Fit 탭 */}
          {activeTab === 'google' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60 text-xs text-slate-300 space-y-1.5">
                <div className="font-bold text-slate-100 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-cyan-400" />
                  Google Fitness REST API & Google Takeout
                </div>
                <p className="text-slate-400 leading-relaxed">
                  구글 피트니스(Google Fit / Health Connect)의 걸음 수, 칼로리, 심박수, 운동 세그먼트 데이터를 JSON/Takeout으로 가져올 수 있습니다.
                </p>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5">
                  Google Takeout 피트니스 데이터 (JSON) 붙여넣기
                </label>
                <textarea
                  value={takeoutJson}
                  onChange={(e) => setTakeoutJson(e.target.value)}
                  placeholder='{ "days": [ { "date": "2026-09-13", "steps": 9400, "workouts": [...] } ] }'
                  rows={4}
                  className="w-full bg-slate-950/60 border border-slate-700 rounded-xl p-3 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
                />
                <div className="flex justify-end mt-2">
                  <button
                    onClick={handleTakeoutImport}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400 text-xs font-bold border border-cyan-500/30 transition-all"
                  >
                    Google Fit 데이터 적용
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 3. 즉시 체험 데모 탭 */}
          {activeTab === 'demo' && (
            <div className="space-y-4 text-center py-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center mx-auto">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-100">
                  현실적인 건강 샘플 데이터 즉시 로드
                </h4>
                <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                  실제 연동 파일 없이도 최근 35일간의 걸음 수, 인터벌 러닝 최고 심박수(174 BPM), 웨이트 트레이닝, 칼로리 소모 통계 및 SNS 카드 생성 기능을 완벽히 체험할 수 있습니다.
                </p>
              </div>

              <button
                onClick={() => {
                  onLoadDemo();
                  setStatusMessage('최신 피트니스 데모 데이터가 로드되었습니다.');
                  setTimeout(() => onClose(), 800);
                }}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition-all hover:scale-105 active:scale-95"
              >
                데모 데이터셋 즉시 적용하기
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
