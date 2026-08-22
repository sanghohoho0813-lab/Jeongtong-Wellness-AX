import type { ComponentType } from "react";
import { canAccessRoute } from "@/lib/auth/permissions";
import {
  BodyIcon,
  BuildingIcon,
  ChartIcon,
  ClipboardIcon,
  HomeIcon,
  MoreIcon,
  RefreshIcon,
  SettingsIcon,
  SparkIcon,
  UsersIcon,
} from "@/components/ui/icons";

/** 메뉴별 아이콘 타일 색상 (비활성 상태에서 사용) */
export type NavTone = "aqua" | "teal" | "sky" | "violet" | "amber" | "emerald" | "gold" | "gray";

export const NAV_TONE_CLASS: Record<NavTone, string> = {
  aqua: "bg-aqua-50 text-aqua-700 ring-aqua-100",
  teal: "bg-deep-700/10 text-deep-700 ring-deep-700/15 dark:text-aqua-400",
  sky: "bg-sky-500/10 text-sky-600 ring-sky-500/15 dark:text-sky-300",
  violet: "bg-violet-500/10 text-violet-600 ring-violet-500/15 dark:text-violet-300",
  amber: "bg-amber-400/15 text-amber-600 ring-amber-400/20 dark:text-amber-300",
  emerald:
    "bg-emerald-500/10 text-emerald-600 ring-emerald-500/15 dark:text-emerald-300",
  gold: "bg-gold-soft text-gold-deep ring-gold/20",
  gray: "bg-stone-bg-deep text-ink-sub ring-black/[0.04]",
};

export interface NavItem {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  tone: NavTone;
}

/** Desktop 사이드바 메뉴 */
export const SIDEBAR_ITEMS: NavItem[] = [
  { href: "/", label: "대시보드", icon: HomeIcon, tone: "aqua" },
  { href: "/briefing", label: "오늘의 실행 브리핑", icon: SparkIcon, tone: "teal" },
  { href: "/customers", label: "고객", icon: UsersIcon, tone: "sky" },
  { href: "/visits", label: "방문 / 이용 기록", icon: ClipboardIcon, tone: "violet" },
  { href: "/retention", label: "재방문 관리", icon: RefreshIcon, tone: "amber" },
  { href: "/analytics", label: "AX 도입성과", icon: ChartIcon, tone: "emerald" },
  { href: "/branches", label: "지점 / 운영", icon: BuildingIcon, tone: "gold" },
  { href: "/settings", label: "설정", icon: SettingsIcon, tone: "gray" },
];

/**
 * Mobile 하단 네비.
 *
 * 가운데에는 메뉴가 아니라 **[기록]** 단추가 들어간다(AppShell 에서 끼워 넣는다).
 * 하루 중 가장 자주 하는 일이 방문 기록이라, 어느 화면에 있든 엄지가 닿는
 * 자리에서 바로 시작할 수 있어야 하기 때문이다.
 *
 * 그래서 '방문/이용 기록' 목록 화면은 하단 탭에서 내리고 더보기로 옮겼다.
 * (기록하는 동작과 기록을 훑어보는 화면은 쓰임새가 다르다 —
 *  현장에서 급한 쪽은 언제나 '기록하기'다.)
 */
export const BOTTOM_NAV_ITEMS: NavItem[] = [
  { href: "/", label: "대시보드", icon: HomeIcon, tone: "aqua" },
  { href: "/customers", label: "고객", icon: UsersIcon, tone: "sky" },
  { href: "/analytics", label: "분석", icon: ChartIcon, tone: "emerald" },
  { href: "/more", label: "더보기", icon: MoreIcon, tone: "gray" },
];

/**
 * Mobile 더보기 — 하단 네비에 없는 보조/관리 기능만.
 * 하단 네비와 동일한 경로(/, /customers, /analytics)는 중복 배치하지 않는다.
 */
export const MORE_ITEMS: NavItem[] = SIDEBAR_ITEMS.filter(
  (item) => !BOTTOM_NAV_ITEMS.some((b) => b.href === item.href),
);

/**
 * 역할별 메뉴 필터 — 직원(STAFF)에게는 '고객'만 노출한다.
 * 모바일 하단 네비의 /more 는 메뉴가 아니라 계정 전환·화면 표시 컨테이너이므로
 * 라벨을 '계정'으로 바꿔 유지한다 (직원도 계정 전환은 가능해야 한다).
 */
export function navItemsFor(items: NavItem[], isManager: boolean): NavItem[] {
  if (isManager) return items;
  return items
    .filter((item) => canAccessRoute("STAFF", item.href))
    .map((item) =>
      item.href === "/more" ? { ...item, label: "계정" } : item,
    );
}

export { BodyIcon };
