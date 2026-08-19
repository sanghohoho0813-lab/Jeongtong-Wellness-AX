import type { ComponentType } from "react";
import {
  BodyIcon,
  BuildingIcon,
  CalendarIcon,
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

/** Mobile 하단 네비 (5탭) */
export const BOTTOM_NAV_ITEMS: NavItem[] = [
  { href: "/", label: "대시보드", icon: HomeIcon, tone: "aqua" },
  { href: "/customers", label: "고객", icon: UsersIcon, tone: "sky" },
  { href: "/visits", label: "방문/상담", icon: CalendarIcon, tone: "violet" },
  { href: "/analytics", label: "분석", icon: ChartIcon, tone: "emerald" },
  { href: "/more", label: "더보기", icon: MoreIcon, tone: "gray" },
];

/**
 * Mobile 더보기 — 하단 네비에 없는 보조/관리 기능만.
 * 하단 네비와 동일한 경로(/, /customers, /visits, /analytics)는 중복 배치하지 않는다.
 */
export const MORE_ITEMS: NavItem[] = SIDEBAR_ITEMS.filter(
  (item) => !BOTTOM_NAV_ITEMS.some((b) => b.href === item.href),
);

export { BodyIcon };
