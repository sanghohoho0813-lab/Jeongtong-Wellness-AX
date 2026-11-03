"use client";

/**
 * 금액 칸 — 쉼표 · 「원」 · 가격표에서 한 번에 (D-61)
 * ================================================
 *
 * 결제 금액 칸은 숫자만 받는 빈 칸이었다. 「450000」 을 치면 0 이 몇
 * 개인지 세어 봐야 했고(45만? 4만5천?), 같은 1회 가격을 매번 손으로 쳤다.
 *
 *   · 치는 대로 쉼표가 들어간다 (450,000) — 끝에 「원」
 *   · 숫자 아래에 한글 읽기 한 줄 (45만 원) — 0 을 세지 않아도 된다
 *   · 매장 가격표(설정 → 서비스 · 이용권 상품)에 있는 값은 칩으로 한 번에.
 *     가격표에 없는 값은 만들지 않는다 (지어내지 않는다).
 *
 * 값은 쉼표 없는 숫자 문자열로 주고받는다 (부모는 지금처럼 저장).
 */

import { ReactNode } from "react";
import { inputCls } from "./index";

/** 450000 → 「45만 원」, 1200000 → 「120만 원」, 45500 → 「4만 5,500원」 */
export function koreanWon(n: number): string {
  if (!n) return "";
  const man = Math.floor(n / 10000);
  const rest = n % 10000;
  if (!man) return `${rest.toLocaleString("ko-KR")}원`;
  return rest ? `${man.toLocaleString("ko-KR")}만 ${rest.toLocaleString("ko-KR")}원` : `${man.toLocaleString("ko-KR")}만 원`;
}

export default function MoneyInput({
  value,
  onChange,
  label,
  presets = [],
  placeholder = "예: 60,000",
}: {
  /** 쉼표 없는 숫자 문자열 ("" 은 비어 있음) */
  value: string;
  onChange: (digits: string) => void;
  label: string;
  /** 가격표에서 온 값 — { label: "1회", amount: 45000 } */
  presets?: { label: ReactNode; amount: number }[];
  placeholder?: string;
}) {
  const n = value ? Number(value) : 0;
  return (
    <div data-money-input>
      <div className="relative">
        <input
          className={`${inputCls} tabular pr-10 text-right text-[1.0625rem] font-bold`}
          aria-label={label}
          value={n ? n.toLocaleString("ko-KR") : ""}
          onChange={(e) => onChange(e.target.value.replace(/\D/g, "").replace(/^0+/, ""))}
          placeholder={placeholder}
          inputMode="numeric"
          enterKeyHint="done"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[0.9375rem] font-bold text-ink-sub"
        >
          원
        </span>
      </div>
      {n > 0 && (
        <p data-money-read className="mt-1 text-right text-[0.8125rem] font-bold text-ink-sub">
          {koreanWon(n)}
        </p>
      )}
      {presets.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {presets.map((p) => {
            const on = n === p.amount;
            return (
              <button
                key={p.amount}
                type="button"
                aria-pressed={on}
                onClick={() => onChange(on ? "" : String(p.amount))}
                className={`press touch-target inline-flex items-center gap-1.5 rounded-full px-3.5 text-[0.875rem] font-bold ring-1 ${
                  on
                    ? "bg-sel text-sel-ink ring-transparent"
                    : "bg-card text-ink-soft ring-stone-line hover:bg-aqua-50"
                }`}
              >
                {p.label}
                <span className="nowrap-num tabular">{p.amount.toLocaleString("ko-KR")}원</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
