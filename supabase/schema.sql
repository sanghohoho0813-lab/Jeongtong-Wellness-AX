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
  next_manage_time time, -- 다음 관리 예정 시간 (화면에서는 오전/오후로 표시)
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
  next_manage_time time,
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
  -- 실행 결과 (TaskOutcome)
  contact_result text check (contact_result in
    ('contacted','reserved','no_answer','not_needed')),
  revisit_expected boolean,
  next_management_date date,
  next_management_time time,
  memo text,
  hold_until date,
  unique (task_date, customer_id)
);
create index if not exists idx_task_logs_date on briefing_task_logs(task_date);

-- 케어 선호 · 특이사항 (고객 감동 포인트)
create table if not exists customer_preferences (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references branches(id),
  customer_id uuid not null references customers(id) on delete cascade,
  category text not null check (category in
    ('temperature','pressure','position','environment','beverage','conversation','caution','etc')),
  note text not null,
  pinned boolean not null default false, -- 매 방문 확인 대상
  created_by_staff_id uuid references staff(id),
  created_at timestamptz not null default now()
);
create index if not exists idx_prefs_customer on customer_preferences(customer_id);

-- 방문에서 확인·반영한 선호 항목 (Visit.appliedPreferenceIds)
create table if not exists visit_applied_preferences (
  visit_id uuid not null references visits(id) on delete cascade,
  preference_id uuid not null references customer_preferences(id) on delete cascade,
  primary key (visit_id, preference_id)
);

-- =========================================================
-- RLS (Row Level Security)
--
-- 역할 정의 (lib/auth/permissions.ts 와 동일):
--   ADMIN = staff.role in ('owner','manager')  → 지점 전체 데이터 R/W
--   STAFF = staff.role = 'staff'               → 고객·케어 데이터만 R/W,
--                                                연락처(phone)는 열람 불가
-- 모든 접근은 branch_id 로 스코프된다.
--
-- 화면 접근도 동일한 기준으로 좁힌다:
--   STAFF 에게 노출되는 메뉴는 '고객' 하나뿐이며(lib/auth/permissions.ts 의
--   STAFF_ROUTES), 그 외 화면은 직접 접근해도 고객 화면으로 되돌린다.
--   따라서 STAFF 세션은 아래 정책상 customers / visits / memberships /
--   customer_preferences 만 실제로 조회하게 된다.
-- =========================================================

-- 현재 사용자의 지점 / 역할 헬퍼
create or replace function current_branch_id() returns uuid
language sql stable security definer as $$
  select branch_id from staff where auth_user_id = auth.uid() and active limit 1;
$$;

create or replace function is_admin() returns boolean
language sql stable security definer as $$
  select exists (
    select 1 from staff
    where auth_user_id = auth.uid() and active and role in ('owner','manager')
  );
$$;

alter table branches   enable row level security;
alter table staff      enable row level security;
alter table customers  enable row level security;
alter table memberships enable row level security;
alter table visits     enable row level security;
alter table customer_preferences enable row level security;
alter table briefing_task_logs   enable row level security;

-- 지점 / 직원 : 조회는 같은 지점, 변경은 ADMIN 만
create policy branches_read on branches for select
  using (id = current_branch_id());
create policy branches_write on branches for all
  using (id = current_branch_id() and is_admin())
  with check (id = current_branch_id() and is_admin());

create policy staff_read on staff for select
  using (branch_id = current_branch_id());
create policy staff_write on staff for all
  using (branch_id = current_branch_id() and is_admin())
  with check (branch_id = current_branch_id() and is_admin());

-- 고객 / 이용권 / 방문 / 선호 : 같은 지점이면 ADMIN·STAFF 모두 R/W
--   (직원의 핵심 업무이므로 등록·수정 허용, 연락처만 아래 뷰로 차단)
create policy customers_all on customers for all
  using (branch_id = current_branch_id())
  with check (branch_id = current_branch_id());

create policy memberships_all on memberships for all
  using (branch_id = current_branch_id())
  with check (branch_id = current_branch_id());

create policy visits_all on visits for all
  using (branch_id = current_branch_id())
  with check (branch_id = current_branch_id());

create policy prefs_all on customer_preferences for all
  using (branch_id = current_branch_id())
  with check (branch_id = current_branch_id());

-- 관리 과제 로그 : 조회는 같은 지점, 수정은 ADMIN 또는 본인 처리 건
create policy tasks_read on briefing_task_logs for select
  using (branch_id = current_branch_id());
create policy tasks_write on briefing_task_logs for all
  using (
    branch_id = current_branch_id()
    and (is_admin() or handled_by_staff_id in
         (select id from staff where auth_user_id = auth.uid()))
  )
  with check (branch_id = current_branch_id());

-- ---------------------------------------------------------
-- 연락처 마스킹
-- Postgres RLS 는 행 단위라 컬럼 숨김은 뷰로 처리한다.
-- 앱은 항상 customers_view 를 조회하고, phone 원본은 ADMIN 에게만 내려간다.
-- (프론트의 displayPhone(phone, canSeePhone) 과 동일한 규칙)
-- ---------------------------------------------------------
create or replace view customers_view
with (security_invoker = true) as
select
  c.id, c.branch_id, c.name,
  case
    when is_admin() then c.phone
    else regexp_replace(c.phone, '^(\d{3})\d{4}(\d{4})$', '\1****\2')
  end as phone,
  (not is_admin()) as phone_masked,
  c.gender, c.birth_year, c.registered_at, c.assigned_staff_id,
  c.memo, c.focus_body_parts, c.next_manage_date, c.next_manage_time,
  c.last_contact_date,
  c.tags, c.created_at
from customers c;

-- 매출 집계는 ADMIN 전용 뷰로 분리 (STAFF 는 접근 자체가 없음)
create or replace view branch_revenue_view
with (security_invoker = true) as
select branch_id, date_trunc('month', purchased_at) as month, sum(price) as revenue
from memberships
where is_admin()
group by 1, 2;
