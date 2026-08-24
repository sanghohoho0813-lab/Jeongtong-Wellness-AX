"use client";

/**
 * MY WELLNESS 껍데기
 * ===================
 *
 * 직원 화면의 AppShell 을 복사하지 않았다. 고객이 여기서 하는 일은
 * 다섯 가지뿐이고, 사이드바도 명령 팔레트도 필요 없다.
 *
 * 모바일이 기준이다. 주 고객층이 40~60대이고 거의 전부 휴대폰으로 연다.
 * PC 에서는 가운데 한 단으로 두고, 폭만 넓히지 않는다 — 글줄이 길어지면
 * 오히려 읽기 어렵다.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";
import {
  BodyIcon,
  ClipboardIcon,
  HomeIcon,
  LeafIcon,
  MoreIcon,
} from "@/components/ui/icons";

const NAV = [
  { href: "/my", label: "홈", icon: HomeIcon },
  { href: "/my/visits", label: "이용기록", icon: ClipboardIcon },
  { href: "/my/wellness", label: "웰니스", icon: BodyIcon },
  { href: "/my/content", label: "콘텐츠", icon: LeafIcon },
  { href: "/my/more", label: "더보기", icon: MoreIcon },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/my") return pathname === "/my";
  return pathname === href || pathname.startsWith(href + "/");
}

/** 상단 브랜드 — 직원 화면과 같은 표식을 쓰되 이름만 MY WELLNESS 로 */
export function PortalHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-black/[0.05] bg-bg/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-lg items-center gap-3 px-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-deep-700 to-deep-900 font-serif text-lg font-bold text-gold shadow-[0_2px_8px_rgba(10,46,44,0.35)]">
          鼎
        </span>
        <span className="min-w-0">
          <span className="block truncate text-[11px] font-bold text-ink-sub">
            정통대왕쑥뜸원
          </span>
          <span className="block truncate text-[17px] font-extrabold leading-tight tracking-tight text-ink">
            MY WELLNESS
          </span>
        </span>
      </div>
    </header>
  );
}

export default function PortalShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-dvh bg-bg">
      <PortalHeader />

      {/*
        아래 여백은 하단 네비 높이 + 홈 인디케이터 몫이다.
        이걸 빼면 마지막 카드가 네비에 가려서, 고객은 화면이 거기서
        끝난 줄 안다.
      */}
      <main className="mx-auto max-w-lg px-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] pt-4">
        {children}
      </main>

      <nav
        aria-label="주요 메뉴"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-black/[0.06] bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md"
      >
        <ul className="mx-auto flex max-w-lg">
          {NAV.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <li key={item.href} className="flex-1">
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex min-h-[3.75rem] flex-col items-center justify-center gap-1 px-1 transition-colors ${
                    active ? "text-aqua-700" : "text-ink-faint hover:text-ink-sub"
                  }`}
                >
                  <Icon className="h-[1.375rem] w-[1.375rem]" />
                  <span className="text-[0.6875rem] font-bold leading-none">
                    {item.label}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
