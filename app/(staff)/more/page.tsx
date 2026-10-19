"use client";

/**
 * 모바일 더보기 — 하단 네비에 없는 메뉴로 이동.
 * 직원(STAFF) 계정은 메뉴가 '고객' 하나뿐이므로, 이 화면은 계정 전환과
 * 화면 표시(글자 크기·테마) 조정 전용으로 동작한다.
 */

import Link from "next/link";
import { ReactNode } from "react";
import { useDocumentTitle } from "@/lib/utils/title";
import { useStore } from "@/lib/data/store";
import {
  MORE_ITEMS,
  NAV_TONE_CLASS,
  navItemsFor,
} from "@/components/layout/nav-items";
import { ProfileButton } from "@/components/layout/UserSwitch";
import { FontScale, Theme } from "@/lib/types";
import { FieldLabel, SegmentedControl } from "@/components/ui";
import {
  BookIcon,
  ChevronRightIcon,
  PlayIcon,
  SparkIcon,
} from "@/components/ui/icons";
import { VIDEO_LIST } from "@/lib/content/videos";

/** 알아보기 칸 — 고객 앱 홈의 바로가기 칸과 같은 모양 */
const DOC_TONE = {
  deep: "bg-gradient-to-br from-deep-700 to-deep-900 text-gold ring-black/10",
  gold: "bg-gradient-to-br from-gold to-gold-deep text-white ring-gold/30",
  goldSoft: "bg-gold-soft text-gold-deep ring-gold/20",
  aqua: "bg-gradient-to-br from-aqua-500 to-deep-700 text-white ring-black/10",
};

export default function MorePage() {
  const { settings, isManager, updateSettings } = useStore();
  const items = navItemsFor(MORE_ITEMS, isManager);
  const title = isManager ? "더보기" : "계정";
  useDocumentTitle(title);

  /*
    문서 · 영상 다섯 — 전에는 큰 카드 다섯 장이 세로로 쌓여 폰 한 화면
    (약 480px)을 통째로 썼다. 고객 앱처럼 아이콘 칸 다섯으로 줄인다 (D-56).
    한 줄 설명은 칸 아래 작은 글씨로 남긴다 — 이름만으로는 영상 길이를 모른다.
  */
  const docs: {
    href: string;
    label: string;
    sub: string;
    icon: ReactNode;
    tone: string;
    aria?: string;
  }[] = [
    { href: "/why", label: "Why AX", sub: "14개 절", icon: <SparkIcon className="h-6 w-6" />, tone: DOC_TONE.deep },
    { href: "/intro", label: "기획의도", sub: "만든 이유", icon: <BookIcon className="h-6 w-6" />, tone: DOC_TONE.gold },
    { href: "/guide", label: "사용 방법", sub: "단계별 안내", icon: <SparkIcon className="h-6 w-6" />, tone: DOC_TONE.goldSoft },
    ...VIDEO_LIST.map((v) => ({
      href: v.href,
      /* 재생 표시(▶)가 영상이라는 것을 말한다 — 이름은 짧게, 길이는 아래 */
      label: v.title.replace(/ 영상$/, ""),
      sub: v.length,
      aria: `${v.title} ${v.length}`,
      icon: <PlayIcon className="h-6 w-6" />,
      tone: v.tone === "gold" ? DOC_TONE.gold : DOC_TONE.aqua,
    })),
  ];

  return (
    <div className="space-y-5">
      {/*
        머리 띠 — 고객 앱 마이페이지 · 대시보드와 같은 딥그린 띠.
        내 계정 카드가 띠에 걸쳐 올라온다.
      */}
      <div>
        <section className="relative isolate overflow-hidden rounded-[24px] bg-gradient-to-br from-deep-800 via-deep-900 to-deep-950 px-5 pb-12 pt-5 text-white sm:px-6">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-aqua-400/15 blur-3xl"
          />
          <h1 className="relative text-[1.5rem] font-extrabold tracking-tight">{title}</h1>
          <p className="relative mt-1 text-[0.875rem] font-bold text-white/70">
            {settings.companyName} {settings.branchName} ·{" "}
            {isManager ? "가끔 여는 화면과 설정" : "계정 · 화면 표시"}
          </p>
        </section>
        <div className="relative z-10 mx-2.5 -mt-8 rounded-[22px] bg-card p-1.5 shadow-card ring-1 ring-black/[0.04] dark:ring-white/[0.06] sm:mx-4">
          <ProfileButton />
        </div>
      </div>

      {/* 알아보기 — 문서 · 영상 (메뉴 목록보다 위) */}
      <section aria-labelledby="more-docs-h">
        <h2 id="more-docs-h" className="mb-2.5 px-1 text-[1.125rem] font-extrabold tracking-tight text-ink">
          알아보기
        </h2>
        <div className="rounded-[20px] bg-card px-1.5 py-3.5 shadow-card ring-1 ring-black/[0.04] dark:ring-white/[0.06]">
          <ul className="grid grid-cols-5 gap-x-1">
            {docs.map((d) => (
              <li key={d.href} className="min-w-0">
                <Link
                  href={d.href}
                  aria-label={d.aria}
                  className="group flex min-h-[56px] flex-col items-center gap-1.5 rounded-2xl py-1 text-center"
                >
                  <span
                    className={`flex h-12 w-12 items-center justify-center rounded-2xl ring-1 shadow-sm transition-transform group-hover:-translate-y-0.5 group-active:scale-95 ${d.tone}`}
                  >
                    {d.icon}
                  </span>
                  <span className="w-full text-[0.8125rem] font-extrabold leading-tight text-ink [word-break:keep-all]">
                    {d.label}
                  </span>
                  {/* 자르지 않고 줄을 바꾼다 — 360px · 큰 글씨에서 「단계별 안내」 가 잘렸다 */}
                  <span className="-mt-1 w-full text-[0.6875rem] font-bold leading-tight text-ink-sub [word-break:keep-all]">
                    {d.sub}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/*
        목차에서 내려온 화면들 — 넷으로 줄이면서 여기로 모였다.

        줄였다는 말은 없앴다는 말이 아니다. 그래서 이 목록은 작은 글씨로
        늘어놓지 않고, 이름 아래에 한 줄 설명을 달아 크게 그린다.
        손끝이 닿는 높이(60px 이상)와 읽히는 크기(17px)를 지킨다.
      */}
      {items.length > 0 && (
        <section aria-labelledby="more-menu-h">
          <h2 id="more-menu-h" className="mb-2.5 px-1 text-[1.125rem] font-extrabold tracking-tight text-ink">
            매장 운영
          </h2>
          <ul className="divide-y divide-stone-line overflow-hidden rounded-[20px] bg-card shadow-card ring-1 ring-black/[0.04] dark:ring-white/[0.06]">
            {items.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="flex min-h-[3.75rem] items-center gap-3.5 px-4 py-3 transition-colors hover:bg-card-soft"
                  >
                    <span
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ${NAV_TONE_CLASS[item.tone]}`}
                    >
                      <Icon className="h-[1.3rem] w-[1.3rem]" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[1.0625rem] font-extrabold leading-snug text-ink">
                        {item.label}
                      </span>
                      {item.desc && (
                        <span className="block text-[0.8125rem] leading-snug text-ink-sub [word-break:keep-all]">
                          {item.desc}
                        </span>
                      )}
                    </span>
                    <ChevronRightIcon className="h-5 w-5 shrink-0 text-ink-faint" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/*
        글자 크기·테마는 누구에게나 여기서 바로 바뀐다.
        설정 화면 안쪽까지 들어가야 했더니, 글씨가 작아 불편한 분이
        정작 그 설정을 찾지 못했다. 폰에서 가장 먼저 손이 가는 자리에 둔다.
      */}
      <section aria-labelledby="more-display-h">
        <h2 id="more-display-h" className="mb-2.5 px-1 text-[1.125rem] font-extrabold tracking-tight text-ink">
          화면 표시
        </h2>
        <div className="space-y-4 rounded-[20px] bg-card p-4 shadow-card ring-1 ring-black/[0.04] dark:ring-white/[0.06]">
          <div>
            <FieldLabel>글자 크기</FieldLabel>
            <SegmentedControl<FontScale>
              label="글자 크기"
              value={settings.fontScale}
              options={[
                { key: "small", label: "작게" },
                { key: "default", label: "기본" },
                { key: "large", label: "크게" },
              ]}
              onChange={(v) => updateSettings({ fontScale: v })}
            />
          </div>
          <div>
            <FieldLabel>테마</FieldLabel>
            <SegmentedControl<Theme>
              label="테마"
              value={settings.theme ?? "light"}
              options={[
                { key: "light", label: "라이트" },
                { key: "dark", label: "다크" },
                { key: "system", label: "시스템" },
              ]}
              onChange={(v) => updateSettings({ theme: v })}
            />
          </div>
          <p className="text-sm leading-relaxed text-ink-sub">
            {isManager
              ? "매장 정보, 직원 관리, 고객관리 기준은 설정 화면에서 조정합니다."
              : "매장 정보, 직원 관리, 고객관리 기준은 대표/관리자 계정에서 설정합니다."}
          </p>
        </div>
      </section>
    </div>
  );
}
