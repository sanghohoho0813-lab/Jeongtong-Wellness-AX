"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import { useStore } from "@/lib/data/store";
import { useStaffLink } from "@/lib/supabase/StaffLink";
import { formatDateTimeKr } from "@/lib/utils/date";
import { canAccessRoute, STAFF_HOME } from "@/lib/auth/permissions";
import {
  BellIcon,
  BookIcon,
  PlusIcon,
  SearchIcon,
  SparkIcon,
} from "@/components/ui/icons";
import {
  BOTTOM_NAV_ITEMS,
  NAV_TONE_CLASS,
  SIDEBAR_ITEMS,
  navItemsFor,
} from "./nav-items";
import { ProfileButton } from "./UserSwitch";
import CommandPalette from "./CommandPalette";
import { DevicePreviewButton } from "./DevicePreview";
import LiveClock from "./LiveClock";
import MoreSheet from "./MoreSheet";
import ErrorBoundary from "./ErrorBoundary";
import QuickVisitModal from "@/components/visits/QuickVisitModal";
import RecordSheet from "@/components/visits/RecordSheet";
import CustomerForm from "@/components/customers/CustomerForm";
import { Modal } from "@/components/ui";

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

function Logo() {
  const { isManager } = useStore();
  return (
    <Link
      href={isManager ? "/" : STAFF_HOME}
      className="flex min-w-0 items-center gap-2.5"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-deep-700 to-deep-900 font-serif text-lg font-bold text-gold shadow-[0_2px_8px_rgba(10,46,44,0.35)]">
        鼎
      </span>
      {/*
        상호와 브랜드 표기는 **글자 크기 설정을 따르지 않는다.**
        '크게'로 두면 상호가 '정통대왕…' 으로 잘려 오히려 못 읽었다.
        여기는 읽는 글이 아니라 "지금 어느 앱인지"를 알아보는 표식이라
        px 로 고정한다. (본문·지표는 설정대로 커진다)
      */}
      <span className="min-w-0">
        <span className="block truncate text-[17px] font-extrabold leading-tight tracking-tight text-ink">
          정통대왕쑥뜸원
        </span>
        <span className="block truncate text-[9px] font-bold uppercase tracking-normal text-aqua-700 xs:text-[10px] xs:tracking-[0.1em]">
          Wellness Business AX
        </span>
      </span>
    </Link>
  );
}

function Sidebar({ onOpenPalette }: { onOpenPalette: () => void }) {
  const pathname = usePathname();
  const { isManager } = useStore();
  const items = navItemsFor(SIDEBAR_ITEMS, isManager);
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-black/[0.05] bg-card/85 backdrop-blur-md lg:flex">
      <div className="px-5 pb-3 pt-6">
        <Logo />
      </div>

      {/* 오늘 날짜와 지금 시각 — 기록할 때 폰을 꺼내 확인하지 않게 */}
      <div className="mx-3 mb-2">
        <LiveClock />
      </div>

      {/* 빠른 실행 — 고객 찾기가 하루 중 가장 잦은 동작이라 맨 위에 둔다.
          누르거나 Ctrl/⌘+K 로 열린다. */}
      <div className="mx-3 mb-2">
        <button
          type="button"
          onClick={onOpenPalette}
          data-tour="quick-search"
          className="flex h-10 w-full items-center gap-2 rounded-btn border border-stone-line bg-card-soft px-3 text-left text-sm text-ink-faint transition-colors hover:border-aqua-500 hover:bg-card"
        >
          <SearchIcon className="h-[1.1rem] w-[1.1rem] shrink-0" />
          <span className="min-w-0 flex-1 truncate">고객 · 화면 찾기</span>
          <kbd className="nowrap-num shrink-0 rounded bg-stone-bg-deep px-1.5 py-0.5 text-[0.6875rem] font-bold text-ink-sub">
            {"\u2318K"}
          </kbd>
        </button>
      </div>

      {/*
        문서 — 메뉴 위에 배치해 처음 쓰는 사람이 먼저 보게 한다.

        셋으로 늘었다. 나란히 세 칸으로 놓으면 '사용 가이드' 가 잘려서,
        'Why AX' 를 한 줄로 크게 올리고 아래에 둘을 나란히 둔다. 처음
        오시는 분(투자·심사 자리 포함)이 가장 먼저 눌러야 할 것이 이것이다.
      */}
      <div className="mx-3 mb-2 space-y-2">
        <Link
          href="/why"
          className={`flex items-center gap-2 rounded-btn px-3 py-2.5 text-sm font-extrabold transition-colors ${
            isActive(pathname, "/why")
              ? "bg-gradient-to-r from-deep-700 to-deep-900 text-white shadow-sm"
              : "bg-gradient-to-r from-deep-700/10 to-transparent text-deep-800 ring-1 ring-deep-700/20 hover:from-deep-700/20 dark:text-aqua-400"
          }`}
        >
          <SparkIcon className="h-4 w-4 shrink-0" />
          <span className="min-w-0 flex-1 truncate">Why AX</span>
          <span
            className={`shrink-0 text-[0.6875rem] font-bold ${
              isActive(pathname, "/why") ? "text-white/70" : "text-ink-faint"
            }`}
          >
            우리 매장 이야기
          </span>
        </Link>
        <div className="grid grid-cols-2 gap-2">
          <Link
            href="/intro"
            className={`flex items-center justify-center gap-1.5 rounded-btn px-2 py-2.5 text-sm font-extrabold transition-colors ${
              isActive(pathname, "/intro")
                ? "bg-gradient-to-r from-gold to-gold-deep text-white shadow-sm"
                : "bg-gold-soft text-gold-deep ring-1 ring-gold/30 hover:bg-gold/20"
            }`}
          >
            <BookIcon className="h-4 w-4 shrink-0" />
            <span className="truncate">기획의도</span>
          </Link>
          <Link
            href="/guide"
            className={`flex items-center justify-center gap-1.5 rounded-btn px-2 py-2.5 text-sm font-extrabold transition-colors ${
              isActive(pathname, "/guide")
                ? "bg-gradient-to-r from-aqua-650 to-deep-700 text-white shadow-sm"
                : "bg-aqua-50 text-aqua-800 ring-1 ring-aqua-200 hover:bg-aqua-100"
            }`}
          >
            <SparkIcon className="h-4 w-4 shrink-0" />
            <span className="truncate">사용 가이드</span>
          </Link>
        </div>
      </div>

      {/* 지금 이 화면이 폰에서 어떻게 보이는지 — 메뉴 바로 위에 둔다 */}
      <div className="mx-3 mb-2">
        <DevicePreviewButton />
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3">
        {items.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group relative flex items-center gap-2.5 rounded-btn px-2.5 py-2 text-[0.9375rem] font-bold transition-colors ${
                active
                  ? "bg-gradient-to-r from-deep-700 to-deep-800 text-white shadow-[0_3px_10px_rgba(10,46,44,0.28)]"
                  : "text-nav-ink hover:bg-stone-bg"
              }`}
            >
              {active && (
                <span className="absolute -left-3 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-aqua-400" />
              )}
              {/* 메뉴별 컬러 아이콘 타일 */}
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ring-1 transition-colors ${
                  active
                    ? "bg-white/15 text-aqua-300 ring-white/20"
                    : NAV_TONE_CLASS[item.tone]
                }`}
              >
                <Icon className="h-[1.15rem] w-[1.15rem]" />
              </span>
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="m-3">
        <ProfileButton />
      </div>
    </aside>
  );
}

function MobileHeader({ onOpenPalette }: { onOpenPalette: () => void }) {
  const { briefingTasks, isManager, ready } = useStore();
  // 오늘 아직 처리하지 않은 관리 대상 — 장식이 아니라 실제 건수를 보여준다.
  // 저장된 자료를 읽기 전에는 세지 않는다 (예시 건수가 잠깐 떴다 사라진다)
  const openCount = ready
    ? briefingTasks.filter(
        (t) => t.status === "pending" || t.status === "confirmed",
      ).length
    : 0;

  return (
    <header className="sticky top-0 z-30 border-b border-black/[0.04] bg-stone-bg/85 px-4 py-2.5 backdrop-blur-md lg:hidden">
      <div className="flex items-center justify-between gap-3">
      <Logo />
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={onOpenPalette}
          data-tour="quick-search"
          aria-label="고객 찾기 열기"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-black/[0.05] bg-card text-ink-sub shadow-card dark:border-white/10"
        >
          <SearchIcon className="h-5 w-5" />
        </button>
        {/* 폰에서 쓰는 중이면 여기 단추는 'PC 에서 보기' 하나만 나온다 */}
        <DevicePreviewButton compact />
        {/* 직원 계정은 실행 브리핑에 접근하지 않으므로 표시하지 않는다 */}
        {isManager && (
        <Link
          href="/briefing"
          aria-label={`오늘 관리 대상 ${openCount}명 — 실행 브리핑으로 이동`}
          className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-black/[0.05] bg-card text-ink-sub shadow-card dark:border-white/10"
        >
          <BellIcon className="h-5 w-5" />
          {openCount > 0 && (
            <span className="nowrap-num absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-danger px-1 text-[0.65rem] font-extrabold text-white shadow-sm">
              {openCount > 99 ? "99+" : openCount}
            </span>
          )}
        </Link>
        )}
      </div>
      </div>
      {/* 날짜 · 지금 시각 — 손에 든 채로 바로 보이게 */}
      <div className="mt-1.5">
        <LiveClock variant="header" />
      </div>
    </header>
  );
}

/**
 * 폰 하단 메뉴 — 가운데는 [기록] 단추.
 *
 * 하루에 가장 많이 하는 일이 방문 기록인데, 지금까지는 고객 메뉴로 들어가
 * 목록에서 찾고 고객을 연 다음에야 기록할 수 있었다. 어느 화면에 있든
 * 엄지가 가장 편하게 닿는 가운데 자리에서 바로 시작하게 한다.
 */
function BottomNav({
  onRecord,
  onMore,
  moreOpen,
}: {
  onRecord: () => void;
  onMore: () => void;
  moreOpen: boolean;
}) {
  const pathname = usePathname();
  const { isManager } = useStore();
  const items = navItemsFor(BOTTOM_NAV_ITEMS, isManager);
  // 관리자 4개 → 좌 2 / 우 2, 직원 2개 → 좌 1 / 우 1. 항상 한가운데에 놓인다.
  const split = Math.ceil(items.length / 2);

  const face = (item: (typeof items)[number], active: boolean) => {
    const Icon = item.icon;
    return (
      <>
        {active && (
          <span className="absolute top-0 h-[3px] w-9 rounded-b-full bg-aqua-500" />
        )}
        <Icon className={`h-6 w-6 ${active ? "" : "opacity-85"}`} />
        <span className="truncate">{item.label}</span>
      </>
    );
  };

  const tabCls = (active: boolean) =>
    `relative flex min-w-0 flex-1 flex-col items-center gap-1 px-1 pb-2.5 pt-3 text-[0.72rem] font-bold transition-colors ${
      active ? "text-deep-800 dark:text-aqua-700" : "text-nav-ink"
    }`;

  const tab = (item: (typeof items)[number]) => {
    /*
      '더보기'만 이동이 아니라 시트를 연다 — 라벨이 말하는 대로 더 보여 준다.
      보던 화면을 잃지 않는 것이 핵심이라, 링크가 아니라 단추여야 한다.
    */
    if (item.href === "/more") {
      return (
        <button
          key={item.href}
          type="button"
          onClick={onMore}
          aria-expanded={moreOpen}
          aria-haspopup="dialog"
          className={tabCls(moreOpen)}
        >
          {face(item, moreOpen)}
        </button>
      );
    }
    const active = isActive(pathname, item.href);
    return (
      <Link key={item.href} href={item.href} className={tabCls(active)}>
        {face(item, active)}
      </Link>
    );
  };

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-black/[0.05] bg-card/90 pb-[env(safe-area-inset-bottom)] shadow-nav backdrop-blur-md lg:hidden">
      {/* 직원 계정은 메뉴가 적어 탭이 과하게 벌어지지 않게 폭을 좁힌다 */}
      <div
        className={`mx-auto flex items-stretch justify-between ${
          items.length > 2 ? "max-w-lg" : "max-w-[19rem]"
        }`}
      >
        {items.slice(0, split).map(tab)}

        {/* 가운데 [기록] — 다른 탭보다 크고 튀어나오게 해서 한눈에 구분된다 */}
        <div className="flex w-[5.5rem] shrink-0 flex-col items-center justify-start">
          <button
            type="button"
            onClick={onRecord}
            data-tour="record-fab"
            aria-label="방문 기록하기"
            className="-mt-5 flex h-[3.75rem] w-[3.75rem] items-center justify-center rounded-full bg-gradient-to-br from-aqua-500 to-deep-800 text-white shadow-[0_6px_18px_rgba(10,46,44,0.35)] ring-4 ring-card transition-transform active:scale-95"
          >
            <PlusIcon className="h-8 w-8" strokeWidth={2.6} />
          </button>
          <span className="mt-1 text-[0.72rem] font-extrabold text-deep-800 dark:text-aqua-700">
            기록
          </span>
        </div>

        {items.slice(split).map(tab)}
      </div>
    </nav>
  );
}

/**
 * 역할 기반 화면 가드 — 직원 계정이 허용되지 않은 경로에 직접 접근하면
 * 고객 화면으로 되돌린다. (Supabase 연동 시 서버 세션 기준으로 동일 규칙 적용)
 */
function RouteGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isManager, ready } = useStore();
  // 저장된 사용자 복원 전에는 판단하지 않는다 (깜빡임/오이동 방지)
  const allowed = !ready || isManager || canAccessRoute("STAFF", pathname);

  useEffect(() => {
    if (!allowed) router.replace(STAFF_HOME);
  }, [allowed, router]);

  if (!allowed) return null;
  return <>{children}</>;
}

/** 자료를 읽는 동안의 뼈대 — 실제 화면과 같은 자리에 회색 덩어리만 */
function ContentSkeleton() {
  return (
    <div>
      {/* 화면을 읽어 주는 도구에는 상황을 말로 알린다 (덩어리들은 읽을 것이 없다) */}
      <p role="status" className="sr-only">
        불러오는 중입니다
      </p>
      <div className="animate-pulse" aria-hidden>
        <div className="mb-5 h-9 w-52 rounded-btn bg-stone-line/70" />
        <div className="mb-4 h-28 rounded-card bg-stone-line/50" />
        <div className="mb-4 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-card bg-stone-line/50" />
          ))}
        </div>
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-24 rounded-card bg-stone-line/40" />
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * 저장 실패 경고.
 *
 * 브라우저 저장 공간이 꽉 찼거나 사생활 보호 모드면 화면은 멀쩡히 바뀌는데
 * 기록은 남지 않는다. 모르고 계속 입력하면 그날 작업이 통째로 사라지므로,
 * 어느 화면에 있든 눈에 띄게 알리고 백업으로 유도한다.
 */
function SaveFailedBanner() {
  const { saveFailed } = useStore();
  if (!saveFailed) return null;
  return (
    <div className="no-print sticky top-0 z-40 border-b border-danger/30 bg-danger px-4 py-2.5 text-white sm:px-6 lg:ml-64 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-3 gap-y-1">
        <span className="text-sm font-extrabold">
          기록이 이 기기에 저장되지 않고 있습니다.
        </span>
        <span className="text-sm">
          브라우저 저장 공간이 가득 찼거나 시크릿 모드일 수 있습니다. 지금 입력한
          내용이 사라질 수 있으니
        </span>
        <Link
          href="/settings"
          className="rounded-full bg-white/20 px-3 py-1 text-sm font-extrabold underline-offset-2 ring-1 ring-white/30 hover:bg-white/30"
        >
          설정에서 전체 백업받기
        </Link>
      </div>
    </div>
  );
}

/**
 * 서버에 반영되지 않고 있을 때.
 *
 * 예전에는 이 사실이 설정 화면 안에만 적혔다. 현장에서 설정을 열어 볼 일은
 * 없으니, 인터넷이 끊긴 채로 하루치를 기록해도 아무도 모른다. 그 기록은
 * 이 기기에만 남고, 고객 화면에도 다른 기기에도 오지 않는다.
 * 저장 실패와 같은 무게의 일이므로 같은 자리에 같은 방식으로 알린다.
 */
function SyncFailedBanner() {
  const { phase, error, lastSyncedAt, syncNow } = useStaffLink();
  const [retrying, setRetrying] = useState(false);
  if (phase !== "linked" || !error) return null;

  const since = lastSyncedAt
    ? formatDateTimeKr(lastSyncedAt.slice(0, 10), lastSyncedAt.slice(11, 16))
    : null;

  return (
    <div className="no-print sticky top-0 z-40 border-b border-warn/40 bg-warn px-4 py-2.5 text-white sm:px-6 lg:ml-64 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-3 gap-y-1">
        <span className="text-sm font-extrabold">
          기록이 서버에 반영되지 않고 있습니다.
        </span>
        <span className="text-sm">
          {since ? `마지막 반영 ${since}. ` : ""}
          지금 적은 내용은 이 기기에만 있고, 고객 화면에는 아직 가지 않았습니다.
          — {error}
        </span>
        <button
          type="button"
          disabled={retrying}
          onClick={async () => {
            setRetrying(true);
            try {
              await syncNow();
            } finally {
              setRetrying(false);
            }
          }}
          className="inline-flex min-h-[40px] items-center rounded-full bg-white/20 px-4 text-sm font-extrabold ring-1 ring-white/30 hover:bg-white/30 disabled:opacity-70"
        >
          {retrying ? "보내는 중…" : "다시 시도"}
        </button>
      </div>
    </div>
  );
}

/**
 * 읽다가 건너뛴 기록 안내.
 *
 * 백업 파일이 중간에 잘렸거나 옮기다 깨지면 날짜가 빈 줄이 섞여 들어온다.
 * 예전에는 그 한 줄 때문에 화면이 통째로 하얘졌다. 이제는 그 줄만 빼고
 * 화면을 살리되, 무엇을 뺐는지 숨기지 않고 파일로 받아 갈 수 있게 한다.
 */
function DroppedRecordsBanner() {
  const { droppedRecords } = useStore();
  const [dismissed, setDismissed] = useState(false);
  if (droppedRecords.length === 0 || dismissed) return null;

  const save = () => {
    const blob = new Blob([JSON.stringify(droppedRecords, null, 2)], {
      type: "application/json",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "건너뛴-기록.json";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="no-print sticky top-0 z-40 border-b border-warn/30 bg-warn px-4 py-2.5 text-white sm:px-6 lg:ml-64 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-3 gap-y-1">
        <span className="text-sm font-extrabold">
          읽을 수 없는 기록 {droppedRecords.length}건을 건너뛰었습니다.
        </span>
        <span className="text-sm">
          나머지 기록은 그대로입니다. 건너뛴 내용을 파일로 받아 두시면 확인해
          드릴 수 있습니다.
        </span>
        <button
          type="button"
          onClick={save}
          className="rounded-full bg-white/20 px-3 py-1 text-sm font-extrabold ring-1 ring-white/30 hover:bg-white/30"
        >
          건너뛴 기록 내려받기
        </button>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="rounded-full px-3 py-1 text-sm font-bold text-white/80 hover:text-white"
        >
          닫기
        </button>
      </div>
    </div>
  );
}

/**
 * 화면 공유 모드 표시.
 *
 * 켜 두고 잊으면 반대 문제가 생긴다 — 원장님이 고객 이름을 못 찾는다.
 * 지금 가려져 있다는 것과 어디서 끄는지를 항상 띠로 보여 준다.
 */
function PrivacyModeBanner() {
  const { privacyMode } = useStore();
  if (!privacyMode) return null;
  return (
    <div className="no-print sticky top-0 z-40 border-b border-deep-line bg-deep-800 px-4 py-2 text-white sm:px-6 lg:ml-64 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-3 gap-y-1">
        <span className="text-sm font-extrabold">
          화면 공유 모드 — 고객 이름과 연락처를 가리고 있습니다.
        </span>
        <Link
          href="/settings#set-privacy"
          className="rounded-full bg-white/15 px-3 py-1 text-sm font-extrabold ring-1 ring-white/25 hover:bg-white/25"
        >
          설정에서 끄기
        </Link>
      </div>
    </div>
  );
}

export default function AppShell({ children }: { children: ReactNode }) {
  // 경로가 바뀌면 오류 상태를 푼다 — 다른 화면까지 막아 둘 이유가 없다
  const pathname = usePathname();
  const { ready } = useStore();
  const [paletteOpen, setPaletteOpen] = useState(false);
  /** 빠른 실행에서 바로 기록을 여는 고객 */
  const [recordFor, setRecordFor] = useState<string | undefined>();
  /** 폰 하단 [기록] 단추가 여는 고객 고르기 화면 */
  const [sheetOpen, setSheetOpen] = useState(false);
  /** 폰 하단 [더보기] 시트 */
  const [moreOpen, setMoreOpen] = useState(false);
  /** 처음 오신 분 등록 — 값이 있으면 등록 창이 열린다 (검색칸에 적던 이름) */
  const [newName, setNewName] = useState<string | undefined>();

  /**
   * Ctrl/⌘ + K 로 어디서든 연다.
   * 글자를 입력하는 중에는 가로채지 않는다 — 메모를 적다가 K 를 누르면
   * 창이 열려 버리면 곤란하기 때문이다(조합키가 눌린 경우만 받는다).
   */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="min-h-dvh">
      {/* 키보드로 쓰는 사람이 메뉴를 매번 지나치지 않도록 본문으로 건너뛴다 */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:rounded-btn focus:bg-deep-800 focus:px-4 focus:py-2.5 focus:text-[0.9375rem] focus:font-bold focus:text-white focus:shadow-float"
      >
        본문으로 건너뛰기
      </a>
      <Sidebar onOpenPalette={() => setPaletteOpen(true)} />
      <MobileHeader onOpenPalette={() => setPaletteOpen(true)} />
      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        onRecordVisit={setRecordFor}
      />
      {/* 폰 하단 [기록] → 고객 고르기 → 곧바로 기록 창 */}
      <RecordSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onPick={(id) => {
          setSheetOpen(false);
          setRecordFor(id);
        }}
        onNew={(name) => {
          setSheetOpen(false);
          setNewName(name);
        }}
      />
      {/* 처음 오신 분 — 등록이 끝나면 곧바로 그분의 기록 창으로 이어진다 */}
      <Modal
        open={newName !== undefined}
        onClose={() => setNewName(undefined)}
        title="처음 오신 분 등록"
        wide
      >
        <CustomerForm
          initialName={newName || undefined}
          onCancel={() => setNewName(undefined)}
          onSaved={(id) => {
            setNewName(undefined);
            setRecordFor(id);
          }}
        />
      </Modal>
      {/* 찾자마자 기록 — 화면을 옮기지 않고 그 자리에서 끝낸다 */}
      <QuickVisitModal
        customerId={recordFor}
        onClose={() => setRecordFor(undefined)}
      />
      <SaveFailedBanner />
      <SyncFailedBanner />
      <DroppedRecordsBanner />
      <PrivacyModeBanner />
      <main
        id="main"
        tabIndex={-1}
        className="px-4 pb-24 pt-4 outline-none sm:px-6 lg:ml-64 lg:px-8 lg:pb-10 lg:pt-8"
      >
        <div className="mx-auto w-full max-w-7xl">
          {/*
            저장된 자료를 아직 못 읽었으면 뼈대만 보여 준다.

            이 화면은 브라우저가 먼저 그린 뒤에 저장된 자료를 읽어 다시
            그린다. 그 사이(느린 폰에서 0.3~0.6초)에는 처음 들어 있던 예시
            자료가 그대로 보였다 — 샘플을 지우고 실제로 쓰는 원장 화면에
            모르는 이름이 잠깐 떴다 사라진다는 뜻이다.
            남의 이름을 보여 주느니 뼈대를 보여 준다.

            가름은 방어막 **바깥**에 둔다. 안쪽에 두면 화면을 그리다 오류가
            났을 때 리액트가 다시 그려 보는 사이 뼈대와 본문이 뒤바뀌어,
            방어막이 오류를 받지 못하고 앱 전체가 하얘진다.
          */}
          {ready ? (
            <ErrorBoundary resetKey={pathname}>
              <RouteGuard>{children}</RouteGuard>
            </ErrorBoundary>
          ) : (
            <ContentSkeleton />
          )}
        </div>
      </main>
      <BottomNav
        onRecord={() => setSheetOpen(true)}
        onMore={() => setMoreOpen(true)}
        moreOpen={moreOpen}
      />
      <MoreSheet open={moreOpen} onClose={() => setMoreOpen(false)} />
      <footer className="hidden pb-6 text-center text-xs text-ink-faint lg:ml-64 lg:block">
        © 2026 정통대왕쑥뜸원 AX Platform
      </footer>
    </div>
  );
}
