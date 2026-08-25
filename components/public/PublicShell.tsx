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
import { ChevronRightIcon } from "@/components/ui/icons";

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
  return (
    <div className="min-h-dvh bg-stone-bg">
      <header className="sticky top-0 z-30 bg-deep-900 shadow-[0_1px_0_rgba(255,255,255,0.08)]">
        <div className="mx-auto flex h-[4.25rem] max-w-5xl items-center gap-3 px-4 sm:px-6">
          <Link href="/" className="min-w-0 flex-1" aria-label="정통대왕쑥뜸원 홈">
            <Brand />
          </Link>
          <Link
            href="/my"
            className="touch-target inline-flex shrink-0 items-center gap-1 rounded-full bg-white/12 px-4 text-[0.9375rem] font-extrabold text-white ring-1 ring-white/25 transition-colors hover:bg-white/22"
          >
            내 기록
            <ChevronRightIcon className="h-4 w-4" />
          </Link>
        </div>
      </header>

      {/*
        직원 통로를 바닥글에만 두었더니, 늘 이 주소를 쓰시던 원장님이
        루트를 열고 "내부 화면이 다 어디 갔냐" 고 하셨다. 당연한 반응이다 —
        스크롤을 여섯 번 내려야 나오는 링크는 없는 것과 같다.

        그렇다고 고객이 보는 첫 화면 한복판에 '직원 로그인' 을 크게 둘 수도
        없다. 여기가 누구를 위한 곳인지 흐려진다.

        그래서 히어로 바로 위에 한 줄로 둔다. 눈에 걸리되 본문을 가리지 않는
        높이다. 누르면 로그인 게이트가 받으므로 고객이 눌러도 아무 일 없다.
      */}
      <div className="border-b border-white/10 bg-deep-950">
        <div className="mx-auto flex max-w-5xl items-center justify-end gap-2 px-4 sm:px-6">
          {/* white/45 는 딥그린 위에서 3.63:1 이라 기준(4.5:1)에 못 미쳤다 */}
          <span className="text-[0.8125rem] text-white/70">매장 직원이신가요?</span>
          <Link
            href="/dashboard"
            className="tap-line inline-flex items-center gap-1 text-[0.8125rem] font-extrabold text-gold-lite underline-offset-4 hover:underline"
          >
            내부 AX 화면
            <ChevronRightIcon className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

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
            {/* 직원 통로 — 찾으면 있는 자리에, 크지 않게 */}
            <Link
              href="/login"
              className="touch-target inline-flex items-center rounded-full px-4 text-[0.9375rem] font-bold text-ink-sub ring-1 ring-stone-line transition-colors hover:bg-stone-bg-deep hover:text-ink"
            >
              매장 직원 로그인
            </Link>
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
