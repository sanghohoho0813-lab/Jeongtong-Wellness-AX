"use client";

import KpiRow from "@/components/dashboard/KpiRow";
import DecisionBand from "@/components/dashboard/DecisionBand";
import TodayHero from "@/components/dashboard/TodayHero";
import QuickActions from "@/components/dashboard/QuickActions";
import FirstRunCard from "@/components/dashboard/FirstRunCard";
import BriefingPreview from "@/components/dashboard/BriefingPreview";
import CustomerInboxCard from "@/components/dashboard/CustomerInboxCard";
import CoachEntryCard from "@/components/dashboard/CoachEntryCard";
import OpportunityCard from "@/components/dashboard/OpportunityCard";
import PassFollowUpCard from "@/components/dashboard/PassFollowUpCard";
import BodyMapCard from "@/components/dashboard/BodyMapCard";
import SegmentCard from "@/components/dashboard/SegmentCard";
import RevisitPreview from "@/components/dashboard/RevisitPreview";
import BranchSummaryCard from "@/components/dashboard/BranchSummaryCard";
import { useStore } from "@/lib/data/store";
import { ChartIcon } from "@/components/ui/icons";
import { Fold } from "@/components/ui/Fold";

export default function DashboardPage() {
  const { customers, visits } = useStore();
  /**
   * 아직 아무것도 쌓이지 않은 상태.
   *
   * 실제 운영을 막 시작하면 이 화면의 카드가 전부 0 이 된다. 그때
   * 빈 카드 일곱 장을 그대로 늘어놓으면 "무엇을 해야 하는지"가 0 들 사이에
   * 묻힌다. 그래서 그때는 시작 안내만 남기고 나머지는 접어 둔다.
   * (고객이 생기고 방문이 한 건이라도 기록되면 원래대로 돌아온다)
   */
  const justStarted = customers.length === 0 || visits.length === 0;

  /*
    머리 띠 + 걸쳐 올린 흰 판 (D-56) — 고객 앱 홈과 같은 첫 화면.
    판의 왼쪽(폰은 위)은 판단 세 칸, 오른쪽(폰은 아래)은 바로가기 네 칸.
  */
  const top = (
    <TodayHero
      panelClassName="lg:grid lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-center"
      panel={
        <>
          <DecisionBand />
          <div className="mx-2 mt-1 border-t border-stone-line px-0.5 pb-1.5 pt-3 lg:mx-0 lg:mt-0 lg:border-l lg:border-t-0 lg:px-4 lg:py-2">
            <QuickActions />
          </div>
        </>
      }
    />
  );

  return (
    <div>
      {/*
        순서에 담은 뜻 — 판단 → 실행 → 근거

        이 화면은 숫자카드 넉 장으로 시작했었다. 아침에 여기 들어오는
        이유는 "몇 명인지" 를 세려는 게 아니라 "오늘 누구를 챙기지" 를
        정하려는 것인데, 숫자가 맨 위에 있으면 그 답이 한 화면 아래로 밀린다.

          판단  머리 띠의 한 문장 + 흰 판의 세 칸
          실행  먼저 챙길 세 분 · AX 코치 한 줄 · 이용권 챙길 분
          근거  판단이 맞는지 확인하는 숫자 (맨 아래, 접혀 있다)

        화면 제목 줄(「대시보드 ⓘ」)은 없앴다. 제목은 머리 띠 맨 윗줄에
        작게 들어가 있고, 그 자리를 오늘의 한 문장이 쓴다.
      */}
      <div className="flex flex-col card-gap">
        {/*
          고객이 남긴 것 — 밖에서 들어온 일이라 오늘 안에 답해야 한다.
          남길 것이 없으면 스스로 숨으므로 자리를 차지하지 않는다.
        */}
        <CustomerInboxCard />
        {top}
        {justStarted ? (
          <>
            {/* 아직 아무것도 없을 때는 시작 안내가 곧 오늘 할 일이다 */}
            <FirstRunCard defaultOpen />
            <div data-tour="dash-kpi">
              <KpiRow />
            </div>
          </>
        ) : (
          <>
            {/*
              넓은 화면에서는 두 칸 — 왼쪽은 먼저 챙길 세 분, 오른쪽은
              AX 코치 한 줄 · 이용권 챙길 분. 폰에서는 그 순서대로 쌓인다.
              (오른쪽이 비면 칸도 사이 간격도 남기지 않는다: empty:hidden)
            */}
            <div className="grid grid-cols-1 card-gap xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] xl:items-start">
              <BriefingPreview />
              <div className="flex min-w-0 flex-col card-gap empty:hidden xl:pt-[2.375rem]">
                <CoachEntryCard />
                <PassFollowUpCard />
              </div>
            </div>
            <div className="rise-stagger grid grid-cols-1 card-gap empty:hidden xl:grid-cols-2">
              <OpportunityCard />
              <RevisitPreview />
            </div>
            {/*
              도입 안내는 '오늘 할 일' 이 아니라 '자리 잡는 법' 이다.
              네 단계를 마치면 스스로 사라진다.
            */}
            <FirstRunCard />

            {/*
              ③ 근거 — 위 판단이 어떤 숫자 위에 서 있는지.
              매일 아침 볼 것은 아니다. 숫자 넉 장 · 부위 그림 · 고객 구성 ·
              지점 현황을 제목 한 줄로 접어 둔다 (대표님: 「글씨가 너무 많으면
              안 돼」). 한 번 편 사람은 다음에도 펴진 채로 본다.
            */}
            <Fold
              id="dash-reference"
              variant="plain"
              icon={<ChartIcon className="h-[1.15rem] w-[1.15rem]" />}
              title="매장 숫자 · 더 보기"
              hint="최근 상담 · 재방문 예정 · 방문 · 매출 숫자, 부위 기록, 고객 구성, 지점 현황"
            >
              <div className="flex flex-col card-gap">
                <div data-tour="dash-kpi">
                  <KpiRow />
                </div>
                <div className="rise-stagger grid grid-cols-1 card-gap xl:grid-cols-2">
                  <BodyMapCard />
                  <div className="flex flex-col card-gap">
                    <SegmentCard />
                    <BranchSummaryCard />
                  </div>
                </div>
              </div>
            </Fold>
          </>
        )}
      </div>
    </div>
  );
}
