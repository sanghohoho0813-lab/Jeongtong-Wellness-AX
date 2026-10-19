"use client";

/**
 * 나의 이용기록
 *
 * 진료기록처럼 보이지 않게 쓴다. 날짜, 무엇을 이용했는지, 어느 부위를
 * 관리받았는지까지다. 그날 몸이 어땠는지에 대한 직원 메모는 여기 내려오지
 * 않는다 — 그 글은 매장이 다음 회차를 준비하려고 적은 것이지 고객에게
 * 보여 주려고 쓴 것이 아니고, 고객 화면에 놓이는 순간 성격이 달라진다.
 */

import { useState } from "react";
import { usePortal } from "@/lib/portal/store";
import { BODY_PART_LABELS } from "@/lib/types";
import { formatDateWithDay, formatTimeKr, monthKey, formatMonthKr } from "@/lib/utils/date";
import { summarizeUsage } from "@/lib/portal/wellness";
import { EmptyLine, ListGroup, ListRow, PageHead, Section, StatusPill } from "@/components/portal/kit";

const FILTERS = [
  { key: "all", label: "전체" },
  { key: "visit", label: "이용" },
  { key: "consult", label: "상담" },
] as const;

export default function MyVisits() {
  const { visits, memberships } = usePortal();
  const usage = summarizeUsage(visits);
  const [filter, setFilter] = useState<"all" | "visit" | "consult">("all");

  const passName = (id?: string) =>
    memberships.find((m) => m.id === id)?.programName;

  const shown = filter === "all" ? visits : visits.filter((v) => v.type === filter);

  // 달별로 묶는다 — 스무 줄이 넘어가면 언제 것인지 눈으로 못 따라간다
  const groups: Array<{ key: string; items: typeof visits }> = [];
  for (const v of shown) {
    const k = monthKey(v.visitedAt.slice(0, 10));
    const last = groups[groups.length - 1];
    if (last && last.key === k) last.items.push(v);
    else groups.push({ key: k, items: [v] });
  }

  return (
    <div className="space-y-6">
      <PageHead
        back={{ href: "/my", label: "홈" }}
        title="나의 이용기록"
        sub={
          usage.visitCount > 0
            ? `총 ${usage.visitCount}회 이용하셨습니다.` +
              (usage.avgCycleDays ? ` 평균 이용 간격은 ${usage.avgCycleDays}일입니다.` : "")
            : "아직 이용기록이 없습니다."
        }
      />

      {/* 주문 목록의 「전체 · 음식 · 장보기」 처럼 — 좁혀 보기만, 감추지 않는다 */}
      {visits.length > 0 && (
        <div role="group" aria-label="종류로 좁혀 보기" className="flex gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              aria-pressed={filter === f.key}
              onClick={() => setFilter(f.key)}
              className={`touch-target rounded-full px-4 text-[0.9375rem] font-bold ring-1 transition-colors ${
                filter === f.key
                  ? "bg-sel text-sel-ink ring-transparent"
                  : "bg-card text-ink-soft ring-stone-line hover:bg-aqua-50"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      {visits.length === 0 ? (
        <EmptyLine>이용하신 기록이 여기에 쌓입니다.</EmptyLine>
      ) : shown.length === 0 ? (
        <EmptyLine>이 종류의 기록이 없습니다.</EmptyLine>
      ) : (
        groups.map((g) => (
          <Section key={g.key} title={formatMonthKr(g.key)}>
            <ListGroup>
              {g.items.map((v) => {
                const time = v.visitedAt.slice(11, 16);
                const pass = passName(v.membershipId);
                const consult = v.type === "consult";
                return (
                  <ListRow
                    key={v.id}
                    chevron={false}
                    title={
                      <span className="nowrap-num tabular">
                        {formatDateWithDay(v.visitedAt.slice(0, 10))}
                        {time && (
                          <span className="ml-1.5 text-[0.8125rem] font-medium text-ink-faint">
                            {formatTimeKr(time)}
                          </span>
                        )}
                      </span>
                    }
                    sub={
                      <>
                        <span className="block font-bold text-ink-soft">
                          {consult ? "상담" : v.programName || "정통대왕쑥뜸"}
                        </span>
                        {v.bodyParts.length > 0 && (
                          <span className="block">
                            관리부위{" "}
                            {v.bodyParts
                              .map((p) => BODY_PART_LABELS[p.part] ?? p.part)
                              .join(" · ")}
                          </span>
                        )}
                        {pass && <span className="block text-ink-faint">{pass} 1회 사용</span>}
                      </>
                    }
                    right={
                      <StatusPill tone={consult ? "muted" : "done"}>
                        {consult ? "상담" : "이용 완료"}
                      </StatusPill>
                    }
                  />
                );
              })}
            </ListGroup>
          </Section>
        ))
      )}

      <p className="px-1 text-[0.8125rem] leading-relaxed text-ink-faint">
        이용하신 내역을 정리한 기록입니다. 몸 상태에 대한 판단이나 의학적
        소견이 아닙니다.
      </p>
    </div>
  );
}
