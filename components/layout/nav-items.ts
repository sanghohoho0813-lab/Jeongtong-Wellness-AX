import type { ComponentType } from "react";
import { canAccessRoute } from "@/lib/auth/permissions";
import {
  BodyIcon,
  BuildingIcon,
  ChartIcon,
  ClipboardIcon,
  CompassIcon,
  HomeIcon,
  LeafIcon,
  MoreIcon,
  RefreshIcon,
  SettingsIcon,
  SparkIcon,
  UsersIcon,
} from "@/components/ui/icons";

/**
 * 메뉴 아이콘 색 — 같은 갈래는 같은 색, 진하기만 한 단계씩.
 * ======================================================
 *
 * 전에는 항목마다 색이 달랐다 — 청록 · 하늘 · 보라 · 주황 · 초록 · 금색 ·
 * 회색. 여덟 가지 색이 세로로 서 있으면 그건 구분이 아니라 소음이다.
 * 글자를 읽기 전에 눈이 먼저 지치고, 처음 보는 분에게는 「복잡한 프로그램」
 * 이라는 첫인상만 남는다. 대표님 내외(60대)가 실제로 쓰실 화면이다.
 *
 * 그래서 색은 **두 갈래**만 쓴다.
 *
 *   brand-1 ~ 4   매일 쓰는 업무 메뉴 — 같은 청록, 진하기만 다르게
 *   doc-1 · 2     읽을 거리(이야기 · 안내) — 같은 금색, 진하기만 다르게
 *   gray          설정처럼 색을 줄 이유가 없는 것
 *
 * 구분은 색이 아니라 **아이콘 모양과 글자**가 한다. 지금 어디에 있는지는
 * 진한 배경으로 칠해 알리므로, 색만으로 구분되는 자리는 한 곳도 없다.
 *
 * 글자색은 갈래마다 하나로 고정했다(청록은 deep-700, 금색은 gold-deep).
 * 바탕 진하기만 움직이면 대비가 한 번 검증된 값 근처에 머문다 —
 * 색을 새로 고를 때마다 대비가 무너지는 일이 실제로 있었다.
 */
export type NavTone =
  | "brand-1"
  | "brand-2"
  | "brand-3"
  | "brand-4"
  | "doc-1"
  | "doc-2"
  | "gray";

export const NAV_TONE_CLASS: Record<NavTone, string> = {
  "brand-1": "bg-deep-700/[0.14] text-deep-700 ring-deep-700/20 dark:text-aqua-400",
  "brand-2": "bg-deep-700/[0.11] text-deep-700 ring-deep-700/[0.16] dark:text-aqua-400",
  "brand-3": "bg-deep-700/[0.08] text-deep-700 ring-deep-700/[0.13] dark:text-aqua-400",
  "brand-4": "bg-deep-700/[0.05] text-deep-700 ring-deep-700/10 dark:text-aqua-400",
  "doc-1": "bg-gold-soft text-gold-deep ring-gold/25",
  "doc-2": "bg-gold/10 text-gold-deep ring-gold/20",
  gray: "bg-stone-bg-deep text-ink-sub ring-black/[0.04]",
};

export interface NavItem {
  href: string;
  label: string;
  /** 이름만으로 모르는 화면에 붙는 한 줄 설명 */
  desc?: string;
  icon: ComponentType<{ className?: string }>;
  tone: NavTone;
}

/**
 * 목차는 넷이다.
 * ==============
 *
 * 열한 개였다. 하는 일로 세 묶음(오늘 · 고객 · 운영)으로 나눠 두었지만,
 * 결국 왼쪽 기둥에 열한 줄이 서 있는 것은 그대로였다. 대표님 말씀이
 * 정확했다 — "세분화돼 있어서 오히려 어렵게 느껴진다".
 *
 * 항목이 많다는 건 **쓰는 사람이 매번 고른다**는 뜻이다. 열한 개 중에
 * 하나를 고르는 일을 하루에 수십 번 하면, 그 자체가 일이 된다.
 * 카카오톡은 아래에 넷이다. 그 넷 안에서 모든 것이 일어난다.
 *
 * 그래서 목차를 넷으로 줄였다. **기능은 하나도 줄이지 않았다.**
 * 주소도 그대로다 — /briefing · /coach · /visits · /retention · /settings
 * 전부 살아 있고, 즐겨찾기도 깨지지 않는다. 달라진 것은 **찾아가는 길**
 * 하나뿐이다. 묶음 안으로 들어가면 화면 위쪽에 큰 탭이 있고, 거기서
 * 옆으로 옮긴다 (NAV_SECTIONS · components/layout/SectionTabs.tsx).
 *
 * PC 와 폰이 **같은 넷**이다. 전에는 PC 열한 개 / 폰 넷이라, 폰으로
 * 배운 것을 PC 에서 다시 배워야 했다.
 */
export const SIDEBAR_ITEMS: NavItem[] = [
  {
    href: "/",
    label: "오늘",
    desc: "할 일 · 챙길 고객 · 코치",
    icon: HomeIcon,
    tone: "brand-1",
  },
  {
    href: "/customers",
    label: "고객",
    desc: "명부 · 방문 기록 · 재방문",
    icon: UsersIcon,
    tone: "brand-2",
  },
  {
    href: "/analytics",
    label: "성과",
    desc: "AX 도입성과 · 증적",
    icon: ChartIcon,
    tone: "brand-3",
  },
  {
    href: "/more",
    label: "더보기",
    desc: "설정 · 표준 · 지점 · 고객화면",
    icon: MoreIcon,
    tone: "brand-4",
  },
];

/**
 * 폰 하단 메뉴 = PC 왼쪽 메뉴.
 *
 * 가운데에는 메뉴가 아니라 **[기록]** 단추가 들어간다(AppShell 이 끼워 넣는다).
 * 하루 중 가장 자주 하는 일이 방문 기록이라, 어느 화면에 있든 엄지가 닿는
 * 자리에서 바로 시작할 수 있어야 하기 때문이다.
 */
export const BOTTOM_NAV_ITEMS: NavItem[] = SIDEBAR_ITEMS;

/** 묶음 안에서 옆으로 옮기는 큰 탭 하나 */
export interface SectionTab {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
}

export interface NavSection {
  /** 이 묶음을 대표하는 주소 — 메뉴 넷 중 하나 */
  root: string;
  label: string;
  /** 화면 위쪽 큰 탭. 둘 미만이면 그리지 않는다 */
  tabs: SectionTab[];
  /** 탭에는 없지만 이 묶음에 속하는 주소 (메뉴를 칠할 때 쓴다) */
  extra?: string[];
}

/**
 * 묶음 넷.
 *
 * 탭은 **셋을 넘기지 않는다.** 넷이 되는 순간 360px 폰에서 글자가 잘리고,
 * 잘린 탭은 안 누른다. 셋이 넘어갈 만큼 화면이 늘면 그때는 묶음을
 * 다시 나눠야 한다는 뜻이지, 탭을 줄여 넣을 일이 아니다.
 */
export const NAV_SECTIONS: NavSection[] = [
  {
    root: "/",
    label: "오늘",
    tabs: [
      /*
        탭 이름은 그 화면이 스스로를 부르는 이름과 **같아야 한다.**
        처음에 '홈' 으로 적었더니 메뉴는 「오늘」, 탭은 「홈」, 화면
        제목은 「대시보드」 — 한 화면에 이름이 셋이 됐다. 「오늘」은
        묶음 이름이고, 그 안의 화면 이름은 「대시보드」다.
      */
      { href: "/", label: "대시보드", icon: HomeIcon },
      { href: "/briefing", label: "챙길 고객", icon: SparkIcon },
      { href: "/coach", label: "AX 코치", icon: CompassIcon },
    ],
  },
  {
    root: "/customers",
    label: "고객",
    tabs: [
      { href: "/customers", label: "고객 목록", icon: UsersIcon },
      { href: "/visits", label: "방문 기록", icon: ClipboardIcon },
      { href: "/retention", label: "재방문", icon: RefreshIcon },
    ],
  },
  {
    root: "/analytics",
    label: "성과",
    tabs: [{ href: "/analytics", label: "AX 도입성과", icon: ChartIcon }],
  },
  {
    root: "/more",
    label: "더보기",
    tabs: [{ href: "/more", label: "더보기", icon: MoreIcon }],
    extra: ["/settings", "/service", "/branches", "/welcome", "/guide", "/why", "/intro"],
  },
];

/** `/customers/123` 처럼 아래로 더 들어간 주소도 그 화면으로 친다 */
export function isUnder(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

/** 지금 보는 화면이 어느 묶음에 속하는가 */
export function sectionForPath(pathname: string): NavSection | undefined {
  return NAV_SECTIONS.find(
    (s) =>
      s.tabs.some((t) => isUnder(pathname, t.href)) ||
      (s.extra ?? []).some((e) => isUnder(pathname, e)),
  );
}

/**
 * 더보기 안에 있는 것들 — 목차에서 내려온 화면.
 *
 * 내려왔다는 것이 숨겼다는 뜻이 되면 안 된다. 더보기 화면과 시트에서는
 * 큰 줄로, 한 줄 설명을 달아 보여 준다 (이름만으로는 '서비스 표준' 이
 * 무엇인지 알 수 없다).
 */
export const MORE_ITEMS: NavItem[] = [
  {
    href: "/service",
    label: "서비스 표준",
    desc: "케어 순서와 상담에서 쓰는 말",
    icon: BodyIcon,
    tone: "brand-1",
  },
  {
    href: "/branches",
    label: "지점 · 운영",
    desc: "본점과 앞으로 늘어날 지점",
    icon: BuildingIcon,
    tone: "brand-2",
  },
  {
    href: "/welcome",
    label: "고객용 화면",
    desc: "고객에게 보이는 우리 매장 화면",
    icon: LeafIcon,
    tone: "brand-3",
  },
  {
    href: "/settings",
    label: "설정",
    desc: "매장 정보 · 도입 전 기준선 · 백업",
    icon: SettingsIcon,
    tone: "gray",
  },
];

/**
 * 화면 전부 — 빠른 실행(⌘K)이 찾는 목록.
 *
 * 목차를 넷으로 줄였다고 해서 검색까지 좁아지면 안 된다. 메뉴에서
 * 내려간 화면일수록 이름을 쳐서 바로 가는 길이 더 중요하다.
 */
export const ALL_SCREENS: NavItem[] = [
  { href: "/", label: "홈", icon: HomeIcon, tone: "brand-1" },
  { href: "/briefing", label: "오늘 챙길 고객", icon: SparkIcon, tone: "brand-1" },
  { href: "/coach", label: "AX 코치", icon: CompassIcon, tone: "brand-2" },
  { href: "/customers", label: "고객 목록", icon: UsersIcon, tone: "brand-2" },
  { href: "/visits", label: "방문 · 이용 기록", icon: ClipboardIcon, tone: "brand-3" },
  { href: "/retention", label: "재방문 관리", icon: RefreshIcon, tone: "brand-3" },
  { href: "/analytics", label: "AX 도입성과", icon: ChartIcon, tone: "brand-4" },
  ...MORE_ITEMS,
];

/**
 * 역할별 메뉴 필터 — 직원(STAFF)에게는 볼 수 있는 화면만 남긴다.
 * 모바일 하단 네비의 /more 는 메뉴가 아니라 계정 전환·화면 표시 컨테이너이므로
 * 라벨을 '계정'으로 바꿔 유지한다 (직원도 계정 전환은 가능해야 한다).
 */
export function navItemsFor(items: NavItem[], isManager: boolean): NavItem[] {
  if (isManager) return items;
  return items
    .filter((item) => canAccessRoute("STAFF", item.href))
    .map((item) =>
      item.href === "/more"
        ? { ...item, label: "계정", desc: "내 계정 · 글자 크기 · 밝기" }
        : item,
    );
}

export { BodyIcon };
