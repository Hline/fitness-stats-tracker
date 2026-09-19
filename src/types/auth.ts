export type GenderType = 'male' | 'female' | 'other' | 'unspecified';

export interface UserAccount {
  id: string;
  username: string; // 사용자 로그인 ID
  email: string;    // 이메일
  passwordHash: string;
  nickname: string;
  birthday?: string; // YYYY-MM-DD (선택)
  gender?: GenderType; // 선택
  avatarColor: string;
  createdAt: string;
  isGuest: boolean;
}

export interface RegisterRequest {
  username: string;
  password: string;
  email: string;
  nickname?: string;
  birthday?: string;
  gender?: GenderType;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface AuthSession {
  currentUser: UserAccount;
  isAuthenticated: boolean;
  isGuest: boolean;
}
