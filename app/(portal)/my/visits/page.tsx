"use client";

/**
 * 나의 이용기록
 *
 * 진료기록처럼 보이지 않게 쓴다. 날짜, 무엇을 이용했는지, 어느 부위를
 * 관리받았는지까지다. 그날 몸이 어땠는지에 대한 직원 메모는 여기 내려오지
 * 않는다 — 그 글은 매장이 다음 회차를 준비하려고 적은 것이지 고객에게
 * 보여 주려고 쓴 것이 아니고, 고객 화면에 놓이는 순간 성격이 달라진다.
 */

import { usePortal } from "@/lib/portal/store";
import { Badge, Card } from "@/components/ui";
import { BODY_PART_LABELS } from "@/lib/types";
import { formatDateWithDay, formatTimeKr, monthKey, formatMonthKr } from "@/lib/utils/date";
import { summarizeUsage } from "@/lib/portal/wellness";

export default function MyVisits() {
  const { visits, memberships } = usePortal();
  const usage = summarizeUsage(visits);

  const passName = (id?: string) =>
    memberships.find((m) => m.id === id)?.programName;

  // 달별로 묶는다 — 스무 줄이 넘어가면 언제 것인지 눈으로 못 따라간다
  const groups: Array<{ key: string; items: typeof visits }> = [];
  for (const v of visits) {
    const k = monthKey(v.visitedAt.slice(0, 10));
    const last = groups[groups.length - 1];
    if (last && last.key === k) last.items.push(v);
    else groups.push({ key: k, items: [v] });
  }

  return (
    <div className="space-y-4">
      <div className="px-1">
        <h1 className="text-[1.375rem] font-extrabold text-ink">나의 이용기록</h1>
        <p className="mt-1 text-[0.9375rem] text-ink-sub">
          {usage.visitCount > 0
            ? `총 ${usage.visitCount}회 이용하셨습니다.` +
              (usage.avgCycleDays
                ? ` 평균 이용 간격은 ${usage.avgCycleDays}일입니다.`
                : "")
            : "아직 이용기록이 없습니다."}
        </p>
      </div>

      {visits.length === 0 ? (
        <Card>
          <p className="py-8 text-center text-[0.9375rem] text-ink-sub">
            이용하신 기록이 여기에 쌓입니다.
          </p>
        </Card>
      ) : (
        groups.map((g) => (
          <Card key={g.key}>
            <h2 className="mb-3 text-[0.8125rem] font-extrabold text-ink-sub">
              {formatMonthKr(g.key)}
            </h2>
            <ul className="space-y-2.5">
              {g.items.map((v) => {
                const time = v.visitedAt.slice(11, 16);
                const pass = passName(v.membershipId);
                return (
                  <li
                    key={v.id}
                    className="rounded-card bg-card-soft px-4 py-3 ring-1 ring-stone-line"
                  >
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                      <span className="nowrap-num text-[0.9375rem] font-extrabold tabular text-ink">
                        {formatDateWithDay(v.visitedAt.slice(0, 10))}
                      </span>
                      {time && (
                        <span className="nowrap-num text-[0.8125rem] tabular text-ink-faint">
                          {formatTimeKr(time)}
                        </span>
                      )}
                      {v.type === "consult" && (
                        <Badge tone="gray" className="ml-auto">
                          상담
                        </Badge>
                      )}
                    </div>

                    <p className="mt-1 text-[0.9375rem] font-bold text-ink-soft">
                      {v.type === "consult"
                        ? "상담"
                        : v.programName || "정통대왕쑥뜸"}
                    </p>

                    {v.bodyParts.length > 0 && (
                      <p className="mt-1 text-[0.8125rem] text-ink-sub">
                        관리부위{" "}
                        {v.bodyParts
                          .map((p) => BODY_PART_LABELS[p.part] ?? p.part)
                          .join(" · ")}
                      </p>
                    )}

                    {pass && (
                      <p className="mt-1 text-[0.8125rem] text-ink-faint">
                        {pass} 1회 사용
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          </Card>
        ))
      )}

      <p className="px-1 text-[0.8125rem] leading-relaxed text-ink-faint">
        이용하신 내역을 정리한 기록입니다. 몸 상태에 대한 판단이나 의학적
        소견이 아닙니다.
      </p>
    </div>
  );
}
