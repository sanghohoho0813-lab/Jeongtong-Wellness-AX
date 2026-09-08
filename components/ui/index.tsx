"use client";

import { ReactNode, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CustomerStatus, SalesOpportunity, TaskStatus } from "@/lib/types";
import { SparkIcon, XIcon } from "./icons";

// ---------- Card ----------

export function Card({
  children,
  className = "",
  onClick,
  lift = true,
  dataTour,
  id,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  /** hover 시 살짝 떠오르는 입체 효과 (기본 on) */
  lift?: boolean;
  /** 단계별 안내(투어)에서 이 카드를 가리킬 때 쓰는 표식 */
  dataTour?: string;
  /** 화면 안 바로가기의 도착 지점 */
  id?: string;
}) {
  return (
    <div
      id={id}
      onClick={onClick}
      data-tour={dataTour}
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
  dataTour,
}: {
  children: ReactNode;
  className?: string;
  dataTour?: string;
}) {
  return (
    <div data-tour={dataTour} className={`card-hero ${className}`}>
      {children}
    </div>
  );
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
  eyebrow,
  hint,
  className = "",
}: {
  children: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
  tone?: IconTone;
  /** 제목 위 아주 작은 분류 라벨 — 무슨 종류의 이야기인지 */
  eyebrow?: string;
  /** 제목 아래 한 줄 — 이 칸을 어떻게 읽어야 하는지 */
  hint?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`mb-4 flex items-start justify-between gap-3 ${className}`}>
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow mb-1">{eyebrow}</p>}
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
        {hint && (
          <p className="mt-1.5 text-[0.875rem] leading-relaxed text-ink-sub">
            {hint}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/**
 * 화면을 나누는 가로줄 — 여기서부터 성격이 달라진다는 표시.
 *
 * 카드를 계속 이어 붙이면 어디까지가 '오늘 할 일' 이고 어디부터가
 * '참고 자료' 인지 알 수 없다. 눈썹 글자 하나와 선 하나로 그 경계를
 * 만든다. 카드를 하나 더 만드는 것보다 자리를 훨씬 덜 먹는다.
 */
export function SectionRule({
  label,
  hint,
  action,
}: {
  label: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-baseline gap-3 pt-1">
      <span className="eyebrow shrink-0">{label}</span>
      {hint && (
        <span className="hidden min-w-0 truncate text-[0.8125rem] text-ink-faint sm:block">
          {hint}
        </span>
      )}
      <span className="h-px min-w-4 flex-1 bg-stone-line" />
      {action && <span className="shrink-0">{action}</span>}
    </div>
  );
}

// ---------- Button ----------

type ButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "danger"
  | "danger-ghost"
  | "on-dark";

export function Button({
  children,
  onClick,
  variant = "primary",
  className = "",
  type = "button",
  disabled,
  size = "md",
  dataTour,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: ButtonVariant;
  className?: string;
  type?: "button" | "submit";
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
  /** 단계별 안내(투어) 표식 */
  dataTour?: string;
}) {
  const variants: Record<ButtonVariant, string> = {
    primary:
      "bg-gradient-to-b from-aqua-650 to-aqua-850 text-white shadow-[0_2px_8px_rgba(14,127,125,0.35),inset_0_1px_0_rgba(255,255,255,0.25)] hover:from-aqua-850 hover:to-deep-700 disabled:from-ink-faint disabled:to-ink-faint disabled:shadow-none",
    secondary:
      "bg-aqua-50 text-aqua-800 ring-1 ring-aqua-200 hover:bg-aqua-100",
    ghost: "bg-transparent text-ink-sub hover:bg-stone-bg-deep",
    // 되돌릴 수 없는 작업의 확인 버튼 — 실수로 누르기 어렵도록 색으로 분명히 구분한다
    danger:
      "bg-danger text-white shadow-[0_2px_8px_rgba(200,60,60,0.3)] hover:brightness-110",
    "danger-ghost": "bg-transparent text-danger-text hover:bg-red-50 dark:hover:bg-red-400/10",
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
      data-tour={dataTour}
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
      text: "text-danger-text",
      /* 목록 줄 왼쪽 세로 띠 색 (--rail) */
      rail: "rgb(var(--c-danger-text))",
    };
  if (score >= 35)
    return {
      label: "AI 추천 · 관리",
      short: "관리 권장",
      chip: "bg-gradient-to-r from-amber-400 to-warn text-white",
      text: "text-warn-text",
      rail: "rgb(var(--c-warn-text))",
    };
  return {
    label: "AI 추천 · 관찰",
    short: "관찰",
    chip: "bg-gradient-to-r from-aqua-650 to-deep-700 text-white",
    text: "text-aqua-700",
    rail: "rgb(var(--c-aqua-500))",
  };
}

/** AI 추천 등급 칩 (관리 대상일 때만 사용) */
export function RecommendBadge({
  score,
  compact = false,
}: {
  score: number;
  /**
   * 목록의 한 줄처럼 자리가 빠듯한 곳에서는 등급만 한 글자로 줄인다.
   * ("AI 추천 · 우선" 여덟 자가 자리를 다 먹어 정작 왜 챙겨야 하는지가
   *  잘려 나갔다 — 이유 쪽이 더 쓸모 있다)
   */
  compact?: boolean;
}) {
  const r = recommendLevel(score);
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-extrabold shadow-sm ${r.chip}`}
      title={compact ? r.label : undefined}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-white/70" />
      {compact ? (
        <>
          {/* 폰에서만 줄여 쓴다 — 자리가 넉넉하면 원래 이름이 더 분명하다 */}
          <span className="sm:hidden">{r.label.replace("AI 추천 · ", "")}</span>
          <span className="hidden sm:inline">{r.label}</span>
        </>
      ) : (
        r.label
      )}
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

/**
 * 지표 한 칸.
 *
 * 예전에는 이것 하나가 흰 카드 한 장이었다. 넷을 늘어놓으면 PC 에서
 * 첫 화면의 3분의 1을, 폰에서는 두 화면을 먹었다. 그런데 이 숫자들은
 * 오늘 무엇을 할지 정해 주지 않는다 — 정해 놓은 판단이 맞는지 확인하는
 * **근거**다. 근거가 판단보다 커 보이면 화면이 거짓말을 한다.
 *
 * 그래서 카드에서 '칸' 으로 내린다. 넷이 한 판(.stat-strip) 안에 실선으로만
 * 나뉘어 들어가고, 색은 아이콘에만 남긴다. 숫자 크기는 그대로 두었다 —
 * 작아지면 읽기 어려워지고, 그건 이 매장에서 가장 피해야 하는 일이다.
 *
 * `standalone` 은 예전처럼 홀로 뜨는 카드가 필요할 때만 쓴다.
 */
export function KpiCard({
  label,
  value,
  unit,
  sub,
  icon,
  chart,
  tint = "aqua",
  standalone = false,
}: {
  label: string;
  value: ReactNode;
  unit?: string;
  sub?: ReactNode;
  icon?: ReactNode;
  chart?: ReactNode;
  tint?: KpiTint;
  standalone?: boolean;
}) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-2.5">
        {/*
          지표 이름은 자르지 않는다 — '오늘 방…' '월 매출 …' 처럼 잘리면
          무슨 숫자인지 알 수 없다. 좁으면 두 줄로 접힌다.
        */}
        <p className="min-w-0 text-[0.8125rem] font-bold leading-snug tracking-wide text-ink-sub sm:text-sm">
          {label}
        </p>
        {icon && (
          <div
            className={`icon-pop flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ring-1 sm:h-9 sm:w-9 ${KPI_TINTS[tint]}`}
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
    </>
  );

  if (standalone) {
    return (
      <Card className="group relative min-w-0 overflow-hidden !p-4 sm:!p-5">
        <span
          className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${KPI_BARS[tint]}`}
        />
        {body}
      </Card>
    );
  }
  return <div className="stat-cell group min-w-0">{body}</div>;
}

/**
 * 지표 판 — 칸 넷을 한 덩어리로 묶는다.
 *
 * 실선 격자는 `.stat-cell` 이 위·왼쪽에만 그리고, 바깥 판이
 * overflow-hidden 으로 잘라 낸다. 그래서 몇 칸이 몇 줄로 접히든
 * 바깥 테두리가 두 겹으로 겹치지 않는다.
 */
export function StatStrip({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`stat-strip grid-cols-2 xl:grid-cols-4 ${className}`}>
      {children}
    </div>
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
      {/* 지표 이름은 자르지 않는다 — 좁으면 두 줄로 접힌다 */}
      <p className="flex items-start gap-1.5 text-[0.875rem] font-bold leading-snug text-ink-sub">
        <span className={`mt-[0.3rem] h-1.5 w-1.5 shrink-0 rounded-full ${t.dot}`} />
        <span className="min-w-0">{label}</span>
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
  /**
   * 단추는 **제목 줄 옆**에, 본문은 그 아래 전체 폭으로.
   *
   * 예전에는 단추가 본문과 나란히 놓여 폰에서 글 폭을 절반으로 깎았다.
   * 두 문장이 여덟 줄로 늘어나 배너 하나가 화면을 통째로 먹었고,
   * 정작 단추 아래는 텅 비어 있었다.
   */
  return (
    <div className={`card-hero !p-5 sm:!p-6 ${className}`}>
      <div className="flex items-center justify-between gap-3">
        <p className="flex min-w-0 items-center gap-2 text-[0.8125rem] font-extrabold uppercase tracking-wider text-aqua-300">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-aqua-300" />
          <span className="min-w-0">{title}</span>
        </p>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      <div className="mt-2 text-[0.9375rem] leading-relaxed text-white sm:text-base">
        {children}
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

/**
 * 폼 아래쪽 [취소] · [저장] 줄 — 창 맨 아래에 붙여 둔다.
 *
 * 방문 기록 폼은 다 펼치면 폰 화면의 네 배쯤 된다. 저장 단추가 그 끝에
 * 있으면 간단한 기록 하나를 남기려고 화면을 몇 번씩 쓸어내려야 했다.
 * 이제 어디까지 내려가 있든 저장 단추가 늘 손 닿는 자리에 있다.
 *
 * (모달 본문의 좌우·아래 여백을 음수 여백으로 되돌려 창 폭에 꽉 채우고,
 *  홈 인디케이터가 있는 폰을 위해 아래 여백을 안전영역만큼 더 준다)
 */
export function FormActions({
  children,
  error,
}: {
  children: ReactNode;
  /**
   * 입력이 덜 됐을 때의 안내.
   * 단추 바로 위에 띄운다 — 폼 위쪽에 두면 아래에서 저장을 누른 사람에게는
   * 화면 밖이라, "눌렀는데 아무 일도 안 일어난다"로 보인다.
   */
  error?: string;
}) {
  return (
    <div className="sticky bottom-0 z-10 -mx-5 -mb-4 mt-3 border-t border-stone-line bg-card px-5 pt-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
      {error && (
        <p
          role="alert"
          className="mb-2 rounded-btn bg-red-50 px-3 py-2 text-sm font-bold text-danger-text dark:bg-red-400/10"
        >
          {error}
        </p>
      )}
      <div className="flex items-center justify-end gap-2">{children}</div>
    </div>
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

/**
 * 입력칸 이름표 — 그리고 그 이름을 **칸에 실제로 이어 준다**.
 *
 * 무엇이 문제였나
 * ---------------
 * 눈에는 "고객명 *" 이 보이는데, 그 글자와 아래 입력칸이 아무 관계도
 * 아니었다. 그래서
 *   · 화면 낭독기는 그냥 "편집" 이라고만 읽는다 — 무엇을 적는 칸인지 모른다
 *   · 음성으로 "고객명 칸" 이라고 지목할 수 없다
 *   · 이름표를 눌러도 칸으로 커서가 가지 않는다 (손이 떨리는 분께는 큰 차이)
 * 실제로 세어 보니 화면 전체에서 이름 없는 칸이 서른 곳이었다.
 *
 * 왜 여기서 잇는가
 * ----------------
 * 이름표는 앱 곳곳에 예순아홉 번 쓰인다. 호출하는 쪽을 예순아홉 번 고치면
 * 그중 하나는 반드시 빠뜨리고, 앞으로 만들 폼도 또 빠뜨린다.
 * 이름표와 칸은 언제나 같은 상자 안에 나란히 있으므로, 이름표가 스스로
 * 옆의 칸을 찾아 이어 준다. 한 곳만 맞으면 전부 맞는다.
 *
 * 이미 이름이 붙어 있는 칸(aria-label 을 직접 준 경우)이나, 칸이 아니라
 * 단추 묶음이 오는 자리(날짜 선택·부위 선택)는 건드리지 않는다.
 */
export function FieldLabel({
  children,
  htmlFor,
}: {
  children: ReactNode;
  /** 이을 칸을 직접 지정하고 싶을 때 (대개는 비워 두면 알아서 찾는다) */
  htmlFor?: string;
}) {
  const ref = useRef<HTMLLabelElement>(null);
  const autoId = useId();

  useEffect(() => {
    if (htmlFor) return;
    const label = ref.current;
    const box = label?.parentElement;
    if (!label || !box) return;

    const field = box.querySelector<HTMLElement>("input, select, textarea");
    if (!field) return; // 날짜 선택기·부위 칩처럼 칸이 아닌 것은 그대로 둔다
    if (field.getAttribute("aria-label") || field.getAttribute("aria-labelledby")) {
      return; // 이미 이름이 있다
    }
    if (!field.id) field.id = autoId;
    label.setAttribute("for", field.id);
  });

  return (
    <label
      ref={ref}
      htmlFor={htmlFor}
      className="mb-1.5 block text-sm font-bold text-ink-soft"
    >
      {children}
    </label>
  );
}

export const inputCls =
  "w-full rounded-btn border border-stone-line bg-card px-3.5 py-2.5 text-[0.9375rem] text-ink outline-none transition-shadow focus:border-aqua-500 focus:ring-2 focus:ring-aqua-100 placeholder:text-ink-faint";

/**
 * AX 매출기회 배지 — 재등록 / 재방문 기회를 색으로 구분한다.
 * 관리 필요(Priority)와 혼동되지 않도록 골드·에메랄드 계열만 사용한다.
 */
export function OpportunityBadge({
  opportunity,
  size = "md",
}: {
  opportunity: SalesOpportunity;
  size?: "sm" | "md";
}) {
  if (opportunity.type === "none") return null;
  const renewal = opportunity.type === "renewal";
  const high = opportunity.level === "high";
  const cls = renewal
    ? high
      ? "bg-gradient-to-r from-gold to-gold-deep text-white"
      : "bg-gold-soft text-gold-deep ring-1 ring-gold/25"
    : high
      ? "bg-gradient-to-r from-emerald-400 to-positive text-white"
      : "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-400/10 dark:text-emerald-300 dark:ring-emerald-400/20";
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full font-extrabold ${cls} ${
        size === "sm" ? "px-2 py-0.5 text-[0.7rem]" : "px-2.5 py-1 text-xs"
      }`}
    >
      <SparkIcon className={size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"} />
      {opportunity.label}
    </span>
  );
}

/** 선택형 세그먼트 (설정 · 화면 표시 공통) */
export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: Array<{ key: T; label: string }>;
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div className="flex gap-2" role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.key}
          onClick={() => onChange(o.key)}
          className={`touch-target flex-1 rounded-btn px-4 py-2.5 text-sm font-bold transition-colors ${
            value === o.key
              ? "bg-sel text-sel-ink shadow-sm"
              : "bg-card-soft text-ink-soft ring-1 ring-stone-line hover:bg-aqua-50"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

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
  /*
   * 다크에서 ink-soft 는 거의 흰색이라, 그 위의 흰 글자는 대비가 1.4 였다.
   * (골라 놓고도 무엇을 골랐는지 읽을 수 없었다)
   * 어두운 표면 + 밝은 글자로 뒤집는다.
   */
  const activeCls =
    tone === "aqua"
      ? "bg-sel text-sel-ink shadow-sm"
      : "bg-ink-soft text-white shadow-sm dark:bg-deep-800 dark:text-white";
  return (
    <button
      onClick={onClick}
      className={`touch-target shrink-0 whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-bold transition-colors ${
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

/** 초점을 받을 수 있는 요소들 — 포커스 가둠(trap)에 사용 */
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * 모달 — 열려 있는 동안 조작이 모달 안에만 머무르게 한다.
 *
 * 현장에서 실제로 겪는 문제들을 막는다.
 *  - 입력하다 배경이 같이 스크롤돼 위치를 잃는 것 → 배경 스크롤 잠금
 *  - 닫기 버튼을 못 찾는 것 → ESC 로도 닫힘
 *  - 키보드/스크린리더 사용자가 모달 밖으로 빠져나가는 것 → 포커스 가둠
 *  - 닫은 뒤 초점이 화면 맨 위로 튀는 것 → 열기 전 위치로 되돌림
 *
 * 그리고 항상 body 바로 아래(portal)에 그린다. 카드 안에서 열린 모달은
 * 카드의 hover 효과(transform)가 fixed 의 기준을 바꿔 버려 화면이 튀기 때문이다.
 */
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
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreRef = useRef<HTMLElement | null>(null);
  // onClose 가 매 렌더 새로 만들어져도 이펙트가 다시 돌지 않게 잡아 둔다
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  // 서버 렌더에는 document 가 없으므로 마운트 후에만 portal 을 만든다
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  /**
   * 적다 만 것을 지키는 문지기
   * ==========================
   *
   * 방문 기록에 상담 내용을 한참 적다가 창 바깥을 스치듯 눌렀다. 창이 닫히고
   * 적은 것은 전부 사라졌다. 다시 열면 빈 칸이다. 아무 말도 없었다.
   *
   * 그래서 **사람이 실제로 손댄 칸이 있는지**를 본다. 판단은 입력값 비교가
   * 아니라 input · change 이벤트로 한다 — 리액트가 값을 채워 넣는 것은 이
   * 이벤트를 쏘지 않으므로, 기본값이나 자동 채움을 사람이 친 것으로 오해하지
   * 않는다. 손댄 적이 없으면 지금까지처럼 조용히 닫힌다.
   *
   * 저장 후 닫는 길은 여기를 지나지 않는다 (페이지가 자기 상태를 직접 내린다).
   */
  const touchedRef = useRef(false);
  const [asking, setAsking] = useState(false);
  const askingRef = useRef(false);
  askingRef.current = asking;

  const tryClose = () => {
    if (touchedRef.current) setAsking(true);
    else onClose();
  };

  useEffect(() => {
    if (!open) return;
    touchedRef.current = false;
    setAsking(false);
    const panel = panelRef.current;
    const mark = () => {
      touchedRef.current = true;
    };
    panel?.addEventListener("input", mark);
    panel?.addEventListener("change", mark);
    return () => {
      panel?.removeEventListener("input", mark);
      panel?.removeEventListener("change", mark);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    restoreRef.current = document.activeElement as HTMLElement | null;

    // 배경 스크롤 잠금 — 스크롤바가 사라지며 화면이 밀리지 않도록 폭을 보정한다
    const body = document.body;
    const prevOverflow = body.style.overflow;
    const prevPadding = body.style.paddingRight;
    const gap = window.innerWidth - document.documentElement.clientWidth;
    body.style.overflow = "hidden";
    if (gap > 0) body.style.paddingRight = `${gap}px`;

    // 첫 초점은 패널 자체에 둔다 (입력란에 커서가 튀어 모바일 키보드가 뜨는 것 방지)
    panelRef.current?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        // 확인 중이면 ESC 는 '계속 작성' 이다 — 여기서 또 닫으면 물어본 뜻이 없다
        if (askingRef.current) {
          setAsking(false);
          return;
        }
        if (touchedRef.current) setAsking(true);
        else closeRef.current();
        return;
      }
      if (e.key !== "Tab") return;
      const panel = panelRef.current;
      if (!panel) return;
      const items = [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
        (el) => el.offsetParent !== null,
      );
      if (items.length === 0) {
        e.preventDefault();
        panel.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || active === panel)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    // 버블 단계로 듣는다 — 모달 안에 열린 날짜 선택 패널이 ESC 를 먼저
    // 처리하고 전파를 멈출 수 있어야, 패널만 닫히고 모달은 남는다.
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      body.style.overflow = prevOverflow;
      body.style.paddingRight = prevPadding;
      restoreRef.current?.focus?.();
    };
  }, [open]);

  if (!open || !mounted) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div
        className="absolute inset-0 bg-deep-950/45 backdrop-blur-[3px]"
        onClick={tryClose}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={`relative z-10 flex max-h-[92dvh] w-full flex-col rounded-t-card-lg sm:rounded-card-lg bg-card shadow-float outline-none ${wide ? "sm:max-w-2xl" : "sm:max-w-lg"}`}
      >
        <div className="modal-header flex items-center justify-between gap-3 border-b border-stone-line px-5 py-4">
          <h3 className="truncate text-lg font-extrabold text-ink">{title}</h3>
          <button
            onClick={tryClose}
            aria-label="닫기"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-stone-bg text-ink-sub hover:bg-stone-bg-deep"
          >
            <XIcon className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>

        {asking && (
          <div className="absolute inset-0 z-20 flex items-center justify-center rounded-t-card-lg bg-deep-950/55 p-5 sm:rounded-card-lg">
            {/*
              물어보는 동안에는 초점을 여기로 데려온다. 그러지 않으면 초점이
              가림막 뒤 입력칸에 남아, Tab 이 보이지도 않는 칸들을 훑는다.
            */}
            <div
              ref={(el) => el?.querySelector<HTMLElement>("button")?.focus()}
              role="alertdialog"
              aria-label="저장하지 않고 닫기"
              className="w-full max-w-xs rounded-card bg-card p-5 shadow-float"
            >
              <p className="text-[1.0625rem] font-extrabold text-ink">
                적으신 내용이 사라집니다
              </p>
              <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-ink-sub">
                저장하지 않고 닫으면 지금까지 입력하신 내용은 남지 않습니다.
              </p>
              <div className="mt-4 flex gap-2">
                <Button
                  variant="secondary"
                  className="flex-1"
                  onClick={() => setAsking(false)}
                >
                  계속 작성
                </Button>
                <Button
                  variant="danger"
                  className="flex-1"
                  onClick={() => {
                    setAsking(false);
                    onClose();
                  }}
                >
                  그냥 닫기
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
