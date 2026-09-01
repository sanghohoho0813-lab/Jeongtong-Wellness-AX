"use client";

/**
 * 공개 화면 껍데기
 * ================
 *
 * 두 가지 사람이 이 문으로 들어온다.
 *
 *   1) 우리를 처음 본 사람   — 무엇을 하는 곳인지, 뭘 하면 되는지 알아야 한다
 *   2) 이미 다니시는 고객    — 바로 자기 화면(MY WELLNESS)으로 가고 싶다
 *
 * 그래서 머리글에는 딱 하나, [내 기록] 만 둔다. 나머지는 본문이 안내한다.
 *
 * 직원 통로는 바닥글에 조용히 둔다. 고객이 보는 첫 화면에 '직원 로그인'이
 * 크게 붙어 있으면 여기가 누구를 위한 곳인지 흐려진다. 그렇다고 숨기면
 * 원장님이 매번 주소를 쳐야 하므로, 찾으면 있는 자리에 둔다.
 */

import Link from "next/link";
import { ReactNode } from "react";
import { useDeviceTheme } from "@/components/portal/PortalShell";
import { ChevronRightIcon } from "@/components/ui/icons";
import PublicNav from "./PublicNav";
import {
  StaffEntryButton,
  SurfaceStrip,
  SurfaceSwitch,
} from "@/components/layout/SurfaceSwitch";

/** 상호는 화면 설정(글자 크기)을 따르지 않는다 — 브랜드 표기라서 */
function Brand({ tone = "dark" }: { tone?: "dark" | "light" }) {
  const sub = tone === "dark" ? "text-gold-lite/85" : "text-ink-sub";
  const main = tone === "dark" ? "text-white" : "text-ink";
  return (
    <span className="flex min-w-0 items-center gap-2.5">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-gold to-gold-deep font-serif text-lg font-bold text-deep-900 shadow-[0_2px_8px_rgba(10,46,44,0.25)]">
        鼎
      </span>
      <span className="min-w-0 leading-tight">
        <span className={`block truncate text-[1.0625rem] font-extrabold ${main}`}>
          정통대왕쑥뜸원
        </span>
        {/*
          "WELLNESS BUSINESS AX" 를 자간까지 벌려 놓았더니 390px 폰에서
          "WELLNESS BUSINE…" 로 잘렸다. 브랜드 표기가 말줄임으로 끝나면
          그 자체로 완성도가 떨어져 보인다. 좁은 화면에서는 짧은 쪽을 쓴다.
        */}
        <span className={`block truncate text-[0.6875rem] font-bold tracking-[0.12em] ${sub}`}>
          <span className="sm:hidden">WELLNESS AX</span>
          <span className="hidden sm:inline">WELLNESS BUSINESS AX</span>
        </span>
      </span>
    </span>
  );
}

export default function PublicShell({ children }: { children: ReactNode }) {
  /*
    고객 폰의 밝기를 따라간다 — 고객 화면(/my)과 같은 규칙이다.
    첫 그림은 layout.tsx 의 선(先)적용 스크립트가 맞춰 두고, 여기서는
    화면을 열어 둔 채 폰이 밤 모드로 넘어가는 경우를 받는다.
  */
  useDeviceTheme();

  return (
    <div className="min-h-dvh bg-stone-bg">
      <header className="sticky top-0 z-30 bg-deep-900 shadow-[0_1px_0_rgba(255,255,255,0.08)]">
        <div className="mx-auto flex h-[4.25rem] max-w-5xl items-center gap-3 px-4 sm:px-6">
          <Link href="/welcome" className="min-w-0 flex-1" aria-label="정통대왕쑥뜸원 홈">
            <Brand />
          </Link>
          {/*
            머리글에는 둘만 둔다 — 「내 기록」과 전체 메뉴.

            이 화면은 폰에서 6,900px 이라 위에서부터 훑어 내려가는 것만으로는
            두 번째 오는 분이 가격이나 예약을 다시 찾기 어렵다. 전체 메뉴를
            열면 화면 안의 자리로 바로 내려간다.
          */}
          <Link
            href="/my"
            className="touch-target inline-flex shrink-0 items-center gap-1 rounded-full bg-white/12 px-4 text-[0.9375rem] font-extrabold text-white ring-1 ring-white/25 transition-colors hover:bg-white/22"
          >
            내 기록
            <ChevronRightIcon className="h-4 w-4" />
          </Link>
          <PublicNav />
        </div>
      </header>

      {/*
        직원 통로.

        전에는 이 자리에 "매장 직원이신가요?  내부 AX 화면 ›" 이 **모든
        사람에게** 늘 떠 있었다. 이 화면을 보는 사람의 대부분은 고객이고,
        고객에게 그 링크는 눌러도 로그인 벽만 만나는 막다른 길이다.
        첫 화면 두 번째 줄을 막다른 길에 내주고 있던 셈이다.

        이제는 이 기기에서 직원으로 들어온 적이 있을 때만 그린다. 그때는
        각주가 아니라 두 칸짜리 스위치로 — 지금 어느 쪽에 있고 어디로 갈
        수 있는지가 한눈에 보인다. 아무것도 안 보이는 사람에게는 바닥글의
        '매장 직원 로그인' 버튼이 그 자리를 대신한다.
      */}
      <SurfaceStrip current="public" />

      <main id="main">{children}</main>

      <footer className="mt-10 border-t border-stone-line bg-card">
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
          <Brand tone="light" />
          <p className="mt-3 max-w-prose text-[0.9375rem] leading-relaxed text-ink-sub">
            온열 웰니스 케어를 제공하는 매장입니다. 이 화면에서 예약을 확정하거나
            결제하지는 않습니다 — 남겨 주신 요청은 매장에서 확인한 뒤 연락드립니다.
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <Link
              href="/my"
              className="touch-target inline-flex items-center rounded-full bg-aqua-50 px-4 text-[0.9375rem] font-extrabold text-aqua-800 ring-1 ring-aqua-100 transition-colors hover:bg-aqua-100"
            >
              내 기록 보기
            </Link>
            {/*
              직원 통로 — 찾으면 있는 자리에, 크지 않게.
              위쪽 스위치가 보이는 기기에서는 이 버튼이 사라진다.
              같은 일을 하는 길이 한 화면에 둘 있을 이유가 없다.
            */}
            <StaffEntryButton />
            <SurfaceSwitch current="public" />
          </div>

          {/*
            고객 화면(/my/more · /my/account)과 같은 문장을 쓴다.
            "의학적 진단이나 치료를 대신하지 않습니다" 라고 쓸 뻔했는데,
            뜻은 맞아도 우리 화면 어디에도 없던 단어를 굳이 여기서 처음
            꺼내게 된다. 같은 말을 이미 쓰고 있는 표현으로 맞춘다.
          */}
          <p className="mt-6 text-[0.8125rem] leading-relaxed text-ink-faint">
            표시되는 케어 안내는 이용 기록을 바탕으로 정리한 것입니다. 몸 상태에
            대한 판단이나 의학적 안내는 제공하지 않습니다.
          </p>
        </div>
      </footer>
    </div>
  );
}
