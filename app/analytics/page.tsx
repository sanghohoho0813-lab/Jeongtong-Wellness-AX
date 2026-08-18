"use client";

/**
 * AX 도입성과 — 성과를 임의로 만들지 않고,
 * 저장된 운영 데이터에서 계산한 지표와 월별 추이를 축적해 보여준다.
 */

import PageHeader from "@/components/layout/PageHeader";
import { useStore } from "@/lib/data/store";
import { calcAxSummary, calcMonthlyMetrics } from "@/lib/scoring/metrics";
import { formatMonthKr } from "@/lib/utils/date";
import { formatKrw, formatPercent } from "@/lib/utils/format";
import { Card, Em, InsightBanner, SectionTitle } from "@/components/ui";

function MetricTile({
  label,
  value,
  caption,
  highlight = false,
}: {
  label: string;
  value: string;
  caption?: string;
  highlight?: boolean;
}) {
  return (
    <Card className={`min-w-0 !p-4 sm:!p-5 ${highlight ? "!bg-gradient-to-br !from-aqua-50 !to-white ring-1 ring-aqua-200/50" : ""}`}>
      <p className="truncate text-[0.8125rem] font-bold text-ink-sub">{label}</p>
      <p
        className={`mt-1.5 nowrap-num text-2xl font-extrabold tracking-tight ${highlight ? "text-deep-800" : "text-ink"}`}
      >
        {value}
      </p>
      {caption && <p className="mt-1 text-xs text-ink-sub">{caption}</p>}
    </Card>
  );
}

function TrendBars({
  title,
  data,
  format,
}: {
  title: string;
  data: Array<{ month: string; value: number }>;
  format: (v: number) => string;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <Card>
      <SectionTitle>{title}</SectionTitle>
      <div className="flex items-end justify-between gap-2 sm:gap-3">
        {data.map((d) => {
          const h = Math.round((d.value / max) * 100);
          return (
            <div
              key={d.month}
              className="flex min-w-0 flex-1 flex-col items-center gap-1.5"
            >
              <span className="nowrap-num text-xs font-semibold text-ink-soft">
                {format(d.value)}
              </span>
              <div className="flex h-28 w-full max-w-10 items-end rounded-lg bg-stone-bg-deep/50">
                <div
                  className={`w-full rounded-lg ${d.value > 0 ? "bg-gradient-to-t from-deep-700 to-aqua-400 shadow-[0_2px_6px_rgba(14,127,125,0.25)]" : "bg-transparent"}`}
                  style={{ height: `${Math.max(h, d.value > 0 ? 8 : 0)}%` }}
                />
              </div>
              <span className="truncate text-[0.7rem] text-ink-sub">
                {d.month.slice(5)}월
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

export default function AnalyticsPage() {
  const { factsById, briefingTasks, settings, customers, visits, memberships } =
    useStore();
  const summary = calcAxSummary(
    [...factsById.values()],
    briefingTasks,
    settings.careRules,
  );
  const monthly = calcMonthlyMetrics(customers, visits, memberships, 6);
  const latest = monthly.at(-1)!;
  const prev = monthly.at(-2);

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
        description="운영 데이터가 쌓일수록 아래 지표로 AX 적용 전후 변화를 비교할 수 있습니다. 모든 수치는 저장된 실제 기록에서 계산됩니다."
      />

      <div className="flex flex-col card-gap">
        <InsightBanner title="이번 달 핵심 요약">
          이번 달 방문은 <Em>{latest.visitCount}건</Em>
          {visitTrend && prev && (
            <>
              으로 지난달({prev.visitCount}건) 대비{" "}
              <Em>
                {visitDelta === 0 ? "동일" : `${Math.abs(visitDelta)}건 ${visitTrend}`}
              </Em>
            </>
          )}
          했습니다. 재방문율은 <Em>{formatPercent(summary.revisitRate)}</Em>
          이며, 장기 미방문 고객 <Em>{summary.dormantCount}명</Em>
          {summary.taskTotalCount > 0 && (
            <>
              , 오늘 관리과제 처리율{" "}
              <Em>{formatPercent(summary.taskDoneRate)}</Em>
            </>
          )}{" "}
          상태입니다.
        </InsightBanner>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
          <MetricTile
            label="신규 고객 (최근 30일)"
            value={`${summary.newCustomers30d}명`}
          />
          <MetricTile
            label="재방문율"
            value={formatPercent(summary.revisitRate)}
            caption="방문 고객 중 2회 이상 방문 비율"
            highlight
          />
          <MetricTile
            label="방문 건수 (최근 30일)"
            value={`${summary.visitCount30d}건`}
          />
          <MetricTile
            label="평균 방문 간격"
            value={
              summary.avgVisitGapDays ? `${summary.avgVisitGapDays}일` : "-"
            }
          />
          <MetricTile
            label="장기 미방문 고객"
            value={`${summary.dormantCount}명`}
            caption={`기준 ${settings.careRules.dormantDays}일 이상`}
          />
          <MetricTile
            label="오늘 관리과제 처리율"
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
            value={`${latest.membershipSold}건`}
          />
          <MetricTile
            label="월 매출 (이번 달)"
            value={formatKrw(latest.revenue)}
            caption="이용권 판매 + 현장 결제 합산"
          />
        </div>

        <div className="grid grid-cols-1 card-gap xl:grid-cols-2">
          <TrendBars
            title="월별 방문 건수"
            data={monthly.map((m) => ({ month: m.month, value: m.visitCount }))}
            format={(v) => `${v}`}
          />
          <TrendBars
            title="월별 재방문 고객 수"
            data={monthly.map((m) => ({
              month: m.month,
              value: m.revisitCustomers,
            }))}
            format={(v) => `${v}`}
          />
          <TrendBars
            title="월별 신규 고객"
            data={monthly.map((m) => ({
              month: m.month,
              value: m.newCustomers,
            }))}
            format={(v) => `${v}`}
          />
          <TrendBars
            title="월별 매출"
            data={monthly.map((m) => ({ month: m.month, value: m.revenue }))}
            format={(v) => (v > 0 ? formatKrw(v) : "0")}
          />
        </div>

        <Card className="border-l-4 border-gold">
          <p className="font-bold text-ink">Before / After 비교 안내</p>
          <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
            AX 도입 시점 이후 데이터가 축적되면 위 월별 추이에서 도입 전후
            기간을 나누어 비교할 수 있습니다. 최근 {formatMonthKr(monthly[0].month)}
            부터의 기록이 기준이며, 성과 수치는 실제 기록에서만 산출됩니다.
          </p>
        </Card>
      </div>
    </div>
  );
}
