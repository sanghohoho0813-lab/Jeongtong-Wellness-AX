"use client";

/**
 * 도입 진행 안내 — 자리를 잡을 때까지만 나오는 카드
 *
 * 샘플을 지우고 실제 운영을 시작한 직후에는 화면이 온통 0이라 무엇부터 해야
 * 할지 알기 어렵다. 그렇다고 "고객이 0명일 때만" 안내하면, 고객 몇 명을 넣은
 * 다음 단계(방문 기록 → 이용권 → 브리핑 처리)에서 다시 막힌다.
 *
 * 그래서 네 단계를 끝까지 따라가며 **지금 어디까지 왔는지**를 보여 주고,
 * 네 단계가 모두 끝나면 조용히 사라진다. 다시는 나오지 않는다.
 */

import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { useStore } from "@/lib/data/store";
import { Hint } from "@/components/ui/Hint";
import {
  CheckIcon,
  ChevronRightIcon,
  ClipboardIcon,
  SparkIcon,
  UploadIcon,
  UsersIcon,
} from "@/components/ui/icons";

const OPEN_KEY = "jeongtong-fold:first-run";

interface Step {
  key: string;
  done: boolean;
  title: string;
  desc: string;
  href: string;
  cta: string;
  icon: React.ComponentType<{ className?: string }>;
}

export default function FirstRunCard({
  defaultOpen = false,
}: {
  /** 아무것도 없는 첫날 — 이 안내가 곧 화면이라 단계를 펴 둔다 */
  defaultOpen?: boolean;
} = {}) {
  const { customers, visits, memberships, taskOverrides, ready, isManager } =
    useStore();
  /** 네 단계 목록을 폈는지 — 그 기기에 기억한다 (접는 칸과 같은 방식) */
  const [open, setOpen] = useState(defaultOpen);
  const listId = `${useId()}-steps`;
  useEffect(() => {
    try {
      const v = localStorage.getItem(OPEN_KEY);
      if (v === "1") setOpen(true);
      else if (v === "0") setOpen(false);
    } catch {
      /* 기억 못 하면 접힌 채로 */
    }
  }, []);
  const toggle = () =>
    setOpen((v) => {
      try {
        localStorage.setItem(OPEN_KEY, v ? "0" : "1");
      } catch {
        /* 지금 화면만 바뀐다 */
      }
      return !v;
    });

  const steps: Step[] = [
    {
      key: "customers",
      done: customers.length > 0,
      title: "고객 등록하기",
      desc: "이름과 연락처만 있으면 됩니다. 쓰던 엑셀 명부가 있다면 설정에서 한 번에 올릴 수 있습니다.",
      href: "/customers",
      cta: "고객 등록",
      icon: UsersIcon,
    },
    {
      key: "visits",
      done: visits.some((v) => v.type === "visit"),
      title: "첫 방문 기록하기",
      desc: "고객이 다녀가시면 프로그램 · 케어 부위 · 반응을 남깁니다. 여기서부터 관리 대상이 잡히기 시작합니다.",
      href: "/customers",
      cta: "방문 기록",
      icon: ClipboardIcon,
    },
    {
      key: "memberships",
      done: memberships.length > 0,
      title: "이용권 등록하기",
      desc: "이용권을 등록해 두면 방문할 때마다 자동으로 차감되고, 잔여가 줄면 재등록 시점을 알려 드립니다.",
      href: "/customers",
      cta: "고객 화면으로",
      icon: UploadIcon,
    },
    {
      key: "briefing",
      done: taskOverrides.some((t) => t.status === "done"),
      title: "오늘 할 일 처리해 보기",
      desc: "실행 브리핑에서 과제를 하나 처리해 보세요. 처리 결과가 쌓이면 도입성과 화면이 채워집니다.",
      href: "/briefing",
      cta: "실행 브리핑",
      icon: SparkIcon,
    },
  ];

  const doneCount = steps.filter((s) => s.done).length;
  // 자리를 잡았으면 더 보여 줄 이유가 없다
  if (!ready || !isManager || doneCount === steps.length) return null;

  const current = steps.find((s) => !s.done)!;
  const CurrentIcon = current.icon;

  return (
    /*
      평소에는 **지금 할 단계 한 줄**만 — 몇 단계째인지 · 무엇을 · 바로 가는 단추.
      네 단계 전체와 설명은 「단계 보기」 를 눌렀을 때 편다.

      예전에는 네 단계를 늘 펴 두어 폰에서 이 안내만 540px 이었다. 대표님
      말씀: 「오늘에 너무 많이 펼쳐져 있어서 집중이 안 된다 — 그렇다고
      기능을 못 쓰게 하거나 숨겨 두지는 말고.」 그래서 지금 할 일로 가는
      단추는 접혀 있어도 늘 보이고, 접는 것은 예고와 설명뿐이다.
    */
    <section className="card-accent rise-in" data-first-run data-open={open ? "true" : "false"}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2.5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-aqua-50 text-aqua-700 ring-1 ring-aqua-100">
          <CurrentIcon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="nowrap-num text-[0.75rem] font-extrabold tracking-wide text-aqua-700">
            시작하기 · {doneCount} / {steps.length} 단계
          </p>
          <Hint text={current.desc} title={current.title}>
            <h2 className="text-[1.0625rem] font-extrabold leading-snug text-ink [word-break:keep-all]">
              {doneCount === 0
                ? "네 단계만 거치면 자리가 잡힙니다"
                : `다음은 ${current.title.replace(/하기$/, "")} 차례입니다`}
            </h2>
          </Hint>
        </div>
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <Link
            href={current.href}
            aria-current="step"
            className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-1 rounded-btn bg-gradient-to-b from-aqua-650 to-aqua-850 px-4 text-[0.9375rem] font-extrabold text-white shadow-[0_2px_8px_rgba(14,127,125,0.3)] transition-colors hover:from-aqua-850 hover:to-deep-700 sm:flex-none"
          >
            {current.cta}
            <ChevronRightIcon className="h-4 w-4" />
          </Link>
          <button
            type="button"
            onClick={toggle}
            aria-expanded={open}
            aria-controls={listId}
            className="touch-target inline-flex shrink-0 items-center gap-1 rounded-btn px-3 text-[0.875rem] font-bold text-ink-sub ring-1 ring-stone-line transition-colors hover:bg-aqua-50 hover:text-aqua-800"
          >
            {open ? "접기" : "단계 보기"}
            <ChevronRightIcon
              className={`h-4 w-4 transition-transform ${open ? "-rotate-90" : "rotate-90"}`}
            />
          </button>
        </div>
      </div>

      {/* 진행 막대 — 어디까지 왔는지 한눈에 */}
      <div
        className="mt-3 flex gap-1.5"
        role="progressbar"
        aria-valuenow={doneCount}
        aria-valuemin={0}
        aria-valuemax={steps.length}
        aria-label="도입 진행"
      >
        {steps.map((s) => (
          <span
            key={s.key}
            className={`h-1.5 flex-1 rounded-full transition-colors duration-150 ${
              s.done
                ? "bg-gradient-to-r from-aqua-400 to-deep-700"
                : "bg-stone-bg-deep"
            }`}
          />
        ))}
      </div>

      <div id={listId} hidden={!open}>
        <ul className="mt-3 space-y-2">
          {steps.map((s, i) => {
            const Icon = s.icon;
            const isCurrent = s.key === current.key;
            return (
              <li key={s.key}>
                <Link
                  href={s.href}
                  className={`flex items-start gap-2.5 rounded-card px-3.5 py-2.5 ${
                    isCurrent
                      ? "bg-card ring-2 ring-aqua-500"
                      : "bg-card/60 ring-1 ring-black/[0.04]"
                  }`}
                >
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ring-1 ${
                      s.done
                        ? "bg-emerald-50 text-positive-text ring-emerald-100 dark:bg-emerald-400/10 dark:ring-emerald-400/20"
                        : isCurrent
                          ? "bg-aqua-50 text-aqua-700 ring-aqua-100"
                          : "bg-stone-bg-deep text-ink-faint ring-black/[0.04]"
                    }`}
                  >
                    {s.done ? (
                      <CheckIcon className="h-4 w-4" strokeWidth={2.8} />
                    ) : (
                      <Icon className="h-4 w-4" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-x-2">
                      <span className="nowrap-num text-xs font-extrabold text-ink-faint">
                        {i + 1}단계
                      </span>
                      <span
                        className={`text-[0.9375rem] font-bold leading-snug ${
                          s.done
                            ? "text-ink-faint line-through"
                            : isCurrent
                              ? "text-ink"
                              : "text-ink-sub"
                        }`}
                      >
                        {s.title}
                      </span>
                      {isCurrent && (
                        <span className="rounded-full bg-sel px-2 py-0.5 text-[0.6875rem] font-extrabold text-sel-ink">
                          지금 할 일
                        </span>
                      )}
                    </span>
                    {!s.done && (
                      <span className="mt-0.5 block text-sm leading-relaxed text-ink-sub">
                        {s.desc}
                      </span>
                    )}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>

        <p className="mt-3 text-[0.875rem] leading-relaxed text-ink-faint">
          네 단계를 마치면 이 안내는 사라집니다. 사용법을 처음부터 보고 싶으시면{" "}
          <Link
            href="/guide"
            className="tap-line font-bold text-aqua-700 hover:underline"
          >
            사용 방법
          </Link>
          를 열어 보세요.
        </p>
      </div>
    </section>
  );
}
