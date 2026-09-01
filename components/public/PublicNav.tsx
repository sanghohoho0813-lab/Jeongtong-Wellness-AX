"use client";

/**
 * 고객용 화면 전체 메뉴 (햄버거)
 * ============================
 *
 * 왜 필요해졌나
 * -------------
 * 이 화면은 길다. 폰에서 6,900px, PC 에서 3,600px 쯤 된다. 위에서부터
 * 차례로 읽으라고 만든 순서라 길이 자체는 잘못이 아니다 —
 *
 *     여기가 무엇을 하는 곳인가 → 지금 뭘 할 수 있나 → 어떤 곳인가
 *     → 실제로 뭘 해 주나 → 얼마인가 → 왜 여기여야 하나 → 앞으로는
 *
 * 문제는 **두 번째로 오는 사람**이다. 가격만 다시 보려는 분, 예약만
 * 하려는 분이 매번 처음부터 훑어 내려가야 한다. 긴 화면에는 목차가
 * 있어야 한다.
 *
 * 왜 상단 메뉴 막대가 아니라 햄버거인가
 * -------------------------------------
 * 항목이 여덟이다. 폰 390px 폭에 여덟 개를 늘어놓을 수 없고, PC 에만
 * 막대를 두면 폰에서는 여전히 목차가 없다. 한 벌로 두면 양쪽이 같게
 * 동작하고 고칠 곳도 하나다.
 *
 * 그리고 이 화면의 주인공은 히어로와 큰 단추 넷이다. 머리글에 메뉴를
 * 여덟 개 펼치면 그 둘이 밀린다.
 *
 * 순서 — 지금 할 수 있는 것이 먼저다
 * ----------------------------------
 * 전체 메뉴에서도 70/30 을 지킨다. 지금 되는 일(예약 · 이용권 · 상담 ·
 * 내 기록)이 위에 오고, 「앞으로 준비하고 있는 것」은 맨 아래에 배지를
 * 달고 들어간다. 눌러 보면 아직 없는 기능이라는 것을 알 수 있지만,
 * 그 전에 지금 되는 것들을 먼저 지나가게 한다.
 */

import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  CalendarIcon,
  BodyIcon,
  BookIcon,
  ChatIcon,
  CheckIcon,
  ChevronRightIcon,
  ClipboardIcon,
  LeafIcon,
  MoreIcon,
  SparkIcon,
  TicketIcon,
  XIcon,
} from "@/components/ui/icons";
import { useHowItWorks } from "./HowItWorks";

/**
 * 지금 바로 하실 수 있는 일 — 다른 화면으로 건너간다.
 * 화면 안 자리로 가는 것이 아니라 실제 기능이라 위에 따로 둔다.
 */
const DO_NOW = [
  { href: "/my/booking", label: "예약하기", desc: "날짜를 남기시면 연락드립니다", icon: CalendarIcon },
  { href: "/my", label: "내 기록 보기", desc: "이용 기록과 남은 이용권", icon: ClipboardIcon },
  { href: "/my/request", label: "상담 문의", desc: "궁금한 점을 남겨 주세요", icon: ChatIcon },
];

/**
 * 이 화면 안의 자리 — 눌러서 그 자리로 내려간다.
 *
 * 이름을 붙이는 규칙
 * ------------------
 * 목차의 이름과 **내려가서 보게 되는 제목이 같아야** 한다. 다르면
 * 누른 사람은 잘못 눌렀다고 생각하고 되돌아온다.
 *
 * 그래서 제목이 사실을 말하는 구역은 제목을 그대로 쓴다. 제목이
 * 한 마디(“눕기만 하시면 됩니다”, “매번 처음부터 다시 설명하지
 * 않으셔도 됩니다”)인 구역만, 그 구역이 무엇인지 짧게 적는다 —
 * 그런 제목은 목차에 놓으면 무엇이 있는 자리인지 알 수 없다.
 */
const SECTIONS = [
  { id: "actions", label: "바로 하실 수 있는 것", icon: SparkIcon },
  { id: "trust", label: "정통대왕쑥뜸원이 지키는 것", icon: CheckIcon },
  { id: "service", label: "어떤 시간을 보내시게 되는지", icon: LeafIcon },
  { id: "for-whom", label: "이런 분께 권해 드립니다", icon: BodyIcon },
  { id: "how", label: "세 겹으로 올립니다", icon: LeafIcon },
  // 제목은 「이용권 안내」지만, 가격을 찾는 분은 '가격'으로 훑는다
  { id: "가격", label: "이용권 안내 · 가격", icon: TicketIcon },
  { id: "records", label: "방문 기록이 남습니다", icon: ClipboardIcon },
];

export default function PublicNav() {
  const { openHowItWorks, howItWorksSheet } = useHowItWorks();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  /*
    열려 있는 동안 뒤 본문이 따라 움직이지 않게 한다. 이걸 안 하면
    전체 메뉴 안에서 손가락을 움직였을 때 뒤의 긴 화면이 스크롤되어,
    닫고 나면 엉뚱한 곳에 와 있다.
  */
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  /**
   * 자리로 내려가기.
   *
   * `<a href="#가격">` 로 두면 주소창에 조각(#)이 남는다. 고객이
   * 새로고침하거나 뒤로 가기를 눌렀을 때 화면 중간에서 시작하게 되고,
   * 공유한 주소도 지저분해진다. 전체 메뉴를 닫고 부드럽게 내려 주기만 한다.
   */
  const goTo = (id: string) => {
    setOpen(false);
    // 닫히면서 body 잠금이 풀린 뒤에 움직여야 실제로 내려간다
    window.setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 120);
  };

  const sheet = (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="absolute inset-0 bg-deep-950/50 backdrop-blur-[3px]"
        onClick={() => setOpen(false)}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="전체 메뉴"
        className="relative z-10 flex h-full w-full max-w-sm flex-col bg-card shadow-float"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-stone-line px-5 py-4">
          <p className="text-[1.0625rem] font-extrabold text-ink">전체 메뉴</p>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="닫기"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-stone-bg text-ink-sub transition-colors hover:bg-stone-bg-deep"
          >
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {/*
            "지금 하실 수 있는 것" 이라고 붙였다가 바꿨다. 아래 목록의
            첫 줄이 「바로 하실 수 있는 것」 구역이라, 같은 뜻의 머리말이
            한 화면에 둘 있었다. 이쪽은 **다른 화면으로 건너가는 문**이니
            그렇게 부른다.
          */}
          <p className="eyebrow mb-2">바로 가기</p>
          <ul className="space-y-2">
            {DO_NOW.map((d) => {
              const Icon = d.icon;
              return (
                <li key={d.href}>
                  <Link
                    href={d.href}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 rounded-card bg-card-soft px-4 py-3 ring-1 ring-stone-line transition-colors hover:bg-aqua-50"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold-soft/50 text-gold-deep ring-1 ring-gold/25">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[1rem] font-extrabold text-ink">
                        {d.label}
                      </span>
                      <span className="mt-0.5 block text-[0.875rem] leading-snug text-ink-sub">
                        {d.desc}
                      </span>
                    </span>
                    <ChevronRightIcon className="h-5 w-5 shrink-0 text-ink-faint" />
                  </Link>
                </li>
              );
            })}

            {/*
              이용 안내.

              위 셋과 같은 생김새로 같은 묶음에 둔다. 화면으로 가는 것이
              아니라 설명 창을 여는 것이지만, 처음 오신 분에게는 이것도
              '지금 할 수 있는 일' 이다 — 오히려 예약보다 먼저 필요하다.

              링크(<a>)가 아니라 단추인 이유는 주소를 만들지 않기 위해서다.
              주소가 생기면 그 주소를 연 사람은 설명만 덩그러니 있는 화면을
              만난다.
            */}
            <li>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  openHowItWorks();
                }}
                className="flex w-full items-center gap-3 rounded-card bg-card-soft px-4 py-3 text-left ring-1 ring-stone-line transition-colors hover:bg-aqua-50"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold-soft/50 text-gold-deep ring-1 ring-gold/25">
                  <BookIcon className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[1rem] font-extrabold text-ink">
                    어떻게 이용하게 되나요
                  </span>
                  <span className="mt-0.5 block text-[0.875rem] leading-snug text-ink-sub">
                    시작하는 순서와 서비스가 도는 방식
                  </span>
                </span>
                <ChevronRightIcon className="h-5 w-5 shrink-0 text-ink-faint" />
              </button>
            </li>
          </ul>

          <p className="eyebrow mb-2 mt-6">이 화면에서 찾기</p>
          <ul className="space-y-1">
            {SECTIONS.map((s) => {
              const Icon = s.icon;
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => goTo(s.id)}
                    className="flex w-full items-center gap-3 rounded-card px-3 py-2.5 text-left transition-colors hover:bg-stone-bg"
                  >
                    <Icon className="h-4 w-4 shrink-0 text-ink-faint" />
                    <span className="min-w-0 flex-1 text-[0.9375rem] font-bold text-ink-soft">
                      {s.label}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          {/*
            앞으로 준비하고 있는 것.

            전체 메뉴에서도 맨 아래다. 그 위 항목들은 오늘 되는 일이고
            이건 아직 아니다. 대신 배지와 점선으로 눈에 띄게 두어,
            찾는 사람은 놓치지 않게 한다.
          */}
          <button
            type="button"
            onClick={() => goTo("future")}
            className="mt-6 flex w-full items-start gap-3 rounded-card border border-dashed border-gold/55 bg-gold-soft/25 px-4 py-3.5 text-left transition-colors hover:bg-gold-soft/45"
          >
            {/*
              `ring-dashed` 를 쓸 뻔했다 — 그런 클래스는 없다. ring 은
              box-shadow 라 점선이 될 수 없고, 테일윈드는 그 낱말을 그냥
              버린다. 빌드한 CSS 를 뒤져 보고 알았다.

              점선으로 '아직 아님' 을 말하는 일은 이 단추의 바깥 테두리
              (border-dashed) 가 이미 하고 있으므로, 아이콘 칸은 실선
              그대로 둔다.
            */}
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold-soft text-gold-deep ring-1 ring-gold/40">
              <SparkIcon className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="text-[1rem] font-extrabold text-ink">
                  앞으로 준비하고 있는 것
                </span>
                <span className="inline-flex shrink-0 items-center rounded-full border border-dashed border-gold/60 px-2 py-0.5 text-[0.6875rem] font-extrabold text-gold-deep">
                  향후 확장
                </span>
              </span>
              <span className="mt-1 block text-[0.875rem] leading-snug text-ink-sub">
                멤버십 · 홈케어 · 친구추천 · 지점찾기 · 리포트
              </span>
            </span>
          </button>

          <p className="mt-5 text-[0.8125rem] leading-relaxed text-ink-faint">
            이 화면에서 예약이 확정되거나 결제가 이루어지지는 않습니다.
            남겨 주신 요청은 매장에서 확인한 뒤 연락드립니다.
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="전체 메뉴 열기"
        aria-expanded={open}
        /*
          48px 에서 52px 로. 아주 조금만 키운다.

          한 번 55px 까지 올려 봤는데, 옆의 [내 기록] 알약이 44px 이라
          동그라미 혼자 11px 더 커져 머리글이 기울어 보였다. 재 보고 되돌린
          값이다 — 동그라미가 알약보다 조금 큰 정도(8px)가 균형점이다.

          아이콘도 같이 20 → 24px 로 올린다. 테두리만 키우고 점 세 개를
          그대로 두면 과녁만 커지고 눌러야 할 것은 그대로라, 커진 느낌이
          나지 않는다.
        */
        className="flex h-[2.9375rem] w-[2.9375rem] shrink-0 items-center justify-center rounded-full bg-white/12 text-white ring-1 ring-white/25 transition-colors hover:bg-white/22"
      >
        <MoreIcon className="h-[1.375rem] w-[1.375rem]" />
      </button>
      {open && mounted && createPortal(sheet, document.body)}
      {howItWorksSheet}
    </>
  );
}
