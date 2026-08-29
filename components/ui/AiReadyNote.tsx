"use client";

/**
 * AI READY — 지금 무엇이 AI 이고 무엇이 아닌지 밝혀 두는 자리
 * ==========================================================
 *
 * 화면 곳곳에 `AI 추천`, `AX Insight`, `AI 추천일` 이라고 적어 두었다.
 * 그런데 그 값을 실제로 만드는 것은 `lib/scoring/priority.ts` 의
 * **규칙**이다 — 방문 간격, 잔여 회차, 마지막 방문 이후 경과일 같은 것을
 * 정해진 기준으로 계산한다. 지금 이 앱에는 언어모델이 붙어 있지 않다.
 *
 * 그걸 적어 두지 않으면 두 가지가 나쁘게 흘러간다.
 *   - 원장님은 "AI 가 알아서 본다" 고 믿고 기준을 안 들여다본다.
 *     실제로는 설정에서 그 기준을 직접 바꿀 수 있고, 바꿔야 맞는다.
 *   - 나중에 진짜 모델을 붙였을 때, 무엇이 달라졌는지 말할 수가 없다.
 *
 * 그래서 라벨을 지우지 않고 **옆에 사실을 붙인다.** 눌러야 펴지므로
 * 평소 화면은 조용하고, 궁금한 사람은 한 번에 확인한다.
 */

import { useId, useState } from "react";
import { SparkIcon } from "./icons";

/** 규칙으로 계산되는 값 — 화면마다 다르게 적는다 */
export type AiSubject = "priority" | "insight" | "date" | "opportunity";

const WHAT: Record<AiSubject, string> = {
  priority:
    "고객 목록의 추천 순서는 마지막 방문 이후 경과일 · 평균 이용주기 · 잔여 이용권 · 미방문 기간을 정해진 기준으로 계산해 매깁니다.",
  insight:
    "이 고객을 지금 챙겨야 하는 이유는 방문 간격 · 잔여 회차 · 이용권 만료일을 매장이 정한 기준과 대조해 뽑은 것입니다.",
  date: "추천 방문일은 이 고객의 지난 방문 간격 평균으로 계산한 참고일입니다.",
  opportunity:
    "매출기회 표시는 설정의 「AX 매출기회 기준」에 적힌 잔여 회차 · 경과일 조건에 걸린 경우에만 나옵니다.",
};

/**
 * @param subject 이 화면에서 규칙이 만드는 값이 무엇인지
 * @param align   펼친 설명이 붙는 방향 (좁은 자리에서는 오른쪽 정렬)
 */
export default function AiReadyNote({
  subject,
  className = "",
}: {
  subject: AiSubject;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();

  return (
    <span className={`inline-flex flex-col items-start ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={id}
        className="tap-line inline-flex items-center gap-1 rounded-full bg-aqua-50 px-2 py-0.5 text-[0.6875rem] font-extrabold tracking-wide text-aqua-800 ring-1 ring-aqua-200 transition-colors hover:bg-aqua-100"
      >
        <SparkIcon className="h-3 w-3 shrink-0" />
        AI READY
      </button>

      {open && (
        <span
          id={id}
          className="mt-1.5 block max-w-prose rounded-card bg-card-soft px-3 py-2.5 text-[0.8125rem] leading-relaxed text-ink-soft ring-1 ring-stone-line"
        >
          <b className="block text-ink">현재 — 규칙 기반으로 계산합니다</b>
          {WHAT[subject]}
          <b className="mt-2 block text-ink">앞으로 — 모델 연결 자리</b>
          같은 자리에 언어모델(GPT · Claude 등)을 연결하면, 상담 메모의 문장까지
          함께 읽어 판단합니다. 지금은 연결되어 있지 않으며, 화면에 보이는 값은
          모두 매장이 설정에서 바꿀 수 있는 기준으로만 나온 것입니다.
        </span>
      )}
    </span>
  );
}
