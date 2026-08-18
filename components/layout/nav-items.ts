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

export interface NavItem {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
}

/** Desktop 사이드바 메뉴 */
export const SIDEBAR_ITEMS: NavItem[] = [
  { href: "/", label: "대시보드", icon: HomeIcon },
  { href: "/briefing", label: "오늘의 실행 브리핑", icon: SparkIcon },
  { href: "/customers", label: "고객", icon: UsersIcon },
  { href: "/visits", label: "방문 / 이용 기록", icon: ClipboardIcon },
  { href: "/retention", label: "재방문 관리", icon: RefreshIcon },
  { href: "/analytics", label: "AX 도입성과", icon: ChartIcon },
  { href: "/branches", label: "지점 / 운영", icon: BuildingIcon },
  { href: "/settings", label: "설정", icon: SettingsIcon },
];

/** Mobile 하단 네비 (5탭) */
export const BOTTOM_NAV_ITEMS: NavItem[] = [
  { href: "/", label: "대시보드", icon: HomeIcon },
  { href: "/customers", label: "고객", icon: UsersIcon },
  { href: "/visits", label: "방문/상담", icon: CalendarIcon },
  { href: "/analytics", label: "분석", icon: ChartIcon },
  { href: "/more", label: "더보기", icon: MoreIcon },
];

/**
 * Mobile 더보기 — 하단 네비에 없는 보조/관리 기능만.
 * 하단 네비와 동일한 경로(/, /customers, /visits, /analytics)는 중복 배치하지 않는다.
 */
export const MORE_ITEMS: NavItem[] = SIDEBAR_ITEMS.filter(
  (item) => !BOTTOM_NAV_ITEMS.some((b) => b.href === item.href),
);

export { BodyIcon };
