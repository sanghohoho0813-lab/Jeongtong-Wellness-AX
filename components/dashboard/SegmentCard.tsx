"use client";

/** 고객 세그먼트 · 재방문 분석 카드 (도넛 차트 + 범례, SVG 자체 구현) */

import { useStore } from "@/lib/data/store";
import { CustomerStatus } from "@/lib/types";
import { Card, SectionTitle } from "@/components/ui";

const SEGMENTS: Array<{ status: CustomerStatus; label: string; color: string }> =
  [
    { status: "new", label: "신규", color: "#149D9A" },
    { status: "active", label: "활성", color: "#7FCFCB" },
    { status: "at_risk", label: "관리 필요", color: "#E8A33D" },
    { status: "dormant", label: "장기 미방문", color: "#C7CFCE" },
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
    <svg viewBox="0 0 120 120" className="h-36 w-36 shrink-0">
      <circle cx="60" cy="60" r={R} fill="none" stroke="#EDEFEF" strokeWidth="14" />
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
      <text x="60" y="74" textAnchor="middle" fill="#68757B" fontSize="11">
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

  return (
    <Card>
      <SectionTitle>고객 세그먼트 · 재방문 분석</SectionTitle>
      <div className="flex flex-wrap items-center gap-5">
        <Donut counts={counts} total={total} />
        <ul className="min-w-0 flex-1 space-y-2.5">
          {SEGMENTS.map((s) => {
            const n = counts[s.status];
            const pct = total > 0 ? Math.round((n / total) * 100) : 0;
            return (
              <li key={s.status} className="flex items-center gap-2.5 text-sm">
                <span
                  className="h-3 w-3 shrink-0 rounded-full"
                  style={{ backgroundColor: s.color }}
                />
                <span className="truncate text-ink-soft">{s.label}</span>
                <span className="ml-auto nowrap-num font-semibold text-ink">
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
