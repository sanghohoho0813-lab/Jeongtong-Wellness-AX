"use client";

/**
 * 우리 매장 실증 준비도
 * =====================
 *
 * 화면에서는 "Evidence Coverage" 라고 쓰지 않는다. 60대 대표님께
 * 그 말은 아무 뜻이 없다. 「우리 매장 AX 실증 준비도」 라고 적고,
 * 무엇을 세었는지는 각 줄 아래에 숫자 그대로 적는다.
 *
 * 색만으로 구분하지 않는다 — 막대 옆에 늘 퍼센트와 한 줄 설명이 함께
 * 있다. 색이 안 보이는 분도 같은 정보를 읽는다.
 */

import { Badge, Card } from "@/components/ui";
import type { CoverageResult } from "@/lib/ax-coach/types";

function Bar({ percent }: { percent: number | null }) {
  if (percent === null) {
    return (
      <span
        aria-hidden
        className="mt-1.5 block h-2.5 w-full rounded-full bg-stone-bg-deep"
      />
    );
  }
  return (
    <span
      aria-hidden
      className="mt-1.5 block h-2.5 w-full overflow-hidden rounded-full bg-stone-bg-deep"
    >
      <span
        className="block h-full rounded-full bg-gradient-to-r from-aqua-500 to-deep-700 transition-[width] duration-500"
        style={{ width: `${Math.max(percent, 2)}%` }}
      />
    </span>
  );
}

export default function CoachSummary({
  coverage,
  isDemo,
  stageLabel,
  before,
  beforeDays,
}: {
  coverage: CoverageResult;
  isDemo: boolean;
  stageLabel: string;
  /** 며칠 전 시점을 지금 기록으로 다시 계산한 값 (없으면 비교하지 않는다) */
  before: number | null;
  beforeDays: number;
}) {
  const { overall, areas, measurableAreas } = coverage;
  const delta = overall !== null && before !== null ? overall - before : null;

  return (
    <Card dataTour="coach-summary">
      <p className="text-[0.9375rem] font-bold text-ink-sub">
        우리 매장 AX 실증 준비도
      </p>

      <div className="mt-1 flex flex-wrap items-end gap-x-4 gap-y-2">
        <p className="nowrap-num text-[3rem] font-extrabold leading-none text-ink">
          {overall === null ? (
            <span className="text-[1.75rem]">아직 측정 전</span>
          ) : (
            <>
              {overall}
              <span className="text-[1.5rem]">%</span>
            </>
          )}
        </p>
        {delta !== null && (
          <p className="nowrap-num pb-1 text-[1rem] font-bold text-ink-sub">
            {beforeDays}일 전 {before}% →{" "}
            <b className="text-ink">
              {delta > 0 ? `${delta}% 올랐어요` : delta < 0 ? `${-delta}% 내렸어요` : "그대로예요"}
            </b>
          </p>
        )}
      </div>

      <p className="mt-2 text-[1rem] leading-relaxed text-ink-soft">
        실제 방문과 고객관리 기록이 쌓이면 자동으로 올라갑니다.
        {measurableAreas < areas.length && (
          <>
            {" "}
            지금은 {measurableAreas}개 영역만 잴 수 있어 그 평균입니다.
          </>
        )}
      </p>

      {/* 시연 자료인지 아닌지를 숫자 바로 옆에 적는다 (v3.0 §15) */}
      <p className="mt-2.5 flex flex-wrap items-center gap-2 text-[0.9375rem] text-ink-sub">
        <Badge tone={isDemo ? "gold" : "positive"} dot>
          {stageLabel}
        </Badge>
        <span>
          {isDemo
            ? "시연 자료로 센 숫자입니다 — 실제 성과가 아닙니다."
            : "실제 매장 기록으로 센 숫자입니다."}
        </span>
      </p>

      <ul className="mt-4 space-y-3">
        {areas.map((a) => (
          <li key={a.area} data-coach-area={a.area}>
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
              <span className="text-[1.0625rem] font-extrabold text-ink">
                {a.label}
              </span>
              <span
                className={`nowrap-num text-[1.0625rem] font-extrabold ${
                  a.percent === null ? "text-ink-faint" : "text-ink"
                }`}
              >
                {a.percent === null ? "아직 측정 전" : `${a.percent}%`}
              </span>
            </div>
            <Bar percent={a.percent} />
            <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-ink-soft">
              {a.message}
            </p>
            <p className="nowrap-num mt-0.5 text-[0.875rem] leading-relaxed text-ink-sub">
              {a.detail}
            </p>
            {a.unmeasurableReason && (
              <p className="mt-0.5 text-[0.875rem] leading-relaxed text-warn-text">
                {a.unmeasurableReason}
              </p>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}
