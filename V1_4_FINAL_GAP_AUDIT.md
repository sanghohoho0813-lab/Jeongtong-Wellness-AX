# v1.4 FINAL GAP AUDIT — PASS 1

평가: **A** 충족 / **B** 있으나 고도화 필요 / **C** 누락 / **D** 이 회사엔 불필요 / **E** 실제 렌더링 검증 필요

---

## 0. 먼저 밝혀 둘 것 — 기준 문서

`(AX + 플랫폼 전용)미래AI랩_AX_Platform_Unified_Design_Development_System_v1.4.md`
는 **이 저장소에도 이 대화에도 첨부되지 않았다.** 저장소에 있는 것은 v1.2
기준으로 만든 `V1_2_GAP_AUDIT.md` 뿐이다.

그래서 이번 감사는 **지시문 §4~§24 를 v1.4 요구사항으로 삼아** 수행했다.
지시문이 매우 구체적이라(70/30 원칙, Future Menu 5개, Photo Role 10종,
검증 Viewport 6개, P0 목록) 감사에 필요한 기준은 전부 확보되었다.

원문 MD 에만 있고 지시문에 없는 조항이 있다면 이번 감사에서 빠졌을 수 있다.
파일을 주시면 그 부분만 따로 대조하겠다. **이것은 Hard Blocker 가 아니다** —
지시문대로 PASS 2 를 계속 진행했다.

---

## 1. 32영역 대조표

| # | 영역 | 등급 | 실측 근거 / 조치 |
|---|---|---|---|
| 01 | Customer Hero | **B→A** | 히어로가 `moxa.jpg`(제품 정물)였다. 브랜드 히어로가 아니라 제품 사진이었음 → `hero_main.jpg`(케어 장면)로 교체 |
| 02 | Customer Image Density | **C→A** | 공개 첫화면 사진 **2장**뿐이었다(moxa, mugwort). 목표 60~80% 활용 → 12장 중 **8장** 사용 (67%) |
| 03 | Image Sharpness | **E→A** | 받은 자산 1536px. 1920 전체폭이면 25% 확대 → 히어로를 2단으로 짜 사진 폭을 620px 로 제한. 실측으로 확인 |
| 04 | Responsive Image Crop | **B→A** | 폰·PC 가 같은 비율을 쓰고 있었다 → 폰/태블릿/PC 별도 aspect + `object-position` |
| 05 | Photo Role Diversity | **C→A** | 같은 성격의 제품 정물 2장뿐 → 히어로 · 서비스 장면 · 재료 · 고객 경험 · 매장 공간 · MY WELLNESS · 홈케어 · Why AX 3단으로 **역할 분리** |
| 06 | Existing Asset Utilization | **B→A** | `dough.jpg` 가 `/service` 에서만 쓰였다. 실제 제품 3장은 **사실 설명 자리에 그대로 유지** (연출 사진으로 대체하지 않음 — `ASSET_INVENTORY.md` §0) |
| 07 | MY WELLNESS Visual Quality | **B** | 직전 작업에서 개인 대시보드로 이미 정리됨(§3-3 요소 10/10 확인). 이번엔 안내 카드에 `my_wellness.jpg` 만 추가 |
| 08 | Customer / AX Visual Balance | **B→A** | 고객 화면 사진 2 → 8장, AX 화면 사진 0 → 0 (의도적). 밀도 역전 해소 |
| 09 | AX Photo Overuse | **A** | 내부 AX 본문에 사진 **0장**. 늘리지 않음 — v1.4 §4 "AX 는 사진을 늘리지 않는다" |
| 10 | Why AX Current Visual | **C→A** | 도해만 있고 이미지 없음 → `why_ax_current.jpg` |
| 11 | Why AX Improved Visual | **C→A** | → `why_ax_improved.jpg` |
| 12 | Why AX Growth Visual | **C→A** | → `why_ax_growth.jpg` (1774px 가로 배너) |
| 13 | Future Expansion Navigation | **C→A** | **완전 누락**. 5개 신설 |
| 14 | Current / Future Separation | **C→A** | 구분 개념 자체가 없었다 → 배지 · 색 · 문구 3중 구분 |
| 15 | Future Preview Sheet | **C→A** | 신설. 404 없음 |
| 16 | Membership Growth Signal | **C→A** | Future Menu ① |
| 17 | Homecare Growth Signal | **B→A** | 홈케어 TIP 은 있었으나 성장축으로 표현 안 됨 → Future Menu ② |
| 18 | Referral Growth Signal | **B→A** | `ReferralCard` 는 있었으나 미래 표시 없음 → Future Menu ③ + 현재 카드 유지 |
| 19 | Franchise / Branch Growth Signal | **C→A** | Future Menu ④ |
| 20 | Data Asset Growth Signal | **C→A** | Future Menu ⑤ |
| 21 | Customer Navigation 70/30 | **C→A** | 현재 핵심 5(홈·예약·이용권·케어기록·마이페이지) + 미래 5를 **하단 탭 밖** 별도 그룹으로. 하단 탭은 현재 기능만 |
| 22 | Desktop Future Navigation | **C→A** | 공개 첫화면 하단 확장 섹션 + 바닥글 |
| 23 | Mobile Future Navigation | **C→A** | 마이페이지 안 「향후 확장」 그룹 |
| 24 | Customer CTA | **B** | 이미 정리됨(큰 단추 넷 · Sticky 예약바). 유지 |
| 25 | Customer Card Polish | **B** | 직전 작업에서 `h-full`·아이콘 48px 통일 완료. 사진 썸네일만 추가 |
| 26 | Business AX Preservation | **A** | 이번 작업에서 AX 화면 로직 변경 **0건**. `priority.ts` 잠금 유지 |
| 27 | Customer ↔ AX Round-trip | **A** | 직전 작업의 `SurfaceSwitch` 로 완료. 변경 없음 |
| 28 | Tablet 768 / 1024 | **A** | 직전 작업에서 `qa/tablet.mjs` 56건 상시화. 새 이미지가 이 검사를 통과해야 함 |
| 29 | Mobile 390 / 360 | **E** | 390 은 상시 점검 중. **360 은 한 번도 안 봤다** → 이번에 추가 |
| 30 | 404 / Overlay / Preview Regression | **E** | Future Preview 신설이므로 새로 검증 필요 |
| 31 | Existing QA Regression | **A** | 13묶음 420건 통과 상태에서 시작 |
| 32 | Asset Gap | **A** | 12/12 수령. `ASSET_GAP.md` 참조 |

### 집계

| 등급 | 시작 시점 | 목표 |
|---|---|---|
| A | 6 | 28 |
| B | 8 | 4 |
| C | 12 | 0 |
| D | 0 | 0 |
| E | 6 | 0 (실측으로 해소) |

---

## 2. Hard Blocker

**없다.** 승인을 기다리지 않고 PASS 2 를 연속 진행한다.

기록해 둘 제약 둘:

1. **v1.4 원문 MD 미첨부** — 지시문으로 대체. 위 §0.
2. **연출 이미지 / 실제 제품 사진 구분** — 받은 12장은 연출 이미지다.
   실제 시술 구성을 설명하는 자리에는 쓰지 않는다. `ASSET_GAP.md` §2.

---

## 3. PASS 2 계획 (시간 배분은 지시문 §3 대로)

| 배분 | 작업 | 대상 영역 |
|---|---|---|
| **50%** | 고객 Platform 시각 품질 | 01·02·03·04·05·06·07·08·24·25 |
| **25%** | 향후 확장 Navigation | 13~23 |
| **15%** | Why AX 성장 스토리 | 10·11·12 |
| **10%** | v1.4 QA / 회귀 | 28·29·30·31 |

내부 AX(26·09)는 **손대지 않는다.**
