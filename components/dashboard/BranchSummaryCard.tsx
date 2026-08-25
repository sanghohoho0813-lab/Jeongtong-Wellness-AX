"use client";

/** 운영 · 지점 현황 카드 */

import Link from "next/link";
import { useStore } from "@/lib/data/store";
import { calcAxSummary } from "@/lib/scoring/metrics";
import { formatPercent } from "@/lib/utils/format";
import { Card, SectionTitle } from "@/components/ui";
import { BuildingIcon, ChevronRightIcon } from "@/components/ui/icons";

export default function BranchSummaryCard() {
  const { branches, staff, factsById, taskLedger, settings, isManager } =
    useStore();
  const summary = calcAxSummary(
    [...factsById.values()],
    taskLedger,
    settings.careRules,
  );
  const branch = branches[0];

  const rows: Array<{ label: string; value: string; dot: string }> = [
    {
      label: "지점",
      value: `${branches.length}개 (${branch?.name ?? "-"})`,
      dot: "bg-aqua-500",
    },
    {
      label: "직원",
      value: `${staff.filter((s) => s.active).length}명`,
      dot: "bg-sky-500",
    },
    {
      label: "전체 고객",
      value: `${summary.totalCustomers}명`,
      dot: "bg-violet-500",
    },
    {
      label: "재방문율",
      value: formatPercent(summary.revisitRate),
      dot: "bg-positive",
    },
    {
      label: "오늘 관리과제 처리율",
      value:
        summary.taskTotalCount > 0
          ? `${summary.taskDoneCount}/${summary.taskTotalCount}건 (${formatPercent(summary.taskDoneRate)})`
          : "과제 없음",
      dot: "bg-gold",
    },
  ];

  return (
    <Card>
      <SectionTitle
        action={
          isManager ? (
            <Link
              href="/branches"
              className="touch-target -my-2.5 inline-flex items-center gap-0.5 text-sm font-semibold text-aqua-700 hover:text-aqua-800 whitespace-nowrap"
            >
              지점 / 운영
              <ChevronRightIcon className="h-4 w-4" />
            </Link>
          ) : undefined
        }
      >
        <span className="inline-flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gold-soft text-gold-deep ring-1 ring-gold/20">
            <BuildingIcon className="h-4 w-4" />
          </span>
          운영 · 지점 현황
        </span>
      </SectionTitle>
      <ul className="divide-y divide-stone-bg-deep">
        {rows.map((r) => (
          <li
            key={r.label}
            className="flex items-center justify-between gap-3 py-2.5 text-sm"
          >
            <span className="flex items-center gap-2 text-ink-sub">
              <span className={`h-1.5 w-1.5 rounded-full ${r.dot}`} />
              {r.label}
            </span>
            <span className="nowrap-num font-semibold text-ink">{r.value}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
