"use client";

import { ReactNode } from "react";
import { CustomerStatus, TaskStatus } from "@/lib/types";
import { XIcon } from "./icons";

// ---------- Card ----------

export function Card({
  children,
  className = "",
  onClick,
  lift = true,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  /** hover 시 살짝 떠오르는 입체 효과 (기본 on) */
  lift?: boolean;
}) {
  return (
    <div
      onClick={onClick}
      className={`card ${lift ? "card-lift" : ""} ${onClick ? "cursor-pointer" : ""} ${className}`}
    >
      {children}
    </div>
  );
}

/** Deep Teal Hero Card — 화면의 대표 강조 영역에만 사용 */
export function HeroCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`card-hero ${className}`}>{children}</div>;
}

/** 섹션 아이콘 타일 색상 */
export type IconTone =
  | "aqua"
  | "teal"
  | "sky"
  | "violet"
  | "amber"
  | "emerald"
  | "gold"
  | "gray";

export const ICON_TONE_CLASS: Record<IconTone, string> = {
  aqua: "bg-aqua-50 text-aqua-700 ring-aqua-100",
  teal: "bg-deep-700/10 text-deep-700 ring-deep-700/15 dark:text-aqua-400",
  sky: "bg-sky-500/10 text-sky-600 ring-sky-500/15 dark:text-sky-300",
  violet:
    "bg-violet-500/10 text-violet-600 ring-violet-500/15 dark:text-violet-300",
  amber: "bg-amber-400/15 text-amber-600 ring-amber-400/20 dark:text-amber-300",
  emerald:
    "bg-emerald-500/10 text-emerald-600 ring-emerald-500/15 dark:text-emerald-300",
  gold: "bg-gold-soft text-gold-deep ring-gold/20",
  gray: "bg-stone-bg-deep text-ink-sub ring-black/[0.04]",
};

export function SectionTitle({
  children,
  action,
  icon,
  tone = "aqua",
  className = "",
}: {
  children: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
  tone?: IconTone;
  className?: string;
}) {
  return (
    <div className={`mb-4 flex items-center justify-between gap-3 ${className}`}>
      <h2 className="text-section-title flex min-w-0 items-center gap-2.5 text-ink">
        {icon && (
          <span
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ring-1 ${ICON_TONE_CLASS[tone]}`}
          >
            {icon}
          </span>
        )}
        <span className="min-w-0">{children}</span>
      </h2>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

// ---------- Button ----------

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger-ghost" | "on-dark";

export function Button({
  children,
  onClick,
  variant = "primary",
  className = "",
  type = "button",
  disabled,
  size = "md",
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: ButtonVariant;
  className?: string;
  type?: "button" | "submit";
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
}) {
  const variants: Record<ButtonVariant, string> = {
    primary:
      "bg-gradient-to-b from-aqua-500 to-aqua-700 text-white shadow-[0_2px_8px_rgba(14,127,125,0.35),inset_0_1px_0_rgba(255,255,255,0.25)] hover:from-aqua-600 hover:to-aqua-800 disabled:from-ink-faint disabled:to-ink-faint disabled:shadow-none",
    secondary:
      "bg-aqua-50 text-aqua-800 ring-1 ring-aqua-200 hover:bg-aqua-100",
    ghost: "bg-transparent text-ink-sub hover:bg-stone-bg-deep",
    "danger-ghost": "bg-transparent text-danger hover:bg-red-50 dark:hover:bg-red-400/10",
    "on-dark":
      "bg-white/10 text-white ring-1 ring-white/25 backdrop-blur-sm hover:bg-white/20",
  };
  const sizes = {
    sm: "px-3.5 py-1.5 text-sm",
    md: "px-4 py-2.5 text-[0.9375rem]",
    lg: "px-5 py-3 text-base",
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-1.5 rounded-btn font-bold whitespace-nowrap transition-all touch-target ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {children}
    </button>
  );
}

// ---------- Badge / Status system ----------

export type BadgeTone =
  | "aqua"
  | "gray"
  | "gold"
  | "warn"
  | "danger"
  | "positive"
  | "sky"
  | "violet"
  | "outline"
  | "on-dark";

const BADGE_TONES: Record<BadgeTone, { bg: string; dot: string }> = {
  aqua: { bg: "bg-aqua-100 text-aqua-800", dot: "bg-aqua-500" },
  gray: { bg: "bg-stone-bg-deep text-ink-sub", dot: "bg-ink-faint" },
  gold: { bg: "bg-gold-soft text-gold-deep", dot: "bg-gold" },
  warn: {
    bg: "bg-amber-50 text-amber-700 ring-1 ring-amber-100 dark:bg-amber-400/10 dark:text-amber-300 dark:ring-amber-400/20",
    dot: "bg-warn",
  },
  danger: {
    bg: "bg-red-50 text-red-700 ring-1 ring-red-100 dark:bg-red-400/10 dark:text-red-300 dark:ring-red-400/20",
    dot: "bg-danger",
  },
  positive: {
    bg: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-400/10 dark:text-emerald-300 dark:ring-emerald-400/20",
    dot: "bg-positive",
  },
  sky: {
    bg: "bg-sky-50 text-sky-700 ring-1 ring-sky-100 dark:bg-sky-400/10 dark:text-sky-300 dark:ring-sky-400/20",
    dot: "bg-sky-500",
  },
  violet: {
    bg: "bg-violet-50 text-violet-700 ring-1 ring-violet-100 dark:bg-violet-400/10 dark:text-violet-300 dark:ring-violet-400/20",
    dot: "bg-violet-500",
  },
  outline: { bg: "ring-1 ring-aqua-200 text-aqua-800", dot: "bg-aqua-500" },
  "on-dark": { bg: "bg-white/15 text-white ring-1 ring-white/20", dot: "bg-aqua-300" },
};

export function Badge({
  children,
  tone = "aqua",
  dot = false,
  className = "",
}: {
  children: ReactNode;
  tone?: BadgeTone;
  dot?: boolean;
  className?: string;
}) {
  const t = BADGE_TONES[tone];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold whitespace-nowrap ${t.bg} ${className}`}
    >
      {dot && <span className={`h-1.5 w-1.5 rounded-full ${t.dot}`} />}
      {children}
    </span>
  );
}

const STATUS_TONE: Record<CustomerStatus, { label: string; tone: BadgeTone }> = {
  new: { label: "신규", tone: "aqua" },
  active: { label: "활성", tone: "positive" },
  at_risk: { label: "관리 필요", tone: "warn" },
  dormant: { label: "장기 미방문", tone: "danger" },
};

export function CustomerStatusBadge({ status }: { status: CustomerStatus }) {
  const t = STATUS_TONE[status];
  return (
    <Badge tone={t.tone} dot>
      {t.label}
    </Badge>
  );
}

const TASK_STATUS_TONE: Record<TaskStatus, { label: string; tone: BadgeTone }> = {
  pending: { label: "대기", tone: "gray" },
  confirmed: { label: "확인", tone: "aqua" },
  done: { label: "처리완료", tone: "positive" },
  hold: { label: "보류", tone: "warn" },
};

/**
 * AI 추천 등급 — Priority Score를 숫자로 노출하지 않고 행동 단계로 표시한다.
 * (점수 계산 로직은 그대로, 표기만 등급으로 변환)
 */
export function recommendLevel(score: number) {
  if (score >= 60)
    return {
      label: "AI 추천 · 우선",
      short: "우선 연락",
      chip: "bg-gradient-to-r from-red-500 to-danger text-white",
      text: "text-danger",
    };
  if (score >= 35)
    return {
      label: "AI 추천 · 관리",
      short: "관리 권장",
      chip: "bg-gradient-to-r from-amber-400 to-warn text-white",
      text: "text-warn",
    };
  return {
    label: "AI 추천 · 관찰",
    short: "관찰",
    chip: "bg-gradient-to-r from-aqua-500 to-deep-700 text-white",
    text: "text-aqua-700",
  };
}

/** AI 추천 등급 칩 (관리 대상일 때만 사용) */
export function RecommendBadge({ score }: { score: number }) {
  const r = recommendLevel(score);
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-extrabold shadow-sm ${r.chip}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-white/70" />
      {r.label}
    </span>
  );
}

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  const t = TASK_STATUS_TONE[status];
  return (
    <Badge tone={t.tone} dot>
      {t.label}
    </Badge>
  );
}

// ---------- KPI ----------

export type KpiTint = "aqua" | "sky" | "emerald" | "amber" | "violet";

const KPI_TINTS: Record<KpiTint, string> = {
  aqua: "bg-aqua-50 text-aqua-700 ring-aqua-100",
  sky: "bg-sky-500/10 text-sky-600 ring-sky-500/20 dark:text-sky-300",
  emerald:
    "bg-emerald-500/10 text-emerald-600 ring-emerald-500/20 dark:text-emerald-300",
  amber: "bg-amber-400/15 text-amber-600 ring-amber-400/25 dark:text-amber-300",
  violet:
    "bg-violet-500/10 text-violet-600 ring-violet-500/20 dark:text-violet-300",
};

/** KPI 상단 액센트 바 색 — 카드마다 다른 성격을 색으로 구분 */
const KPI_BARS: Record<KpiTint, string> = {
  aqua: "from-aqua-400 to-deep-700",
  sky: "from-sky-400 to-sky-600",
  emerald: "from-emerald-400 to-emerald-600",
  amber: "from-amber-300 to-amber-500",
  violet: "from-violet-400 to-violet-600",
};

export function KpiCard({
  label,
  value,
  unit,
  sub,
  icon,
  chart,
  tint = "aqua",
}: {
  label: string;
  value: ReactNode;
  unit?: string;
  sub?: ReactNode;
  icon?: ReactNode;
  chart?: ReactNode;
  tint?: KpiTint;
}) {
  return (
    <Card className="group relative min-w-0 overflow-hidden !p-4 sm:!p-5">
      <span
        className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${KPI_BARS[tint]}`}
      />
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 truncate text-[0.8125rem] font-bold tracking-wide text-ink-sub sm:text-sm">
          {label}
        </p>
        {icon && (
          <div
            className={`icon-pop flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1 sm:h-10 sm:w-10 ${KPI_TINTS[tint]}`}
          >
            {icon}
          </div>
        )}
      </div>
      <p className="mt-2 nowrap-num">
        <span className="text-kpi-lg text-ink">{value}</span>
        {unit && (
          <span className="ml-1 text-base font-bold text-ink-sub">{unit}</span>
        )}
      </p>
      <div className="mt-1.5 flex items-end justify-between gap-2">
        <div className="min-w-0 text-xs font-medium text-ink-sub">{sub}</div>
        {chart && <div className="shrink-0">{chart}</div>}
      </div>
    </Card>
  );
}

/** KPI 카드용 미니 추이 바 (실데이터 전달) */
export function MiniBars({
  values,
  className = "",
}: {
  values: number[];
  className?: string;
}) {
  const max = Math.max(...values, 1);
  return (
    <div className={`flex h-8 items-end gap-[3px] ${className}`}>
      {values.map((v, i) => {
        const last = i === values.length - 1;
        const h = Math.max(Math.round((v / max) * 100), v > 0 ? 12 : 5);
        return (
          <div
            key={i}
            className={`w-[5px] rounded-full ${last ? "bg-aqua-500" : "bg-aqua-200"}`}
            style={{ height: `${h}%` }}
          />
        );
      })}
    </div>
  );
}

// ---------- 페이지 상단 요약 / 인사이트 ----------

/**
 * 페이지 상단 요약 타일 — 카운트 + (선택) 필터 연동.
 * 리스트형 화면 상단에서 "지금 상태"를 3초 안에 보여주는 용도.
 */
export function SummaryTile({
  label,
  value,
  unit = "명",
  tone = "aqua",
  active,
  onClick,
}: {
  label: string;
  value: number | string;
  unit?: string;
  tone?: "aqua" | "warn" | "danger" | "gray" | "gold" | "sky" | "violet" | "green";
  active?: boolean;
  onClick?: () => void;
}) {
  const tones: Record<string, { dot: string; activeRing: string }> = {
    aqua: { dot: "bg-aqua-500", activeRing: "ring-aqua-500" },
    warn: { dot: "bg-warn", activeRing: "ring-warn" },
    danger: { dot: "bg-danger", activeRing: "ring-danger" },
    gray: { dot: "bg-ink-faint", activeRing: "ring-ink-sub" },
    gold: { dot: "bg-gold", activeRing: "ring-gold" },
    sky: { dot: "bg-sky-500", activeRing: "ring-sky-500" },
    violet: { dot: "bg-violet-500", activeRing: "ring-violet-500" },
    green: { dot: "bg-positive", activeRing: "ring-positive" },
  };
  const t = tones[tone];
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      onClick={onClick}
      className={`min-w-0 rounded-card border bg-card px-3.5 py-3 text-left shadow-card transition-all duration-300 sm:px-4 ${
        active
          ? `border-transparent ring-2 ${t.activeRing}`
          : "border-black/[0.045]"
      } ${onClick ? "cursor-pointer hover:-translate-y-0.5 hover:shadow-card-hover" : ""}`}
    >
      <p className="flex items-center gap-1.5 truncate text-xs font-bold text-ink-sub">
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${t.dot}`} />
        {label}
      </p>
      <p className="mt-1 nowrap-num text-xl font-extrabold tracking-tight text-ink sm:text-2xl">
        {value}
        <span className="ml-0.5 text-sm font-bold text-ink-sub">{unit}</span>
      </p>
    </Tag>
  );
}

/**
 * 인사이트 배너 — Deep Teal 미니 히어로.
 * "데이터 → 판단 → 실행"의 판단 결과를 문장으로 보여주는 영역.
 */
export function InsightBanner({
  title,
  children,
  action,
  className = "",
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`card-hero !p-5 sm:!p-6 ${className}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 text-[0.8125rem] font-extrabold uppercase tracking-wider text-aqua-300">
            <span className="h-1.5 w-1.5 rounded-full bg-aqua-300" />
            {title}
          </p>
          <div className="mt-2 text-[0.9375rem] leading-relaxed text-white sm:text-base">
            {children}
          </div>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </div>
  );
}

/** InsightBanner 안에서 수치를 강조할 때 */
export function Em({ children }: { children: ReactNode }) {
  return (
    <strong className="nowrap-num font-extrabold text-aqua-300">
      {children}
    </strong>
  );
}

// ---------- 기타 ----------

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-card border border-dashed border-stone-line bg-card-soft px-4 py-12 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-aqua-50 text-aqua-600 ring-1 ring-aqua-100">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <path d="M5 19C5 9 11 4 20 4c0 9-5 15-15 15Z" />
          <path d="M5 19c3-5 7-9 11-11" />
        </svg>
      </span>
      <p className="font-bold text-ink-soft">{title}</p>
      {description && <p className="text-sm text-ink-sub">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function ProgressBar({
  ratio,
  className = "",
  tone = "aqua",
}: {
  ratio: number; // 0~1
  className?: string;
  tone?: "aqua" | "warn";
}) {
  const pct = Math.max(0, Math.min(100, Math.round(ratio * 100)));
  return (
    <div className={`h-2 w-full rounded-full bg-stone-bg-deep ${className}`}>
      <div
        className={`h-2 rounded-full transition-all ${tone === "warn" ? "bg-gradient-to-r from-amber-400 to-warn" : "bg-gradient-to-r from-aqua-400 to-aqua-600"}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <label className="mb-1.5 block text-sm font-bold text-ink-soft">
      {children}
    </label>
  );
}

export const inputCls =
  "w-full rounded-btn border border-stone-line bg-card px-3.5 py-2.5 text-[0.9375rem] text-ink outline-none transition-shadow focus:border-aqua-500 focus:ring-2 focus:ring-aqua-100 placeholder:text-ink-faint";

/** 필터 칩 (페이지 공통) */
export function FilterChip({
  active,
  onClick,
  children,
  tone = "aqua",
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  tone?: "aqua" | "ink";
}) {
  const activeCls =
    tone === "aqua"
      ? "bg-deep-800 text-white shadow-sm dark:bg-aqua-600"
      : "bg-ink-soft text-white shadow-sm";
  return (
    <button
      onClick={onClick}
      className={`touch-target rounded-full px-4 py-1.5 text-sm font-bold transition-colors ${
        active
          ? activeCls
          : "bg-card text-ink-sub ring-1 ring-stone-line hover:bg-aqua-50 hover:text-aqua-800"
      }`}
    >
      {children}
    </button>
  );
}

// ---------- Modal (모바일: 하단 시트) ----------

export function Modal({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  wide?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div
        className="absolute inset-0 bg-deep-950/45 backdrop-blur-[3px]"
        onClick={onClose}
      />
      <div
        className={`relative z-10 flex max-h-[92dvh] w-full flex-col rounded-t-card-lg sm:rounded-card-lg bg-card shadow-float ${wide ? "sm:max-w-2xl" : "sm:max-w-lg"}`}
      >
        <div className="flex items-center justify-between gap-3 border-b border-stone-line px-5 py-4">
          <h3 className="truncate text-lg font-extrabold text-ink">{title}</h3>
          <button
            onClick={onClose}
            aria-label="닫기"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-stone-bg text-ink-sub hover:bg-stone-bg-deep"
          >
            <XIcon className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
  );
}
