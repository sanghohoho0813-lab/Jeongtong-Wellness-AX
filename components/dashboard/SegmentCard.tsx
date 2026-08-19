"use client";

/** 고객 세그먼트 · 재방문 분석 카드 (도넛 차트 + 범례, SVG 자체 구현) */

import { useStore } from "@/lib/data/store";
import { CustomerStatus } from "@/lib/types";
import { Card, SectionTitle } from "@/components/ui";
import { UsersIcon } from "@/components/ui/icons";

const SEGMENTS: Array<{ status: CustomerStatus; label: string; color: string }> =
  [
    { status: "new", label: "신규", color: "#149D9A" },
    { status: "active", label: "활성", color: "#8FCFCB" },
    { status: "at_risk", label: "관리 필요", color: "#DB9A32" },
    { status: "dormant", label: "장기 미방문", color: "#CFCDC4" },
  ];

function Donut({
  counts,
  total,
}: {
  counts: Record<CustomerStatus, number>;
  total: number;
}) {
  const R = 42;
  const CIRC = 2 * Math.PI * R;
  let offset = 0;
  return (
    <svg viewBox="0 0 120 120" className="h-32 w-32 shrink-0">
      <circle cx="60" cy="60" r={R} fill="none" stroke="var(--chart-track)" strokeWidth="14" />
      {SEGMENTS.map((s) => {
        const ratio = total > 0 ? counts[s.status] / total : 0;
        const dash = ratio * CIRC;
        const el = (
          <circle
            key={s.status}
            cx="60"
            cy="60"
            r={R}
            fill="none"
            stroke={s.color}
            strokeWidth="14"
            strokeDasharray={`${dash} ${CIRC - dash}`}
            strokeDashoffset={-offset}
            transform="rotate(-90 60 60)"
          />
        );
        offset += dash;
        return el;
      })}
      <text
        x="60"
        y="56"
        textAnchor="middle"
        className="fill-ink"
        fontSize="20"
        fontWeight="700"
      >
        {total}
      </text>
      <text x="60" y="74" textAnchor="middle" className="fill-ink-sub" fontSize="11">
        전체 고객
      </text>
    </svg>
  );
}

export default function SegmentCard() {
  const { derivedById } = useStore();
  const counts: Record<CustomerStatus, number> = {
    new: 0,
    active: 0,
    at_risk: 0,
    dormant: 0,
  };
  for (const d of derivedById.values()) counts[d.status]++;
  const total = derivedById.size;

  if (total === 0) {
    return (
      <Card>
        <SectionTitle tone="violet" icon={<UsersIcon className="h-4 w-4" />}>
          고객 세그먼트 · 재방문 분석
        </SectionTitle>
        <p className="rounded-card border border-dashed border-stone-line bg-card-soft px-4 py-10 text-center text-sm leading-relaxed text-ink-sub">
          <span className="block font-bold text-ink-soft">
            재방문 분석 준비 중
          </span>
          방문 기록이 일정 수준 이상 축적되면 고객별 재방문 패턴을 확인할 수
          있습니다.
        </p>
      </Card>
    );
  }

  return (
    <Card>
      <SectionTitle tone="violet" icon={<UsersIcon className="h-4 w-4" />}>
        고객 세그먼트 · 재방문 분석
      </SectionTitle>
      <div className="flex flex-wrap items-center gap-4">
        <Donut counts={counts} total={total} />
        <ul className="min-w-[9.5rem] flex-1 space-y-2.5">
          {SEGMENTS.map((s) => {
            const n = counts[s.status];
            const pct = total > 0 ? Math.round((n / total) * 100) : 0;
            return (
              <li
                key={s.status}
                className="flex items-center gap-2 text-[0.8125rem]"
              >
                <span
                  className="h-3 w-3 shrink-0 rounded-full"
                  style={{ backgroundColor: s.color }}
                />
                <span className="whitespace-nowrap font-medium text-ink-soft">
                  {s.label}
                </span>
                <span className="ml-auto nowrap-num font-extrabold text-ink">
                  {n}명{" "}
                  <span className="font-normal text-ink-sub">({pct}%)</span>
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </Card>
  );
}
