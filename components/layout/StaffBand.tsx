"use client";

/**
 * 직원 화면 머리 띠 — 고객 앱 홈과 같은 딥그린 띠
 * ===============================================
 *
 * D-56 에서 대시보드 하나에만 머리 띠를 달았더니, 대시보드에서 「챙길
 * 고객」 「AX 코치」 탭으로 넘어가는 순간 다시 옛 모양(화면 제목 줄 +
 * 그 아래 어두운 카드 한 장)이 나왔다. 같은 묶음의 형제 화면이 서로 다른
 * 앱처럼 보였다 — 대표님: 「조금 더 많이 개선해 줘.」
 *
 * 그래서 띠를 부품으로 뺐다 (D-57). 화면마다 「제목 줄」 과 「요약 카드」
 * 두 덩어리였던 것을 띠 하나로 합친다.
 *
 *   맨 윗줄  화면 이름(h1) · ⓘ 설명 · 날짜 같은 덧말 · 오른쪽 알약
 *   큰 글    이 화면의 결론 한 문장
 *   몸통     숫자 몇 개 · 진행 막대 (화면마다 다름)
 *   단추     흰 알약 · 투명 알약 (PC 는 오른쪽, 폰은 아래)
 *   걸친 판  띠 아래쪽에 반쯤 걸쳐 올라오는 흰 판 (거르개 · 바로가기 등)
 *
 * 고객 상세처럼 사람이 주인공인 화면은 `big` 으로 — 얼굴 동그라미와
 * 이름을 크게 쓰고, 덧말은 이름 아래 한 줄(p.mt-1)로 둔다.
 */

import Link from "next/link";
import { ReactNode, useEffect, useId, useState } from "react";
import { InfoButton } from "@/components/ui/Fold";
import { setDocumentTitle } from "@/lib/utils/title";

export default function StaffBand({
  title,
  docTitle,
  description,
  meta,
  badge,
  headline,
  children,
  actions,
  panel,
  avatar,
  big = false,
  dataTour,
  data,
  className = "",
  panelClassName = "",
}: {
  /** 화면 이름 — h1 */
  title: ReactNode;
  /** 브라우저 탭 이름. 화면이 따로 정하면 false */
  docTitle?: string | false;
  /** ⓘ 를 누르면(PC 는 올리면) 나오는 화면 설명 */
  description?: ReactNode;
  /** 제목 옆(big 이면 아래)의 덧말 — 날짜 · 지점 등 */
  meta?: ReactNode;
  /** 맨 윗줄 오른쪽 (big 이면 이름 옆) 알약 */
  badge?: ReactNode;
  /** 이 화면의 결론 한 문장 */
  headline?: ReactNode;
  /** 숫자 · 진행 막대 */
  children?: ReactNode;
  /** 알약 단추 */
  actions?: ReactNode;
  /** 띠에 걸쳐 올라오는 흰 판 */
  panel?: ReactNode;
  /** big 일 때 이름 왼쪽의 얼굴 동그라미 */
  avatar?: ReactNode;
  big?: boolean;
  dataTour?: string;
  /** data-* 표식 (검사 · 투어가 찾는 자리) */
  data?: Record<string, string>;
  className?: string;
  /** 걸친 판에 더할 class (예: 인쇄에서 빼기 no-print) */
  panelClassName?: string;
}) {
  /* 탭 이름 — 화면이 직접 정하는 경우(docTitle=false)에는 건드리지 않는다 */
  const tab = docTitle === false ? null : docTitle ?? (typeof title === "string" ? title : undefined);
  useEffect(() => {
    if (tab !== null) setDocumentTitle(tab);
  }, [tab]);
  const id = useId();
  const [info, setInfo] = useState(false);
  const infoTitle = typeof title === "string" ? title : undefined;
  const infoBtn = description ? (
    <InfoButton
      text={description}
      title={infoTitle}
      open={info}
      onToggle={() => setInfo((v) => !v)}
      className="-my-3 !text-white/70 hover:!text-white" /* 손끝 크기(44px)는 그대로, 줄 높이는 늘리지 않게 위아래를 당긴다 */
    />
  ) : null;

  return (
    <div data-staff-band className={`mb-4 lg:mb-6 ${className}`}>
      <section
        data-tour={dataTour}
        aria-labelledby={id}
        {...Object.fromEntries(Object.entries(data ?? {}).map(([k, v]) => [`data-${k}`, v]))}
        className={`relative isolate overflow-hidden rounded-[24px] bg-gradient-to-br from-deep-800 via-deep-900 to-deep-950 px-5 pt-5 text-white shadow-[0_18px_40px_-24px_rgba(10,46,44,0.7)] sm:px-6 lg:px-8 lg:pt-6 ${
          panel ? "pb-14 lg:pb-16" : "pb-5 lg:pb-6"
        }`}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-aqua-400/15 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-24 left-1/3 h-48 w-48 rounded-full bg-gold/10 blur-3xl"
        />

        {big ? (
          <div className="relative flex items-center gap-3.5 sm:gap-4">
            {avatar}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                {/*
                  min-w-0 이 없으면 이 h1 은 flex 항목의 기본값(min-width:auto)
                  때문에 이름 길이만큼 늘어나, 띄어쓰기 없는 긴 이름에서 화면
                  전체가 가로로 밀린다. min-w-0 이 있어야 break-words 가 먹는다.
                */}
                <h1
                  id={id}
                  className="flex min-w-0 items-center break-words text-[1.5rem] font-extrabold leading-tight tracking-tight sm:text-[1.75rem]"
                >
                  <span className="min-w-0 break-words">{title}</span>
                  {infoBtn}
                </h1>
                {badge}
              </div>
              {meta && <p className="mt-1 text-[0.875rem] text-white/75">{meta}</p>}
            </div>
          </div>
        ) : (
          <div className="relative flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.8125rem] font-bold text-white/70">
            <h1 id={id} className="flex items-center text-[0.9375rem] font-extrabold text-white">
              {title}
              {infoBtn}
            </h1>
            {meta && (
              <>
                <span aria-hidden>·</span>
                <span className="nowrap-num">{meta}</span>
              </>
            )}
            {badge && <span className="ml-auto shrink-0">{badge}</span>}
          </div>
        )}

        {description && info && (
          <p className="relative mt-1.5 max-w-2xl text-[0.875rem] leading-relaxed text-white/80">
            {description}
          </p>
        )}

        {headline && (
          <p className="relative mt-3 text-[1.375rem] font-extrabold leading-snug tracking-tight [word-break:keep-all] sm:text-[1.625rem]">
            {headline}
          </p>
        )}

        {(children || actions) && (
          <div className="relative mt-4 lg:flex lg:items-end lg:justify-between lg:gap-10">
            <div className="min-w-0 flex-1">{children}</div>
            {actions && (
              <div className="no-print mt-4 flex flex-wrap gap-2 lg:mt-0 lg:shrink-0 lg:justify-end">
                {actions}
              </div>
            )}
          </div>
        )}
      </section>

      {panel && (
        <div className={`relative z-10 mx-2.5 -mt-10 rounded-[22px] bg-card p-1.5 shadow-card ring-1 ring-black/[0.04] dark:ring-white/[0.06] sm:mx-4 lg:p-2 ${panelClassName}`}>
          {panel}
        </div>
      )}
    </div>
  );
}

/* ── 띠 위의 작은 부품 ───────────────────────────────── */

/** 띠 위의 숫자 한 칸 — 이름 · 값 · 단위 */
export function BandStat({
  label,
  value,
  unit,
  sub,
  accent,
}: {
  label: ReactNode;
  value: ReactNode;
  unit?: string;
  sub?: ReactNode;
  /** 값을 아쿠아로 (처리 완료 같은 좋은 소식) */
  accent?: boolean;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[0.8125rem] font-bold text-white/65">{label}</p>
      <p
        className={`nowrap-num tabular text-[1.75rem] font-extrabold leading-tight tracking-tight ${
          accent ? "text-aqua-300" : "text-white"
        }`}
      >
        {value}
        {unit && <span className="ml-0.5 text-[0.9375rem] font-bold text-white/65">{unit}</span>}
      </p>
      {sub && <p className="nowrap-num text-[0.75rem] font-bold text-white/65">{sub}</p>}
    </div>
  );
}

/** 띠 위의 진행 막대 — 「오늘 처리 n / m건 · p%」 */
export function BandProgress({
  label,
  done,
  total,
  unit = "건",
}: {
  label: string;
  done: number;
  total: number;
  unit?: string;
}) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <div className="max-w-xl">
      <p className="flex items-baseline gap-1.5 text-[0.875rem] font-bold text-white/70">
        {label}
        <span className="nowrap-num tabular text-[1.125rem] font-extrabold text-white">{done}</span>
        <span className="nowrap-num">
          / {total}
          {unit}
        </span>
        <span className="nowrap-num ml-auto font-extrabold text-aqua-300">{pct}%</span>
      </p>
      <div
        role="progressbar"
        aria-label={`${label} 비율`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        className="mt-1.5 h-2 rounded-full bg-white/15"
      >
        <div
          className="h-2 rounded-full bg-gradient-to-r from-aqua-400 to-aqua-300 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

const PILL =
  "press inline-flex min-h-[44px] items-center gap-1.5 rounded-full px-4 text-[0.9375rem] font-extrabold";
/** 흰 알약 — 이 화면에서 가장 먼저 할 일 */
export const bandPrimary = `${PILL} bg-white text-deep-900 shadow-[0_4px_14px_rgba(0,0,0,0.18)] hover:bg-white/85`;
/** 투명 알약 — 그다음 할 일 */
export const bandGhost = `${PILL} bg-white/10 text-white ring-1 ring-white/25 hover:bg-white/20`;

export function BandLink({
  href,
  children,
  ghost,
  ariaLabel,
}: {
  href: string;
  children: ReactNode;
  ghost?: boolean;
  ariaLabel?: string;
}) {
  return (
    <Link href={href} aria-label={ariaLabel} className={ghost ? bandGhost : bandPrimary}>
      {children}
    </Link>
  );
}

/** 띠 위의 작은 상태 알약 (영업 중 · 공유 모드 등) */
export function BandPill({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white/10 px-2.5 py-0.5 text-[0.75rem] font-extrabold text-white/85 ring-1 ring-white/15">
      {children}
    </span>
  );
}
