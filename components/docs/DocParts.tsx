"use client";

/**
 * 문서형 화면 공통 조각 — 기획의도 / 사용 가이드에서 함께 쓴다.
 * 대시보드처럼 데이터를 보여주는 화면이 아니라 "읽는 화면"이므로,
 * 본문 폭을 제한하고 줄 간격을 넉넉히 두어 가독성을 우선한다.
 */

import Link from "next/link";
import { ReactNode, useEffect, useState } from "react";
import { ChevronRightIcon } from "@/components/ui/icons";

export type DocTone = "aqua" | "teal" | "sky" | "violet" | "amber" | "emerald" | "gold";

const TONE_BADGE: Record<DocTone, string> = {
  aqua: "bg-gradient-to-br from-aqua-500 to-deep-700 text-white",
  teal: "bg-gradient-to-br from-deep-700 to-deep-900 text-white",
  sky: "bg-gradient-to-br from-sky-400 to-sky-600 text-white",
  violet: "bg-gradient-to-br from-violet-400 to-violet-600 text-white",
  amber: "bg-gradient-to-br from-amber-300 to-warn text-white",
  emerald: "bg-gradient-to-br from-emerald-300 to-positive text-white",
  gold: "bg-gradient-to-br from-gold to-gold-deep text-white",
};

const TONE_BAR: Record<DocTone, string> = {
  aqua: "from-aqua-400 to-deep-700",
  teal: "from-deep-700 to-deep-900",
  sky: "from-sky-400 to-sky-600",
  violet: "from-violet-400 to-violet-600",
  amber: "from-amber-300 to-warn",
  emerald: "from-emerald-300 to-positive",
  gold: "from-gold to-gold-deep",
};

/** 섹션 카드 배경 — 톤마다 아주 옅게 색을 깐다 */
const TONE_TINT: Record<DocTone, string> = {
  aqua: "bg-gradient-to-br from-aqua-50 via-card to-card",
  teal: "bg-gradient-to-br from-deep-700/[0.07] via-card to-card",
  sky: "bg-gradient-to-br from-sky-500/[0.07] via-card to-card",
  violet: "bg-gradient-to-br from-violet-500/[0.07] via-card to-card",
  amber: "bg-gradient-to-br from-amber-400/[0.09] via-card to-card",
  emerald: "bg-gradient-to-br from-emerald-500/[0.07] via-card to-card",
  gold: "bg-gradient-to-br from-gold-soft via-card to-card",
};

/** 섹션 소제목(kicker) 색 */
const TONE_TEXT: Record<DocTone, string> = {
  aqua: "text-aqua-700",
  teal: "text-deep-700 dark:text-aqua-700",
  sky: "text-sky-600 dark:text-sky-300",
  violet: "text-violet-600 dark:text-violet-300",
  amber: "text-amber-600 dark:text-amber-300",
  emerald: "text-emerald-600 dark:text-emerald-300",
  gold: "text-gold-deep",
};

const TONE_SOFT: Record<DocTone, string> = {
  aqua: "bg-aqua-50 text-aqua-800 ring-aqua-100",
  teal: "bg-deep-700/10 text-deep-800 ring-deep-700/15 dark:text-aqua-700",
  sky: "bg-sky-500/10 text-sky-600 ring-sky-500/15 dark:text-sky-300",
  violet: "bg-violet-500/10 text-violet-600 ring-violet-500/15 dark:text-violet-300",
  amber: "bg-amber-400/15 text-amber-600 ring-amber-400/20 dark:text-amber-300",
  emerald: "bg-emerald-500/10 text-emerald-600 ring-emerald-500/15 dark:text-emerald-300",
  gold: "bg-gold-soft text-gold-deep ring-gold/20",
};

/** 문서 본문 폭 — 한 줄이 너무 길어지지 않게 제한 */
export function DocPage({ children }: { children: ReactNode }) {
  return <div className="mx-auto w-full max-w-4xl">{children}</div>;
}

/** 문서 표지 */
export function DocHero({
  eyebrow,
  title,
  subtitle,
  lead,
  meta,
}: {
  eyebrow: string;
  title: string;
  subtitle?: ReactNode;
  lead?: ReactNode;
  meta?: string;
}) {
  return (
    <header className="card-hero rise-in relative overflow-hidden !p-6 sm:!p-9">
      <span className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full bg-aqua-400/15 blur-3xl" />
      <p className="text-[0.8125rem] font-extrabold uppercase tracking-[0.18em] text-aqua-300">
        {eyebrow}
      </p>
      <h1 className="mt-2.5 text-[1.875rem] font-extrabold leading-tight text-white sm:text-[2.375rem]">
        {title}
      </h1>
      {subtitle && (
        <p className="mt-3.5 border-l-[3px] border-gold pl-4 text-[1.125rem] font-bold leading-relaxed text-white sm:text-[1.3125rem]">
          {subtitle}
        </p>
      )}
      {lead && (
        <p className="mt-4 max-w-2xl text-[1rem] leading-[1.8] text-deep-sub sm:text-[1.0625rem]">
          {lead}
        </p>
      )}
      {meta && (
        <p className="mt-4 inline-flex rounded-full bg-white/10 px-3.5 py-1.5 text-[0.875rem] font-bold text-deep-sub ring-1 ring-white/15">
          {meta}
        </p>
      )}
    </header>
  );
}

/** 차례 — 번호 + 제목 칩 */
export function DocToc({
  items,
  flow,
  phoneHint,
}: {
  items: Array<{ no: string; label: string; href: string }>;
  flow?: string;
  /** 폰에서만 보이는 안내 — 본문이 접혀 있다는 사실을 미리 알려 준다 */
  phoneHint?: string;
}) {
  return (
    <>
      {/*
        폰에서는 차례를 따로 그리지 않는다.

        `phoneHint` 가 붙은 문서(사용 방법 · Why AX)는 폰에서 절이 전부
        접혀 있다. 그러면 **접힌 제목 열여덟 줄이 곧 차례**다. 같은 목록을
        위에 한 벌 더 두면 390px 에서 1,100px 을 더 내려가야 하고, 사용
        방법 화면은 본문이 시작되기도 전에 2,446px 지점이었다.

        차례가 본문보다 짧지 않으면 그건 차례가 아니다.
        (넓은 화면에서는 두세 단으로 접혀 짧으므로 그대로 둔다)
      */}
      {phoneHint && (
        <div className="card rise-in !py-4 md:hidden">
          <p className="rounded-btn bg-aqua-50 px-3.5 py-2.5 text-[0.9375rem] font-semibold leading-relaxed text-aqua-800 ring-1 ring-aqua-100">
            {phoneHint}
          </p>
          {flow && (
            <p className="mt-2.5 rounded-btn bg-gradient-to-r from-aqua-50 to-card px-4 py-3 text-[0.9375rem] font-semibold leading-relaxed text-ink-soft ring-1 ring-aqua-100">
              {flow}
            </p>
          )}
        </div>
      )}
      <nav
        className={`card rise-in !py-5 ${phoneHint ? "hidden md:block" : ""}`}
        aria-label="차례"
      >
      <p className="mb-3 text-sm font-extrabold uppercase tracking-wider text-aqua-700">
        차례
      </p>
      <ol className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((i) => (
          <li key={i.href}>
            <a
              href={i.href}
              className="group flex items-center gap-2.5 rounded-btn px-2.5 py-2 transition-colors hover:bg-aqua-50"
            >
              <span className="nowrap-num flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-aqua-50 text-[0.8125rem] font-extrabold text-aqua-800 ring-1 ring-aqua-100 transition-colors group-hover:bg-aqua-600 group-hover:text-white">
                {i.no}
              </span>
              <span className="min-w-0 truncate text-[1rem] font-bold text-ink-soft group-hover:text-aqua-800">
                {i.label}
              </span>
            </a>
          </li>
        ))}
      </ol>
      {flow && (
        <p className="mt-3 rounded-btn bg-gradient-to-r from-aqua-50 to-card px-4 py-3 text-[0.9375rem] font-semibold leading-relaxed text-ink-soft ring-1 ring-aqua-100">
          {flow}
        </p>
      )}
      </nav>
    </>
  );
}

/**
 * 폰에서만 접힌다.
 *
 * 사용 가이드는 18개 절을 전부 펼쳐 두었더니 390px 화면에서 62화면 길이가
 * 되었다. 원장님이 "이용권 어떻게 넣더라" 하나를 확인하려고 들어와서
 * 스크롤을 예순 번 굴려야 하는 문서는 아무도 두 번 열지 않는다.
 *
 * PC에서는 그대로 펼쳐 둔다 — 넓은 화면에서는 훑어 읽는 것이 더 빠르고,
 * Ctrl+F 로 찾는 사람의 길도 막지 않아야 한다.
 * 차례에서 한 항목을 누르면(해시가 바뀌면) 그 절만 열린다.
 */
function useSectionOpen(id: string, collapsible: boolean) {
  /** 서버·첫 그림에서는 늘 펼친 상태 — 폰 여부는 그려진 뒤에야 알 수 있다 */
  const [phone, setPhone] = useState(false);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    if (!collapsible) return;
    const mq = window.matchMedia("(max-width: 767px)");
    const sync = () => {
      setPhone(mq.matches);
      setOpen(!mq.matches || window.location.hash === `#${id}`);
    };
    sync();
    mq.addEventListener("change", sync);
    window.addEventListener("hashchange", sync);
    return () => {
      mq.removeEventListener("change", sync);
      window.removeEventListener("hashchange", sync);
    };
  }, [collapsible, id]);

  return { folded: collapsible && phone, open, setOpen };
}

/** 본문 한 절 */
export function DocSection({
  id,
  no,
  kicker,
  title,
  tone = "aqua",
  collapsible = false,
  children,
}: {
  id: string;
  no: string;
  kicker: string;
  title: string;
  tone?: DocTone;
  /** 폰에서 접을 수 있게 한다 (기본은 끔 — 기획의도 화면은 그대로 둔다) */
  collapsible?: boolean;
  children: ReactNode;
}) {
  const { folded, open, setOpen } = useSectionOpen(id, collapsible);

  const head = (
    <div className="flex items-start gap-3.5">
      <span
        className={`nowrap-num flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-base font-extrabold shadow-sm ${TONE_BADGE[tone]}`}
      >
        {no}
      </span>
      <div className="min-w-0 flex-1">
        <p
          className={`text-[0.8125rem] font-extrabold uppercase tracking-wider ${TONE_TEXT[tone]}`}
        >
          {kicker}
        </p>
        <h2 className="mt-1 text-[1.375rem] font-extrabold leading-snug text-ink sm:text-[1.625rem]">
          {title}
        </h2>
      </div>
      {folded && (
        <ChevronRightIcon
          className={`mt-2 h-5 w-5 shrink-0 text-ink-faint transition-transform ${
            open ? "rotate-90" : ""
          }`}
        />
      )}
    </div>
  );

  return (
    <section
      id={id}
      className={`card rise-in relative overflow-hidden scroll-mt-24 ${TONE_TINT[tone]}`}
    >
      <span
        className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${TONE_BAR[tone]}`}
      />
      {folded ? (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls={`${id}-body`}
          className="-mx-1 block w-[calc(100%+0.5rem)] rounded-btn px-1 text-left"
        >
          {head}
        </button>
      ) : (
        head
      )}
      <div
        id={`${id}-body`}
        hidden={folded && !open}
        className="mt-5 space-y-4 text-[1.0625rem] leading-[1.85] text-ink-soft"
      >
        {children}
      </div>
    </section>
  );
}

/** 강조 문장 (한 줄 결론) */
export function DocQuote({
  children,
  tone = "aqua",
}: {
  children: ReactNode;
  tone?: DocTone;
}) {
  return (
    <p
      className={`rounded-card px-[1.125rem] py-4 text-[1.125rem] font-extrabold leading-[1.7] ring-1 ${TONE_SOFT[tone]}`}
    >
      {children}
    </p>
  );
}

/** 참고 / 주의 문단 */
export function DocNote({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-btn border-l-4 border-gold bg-gold-soft/60 px-4 py-3 text-[0.9375rem] leading-relaxed text-ink-soft">
      {children}
    </p>
  );
}

/** 순서가 있는 흐름 (1 → 2 → 3) */
export function DocFlow({
  steps,
  tone = "aqua",
}: {
  steps: Array<{ title: string; desc?: string }>;
  tone?: DocTone;
}) {
  return (
    <ol className="space-y-1.5">
      {steps.map((s, i) => (
        <li
          key={s.title}
          className="relative flex items-start gap-3 rounded-card bg-card px-4 py-3.5 shadow-card ring-1 ring-black/[0.04]"
        >
          <span
            className={`nowrap-num flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-extrabold ${TONE_BADGE[tone]}`}
          >
            {i + 1}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[1.0625rem] font-extrabold text-ink">{s.title}</p>
            {s.desc && (
              <p className="mt-0.5 text-[0.9375rem] leading-relaxed text-ink-sub">
                {s.desc}
              </p>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}

/** 지금까지 ↔ 바뀌는 방향 */
export function DocCompare({
  before,
  after,
}: {
  before: { title: string; items: string[] };
  after: { title: string; items: string[] };
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div className="rounded-card bg-card-soft p-4 ring-1 ring-stone-line">
        <p className="text-sm font-extrabold uppercase tracking-wider text-ink-sub">
          {before.title}
        </p>
        <ul className="mt-2.5 space-y-1.5">
          {before.items.map((t) => (
            <li
              key={t}
              className="flex items-start gap-2 text-[0.9375rem] text-ink-sub"
            >
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-ink-faint" />
              <span className="min-w-0">{t}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="rounded-card bg-gradient-to-br from-aqua-50 to-card p-4 ring-1 ring-aqua-200/60">
        <p className="text-sm font-extrabold uppercase tracking-wider text-aqua-800">
          {after.title}
        </p>
        <ul className="mt-2.5 space-y-1.5">
          {after.items.map((t) => (
            <li
              key={t}
              className="flex items-start gap-2 text-[0.9375rem] font-semibold text-ink-soft"
            >
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-aqua-600" />
              <span className="min-w-0">{t}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/** 점으로 나열하는 목록 */
export function DocList({
  items,
  tone = "aqua",
}: {
  items: string[];
  tone?: DocTone;
}) {
  return (
    <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
      {items.map((t) => (
        <li
          key={t}
          className={`rounded-btn px-4 py-2.5 text-[1rem] font-semibold ring-1 ${TONE_SOFT[tone]}`}
        >
          {t}
        </li>
      ))}
    </ul>
  );
}

/** 결론 체인 — 1에서 8까지 이어지는 구조 */
export function DocChain({
  items,
}: {
  items: Array<{ title: string; desc: string }>;
}) {
  return (
    <ol className="relative space-y-2 pl-1">
      {items.map((s, i) => (
        <li key={s.title} className="relative flex items-start gap-3">
          <div className="flex shrink-0 flex-col items-center self-stretch">
            <span className="nowrap-num flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-aqua-500 to-deep-800 text-sm font-extrabold text-white shadow-sm">
              {i + 1}
            </span>
            {i < items.length - 1 && (
              <span className="mt-1 w-px flex-1 bg-gradient-to-b from-aqua-200 to-transparent" />
            )}
          </div>
          <div className="min-w-0 flex-1 pb-2">
            <p className="text-[1.0625rem] font-extrabold text-ink">{s.title}</p>
            <p className="mt-0.5 text-[0.9375rem] leading-relaxed text-ink-sub">
              {s.desc}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}

/** 요약 카드 3장 */
export function DocPillars({
  items,
}: {
  items: Array<{ no: string; title: string; desc: string; tone: DocTone }>;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {items.map((p) => (
        <div
          key={p.title}
          className="relative overflow-hidden rounded-card bg-card p-[1.125rem] shadow-card ring-1 ring-black/[0.04]"
        >
          <span
            className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${TONE_BAR[p.tone]}`}
          />
          <span
            className={`nowrap-num flex h-9 w-9 items-center justify-center rounded-xl text-sm font-extrabold ${TONE_BADGE[p.tone]}`}
          >
            {p.no}
          </span>
          <p className="mt-2.5 text-[1.125rem] font-extrabold text-ink">
            {p.title}
          </p>
          <p className="mt-1 text-[0.9375rem] leading-relaxed text-ink-sub">
            {p.desc}
          </p>
        </div>
      ))}
    </div>
  );
}

/** 화면 바로가기 */
export function DocLinks({
  items,
}: {
  items: Array<{ href: string; label: string; desc: string; tone: DocTone }>;
}) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {items.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className="card card-lift row-accent group flex items-center gap-3 !py-3.5 !pl-4"
        >
          <span
            className={`h-9 w-1.5 shrink-0 rounded-full bg-gradient-to-b ${TONE_BAR[l.tone]}`}
          />
          <span className="min-w-0 flex-1">
            {/* 자르지 않는다 — 좁은 폰에 큰 글씨면 「오늘의 실행 브리핑」 이 잘렸다 */}
            <span className="block text-[1.0625rem] font-extrabold text-ink [word-break:keep-all]">
              {l.label}
            </span>
            {/* 어떤 화면인지 설명하는 줄이라 자르지 않는다 (폰에서 잘려 있었다) */}
            <span className="mt-0.5 block text-[0.875rem] leading-snug text-ink-sub">
              {l.desc}
            </span>
          </span>
          <ChevronRightIcon className="h-5 w-5 shrink-0 text-ink-faint" />
        </Link>
      ))}
    </div>
  );
}

/** 단계별 사용 설명 (가이드 전용) */
export function DocSteps({
  steps,
}: {
  steps: Array<{ title: string; body: ReactNode }>;
}) {
  return (
    <ol className="space-y-2.5">
      {steps.map((s, i) => (
        <li
          key={s.title}
          className="rounded-card bg-card px-4 py-4 shadow-card ring-1 ring-black/[0.04]"
        >
          <p className="flex items-center gap-2.5 text-[1.0625rem] font-extrabold text-ink">
            <span className="nowrap-num flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-aqua-500 to-deep-700 text-sm text-white shadow-sm">
              {i + 1}
            </span>
            <span className="min-w-0">{s.title}</span>
          </p>
          <div className="mt-2 pl-[2.375rem] text-[0.9375rem] leading-[1.8] text-ink-sub">
            {s.body}
          </div>
        </li>
      ))}
    </ol>
  );
}

/** 화면 속 표현을 그대로 인용할 때 */
export function Ui({ children }: { children: ReactNode }) {
  return (
    <span className="nowrap-num rounded-md bg-aqua-50 px-2 py-0.5 text-[0.9em] font-extrabold text-aqua-800 ring-1 ring-aqua-100">
      {children}
    </span>
  );
}

/** 자주 묻는 질문 */
export function DocFaq({
  items,
}: {
  items: Array<{ q: string; a: ReactNode }>;
}) {
  return (
    <ul className="space-y-2">
      {items.map((f) => (
        <li
          key={f.q}
          className="rounded-card bg-card px-4 py-4 shadow-card ring-1 ring-black/[0.04]"
        >
          <p className="text-[1.0625rem] font-extrabold text-ink">
            <span className="mr-1 text-aqua-700">Q.</span>
            {f.q}
          </p>
          <p className="mt-1.5 text-[0.9375rem] leading-[1.8] text-ink-sub">
            {f.a}
          </p>
        </li>
      ))}
    </ul>
  );
}
