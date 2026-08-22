"use client";

/** 재방문 관리 프리뷰 — 다음 관리 예정일 도래 고객 */

import Link from "next/link";
import { useStore } from "@/lib/data/store";
import { daysAgo } from "@/lib/utils/date";
import { formatRelative } from "@/lib/utils/date";
import { Badge, Card, SectionTitle } from "@/components/ui";
import { ChevronRightIcon, RefreshIcon } from "@/components/ui/icons";

export default function RevisitPreview() {
  const { customers, settings } = useStore();
  const rules = settings.careRules;

  const due = customers
    .filter((c) => c.nextManageDate)
    .map((c) => ({ c, over: daysAgo(c.nextManageDate!) }))
    .filter(({ over }) => over >= -rules.revisitWindowDays)
    .sort((a, b) => b.over - a.over)
    .slice(0, 5);

  return (
    <Card>
      <SectionTitle
        action={
          <Link
            href="/retention"
            className="touch-target -my-2.5 inline-flex items-center gap-0.5 text-sm font-semibold text-aqua-700 hover:text-aqua-800 whitespace-nowrap"
          >
            재방문 관리
            <ChevronRightIcon className="h-4 w-4" />
          </Link>
        }
      >
        <span className="inline-flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-400/15 text-amber-600 ring-1 ring-amber-400/20 dark:text-amber-300">
            <RefreshIcon className="h-4 w-4" />
          </span>
          재방문 예정 고객
        </span>
      </SectionTitle>
      {due.length === 0 ? (
        <p className="rounded-card bg-card-soft py-8 text-center text-sm text-ink-sub">
          현재 도래한 재방문 예정 고객이 없습니다.
        </p>
      ) : (
        <ul className="divide-y divide-stone-bg-deep">
          {due.map(({ c, over }) => (
            <li key={c.id}>
              <Link
                href={`/customers/${c.id}`}
                className="flex items-center gap-3 py-2.5 hover:bg-card-soft"
              >
                <span className="min-w-0 flex-1 truncate font-semibold text-ink">
                  {c.name}
                </span>
                <Badge tone={over > 0 ? "danger" : "aqua"}>
                  {over > 0
                    ? `${over}일 경과`
                    : `관리일 ${formatRelative(c.nextManageDate)}`}
                </Badge>
                <ChevronRightIcon className="h-4 w-4 shrink-0 text-ink-faint" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
