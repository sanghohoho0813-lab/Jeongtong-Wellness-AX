"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect } from "react";
import { useStore } from "@/lib/data/store";
import { canAccessRoute, STAFF_HOME } from "@/lib/auth/permissions";
import { BellIcon, BookIcon, SparkIcon } from "@/components/ui/icons";
import {
  BOTTOM_NAV_ITEMS,
  NAV_TONE_CLASS,
  SIDEBAR_ITEMS,
  navItemsFor,
} from "./nav-items";
import { ProfileButton } from "./UserSwitch";
import QuickSearch from "./QuickSearch";

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

function Logo() {
  const { isManager } = useStore();
  return (
    <Link
      href={isManager ? "/" : STAFF_HOME}
      className="flex min-w-0 items-center gap-2.5"
    >
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
  const items = navItemsFor(SIDEBAR_ITEMS, isManager);
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-black/[0.05] bg-card/85 backdrop-blur-md lg:flex">
      <div className="px-5 pb-3 pt-6">
        <Logo />
      </div>

      {/* 고객 찾기 — 어느 화면에 있든 가장 자주 하는 동작이라 맨 위에 둔다 */}
      <div className="mx-3 mb-2">
        <QuickSearch />
      </div>

      {/* 문서 — 메뉴 위에 배치해 처음 쓰는 사람이 먼저 보게 한다 */}
      <div className="mx-3 mb-2 grid grid-cols-2 gap-2">
        <Link
          href="/intro"
          className={`flex items-center justify-center gap-1.5 rounded-btn px-2 py-2.5 text-sm font-extrabold transition-colors ${
            isActive(pathname, "/intro")
              ? "bg-gradient-to-r from-gold to-gold-deep text-white shadow-sm"
              : "bg-gold-soft text-gold-deep ring-1 ring-gold/30 hover:bg-gold/20"
          }`}
        >
          <BookIcon className="h-4 w-4 shrink-0" />
          <span className="truncate">기획의도</span>
        </Link>
        <Link
          href="/guide"
          className={`flex items-center justify-center gap-1.5 rounded-btn px-2 py-2.5 text-sm font-extrabold transition-colors ${
            isActive(pathname, "/guide")
              ? "bg-gradient-to-r from-aqua-500 to-deep-700 text-white shadow-sm"
              : "bg-aqua-50 text-aqua-800 ring-1 ring-aqua-200 hover:bg-aqua-100"
          }`}
        >
          <SparkIcon className="h-4 w-4 shrink-0" />
          <span className="truncate">사용 가이드</span>
        </Link>
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
  const { briefingTasks, isManager } = useStore();
  // 오늘 아직 처리하지 않은 관리 대상 — 장식이 아니라 실제 건수를 보여준다
  const openCount = briefingTasks.filter(
    (t) => t.status === "pending" || t.status === "confirmed",
  ).length;

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-black/[0.04] bg-stone-bg/85 px-4 py-3 backdrop-blur-md lg:hidden">
      <Logo />
      <div className="flex shrink-0 items-center gap-2">
        <QuickSearch variant="icon" />
        {/* 직원 계정은 실행 브리핑에 접근하지 않으므로 표시하지 않는다 */}
        {isManager && (
        <Link
          href="/briefing"
          aria-label={`오늘 관리 대상 ${openCount}명 — 실행 브리핑으로 이동`}
          className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-black/[0.05] bg-card text-ink-sub shadow-card dark:border-white/10"
        >
          <BellIcon className="h-5 w-5" />
          {openCount > 0 && (
            <span className="nowrap-num absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-danger px-1 text-[0.65rem] font-extrabold text-white shadow-sm">
              {openCount > 99 ? "99+" : openCount}
            </span>
          )}
        </Link>
        )}
      </div>
    </header>
  );
}

function BottomNav() {
  const pathname = usePathname();
  const { isManager } = useStore();
  const items = navItemsFor(BOTTOM_NAV_ITEMS, isManager);
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-black/[0.05] bg-card/90 pb-[env(safe-area-inset-bottom)] shadow-nav backdrop-blur-md lg:hidden">
      {/* 직원 계정은 메뉴가 '고객' 하나뿐이라 탭이 과하게 벌어지지 않게 폭을 좁힌다 */}
      <div
        className={`mx-auto flex items-stretch justify-between ${
          items.length > 2 ? "max-w-lg" : "max-w-[16rem]"
        }`}
      >
        {items.map((item) => {
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

/**
 * 역할 기반 화면 가드 — 직원 계정이 허용되지 않은 경로에 직접 접근하면
 * 고객 화면으로 되돌린다. (Supabase 연동 시 서버 세션 기준으로 동일 규칙 적용)
 */
function RouteGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isManager, ready } = useStore();
  // 저장된 사용자 복원 전에는 판단하지 않는다 (깜빡임/오이동 방지)
  const allowed = !ready || isManager || canAccessRoute("STAFF", pathname);

  useEffect(() => {
    if (!allowed) router.replace(STAFF_HOME);
  }, [allowed, router]);

  if (!allowed) return null;
  return <>{children}</>;
}

/**
 * 저장 실패 경고.
 *
 * 브라우저 저장 공간이 꽉 찼거나 사생활 보호 모드면 화면은 멀쩡히 바뀌는데
 * 기록은 남지 않는다. 모르고 계속 입력하면 그날 작업이 통째로 사라지므로,
 * 어느 화면에 있든 눈에 띄게 알리고 백업으로 유도한다.
 */
function SaveFailedBanner() {
  const { saveFailed } = useStore();
  if (!saveFailed) return null;
  return (
    <div className="no-print sticky top-0 z-40 border-b border-danger/30 bg-danger px-4 py-2.5 text-white sm:px-6 lg:ml-64 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-3 gap-y-1">
        <span className="text-sm font-extrabold">
          기록이 이 기기에 저장되지 않고 있습니다.
        </span>
        <span className="text-sm">
          브라우저 저장 공간이 가득 찼거나 시크릿 모드일 수 있습니다. 지금 입력한
          내용이 사라질 수 있으니
        </span>
        <Link
          href="/settings"
          className="rounded-full bg-white/20 px-3 py-1 text-sm font-extrabold underline-offset-2 ring-1 ring-white/30 hover:bg-white/30"
        >
          설정에서 전체 백업받기
        </Link>
      </div>
    </div>
  );
}

export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh">
      <Sidebar />
      <MobileHeader />
      <SaveFailedBanner />
      <main className="px-4 pb-24 pt-4 sm:px-6 lg:ml-64 lg:px-8 lg:pb-10 lg:pt-8">
        <div className="mx-auto w-full max-w-7xl">
          <RouteGuard>{children}</RouteGuard>
        </div>
      </main>
      <BottomNav />
      <footer className="hidden pb-6 text-center text-xs text-ink-faint lg:ml-64 lg:block">
        © 2026 정통대왕쑥뜸원 AX Platform
      </footer>
    </div>
  );
}
