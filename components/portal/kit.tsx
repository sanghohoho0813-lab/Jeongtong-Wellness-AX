"use client";

/**
 * MY WELLNESS 부품 — 생활 앱처럼 보이고, 생활 앱처럼 눌리게
 * =========================================================
 *
 * 대표님이 보여 주신 본보기는 배달 · 적립 앱(talabat · Rakuten)이다.
 * 우리 고객(40~60대)이 매일 쓰는 앱이 그런 모양이라, 같은 모양이면
 * 처음 열어도 어디를 누를지 안다. 그 앱들에서 가져온 것은 일곱 가지다.
 *
 *   1. 칸 제목 + 오른쪽 「전체 보기 ›」            Section
 *   2. 둥근 알약 단추 (꽉 찬 · 연한 · 테두리)       PillLink · PillButton
 *   3. 상태 알약 (확인 중 · 이용 완료 …)            StatusPill
 *   4. 아이콘 바로가기 칸 (네 칸씩)                 QuickGrid
 *   5. 옆으로 넘기는 카드 줄                       HScroll
 *   6. 아이콘 · 제목 · 한 줄 · › 목록               ListGroup · ListRow
 *   7. 하단 탭 바로 위에 붙는 고정 단추             StickyBar
 *
 * 색은 우리 것(딥그린 · 금색 · 아쿠아)을 그대로 쓴다. 모양만 가져온다.
 */

import Link from "next/link";
import { ReactNode } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/ui/icons";

/* ── 쪽 제목 ───────────────────────────────────────────── */

/** 화면 이름. 하단 탭에 없는 화면은 뒤로 가는 길(back)을 함께 둔다 */
export function PageHead({
  title,
  sub,
  back,
  action,
}: {
  title: string;
  sub?: ReactNode;
  back?: { href: string; label: string };
  action?: ReactNode;
}) {
  return (
    <div className="px-1">
      {back && (
        <Link
          href={back.href}
          className="tap-line -ml-2 mb-0.5 inline-flex items-center gap-0.5 rounded-full px-2 text-[0.9375rem] font-bold text-ink-sub transition-colors hover:text-ink"
        >
          <ChevronLeftIcon className="h-5 w-5" />
          {back.label}
        </Link>
      )}
      <div className="flex items-center justify-between gap-3">
        <h1 className="min-w-0 text-[1.5rem] font-extrabold leading-tight tracking-tight text-ink [word-break:keep-all]">
          {title}
        </h1>
        {action}
      </div>
      {sub && (
        <p className="mt-1 text-[0.9375rem] leading-relaxed text-ink-sub">{sub}</p>
      )}
    </div>
  );
}

/* ── 칸 제목 + 「전체 보기 ›」 ──────────────────────────── */

export function Section({
  title,
  sub,
  more,
  children,
  className = "",
}: {
  title: ReactNode;
  sub?: ReactNode;
  more?: { href: string; label?: string };
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={className}>
      <div className="mb-2.5 flex items-end justify-between gap-3 px-1">
        <div className="min-w-0">
          <h2 className="text-[1.125rem] font-extrabold leading-tight tracking-tight text-ink [word-break:keep-all]">
            {title}
          </h2>
          {sub && (
            <p className="mt-0.5 text-[0.875rem] leading-snug text-ink-sub">{sub}</p>
          )}
        </div>
        {more && (
          <Link
            href={more.href}
            className="tap-line inline-flex shrink-0 items-center gap-0.5 text-[0.875rem] font-bold text-aqua-700 transition-colors hover:text-aqua-800"
          >
            {more.label ?? "전체 보기"}
            <ChevronRightIcon className="h-4 w-4" />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

/* ── 흰 판 ─────────────────────────────────────────────── */

export function Panel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-[20px] bg-card p-4 shadow-card ring-1 ring-black/[0.04] dark:ring-white/[0.06] ${className}`}
    >
      {children}
    </div>
  );
}

/* ── 알약 단추 ─────────────────────────────────────────── */

export type PillTone = "primary" | "soft" | "outline" | "onDark" | "ghostDark";

const PILL: Record<PillTone, string> = {
  primary:
    "bg-gradient-to-b from-aqua-650 to-aqua-850 text-white shadow-[0_4px_14px_rgba(14,127,125,0.30)] hover:from-aqua-850 hover:to-deep-700 disabled:from-ink-faint disabled:to-ink-faint disabled:shadow-none",
  soft: "bg-aqua-50 text-aqua-800 ring-1 ring-aqua-100 hover:bg-aqua-100 dark:bg-aqua-500/10 dark:ring-aqua-500/20",
  outline: "bg-card text-ink ring-1 ring-stone-line hover:bg-stone-bg",
  onDark: "bg-white text-deep-900 shadow-[0_4px_14px_rgba(0,0,0,0.18)] hover:bg-aqua-50",
  ghostDark: "bg-white/10 text-white ring-1 ring-white/25 hover:bg-white/20",
};

const PILL_SIZE = {
  md: "min-h-[44px] px-4 text-[0.9375rem]",
  lg: "min-h-[52px] px-5 text-[1.0625rem]",
};

function pillCls(tone: PillTone, size: "md" | "lg", full?: boolean, between?: boolean) {
  return `inline-flex items-center gap-1.5 rounded-full font-extrabold transition-colors ${
    between ? "justify-between" : "justify-center"
  } ${full ? "w-full" : ""} ${PILL[tone]} ${PILL_SIZE[size]}`;
}

export function PillLink({
  href,
  children,
  tone = "primary",
  size = "lg",
  full,
  between,
  className = "",
  ariaLabel,
}: {
  href: string;
  children: ReactNode;
  tone?: PillTone;
  size?: "md" | "lg";
  full?: boolean;
  /** 글은 왼쪽 · › 는 오른쪽 */
  between?: boolean;
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <Link
      href={href}
      aria-label={ariaLabel}
      className={`${pillCls(tone, size, full, between)} ${className}`}
    >
      {children}
    </Link>
  );
}

export function PillButton({
  children,
  onClick,
  tone = "primary",
  size = "lg",
  full,
  disabled,
  type = "button",
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  tone?: PillTone;
  size?: "md" | "lg";
  full?: boolean;
  disabled?: boolean;
  type?: "button" | "submit";
  className?: string;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${pillCls(tone, size, full)} ${className}`}
    >
      {children}
    </button>
  );
}

/* ── 상태 알약 ─────────────────────────────────────────── */

export type StatusTone = "done" | "wait" | "warn" | "muted" | "onDark";

const STATUS: Record<StatusTone, string> = {
  done: "bg-emerald-50 text-positive-text ring-emerald-100 dark:bg-emerald-400/10 dark:ring-emerald-400/20",
  wait: "bg-aqua-50 text-aqua-800 ring-aqua-100 dark:bg-aqua-500/10 dark:ring-aqua-500/20",
  warn: "bg-gold-soft text-gold-deep ring-gold/25",
  muted: "bg-stone-bg-deep text-ink-sub ring-black/[0.04] dark:ring-white/10",
  onDark: "bg-white/15 text-white ring-white/25",
};

export function StatusPill({
  tone,
  children,
  className = "",
}: {
  tone: StatusTone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`nowrap-num inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-[0.8125rem] font-extrabold ring-1 ${STATUS[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

/* ── 바로가기 칸 (네 칸씩) ──────────────────────────────── */

export interface QuickItem {
  href: string;
  label: string;
  icon: ReactNode;
  tone?: "aqua" | "gold" | "deep" | "stone";
  /** 칸 귀퉁이 작은 숫자 — 배달 앱 칸의 「Up to 60%」 자리. 저장된 사실만 (남은 횟수 등) */
  badge?: string;
}

const QUICK_TONE = {
  aqua: "bg-aqua-50 text-aqua-700 ring-aqua-100 dark:bg-aqua-500/10 dark:text-aqua-300 dark:ring-aqua-500/20",
  gold: "bg-gold-soft text-gold-deep ring-gold/20",
  deep: "bg-gradient-to-br from-deep-700 to-deep-900 text-gold ring-black/10",
  stone: "bg-stone-bg-deep text-ink-soft ring-black/[0.04] dark:ring-white/10",
};

export function QuickGrid({ items }: { items: QuickItem[] }) {
  return (
    <nav aria-label="바로가기">
      <ul className="grid grid-cols-4 gap-x-1.5 gap-y-3.5">
        {items.map((it) => (
          <li key={it.href} className="min-w-0">
            <Link
              href={it.href}
              data-quick={it.href}
              className="group flex flex-col items-center gap-1.5 rounded-2xl py-1 text-center"
            >
              <span
                className={`relative flex h-14 w-14 items-center justify-center rounded-2xl ring-1 transition-transform group-hover:-translate-y-0.5 group-active:scale-95 ${
                  QUICK_TONE[it.tone ?? "aqua"]
                }`}
              >
                {it.icon}
                {it.badge && (
                  <span className="nowrap-num absolute -right-2 -top-2 rounded-full bg-gold-deep px-1.5 py-px text-[0.6875rem] font-extrabold leading-tight text-white ring-2 ring-card dark:text-deep-900">
                    {it.badge}
                  </span>
                )}
              </span>
              <span className="w-full text-[0.8125rem] font-bold leading-tight text-ink-soft [word-break:keep-all]">
                {it.label}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/* ── 옆으로 넘기는 줄 ──────────────────────────────────── */

/**
 * 카드가 화면 끝까지 이어져 보여야 「옆으로 더 있다」 가 읽힌다 —
 * 그래서 바깥 여백(-mx-4)을 지우고 안쪽 여백(px-4)으로 첫 카드를 맞춘다.
 */
export function HScroll({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  return (
    <ul
      aria-label={label}
      className="no-scrollbar -mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-2 pt-0.5"
    >
      {children}
    </ul>
  );
}

/** HScroll 안의 카드 한 장 */
export function HCard({
  href,
  children,
  className = "",
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <li className="w-[14.5rem] shrink-0 snap-start">
      <Link
        href={href}
        className={`flex h-full flex-col rounded-[20px] bg-card p-4 shadow-card ring-1 ring-black/[0.04] transition-transform hover:-translate-y-0.5 dark:ring-white/[0.06] ${className}`}
      >
        {children}
      </Link>
    </li>
  );
}

/* ── 목록 ──────────────────────────────────────────────── */

export function ListGroup({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <ul
      className={`divide-y divide-stone-line overflow-hidden rounded-[20px] bg-card shadow-card ring-1 ring-black/[0.04] dark:ring-white/[0.06] ${className}`}
    >
      {children}
    </ul>
  );
}

export function ListRow({
  href,
  onClick,
  icon,
  title,
  sub,
  right,
  chevron = true,
  danger,
  expanded,
}: {
  href?: string;
  onClick?: () => void;
  icon?: ReactNode;
  title: ReactNode;
  sub?: ReactNode;
  right?: ReactNode;
  chevron?: boolean;
  danger?: boolean;
  /** 펴고 접는 줄이면 지금 펴졌는지 (읽어 주는 프로그램에 알린다) */
  expanded?: boolean;
}) {
  const body = (
    <>
      {icon && (
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-stone-bg-deep text-ink-soft ring-1 ring-black/[0.04] dark:ring-white/10">
          {icon}
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span
          className={`block break-words text-[1rem] font-bold leading-snug ${
            danger ? "text-danger-text" : "text-ink"
          }`}
        >
          {title}
        </span>
        {sub && (
          <span className="mt-0.5 block break-words text-[0.875rem] leading-snug text-ink-sub">
            {sub}
          </span>
        )}
      </span>
      {right && <span className="shrink-0">{right}</span>}
      {chevron && (href || onClick) && (
        <ChevronRightIcon className="h-5 w-5 shrink-0 text-ink-faint" />
      )}
    </>
  );
  const cls =
    "flex min-h-[60px] w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-card-soft";
  return (
    <li>
      {href ? (
        <Link href={href} className={cls}>
          {body}
        </Link>
      ) : onClick ? (
        <button type="button" onClick={onClick} aria-expanded={expanded} className={cls}>
          {body}
        </button>
      ) : (
        <div className={cls}>{body}</div>
      )}
    </li>
  );
}

/* ── 아래 고정 단추 ────────────────────────────────────── */

/**
 * 하단 탭 바로 위에 붙는다 (배달 앱의 「담기 · 주문하기」 자리).
 * 화면이 길어도 할 일 단추는 늘 엄지 아래에 있다.
 * 마지막 내용이 단추에 가리지 않게 하는 여백은 PortalShell 의 <main> 이
 * 이 단추를 보고(:has([data-sticky-bar])) 스스로 늘린다.
 */
export function StickyBar({ children }: { children: ReactNode }) {
  return (
    <>
      <div
        data-sticky-bar
        className="fixed inset-x-0 bottom-[calc(3.75rem+env(safe-area-inset-bottom))] z-20 border-t border-black/[0.05] bg-card/95 px-4 py-3 backdrop-blur-md dark:border-white/10"
      >
        <div className="mx-auto max-w-lg">{children}</div>
      </div>
    </>
  );
}

/* ── 빈 자리 ───────────────────────────────────────────── */

export function EmptyLine({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-[20px] border border-dashed border-stone-line bg-card-soft px-4 py-6 text-center text-[0.9375rem] text-ink-sub">
      {children}
    </p>
  );
}
