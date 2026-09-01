"use client";

/**
 * 단계별 따라하기 안내(투어)
 * =========================
 * 실제 화면 위에서 순서대로 이동하며 설명한다.
 *  - 설명 대상만 선명하게 남기고, 나머지 화면은 어둡게 + 흐리게 처리한다.
 *  - 대상은 data-tour="..." 표식으로 찾는다 (클래스 변경에 영향받지 않게).
 *  - 화면(경로)이 다르면 먼저 이동한 뒤 대상이 나타날 때까지 기다린다.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { useStore } from "@/lib/data/store";
import { ChevronLeftIcon, ChevronRightIcon, XIcon } from "@/components/ui/icons";

export interface TourStep {
  /** 이 단계를 보여줄 화면 경로 */
  route: string;
  /** 강조할 요소의 data-tour 값 (없으면 화면 전체 안내) */
  target?: string;
  /** 화면 위에 표시할 분류 라벨 (번호는 순서대로 자동 부여) */
  kicker: string;
  title: string;
  body: string;
  /** 한 줄 요령 (선택) */
  tip?: string;
}

/**
 * 세 가지 코스
 * ============
 *
 * 하나로 다 하려다 스무 걸음짜리가 되었다. 그런데 그 스무 걸음은
 *   - 처음 켠 사람에게는 너무 길고 (다섯 번째쯤에서 닫는다)
 *   - 남에게 보여 줄 때는 순서가 안 맞는다 (왜 하는지가 빠져 있다)
 * 서로 다른 세 가지 필요라서, 코스를 셋으로 나눈다. 화면을 옮겨 다니며
 * 실제 자리를 짚는 방식은 셋 다 같고 단계 목록만 다르다.
 *
 *   quick  3~5걸음  처음 켠 날, 오늘 뭘 하면 되는지만
 *   full   전부     기능을 하나씩 익힐 때 (지금까지의 그 투어)
 *   demo   8~12걸음 남에게 보여 줄 때 — 왜 → 무엇을 → 그래서 무엇이 남는가
 */
export type TourMode = "quick" | "full" | "demo";

export const TOUR_LABEL: Record<TourMode, string> = {
  quick: "빠른 시작 안내",
  full: "전체 둘러보기",
  demo: "시연 모드",
};

/**
 * 성과 화면이 아직 비어 있을 때의 한 걸음.
 *
 * 성과 화면은 방문 기록이 5건 모이기 전에는 지표를 그리지 않는다
 * (억지 0% 대신 "이 화면이 채워지려면" 목록을 낸다). 그런데 투어가
 * 그 사실을 모르면, 성과 걸음 다섯 개가 전부 **없는 요소를 4.8초씩
 * 기다리다 빈 안내로 물러난다.** 실제로 실명부(방문 0건)로 바꾼 뒤
 * 그렇게 삭아 있었다 — qa/tour.mjs 가 잡았다.
 *
 * 화면이 정직하게 비어 있으면 투어도 정직하게 그 이유를 짚는 것이
 * 맞다. 특히 시연에서 이 걸음은 약점이 아니라 강점이다 — "기록이
 * 없으면 숫자를 만들지 않는다" 가 이 제품의 핵심 약속이기 때문이다.
 */
const ANALYTICS_EMPTY_STEP: TourStep = {
  route: "/analytics",
  target: "analytics-empty",
  kicker: "AX 도입성과",
  title: "기록이 모이기 전에는 숫자를 그리지 않습니다",
  body: "방문 기록이 5건 모이면 재방문율·월별 추이·매출기회가 여기서 자동으로 계산됩니다. 그 전에는 억지 0%를 보여 주는 대신, 무엇을 하면 채워지는지를 보여 드립니다 — 이 화면의 숫자는 전부 실제 기록에서만 나온다는 뜻입니다.",
};

/** 투어 단계 정의 — 고객 ID와 권한, 쌓인 기록에 따라 구성이 달라진다 */
export function buildTourSteps(
  customerId: string | undefined,
  isManager: boolean,
  analyticsReady: boolean,
): TourStep[] {
  const detail = customerId ? `/customers/${customerId}` : "/customers";

  const adminHead: TourStep[] = [
    {
      route: "/",
      target: "dash-kpi",
      kicker: "대시보드",
      title: "오늘의 운영 상태를 먼저 봅니다",
      body: "오늘 방문, 관리 대상, 신규 고객, 이용권 현황이 한 줄로 요약됩니다. 모두 저장된 기록에서 계산된 값입니다.",
    },
    {
      route: "/",
      target: "dash-briefing",
      kicker: "대시보드",
      title: "오늘 챙길 고객이 여기 나옵니다",
      body: "시스템이 관리 기준에 따라 오늘 연락하거나 안내할 고객을 골라 둡니다. [전체 보기]를 누르면 실행 브리핑으로 넘어갑니다.",
    },
    {
      route: "/briefing",
      target: "briefing-hero",
      kicker: "실행 브리핑",
      title: "처리 현황을 한눈에",
      body: "오늘 과제가 몇 건이고 얼마나 처리했는지 보여 줍니다. 아래 칩으로 처리대기 · 처리완료 · 보류를 나눠 볼 수 있습니다.",
    },
    {
      route: "/briefing",
      target: "task-card",
      kicker: "실행 브리핑",
      title: "왜 · 무엇을 해야 하는지 함께 나옵니다",
      body: "고객 이름 아래에 판단 이유와 권장 행동이 같이 표시됩니다. 처리했으면 [처리완료], 나중에 다시 볼 일이면 [보류]를 누르세요.",
      tip: "처리완료를 누르면 바로 사라지지 않고 결과 입력창이 먼저 열립니다.",
    },
  ];

  const customerSteps: TourStep[] = [
    {
      route: "/customers",
      target: "quick-search",
      kicker: "어디서나",
      title: "여기 하나로 다 됩니다",
      body: "고객 찾기 · 화면 이동 · 자주 쓰는 동작이 한 창에 있습니다. 고객 줄 오른쪽의 [방문 기록]을 누르면 화면을 옮기지 않고 그 자리에서 기록할 수 있습니다.",
      tip: "Ctrl(⌘)+K 로도 열립니다 · 초성으로도 찾습니다 — 홍길동은 ㅎㄱㄷ",
    },
    {
      route: "/customers",
      target: "customer-tiles",
      kicker: "고객",
      title: "상태 타일을 눌러 바로 걸러 봅니다",
      body: "전체 · 신규 · 활성 · 관리 필요 · 장기 미방문으로 나뉘어 있고, 타일을 누르면 그 상태의 고객만 보입니다.",
    },
    {
      route: "/customers",
      target: "customer-row",
      kicker: "고객",
      title: "관리가 필요한 고객이 위로 옵니다",
      body: "이름 옆에 고객 상태와 AI 추천 등급이 함께 표시되고, 그 아래에 그렇게 판단한 첫 번째 이유가 나옵니다.",
    },
    {
      route: detail,
      target: "ax-insight",
      kicker: "고객 상세",
      title: "이 고객의 현재 상태 요약",
      body: "왜 관리 대상인지(또는 왜 정상인지)를 문장으로 보여 줍니다. → 로 시작하는 줄이 권장 행동입니다.",
    },
    {
      route: detail,
      target: "next-manage",
      kicker: "고객 상세",
      title: "다음 관리 예정일은 눌러서 정합니다",
      body: "[날짜 · 시간 선택]을 누르면 빠른 선택 · 달력 · 오전/오후 · 시 · 분이 차례로 나옵니다. 타자로 칠 일이 없습니다.",
      tip: "AI 추천일은 그 고객의 평균 이용주기로 계산한 날짜입니다.",
    },
    {
      route: detail,
      target: "body-map",
      kicker: "고객 상세",
      title: "집중 케어 부위는 그림에서 고릅니다",
      body: "여기 표시된 부위는 고객이 평소 원하시는 부위입니다. 방문마다 실제 관리한 부위는 아래 이력에 회차별로 따로 쌓입니다.",
    },
    {
      route: detail,
      target: "care-pref",
      kicker: "고객 상세",
      title: "케어 선호는 클릭만으로 기록합니다",
      body: "[기록 추가] → 분류(온도 · 강도 · 자세 …)를 고르면 자주 쓰는 문구가 아래에 펼쳐집니다. 여러 개를 골라 한 번에 저장할 수 있습니다.",
      tip: "중요한 항목은 [고정]해 두면 다음 방문 기록 때 먼저 확인됩니다.",
    },
    {
      route: detail,
      target: "memberships",
      kicker: "고객 상세",
      title: "이용권은 여기서 팔고 관리합니다",
      body: "[이용권 등록]을 누르면 자주 판매하는 구성이 먼저 나옵니다. 하나만 고르면 프로그램 · 횟수 · 금액이 한 번에 채워집니다.",
      tip: "잔여가 적거나 다 쓴 이용권에는 재구매 상담 안내가 함께 표시됩니다.",
    },
    {
      route: detail,
      target: "care-report",
      kicker: "고객 상세",
      title: "고객과 함께 보는 한 장",
      body: "지금까지 얼마나 이용하셨고 어디를 관리해 왔는지가 한 장으로 정리됩니다. 화면으로 함께 보거나 종이로 뽑아 드릴 수 있습니다.",
      tip: "재등록 안내가 권유가 아니라 확인이 됩니다",
    },
    {
      route: detail,
      target: "visit-record",
      kicker: "고객 상세",
      title: "방문은 이 버튼 하나로 기록합니다",
      body: "프로그램 · 이용권 차감 · 케어 부위 · 반응 · 다음 관리 예정일을 한 화면에서 입력합니다. 저장하면 이력과 브리핑까지 함께 갱신됩니다.",
    },
  ];

  const analyticsSteps: TourStep[] = [
    {
      route: "/analytics",
      target: "analytics-kpi",
      kicker: "AX 도입성과",
      title: "쌓인 기록이 성과로 보입니다",
      body: "방문 · 신규 고객 · 재방문율 · 과제 처리 현황이 기간별로 계산됩니다. 여기 숫자는 모두 실제 저장된 기록에서 나옵니다.",
    },
    {
      route: "/analytics",
      target: "analytics-trend",
      kicker: "AX 도입성과",
      title: "달별 흐름은 이렇게 읽습니다",
      body: "막대가 없는 달은 값이 0인 달입니다. 이번 달은 아직 끝나지 않아 옅게 칠하고 '진행 중'이라고 적습니다 — 줄어든 것이 아닙니다.",
      tip: "막대를 짚으면 값이 뜨고, [표로 보기]로 숫자만 볼 수도 있습니다",
    },
    {
      route: "/analytics",
      target: "analytics-opportunity",
      kicker: "AX 도입성과",
      title: "관리가 매출로 이어졌는지 셉니다",
      body: "매출기회 대상 → 직원이 실제 관리 → 재방문 예정 확보 → 이용권 재등록 → 실제 재방문 확인 순으로 이어집니다. 전환율이나 예상 매출을 추정하지는 않습니다.",
    },
    {
      route: "/analytics",
      target: "analytics-program",
      kicker: "AX 도입성과",
      title: "어떤 프로그램이 다음 방문으로 이어졌나",
      body: "프로그램별로 이용 뒤에 다시 오신 분이 몇 명인지 셉니다. 프로그램이 원인이라는 뜻은 아니고, 무엇을 권할지 정할 때 볼 근거입니다.",
    },
    {
      route: "/analytics",
      target: "analytics-staff",
      kicker: "AX 도입성과",
      title: "누가 얼마나 관리했는지 봅니다",
      body: "실행 브리핑에서 과제를 처리한 기록을 담당자별로 셉니다. 순위를 매기려는 것이 아니라, 관리가 한쪽으로 몰려 있지 않은지 확인하기 위한 것입니다.",
    },
  ];

  const adminTail: TourStep[] = [
    ...(analyticsReady ? analyticsSteps : [ANALYTICS_EMPTY_STEP]),
    {
      route: "/settings",
      target: "settings-data",
      kicker: "설정",
      title: "명부를 옮기고, 백업으로 되돌립니다",
      body: "쓰던 엑셀 명부를 한 번에 올릴 수 있고, 받아 둔 백업으로 되돌릴 수도 있습니다. 어느 쪽이든 무엇이 들어오는지 먼저 보여 드린 뒤 반영합니다.",
      tip: "기록은 이 기기에만 저장됩니다 — 주 1회 전체 백업을 권합니다",
    },
  ];

  return isManager
    ? [...adminHead, ...customerSteps, ...adminTail]
    : customerSteps;
}

/**
 * 빠른 시작 — 처음 켠 날 4걸음.
 *
 * 처음 오신 분이 알아야 할 것은 기능 목록이 아니라 **하루의 순서**다.
 * 오늘 누구를 챙기는지 보고 → 그 사람을 열고 → 기록하고 → 그 판단
 * 기준이 내 것임을 안다. 이 넷이면 다음 날부터 혼자 쓸 수 있다.
 */
function buildQuickSteps(
  customerId: string | undefined,
  isManager: boolean,
): TourStep[] {
  const detail = customerId ? `/customers/${customerId}` : "/customers";

  if (!isManager) {
    return [
      {
        route: "/customers",
        target: "customer-tiles",
        kicker: "1 / 3",
        title: "여기가 직원 계정의 일하는 자리입니다",
        body: "위쪽 상태를 누르면 그 상태의 고객만 걸러 보실 수 있습니다. 관리가 필요한 분이 위로 올라옵니다.",
      },
      {
        route: "/customers",
        target: "quick-search",
        kicker: "2 / 3",
        title: "이름 · 초성 · 번호로 바로 찾습니다",
        body: "'ㄱㅎㅅ' 처럼 초성만 쳐도 찾아집니다. 찾은 자리에서 바로 기록까지 이어집니다.",
        tip: "PC 에서는 Ctrl(⌘) + K 로도 열립니다",
      },
      {
        route: detail,
        target: "visit-record",
        kicker: "3 / 3",
        title: "방문은 이 버튼 하나로 남깁니다",
        body: "오신 날짜와 봐 드린 부위를 그 자리에서 적습니다. 이용권은 자동으로 한 번 차감됩니다.",
      },
    ];
  }

  return [
    {
      route: "/",
      target: "dash-briefing",
      kicker: "1 / 4",
      title: "오늘 챙길 분부터 보시면 됩니다",
      body: "매장이 정한 기준에 걸린 고객을 시스템이 미리 골라 둡니다. 아침에 이 칸만 보셔도 그날 할 일이 정해집니다.",
    },
    {
      route: "/customers",
      target: "customer-tiles",
      kicker: "2 / 4",
      title: "관리가 필요한 분이 위로 올라옵니다",
      body: "이름순이 아니라 챙겨야 하는 순서로 늘어놓습니다. 위쪽 상태를 누르면 그 상태만 걸러 보실 수 있습니다.",
    },
    {
      route: detail,
      target: "visit-record",
      kicker: "3 / 4",
      title: "방문은 이 버튼 하나로 남깁니다",
      body: "오신 날짜와 봐 드린 부위를 그 자리에서 적습니다. 이용권은 자동으로 한 번 차감되고, 고객 화면의 남은 횟수도 같이 줄어듭니다.",
      tip: "폰에서는 화면 아래 가운데 [기록] 버튼이 어디서든 열립니다",
    },
    {
      route: "/settings",
      target: "settings-rules",
      kicker: "4 / 4",
      title: "그 순서를 정하는 건 시스템이 아니라 매장입니다",
      body: "관리주기 · 장기 미방문 기준 · 잔여 회차 기준을 여기서 바꾸시면, 위에서 본 목록이 그대로 따라 바뀝니다. 바꾸기 전에 몇 명이 움직이는지 미리 보여 드립니다.",
    },
  ];
}

/**
 * 시연 — 남에게 보여 줄 때 10걸음.
 *
 * 순서를 기능 순서가 아니라 **이야기 순서**로 짠다.
 *   왜 하는가 → 오늘의 상태 → 판단 → 실행 → 그 판단의 근거 →
 *   고객 쪽에 어떻게 닿는가 → 실제로 남은 결과 → 기준은 누가 정하는가
 *
 * 모든 걸음이 (staff) 안의 실제 화면이다. 슬라이드가 아니다.
 * 그룹 밖(/welcome 같은 곳)으로 나가면 이 투어를 붙들고 있는 껍데기가
 * 통째로 사라지므로, 고객 화면은 게이트 안쪽의 미리보기로 보여 준다.
 */
function buildDemoSteps(
  customerId: string | undefined,
  analyticsReady: boolean,
): TourStep[] {
  const detail = customerId ? `/customers/${customerId}` : "/customers";
  const preview = customerId
    ? `/customers/${customerId}/preview`
    : "/customers";

  return [
    {
      route: "/why",
      kicker: "1 / 10 · 왜",
      title: "먼저, 무엇을 풀려는 일인지",
      body: "이 매장이 새고 있던 자리는 넷입니다 — 뜸해진 분을 놓치고, 이용권이 조용히 끝나고, 상담만 하고 끝나고, 해 드린 것이 남지 않는 것. 전부 새 고객 문제가 아니라 이미 오셨던 분을 다시 만나는 문제입니다.",
    },
    {
      route: "/",
      target: "dash-kpi",
      kicker: "2 / 10 · 상태",
      title: "오늘의 운영 상태",
      body: "오늘 방문 · 관리 대상 · 신규 · 이용권 현황. 전부 저장된 기록에서 계산한 값이고, 만들어 낸 숫자는 없습니다.",
    },
    {
      route: "/",
      target: "dash-briefing",
      kicker: "3 / 10 · 판단",
      title: "오늘 챙길 고객을 골라 둡니다",
      body: "200명을 다 볼 수는 없습니다. 오늘 실제로 손이 가야 할 분만 위로 올립니다.",
    },
    {
      route: "/briefing",
      target: "briefing-hero",
      kicker: "4 / 10 · 실행",
      title: "판단이 그날의 할 일이 됩니다",
      body: "연락하고 나면 처리로 표시합니다. 처리한 것과 아직 남은 것이 나뉘어 보여서, 바쁜 날에도 건너뛰지 않습니다.",
      tip: "이 화면은 그대로 인쇄해서 들고 다니실 수 있습니다",
    },
    {
      route: "/customers",
      target: "customer-tiles",
      kicker: "5 / 10 · 순서",
      title: "목록이 아니라 순서입니다",
      body: "이름순으로 늘어놓으면 누가 급한지는 열어 봐야 압니다. 여기서는 챙겨야 하는 순서로 옵니다.",
    },
    {
      route: detail,
      target: "ax-insight",
      kicker: "6 / 10 · 근거",
      title: "왜 이분이 위에 있는지가 함께 나옵니다",
      body: "결론만 주면 쓰는 사람이 판단할 수가 없습니다. 마지막 방문 이후 경과일 · 평균 이용 간격 · 잔여 회차 같은 근거를 같이 적습니다.",
      tip: "AI READY 를 누르면 지금 무엇으로 계산하는지 그대로 나옵니다",
    },
    {
      route: detail,
      target: "next-manage",
      kicker: "7 / 10 · 다리",
      title: "여기서 정한 날짜가 고객에게 그대로 갑니다",
      body: "다음 관리 예정일을 바꾸면 고객 화면의 '다음 방문 예정'이 같이 바뀝니다. 같은 사실을 두 군데에 따로 저장하지 않습니다.",
    },
    {
      route: preview,
      kicker: "8 / 10 · 고객 쪽",
      title: "고객이 보는 화면은 이렇습니다",
      body: "고객은 셋만 봅니다 — 다음에 언제 가는지, 몇 번 남았는지, 저번에 어디를 봐 드렸는지. 매장이 쓰는 내부 분류는 여기 나오지 않습니다.",
      tip: "직원 화면 안에서 그려 보는 것입니다 — 고객으로 로그인한 것이 아닙니다",
    },
    /*
      성과가 아직 비어 있으면 빈 화면을 정직하게 짚는다. 시연에서 이건
      약점이 아니다 — "기록이 없으면 숫자를 만들지 않는다" 는 것이야말로
      정책기관 앞에서 가장 힘 있는 말이다.
    */
    analyticsReady
      ? {
          route: "/analytics",
          target: "analytics-opportunity",
          kicker: "9 / 10 · 결과",
          title: "관리한 것이 실제 매출로 이어졌는지",
          body: "예상 매출을 만들어 보여 주지 않습니다. 실제로 일어난 재등록만 셉니다. 그래야 이 숫자를 그대로 가지고 나가실 수 있습니다.",
        }
      : {
          route: "/analytics",
          target: "analytics-empty",
          kicker: "9 / 10 · 결과",
          title: "기록이 없으면 숫자를 만들지 않습니다",
          body: "성과 화면은 방문 기록이 5건 모여야 열립니다. 그 전에는 억지 0%나 예상 매출을 그리는 대신 이렇게 비워 둡니다 — 여기서 보시게 될 모든 숫자가 실제 기록에서만 나온다는 뜻입니다.",
        },
    {
      route: "/settings",
      target: "settings-rules",
      kicker: "10 / 10 · 기준",
      title: "그리고 그 기준은 매장이 정합니다",
      body: "관리주기 · 장기 미방문 · 잔여 회차 기준을 직접 바꾸시면 앞의 모든 화면이 따라 바뀝니다. 시스템이 정해 준 기준을 따르는 것이 아니라, 원장님의 기준을 시스템이 대신 지켜 보는 구조입니다.",
    },
  ];
}

// ---------- Context ----------

const TourContext = createContext<{
  /** 코스를 골라 시작한다 (기본은 전체 둘러보기 — 기존 호출부 호환) */
  startTour: (mode?: TourMode) => void;
} | null>(null);

export function useTour() {
  const ctx = useContext(TourContext);
  if (!ctx) throw new Error("useTour must be used within TourProvider");
  return ctx;
}

const PAD = 10;

/**
 * 표식이 붙은 요소를 찾는다.
 *
 * 같은 표식이 PC용과 모바일용에 함께 붙어 있는 경우가 있다(예: 고객 빠른 찾기).
 * 그중 지금 화면에 실제로 보이는 쪽을 골라야 엉뚱한 자리를 비추지 않는다.
 */
function findTourTarget(name: string | undefined): Element | null {
  if (!name) return null;
  const all = [...document.querySelectorAll(`[data-tour="${name}"]`)];
  return (
    all.find((el) => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    }) ?? null
  );
}

interface Box {
  top: number;
  left: number;
  width: number;
  height: number;
}

export function TourProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { customers, visits, isManager } = useStore();
  const [active, setActive] = useState(false);
  const [mode, setMode] = useState<TourMode>("full");
  const [index, setIndex] = useState(0);
  const [box, setBox] = useState<Box | null>(null);
  const [ready, setReady] = useState(false);
  const timers = useRef<number[]>([]);

  const steps = useMemo(() => {
    const id = customers[0]?.id;
    /*
      성과 화면과 같은 문턱(방문 기록 5건)을 본다. 문턱이 어긋나면
      투어가 없는 요소를 비추려다 빈 안내로 물러난다.
      (app/(staff)/analytics/page.tsx 의 visitCount < 5 와 짝)
    */
    const analyticsReady =
      visits.filter((v) => v.type === "visit").length >= 5;
    if (mode === "quick") return buildQuickSteps(id, isManager);
    /*
      시연은 매출·성과 화면을 지난다. 직원 계정에는 그 화면이 없으므로
      (RouteGuard 가 고객 목록으로 되돌린다) 시연을 열어 주지 않는다 —
      중간에 튕겨 나가는 것보다 아예 없는 편이 낫다.
    */
    if (mode === "demo" && isManager) return buildDemoSteps(id, analyticsReady);
    return buildTourSteps(id, isManager, analyticsReady);
  }, [customers, visits, isManager, mode]);
  const step = steps[index];

  const clearTimers = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  };

  const startTour = useCallback((next: TourMode = "full") => {
    setMode(next);
    setIndex(0);
    setBox(null);
    setReady(false);
    setActive(true);
  }, []);

  const stop = useCallback(() => {
    clearTimers();
    setActive(false);
    setBox(null);
  }, []);

  // 단계 이동: 필요한 화면으로 먼저 이동한 뒤 대상 요소를 찾는다
  useEffect(() => {
    if (!active || !step) return;
    clearTimers();
    setReady(false);

    if (pathname !== step.route) {
      setBox(null);
      router.push(step.route);
      return;
    }

    if (!step.target) {
      setBox(null);
      setReady(true);
      return;
    }

    let tries = 0;
    const measure = (el: Element) => {
      const r = el.getBoundingClientRect();
      setBox({ top: r.top, left: r.left, width: r.width, height: r.height });
      setReady(true);
    };

    const find = () => {
      const el = findTourTarget(step.target);
      if (el) {
        // 대상을 화면 위쪽에 붙여 아래쪽에 설명 카드 자리를 남긴다
        const r = el.getBoundingClientRect();
        const target = window.scrollY + r.top - 96;
        window.scrollTo({ top: Math.max(0, target), behavior: "smooth" });
        timers.current.push(window.setTimeout(() => measure(el), 480));
        return;
      }
      if (tries++ < 40) timers.current.push(window.setTimeout(find, 120));
      else {
        /*
          못 찾으면 화면 전체 안내로 물러난다. 이때 box 를 지워야 한다 —
          같은 화면 안에서 다음 걸음으로 넘어온 경우 box 에는 **직전
          걸음의 자리**가 남아 있어서, 지우지 않으면 엉뚱한 요소를
          비춘 채 다음 설명을 읽게 된다. 실제로 그랬다.
        */
        setBox(null);
        setReady(true);
      }
    };
    find();

    return clearTimers;
  }, [active, index, pathname, step, router]);

  // 스크롤 · 리사이즈 시 강조 영역 재계산
  useEffect(() => {
    if (!active || !step?.target) return;
    const update = () => {
      const el = findTourTarget(step.target);
      if (!el) return;
      const r = el.getBoundingClientRect();
      setBox({ top: r.top, left: r.left, width: r.width, height: r.height });
    };
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [active, step]);

  // 키보드 조작
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") stop();
      if (e.key === "ArrowRight")
        setIndex((i) => (i < steps.length - 1 ? i + 1 : i));
      if (e.key === "ArrowLeft") setIndex((i) => (i > 0 ? i - 1 : i));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, steps.length, stop]);

  return (
    <TourContext.Provider value={{ startTour }}>
      {children}
      {active && step && (
        <TourOverlay
          step={step}
          mode={mode}
          index={index}
          total={steps.length}
          box={box}
          ready={ready}
          onPrev={() => setIndex((i) => Math.max(0, i - 1))}
          onNext={() =>
            index >= steps.length - 1 ? stop() : setIndex((i) => i + 1)
          }
          onClose={stop}
        />
      )}
    </TourContext.Provider>
  );
}

// ---------- Overlay ----------

const DIM = "fixed bg-deep-950/60 backdrop-blur-[3px] transition-all duration-300";

function TourOverlay({
  step,
  mode,
  index,
  total,
  box,
  ready,
  onPrev,
  onNext,
  onClose,
}: {
  step: TourStep;
  mode: TourMode;
  index: number;
  total: number;
  box: Box | null;
  ready: boolean;
  onPrev: () => void;
  onNext: () => void;
  onClose: () => void;
}) {
  const [vw, setVw] = useState(0);
  const [vh, setVh] = useState(0);

  useEffect(() => {
    const set = () => {
      setVw(window.innerWidth);
      setVh(window.innerHeight);
    };
    set();
    window.addEventListener("resize", set);
    return () => window.removeEventListener("resize", set);
  }, []);

  const rawSpot =
    box && box.width > 0
      ? {
          top: Math.max(0, box.top - PAD),
          left: Math.max(0, box.left - PAD),
          width: box.width + PAD * 2,
          height: box.height + PAD * 2,
        }
      : null;

  const isNarrow = vw > 0 && vw < 640;
  const cardRef = useRef<HTMLDivElement>(null);
  const [cardSize, setCardSize] = useState({ w: 420, h: 280 });

  useLayoutEffect(() => {
    if (!cardRef.current) return;
    const r = cardRef.current.getBoundingClientRect();
    setCardSize({ w: r.width, h: r.height });
  }, [step, vw, vh]);

  /**
   * 강조 영역이 화면을 거의 다 채우면 설명 카드가 겹칠 수밖에 없다.
   * 이럴 때는 위쪽 일부만 밝게 남기고 아래를 비워 카드 자리를 만든다.
   */
  const spot = (() => {
    if (!rawSpot || vh === 0) return rawSpot;
    const maxH = vh - cardSize.h - 34 - rawSpot.top;
    if (maxH > 140 && rawSpot.height > maxH) {
      return { ...rawSpot, height: maxH };
    }
    return rawSpot;
  })();

  /**
   * 설명 카드 위치 — 강조 영역을 가리지 않는 자리를 찾는다.
   * 아래 → 위 → 오른쪽 → 왼쪽 순으로 공간을 확인하고, 모두 부족하면 하단 고정.
   */
  const GAP = 14;
  const clampX = (x: number) =>
    Math.min(Math.max(16, x), Math.max(16, vw - cardSize.w - 16));
  const clampY = (y: number) =>
    Math.min(Math.max(16, y), Math.max(16, vh - cardSize.h - 16));

  let pos: { top: number; left: number } | null = null;
  if (spot && vw > 0) {
    const below = vh - (spot.top + spot.height);
    const above = spot.top;
    const right = vw - (spot.left + spot.width);
    const left = spot.left;
    const needH = cardSize.h + GAP * 2;
    const needW = cardSize.w + GAP * 2;

    if (below >= needH) {
      pos = { top: spot.top + spot.height + GAP, left: clampX(spot.left) };
    } else if (above >= needH) {
      pos = { top: spot.top - cardSize.h - GAP, left: clampX(spot.left) };
    } else if (!isNarrow && right >= needW) {
      pos = { top: clampY(spot.top), left: spot.left + spot.width + GAP };
    } else if (!isNarrow && left >= needW) {
      pos = { top: clampY(spot.top), left: spot.left - cardSize.w - GAP };
    }
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-[70]">
      {/* 화면 가리개 — 강조 영역만 남기고 어둡게 + 뿌옇게 */}
      {spot ? (
        <>
          <div
            className={`${DIM} pointer-events-auto`}
            style={{ top: 0, left: 0, width: vw, height: spot.top }}
          />
          <div
            className={`${DIM} pointer-events-auto`}
            style={{
              top: spot.top + spot.height,
              left: 0,
              width: vw,
              height: Math.max(0, vh - spot.top - spot.height),
            }}
          />
          <div
            className={`${DIM} pointer-events-auto`}
            style={{
              top: spot.top,
              left: 0,
              width: spot.left,
              height: spot.height,
            }}
          />
          <div
            className={`${DIM} pointer-events-auto`}
            style={{
              top: spot.top,
              left: spot.left + spot.width,
              width: Math.max(0, vw - spot.left - spot.width),
              height: spot.height,
            }}
          />
          {/* 강조 테두리 */}
          <div
            className="pointer-events-none fixed rounded-card-lg ring-[3px] ring-aqua-400 transition-all duration-300"
            style={{
              top: spot.top,
              left: spot.left,
              width: spot.width,
              height: spot.height,
              boxShadow:
                "0 0 0 2px rgba(255,255,255,0.35), 0 0 34px 6px rgba(42,179,175,0.45)",
            }}
          />
        </>
      ) : (
        <div className={`${DIM} pointer-events-auto inset-0`} />
      )}

      {/* 설명 카드 — 강조 영역을 피해 배치, 자리가 없으면 하단 고정 */}
      <div
        ref={cardRef}
        data-tour-card
        className={`pointer-events-auto fixed w-[min(26rem,calc(100vw-1.5rem))] ${
          pos
            ? ""
            : "inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] sm:inset-x-auto sm:bottom-8 sm:left-1/2 sm:-translate-x-1/2"
        }`}
        style={pos ? { top: pos.top, left: pos.left } : undefined}
      >
        <div className="rise-in overflow-hidden rounded-card-lg bg-card shadow-float ring-1 ring-black/[0.06] dark:ring-white/10">
          <div className="flex items-center justify-between gap-2 bg-gradient-to-r from-deep-800 to-deep-700 px-4 py-2.5">
            {/*
              어느 코스를 도는 중인지 적는다. 시연 모드는 남 앞에서 켜는
              것이라 "지금 안내를 켜 둔 상태" 임이 화면에 보여야 한다.
            */}
            <p className="nowrap-num min-w-0 truncate text-[0.8125rem] font-extrabold uppercase tracking-wider text-aqua-300">
              {TOUR_LABEL[mode]} · {step.kicker}
            </p>
            <div className="flex shrink-0 items-center gap-2">
              <span className="nowrap-num rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-bold text-white">
                {index + 1} / {total}
              </span>
              <button
                onClick={onClose}
                aria-label="안내 닫기"
                className="flex h-7 w-7 items-center justify-center rounded-full text-deep-sub transition-colors hover:bg-white/10 hover:text-white"
              >
                <XIcon className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="px-4 py-4">
            <p className="text-[1.1875rem] font-extrabold leading-snug text-ink">
              {step.title}
            </p>
            {/*
              본문 15px → 16px, 단추도 한 뼘 키웠다. 이 카드를 읽는
              분들이 이 앱에서 가장 눈이 어두운 분들이다 — 안내문이
              본문보다 작으면 안내가 아니다.
            */}
            <p className="mt-2 text-[1rem] leading-[1.75] text-ink-soft">
              {step.body}
            </p>
            {step.tip && (
              <p className="mt-2.5 rounded-btn border-l-[3px] border-gold bg-gold-soft/60 px-3 py-2 text-[0.875rem] leading-relaxed text-ink-soft">
                {step.tip}
              </p>
            )}
            {!ready && (
              <p className="mt-2.5 text-[0.8125rem] font-bold text-ink-faint">
                화면을 여는 중입니다…
              </p>
            )}

            <div className="mt-4 flex items-center gap-2">
              <button
                onClick={onPrev}
                disabled={index === 0}
                className="touch-target flex items-center gap-1 rounded-btn px-3 py-2 text-[0.9375rem] font-bold text-ink-sub transition-colors hover:bg-stone-bg disabled:opacity-40"
              >
                <ChevronLeftIcon className="h-4 w-4" />
                이전
              </button>
              <button
                onClick={onClose}
                className="touch-target rounded-btn px-3 py-2 text-[0.9375rem] font-bold text-ink-faint transition-colors hover:text-ink-sub"
              >
                그만보기
              </button>
              <button
                onClick={onNext}
                className="touch-target ml-auto flex items-center gap-1.5 rounded-btn bg-gradient-to-b from-aqua-650 to-aqua-850 px-6 py-2.5 text-[1.0625rem] font-extrabold text-white shadow-[0_2px_8px_rgba(14,127,125,0.35)] transition-colors hover:from-aqua-850 hover:to-deep-700"
              >
                {index >= total - 1 ? "안내 마치기" : "다음"}
                {index < total - 1 && <ChevronRightIcon className="h-4 w-4" />}
              </button>
            </div>

            {/* 진행 막대 */}
            <div className="mt-3 h-1 overflow-hidden rounded-full bg-stone-bg-deep">
              <div
                className="h-full rounded-full bg-gradient-to-r from-aqua-400 to-deep-700 transition-all duration-300"
                style={{ width: `${((index + 1) / total) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
