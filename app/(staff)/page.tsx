"use client";

import PageHeader from "@/components/layout/PageHeader";
import KpiRow from "@/components/dashboard/KpiRow";
import DecisionBand from "@/components/dashboard/DecisionBand";
import FirstRunCard from "@/components/dashboard/FirstRunCard";
import BriefingPreview from "@/components/dashboard/BriefingPreview";
import CustomerInboxCard from "@/components/dashboard/CustomerInboxCard";
import CoachEntryCard from "@/components/dashboard/CoachEntryCard";
import OpportunityCard from "@/components/dashboard/OpportunityCard";
import BodyMapCard from "@/components/dashboard/BodyMapCard";
import SegmentCard from "@/components/dashboard/SegmentCard";
import RevisitPreview from "@/components/dashboard/RevisitPreview";
import BranchSummaryCard from "@/components/dashboard/BranchSummaryCard";
import { useStore } from "@/lib/data/store";
import { SectionRule } from "@/components/ui";

export default function DashboardPage() {
  const { settings, customers, visits } = useStore();
  /**
   * 아직 아무것도 쌓이지 않은 상태.
   *
   * 실제 운영을 막 시작하면 이 화면의 카드가 전부 0 이 된다. 그때
   * 빈 카드 일곱 장을 그대로 늘어놓으면 "무엇을 해야 하는지"가 0 들 사이에
   * 묻힌다. 그래서 그때는 시작 안내만 남기고 나머지는 접어 둔다.
   * (고객이 생기고 방문이 한 건이라도 기록되면 원래대로 돌아온다)
   */
  const justStarted = customers.length === 0 || visits.length === 0;

  return (
    <div>
      {/* 날짜는 위(폰)·왼쪽(PC)의 실시간 시계가 이미 보여 준다 — 여기서 또 쓰지 않는다 */}
      <PageHeader
        title="대시보드"
        description={`${settings.companyName} ${settings.branchName}`}
      />
      {/*
        순서에 담은 뜻 — 판단 → 실행 → 근거

        이 화면은 숫자카드 넉 장으로 시작했었다. 아침에 여기 들어오는
        이유는 "몇 명인지" 를 세려는 게 아니라 "오늘 누구를 챙기지" 를
        정하려는 것인데, 숫자가 맨 위에 있으면 그 답이 한 화면 아래로 밀린다.

        그래서 세 층으로 나눈다.

          판단  오늘 봐야 할 것 셋 — 숫자 · 그렇게 본 이유 · 갈 곳
          실행  그 판단을 오늘 처리하는 자리
          근거  판단이 맞는지 확인하는 숫자 (여기부터는 훑고 지나간다)

        층 사이는 카드가 아니라 눈썹 글자와 선 하나로 가른다. 카드를 하나
        더 만들면 그만큼 첫 화면이 밀리기 때문이다.
      */}
      <div className="flex flex-col card-gap">
        {/*
          고객이 남긴 것 — 밖에서 들어온 일이라 오늘 안에 답해야 한다.
          남길 것이 없으면 스스로 숨으므로 자리를 차지하지 않는다.
        */}
        <CustomerInboxCard />
        {justStarted ? (
          <>
            {/* 아직 아무것도 없을 때는 시작 안내가 곧 오늘 할 일이다 */}
            <FirstRunCard />
            <div data-tour="dash-kpi">
              <KpiRow />
            </div>
          </>
        ) : (
          <>
            {/*
              ① 판단 — 오늘 무엇을 봐야 하는가
              숫자 · 그렇게 본 이유 · 지금 갈 곳이 한 칸에 함께 있다.
            */}
            <SectionRule
              label="오늘의 판단"
              hint="지금 화면을 열어야 하는 이유 세 가지"
            />
            <DecisionBand />

            {/* ② 실행 — 그 판단을 오늘 어떻게 처리하는가 */}
            <SectionRule label="실행" hint="누구에게 · 무엇을 · 어떤 순서로" />
            {/*
              AX 코치 — 브리핑 바로 위 한 줄. 브리핑이 "누구에게" 라면
              코치는 "그게 기록으로 남고 있나" 다. 여기서는 준비도와
              오늘 할 일 하나만 보이고, 자세한 건 코치 화면에서 본다.
            */}
            <CoachEntryCard />
            <div className="rise-stagger">
              <BriefingPreview />
            </div>
            <div className="rise-stagger grid grid-cols-1 card-gap xl:grid-cols-2">
              <OpportunityCard />
              <RevisitPreview />
            </div>
            {/*
              도입 안내는 '오늘 할 일' 이 아니라 '자리 잡는 법' 이다.
              기록이 쌓이기 시작한 뒤에도 맨 위에 두었더니 네 단계짜리
              체크리스트가 첫 화면을 통째로 차지해, 정작 오늘의 브리핑이
              한 화면 아래로 밀렸다. 네 단계를 마치면 스스로 사라진다.
            */}
            <FirstRunCard />

            {/*
              ③ 근거 — 위 판단이 맞는지 확인하는 숫자.

              예전에는 이 숫자들이 화면 맨 위에 카드 넉 장으로 있었다.
              판단보다 크게 보이면 화면이 거짓말을 한다 — 저 숫자를 다
              읽어도 오늘 뭘 할지는 안 나오기 때문이다. 판단 아래로 내리고,
              카드에서 한 판 안의 칸으로 낮췄다.
            */}
            <SectionRule
              label="근거"
              hint="위 판단이 어떤 숫자 위에 서 있는지"
            />
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
          </>
        )}
      </div>
    </div>
  );
}
