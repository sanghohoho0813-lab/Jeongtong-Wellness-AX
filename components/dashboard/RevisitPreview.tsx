"use client";

/** 재방문 관리 프리뷰 — 다음 관리 예정일 도래 고객 */

import Link from "next/link";
import { useStore } from "@/lib/data/store";
import { displayName } from "@/lib/utils/format";
import { daysAgo } from "@/lib/utils/date";
import { formatRelative } from "@/lib/utils/date";
import { Badge } from "@/components/ui";
import { Fold } from "@/components/ui/Fold";
import { ChevronRightIcon, RefreshIcon } from "@/components/ui/icons";

export default function RevisitPreview() {
  const { customers, settings, privacyMode } = useStore();
  const rules = settings.careRules;

  const due = customers
    .filter((c) => c.nextManageDate)
    .map((c) => ({ c, over: daysAgo(c.nextManageDate!) }))
    .filter(({ over }) => over >= -rules.revisitWindowDays)
    .sort((a, b) => b.over - a.over)
    .slice(0, 5);

  // 다가온 분이 없으면 숨는다 — 재방문 관리 화면은 목차 '고객' 에서 늘 열 수 있다
  if (due.length === 0) return null;

  return (
    /* 접는 칸 — 다가온 분 수만 제목 옆에. 브리핑에도 「재방문 예정」 으로 오른다 */
    <Fold
      id="dash-revisit"
      icon={<RefreshIcon className="h-[1.1rem] w-[1.1rem]" />}
      title="재방문 예정 고객"
      badge={`${due.length}명`}
      hint="다음 관리 예정일이 지났거나 다가온 분 — 다섯 분까지. 전체는 재방문 관리 화면에서"
      action={
        <Link
          href="/retention"
          className="touch-target inline-flex items-center gap-0.5 whitespace-nowrap text-sm font-semibold text-aqua-700 hover:text-aqua-800"
        >
          재방문 관리
          <ChevronRightIcon className="h-4 w-4" />
        </Link>
      }
    >
      <ul className="divide-y divide-stone-bg-deep">
        {due.map(({ c, over }) => (
          <li key={c.id}>
            <Link
              href={`/customers/${c.id}`}
              className="flex items-center gap-3 py-2.5 hover:bg-card-soft"
            >
              <span className="min-w-0 flex-1 truncate font-semibold text-ink">
                {displayName(c.name, privacyMode)}
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
    </Fold>
  );
}
