"use client";

/**
 * 월별 세로 막대 차트
 * ===================
 * 이 화면의 숫자는 대표가 "이번 달이 지난달보다 어떤가"를 판단하는 데 쓰인다.
 * 그래서 보기 좋은 것보다 **잘못 읽히지 않는 것**이 먼저다. 이전 차트에서
 * 실제로 잘못 읽힐 수 있었던 것들을 하나씩 없앴다.
 *
 *  1) 0인 달에도 회색 기둥이 꽉 차 있었다 → 배경 기둥을 없앴다.
 *     값이 0이면 막대가 없고 바닥 자국만 남는다. 0은 0처럼 보여야 한다.
 *  2) 이번 달은 아직 진행 중인데 지난달과 나란히 놓여 "급감"으로 보였다
 *     → 진행 중인 달은 옅게 칠하고 '진행 중'이라고 적는다.
 *  3) 모든 막대에 숫자가 붙어 있어 어디를 봐야 할지 알기 어려웠다
 *     → 가장 큰 값과 마지막 달만 적고, 나머지는 눈금과 짚어보기로 읽는다.
 *  4) 눈으로만 읽을 수 있었다 → 막대를 짚으면 값이 뜨고, [표로 보기]도 있다.
 *
 * 색은 두 가지뿐이다(건수 = aqua, 금액 = gold). 자세한 이유는 palette.ts 참고.
 *
 * 구조: 값라벨 / 그림 / 기준선 / 달이름 네 줄을 **같은 flex 설정**으로 겹쳐
 * 세로 정렬을 맞춘다. 눈금 숫자는 오른쪽에 따로 자리를 비워 두어
 * 막대나 값 라벨과 절대 겹치지 않는다.
 */

import { useId, useState } from "react";
import { SERIES_VAR, SeriesKind } from "./palette";
import { niceMax } from "@/lib/utils/chart";

export interface ColumnPoint {
  /** x축 라벨 (예: "8월") */
  label: string;
  value: number;
  /** 화면에 적을 값 (예: "18만원"). 없으면 숫자를 그대로 쓴다 */
  display?: string;
  /** 아직 끝나지 않은 구간 (이번 달) — 지난 구간과 같은 무게로 보이면 안 된다 */
  inProgress?: boolean;
}

/** 네 줄을 같은 간격으로 맞추기 위한 공통 설정 */
const ROW = "flex items-end justify-between gap-1.5 sm:gap-2.5";
/**
 * 눈금 숫자가 들어갈 오른쪽 여백 — 막대와 겹치지 않게 자리를 비워 둔다.
 *
 * **아래 세 줄이 전부 이 값을 써야 한다.** 값 라벨 · 막대 · 달 이름이
 * 같은 격자 위에 서야 라벨이 제 막대 위에 온다.
 *
 * 실제로 어긋난 적이 있다. 눈금 자리를 36px → 64px 로 넓히면서 막대
 * 쪽(right-16)만 고치고 이 값을 pr-9 로 두었더니, 360px 화면에서
 *
 *   - 값 라벨이 제 막대보다 28px 오른쪽에 떠 있고
 *   - '320만원' 과 '18만원' 이 겹쳐 '320만원18만원' 으로 읽혔다
 *
 * 눈금 쪽(w-16 · right-16)을 바꿀 때는 여기도 같이 바꿔야 한다.
 */
const GUTTER = "pr-16";

export default function ColumnChart({
  title,
  data,
  kind = "count",
  unit = "",
  format,
  caption,
  emptyNote,
  dataTour,
}: {
  title: string;
  data: ColumnPoint[];
  kind?: SeriesKind;
  /** 값 뒤에 붙는 단위 (짚어보기·표에서 사용) */
  unit?: string;
  format?: (v: number) => string;
  caption?: string;
  /** 값이 하나도 없을 때 보여 줄 안내 (차트마다 다음 행동이 다르다) */
  emptyNote?: string;
  dataTour?: string;
}) {
  const [showTable, setShowTable] = useState(false);
  const [hover, setHover] = useState<number | null>(null);
  const tableId = useId();

  const fmt = (v: number) => format?.(v) ?? v.toLocaleString("ko-KR");
  const max = niceMax(Math.max(...data.map((d) => d.value), 0));
  const allZero = data.every((d) => d.value === 0);

  // 직접 적을 값 고르기 — 가장 큰 달과 마지막 달만 (모두 적으면 아무것도 안 읽힌다)
  const maxIdx = data.reduce(
    (best, d, i) => (d.value > data[best].value ? i : best),
    0,
  );
  /*
    값을 적어 줄 칸 — 가장 큰 달과 마지막 달.

    그런데 그 둘이 **바로 옆칸일 때** 문제가 생긴다. 360px 화면에서 한
    칸은 29px 인데 '320만원' 은 49px 이라, 둘이 붙어 있으면 글자가 서로
    겹쳐 '320만원18만원' 처럼 읽힌다. 실제로 그렇게 나왔다.

    그래서 붙어 있으면 **마지막 달만** 적는다.

      - 가장 큰 달은 막대가 제일 높다는 것으로 이미 보인다.
        정확한 값이 필요하면 「표로 보기」에 다 있다.
      - 마지막 달(= 이번 달)의 값은 눈으로 짐작할 수 없다.
        높이만 봐서는 320만원인지 180만원인지 알 수 없다.

    지울 것을 골라야 한다면, 눈으로 알 수 있는 쪽을 지운다.
  */
  const lastIdx = data.length - 1;
  const labelled = new Set<number>(
    Math.abs(maxIdx - lastIdx) <= 1 ? [lastIdx] : [maxIdx, lastIdx],
  );
  const color = SERIES_VAR[kind];

  if (allZero) {
    return (
      <section className="card" data-tour={dataTour}>
        <h3 className="text-section-title mb-3 text-ink">{title}</h3>
        <p className="rounded-card border border-dashed border-stone-line bg-card-soft py-10 text-center text-sm leading-relaxed text-ink-sub">
          {emptyNote ?? "아직 기록이 없습니다. 쌓이는 대로 이 자리에 추이가 그려집니다."}
        </p>
      </section>
    );
  }

  return (
    <section className="card" data-tour={dataTour}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-section-title text-ink">{title}</h3>
          {caption && (
            <p className="mt-0.5 text-[0.875rem] leading-relaxed text-ink-sub">
              {caption}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => setShowTable((v) => !v)}
          aria-expanded={showTable}
          aria-controls={tableId}
          className="touch-target inline-flex shrink-0 items-center rounded-full px-3.5 text-sm font-bold text-ink-sub ring-1 ring-black/[0.06] transition-colors hover:bg-stone-bg dark:ring-white/10"
        >
          {showTable ? "그래프로" : "표로 보기"}
        </button>
      </div>

      {showTable ? (
        <div id={tableId} className="overflow-x-auto">
          <table className="w-full text-sm">
            <caption className="sr-only">{title}</caption>
            <thead>
              <tr className="border-b border-stone-line text-left text-ink-sub">
                <th scope="col" className="py-1.5 font-bold">
                  기간
                </th>
                <th scope="col" className="py-1.5 text-right font-bold">
                  {unit || "값"}
                </th>
              </tr>
            </thead>
            <tbody>
              {data.map((d) => (
                <tr key={d.label} className="border-b border-stone-line/60">
                  <td className="py-1.5 text-ink-soft">
                    {d.label}
                    {d.inProgress && (
                      <span className="ml-1.5 text-xs text-ink-faint">
                        진행 중
                      </span>
                    )}
                  </td>
                  <td className="nowrap-num py-1.5 text-right font-bold text-ink">
                    {d.display ?? fmt(d.value)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div id={tableId}>
          {/* 값 라벨 줄 — 최댓값과 마지막 달만 */}
          <ul className={`${ROW} ${GUTTER}`} aria-hidden>
            {data.map((d, i) => (
              <li
                key={d.label}
                className="nowrap-num min-w-0 flex-1 text-center text-xs font-bold text-ink-soft"
              >
                {labelled.has(i) && d.value > 0
                  ? (d.display ?? fmt(d.value))
                  : " "}
              </li>
            ))}
          </ul>

          {/* 그림 영역 */}
          <div className="relative mt-1 h-32">
            {/* 눈금 — 표면에서 한 단계만 떨어진 실선, 데이터 뒤로 물러나 있다 */}
            {[
              { r: 0, tick: format ? format(max) : max.toLocaleString("ko-KR") },
              { r: 0.5, tick: "" },
            ].map(({ r, tick }) => (
              <span
                key={r}
                aria-hidden
                className="pointer-events-none absolute inset-x-0 flex items-center"
                style={{ top: `${r * 100}%` }}
              >
                <span
                  className="block h-px flex-1"
                  style={{ background: "var(--chart-grid)" }}
                />
                {/*
                  눈금 자리를 36px(w-9)로 잡아 두었는데 '500만원' 은
                  50px 이 필요했다. overflow 가 visible 이라 잘리지는
                  않고 **왼쪽 막대 위로 삐져나와** 겹쳐 있었다.

                  formatKrw 가 낼 수 있는 가장 긴 눈금은 '9,999만원'
                  (8자 ≈ 66px) 이다. 1억을 넘으면 '1억원'으로 짧아지므로
                  64px(w-16) 이면 실제로 나올 수 있는 값을 다 담는다.
                  아래 막대 목록의 right 값도 같이 맞춰야 한다 — 둘이
                  어긋나면 막대가 눈금 밑으로 들어간다.
                */}
                <span className="nowrap-num w-16 shrink-0 pl-1.5 text-right text-[0.6875rem] leading-none text-ink-faint">
                  {tick}
                </span>
              </span>
            ))}

            <ul className={`absolute inset-y-0 left-0 right-16 ${ROW}`}>
              {data.map((d, i) => {
                const pct = max > 0 ? (d.value / max) * 100 : 0;
                const active = hover === i;
                return (
                  <li
                    key={d.label}
                    className="relative flex h-full min-w-0 flex-1 items-end justify-center"
                  >
                    {/* 짚어보기 — 값을 읽는 보조 수단 (직접 라벨·표가 본 수단) */}
                    {active && (
                      <span
                        role="status"
                        className="nowrap-num pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 -translate-x-1/2 rounded-btn bg-deep-900 px-2.5 py-1 text-xs font-bold text-white shadow-float"
                      >
                        {d.label} {d.display ?? fmt(d.value)}
                        {d.display ? "" : unit}
                      </span>
                    )}

                    <button
                      type="button"
                      /* 값을 길이로 보여 주는 자리라 폭을 44px 로 못 키운다
                         — 24px 이상(WCAG 2.5.8 AA)이고, 값은 aria-label 과
                         아래 '표로 보기' 로도 읽을 수 있다. */
                      data-chart-bar
                      onMouseEnter={() => setHover(i)}
                      onMouseLeave={() => setHover(null)}
                      onFocus={() => setHover(i)}
                      onBlur={() => setHover(null)}
                      aria-label={`${d.label} ${d.display ?? fmt(d.value)}${d.display ? "" : unit}${d.inProgress ? " (진행 중)" : ""}`}
                      className="flex h-full w-full max-w-6 cursor-default items-end justify-center outline-none"
                    >
                      {d.value > 0 ? (
                        <span
                          className="block w-full rounded-t-[4px] transition-[height] duration-500"
                          style={{
                            height: `${Math.max(pct, 2)}%`,
                            background: color,
                            // 진행 중인 구간은 아직 완성된 값이 아니라는 표시
                            opacity: d.inProgress ? 0.42 : active ? 0.82 : 1,
                          }}
                        />
                      ) : (
                        // 0은 막대를 그리지 않고 바닥에 짧은 자국만 남긴다
                        <span
                          className="block w-full"
                          style={{ height: 2, background: "var(--chart-axis)" }}
                        />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* 기준선 (0) — 끊기지 않은 한 줄 */}
          <div className={GUTTER}>
            <span
              aria-hidden
              className="block h-px w-full"
              style={{ background: "var(--chart-axis)" }}
            />
          </div>

          {/* 달 이름 줄 */}
          <ul className={`${ROW} ${GUTTER} mt-1.5 items-start`}>
            {data.map((d) => (
              <li
                key={d.label}
                className="min-w-0 flex-1 text-center text-[0.7rem] leading-tight text-ink-sub"
              >
                {d.label}
                {d.inProgress && (
                  <span className="block text-[0.625rem] font-bold text-ink-faint">
                    진행 중
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
