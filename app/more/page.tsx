"use client";

/**
 * 모바일 더보기 — 하단 네비에 없는 메뉴로 이동.
 * 직원(STAFF) 계정은 메뉴가 '고객' 하나뿐이므로, 이 화면은 계정 전환과
 * 화면 표시(글자 크기·테마) 조정 전용으로 동작한다.
 */

import Link from "next/link";
import PageHeader from "@/components/layout/PageHeader";
import { useStore } from "@/lib/data/store";
import { MORE_ITEMS, navItemsFor } from "@/components/layout/nav-items";
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
            ? `${settings.companyName} ${settings.branchName} · 보조 · 관리 기능`
            : `${settings.companyName} ${settings.branchName} · 계정 · 화면 표시`
        }
      />
      <div className="mb-4">
        <ProfileButton />
      </div>

      {/* 문서 — 메뉴 목록보다 위에 두고 색으로 구분한다 */}
      <div className="mb-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
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
          className="flex items-center gap-3.5 rounded-card bg-gradient-to-br from-aqua-50 to-card px-4 py-4 shadow-card ring-1 ring-aqua-200 transition-colors active:bg-aqua-100"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-aqua-500 to-deep-700 text-white shadow-sm">
            <SparkIcon className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[1.0625rem] font-extrabold text-ink">
              사용 가이드
            </span>
            <span className="block text-[0.875rem] leading-snug text-aqua-800">
              화면별 사용법 · 단계별 안내
            </span>
          </span>
          <ChevronRightIcon className="h-5 w-5 shrink-0 text-aqua-800" />
        </Link>
      </div>

      {items.length > 0 && (
        <Card className="!p-2">
          <ul className="divide-y divide-stone-bg-deep">
            {items.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="flex items-center gap-3.5 px-3.5 py-4"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-aqua-50 text-aqua-700">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="flex-1 truncate font-semibold text-ink">
                      {item.label}
                    </span>
                    <ChevronRightIcon className="h-5 w-5 text-ink-faint" />
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
