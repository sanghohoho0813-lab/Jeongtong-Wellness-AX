"use client";

/**
 * AX 도입성과 — 성과를 임의로 만들지 않고,
 * 저장된 운영 데이터에서 계산한 지표와 월별 추이를 축적해 보여준다.
 */

import Link from "next/link";
import { useState } from "react";
import PageHeader from "@/components/layout/PageHeader";
import { useStore } from "@/lib/data/store";
import { calcAxSummary, calcMonthlyMetrics } from "@/lib/scoring/metrics";
import {
  formatMonthKr,
  formatRelative,
  isAfter,
  localDateOf,
} from "@/lib/utils/date";
import { formatKrw, formatPercent, formatWon } from "@/lib/utils/format";
import {
  Card,
  Em,
  FilterChip,
  InsightBanner,
  SectionTitle,
  SummaryTile,
} from "@/components/ui";
import { CheckIcon, ChevronRightIcon, TrendUpIcon } from "@/components/ui/icons";
import {
  monthlyOpportunityResults,
  renewalRevenueAfterHandling,
  summarizeOpportunities,
  summarizeStaffActivity,
} from "@/lib/scoring/opportunity";
import { buildOperationInsight } from "@/lib/scoring/insight";
import { programHeadline, summarizePrograms } from "@/lib/scoring/program";
import ColumnChart from "@/components/charts/ColumnChart";

const METRIC_DOTS: Record<string, string> = {
  sky: "bg-sky-500",
  aqua: "bg-aqua-500",
  violet: "bg-violet-500",
  emerald: "bg-positive",
  amber: "bg-warn",
  danger: "bg-danger",
  gold: "bg-gold",
  gray: "bg-ink-faint",
};

function MetricTile({
  label,
  value,
  caption,
  highlight = false,
  dot = "gray",
}: {
  label: string;
  value: string;
  caption?: string;
  highlight?: boolean;
  dot?: keyof typeof METRIC_DOTS;
}) {
  return (
    /*
      카드가 아니라 한 판 안의 칸이다.
      여덟 장을 각각 흰 카드로 띄우면 그것만으로 두 화면이 되고, 정작
      위의 해석은 스크롤 밖으로 밀린다. 값 크기는 그대로 둔다.
    */
    <div className={`stat-cell min-w-0 ${highlight ? "!bg-aqua-50" : ""}`}>
      {/*
        지표 이름은 자르지 않는다.
        '신규 고객 (최근 3(' 처럼 반쯤 잘리면 무슨 숫자인지 알 수 없어
        지표가 아니라 수수께끼가 된다. 두 줄이 되더라도 끝까지 보여 준다.
      */}
      <p className="flex items-start gap-1.5 text-[0.8125rem] font-bold leading-snug text-ink-sub">
        <span className={`mt-[0.4rem] h-1.5 w-1.5 shrink-0 rounded-full ${METRIC_DOTS[dot]}`} />
        <span className="min-w-0">{label}</span>
      </p>
      <p
        className={`mt-1.5 nowrap-num text-2xl font-extrabold tracking-tight ${highlight ? "text-deep-800 dark:text-aqua-700" : "text-ink"}`}
      >
        {value}
      </p>
      {caption && <p className="mt-1 text-xs text-ink-sub">{caption}</p>}
    </div>
  );
}

export default function AnalyticsPage() {
  const {
    factsById,
    briefingTasks,
    taskLedger,
    settings,
    customers,
    visits,
    memberships,
    taskOverrides,
    staff,
    isManager,
  } = useStore();
  const summary = calcAxSummary(
    [...factsById.values()],
    taskLedger,
    settings.careRules,
  );
  const [months, setMonths] = useState<3 | 6 | 12>(6);
  const monthly = calcMonthlyMetrics(customers, visits, memberships, months);
  const latest = monthly.at(-1)!;
  const prev = monthly.at(-2);

  // AX 운영 인사이트 — 현재 지표에서만 도출되는 규칙 기반 문장
  // AX 매출기회 집계 — Priority 지표와 별도로 계산한다.
  // 실제 재방문은 처리 시각 이후의 방문 기록이 존재하는 경우만 센다 (추정 없음)
  // 방문 일시는 지역 시각, 처리 시각은 UTC 로 저장되므로 절대 시각으로 비교한다
  /*
   * 재등록 기회를 관리한 뒤, 그 고객에게 실제로 등록된 이용권 금액.
   * 예상 매출이 아니라 이미 저장된 구매 기록만 더한다.
   */
  const renewalRevenue = renewalRevenueAfterHandling(
    briefingTasks,
    memberships,
  );
  const opp = summarizeOpportunities(briefingTasks, (customerId, sinceIso) =>
    visits.some(
      (v) =>
        v.customerId === customerId &&
        v.type === "visit" &&
        isAfter(v.visitedAt, sinceIso),
    ),
  );
  // 월별 실행 추이 — 저장된 처리 이력에서만 계산
  const oppMonthly = monthlyOpportunityResults(
    taskOverrides,
    monthly.map((m) => m.month),
  );
  const oppMonthlyTotal = oppMonthly.reduce((n, m) => n + m.handled, 0);

  // 담당자별 실행 현황 — 저장된 처리 이력에서만 계산 (평가가 아니라 쏠림 확인용)
  const staffActivity = summarizeStaffActivity(taskOverrides);
  const staffTotal = staffActivity.reduce((n, s) => n + s.handled, 0);
  const staffName = (id: string) =>
    staff.find((s) => s.id === id)?.name ?? "(퇴사·삭제된 직원)";
  /** 아직 한 건도 처리하지 않은 재직 직원 — 업무 배분을 점검할 근거 */
  const idleStaff = staff.filter(
    (s) => s.active && !staffActivity.some((a) => a.staffId === s.id),
  );

  // 프로그램별 성과 — 저장된 방문·이용권 기록에서만 계산 (예측 없음)
  const programs = summarizePrograms(visits, memberships);
  const programNote = programHeadline(programs);

  const openTaskCount = briefingTasks.filter(
    (t) => t.status === "pending" || t.status === "confirmed",
  ).length;
  const membershipLowCount = memberships.filter(
    (m) =>
      m.status === "active" &&
      m.remainingCount > 0 &&
      m.remainingCount <= settings.careRules.membershipLowCount,
  ).length;
  const opInsight = buildOperationInsight(
    summary,
    monthly,
    openTaskCount,
    membershipLowCount,
  );

  /** 지금까지 저장된 방문 기록 수 — 이 화면을 그릴지 말지의 기준 */
  const visitCount = visits.filter((v) => v.type === "visit").length;

  // 데이터 기반 인사이트 문장 (허구 수치 없음 — 저장된 기록에서만 계산)
  const visitDelta = prev ? latest.visitCount - prev.visitCount : 0;
  const visitTrend =
    !prev || prev.visitCount === 0
      ? null
      : visitDelta > 0
        ? "증가"
        : visitDelta < 0
          ? "감소"
          : "유지";

  return (
    <div>
      <PageHeader
        title="AX 도입성과"
        description="모든 수치는 저장된 실제 기록에서 계산됩니다."
      />

      <div className="flex flex-col card-gap">
        {/* 초기 데이터 부족: 억지 0% 대신 축적 안내 */}
        {visitCount < 5 ? (
          <InsightBanner title="기준 데이터 축적 중">
            방문·이용 기록이 쌓이는 대로 재방문율과 월별 지표가 자동으로
            계산됩니다. 지금까지 방문 기록 <Em>{visitCount}건</Em> · 고객{" "}
            <Em>{customers.length}명</Em>이 저장되어 있습니다.
          </InsightBanner>
        ) : (
        /*
          해석 → 왜 → 할 일 → 근거

          예전에는 이 밴드가 한 줄짜리 요약과 한 줄짜리 권장으로 끝났고,
          그 아래로 곧바로 그래프가 넉 장 이어졌다. 그러면 이 화면은
          "차트 대시보드" 가 된다 — 그래프를 읽을 줄 아는 사람만 쓸 수 있고,
          읽고 나서도 무엇을 하라는 것인지는 각자 알아서 정해야 한다.

          네 단으로 나눈다. 결론을 맨 위에 크게 두고, 그렇게 본 근거를
          항목으로 펼치고, 할 일을 금색으로 묶고, 숫자는 맨 아래 작은
          글씨로 내린다. 숫자를 지우지는 않는다 — 근거가 없으면 결론도
          믿을 수 없기 때문이다. 다만 **읽는 순서**를 뒤집는다.
        */
        <InsightBanner title="AX 운영 인사이트">
          {/*
            ① 해석 · ② 왜

            headline 은 아래 항목들을 쉼표로 이어 붙인 한 줄이다. 둘을
            그대로 나란히 두면 같은 문장을 두 번 읽게 된다 — 큰 글씨로
            한 번, 점 찍힌 목록으로 또 한 번.

            그래서 **첫 항목을 큰 글씨로 올리고, 나머지만 아래에 편다.**
            첫 항목은 규칙이 가장 먼저 세운 신호라 결론 자리에 맞고,
            문장을 새로 지어내지도 않는다.
          */}
          <p className="text-[1.1875rem] font-extrabold leading-snug text-white sm:text-[1.3125rem]">
            {opInsight.reasons[0] ?? opInsight.headline}
          </p>

          {opInsight.reasons.length > 1 && (
            <ul className="mt-3 space-y-1">
              {opInsight.reasons.slice(1).map((r, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="mt-[0.5rem] h-1.5 w-1.5 shrink-0 rounded-full bg-aqua-300" />
                  <span className="min-w-0 text-[0.9375rem] leading-relaxed text-deep-sub">
                    {r}
                  </span>
                </li>
              ))}
            </ul>
          )}

          {/* ③ 할 일 — 결론은 색으로 묶는다 */}
          <div
            style={{ "--rail": "rgb(var(--c-gold))" } as never}
            className="rail rail-strong mt-4 rounded-btn bg-white/[0.07] py-3 pl-4 pr-4"
          >
            <p className="eyebrow !text-gold-lite">그래서 무엇을 하는가</p>
            <p className="mt-1 text-[1rem] font-bold leading-snug text-white">
              {opInsight.recommendation}
            </p>
          </div>

          {/*
            ④ 근거 숫자 — 아래 지표 타일과 같은 값이다.
            폰에서는 이 줄이 한 화면을 더 밀어내 정작 지표가 안 보였다.
            자리가 넉넉한 화면에서만 요약으로 보여 준다.
          */}
          <p className="mt-3 hidden border-t border-white/10 pt-3 text-[0.8125rem] text-deep-sub sm:block">
            이번 달 방문 <Em>{latest.visitCount}건</Em>
            {visitTrend && prev && (
              <>
                {" "}
                (지난달 {prev.visitCount}건 대비{" "}
                {visitDelta === 0
                  ? "동일"
                  : `${Math.abs(visitDelta)}건 ${visitTrend}`}
                )
              </>
            )}{" "}
            · 재방문율 <Em>{formatPercent(summary.revisitRate)}</Em> · 장기
            미방문 <Em>{summary.dormantCount}명</Em>
            {summary.taskTotalCount > 0 && (
              <>
                {" "}
                · 관리과제 처리율{" "}
                <Em>{formatPercent(summary.taskDoneRate)}</Em>
              </>
            )}
          </p>
        </InsightBanner>
        )}

        {/*
          기록이 거의 없을 때는 지표·차트를 그리지 않는다.

          예전에는 0 이 적힌 타일 여덟 장과 빈 그래프 넉 장이 다섯 화면쯤
          이어졌다. 아무것도 알려 주지 않으면서 화면만 채우고, 정작
          "무엇을 하면 이 화면이 채워지는지"는 어디에도 없었다.
        */}
        {visitCount < 5 ? (
          <Card>
            <SectionTitle tone="aqua">이 화면이 채워지려면</SectionTitle>
            <ol className="space-y-2.5">
              {[
                {
                  done: customers.length > 0,
                  text: "고객을 등록합니다",
                  href: "/customers",
                },
                {
                  done: visitCount > 0,
                  text: "다녀가신 분의 방문을 기록합니다",
                  href: "/visits",
                },
                {
                  done: visitCount >= 5,
                  text: `방문 기록이 5건 모이면 재방문율·월별 추이가 계산됩니다 (지금 ${visitCount}건)`,
                  href: "/visits",
                },
              ].map((s, i) => (
                // 줄 전체를 눌러 이동한다 — 좁은 화면에서 단추가 글을 밀어내지 않게
                <li key={i}>
                  <Link
                    href={s.href}
                    className="flex items-center gap-3 rounded-card px-1 py-2 transition-colors active:bg-aqua-50"
                  >
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-extrabold ${
                        s.done
                          ? "bg-emerald-50 text-positive-text dark:bg-emerald-400/10"
                          : "bg-stone-bg-deep text-ink-sub"
                      }`}
                    >
                      {s.done ? (
                        <CheckIcon className="h-4 w-4" strokeWidth={2.8} />
                      ) : (
                        i + 1
                      )}
                    </span>
                    <span
                      className={`min-w-0 flex-1 text-[0.9375rem] leading-snug ${
                        s.done ? "text-ink-faint" : "font-bold text-ink-soft"
                      }`}
                    >
                      {s.text}
                    </span>
                    {!s.done && (
                      <ChevronRightIcon className="h-5 w-5 shrink-0 text-ink-faint" />
                    )}
                  </Link>
                </li>
              ))}
            </ol>
          </Card>
        ) : (
        <>
        <div
          data-tour="analytics-kpi"
          className="stat-strip rise-stagger grid-cols-2 xl:grid-cols-4"
        >
          <MetricTile
            label="신규 고객 (최근 30일)"
            dot="sky"
            value={`${summary.newCustomers30d}명`}
          />
          <MetricTile
            label="재방문율"
            dot="aqua"
            value={formatPercent(summary.revisitRate)}
            caption="방문 고객 중 2회 이상 방문 비율"
            highlight
          />
          <MetricTile
            label="방문 건수 (최근 30일)"
            dot="violet"
            value={`${summary.visitCount30d}건`}
          />
          <MetricTile
            label="평균 방문 간격"
            dot="gray"
            value={
              summary.avgVisitGapDays ? `${summary.avgVisitGapDays}일` : "-"
            }
          />
          <MetricTile
            label="장기 미방문 고객"
            dot="danger"
            value={`${summary.dormantCount}명`}
            caption={`기준 ${settings.careRules.dormantDays}일 이상`}
          />
          <MetricTile
            label="오늘 관리과제 처리율"
            dot="emerald"
            value={
              summary.taskTotalCount > 0
                ? formatPercent(summary.taskDoneRate)
                : "-"
            }
            caption={`처리 ${summary.taskDoneCount} / 대상 ${summary.taskTotalCount}건`}
            highlight
          />
          <MetricTile
            label="이용권 판매 (이번 달)"
            dot="gold"
            value={`${latest.membershipSold}건`}
          />
          {isManager && (
            <MetricTile
              label="월 매출 (이번 달)"
            dot="amber"
              value={formatKrw(latest.revenue)}
              caption="이용권 판매 + 현장 결제 합산"
            />
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-section-title text-ink">기간별 추이</h2>
          <div className="flex gap-2">
            {([3, 6, 12] as const).map((m) => (
              <FilterChip
                key={m}
                active={months === m}
                onClick={() => setMonths(m)}
              >
                {m}개월
              </FilterChip>
            ))}
          </div>
        </div>

        <div className="rise-stagger grid grid-cols-1 card-gap xl:grid-cols-2">
          <ColumnChart
            title="월별 방문 건수"
            dataTour="analytics-trend"
            unit="건"
            data={monthly.map((m, i) => ({
              label: `${Number(m.month.slice(5))}월`,
              value: m.visitCount,
              inProgress: i === monthly.length - 1,
            }))}
          />
          <ColumnChart
            title="월별 재방문 고객 수"
            caption="그 달에 2회 이상 방문하신 고객"
            unit="명"
            data={monthly.map((m, i) => ({
              label: `${Number(m.month.slice(5))}월`,
              value: m.revisitCustomers,
              inProgress: i === monthly.length - 1,
            }))}
          />
          <ColumnChart
            title="월별 신규 고객"
            unit="명"
            data={monthly.map((m, i) => ({
              label: `${Number(m.month.slice(5))}월`,
              value: m.newCustomers,
              inProgress: i === monthly.length - 1,
            }))}
          />
          {isManager && (
            <ColumnChart
              title="월별 매출"
              caption="이용권 판매 + 현장 결제 합산"
              kind="money"
              format={formatKrw}
              data={monthly.map((m, i) => ({
                label: `${Number(m.month.slice(5))}월`,
                value: m.revenue,
                display: m.revenue > 0 ? formatKrw(m.revenue) : "0",
                inProgress: i === monthly.length - 1,
              }))}
            />
          )}
        </div>

        {/* 관리과제 처리 추이 — 브리핑에서 처리한 이력이 날짜별로 축적된다 */}
        <ColumnChart
          title="관리과제 처리 추이 (최근 7일)"
          caption="실행 브리핑에서 처리완료로 기록한 건"
          emptyNote="아직 처리 이력이 없습니다. 오늘의 실행 브리핑에서 과제를 처리하면 날짜별로 쌓입니다."
          unit="건"
          data={Array.from({ length: 7 }, (_, i) => {
            const d = new Date(Date.now() - (6 - i) * 86400000);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
            return {
              label: `${d.getMonth() + 1}/${d.getDate()}`,
              value: taskOverrides.filter(
                (t) =>
                  t.status === "done" &&
                  t.statusChangedAt &&
                  localDateOf(t.statusChangedAt) === key,
              ).length,
              // 오늘은 아직 하루가 끝나지 않았다
              inProgress: i === 6,
            };
          })}
        />

        {/* AX 매출기회 현황 — 대상 → 실행 → 결과 흐름 (추정치 없음) */}
        <Card dataTour="analytics-opportunity">
          <SectionTitle tone="gold" icon={<TrendUpIcon className="h-4 w-4" />}>
            AX 매출기회 현황
          </SectionTitle>
          <p className="-mt-2 mb-4 text-sm leading-relaxed text-ink-sub">
            기존 고객의 이용 데이터에서 재방문 · 재등록으로 이어질 수 있는
            관리 대상과, 실제 실행 결과를 셉니다. 전환율이나 예상 매출은
            추정하지 않습니다.
          </p>

          {opp.total === 0 ? (
            <p className="rounded-card border border-dashed border-stone-line bg-card-soft py-8 text-center text-sm text-ink-sub">
              현재 매출기회로 판정된 고객이 없습니다. 방문 · 이용권 기록이
              쌓이면 자동으로 집계됩니다.
            </p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
                <SummaryTile
                  label="재등록 관리대상"
                  value={opp.renewal}
                  tone="gold"
                />
                <SummaryTile
                  label="재방문 관리대상"
                  value={opp.revisit}
                  tone="green"
                />
                <SummaryTile
                  label="실행 완료"
                  value={opp.handled}
                  tone="aqua"
                />
                <SummaryTile
                  label="재방문 예정 확보"
                  value={opp.revisitPlanned}
                  tone="sky"
                />
              </div>

              {/* 대상 → 실행 → 결과 */}
              <ol className="mt-4 space-y-1.5">
                {[
                  {
                    label: "매출기회 대상",
                    value: opp.total,
                    desc: "재등록 + 재방문 기회로 판정된 고객",
                    bar: "from-gold to-gold-deep",
                  },
                  {
                    label: "직원이 실제 관리",
                    value: opp.handled,
                    desc: "실행 브리핑에서 처리완료로 기록된 건",
                    bar: "from-aqua-400 to-deep-700",
                  },
                  {
                    label: "재방문 예정 확보",
                    value: opp.revisitPlanned,
                    desc: "처리 결과에 재방문 예정이 기록된 건",
                    bar: "from-sky-400 to-sky-600",
                  },
                  {
                    label: "이용권 재등록",
                    value: opp.renewed,
                    desc: "처리 결과에 재등록으로 기록된 건",
                    bar: "from-emerald-400 to-positive",
                  },
                  {
                    label: "실제 재방문 확인",
                    value: opp.actualRevisit,
                    desc: "관리한 뒤 실제 방문 기록이 남은 고객",
                    bar: "from-violet-400 to-violet-600",
                  },
                ].map((row) => (
                  <li
                    key={row.label}
                    className="flex items-center gap-3 rounded-card bg-card-soft px-3.5 py-3 ring-1 ring-black/[0.04]"
                  >
                    <span
                      className={`h-9 w-1.5 shrink-0 rounded-full bg-gradient-to-b ${row.bar}`}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block font-extrabold text-ink">
                        {row.label}
                      </span>
                      {/* 이 숫자가 무엇을 센 것인지 알려 주는 줄이라 자르지 않는다 */}
                      <span className="block text-xs leading-snug text-ink-sub">
                        {row.desc}
                      </span>
                    </span>
                    <span className="nowrap-num shrink-0 text-xl font-extrabold text-ink">
                      {row.value}
                      <span className="ml-0.5 text-sm font-bold text-ink-sub">
                        명
                      </span>
                    </span>
                  </li>
                ))}
              </ol>

              {/*
                마지막 칸 — 실제로 들어온 돈.
                퍼널의 앞 단계는 '건수'라 여기까지 와야 이야기가 끝난다.
                다만 관리 뒤에 등록됐다고 해서 그 관리 때문이라고 단정할 수는
                없어서, 이름도 '관리 후 실제 등록'으로 두고 그렇게 설명한다.
              */}
              <div className="mt-2.5 rounded-card border border-emerald-500/25 bg-emerald-500/[0.06] px-4 py-3.5 dark:bg-emerald-400/10">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="font-extrabold text-ink">
                    관리 후 실제 등록된 이용권
                  </span>
                  <span className="nowrap-num ml-auto text-xl font-extrabold tabular text-ink">
                    {renewalRevenue.count > 0
                      ? formatWon(renewalRevenue.amount)
                      : "데이터 축적 중"}
                  </span>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-ink-sub">
                  {renewalRevenue.count > 0
                    ? `재등록 기회를 처리한 뒤 ${renewalRevenue.windowDays}일 안에 실제로 등록된 이용권 ${renewalRevenue.count}건의 판매금액입니다. 이미 저장된 구매 기록만 더한 값이며, 관리가 원인이라고 단정하지는 않습니다.`
                    : `재등록 기회를 처리한 뒤 ${renewalRevenue.windowDays}일 안에 등록된 이용권이 아직 없습니다. 실제 등록이 생기면 그 금액이 여기에 쌓입니다.`}
                </p>
              </div>

              {/* 월별 실행 추이 — 처리 이력이 있을 때만 */}
              {oppMonthlyTotal > 0 && (
                <div className="mt-4 rounded-card bg-card-soft p-4 ring-1 ring-black/[0.04]">
                  <p className="text-[0.8125rem] font-extrabold uppercase tracking-wider text-ink-faint">
                    월별 매출기회 실행
                  </p>
                  <ul className="mt-2.5 space-y-1.5">
                    {oppMonthly.map((m) => {
                      const max = Math.max(
                        ...oppMonthly.map((x) => x.handled),
                        1,
                      );
                      return (
                        <li key={m.month} className="flex items-center gap-3">
                          <span className="nowrap-num w-20 shrink-0 text-xs font-bold text-ink-sub">
                            {formatMonthKr(m.month)}
                          </span>
                          <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-stone-bg-deep">
                            <span
                              className="block h-full rounded-full bg-gradient-to-r from-gold to-gold-deep"
                              style={{
                                width: `${Math.round((m.handled / max) * 100)}%`,
                              }}
                            />
                          </span>
                          <span className="nowrap-num w-32 shrink-0 text-right text-xs font-bold text-ink-soft">
                            실행 {m.handled} · 재방문 {m.revisitPlanned} · 재등록{" "}
                            {m.renewed}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {opp.handled === 0 && (
                <p className="mt-3 rounded-btn border-l-4 border-gold bg-gold-soft/60 px-4 py-3 text-sm leading-relaxed text-ink-soft">
                  매출기회 성과 데이터 축적 중입니다. 실행 브리핑에서 매출기회
                  과제를 처리하면 실행 · 재방문 · 재등록 결과가 여기에 쌓입니다.
                </p>
              )}
            </>
          )}
        </Card>

        {/* 프로그램별 성과 — 무엇을 권할지 판단할 근거 (실제 기록 집계) */}
        <Card dataTour="analytics-program">
          <SectionTitle>프로그램별 성과</SectionTitle>
          <p className="-mt-2 mb-4 text-sm leading-relaxed text-ink-sub">
            어떤 프로그램이 다음 방문으로 이어졌는지를 실제 기록에서 셉니다.
            프로그램이 원인이라는 뜻은 아니며, 이용 이후 방문 기록이 있었다는
            사실만 보여 드립니다.
          </p>

          {programs.length === 0 ? (
            <p className="rounded-card border border-dashed border-stone-line bg-card-soft py-8 text-center text-sm leading-relaxed text-ink-sub">
              아직 프로그램이 기록된 방문이 없습니다. 방문을 기록할 때 프로그램을
              함께 남기면 여기에 쌓입니다.
            </p>
          ) : (
            <>
              {programNote && (
                <p className="mb-3 rounded-btn border-l-4 border-gold bg-gold-soft/60 px-4 py-3 text-sm leading-relaxed text-ink-soft">
                  {programNote}
                </p>
              )}
              <ul className="space-y-1.5">
                {programs.map((p) => {
                  const rate =
                    p.customerCount > 0
                      ? Math.round((p.returnedCustomers / p.customerCount) * 100)
                      : 0;
                  return (
                    <li
                      key={p.name}
                      className="rounded-card bg-card-soft px-3.5 py-3 ring-1 ring-black/[0.04]"
                    >
                      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                        {/* 프로그램 이름이 잘리면 어느 프로그램 성과인지 알 수 없다 */}
                        <span className="min-w-0 flex-1 font-extrabold leading-snug text-ink">
                          {p.name}
                        </span>
                        <span className="nowrap-num shrink-0 text-sm font-bold text-ink-sub">
                          이용 {p.visitCount}회 · {p.customerCount}명
                        </span>
                      </div>

                      {/* 이용 후 다시 방문한 고객 비율 */}
                      <div className="mt-2 flex items-center gap-2.5">
                        <span className="h-2 flex-1 overflow-hidden rounded-full bg-stone-bg-deep">
                          <span
                            className="block h-full rounded-full bg-gradient-to-r from-aqua-400 to-deep-700"
                            style={{ width: `${rate}%` }}
                          />
                        </span>
                        <span className="nowrap-num shrink-0 text-sm font-extrabold text-ink">
                          {p.returnedCustomers}/{p.customerCount}명 재방문
                        </span>
                      </div>

                      <p className="mt-1.5 text-xs leading-relaxed text-ink-sub">
                        {p.medianReturnDays !== undefined && (
                          <span className="nowrap-num">
                            다음 방문까지 보통 {p.medianReturnDays}일
                          </span>
                        )}
                        {p.repeatCustomers > 0 && (
                          <span className="nowrap-num">
                            {p.medianReturnDays !== undefined ? " · " : ""}
                            같은 프로그램 재이용 {p.repeatCustomers}명
                          </span>
                        )}
                        {isManager && p.membershipCount > 0 && (
                          <span className="nowrap-num">
                            {" · "}이용권 {p.membershipCount}건{" "}
                            {formatKrw(p.membershipRevenue)}
                          </span>
                        )}
                      </p>
                    </li>
                  );
                })}
              </ul>
              <p className="mt-3 text-xs leading-relaxed text-ink-faint">
                &lsquo;다음 방문까지 보통 N일&rsquo;은 중앙값입니다. 한두 분의 긴 공백이
                전체를 왜곡하지 않도록 평균 대신 씁니다.
              </p>
            </>
          )}
        </Card>

        {/* 담당자별 실행 현황 — 누가 얼마나 관리했는지 (평가가 아니라 배분 점검용) */}
        <Card dataTour="analytics-staff">
          <SectionTitle>담당자별 실행 현황</SectionTitle>
          <p className="-mt-2 mb-4 text-sm leading-relaxed text-ink-sub">
            실행 브리핑에서 관리과제를 처리한 기록을 담당자별로 셉니다. 평가를
            위한 순위가 아니라, 관리가 한 사람에게 쏠려 있거나 비어 있는지를
            확인하기 위한 지표입니다.
          </p>

          {staffActivity.length === 0 ? (
            <p className="rounded-card border border-dashed border-stone-line bg-card-soft py-8 text-center text-sm leading-relaxed text-ink-sub">
              아직 처리 기록이 없습니다. 실행 브리핑에서 관리과제를 처리하면
              담당자별로 쌓입니다.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {staffActivity.map((a) => {
                const share = Math.round((a.handled / Math.max(staffTotal, 1)) * 100);
                return (
                  <li
                    key={a.staffId}
                    className="rounded-card bg-card-soft px-3.5 py-3 ring-1 ring-black/[0.04]"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-aqua-50 to-aqua-100 text-sm font-extrabold text-aqua-800 ring-1 ring-aqua-200/60">
                        {staffName(a.staffId).slice(0, 1)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-extrabold text-ink">
                          {staffName(a.staffId)}
                        </span>
                        <span className="tabular block text-xs leading-snug text-ink-sub">
                          처리완료 {a.done}건 · 보류 {a.held}건
                          {a.lastHandledAt
                            ? ` · 마지막 ${formatRelative(a.lastHandledAt)}`
                            : ""}
                        </span>
                      </span>
                      <span className="nowrap-num shrink-0 text-right">
                        <span className="block text-xl font-extrabold text-ink">
                          {a.handled}
                          <span className="ml-0.5 text-sm font-bold text-ink-sub">
                            건
                          </span>
                        </span>
                        <span className="block text-xs font-bold text-ink-faint">
                          전체의 {share}%
                        </span>
                      </span>
                    </div>
                    {a.opportunityHandled > 0 && (
                      <p className="nowrap-num mt-2 border-t border-stone-line pt-2 text-xs font-bold text-ink-soft">
                        매출기회 처리 {a.opportunityHandled}건 · 재방문 예정{" "}
                        {a.revisitPlanned}건 · 재등록 {a.renewed}건
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          {idleStaff.length > 0 && staffTotal > 0 && (
            <p className="mt-3 rounded-btn border-l-4 border-warn bg-amber-50 px-4 py-3 text-sm leading-relaxed text-ink-soft dark:bg-amber-400/10">
              <b>{idleStaff.map((s) => s.name).join(", ")}</b> 님은 아직 처리한
              관리과제가 없습니다. 업무가 한쪽에 몰려 있지 않은지 확인해 보세요.
            </p>
          )}
        </Card>

        <Card className="border-l-4 border-gold">
          <p className="font-bold text-ink">Before / After 비교 안내</p>
          <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
            AX 도입 시점 이후 데이터가 축적되면 위 월별 추이에서 도입 전후
            기간을 나누어 비교할 수 있습니다. 최근 {formatMonthKr(monthly[0].month)}
            부터의 기록이 기준이며, 성과 수치는 실제 기록에서만 산출됩니다.
          </p>
        </Card>
        </>
        )}
      </div>
    </div>
  );
}
