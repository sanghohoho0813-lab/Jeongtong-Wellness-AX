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
import { ReactNode, useEffect } from "react";
import {
  CalendarIcon,
  ClipboardIcon,
  HomeIcon,
  TicketIcon,
  UsersIcon,
} from "@/components/ui/icons";

/**
 * 하단 다섯 칸.
 *
 * 예전에는 홈 · 이용기록 · 웰니스 · 콘텐츠 · 더보기 였다. 그런데 고객이
 * 이 앱을 여는 이유를 순서대로 적어 보면 다르다.
 *
 *   "다음에 언제 가지"     → 예약
 *   "몇 번 남았지"          → 이용권
 *   "저번에 어디 봐줬더라"  → 케어기록
 *
 * 웰니스·콘텐츠는 그 다음이다. 궁금해서 들어오는 것이지, 이걸 하러
 * 들어오지는 않는다. 그래서 다섯 칸을 '하러 오는 일' 로 다시 채우고,
 * 웰니스·콘텐츠·서비스 소개는 홈과 케어기록에서 이어 준다.
 */
const NAV = [
  { href: "/my", label: "홈", icon: HomeIcon },
  { href: "/my/booking", label: "예약", icon: CalendarIcon },
  { href: "/my/passes", label: "이용권", icon: TicketIcon },
  { href: "/my/care", label: "케어기록", icon: ClipboardIcon },
  { href: "/my/account", label: "마이페이지", icon: UsersIcon },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/my") return pathname === "/my";
  return pathname === href || pathname.startsWith(href + "/");
}

/** 상단 브랜드 — 직원 화면과 같은 표식을 쓰되 이름만 MY WELLNESS 로 */
export function PortalHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-black/[0.05] bg-stone-bg/90 backdrop-blur-md">
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

/**
 * 고객 폰의 밝기 설정을 따라간다.
 *
 * 첫 그림은 layout.tsx 의 선(先)적용 스크립트가 이미 맞춰 두었고,
 * 여기서는 화면을 열어 둔 채로 폰이 밤 모드로 넘어가는 경우를 받는다.
 * 매장 설정(직원이 고른 테마)은 보지 않는다 — 고객 폰의 일이다.
 */
export function useDeviceTheme() {
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      document.documentElement.dataset.theme = media.matches ? "dark" : "light";
    };
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);
}

export default function PortalShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  useDeviceTheme();

  return (
    <div className="min-h-dvh bg-stone-bg">
      <PortalHeader />

      {/*
        아래 여백은 하단 네비 높이 + 홈 인디케이터 몫이다.
        이걸 빼면 마지막 카드가 네비에 가려서, 고객은 화면이 거기서
        끝난 줄 안다.
      */}
      <main className="mx-auto max-w-lg px-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] pt-4">
        {children}

        {/*
          직원이 고객 화면을 열어 본 뒤 돌아갈 길.

          누구에게나 보이지만 아무것도 새어 나가지 않는다 — 이 링크가 가리키는
          /dashboard 는 직원 로그인 게이트 뒤에 있어서, 고객이 눌러도 로그인
          화면에서 멈춘다. 링크 하나로 권한이 생기지는 않는다.
        */}
        <p className="mt-8 text-center text-[0.8125rem] text-ink-faint">
          매장 직원이신가요?{" "}
          <Link
            href="/dashboard"
            className="tap-line font-bold text-ink-sub underline-offset-4 hover:text-aqua-700 hover:underline"
          >
            내부 화면으로
          </Link>
        </p>
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
