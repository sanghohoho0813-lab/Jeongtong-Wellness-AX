"use client";

/**
 * 최근 7일 / 14일 — 실증 리포트
 * ==============================
 *
 * 대표님이 월요일 아침에 30초 보는 한 장. 숫자 다섯 줄과 문장 세 묶음.
 *
 * 「관리해서 다시 오셨다」 라고 쓰지 않는다. 실제로 확인된 것은
 * 「관리한 뒤에 다시 오신 기록이 있다」 는 시간 순서뿐이다. 문장도
 * 그렇게 적는다 — 심사에서 인과를 단정하면 그 한 줄 때문에 나머지
 * 숫자까지 의심받는다.
 */

import { useState } from "react";
import { Card, SectionTitle } from "@/components/ui";
import type { CoachReport as Report } from "@/lib/ax-coach/report";

const ROWS = (r: Report) => [
  { label: "시스템 사용일", value: `${r.activeDays}일` },
  { label: "새 방문 · 상담 기록", value: `${r.newVisits}건` },
  { label: "실제 고객관리 행동", value: `${r.actions}건` },
  { label: "관리 후 재방문 확인", value: `${r.resultsConfirmed}건` },
  { label: "고객이 남긴 요청", value: `${r.customerRequests}건` },
];

export default function CoachReport({
  report7,
  report14,
}: {
  report7: Report;
  report14: Report;
}) {
  const [days, setDays] = useState<7 | 14>(7);
  const r = days === 7 ? report7 : report14;

  return (
    <Card dataTour="coach-report">
      <SectionTitle
        tone="aqua"
        action={
          <div
            role="radiogroup"
            aria-label="기간"
            className="flex gap-1.5"
          >
            {([7, 14] as const).map((d) => (
              <button
                key={d}
                type="button"
                role="radio"
                aria-checked={days === d}
                onClick={() => setDays(d)}
                className={`touch-target shrink-0 rounded-full px-4 text-[0.9375rem] font-bold transition-colors ${
                  days === d
                    ? "bg-sel text-sel-ink"
                    : "bg-card-soft text-ink-sub ring-1 ring-stone-line hover:bg-aqua-50"
                }`}
              >
                최근 {d}일
              </button>
            ))}
          </div>
        }
      >
        최근 {days}일에 쌓인 것
      </SectionTitle>

      <ul className="divide-y divide-stone-line">
        {ROWS(r).map((row) => (
          <li
            key={row.label}
            className="flex items-center justify-between gap-3 py-2.5"
          >
            <span className="text-[1rem] text-ink-soft">{row.label}</span>
            <span className="nowrap-num text-[1.125rem] font-extrabold text-ink">
              {row.value}
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-4 space-y-3">
        <Block title="이번 기간에 달라진 점" items={r.changed} tone="ok" />
        {r.needed.length > 0 && (
          <Block title="아직 더 필요한 것" items={r.needed} tone="wait" />
        )}
        <Block title={`다음 ${r.days}일 추천`} items={r.next} tone="next" />
      </div>

      <p className="mt-3 text-[0.875rem] leading-relaxed text-ink-sub">
        「관리 후 재방문 확인」 은 고객을 챙긴 뒤 30일 안에 실제 방문
        기록이 있었다는 뜻입니다. 관리가 재방문을 만들었다는 뜻은
        아닙니다 — 일어난 순서만 적습니다.
      </p>
    </Card>
  );
}

function Block({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone: "ok" | "wait" | "next";
}) {
  const dot =
    tone === "ok" ? "bg-aqua-500" : tone === "wait" ? "bg-warn" : "bg-gold";
  return (
    <div className="rounded-card bg-card-soft px-4 py-3 ring-1 ring-stone-line">
      <p className="text-[0.9375rem] font-extrabold text-ink-sub">{title}</p>
      <ul className="mt-1.5 space-y-1">
        {items.map((t) => (
          <li key={t} className="flex items-start gap-2">
            <span className={`mt-[0.55rem] h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />
            <span className="text-[1rem] leading-relaxed text-ink-soft">{t}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
