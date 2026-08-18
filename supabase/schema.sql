-- =========================================================
-- 정통대왕쑥뜸원 Wellness AX Platform — Supabase 스키마 초안
-- lib/types/index.ts 의 도메인 타입과 1:1 매핑된다.
-- 연동 시 lib/data/store.tsx 의 액션 구현만 교체하면 된다.
-- =========================================================

-- 본사
create table if not exists hqs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

-- 지점 (HQ → Branch)
create table if not exists branches (
  id uuid primary key default gen_random_uuid(),
  hq_id uuid not null references hqs(id),
  name text not null,
  address text,
  phone text,
  open_hours text,
  created_at timestamptz not null default now()
);

-- 직원 (역할: owner / manager / staff — RBAC 확장 대비)
create table if not exists staff (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references branches(id),
  name text not null,
  role text not null default 'staff' check (role in ('owner','manager','staff')),
  phone text,
  active boolean not null default true,
  auth_user_id uuid, -- Supabase Auth 연동 시 사용
  created_at timestamptz not null default now()
);

-- 고객
create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references branches(id),
  name text not null,
  phone text not null,
  gender text check (gender in ('female','male','other')),
  birth_year int,
  registered_at date not null default current_date,
  assigned_staff_id uuid references staff(id),
  memo text,
  -- 집중 케어 희망 부위: [{part, side, sub_part, note}]
  focus_body_parts jsonb not null default '[]',
  next_manage_date date,
  last_contact_date date,
  tags text[] default '{}',
  created_at timestamptz not null default now()
);
create index if not exists idx_customers_branch on customers(branch_id);
create index if not exists idx_customers_next_manage on customers(next_manage_date);

-- 이용권
create table if not exists memberships (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references branches(id),
  customer_id uuid not null references customers(id),
  program_name text not null,
  total_count int not null,
  remaining_count int not null,
  purchased_at date not null,
  expires_at date,
  price int not null default 0,
  status text not null default 'active' check (status in ('active','exhausted','expired')),
  created_at timestamptz not null default now()
);
create index if not exists idx_memberships_customer on memberships(customer_id);

-- 방문 / 상담 기록
create table if not exists visits (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references branches(id),
  customer_id uuid not null references customers(id),
  staff_id uuid references staff(id),
  visited_at timestamptz not null default now(),
  type text not null default 'visit' check (type in ('visit','consult')),
  program_name text,
  membership_id uuid references memberships(id),
  body_parts jsonb not null default '[]', -- [{part, side, sub_part, note}]
  reaction text,
  amount int,
  next_manage_date date,
  created_at timestamptz not null default now()
);
create index if not exists idx_visits_customer on visits(customer_id);
create index if not exists idx_visits_branch_date on visits(branch_id, visited_at);

-- 브리핑 과제 상태 로그
-- 과제 생성은 규칙 엔진(lib/scoring/priority.ts)이 수행하고,
-- 이 테이블은 상태 변경 이력만 저장한다 (처리율 추이 산출용).
create table if not exists briefing_task_logs (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references branches(id),
  customer_id uuid not null references customers(id),
  task_date date not null,
  category text not null,
  priority_score int not null,
  status text not null check (status in ('pending','confirmed','done','hold')),
  status_changed_at timestamptz not null default now(),
  handled_by_staff_id uuid references staff(id),
  unique (task_date, customer_id)
);
create index if not exists idx_task_logs_date on briefing_task_logs(task_date);

-- =========================================================
-- RLS (Row Level Security) 기본 방향
-- 연동 시 활성화: 지점 소속 직원만 자기 지점 데이터 접근.
-- =========================================================
-- alter table customers enable row level security;
-- create policy customers_by_branch on customers
--   using (branch_id in (select branch_id from staff where auth_user_id = auth.uid()));
-- (memberships, visits, briefing_task_logs 동일 패턴)
