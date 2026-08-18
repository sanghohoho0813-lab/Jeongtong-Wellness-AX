# 정통대왕쑥뜸원 Wellness AX Platform

웰니스 매장 운영을 위한 AX(AI Transformation) 운영 플랫폼 1차 구축본.

## 기술 스택

- Next.js 14 (App Router) + TypeScript
- Tailwind CSS (Stone Gray + Aqua 디자인 토큰)
- 데이터: 현재 mock seed + localStorage (Supabase 연동을 고려한 구조 분리)
- Vercel 배포 가능 구조

## 실행

```bash
npm install
npm run dev    # 개발
npm run build && npm run start  # 프로덕션
```

## 구조

```
app/                  페이지 (대시보드, 브리핑, 고객, 방문기록, 재방문, AX성과, 지점, 설정)
components/
  layout/             사이드바(PC) · 하단 네비(모바일) · AppShell
  dashboard/          대시보드 카드
  briefing/           실행 브리핑 TaskCard
  customers/          고객 등록 폼
  visits/             방문/상담 기록 폼
  body-map/           신체부위 선택 Body Map (앞면/뒷면 SVG)
  ui/                 공용 UI (Card, Button, Badge, Modal, 아이콘)
lib/
  types/              도메인 타입 (HQ→Branch→Staff→Customer→Visit, branchId 포함)
  scoring/            Priority Score 엔진 · 지표 계산
    priority.ts       calculateCustomerPriority(), generateDailyBriefing()
    metrics.ts        대시보드/AX성과 지표
  data/
    mock/seed.ts      샘플 데이터 (오늘 기준 상대 날짜 생성)
    store.tsx         앱 스토어 (Context + localStorage, Supabase 교체 지점)
  utils/              날짜/포맷 유틸
```

## 핵심 AX 로직

`lib/scoring/priority.ts` — 규칙 기반 Priority Score:
재방문 예정일 도래/경과, 평균 방문주기 초과, 장기 미방문, 이용권 잔여 임박/소진,
신규 후속관리, 상담 후 미예약 등을 가중치로 합산해 고객별 점수·근거·실행 과제를 생성.
기준값은 설정 > 고객관리 기준에서 조정되며 즉시 반영된다.

## 참고

- 본 시스템은 의료기관용 EMR이 아니며, 고객/상담/방문/케어 등 웰니스 표현을 사용한다.
- 샘플 데이터는 데모용 가상 데이터이다.
