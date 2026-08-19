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
import { ChevronRightIcon } from "@/components/ui/icons";

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

      {/* 직원 계정: 설정 화면 대신 여기서 화면 표시만 조정 */}
      {!isManager && (
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
              매장 정보, 직원 관리, 고객관리 기준은 대표/관리자 계정에서
              설정합니다.
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}
