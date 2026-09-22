"use client";

/**
 * 모바일 더보기 — 하단 네비에 없는 메뉴로 이동.
 * 직원(STAFF) 계정은 메뉴가 '고객' 하나뿐이므로, 이 화면은 계정 전환과
 * 화면 표시(글자 크기·테마) 조정 전용으로 동작한다.
 */

import Link from "next/link";
import PageHeader from "@/components/layout/PageHeader";
import { useStore } from "@/lib/data/store";
import {
  MORE_ITEMS,
  NAV_TONE_CLASS,
  navItemsFor,
} from "@/components/layout/nav-items";
import { ProfileButton } from "@/components/layout/UserSwitch";
import { FontScale, Theme } from "@/lib/types";
import { Card, FieldLabel, SectionTitle, SegmentedControl } from "@/components/ui";
import {
  BookIcon,
  ChevronRightIcon,
  SparkIcon,
} from "@/components/ui/icons";

export default function MorePage() {
  const { settings, isManager, updateSettings } = useStore();
  const items = navItemsFor(MORE_ITEMS, isManager);
  return (
    <div>
      <PageHeader
        title={isManager ? "더보기" : "계정"}
        description={
          isManager
            ? `${settings.companyName} ${settings.branchName} · 가끔 여는 화면과 설정`
            : `${settings.companyName} ${settings.branchName} · 계정 · 화면 표시`
        }
      />
      <div className="mb-4">
        <ProfileButton />
      </div>

      {/* 문서 — 메뉴 목록보다 위에 두고 색으로 구분한다 */}
      <div className="mb-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        <Link
          href="/why"
          className="flex items-center gap-3.5 rounded-card bg-gradient-to-br from-deep-700/10 to-card px-4 py-4 shadow-card ring-1 ring-deep-700/20 transition-colors active:bg-deep-700/15 sm:col-span-2"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-deep-700 to-deep-900 text-gold shadow-sm">
            <SparkIcon className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[1.0625rem] font-extrabold text-ink">
              Why AX
            </span>
            <span className="block text-[0.875rem] leading-snug text-ink-sub">
              우리 매장에 무엇이 달라지는가 · 14개 절
            </span>
          </span>
          <ChevronRightIcon className="h-5 w-5 shrink-0 text-ink-faint" />
        </Link>
        <Link
          href="/intro"
          className="flex items-center gap-3.5 rounded-card bg-gradient-to-br from-gold-soft to-card px-4 py-4 shadow-card ring-1 ring-gold/25 transition-colors active:bg-gold/10"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-gold to-gold-deep text-white shadow-sm">
            <BookIcon className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[1.0625rem] font-extrabold text-ink">
              기획의도
            </span>
            <span className="block text-[0.875rem] leading-snug text-gold-deep">
              이 시스템을 만든 이유
            </span>
          </span>
          <ChevronRightIcon className="h-5 w-5 shrink-0 text-gold-deep" />
        </Link>
        <Link
          href="/guide"
          /* 읽을 거리 둘(기획의도 · 사용 방법)은 같은 금색, 톤만 다르게 */
          className="flex items-center gap-3.5 rounded-card bg-gradient-to-br from-gold/10 to-card px-4 py-4 shadow-card ring-1 ring-gold/20 transition-colors active:bg-gold/[0.16]"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-gold-deep to-gold text-white shadow-sm">
            <SparkIcon className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[1.0625rem] font-extrabold text-ink">
              사용 방법
            </span>
            <span className="block text-[0.875rem] leading-snug text-gold-deep">
              화면별 사용법 · 단계별 안내
            </span>
          </span>
          <ChevronRightIcon className="h-5 w-5 shrink-0 text-gold-deep" />
        </Link>
      </div>

      {/*
        목차에서 내려온 화면들 — 넷으로 줄이면서 여기로 모였다.

        줄였다는 말은 없앴다는 말이 아니다. 그래서 이 목록은 작은 글씨로
        늘어놓지 않고, 이름 아래에 한 줄 설명을 달아 크게 그린다.
        손끝이 닿는 높이(60px 이상)와 읽히는 크기(17px)를 지킨다.
      */}
      {items.length > 0 && (
        <Card className="!p-2">
          <ul className="divide-y divide-stone-bg-deep">
            {items.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="flex min-h-[3.75rem] items-center gap-3.5 px-3.5 py-3.5"
                  >
                    <span
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 ${NAV_TONE_CLASS[item.tone]}`}
                    >
                      <Icon className="h-[1.35rem] w-[1.35rem]" />
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
        </Card>
      )}

      {/*
        글자 크기·테마는 누구에게나 여기서 바로 바뀐다.
        설정 화면 안쪽까지 들어가야 했더니, 글씨가 작아 불편한 분이
        정작 그 설정을 찾지 못했다. 폰에서 가장 먼저 손이 가는 자리에 둔다.
      */}
      <Card className="mt-4">
          <SectionTitle tone="gray">화면 표시</SectionTitle>
          <div className="space-y-5">
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
        </Card>
    </div>
  );
}
