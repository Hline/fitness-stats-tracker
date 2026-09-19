import { createClient, SupabaseClient } from '@supabase/supabase-js';

const STORAGE_KEY_SUPABASE_CONFIG = 'fitstats_supabase_config_v1';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

// 1. 저장된 설정 가져오기 (사용자 커스텀 설정 우선 -> .env 기본값 폴백)
export function getSupabaseConfig(): SupabaseConfig {
  // 1) localStorage 저장값 확인 (UI에서 직접 입력/변경한 설정 우선)
  if (typeof localStorage !== 'undefined') {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SUPABASE_CONFIG);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.url !== undefined && parsed.anonKey !== undefined) {
          return { url: (parsed.url || '').trim(), anonKey: (parsed.anonKey || '').trim() };
        }
      }
    } catch {
      // 무시
    }
  }

  // 2) Vite 환경 변수 (.env) 기본값 확인
  const envUrl = (import.meta as any).env?.VITE_SUPABASE_URL || '';
  const envAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

  if (envUrl && envAnonKey) {
    return { url: envUrl.trim(), anonKey: envAnonKey.trim() };
  }

  return { url: '', anonKey: '' };
}

// 2. 브라우저에서 직접 Supabase 설정 저장 (UI에서 간편 설정 지원)
export function saveSupabaseConfig(config: SupabaseConfig): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(STORAGE_KEY_SUPABASE_CONFIG, JSON.stringify(config));
    // 클라이언트 인스턴스 재생성을 위해 캐시 무효화
    cachedClient = null;
  }
}

// 3. Supabase 연동 활성화 여부 확인
export function isSupabaseConfigured(): boolean {
  const { url, anonKey } = getSupabaseConfig();
  return Boolean(url && anonKey && url.startsWith('http'));
}

// 4. Supabase 클라이언트 싱글톤 인스턴스
let cachedClient: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (cachedClient) return cachedClient;

  const { url, anonKey } = getSupabaseConfig();
  if (!url || !anonKey) {
    return null;
  }

  try {
    cachedClient = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'fitstats_supabase_auth_v1'
      }
    });
    return cachedClient;
  } catch (err) {
    console.error('Supabase 클라이언트 생성 실패:', err);
    return null;
  }
}
