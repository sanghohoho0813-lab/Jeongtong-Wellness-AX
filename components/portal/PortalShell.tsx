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
import { ReactNode, useEffect, useRef, useState } from "react";
import { usePortal } from "@/lib/portal/store";
import { useHowItWorks } from "@/components/public/HowItWorks";
import { SurfaceSwitch } from "@/components/layout/SurfaceSwitch";
import { scrollToTop, scrollTopIfHere } from "@/lib/ui/scroll";
import { BAND_TITLE_EVENT, BandTitle } from "@/lib/ui/band-title";
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
  /*
    내려가서 쪽 제목(PageHead)이 머리글 밑으로 들어가면, 「MY WELLNESS」
    자리에 그 화면 이름이 온다 (D-60 — 직원 화면과 같은 움직임). 위의 작은
    줄은 「MY WELLNESS」 로 남아 어느 앱인지는 그대로 보인다. 눌러서 맨 위로.
  */
  const ref = useRef<HTMLElement>(null);
  const [band, setBand] = useState<BandTitle | null>(null);
  const pathname = usePathname();
  useEffect(() => {
    const el = ref.current;
    if (el) document.documentElement.style.setProperty("--mobile-header-h", `${el.offsetHeight}px`);
    const onBand = (e: Event) => setBand((e as CustomEvent<BandTitle | null>).detail);
    window.addEventListener(BAND_TITLE_EVENT, onBand);
    return () => window.removeEventListener(BAND_TITLE_EVENT, onBand);
  }, []);
  useEffect(() => setBand(null), [pathname]);

  const brand = (
    <>
      <span className="block truncate text-[11px] font-bold text-gold-lite/85">
        {band ? "MY WELLNESS" : "정통대왕쑥뜸원"}
      </span>
      <span className="block truncate text-[17px] font-extrabold leading-tight tracking-tight text-white">
        {band ? band.title : "MY WELLNESS"}
      </span>
    </>
  );
  return (
    <header ref={ref} className="sticky top-0 z-30 bg-deep-900 shadow-[0_1px_0_rgba(255,255,255,0.08)]">
      <div className="mx-auto flex h-16 max-w-lg items-center gap-3 px-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-gold to-gold-deep font-serif text-lg font-bold text-deep-900 shadow-[0_2px_8px_rgba(10,46,44,0.25)]">
          鼎
        </span>
        {band ? (
          <button
            type="button"
            data-header-title
            onClick={scrollToTop}
            aria-label={`${band.title} — 맨 위로`}
            className="header-title-in min-h-[44px] min-w-0 flex-1 text-left"
          >
            {brand}
          </button>
        ) : (
          <span className="min-w-0 flex-1">{brand}</span>
        )}
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
        /*
          한 줄짜리 띠 — 배달 앱 맨 위의 「다음 두 번 무료 배달」 띠 자리.
          예전에는 세 줄(95px)이라 모든 화면의 첫 화면을 먹었다. 뜻은
          그대로(예시다 · 실제 기록이 아니다 · 어떻게 쓰게 되는지)이고
          높이만 줄였다. 좁은 폰에서는 두 줄까지 접힌다.
        */
        <div className="border-b border-gold/25 bg-gold-soft" data-sample-strip>
          <div className="mx-auto flex max-w-lg items-center gap-2 px-4 py-1.5">
            <span className="shrink-0 rounded-full bg-gold-deep px-2 py-0.5 text-[0.6875rem] font-extrabold text-white dark:text-deep-900">
              예시
            </span>
            {/* 좁은 폰에서도 한 줄 — 「실제 기록이 아닙니다」 는 자리가 있을 때만 (읽어 주는 프로그램에는 늘) */}
            <p className="min-w-0 flex-1 text-[0.8125rem] font-bold leading-snug text-gold-deep">
              예시 화면입니다
              <span className="sr-only min-[440px]:not-sr-only"> — 실제 기록이 아닙니다</span>
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
              className="tap-line shrink-0 rounded-full text-[0.8125rem] font-extrabold text-gold-deep underline underline-offset-2"
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
      {/*
        아래 고정 단추(StickyBar)가 있는 화면은 그 높이만큼 더 띄운다 —
        맨 끝까지 내렸을 때 마지막 줄(화면 전환 스위치 등)이 단추 밑에
        깔리지 않게. :has() 로 「이 화면에 고정 단추가 있는가」 를 본다.
      */}
      <main className="mx-auto max-w-lg px-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] pt-4 [&:has([data-sticky-bar])]:pb-[calc(10.5rem+env(safe-area-inset-bottom))]">
        {/* 화면이 바뀌면 새 화면이 살짝 떠오른다 (D-59, 투명도만) */}
        <div key={pathname} className="page-enter">
          {children}
        </div>

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
                  onClick={(e) => scrollTopIfHere(e, pathname, item.href)}
                  className={`group flex min-h-[3.75rem] flex-col items-center justify-center gap-0.5 px-1 transition-colors ${
                    active ? "text-aqua-800 dark:text-aqua-300" : "text-ink-faint hover:text-ink-sub"
                  }`}
                >
                  {/* 지금 화면은 아이콘 뒤에 알약 — 색만이 아니라 모양으로도 표시 */}
                  <span
                    className={`flex h-8 w-14 items-center justify-center rounded-full transition-[background-color,transform] duration-150 group-active:scale-90 ${
                      active ? "bg-aqua-50 dark:bg-aqua-500/15" : ""
                    }`}
                  >
                    <Icon className="h-[1.375rem] w-[1.375rem]" />
                  </span>
                  {/*
                    실측 12.1px 이었다. 주 사용자층이 40~60대이고 이
                    다섯 칸이 고객 화면의 **주 메뉴** 인데, 화면에서 가장
                    작은 글씨 축에 들어 있었다. 13.2px 로 올린다 — 다섯 칸
                    폭(78px)에 '마이페이지' 다섯 자가 여전히 들어간다.
                  */}
                  <span
                    className={`text-[0.75rem] leading-none ${active ? "font-extrabold" : "font-bold"}`}
                  >
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
