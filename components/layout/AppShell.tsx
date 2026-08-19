"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";
import { useStore } from "@/lib/data/store";
import { BellIcon } from "@/components/ui/icons";
import { BOTTOM_NAV_ITEMS, NAV_TONE_CLASS, SIDEBAR_ITEMS } from "./nav-items";
import { ProfileButton } from "./UserSwitch";

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

function Logo() {
  return (
    <Link href="/" className="flex min-w-0 items-center gap-2.5">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-deep-700 to-deep-900 font-serif text-lg font-bold text-gold shadow-[0_2px_8px_rgba(10,46,44,0.35)]">
        鼎
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[1.05rem] font-extrabold leading-tight tracking-tight text-ink">
          정통대왕쑥뜸원
        </span>
        {/* AX 브랜드 시그니처 — 한글 브랜드보다 작게, PC/모바일 동일 문구 */}
        <span className="block truncate text-[0.625rem] font-bold uppercase tracking-[0.1em] text-aqua-700">
          Wellness Business AX
        </span>
      </span>
    </Link>
  );
}

function Sidebar() {
  const pathname = usePathname();
  const { isManager } = useStore();
  const items = SIDEBAR_ITEMS.filter(
    (item) => isManager || item.href !== "/branches",
  );
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-black/[0.05] bg-card/85 backdrop-blur-md lg:flex">
      <div className="px-5 pb-5 pt-6">
        <Logo />
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3">
        {items.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group relative flex items-center gap-2.5 rounded-btn px-2.5 py-2 text-[0.9375rem] font-bold transition-colors ${
                active
                  ? "bg-gradient-to-r from-deep-700 to-deep-800 text-white shadow-[0_3px_10px_rgba(10,46,44,0.28)]"
                  : "text-ink-sub hover:bg-stone-bg"
              }`}
            >
              {active && (
                <span className="absolute -left-3 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-aqua-400" />
              )}
              {/* 메뉴별 컬러 아이콘 타일 */}
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ring-1 transition-colors ${
                  active
                    ? "bg-white/15 text-aqua-300 ring-white/20"
                    : NAV_TONE_CLASS[item.tone]
                }`}
              >
                <Icon className="h-[1.15rem] w-[1.15rem]" />
              </span>
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="m-3">
        <ProfileButton />
      </div>
    </aside>
  );
}

function MobileHeader() {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-black/[0.04] bg-stone-bg/85 px-4 py-3 backdrop-blur-md lg:hidden">
      <Logo />
      <button
        aria-label="알림"
        className="flex h-10 w-10 items-center justify-center rounded-full border border-black/[0.05] bg-card text-ink-sub shadow-card dark:border-white/10"
      >
        <BellIcon className="h-5 w-5" />
      </button>
    </header>
  );
}

function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-black/[0.05] bg-card/90 pb-[env(safe-area-inset-bottom)] shadow-nav backdrop-blur-md lg:hidden">
      <div className="mx-auto flex max-w-lg items-stretch justify-between">
        {BOTTOM_NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex min-w-0 flex-1 flex-col items-center gap-1 px-1 pb-2.5 pt-3 text-[0.72rem] font-bold ${
                active ? "text-deep-800 dark:text-aqua-700" : "text-ink-faint"
              }`}
            >
              {active && (
                <span className="absolute top-0 h-[3px] w-9 rounded-b-full bg-aqua-500" />
              )}
              <Icon className={`h-6 w-6 ${active ? "" : "opacity-85"}`} />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh">
      <Sidebar />
      <MobileHeader />
      <main className="px-4 pb-24 pt-4 sm:px-6 lg:ml-64 lg:px-8 lg:pb-10 lg:pt-8">
        <div className="mx-auto w-full max-w-7xl">{children}</div>
      </main>
      <BottomNav />
      <footer className="hidden pb-6 text-center text-xs text-ink-faint lg:ml-64 lg:block">
        © 2026 정통대왕쑥뜸원 AX Platform
      </footer>
    </div>
  );
}
