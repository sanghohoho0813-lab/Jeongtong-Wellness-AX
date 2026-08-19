"use client";

/**
 * 첫 시작 안내 — 고객이 한 명도 없을 때만 나온다.
 *
 * 샘플을 지우고 실제 운영을 시작한 직후에는 화면이 온통 0이라
 * 무엇부터 해야 할지 알기 어렵다. 그 자리에 다음 할 일을 놓아 준다.
 * 고객이 한 명이라도 등록되면 이 카드는 사라진다.
 */

import Link from "next/link";
import { useStore } from "@/lib/data/store";
import { SparkIcon, UploadIcon, UsersIcon } from "@/components/ui/icons";

const STEPS = [
  {
    href: "/settings",
    icon: UploadIcon,
    title: "쓰던 명부 한 번에 올리기",
    desc: "엑셀로 관리하던 고객 명부가 있다면 설정 → 데이터에서 파일로 옮깁니다.",
    cta: "설정으로 가기",
  },
  {
    href: "/customers",
    icon: UsersIcon,
    title: "고객 한 분씩 등록하기",
    desc: "이름과 연락처만 있으면 됩니다. 나머지는 방문하실 때 채워 나가면 됩니다.",
    cta: "고객 등록하기",
  },
  {
    href: "/guide",
    icon: SparkIcon,
    title: "쓰는 법 익히기",
    desc: "화면을 옮겨 가며 단계별로 보여 드립니다. 10분이면 전체 흐름이 잡힙니다.",
    cta: "사용 가이드 열기",
  },
];

export default function FirstRunCard() {
  const { customers, ready } = useStore();
  if (!ready || customers.length > 0) return null;

  return (
    <section className="card-accent rise-in">
      <p className="text-[0.7rem] font-extrabold uppercase tracking-wider text-aqua-700">
        시작하기
      </p>
      <h2 className="mt-1 text-xl font-extrabold text-ink">
        아직 등록된 고객이 없습니다
      </h2>
      <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-ink-soft">
        고객이 등록되고 방문 기록이 쌓이기 시작하면, 오늘 챙길 고객과 재방문 ·
        재등록 기회가 이 화면에 자동으로 올라옵니다. 아래 셋 중 하나부터
        시작하세요.
      </p>

      <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          return (
            <Link
              key={s.href}
              href={s.href}
              className="group flex flex-col rounded-card bg-card p-4 ring-1 ring-black/[0.05] transition-shadow hover:shadow-card-hover"
            >
              <span className="flex items-center gap-2">
                <span className="icon-pop flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-aqua-50 text-aqua-700 ring-1 ring-aqua-100">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="nowrap-num text-xs font-extrabold text-ink-faint">
                  {i + 1}단계
                </span>
              </span>
              <span className="mt-2.5 block font-extrabold text-ink">
                {s.title}
              </span>
              <span className="mt-1 block flex-1 text-sm leading-relaxed text-ink-sub">
                {s.desc}
              </span>
              <span className="mt-2.5 block text-sm font-extrabold text-aqua-700">
                {s.cta} →
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
