"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";
import { useStore } from "@/lib/data/store";
import { BellIcon } from "@/components/ui/icons";
import { BOTTOM_NAV_ITEMS, SIDEBAR_ITEMS } from "./nav-items";

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2.5 min-w-0">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gold/50 bg-gold-soft text-gold font-serif text-lg font-bold">
        鼎
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[1.05rem] font-bold leading-tight text-ink">
          정통대왕쑥뜸원
        </span>
        {!compact && (
          <span className="block text-xs font-semibold tracking-wide text-aqua-700">
            AX Platform
          </span>
        )}
      </span>
    </Link>
  );
}

function Sidebar() {
  const pathname = usePathname();
  const { settings } = useStore();
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-card shadow-card lg:flex">
      <div className="px-5 pb-4 pt-6">
        <Logo />
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3">
        {SIDEBAR_ITEMS.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-btn px-3.5 py-2.5 text-[0.9375rem] font-semibold transition-colors ${
                active
                  ? "bg-aqua-600 text-white shadow-sm"
                  : "text-ink-soft hover:bg-aqua-50 hover:text-aqua-800"
              }`}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="m-3 rounded-card bg-card-soft p-4">
        <p className="truncate font-bold text-ink">{settings.ownerName}</p>
        <p className="truncate text-sm text-ink-sub">
          {settings.branchName} · 관리자
        </p>
      </div>
    </aside>
  );
}

function MobileHeader() {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-3 bg-stone-bg/90 px-4 py-3 backdrop-blur lg:hidden">
      <Logo compact />
      <button
        aria-label="알림"
        className="flex h-10 w-10 items-center justify-center rounded-full bg-card text-ink-sub shadow-card"
      >
        <BellIcon className="h-5 w-5" />
      </button>
    </header>
  );
}

function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-stone-bg-deep bg-card pb-[env(safe-area-inset-bottom)] shadow-nav lg:hidden">
      <div className="mx-auto flex max-w-lg items-stretch justify-between">
        {BOTTOM_NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex min-w-0 flex-1 flex-col items-center gap-0.5 px-1 pb-2 pt-2.5 text-[0.7rem] font-semibold ${
                active ? "text-aqua-700" : "text-ink-sub"
              }`}
            >
              <Icon className={`h-6 w-6 ${active ? "" : "opacity-80"}`} />
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
        <div className="mx-auto w-full max-w-6xl">{children}</div>
      </main>
      <BottomNav />
      <footer className="hidden pb-6 text-center text-xs text-ink-faint lg:ml-64 lg:block">
        © 2026 정통대왕쑥뜸원 AX Platform
      </footer>
    </div>
  );
}
