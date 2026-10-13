"use client";

/**
 * 접는 칸 — 제목만 두고, 필요할 때 편다
 * ===================================
 *
 * 대표님 말씀: 「글씨가 너무 많으면 안 돼. 접어 뒀다가 펼치고, 커서를 갖다
 * 대면 무슨 기능인지 딱 보이게 — 펼칠지 말지 결정할 수 있게.」
 *
 *   ┌──────────────────────────────────────┐
 *   │ [아이콘]  주요 케어 부위   2곳      ⌄ │  ← 마우스를 올리면 말풍선
 *   └──────────────────────────────────────┘
 *
 * - 칸 아래에 늘 적혀 있던 설명 글은 지운다. 그 설명은 말풍선(PC)과
 *   ⓘ(폰 — 누르면 제목 아래에 한 줄)로 옮긴다.
 * - 제목 옆 작은 숫자(badge)로 「펼치면 무엇이 얼마나 있는지」 를 먼저 보인다.
 * - 한 번 편 칸은 그 기기에서 다음에도 펴진 채로 연다 (id 로 기억).
 * - 접혀 있어도 안의 내용은 그려 둔다(숨김). 「사용 방법」 투어가 접힌 칸
 *   안을 가리키면 그 칸을 스스로 편다 (data-fold · fold:open).
 */

import { ReactNode, useEffect, useId, useRef, useState } from "react";
import { Hint } from "./Hint";
import { ChevronRightIcon } from "./icons";

const KEY = (id: string) => `jeongtong-fold:${id}`;

/** ⓘ — 폰에서 설명을 그 자리에 펴는 단추. PC 에서는 올리면 말풍선 */
export function InfoButton({
  text,
  title,
  open,
  onToggle,
  className = "",
}: {
  text: ReactNode;
  title?: string;
  open: boolean;
  onToggle: () => void;
  className?: string;
}) {
  return (
    <Hint text={text} title={title}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        aria-expanded={open}
        aria-label={`${title ?? ""} 설명 ${open ? "닫기" : "보기"}`.trim()}
        data-info
        className={`-m-2 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-ink-faint transition-colors hover:text-aqua-700 ${className}`}
      >
        {/* 「i」 는 글자가 아니라 그림으로 — 제목 글(innerText)에 「i」 가 섞이지 않게 */}
        <span
          aria-hidden
          className={`flex h-[1.15rem] w-[1.15rem] items-center justify-center rounded-full border-[1.5px] text-[0.6875rem] font-extrabold leading-none before:content-['i'] ${
            open ? "border-aqua-700 bg-aqua-700 text-white" : "border-current"
          }`}
        />
      </button>
    </Hint>
  );
}

export function Fold({
  id,
  title,
  hint,
  icon,
  badge,
  action,
  defaultOpen = false,
  dataTour,
  className = "",
  bodyClassName = "",
  variant = "card",
  children,
}: {
  /** 기억할 이름 — 화면 안에서 겹치지 않게 (예: "detail-bodymap") */
  id: string;
  title: ReactNode;
  /** 무엇이 들어 있는지 — 말풍선과 ⓘ 에 쓴다 */
  hint: string;
  icon?: ReactNode;
  /** 제목 옆 작은 값 — 「2곳」 「3명」 처럼 펼치기 전에 알 것 */
  badge?: ReactNode;
  /** 펼쳤을 때만 제목 오른쪽에 붙는 단추 (예: 「이용권 등록」) */
  action?: ReactNode;
  defaultOpen?: boolean;
  dataTour?: string;
  className?: string;
  bodyClassName?: string;
  /** plain — 안에 카드가 여러 장 들어갈 때. 제목 줄만 카드 모양이고, 펼친 몸은 바탕 위에 */
  variant?: "card" | "plain";
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [info, setInfo] = useState(false);
  const bodyId = `${useId()}-body`;
  const ref = useRef<HTMLDivElement>(null);
  const label = typeof title === "string" ? title : undefined;

  useEffect(() => {
    try {
      const v = localStorage.getItem(KEY(id));
      if (v === "1") setOpen(true);
      else if (v === "0") setOpen(false);
    } catch {
      /* 기억 못 하면 기본값대로 */
    }
  }, [id]);

  // 투어 · 바로가기가 「안을 보여 줘」 하면 편다 (기억은 바꾸지 않는다)
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reveal = () => setOpen(true);
    el.addEventListener("fold:open", reveal);
    return () => el.removeEventListener("fold:open", reveal);
  }, []);

  const toggle = () => {
    setOpen((v) => {
      try {
        localStorage.setItem(KEY(id), v ? "0" : "1");
      } catch {
        /* 지금 화면만 바뀐다 */
      }
      return !v;
    });
  };

  return (
    <section
      ref={ref}
      data-fold={id}
      data-open={open ? "true" : "false"}
      data-tour={dataTour}
      className={`${variant === "card" ? "rounded-card bg-card shadow-card ring-1 ring-stone-line" : ""} ${className}`}
    >
      <div
        className={`flex items-center gap-2 px-4 sm:px-5 ${
          variant === "plain" ? "rounded-card bg-card shadow-card ring-1 ring-stone-line" : ""
        }`}
      >
        <Hint text={hint} title={label}>
          <button
            type="button"
            onClick={toggle}
            aria-expanded={open}
            aria-controls={bodyId}
            className="flex min-h-[3.75rem] min-w-0 flex-1 items-center gap-3 py-2 text-left"
          >
            {icon && (
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-aqua-50 text-aqua-700 ring-1 ring-aqua-100 dark:text-aqua-400">
                {icon}
              </span>
            )}
            <span className="min-w-0 truncate text-[1.0625rem] font-extrabold text-ink">
              {title}
            </span>
            {badge !== undefined && badge !== null && badge !== "" && (
              <span className="nowrap-num shrink-0 rounded-full bg-stone-bg px-2.5 py-0.5 text-[0.8125rem] font-bold text-ink-sub ring-1 ring-stone-line">
                {badge}
              </span>
            )}
            <ChevronRightIcon
              className={`ml-auto h-5 w-5 shrink-0 text-ink-faint transition-transform ${
                open ? "-rotate-90" : "rotate-90"
              }`}
            />
          </button>
        </Hint>
        {/* 폰에는 「올리기」 가 없다 — ⓘ 를 누르면 제목 아래 한 줄로 */}
        <span className="[@media(hover:hover)]:hidden">
          <InfoButton text={hint} title={label} open={info} onToggle={() => setInfo((v) => !v)} />
        </span>
        {open && action && <div className="shrink-0">{action}</div>}
      </div>
      {info && (
        <p className="-mt-1 px-4 pb-3 text-[0.875rem] leading-snug text-ink-sub sm:px-5">
          {hint}
        </p>
      )}
      <div
        id={bodyId}
        hidden={!open}
        className={`${variant === "card" ? "px-4 pb-4 sm:px-5 sm:pb-5" : "pt-4"} ${bodyClassName}`}
      >
        {children}
      </div>
    </section>
  );
}

/** 투어 등에서 — 이 요소를 감싼 접힌 칸들을 모두 편다. 폈으면 true */
export function revealInFolds(el: Element | null): boolean {
  let opened = false;
  let node = el?.closest('[data-fold][data-open="false"]');
  while (node) {
    node.dispatchEvent(new Event("fold:open"));
    opened = true;
    node = node.parentElement?.closest('[data-fold][data-open="false"]') ?? null;
  }
  return opened;
}
