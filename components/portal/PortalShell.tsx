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
import { usePortal } from "@/lib/portal/store";
import { useHowItWorks } from "@/components/public/HowItWorks";
import { SurfaceSwitch } from "@/components/layout/SurfaceSwitch";
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

/**
 * 상단 브랜드.
 *
 * 바탕이 본문과 같은 미색이라 머리글이 있는 줄도 모르고 지나쳤다.
 * 공개 화면·직원 화면 머리글이 둘 다 딥그린인데 여기만 밝아서, 같은
 * 브랜드인지도 흐릿했다. 딥그린으로 맞춘다 — 화면 위쪽에 무게가 실리면
 * 아래 카드들이 뜨는 느낌이 나기도 한다.
 *
 * 오른쪽에는 마이페이지 하나만 둔다. 시안에는 알림 종도 있지만, 알림은
 * 마이페이지 안에 모아 두었고 종을 따로 달면 누를 것이 둘로 갈린다.
 */
export function PortalHeader({ account = false }: { account?: boolean }) {
  return (
    <header className="sticky top-0 z-30 bg-deep-900 shadow-[0_1px_0_rgba(255,255,255,0.08)]">
      <div className="mx-auto flex h-16 max-w-lg items-center gap-3 px-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-gold to-gold-deep font-serif text-lg font-bold text-deep-900 shadow-[0_2px_8px_rgba(10,46,44,0.25)]">
          鼎
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[11px] font-bold text-gold-lite/85">
            정통대왕쑥뜸원
          </span>
          <span className="block truncate text-[17px] font-extrabold leading-tight tracking-tight text-white">
            MY WELLNESS
          </span>
        </span>
        {account && (
          <Link
            href="/my/account"
            aria-label="마이페이지"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/10 text-white ring-1 ring-white/20 transition-colors hover:bg-white/20"
          >
            <UsersIcon className="h-5 w-5" />
          </Link>
        )}
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
  const { sample } = usePortal();
  const { openHowItWorks, howItWorksSheet } = useHowItWorks();
  useDeviceTheme();

  return (
    <div className="min-h-dvh bg-stone-bg">
      <PortalHeader account />

      {/*
        예시 자료로 열려 있다는 표시.

        보는 분이 "내 기록" 으로 착각하는 것이 이 화면에서 가장 나쁜
        실패다. 그래서 예시일 때는 **모든 화면 맨 위에** 적어 둔다.
        대표님이 남에게 보여 줄 때 "이건 예시입니다" 를 매번 입으로
        말하지 않아도 되는 효과도 같이 있다.

        전에는 시연 빌드(demoMode)에서만 그렸는데, 이제는 매장 시스템이
        연결되기 전이나 「예시로 둘러보기」 로 들어온 경우에도 켜진다.
        실제 기록이 들어와 있을 때는 sample 이 false 라 그려지지 않는다.
      */}
      {sample && (
        <div className="border-b border-gold/30 bg-gold-soft px-4 py-2.5">
          <div className="mx-auto flex max-w-lg flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center">
            <p className="text-[0.8125rem] font-bold leading-snug text-gold-deep">
              예시 화면입니다 — 실제 기록이 아니라 보여 드리려고 만든 자료입니다
            </p>
            {/*
              띠에서 바로 안내를 열 수 있게 한다.

              "예시입니다" 만 적어 두면 보는 분의 다음 질문이 갈 곳이 없다 —
              그럼 실제로는 어떻게 되는 건데? 그 답을 한 번 눌러서 닿는
              자리에 둔다.
            */}
            <button
              type="button"
              onClick={openHowItWorks}
              className="tap-line shrink-0 text-[0.8125rem] font-extrabold text-gold-deep underline underline-offset-2"
            >
              어떻게 이용하게 되나요
            </button>
          </div>
        </div>
      )}
      {howItWorksSheet}

      {/*
        아래 여백은 하단 네비 높이 + 홈 인디케이터 몫이다.
        이걸 빼면 마지막 카드가 네비에 가려서, 고객은 화면이 거기서
        끝난 줄 안다.
      */}
      <main className="mx-auto max-w-lg px-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] pt-4">
        {children}

        {/*
          직원이 고객 화면을 열어 본 뒤 돌아갈 길.

          전에는 "매장 직원이신가요? 내부 화면으로" 라는 작은 밑줄 글이
          모든 고객의 화면 맨 아래에 늘 붙어 있었다. 고객에게는 뜻도
          쓸모도 없는 줄이고, 정작 직원에게는 하루에 몇 번씩 쓰는 길이
          9px 짜리 각주였다.

          이제는 이 기기에서 직원으로 들어온 적이 있을 때만, 두 칸짜리
          스위치로 그린다. 고객 기기에서는 아무것도 그려지지 않는다.
          (스위치가 권한을 주지는 않는다 — /dashboard 는 여전히 StaffGate
          뒤에 있고, 자료는 RLS 가 지킨다.)
        */}
        <div className="mt-8 flex justify-center">
          <SurfaceSwitch current="portal" />
        </div>
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
                  {/*
                    실측 12.1px 이었다. 주 사용자층이 40~60대이고 이
                    다섯 칸이 고객 화면의 **주 메뉴** 인데, 화면에서 가장
                    작은 글씨 축에 들어 있었다. 13.2px 로 올린다 — 다섯 칸
                    폭(78px)에 '마이페이지' 다섯 자가 여전히 들어간다.
                  */}
                  <span className="text-[0.75rem] font-bold leading-none">
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
