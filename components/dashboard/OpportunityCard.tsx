"use client";

/**
 * 오늘의 매출기회 — 기존 고객 매출(재방문 · 재등록) 관점의 요약 밴드.
 *
 * Priority Score(오늘 챙길 고객)와 별개의 파생 판정이며,
 * 여기서는 "몇 명인지 · 누구인지 · 왜인지"만 간결하게 보여주고
 * 실제 실행은 오늘의 실행 브리핑으로 넘긴다.
 */

import Link from "next/link";
import { useStore } from "@/lib/data/store";
import { summarizeOpportunities } from "@/lib/scoring/opportunity";
import { Card, OpportunityBadge, SectionTitle } from "@/components/ui";
import { ChevronRightIcon, TrendUpIcon } from "@/components/ui/icons";

export default function OpportunityCard() {
  const { briefingTasks, customers } = useStore();

  const rows = briefingTasks
    .filter((t) => t.opportunity && t.opportunity.type !== "none")
    .sort((a, b) => {
      // 강도 높은 기회를 먼저, 같으면 관리 우선도 순
      const rank = (v?: string) => (v === "high" ? 0 : 1);
      return (
        rank(a.opportunity!.level) - rank(b.opportunity!.level) ||
        b.priorityScore - a.priorityScore
      );
    });
  const summary = summarizeOpportunities(briefingTasks);
  const open = rows.filter((t) => t.status !== "done");
  const name = (id: string) =>
    customers.find((c) => c.id === id)?.name ?? "고객";

  return (
    <Card
      dataTour="dash-opportunity"
      className="relative overflow-hidden"
    >
      <span className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-gold via-emerald-400 to-positive" />
      <SectionTitle
        tone="gold"
        icon={<TrendUpIcon className="icon-pop h-4 w-4" />}
        action={
          <Link
            href="/briefing"
            className="inline-flex shrink-0 items-center gap-0.5 whitespace-nowrap rounded-full bg-gold-soft px-3.5 py-1.5 text-sm font-bold text-gold-deep ring-1 ring-gold/25 transition-colors hover:bg-gold/20"
          >
            실행 브리핑
            <ChevronRightIcon className="h-4 w-4" />
          </Link>
        }
      >
        오늘의 매출기회
      </SectionTitle>

      {summary.total === 0 ? (
        <p className="rounded-card border border-dashed border-stone-line bg-card-soft py-8 text-center text-sm text-ink-sub">
          지금은 재방문 · 재등록 기회로 볼 만한 고객이 없습니다. 방문 기록이
          쌓이면 자동으로 표시됩니다.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2.5">
            <div className="rounded-card bg-gradient-to-br from-gold-soft to-card p-3 ring-1 ring-gold/20">
              <p className="text-[0.8125rem] font-bold text-gold-deep">
                재등록 기회
              </p>
              <p className="nowrap-num mt-1 text-2xl font-extrabold text-ink">
                {summary.renewal}
                <span className="ml-0.5 text-base font-bold text-ink-sub">
                  명
                </span>
              </p>
            </div>
            <div className="rounded-card bg-gradient-to-br from-emerald-500/[0.09] to-card p-3 ring-1 ring-emerald-500/20">
              <p className="text-[0.8125rem] font-bold text-emerald-600 dark:text-emerald-300">
                재방문 기회
              </p>
              <p className="nowrap-num mt-1 text-2xl font-extrabold text-ink">
                {summary.revisit}
                <span className="ml-0.5 text-base font-bold text-ink-sub">
                  명
                </span>
              </p>
            </div>
            <div className="rounded-card bg-card-soft p-3 ring-1 ring-stone-line">
              <p className="text-[0.8125rem] font-bold text-ink-sub">
                오늘 처리
              </p>
              <p className="nowrap-num mt-1 text-2xl font-extrabold text-ink">
                {summary.handled}
                <span className="text-base font-bold text-ink-sub">
                  /{summary.total}
                </span>
              </p>
            </div>
          </div>

          {/* 대상 고객 미리보기 — 근거 한 줄까지만 */}
          <ul className="mt-3 space-y-1.5">
            {(open.length > 0 ? open : rows).slice(0, 3).map((t) => (
              <li key={t.id}>
                <Link
                  href={`/customers/${t.customerId}`}
                  className="row-accent flex items-center gap-2.5 rounded-card bg-card-soft px-3.5 py-2.5 pl-4 ring-1 ring-black/[0.04] transition-colors hover:bg-aqua-50"
                >
                  <span className="shrink-0 font-extrabold text-ink">
                    {name(t.customerId)}
                  </span>
                  <OpportunityBadge opportunity={t.opportunity!} size="sm" />
                  <span className="min-w-0 flex-1 truncate text-sm text-ink-sub">
                    {t.opportunity!.reasons[0]}
                  </span>
                  <ChevronRightIcon className="h-4 w-4 shrink-0 text-ink-faint" />
                </Link>
              </li>
            ))}
          </ul>
          {rows.length > 3 && (
            <p className="mt-2 text-center text-xs font-bold text-ink-sub">
              외 {rows.length - 3}명 · 실행 브리핑에서 전체 확인
            </p>
          )}
        </>
      )}
    </Card>
  );
}
