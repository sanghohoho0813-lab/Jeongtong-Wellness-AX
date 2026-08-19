"use client";

/**
 * AX 도입성과 — 성과를 임의로 만들지 않고,
 * 저장된 운영 데이터에서 계산한 지표와 월별 추이를 축적해 보여준다.
 */

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
import { formatKrw, formatPercent } from "@/lib/utils/format";
import {
  Card,
  Em,
  FilterChip,
  InsightBanner,
  SectionTitle,
  SummaryTile,
} from "@/components/ui";
import { TrendUpIcon } from "@/components/ui/icons";
import {
  monthlyOpportunityResults,
  summarizeOpportunities,
  summarizeStaffActivity,
} from "@/lib/scoring/opportunity";
import { buildOperationInsight } from "@/lib/scoring/insight";

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
    <Card className={`min-w-0 !p-4 sm:!p-5 ${highlight ? "!bg-gradient-to-br !from-aqua-50 !to-card ring-1 ring-aqua-200/50" : ""}`}>
      <p className="flex items-center gap-1.5 truncate text-[0.8125rem] font-bold text-ink-sub">
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${METRIC_DOTS[dot]}`} />
        {label}
      </p>
      <p
        className={`mt-1.5 nowrap-num text-2xl font-extrabold tracking-tight ${highlight ? "text-deep-800 dark:text-aqua-700" : "text-ink"}`}
      >
        {value}
      </p>
      {caption && <p className="mt-1 text-xs text-ink-sub">{caption}</p>}
    </Card>
  );
}

const TREND_BARS: Record<string, string> = {
  violet: "bg-gradient-to-t from-violet-600 to-violet-400",
  aqua: "bg-gradient-to-t from-deep-700 to-aqua-400",
  sky: "bg-gradient-to-t from-sky-600 to-sky-400",
  amber: "bg-gradient-to-t from-amber-600 to-amber-400",
};

function TrendBars({
  title,
  data,
  format,
  tone = "aqua",
}: {
  title: string;
  data: Array<{ month: string; value: number }>;
  format: (v: number) => string;
  tone?: keyof typeof TREND_BARS;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  const dense = data.length > 8; // 12개월 뷰: 라벨 간소화
  const isEmpty = data.every((d) => d.value === 0);
  if (isEmpty) {
    // 데이터가 없으면 0으로 차트를 그리지 않는다
    return (
      <Card>
        <SectionTitle>{title}</SectionTitle>
        <p className="rounded-card border border-dashed border-stone-line bg-card-soft py-10 text-center text-sm text-ink-sub">
          데이터 축적 중 — 기록이 쌓이면 추이가 표시됩니다.
        </p>
      </Card>
    );
  }
  return (
    <Card>
      <SectionTitle>{title}</SectionTitle>
      <div className="flex items-end justify-between gap-1.5 sm:gap-3">
        {data.map((d, i) => {
          const h = Math.round((d.value / max) * 100);
          const showValue = !dense || d.value === max || i === data.length - 1;
          const showMonth = !dense || i % 2 === data.length % 2;
          return (
            <div
              key={d.month}
              className="flex min-w-0 flex-1 flex-col items-center gap-1.5"
            >
              <span
                className={`nowrap-num text-xs font-semibold text-ink-soft ${showValue ? "" : "invisible"}`}
              >
                {format(d.value)}
              </span>
              <div className="flex h-28 w-full max-w-10 items-end rounded-lg bg-stone-bg-deep/50">
                <div
                  className={`w-full rounded-lg ${d.value > 0 ? `${TREND_BARS[tone]} shadow-sm` : "bg-transparent"}`}
                  style={{ height: `${Math.max(h, d.value > 0 ? 8 : 0)}%` }}
                />
              </div>
              <span
                className={`truncate text-[0.7rem] text-ink-sub ${showMonth ? "" : "invisible"}`}
              >
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
  const {
    factsById,
    briefingTasks,
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
    briefingTasks,
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
        {/* 초기 데이터 부족: 억지 0% 대신 축적 안내 */}
        {visits.filter((v) => v.type === "visit").length < 5 ? (
          <InsightBanner title="기준 데이터 축적 중">
            운영 데이터가 누적되면 이 화면에서 도입 전후 변화 추이를 확인할 수
            있습니다. 방문·이용 기록이 쌓이는 대로 재방문율과 월별 지표가
            자동으로 계산됩니다.
          </InsightBanner>
        ) : (
        <InsightBanner title="AX 운영 인사이트">
          <p>{opInsight.headline}</p>
          <p className="mt-2 font-bold text-aqua-300">
            → {opInsight.recommendation}
          </p>
          <p className="mt-2.5 border-t border-white/10 pt-2.5 text-[0.8125rem] text-deep-sub">
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
        <div
          data-tour="analytics-kpi"
          className="rise-stagger grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4"
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
          <TrendBars
            title="월별 방문 건수"
            tone="violet"
            data={monthly.map((m) => ({ month: m.month, value: m.visitCount }))}
            format={(v) => `${v}`}
          />
          <TrendBars
            title="월별 재방문 고객 수"
            tone="aqua"
            data={monthly.map((m) => ({
              month: m.month,
              value: m.revisitCustomers,
            }))}
            format={(v) => `${v}`}
          />
          <TrendBars
            title="월별 신규 고객"
            tone="sky"
            data={monthly.map((m) => ({
              month: m.month,
              value: m.newCustomers,
            }))}
            format={(v) => `${v}`}
          />
          {isManager && (
            <TrendBars
              title="월별 매출"
              tone="amber"
              data={monthly.map((m) => ({ month: m.month, value: m.revenue }))}
              format={(v) => (v > 0 ? formatKrw(v) : "0")}
            />
          )}
        </div>

        {/* 관리과제 처리 추이 — 브리핑에서 처리한 이력이 날짜별로 축적된다 */}
        <Card>
          <SectionTitle>관리과제 처리 추이 (최근 7일)</SectionTitle>
          {(() => {
            const days = Array.from({ length: 7 }, (_, i) => {
              const d = new Date(Date.now() - (6 - i) * 86400000);
              const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
              const label = `${d.getMonth() + 1}/${d.getDate()}`;
              const count = taskOverrides.filter(
                (t) =>
                  t.status === "done" &&
                  t.statusChangedAt &&
                  localDateOf(t.statusChangedAt) === key,
              ).length;
              return { key, label, count };
            });
            const total = days.reduce((s, d) => s + d.count, 0);
            const max = Math.max(...days.map((d) => d.count), 1);
            if (total === 0)
              return (
                <p className="rounded-card bg-card-soft py-8 text-center text-sm text-ink-sub">
                  아직 처리 이력이 없습니다. 오늘의 실행 브리핑에서 과제를
                  처리하면 날짜별로 축적됩니다.
                </p>
              );
            return (
              <div className="flex items-end justify-between gap-2 sm:gap-3">
                {days.map((d) => (
                  <div
                    key={d.key}
                    className="flex min-w-0 flex-1 flex-col items-center gap-1.5"
                  >
                    <span className="nowrap-num text-xs font-semibold text-ink-soft">
                      {d.count > 0 ? `${d.count}건` : ""}
                    </span>
                    <div className="flex h-20 w-full max-w-10 items-end rounded-lg bg-stone-bg-deep/50">
                      <div
                        className={`w-full rounded-lg ${d.count > 0 ? "bg-gradient-to-t from-deep-700 to-aqua-400" : "bg-transparent"}`}
                        style={{
                          height: `${Math.max(Math.round((d.count / max) * 100), d.count > 0 ? 10 : 0)}%`,
                        }}
                      />
                    </div>
                    <span className="nowrap-num text-[0.7rem] text-ink-sub">
                      {d.label}
                    </span>
                  </div>
                ))}
              </div>
            );
          })()}
        </Card>

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
                      <span className="block truncate text-xs text-ink-sub">
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
                        <span className="nowrap-num block truncate text-xs text-ink-sub">
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
      </div>
    </div>
  );
}
