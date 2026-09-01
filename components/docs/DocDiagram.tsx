"use client";

/**
 * 이야기용 그림 조각
 * ==================
 *
 * Why AX 는 글이 열네 절이다. 같은 모양의 카드가 열네 번 반복되면
 * 세 번째쯤에서 읽는 눈이 미끄러진다 — 각 절이 무슨 종류의 이야기인지
 * 모양으로 구분되지 않기 때문이다.
 *
 * 그래서 몇 군데는 **글 대신 그림**으로 바꾼다. 특히 "돌아온다" 는 말은
 * 문장으로 백 번 적어도 안 와닿고, 고리 하나를 그리면 한 번에 이해된다.
 *
 * 여기 있는 것들은 전부 CSS 로만 그린다. 차트 라이브러리를 쓰지 않는다 —
 * 이 그림들은 데이터를 그리는 것이 아니라 구조를 그리는 것이라, 숫자가
 * 바뀌어도 모양이 바뀌지 않아야 한다.
 */

import { ReactNode } from "react";

/**
 * 도는 고리 — 끝이 처음으로 돌아오는 구조.
 *
 * 고객 → 기록 → 판단 → 실행 → 반응 → 축적 → 다시 고객.
 * 마지막에서 처음으로 돌아가는 화살표가 이 그림의 전부다. 그것이
 * 없으면 그냥 목록이고, 있으면 "돌수록 쌓인다" 가 된다.
 */
export function DocLoop({
  steps,
  closing,
}: {
  steps: Array<{ title: string; desc?: string }>;
  /** 마지막에서 처음으로 돌아갈 때 붙는 한 줄 */
  closing: string;
}) {
  return (
    <div className="rounded-card bg-card-soft p-4 ring-1 ring-stone-line sm:p-5">
      <ol className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {steps.map((s, i) => (
          <li
            key={s.title}
            className="relative flex items-start gap-3 rounded-btn bg-card px-3.5 py-3 shadow-card ring-1 ring-black/[0.04]"
          >
            <span className="nowrap-num flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-aqua-500 to-deep-800 text-[0.8125rem] font-extrabold text-white">
              {i + 1}
            </span>
            <span className="min-w-0">
              <span className="block text-[0.9375rem] font-extrabold leading-snug text-ink">
                {s.title}
              </span>
              {s.desc && (
                <span className="mt-0.5 block text-[0.8125rem] leading-snug text-ink-sub">
                  {s.desc}
                </span>
              )}
            </span>
          </li>
        ))}
      </ol>

      {/* 돌아오는 자리 — 이 줄이 이 그림의 요지다 */}
      <div className="mt-3 flex items-center gap-2.5 rounded-btn bg-gradient-to-r from-aqua-50 to-transparent px-3.5 py-2.5 ring-1 ring-aqua-200/60">
        <span
          aria-hidden
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-aqua-500 text-white"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 11a8 8 0 1 0-2.3 5.7" />
            <path d="M20 5v6h-6" />
          </svg>
        </span>
        <p className="min-w-0 text-[0.9375rem] font-bold leading-snug text-aqua-800">
          {closing}
        </p>
      </div>
    </div>
  );
}

/**
 * 층 구조 — 위에서 아래로 내려가며 넓어지는 구조.
 *
 * 본점에서 만든 기준이 가맹점으로 퍼지고, 거기서 나온 기록이 다시
 * 본사로 모이는 관계를 세로로 세운다. 가로로 늘어놓으면 '순서'로
 * 읽히는데, 이건 순서가 아니라 층이다.
 */
export function DocLayers({
  layers,
}: {
  layers: Array<{
    label: string;
    title: string;
    desc: string;
    tone: "teal" | "aqua" | "gold";
    /** 아직 없는 것 — 지금 되는 일과 섞이지 않게 표시한다 */
    future?: boolean;
  }>;
}) {
  const SKIN = {
    teal: "from-deep-800 to-deep-700 text-white",
    aqua: "from-aqua-650 to-aqua-850 text-white",
    gold: "from-gold to-gold-deep text-white",
  } as const;

  return (
    <div className="space-y-1.5">
      {layers.map((l, i) => (
        <div key={l.title}>
          <div
            className={`flex items-start gap-3.5 rounded-card px-4 py-3.5 shadow-card ${
              /*
                아직 없는 층은 점선으로 그린다.

                `ring-1 ring-dashed` 로 적어 두었었는데, ring 은
                box-shadow 라 점선이 될 수 없고 테일윈드는 `ring-dashed`
                를 아무 CSS 없이 버린다 — 빌드된 CSS 에 그 이름이 아예
                없었다. 그래서 여태 실선 테두리였다.

                border 로 바꾸면 실제로 점선이 나온다. 색이 아니라 선의
                생김새로 갈라 두어야 흑백으로 뽑아도 남는다.
              */
              l.future
                ? "border border-dashed border-stone-line bg-card"
                : `bg-gradient-to-r ${SKIN[l.tone]}`
            }`}
            /* 층이 내려갈수록 안쪽으로 들여 — 넓어지는 관계가 눈에 보인다 */
            style={{ marginLeft: `${Math.min(i, 3) * 0.75}rem` }}
          >
            <span
              className={`eyebrow shrink-0 pt-1 ${l.future ? "" : "!text-white/60"}`}
            >
              {l.label}
            </span>
            <span className="min-w-0 flex-1">
              <span
                className={`block text-[1.0625rem] font-extrabold leading-snug ${l.future ? "text-ink" : ""}`}
              >
                {l.title}
                {l.future && (
                  <span className="ml-2 rounded-full bg-stone-bg-deep px-2 py-0.5 align-middle text-[0.6875rem] font-bold text-ink-sub">
                    아직 없음
                  </span>
                )}
              </span>
              <span
                className={`mt-0.5 block text-[0.875rem] leading-snug ${l.future ? "text-ink-sub" : "text-white/75"}`}
              >
                {l.desc}
              </span>
            </span>
          </div>
          {i < layers.length - 1 && (
            <div
              aria-hidden
              className="flex h-3 items-center"
              style={{ marginLeft: `${Math.min(i, 3) * 0.75 + 1.5}rem` }}
            >
              <span className="h-full w-px bg-stone-line" />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/**
 * 큰 숫자 하나 — 절 하나를 통째로 숫자에 내줄 때.
 *
 * 값과 그 값이 무슨 뜻인지를 붙여 둔다. 숫자만 크게 쓰면 광고가 되고,
 * 설명만 있으면 안 읽힌다.
 */
export function DocFigure({
  value,
  unit,
  label,
  note,
}: {
  value: string;
  unit?: string;
  label: string;
  note?: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col rounded-card bg-card px-4 py-4 shadow-card ring-1 ring-black/[0.04]">
      <p className="eyebrow">{label}</p>
      <p className="nowrap-num tabular mt-1.5">
        <span className="text-[1.75rem] font-extrabold leading-none tracking-tight text-deep-800 dark:text-aqua-700">
          {value}
        </span>
        {unit && (
          <span className="ml-1 text-[0.9375rem] font-bold text-ink-sub">
            {unit}
          </span>
        )}
      </p>
      {note && (
        <p className="mt-1.5 text-[0.8125rem] leading-snug text-ink-sub">
          {note}
        </p>
      )}
    </div>
  );
}
