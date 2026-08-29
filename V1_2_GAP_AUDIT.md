# V1_2 GAP AUDIT — 정통대왕쑥뜸원 WELLNESS BUSINESS AX

> 기준 문서: **미래AI랩 AX + Platform Unified Design & Development System v1.2**
> 대상 저장소: `sanghohoho0813-lab/Jeongtong-Wellness-AX` (branch `claude/youthful-goldberg-s6v1q5`)
> 수행일: 2026-08-29 · PASS 1 (설계 잠금)
>
> 이 문서는 **재설계 계획서가 아니다.** 이미 동작하는 것을 그대로 두고,
> v1.2가 요구하는데 없는 것만 골라내기 위한 대조표다.
> 실제 코드를 읽고 확인한 것만 적었다. 확인하지 못한 것은 `E`로 남겼고,
> 추측으로 "있다"고 적은 항목은 없다.

---

## 0. 판정 기호

| 기호 | 뜻 | PASS 2 처리 |
|---|---|---|
| **A** | v1.2 요구를 이미 충족한다 | 손대지 않는다 |
| **B** | 있으나 일부 미달 (범위·품질·기기 한쪽) | 부족한 부분만 보강 |
| **C** | 없다 (Route/파일/기능 자체가 부재) | 신규 추가 |
| **D** | 있으나 v1.2와 **다르게** 동작한다 (라벨↔행동 불일치 등) | 행동을 맞춘다 |
| **E** | 이 환경에서 **검증 불가** | 구현하되 검증 한계를 정직하게 보고 |

우선순위: **P0 > P1 > P2 > P3**

---

## 1. 30개 영역 대조표

| # | 영역 | v1.2 요구 | 현재 구현 (확인한 파일) | 판정 | 우선 |
|---|---|---|---|---|---|
| 01 | Surface Round-trip (Desktop) | Customer ↔ Business 양방향 | `/` → 사이드바 `고객 화면` → `/welcome` → 상단 바 `내부 AX 화면` → `/`. `nav-items.ts:57`, `PublicShell.tsx` | **A** | — |
| 02 | Surface Round-trip (Mobile) | 폰에서도 양방향 | 폰 하단탭에 `고객 화면` 없음. `/more`로 들어가야 보인다. `BOTTOM_NAV_ITEMS`에 미포함 | **B** | P0 |
| 03 | Demo Control Layer / 진입점 은닉 | 일반 고객 Role에는 Business 진입점 숨김 | `PublicShell` 상단 바가 **누구에게나** 보인다. 링크 자체는 `StaffGate` 뒤라 유출은 없으나 노출 정책 불일치 | **B** | P1 |
| 04 | Device Preview 존재 | 현재 Route/Data/State를 반대 Viewport로 | **없음.** `components/`, `lib/` 전수 검색 결과 Device Preview 코드 0 | **C** | P0 |
| 05 | Device Preview 재귀 금지 | Preview 안에서 Preview 금지 | 기능 부재로 해당 없음 → 신규 구현 시 최초 적용 | **C** | P0 |
| 06 | Device Preview True Viewport | 390px 첫 화면 동일, 상하 잘림 0, scrollTop 0 | 기능 부재 | **C** | P0 |
| 07 | Device Preview Escape Path | X · Backdrop · ESC, 닫은 뒤 완전 복구 | 기능 부재. 단 `components/ui/index.tsx` `Modal`이 focus trap·ESC·복원을 이미 갖춤 → 재사용 가능 | **C** | P0 |
| 08 | Preview Route 404 금지 | 없는 `/mobile-preview` 만들지 않기 | 현재 그런 Route 없음. 신규도 **Route 없이 현재 화면에 viewport mode만** 적용 예정 | **A** | — |
| 09 | Navigation Semantics — `더보기` | 눌렀을 때 Drawer/Sheet/Popover가 열려야 함 | `BOTTOM_NAV_ITEMS`의 `더보기`가 **`/more` 단일 화면으로 이동**한다 (`nav-items.ts:75`) | **D** | P1 |
| 10 | Navigation Semantics — 그 외 | `오늘의 AX`·`설정`·`시연` 라벨↔행동 일치 | `오늘의 실행 브리핑`→`/briefing`, `설정`→`/settings` 일치. `시연` 라벨 자체가 없음(11번) | **A** | — |
| 11 | Presentation Mode | 8~12 Step Guided Product Demo, 실제 Route 이동 | **없음.** `presentation/시연/발표` 검색 결과 해당 기능 0 (매치는 전부 Supabase 관련) | **C** | P1 |
| 12 | Tutorial (3~5 Step 첫 사용자용) | 짧은 첫 사용 안내 | `Tour.tsx`는 **관리자 20 Step**. 실제 Route 이동·Spotlight는 이미 정상. 다만 "첫 사용자 3~5 Step"이 아니다 | **B** | P1 |
| 13 | Tutorial Overlay Lifecycle | 종료 후 backdrop/blur/scroll/focus 완전 복구 | `Tour.tsx` `stop()`이 타이머·박스 정리. `qa/keyboard.mjs` 25항목이 focus 복원 회귀 검사 중 | **A** | — |
| 14 | Why AX (신규, 12~16 Section) | 기획의도와 **별도**의 회사 맞춤 Story | `/intro`(기획의도)는 **11 Section**이고 보존 대상. `Why AX` Route/화면 **없음** | **C** | P1 |
| 15 | Why AX Discoverability | Sidebar/Nav에서 발견, 복귀 CTA | 기능 부재 | **C** | P1 |
| 16 | Theme 6종 실제 동작 | 6 Theme × 6 Token, 실제 UI 반영 | `lib/types/index.ts:403` `Theme = "light" \| "dark" \| "system"`. **밝기 모드 3종뿐, 색 조합은 1종** | **C** | P1 |
| 17 | Theme Picker 위치 | Business AX Settings에 6종, 고객에게 미노출 | Picker는 `settings/page.tsx:277`·`more/page.tsx:126` 두 곳에 있고 고객 포털에는 없다(정책 일치). 항목만 3→6 확장 필요 | **B** | P1 |
| 18 | Theme PC/Mobile 상태 공유 | 같은 상태 | `settings.theme` 단일 소스 → `store.tsx:443`에서 `data-theme` 적용. 이미 공유됨 | **A** | — |
| 19 | Font Scale | Desktop/Mobile/Discoverable | `small·default·large` 3단, `/settings`·`/more` 양쪽 노출, `globals.css` `--font-scale` 적용 | **A** | — |
| 20 | 날짜 + 현재시각 Parity | 삭제 아닌 재배치 | `LiveClock` — 사이드바(`AppShell.tsx:77`)·폰 헤더(`variant="header"`, :205) 양쪽 존재 | **A** | — |
| 21 | Role / Permission Preview | Role 전환 시 Menu·KPI·Data·Action 실제 변화 | `UserSwitch.tsx` — Demo에서만 전환 가능(`canSwitch = demoMode && !authStaff`), `navItemsFor`·`canAccessRoute`·`RouteGuard`로 실제 메뉴/화면이 달라짐. **Permission Matrix 화면은 없음** | **B** | P2 |
| 22 | Demo Reset | 발견 → 실행 → 초기상태 | `settings/page.tsx:841 startFresh()`, `:867 resetData()`. 설정 최하단이라 발견성만 약함 | **B** | P2 |
| 23 | Closed Data Loop — Customer → AX | 고객 요청 → AX Event → 담당자 Action | 고객 `/my/request`·`FeedbackCard` → `CustomerInboxCard`(대시보드 수신함). **동작 확인됨** | **A** | — |
| 24 | Closed Data Loop — AX → Customer | 내부 처리 → 고객 상태 반영 | 직원이 고객상세에서 `다음 관리 예정일` 변경 → 포털 홈 `다음 방문 예정` 반영(`nextReference(usage, customer.nextManageDate)`). 이용권 차감도 동일 | **A** | — |
| 25 | AI 표현 정직성 | 미연결 시 `AI READY / AI PREVIEW` + 규칙 기반 명시 | UI 전반에 `AI 추천`·`AX Insight` 라벨은 있으나, **"현재 규칙 기반 Demo"라는 고지가 화면 어디에도 없다.** `analytics/page.tsx:107` 주석에만 존재 | **C** | P0 |
| 26 | Sidebar Icon Color System | 무채색 단색 금지, Palette 6~8 이내 | `NAV_TONE_CLASS` 8 tone (aqua/teal/sky/violet/amber/emerald/gold/gray) + 30~34px 타일. 요구 충족 | **A** | — |
| 27 | Dark Shell Readability | Nav Text White 계열(비활성 ≥ `#E5E7EB`) | 다크 모드 사이드바 비활성 글자 `--c-ink-sub: 150 166 162` = `#96A6A2`. 대비는 AA를 넘지만 **v1.2가 요구하는 White 계열이 아님** | **B** | P2 |
| 28 | Pure White Surface 비중 | Raised Surface 60~80% Pure White | `--c-card: 255 255 255` (라이트 기본이 Pure White). `card-soft`(#FAF9F6)·`gold-soft` 카드가 섞여 있어 **실측 필요** | **E→측정** | P2 |
| 29 | Hover Coverage ≥ 90% | 주요 Clickable 전부 상태 Feedback | `hover:` 선언 148곳 + `.card:hover`(globals.css:181). **CSS 존재만으로 PASS 금지**가 v1.2 규정이므로 실측 필요 | **E→측정** | P2 |
| 30 | Motion Contract | 140~180ms ease-out, reduced-motion 대응 | `prefers-reduced-motion: reduce` 대응 존재(globals.css:484). 카드 transition은 **280ms** `cubic-bezier(.22,1,.36,1)` — 규격(140~180ms)보다 느리다 | **B** | P2 |

---

## 2. 판정 집계

| 판정 | 개수 | 영역 번호 |
|---|---|---|
| **A** (충족) | 11 | 01, 08, 10, 13, 18, 19, 20, 23, 24, 26 (+ 05·06·07은 C) |
| **B** (부분) | 8 | 02, 03, 12, 17, 21, 22, 27, 30 |
| **C** (누락) | 8 | 04, 05, 06, 07, 11, 14, 15, 16 |
| **D** (다름) | 1 | 09 |
| **E** (측정 필요) | 2 | 28, 29 |

---

## 3. Hard Blocker 판정

**Hard Blocker 없음 → PASS 2 연속 진행.**

다만 다음 두 가지는 **이 환경에서 완전 검증이 불가능**하므로, 구현은 하되
최종 보고에서 `Manual Step`으로 분리해 적는다. 통과했다고 쓰지 않는다.

### HB-1. 실기기 검증 불가
v1.2는 "실제 Mobile 환경에서 PC 보기만 제공" 을 요구한다.
이 세션은 컨테이너 안의 Chromium만 쓸 수 있어 **실제 폰 브라우저에서의 동작**은
확인할 수 없다. 390px viewport 에뮬레이션 + `pointer: coarse` 미디어 쿼리로
대체 검증하고, 그 사실을 보고서에 명시한다.

### HB-2. Supabase Auth/RLS 재검증 범위
`qa/portal.mjs` 61항목이 실제 Supabase·실제 RLS로 통과한 이력이 있으나,
샌드박스에서 Chromium이 Supabase로 직접 나가지 못해 `relay.mjs` 경유가 필요하다.
PASS 2에서 새로 만드는 화면이 DB를 새로 읽지 않는다면 재검증 대상이 아니며,
**그 경우 "RLS 재검증함"이라고 쓰지 않는다.**

---

## 4. PASS 2 실행 계획 (우선순위 순)

### P0 — 보존 · 안전 · 정직성

| 항목 | 영역 | 작업 |
|---|---|---|
| P0-1 | 25 | **AI 표현 정직성** — `AI READY` 배지 + "현재: 규칙 기반 · 향후: LLM API" 고지를 AI 라벨이 붙은 화면(대시보드·고객상세·브리핑)에 노출 |
| P0-2 | 04~07 | **Device Preview** — 새 Route 없이 현재 화면에 viewport mode만 적용. 재귀 차단·True Viewport·Escape Path 3중 안전장치 |
| P0-3 | 02 | 폰에서 고객 화면 왕복 경로 확보 |
| P0-4 | — | **회귀 보존** — `npm run qa` 219항목 + vitest 175 + `git diff --quiet lib/scoring/priority.ts` |

### P1 — 발견성 · Story · Theme

| 항목 | 영역 | 작업 |
|---|---|---|
| P1-1 | 16, 17 | **Theme 6종** — `data-palette` 축을 신설하고 `data-theme`(밝기)와 직교시킨다. 기본값은 02 Teal Champagne = **현재 색 그대로** → 기본 상태 시각 변화 0 |
| P1-2 | 14, 15 | **Why AX** — `/why` 신규 12~16 Section. `/intro`(기획의도)는 **한 글자도 건드리지 않는다** |
| P1-3 | 11 | **Presentation Mode** — 실제 Route를 도는 8~12 Step Guided Demo |
| P1-4 | 12 | **첫 사용 Tutorial** — 3~5 Step 짧은 코스 신설. 기존 20 Step은 `전체 둘러보기`로 유지 |
| P1-5 | 09 | `더보기` → Bottom Sheet. `/more` Route는 **삭제하지 않고** 유지 |
| P1-6 | 03 | 공개 화면의 Business 진입점을 Demo/직원 문맥에서만 노출 |

### P2 — Visual Polish

| 항목 | 영역 | 작업 |
|---|---|---|
| P2-1 | 27 | 다크 사이드바 Nav Text를 White 계열로 |
| P2-2 | 30 | 상태 transition을 140~180ms ease-out로 |
| P2-3 | 29 | Hover Coverage **실측** 후 미달분 보강 |
| P2-4 | 28 | Pure White Surface 비중 **실측** |
| P2-5 | 21, 22 | Permission Matrix 표기 · Demo Reset 발견성 |

### 하지 않는 것 (명시적 제외)

- `lib/scoring/priority.ts` 수정 — **잠금**
- `/intro` 기획의도 수정·삭제·대체 — **금지**
- 기존 Route 재배치·삭제·재명명
- 고객 데이터 모델 변경
- 브랜드 Identity(Warm Ivory / Deep Teal / 鼎) 교체
- 의료 표현(치료·환자·진단·처방·의학적 효능) 도입
- 신규 대형 마케팅 기능 / 대량발송 / PG / POS

---

## 5. PASS 2 진입 전 상태 (기준선)

```
vitest        175 pass
lint          0 error
typecheck     clean
build         OK
npm run qa    219 checks pass
qa/portal.mjs  61 checks pass (실 Supabase · 실 RLS)
priority.ts   변경 없음
```

이 기준선이 PASS 2 이후에도 **같거나 늘어난 상태**로 유지되지 않으면
완료로 보고하지 않는다.
