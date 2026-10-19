"use client";

/**
 * 오늘 — 바로가기 네 칸
 * ====================
 *
 * 고객 앱 홈의 바로가기 칸(배달 앱의 아이콘 칸)과 같은 모양이다.
 * 하루에 가장 자주 하는 네 가지를 아이콘 하나씩으로 둔다.
 *
 *   방문 기록      — 폰 하단 [기록] 과 같은 창
 *   고객 찾기      — 머리글 돋보기 · Ctrl/⌘+K 와 같은 창
 *   처음 오신 분   — 등록하고 곧바로 그분의 기록 창으로
 *   재방문 일정    — 다음 관리일이 다가온 분들
 *
 * 앞의 셋은 화면을 옮기지 않고 창을 연다. 창은 AppShell 이 갖고 있어서
 * 여기서는 신호만 보낸다 (lib/ui/shell-events.ts).
 */

import Link from "next/link";
import { ReactNode } from "react";
import { openShell, type ShellEvent } from "@/lib/ui/shell-events";
import {
  CalendarIcon,
  PlusIcon,
  SearchIcon,
  UsersIcon,
} from "@/components/ui/icons";

type Item = {
  label: string;
  icon: ReactNode;
  tone: string;
} & ({ open: ShellEvent; href?: never } | { href: string; open?: never });

const TONE = {
  deep: "bg-gradient-to-br from-aqua-500 to-deep-800 text-white ring-black/10",
  aqua: "bg-aqua-50 text-aqua-700 ring-aqua-100 dark:bg-aqua-500/10 dark:text-aqua-300 dark:ring-aqua-500/20",
  gold: "bg-gold-soft text-gold-deep ring-gold/20",
  stone: "bg-stone-bg-deep text-ink-soft ring-black/[0.04] dark:ring-white/10",
};

const ITEMS: Item[] = [
  { label: "방문 기록", open: "record", icon: <PlusIcon className="h-6 w-6" strokeWidth={2.4} />, tone: TONE.deep },
  { label: "고객 찾기", open: "search", icon: <SearchIcon className="h-6 w-6" />, tone: TONE.aqua },
  { label: "처음 오신 분", open: "newCustomer", icon: <UsersIcon className="h-6 w-6" />, tone: TONE.gold },
  { label: "재방문 일정", href: "/retention", icon: <CalendarIcon className="h-6 w-6" />, tone: TONE.stone },
];

export default function QuickActions() {
  const face = (it: Item) => (
    <>
      <span
        className={`flex h-14 w-14 items-center justify-center rounded-2xl ring-1 transition-transform group-hover:-translate-y-0.5 group-active:scale-95 ${it.tone}`}
      >
        {it.icon}
      </span>
      <span className="w-full text-[0.8125rem] font-bold leading-tight text-ink-soft [word-break:keep-all]">
        {it.label}
      </span>
    </>
  );
  const cls =
    "group flex w-full flex-col items-center gap-1.5 rounded-2xl py-1 text-center";
  return (
    <nav aria-label="바로가기" data-quick-actions>
      <ul className="grid grid-cols-4 gap-x-1.5">
        {ITEMS.map((it) => {
          const ev = it.open;
          return (
            <li key={it.label} className="min-w-0">
              {ev ? (
                <button type="button" onClick={() => openShell(ev)} className={cls}>
                  {face(it)}
                </button>
              ) : (
                <Link href={it.href ?? "/"} className={cls}>
                  {face(it)}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
