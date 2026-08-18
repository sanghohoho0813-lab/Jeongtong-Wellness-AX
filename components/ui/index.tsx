"use client";

import { ReactNode } from "react";
import { CustomerStatus, TaskStatus } from "@/lib/types";
import { XIcon } from "./icons";

// ---------- Card ----------

export function Card({
  children,
  className = "",
  onClick,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`card ${onClick ? "cursor-pointer transition-shadow hover:shadow-card-hover" : ""} ${className}`}
    >
      {children}
    </div>
  );
}

export function SectionTitle({
  children,
  action,
  className = "",
}: {
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`mb-4 flex items-center justify-between gap-2 ${className}`}>
      <h2 className="text-section-title min-w-0 text-ink">{children}</h2>
      {action}
    </div>
  );
}

// ---------- Button ----------

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger-ghost";

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
      "bg-aqua-600 text-white hover:bg-aqua-700 disabled:bg-ink-faint shadow-sm",
    secondary:
      "bg-aqua-50 text-aqua-700 hover:bg-aqua-100 border border-aqua-100",
    ghost: "bg-transparent text-ink-sub hover:bg-stone-bg-deep",
    "danger-ghost": "bg-transparent text-danger hover:bg-red-50",
  };
  const sizes = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2.5 text-[0.9375rem]",
    lg: "px-5 py-3 text-base",
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-1.5 rounded-btn font-semibold whitespace-nowrap transition-colors touch-target ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {children}
    </button>
  );
}

// ---------- Badge / Chip ----------

export function Badge({
  children,
  tone = "aqua",
  className = "",
}: {
  children: ReactNode;
  tone?: "aqua" | "gray" | "gold" | "warn" | "danger" | "outline";
  className?: string;
}) {
  const tones = {
    aqua: "bg-aqua-100 text-aqua-800",
    gray: "bg-stone-bg-deep text-ink-sub",
    gold: "bg-gold-soft text-[#8a6f3a]",
    warn: "bg-amber-50 text-amber-700",
    danger: "bg-red-50 text-red-600",
    outline: "border border-aqua-100 text-aqua-700",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

const STATUS_TONE: Record<CustomerStatus, { label: string; cls: string }> = {
  new: { label: "신규", cls: "bg-aqua-100 text-aqua-800" },
  active: { label: "활성", cls: "bg-emerald-50 text-emerald-700" },
  at_risk: { label: "관리 필요", cls: "bg-amber-50 text-amber-700" },
  dormant: { label: "장기 미방문", cls: "bg-red-50 text-red-600" },
};

export function CustomerStatusBadge({ status }: { status: CustomerStatus }) {
  const t = STATUS_TONE[status];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${t.cls}`}
    >
      {t.label}
    </span>
  );
}

const TASK_STATUS_TONE: Record<TaskStatus, { label: string; cls: string }> = {
  pending: { label: "대기", cls: "bg-stone-bg-deep text-ink-sub" },
  confirmed: { label: "확인", cls: "bg-aqua-100 text-aqua-800" },
  done: { label: "처리완료", cls: "bg-emerald-50 text-emerald-700" },
  hold: { label: "보류", cls: "bg-amber-50 text-amber-700" },
};

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  const t = TASK_STATUS_TONE[status];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${t.cls}`}
    >
      {t.label}
    </span>
  );
}

// ---------- KPI ----------

export function KpiCard({
  label,
  value,
  unit,
  sub,
  icon,
}: {
  label: string;
  value: string | number;
  unit?: string;
  sub?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <Card className="flex items-center justify-between gap-3 min-w-0">
      <div className="min-w-0">
        <p className="text-sm text-ink-sub font-medium truncate">{label}</p>
        <p className="mt-1.5 nowrap-num">
          <span className="text-kpi-lg text-ink">{value}</span>
          {unit && (
            <span className="ml-0.5 text-base font-semibold text-ink-soft">
              {unit}
            </span>
          )}
        </p>
        {sub && <div className="mt-1 text-xs text-ink-sub">{sub}</div>}
      </div>
      {icon && (
        <div className="hidden sm:flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-aqua-50 text-aqua-600">
          {icon}
        </div>
      )}
    </Card>
  );
}

// ---------- 기타 ----------

export function EmptyState({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-1.5 rounded-card bg-card-soft py-10 px-4 text-center">
      <p className="font-semibold text-ink-soft">{title}</p>
      {description && <p className="text-sm text-ink-sub">{description}</p>}
    </div>
  );
}

export function ProgressBar({
  ratio,
  className = "",
}: {
  ratio: number; // 0~1
  className?: string;
}) {
  const pct = Math.max(0, Math.min(100, Math.round(ratio * 100)));
  return (
    <div className={`h-2 w-full rounded-full bg-stone-bg-deep ${className}`}>
      <div
        className="h-2 rounded-full bg-aqua-500 transition-all"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <label className="mb-1.5 block text-sm font-semibold text-ink-soft">
      {children}
    </label>
  );
}

export const inputCls =
  "w-full rounded-btn border border-stone-bg-deep bg-card-soft px-3.5 py-2.5 text-[0.9375rem] text-ink outline-none focus:border-aqua-500 focus:ring-2 focus:ring-aqua-100 placeholder:text-ink-faint";

// ---------- Modal (모바일: 하단 시트 느낌) ----------

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
        className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div
        className={`relative z-10 flex max-h-[92dvh] w-full flex-col rounded-t-card sm:rounded-card bg-card shadow-card-hover ${wide ? "sm:max-w-2xl" : "sm:max-w-lg"}`}
      >
        <div className="flex items-center justify-between gap-3 border-b border-stone-bg-deep px-5 py-4">
          <h3 className="text-lg font-bold text-ink truncate">{title}</h3>
          <button
            onClick={onClose}
            aria-label="닫기"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-sub hover:bg-stone-bg-deep"
          >
            <XIcon className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
  );
}
