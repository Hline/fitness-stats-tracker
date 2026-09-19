import { UserAccount, RegisterRequest, LoginRequest, AuthSession } from '../types/auth';

const ACCOUNTS_STORAGE_KEY = 'fitstats_accounts_v1';
const CURRENT_SESSION_KEY = 'fitstats_auth_session_v1';

// 브라우저 및 Node.js(테스트) 겸용 안전 스토리지 헬퍼
const memoryStore: Record<string, string> = {};

function safeGet(key: string): string | null {
  if (typeof localStorage !== 'undefined') {
    try {
      return localStorage.getItem(key);
    } catch {
      // fallback to memoryStore
    }
  }
  return memoryStore[key] || null;
}

function safeSet(key: string, value: string): void {
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(key, value);
      return;
    } catch {
      // fallback to memoryStore
    }
  }
  memoryStore[key] = value;
}

// 간편한 해시 함수 (로컬 데모용)
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return `h_${Math.abs(hash).toString(16)}`;
}

// 등록된 전체 계정 목록 로드
export function getAllAccounts(): UserAccount[] {
  try {
    const raw = safeGet(ACCOUNTS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

// 전체 계정 목록 저장
export function saveAccounts(accounts: UserAccount[]): void {
  try {
    safeSet(ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));
  } catch (e) {
    console.warn('계정 목록 저장 실패:', e);
  }
}

// 기본 게스트 계정 생성
export function createGuestAccount(): UserAccount {
  const guestId = `guest_${Date.now()}`;
  return {
    id: guestId,
    username: 'guest',
    email: '',
    passwordHash: '',
    nickname: '게스트 러너',
    avatarColor: 'bg-emerald-400',
    createdAt: new Date().toISOString(),
    isGuest: true
  };
}

// 현재 세션 가져오기 (없으면 즉시 사용 가능한 게스트 계정 자동 생성)
export function getCurrentSession(): AuthSession {
  try {
    const raw = safeGet(CURRENT_SESSION_KEY);
    if (raw) {
      const user: UserAccount = JSON.parse(raw);
      return {
        currentUser: user,
        isAuthenticated: !user.isGuest,
        isGuest: user.isGuest
      };
    }
  } catch (e) {
    console.warn('세션 파싱 실패:', e);
  }

  // 기본 게스트 세션 생성
  const guest = createGuestAccount();
  saveCurrentSession(guest);
  return {
    currentUser: guest,
    isAuthenticated: false,
    isGuest: true
  };
}

// 세션 저장
export function saveCurrentSession(user: UserAccount): void {
  try {
    safeSet(CURRENT_SESSION_KEY, JSON.stringify(user));
  } catch (e) {
    console.warn('세션 저장 실패:', e);
  }
}

/**
 * 정식 회원가입 처리
 * - 아이디, 패스워드, 이메일 필수
 * - 생년월일, 성별 선택 옵션
 * - 기존 게스트 데이터 승격 지원
 */
export function registerAccount(
  req: RegisterRequest,
  currentGuestId?: string
): { success: boolean; message: string; user?: UserAccount } {
  if (!req.username || req.username.trim().length < 3) {
    return { success: false, message: '아이디는 3자 이상이어야 합니다.' };
  }
  if (!req.password || req.password.length < 4) {
    return { success: false, message: '비밀번호는 4자 이상이어야 합니다.' };
  }
  if (!req.email || !req.email.includes('@')) {
    return { success: false, message: '유효한 이메일 주소를 입력해주세요.' };
  }

  const accounts = getAllAccounts();
  const trimmedUsername = req.username.trim().toLowerCase();

  // 아이디 중복 체크
  if (accounts.some(a => a.username.toLowerCase() === trimmedUsername)) {
    return { success: false, message: '이미 존재하는 아이디입니다. 다른 아이디를 입력해주세요.' };
  }

  const avatarColors = ['bg-emerald-400', 'bg-cyan-400', 'bg-orange-400', 'bg-purple-400', 'bg-rose-400', 'bg-teal-400'];
  const newUserId = `user_${Date.now()}`;
  
  const newUser: UserAccount = {
    id: newUserId,
    username: trimmedUsername,
    email: req.email.trim(),
    passwordHash: simpleHash(req.password),
    nickname: req.nickname?.trim() || req.username,
    birthday: req.birthday || undefined,
    gender: req.gender || 'unspecified',
    avatarColor: avatarColors[accounts.length % avatarColors.length],
    createdAt: new Date().toISOString(),
    isGuest: false
  };

  accounts.push(newUser);
  saveAccounts(accounts);
  saveCurrentSession(newUser);

  // 만약 기존에 게스트로 운동한 데이터가 있다면 신규 계정 키로 마이그레이션
  if (currentGuestId && currentGuestId.startsWith('guest_')) {
    const guestDataKey = `fitstats_data_${currentGuestId}`;
    const guestData = safeGet(guestDataKey);
    if (guestData) {
      safeSet(`fitstats_data_${newUserId}`, guestData);
    }
  }

  return { success: true, message: '회원가입이 완료되었습니다!', user: newUser };
}

/**
 * 로그인 처리
 */
export function loginAccount(req: LoginRequest): { success: boolean; message: string; user?: UserAccount } {
  const accounts = getAllAccounts();
  const trimmedUsername = req.username.trim().toLowerCase();
  const target = accounts.find(a => a.username.toLowerCase() === trimmedUsername);

  if (!target) {
    return { success: false, message: '등록되지 않은 아이디입니다.' };
  }

  if (target.passwordHash !== simpleHash(req.password)) {
    return { success: false, message: '비밀번호가 일치하지 않습니다.' };
  }

  saveCurrentSession(target);
  return { success: true, message: '로그인되었습니다.', user: target };
}

/**
 * 로그아웃 (게스트 모드로 전환)
 */
export function logoutAccount(): AuthSession {
  const guest = createGuestAccount();
  saveCurrentSession(guest);
  return {
    currentUser: guest,
    isAuthenticated: false,
    isGuest: true
  };
}

/**
 * 기기 간 동기화용 전체 데이터 내보내기 (PC ➔ 모바일)
 * 계정 정보 + 운동 기록 + 위젯 설정을 하나의 패키지로 추출
 */
export function exportUserDataPackage(userId: string): string {
  const accounts = getAllAccounts();
  const account = accounts.find(a => a.id === userId);
  const workoutData = safeGet(`fitstats_data_${userId}`) || '{}';
  const profilesRaw = safeGet('fitstats_profiles_v1') || '[]';

  const payload = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    account: account || null,
    workoutData: JSON.parse(workoutData),
    profiles: JSON.parse(profilesRaw)
  };

  return JSON.stringify(payload, null, 2);
}

/**
 * 기기 간 동기화용 데이터 가져오기 (모바일에서 붙여넣기)
 * 모바일 브라우저의 localStorage에 계정과 운동 기록을 복원하고 자동 로그인
 */
export function importUserDataPackage(packageJson: string): { success: boolean; message: string; user?: UserAccount } {
  try {
    const data = JSON.parse(packageJson);
    if (!data || !data.account || !data.account.username) {
      return { success: false, message: '올바른 FitStats 데이터 동기화 코드가 아닙니다.' };
    }

    const importedUser: UserAccount = data.account;
    const userId = importedUser.id;

    // 1. 계정 목록에 병합
    const accounts = getAllAccounts();
    const existingIndex = accounts.findIndex(a => a.id === userId || a.username === importedUser.username);
    if (existingIndex !== -1) {
      accounts[existingIndex] = importedUser;
    } else {
      accounts.push(importedUser);
    }
    saveAccounts(accounts);

    // 2. 운동 기록 복원
    if (data.workoutData) {
      safeSet(`fitstats_data_${userId}`, JSON.stringify(data.workoutData));
    }

    // 3. 프로필 목록 복원
    if (data.profiles && Array.isArray(data.profiles)) {
      safeSet('fitstats_profiles_v1', JSON.stringify(data.profiles));
    }

    // 4. 복원된 계정으로 즉시 자동 로그인
    saveCurrentSession(importedUser);

    return { 
      success: true, 
      message: `'${importedUser.nickname}' 계정과 운동 데이터가 성공적으로 동기화되었습니다!`, 
      user: importedUser 
    };
  } catch (e) {
    console.error('동기화 파싱 오류:', e);
    return { success: false, message: '데이터 동기화 형식이 올바르지 않습니다.' };
  }
}
