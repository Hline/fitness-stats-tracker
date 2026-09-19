-- ==============================================================================
-- FitStats (피트니스 통계 트래커) Supabase PostgreSQL DDL 스키마
-- Supabase 대시보드 -> SQL Editor 에서 본 스크립트를 붙여넣고 [Run]을 누르면 즉시 적용됩니다.
-- ==============================================================================

-- 1. 사용자 프로필 테이블 (auth.users 와 연동)
create table if not exists fitstats_profiles (
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

-- 2. 일별 집계 데이터 테이블 (복합 Primary Key: user_id, date)
-- 증분 동기화(Incremental Sync)를 위해 updated_at 인덱스 포함
create table if not exists fitstats_daily_stats (
  user_id uuid references auth.users on delete cascade not null,
  date text not null, -- 'YYYY-MM-DD'
  steps integer default 0,
  active_calories integer default 0,
  total_calories integer default 0,
  workout_count integer default 0,
  max_workout_hr integer default 0,
  min_hr integer default 0,
  resting_hr integer default 0,
  avg_hr integer default 0,
  cardio_minutes integer default 0,
  distance_km numeric(6, 2) default 0,
  hourly_steps jsonb default '[]'::jsonb,
  heart_rate_samples jsonb default '[]'::jsonb,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (user_id, date)
);

-- 3. 개별 운동 세션 테이블
create table if not exists fitstats_workouts (
  id text not null,
  user_id uuid references auth.users on delete cascade not null,
  date text not null, -- 'YYYY-MM-DD'
  activity_type text not null,
  duration_minutes integer default 0,
  active_calories integer default 0,
  avg_heart_rate integer default 0,
  max_heart_rate integer default 0,
  distance_km numeric(6, 2) default 0,
  route_points jsonb default '[]'::jsonb,
  source text default 'manual',
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (user_id, id)
);

-- 4. 성능 최적화를 위한 인덱스 생성
create index if not exists idx_fitstats_daily_stats_updated on fitstats_daily_stats (user_id, updated_at);
create index if not exists idx_fitstats_workouts_updated on fitstats_workouts (user_id, updated_at);
create index if not exists idx_fitstats_workouts_date on fitstats_workouts (user_id, date);

-- 5. Row Level Security (RLS) 활성화
alter table fitstats_profiles enable row level security;
alter table fitstats_daily_stats enable row level security;
alter table fitstats_workouts enable row level security;

-- 6. RLS 정책 정의 (본인 데이터에 대해서만 완전한 CRUD 권한 부여)
-- Profiles
create policy "Users can view own profile" 
  on fitstats_profiles for select 
  using (auth.uid() = id);

create policy "Users can insert own profile" 
  on fitstats_profiles for insert 
  with check (auth.uid() = id);

create policy "Users can update own profile" 
  on fitstats_profiles for update 
  using (auth.uid() = id);

-- Daily Stats
create policy "Users can view own daily stats" 
  on fitstats_daily_stats for select 
  using (auth.uid() = user_id);

create policy "Users can insert own daily stats" 
  on fitstats_daily_stats for insert 
  with check (auth.uid() = user_id);

create policy "Users can update own daily stats" 
  on fitstats_daily_stats for update 
  using (auth.uid() = user_id);

create policy "Users can delete own daily stats" 
  on fitstats_daily_stats for delete 
  using (auth.uid() = user_id);

-- Workouts
create policy "Users can view own workouts" 
  on fitstats_workouts for select 
  using (auth.uid() = user_id);

create policy "Users can insert own workouts" 
  on fitstats_workouts for insert 
  with check (auth.uid() = user_id);

create policy "Users can update own workouts" 
  on fitstats_workouts for update 
  using (auth.uid() = user_id);

create policy "Users can delete own workouts" 
  on fitstats_workouts for delete 
  using (auth.uid() = user_id);

-- 7. 실시간 동기화 (Realtime) 발행 목록에 테이블 등록
alter publication supabase_realtime add table fitstats_daily_stats;
alter publication supabase_realtime add table fitstats_workouts;
