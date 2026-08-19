# Supabase 연동 준비 체크리스트

지금 이 앱은 브라우저 저장소(localStorage) 하나로 돌아간다. 한 대의 기기 안에서는
완전히 동작하지만, 지점 간 공유도 기기 간 동기화도 되지 않는다.
이 문서는 그 마지막 한 단계를 실제로 붙일 때 **무엇을 어떤 순서로 하면 되는지**를
정리한 것이다.

---

## 0. 먼저 준비해야 하는 것 (사람이 해야 하는 일)

이것만은 코드로 만들 수 없다.

| 항목 | 어디서 얻는가 |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 → Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 같은 화면의 `anon` `public` 키 |
| (선택) `SUPABASE_SERVICE_ROLE_KEY` | 초기 데이터 이관 스크립트에만 사용. **브라우저에 절대 노출 금지** |

`.env.local` 에 넣고, Vercel 배포 환경변수에도 같은 값을 등록한다.

> anon 키는 공개되어도 되는 키다. 대신 **모든 보호는 RLS가 한다.**
> 그래서 아래 2단계(RLS 확인)를 건너뛰면 안 된다.

---

## 1. 스키마 올리기

`supabase/schema.sql` 을 Supabase SQL Editor에 그대로 붙여 실행한다.
테이블·인덱스·RLS 정책·뷰가 한 번에 만들어진다.

만들어지는 것:

- `hqs` / `branches` / `staff`
- `customers` / `memberships` / `visits`
- `briefing_task_logs` — 과제 **상태 변경 이력만** 저장한다.
  과제 생성은 지금처럼 규칙 엔진(`lib/scoring/priority.ts`)이 매번 계산한다.
- `customer_preferences` / `visit_applied_preferences`
- `branch_settings` — 관리 기준·매출기회 기준·매장 정보 (지점 공통)
- `staff_display_settings` — 글자 크기·화면 밀도·테마 (개인별)
- `customers_view` — 연락처 마스킹 뷰
- `branch_revenue_view` — 매출 집계 (ADMIN 전용)

### 설정을 왜 두 테이블로 나누는가

지금은 `AppSettings` 하나에 다 들어 있지만, 여러 사람이 쓰기 시작하면 성격이 갈린다.

- **지점 공통**(`branch_settings`): 장기 미방문 기준, 이용권 소진 임박 기준 등.
  이건 모두에게 같은 값이어야 한다. 직원마다 다르면 같은 고객을 두고
  브리핑이 서로 달라진다.
- **개인 화면**(`staff_display_settings`): 글자 크기, 테마.
  이건 반대로 사람마다 달라야 한다.

---

## 2. RLS가 실제로 막는지 확인 (건너뛰지 말 것)

정책은 이미 스키마에 들어 있다. 확인해야 하는 것은 "정말 막히는가"이다.

1. 직원(`role = 'staff'`) 계정으로 로그인해 `customers` 를 직접 조회 → **연락처 원본이 보이면 안 된다.**
   앱은 항상 `customers_view` 를 조회해야 한다.
2. 다른 지점의 `branch_id` 로 조회 → 0행이 나와야 한다.
3. 직원 계정으로 `branch_settings` 를 UPDATE → 거부되어야 한다.
4. 직원 계정으로 남이 처리한 `briefing_task_logs` 행을 UPDATE → 거부되어야 한다.

이 네 가지가 통과하지 않으면 다음 단계로 가지 않는다.

---

## 3. 계정 연결

`staff.auth_user_id` 를 Supabase Auth 사용자와 이어 준다.
RLS 헬퍼(`current_branch_id()`, `is_admin()`)가 전부 이 열을 기준으로 동작하므로,
이 연결이 비어 있으면 **로그인은 되는데 아무 데이터도 안 보이는** 상태가 된다.

```sql
update staff set auth_user_id = '<auth.users.id>' where name = '최정철';
```

---

## 4. 지금 데이터 옮기기

앱의 **설정 → 데이터 → 전체 백업 (JSON)** 으로 현재 기록을 받는다.
그 파일 하나에 고객·방문·이용권·직원·지점·설정이 모두 들어 있다.

옮길 때 주의할 점:

- 현재 id는 `c-01`, `v-3f2a` 같은 문자열이고 스키마는 `uuid` 다.
  **옛 id → 새 uuid 대응표를 만들어 두고** 참조(`customer_id`, `membership_id`,
  `staff_id`)를 함께 바꿔야 한다. 순서는 지점 → 직원 → 고객 → 이용권 → 방문.
- `visits.visited_at` 은 `timestamptz` 다. 저장된 값은 지역시각 문자열
  (`2026-08-19T14:30:00`)이라 타임존을 명시하지 않으면 하루가 밀릴 수 있다.
- `focus_body_parts` / `body_parts` 는 `jsonb` 로 그대로 넣으면 된다.

---

## 5. 코드에서 바꾸는 곳은 한 군데

`lib/data/store.tsx` 의 액션 구현만 교체한다. **화면 코드는 손대지 않는다.**
이 파일이 이미 다음 형태로 정리되어 있어서, 함수 본문만 Supabase 호출로 바꾸면 된다.

```
addCustomer / updateCustomer
addVisit / updateVisit / removeVisit / restoreVisit
addMembership / updateMembership / removeMembership / restoreMembership
addPreference / togglePreferencePin / removePreference
setTaskStatus
updateSettings / updateStaff
importCustomers / restoreBackup / startFresh / resetData
```

### 바뀌지 않는 것

- **`lib/scoring/priority.ts` (Priority Score 엔진)** — 판단 기준이므로 그대로 둔다.
- `lib/scoring/opportunity.ts` (AX 매출기회) — 순수 함수라 그대로 동작한다.
- 모든 화면 컴포넌트 — `useStore()` 인터페이스가 같으면 영향이 없다.

### 새로 생각해야 하는 것

localStorage에는 없던 문제들이다.

- **저장 실패 처리**: 지금은 `saveFailed` 로 배너를 띄운다. 네트워크 오류도 같은
  자리에 붙이면 화면 수정 없이 재사용할 수 있다.
- **낙관적 갱신**: 등록 버튼을 눌렀을 때 서버 응답을 기다리며 멈추면 현장에서 답답하다.
  화면을 먼저 바꾸고 실패 시 되돌리는 방식이 맞다.
- **동시 편집**: 두 사람이 같은 고객을 동시에 수정하는 경우.
  당장은 마지막 저장이 이기는 방식으로 두고, 문제가 실제로 생기면 `updated_at` 비교를 넣는다.
- **이용권 차감**: 방문 등록과 이용권 잔여 차감은 반드시 함께 성공하거나 함께 실패해야 한다.
  Postgres 함수(RPC) 하나로 묶는 편이 안전하다.

---

## 6. 옮기고 나서 확인할 것

- [ ] 대표 계정으로 로그인 → 고객 목록에 연락처가 보인다
- [ ] 직원 계정으로 로그인 → 연락처가 `010-****-1234` 로 마스킹된다
- [ ] 직원 계정에 메뉴가 '고객' 하나만 보이고, `/analytics` 로 직접 들어가면 되돌려진다
- [ ] 방문을 등록하면 이용권 잔여가 1 줄고, 삭제하면 다시 돌아온다
- [ ] 브리핑에서 과제를 처리하면 다른 기기에서도 처리 상태로 보인다
- [ ] 분석 화면의 담당자별 실행 현황에 처리한 사람 이름이 뜬다
- [ ] 설정에서 관리 기준을 바꾸면 다른 기기의 브리핑 우선순위에도 반영된다
- [ ] 전체 백업을 받아 열어 보면 옮겨진 데이터가 그대로 들어 있다

---

## 7. 그다음

Supabase가 붙고 나면 그때 의미가 생기는 것들이다. 지금 미리 만들 필요는 없다.

- 지점 2호점 추가 (스키마는 이미 `branch_id` 로 전부 스코프되어 있다)
- 예약 연동 · 자동 안내 발송
- 축적된 실행 결과를 이용한 관리 기준 자동 보정

