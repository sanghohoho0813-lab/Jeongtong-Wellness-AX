"use client";

/**
 * 몇 개 중 하나 고르기 — 누르는 칩 (D-61)
 * ======================================
 *
 * 방문 기록 창의 「이용 프로그램」 「이용권 사용」 「담당 직원」 이 폰의
 * 기본 고르기 칸(select)이었다. 칸을 누르면 폰마다 다른 휠 · 목록이
 * 올라오고, 고르고, 「완료」 를 또 눌러야 했다 — 한 번 고르는 데 세 번.
 * 고를 것이 서너 개뿐인데 목록을 감춰 둘 이유가 없다.
 *
 * 그래서 고를 것이 적으면(기본 6개 이하) 다 펼쳐 둔 칩으로 — 한 번에
 * 고르고, 무엇이 골라져 있는지 늘 보인다. 많으면 지금처럼 고르기 칸.
 *
 * 화면 읽기 프로그램에는 라디오 묶음(radiogroup)으로 읽히고, 키보드는
 * ← → 로 옮겨 고른다.
 */

import { KeyboardEvent, ReactNode, useRef } from "react";
import { inputCls } from "./index";

export interface Choice<T extends string> {
  value: T;
  label: ReactNode;
  /** 칩 안 둘째 줄 — 「잔여 6회」 같은 것 */
  sub?: ReactNode;
  /** 고르기 칸으로 그릴 때 쓰는 글자 (label 이 글자가 아닐 때) */
  text?: string;
}

export default function ChoiceChips<T extends string>({
  label,
  value,
  options,
  onChange,
  dataField,
  disabled,
  maxChips = 6,
}: {
  /** 묶음 이름 — 화면 읽기 · 검사가 찾는 이름 */
  label: string;
  value: T;
  options: Choice<T>[];
  onChange: (v: T) => void;
  /** data-field 표식 */
  dataField?: string;
  disabled?: boolean;
  maxChips?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  if (options.length > maxChips) {
    return (
      <select
        data-field={dataField}
        aria-label={label}
        className={inputCls}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value as T)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.text ?? (typeof o.label === "string" ? o.label : o.value)}
          </option>
        ))}
      </select>
    );
  }

  const idx = Math.max(0, options.findIndex((o) => o.value === value));
  const onKey = (e: KeyboardEvent) => {
    const dir = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!dir) return;
    e.preventDefault();
    const next = (idx + dir + options.length) % options.length;
    onChange(options[next].value);
    ref.current?.querySelectorAll<HTMLButtonElement>("[role=radio]")[next]?.focus();
  };

  return (
    <div
      ref={ref}
      role="radiogroup"
      aria-label={label}
      aria-disabled={disabled || undefined}
      data-field={dataField}
      data-choice-chips
      onKeyDown={onKey}
      className="flex flex-wrap gap-2"
    >
      {options.map((o, i) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={i === idx ? 0 : -1}
            disabled={disabled}
            onClick={() => onChange(o.value)}
            className={`press flex min-h-[44px] flex-col items-start justify-center rounded-2xl px-4 py-1.5 text-left ring-1 disabled:opacity-50 ${
              on
                ? "bg-sel text-sel-ink shadow-sm ring-transparent"
                : "bg-card text-ink-soft ring-stone-line hover:bg-aqua-50"
            }`}
          >
            <span className="text-[0.9375rem] font-bold leading-snug">{o.label}</span>
            {o.sub && (
              <span className={`nowrap-num text-[0.75rem] font-bold leading-tight ${on ? "opacity-85" : "text-ink-sub"}`}>
                {o.sub}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
