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
import { useStore } from "@/lib/data/store";
import {
  CheckIcon,
  ClipboardIcon,
  SparkIcon,
  UploadIcon,
  UsersIcon,
} from "@/components/ui/icons";

interface Step {
  key: string;
  done: boolean;
  title: string;
  desc: string;
  href: string;
  cta: string;
  icon: React.ComponentType<{ className?: string }>;
}

export default function FirstRunCard() {
  const { customers, visits, memberships, taskOverrides, ready, isManager } =
    useStore();

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

  return (
    <section className="card-accent rise-in">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <p className="text-[0.7rem] font-extrabold uppercase tracking-wider text-aqua-700">
            시작하기
          </p>
          <h2 className="mt-1 text-xl font-extrabold text-ink">
            {doneCount === 0
              ? "네 단계만 거치면 자리가 잡힙니다"
              : `다음은 ${current.title.replace(/하기$/, "")} 차례입니다`}
          </h2>
        </div>
        <p className="nowrap-num shrink-0 text-sm font-bold text-ink-sub">
          {doneCount} / {steps.length} 단계
        </p>
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

      {/*
        지금 할 단계 하나만 크게 펼치고, 나머지는 한 줄로 줄인다.
        네 단계를 모두 펼쳐 두면 폰에서 이 안내만 화면 하나를 넘겨서
        정작 오늘의 할 일이 화면 밖으로 밀려난다.
        끝난 단계는 지웠다는 표시로 남기고, 남은 단계는 예고로만 보인다.
      */}
      <ul className="mt-4 space-y-2">
        {steps.map((s, i) => {
          const Icon = s.icon;
          const isCurrent = s.key === current.key;

          if (!isCurrent) {
            return (
              <li key={s.key}>
                <Link
                  href={s.href}
                  className="flex items-center gap-2.5 rounded-card bg-card/60 px-3.5 py-2.5 ring-1 ring-black/[0.04]"
                >
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ring-1 ${
                      s.done
                        ? "bg-emerald-50 text-positive-text ring-emerald-100 dark:bg-emerald-400/10 dark:ring-emerald-400/20"
                        : "bg-stone-bg-deep text-ink-faint ring-black/[0.04]"
                    }`}
                  >
                    {s.done ? (
                      <CheckIcon className="h-4 w-4" strokeWidth={2.8} />
                    ) : (
                      <Icon className="h-4 w-4" />
                    )}
                  </span>
                  <span className="nowrap-num shrink-0 text-xs font-extrabold text-ink-faint">
                    {i + 1}단계
                  </span>
                  <span
                    className={`min-w-0 flex-1 text-[0.9375rem] font-bold leading-snug ${
                      s.done ? "text-ink-faint line-through" : "text-ink-sub"
                    }`}
                  >
                    {s.title}
                  </span>
                </Link>
              </li>
            );
          }

          return (
            <li key={s.key}>
              <Link
                href={s.href}
                aria-current="step"
                className="group flex flex-col rounded-card bg-card p-4 ring-2 ring-aqua-500 transition-shadow hover:shadow-card-hover"
              >
                <span className="flex items-center gap-2">
                  <span className="icon-pop flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-aqua-50 text-aqua-700 ring-1 ring-aqua-100">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="nowrap-num text-xs font-extrabold text-ink-faint">
                    {i + 1}단계
                  </span>
                  <span className="rounded-full bg-sel px-2 py-0.5 text-[0.6875rem] font-extrabold text-sel-ink">
                    지금 할 일
                  </span>
                </span>

                <span className="mt-2.5 block text-[1.0625rem] font-extrabold text-ink">
                  {s.title}
                </span>
                <span className="mt-1 block text-sm leading-relaxed text-ink-sub">
                  {s.desc}
                </span>
                <span className="mt-2.5 block text-sm font-extrabold text-aqua-700">
                  {s.cta} →
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
          사용 가이드
        </Link>
        를 열어 보세요.
      </p>
    </section>
  );
}
