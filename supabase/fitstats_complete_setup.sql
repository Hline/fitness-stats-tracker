-- ==============================================================================
-- 🚀 FitStats (피트니스 통계 트래커) Supabase PostgreSQL 통합 설정 스크립트
-- 프로젝트: fitness-stats-tracker (bookmark-assistant 프로젝트와 DB 공유)
-- 테이블 접두사: fitstats_* (기존 bookmarks, kakao 등과 완벽 격리)
--
-- [적용 방법]
-- 1. Supabase 대시보드 (https://supabase.com/dashboard/project/ruiryvzwzhhwjkjbemhq/sql/new) 접속
-- 2. 본 스크립트 전체를 복사하여 SQL Editor에 붙여넣기
-- 3. 우측 하단 [Run] 버튼 클릭 (1회 실행으로 3개 테이블, 인덱스, RLS 보안정책, 실시간 동기화 자동 완성)
-- ==============================================================================

-- 1. 사용자 프로필 테이블 (auth.users 연동)
create table if not exists public.fitstats_profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique not null,
  email text,
  nickname text,
  birthday text,
  gender text default 'unspecified',
  avatar_color text default 'bg-emerald-400',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. 일별 운동 통계 테이블 (복합 Primary Key: user_id, date)
-- 사용자의 선택적 동기화(SyncScope)를 지원하기 위해 지표 컬럼들은 nullable로 정의
create table if not exists public.fitstats_daily_stats (
  user_id uuid references auth.users on delete cascade not null,
  date text not null, -- 'YYYY-MM-DD'
  steps integer,                          -- 걸음 수 (선택 해제 시 null)
  active_calories integer,                -- 활동 칼로리 (선택 해제 시 null)
  total_calories integer,                 -- 총 소모 칼로리 (선택 해제 시 null)
  workout_count integer,                  -- 운동 횟수 (선택 해제 시 null)
  max_workout_hr integer,                 -- 운동 중 최고 심박수 (선택 해제 시 null)
  min_hr integer,                         -- 최저 심박수
  resting_hr integer,                     -- 안정시 심박수
  avg_hr integer,                         -- 평균 심박수
  cardio_minutes integer,                 -- 심폐 유산소 운동 시간
  distance_km numeric(6, 2),              -- 총 이동 거리 (km)
  hourly_steps jsonb default '[]'::jsonb, -- 시간대별 걸음 분포
  heart_rate_samples jsonb default '[]'::jsonb, -- 심박수 샘플
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (user_id, date)
);

-- 3. 개별 운동 세션 테이블 (복합 Primary Key: user_id, id)
create table if not exists public.fitstats_workouts (
  id text not null,
  user_id uuid references auth.users on delete cascade not null,
  date text not null, -- 'YYYY-MM-DD'
  activity_type text not null,
  duration_minutes integer default 0,
  active_calories integer,                -- 소모 칼로리 (미측정 시 null)
  avg_heart_rate integer,                 -- 평균 심박수 (미측정 시 null)
  max_heart_rate integer,                 -- 최고 심박수 (미측정 시 null)
  distance_km numeric(6, 2),              -- 거리 (km)
  route_points jsonb default '[]'::jsonb, -- GPS 이동 경로 (선택 해제 시 빈 배열)
  source text default 'manual',
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (user_id, id)
);

-- 4. 성능 최적화를 위한 인덱스 생성
create index if not exists idx_fitstats_daily_stats_updated on public.fitstats_daily_stats (user_id, updated_at);
create index if not exists idx_fitstats_workouts_updated on public.fitstats_workouts (user_id, updated_at);
create index if not exists idx_fitstats_workouts_date on public.fitstats_workouts (user_id, date);

-- 5. Row Level Security (RLS) 활성화
alter table public.fitstats_profiles enable row level security;
alter table public.fitstats_daily_stats enable row level security;
alter table public.fitstats_workouts enable row level security;

-- 6. 본인 데이터 전용 CRUD 보안 정책 정의
drop policy if exists "Users can view own profile" on public.fitstats_profiles;
create policy "Users can view own profile" on public.fitstats_profiles for select using (auth.uid() = id);

drop policy if exists "Users can insert own profile" on public.fitstats_profiles;
create policy "Users can insert own profile" on public.fitstats_profiles for insert with check (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.fitstats_profiles;
create policy "Users can update own profile" on public.fitstats_profiles for update using (auth.uid() = id);

drop policy if exists "Users can CRUD own daily stats" on public.fitstats_daily_stats;
create policy "Users can CRUD own daily stats" on public.fitstats_daily_stats for all using (auth.uid() = user_id);

drop policy if exists "Users can CRUD own workouts" on public.fitstats_workouts;
create policy "Users can CRUD own workouts" on public.fitstats_workouts for all using (auth.uid() = user_id);

-- 7. Realtime 실시간 동기화 채널에 테이블 등록
do $$
begin
  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' and tablename = 'fitstats_daily_stats'
  ) then
    alter publication supabase_realtime add table public.fitstats_daily_stats;
  end if;

  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' and tablename = 'fitstats_workouts'
  ) then
    alter publication supabase_realtime add table public.fitstats_workouts;
  end if;
end $$;
