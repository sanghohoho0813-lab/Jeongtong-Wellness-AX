"use client";

/**
 * 빠른 실행 (Ctrl/⌘ + K)
 * ======================
 * 하루에도 수십 번 하는 일이 "고객 찾기"와 "화면 옮기기"다.
 * 그때마다 메뉴를 눈으로 훑고 마우스를 옮기면 응대가 끊긴다.
 * 여기서는 키 하나로 열어 몇 글자만 치면 바로 간다.
 *
 * 검색창 하나에 세 가지를 함께 담았다 — 고객 · 화면 · 자주 쓰는 동작.
 * 따로 두면 "어디서 찾더라"를 또 기억해야 하기 때문이다.
 *
 * 직원 계정에게는 볼 수 없는 화면과 대표 전용 동작을 아예 보여 주지 않는다
 * (화면 가드와 같은 기준 — lib/auth/permissions.ts).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { useStore } from "@/lib/data/store";
import { useTour } from "@/components/docs/Tour";
import { useToast } from "@/components/ui/toast";
import { CustomerStatusBadge, OpportunityBadge } from "@/components/ui";
import {
  BookIcon,
  ChevronRightIcon,
  DownloadIcon,
  SearchIcon,
  SparkIcon,
  UsersIcon,
} from "@/components/ui/icons";
import { NAV_TONE_CLASS, SIDEBAR_ITEMS, navItemsFor } from "./nav-items";
import { buildBackupFile, downloadFile } from "@/lib/utils/export";
import { displayPhone, phoneDigits } from "@/lib/utils/format";
import { formatRelative } from "@/lib/utils/date";
import { matchesQuery } from "@/lib/utils/hangul";

const MAX_CUSTOMERS = 6;

/**
 * 화면을 부르는 다른 이름들.
 *
 * 메뉴에 적힌 말과 머릿속에 떠오르는 말은 자주 다르다. 분석 화면을 찾으려고
 * "분석"이나 "매출"을 치는데 메뉴 이름은 'AX 도입성과'라 아무것도 안 나오면,
 * 검색창을 한 번 헛치고는 다시 안 쓰게 된다.
 */
const NAV_KEYWORDS: Record<string, string> = {
  "/": "홈 대시보드 오늘 현황 첫화면",
  "/briefing": "할일 오늘할일 과제 브리핑 관리대상 실행",
  "/customers": "명부 회원 손님 고객목록 등록",
  "/visits": "방문기록 이용기록 이력 상담",
  "/retention": "재방문 관리 이탈 장기미방문",
  "/analytics": "분석 성과 매출 통계 지표 추이 리포트",
  "/branches": "지점 운영 매장 조직",
  "/settings": "환경 기준 백업 데이터 가져오기 직원 관리기준",
  "/intro": "왜 배경 소개 기획",
  "/guide": "도움말 설명서 매뉴얼 사용법 안내",
};

interface Item {
  id: string;
  group: "고객" | "화면" | "동작";
  label: string;
  hint?: string;
  /** 검색에 함께 걸리는 말 (한글 표기가 다른 경우 등) */
  keywords?: string;
  icon: React.ReactNode;
  run: () => void;
  /** 고객 항목의 부가 표시 */
  badge?: React.ReactNode;
  /**
   * 오른쪽에 함께 붙는 보조 동작.
   * 현장에서 고객을 찾는 이유의 대부분이 "방문 기록"이라, 상세로 들어가지 않고
   * 여기서 바로 열 수 있게 한다. 찾기 → 기록이 한 번에 끝난다.
   */
  secondary?: { label: string; run: () => void };
}

export default function CommandPalette({
  open,
  onClose,
  onRecordVisit,
}: {
  open: boolean;
  onClose: () => void;
  /** 고객 줄의 [방문 기록]을 눌렀을 때 — 셸이 기록 창을 연다 */
  onRecordVisit: (customerId: string) => void;
}) {
  const router = useRouter();
  const {
    derivedById,
    opportunityById,
    canSeePhone,
    isManager,
    settings,
    updateSettings,
    customers,
    visits,
    memberships,
    staff,
    branches,
  } = useStore();
  const { startTour } = useTour();
  const toast = useToast();

  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const go = useCallback(
    (href: string) => {
      onClose();
      router.push(href);
    },
    [onClose, router],
  );

  // ---------- 화면 ----------
  const navItems: Item[] = useMemo(() => {
    const items = navItemsFor(SIDEBAR_ITEMS, isManager);
    const docs = [
      { href: "/intro", label: "기획의도", icon: BookIcon, tone: "gold" as const },
      { href: "/guide", label: "사용 가이드", icon: SparkIcon, tone: "aqua" as const },
    ];
    return [
      ...items.map((n) => ({
        id: `nav-${n.href}`,
        group: "화면" as const,
        label: n.label,
        icon: (
          <span
            className={`flex h-7 w-7 items-center justify-center rounded-lg ring-1 ${NAV_TONE_CLASS[n.tone]}`}
          >
            <n.icon className="h-4 w-4" />
          </span>
        ),
        keywords: NAV_KEYWORDS[n.href],
        run: () => go(n.href),
      })),
      ...docs.map((d) => ({
        id: `doc-${d.href}`,
        group: "화면" as const,
        label: d.label,
        icon: (
          <span
            className={`flex h-7 w-7 items-center justify-center rounded-lg ring-1 ${NAV_TONE_CLASS[d.tone]}`}
          >
            <d.icon className="h-4 w-4" />
          </span>
        ),
        keywords: NAV_KEYWORDS[d.href],
        run: () => go(d.href),
      })),
    ];
  }, [isManager, go]);

  // ---------- 동작 ----------
  const actionItems: Item[] = useMemo(() => {
    const chip = (node: React.ReactNode, cls: string) => (
      <span
        className={`flex h-7 w-7 items-center justify-center rounded-lg ring-1 ${cls}`}
      >
        {node}
      </span>
    );
    const list: Item[] = [
      {
        id: "act-tour",
        group: "동작",
        label: "단계별 안내 시작",
        hint: "화면을 옮겨 가며 사용법을 보여 드립니다",
        keywords: "튜토리얼 도움말 사용법",
        icon: chip(<SparkIcon className="h-4 w-4" />, NAV_TONE_CLASS.aqua),
        run: () => {
          onClose();
          startTour();
        },
      },
      {
        id: "act-theme",
        group: "동작",
        label:
          settings.theme === "dark" ? "라이트 모드로 전환" : "다크 모드로 전환",
        keywords: "테마 어두운 밝은 화면",
        icon: chip(<BookIcon className="h-4 w-4" />, NAV_TONE_CLASS.gray),
        run: () => {
          updateSettings({
            theme: settings.theme === "dark" ? "light" : "dark",
          });
          onClose();
        },
      },
      {
        id: "act-font",
        group: "동작",
        label:
          settings.fontScale === "large"
            ? "글자 크기 기본으로"
            : "글자 크게 보기",
        keywords: "글씨 크기 확대 잘 안 보임",
        icon: chip(<BookIcon className="h-4 w-4" />, NAV_TONE_CLASS.violet),
        run: () => {
          updateSettings({
            fontScale: settings.fontScale === "large" ? "default" : "large",
          });
          onClose();
        },
      },
    ];
    if (isManager) {
      list.push({
        id: "act-backup",
        group: "동작",
        label: "전체 백업 내려받기",
        hint: "지금까지의 모든 기록을 파일 하나로",
        keywords: "저장 내보내기 보관",
        icon: chip(<DownloadIcon className="h-4 w-4" />, NAV_TONE_CLASS.gold),
        run: () => {
          const file = buildBackupFile({
            customers,
            visits,
            memberships,
            staff,
            branches,
            settings,
          });
          downloadFile(file.name, file.content, file.mime);
          updateSettings({ lastBackupAt: new Date().toISOString() });
          onClose();
          toast("전체 백업 파일을 내려받았습니다");
        },
      });
    }
    return list;
  }, [
    settings,
    updateSettings,
    isManager,
    customers,
    visits,
    memberships,
    staff,
    branches,
    onClose,
    startTour,
    toast,
  ]);

  // ---------- 고객 ----------
  const customerItems: Item[] = useMemo(() => {
    const q = query.trim();
    if (!q) return [];
    const digits = phoneDigits(q);
    return [...derivedById.values()]
      .filter((d) => {
        if (digits.length >= 2 && phoneDigits(d.customer.phone).includes(digits))
          return true;
        return matchesQuery(d.customer.name, q);
      })
      // 관리가 급한 고객을 위로 — 찾자마자 상태가 눈에 들어오게
      .sort((a, b) => b.priorityScore - a.priorityScore)
      .slice(0, MAX_CUSTOMERS)
      .map((d) => {
        const opp = opportunityById.get(d.customer.id);
        return {
          id: `cust-${d.customer.id}`,
          group: "고객" as const,
          label: d.customer.name,
          hint: `${displayPhone(d.customer.phone, canSeePhone)} · 방문 ${d.visitCount}회${
            d.lastVisitDate ? ` · 최근 ${formatRelative(d.lastVisitDate)}` : ""
          }`,
          icon: (
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-aqua-50 to-aqua-100 text-xs font-extrabold text-aqua-800 ring-1 ring-aqua-200/60">
              {d.customer.name.slice(0, 1)}
            </span>
          ),
          badge: (
            <span className="flex shrink-0 items-center gap-1.5">
              <CustomerStatusBadge status={d.status} />
              {opp && opp.type !== "none" && (
                <OpportunityBadge opportunity={opp} size="sm" />
              )}
            </span>
          ),
          run: () => go(`/customers/${d.customer.id}`),
          secondary: {
            label: "방문 기록",
            run: () => {
              onClose();
              onRecordVisit(d.customer.id);
            },
          },
        };
      });
  }, [
    query,
    derivedById,
    opportunityById,
    canSeePhone,
    go,
    onClose,
    onRecordVisit,
  ]);

  // ---------- 검색어로 걸러내기 ----------
  const results: Item[] = useMemo(() => {
    const q = query.trim();
    const match = (it: Item) =>
      !q ||
      it.label.includes(q) ||
      (it.keywords ?? "").includes(q) ||
      matchesQuery(it.label, q);
    // 고객을 맨 위에 둔다 — 검색창을 여는 이유의 대부분이라
    return [...customerItems, ...navItems.filter(match), ...actionItems.filter(match)];
  }, [query, customerItems, navItems, actionItems]);

  useEffect(() => setCursor(0), [query]);
  useEffect(() => {
    if (open) {
      setQuery("");
      setCursor(0);
      // 여는 순간 바로 칠 수 있게
      window.setTimeout(() => inputRef.current?.focus(), 20);
    }
  }, [open]);

  // 선택 중인 항목이 화면 밖으로 나가지 않게
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${cursor}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [cursor]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCursor((c) => (results.length ? (c + 1) % results.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((c) =>
        results.length ? (c - 1 + results.length) % results.length : 0,
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      results[cursor]?.run();
    }
  };

  if (!open || !mounted) return null;

  // 그룹 머리글을 넣기 위해 "이 항목이 그룹의 첫 번째인가"를 미리 계산한다
  let lastGroup = "";
  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-start justify-center p-3 sm:p-6">
      <div
        className="absolute inset-0 bg-deep-950/45 backdrop-blur-[3px]"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="빠른 실행"
        onKeyDown={onKeyDown}
        className="relative z-10 mt-[6vh] flex max-h-[80dvh] w-full max-w-xl flex-col overflow-hidden rounded-card-lg bg-card shadow-float ring-1 ring-black/[0.06] dark:ring-white/10"
      >
        <div className="flex items-center gap-2.5 border-b border-stone-line px-4 py-3">
          <SearchIcon className="h-5 w-5 shrink-0 text-ink-faint" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="고객 이름 · 화면 · 하고 싶은 일"
            aria-label="빠른 실행 검색"
            className="h-8 min-w-0 flex-1 bg-transparent text-[0.9375rem] font-bold text-ink outline-none placeholder:font-normal placeholder:text-ink-faint"
          />
          <kbd className="hidden shrink-0 rounded-md bg-stone-bg px-1.5 py-0.5 text-[0.6875rem] font-bold text-ink-faint sm:block">
            ESC
          </kbd>
        </div>

        {results.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm leading-relaxed text-ink-sub">
            <b className="text-ink-soft">{query}</b> 와(과) 맞는 것이 없습니다.
            <br />
            고객 이름은 초성(<b>ㅎㄱㄷ</b>)으로도 찾을 수 있습니다.
          </p>
        ) : (
          <ul ref={listRef} className="min-h-0 flex-1 overflow-y-auto py-1.5">
            {results.map((it, i) => {
              const head = it.group !== lastGroup ? it.group : null;
              lastGroup = it.group;
              const active = i === cursor;
              return (
                <li key={it.id}>
                  {head && (
                    <p className="px-4 pb-1 pt-2.5 text-[0.6875rem] font-extrabold uppercase tracking-wider text-ink-faint">
                      {head}
                    </p>
                  )}
                  <div
                    data-idx={i}
                    onMouseEnter={() => setCursor(i)}
                    className={`flex items-center gap-2 pr-2.5 transition-colors ${
                      active ? "bg-aqua-50" : "hover:bg-stone-bg"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={it.run}
                      className="flex min-w-0 flex-1 items-center gap-3 py-2.5 pl-4 text-left"
                    >
                      <span className="shrink-0">{it.icon}</span>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="min-w-0 truncate font-extrabold text-ink">
                            {it.label}
                          </span>
                          {it.badge}
                        </span>
                        {it.hint && (
                          <span className="tabular block truncate text-xs text-ink-sub">
                            {it.hint}
                          </span>
                        )}
                      </span>
                    </button>
                    {it.secondary ? (
                      <button
                        type="button"
                        onClick={it.secondary.run}
                        className="shrink-0 rounded-btn bg-aqua-50 px-2.5 py-1.5 text-xs font-extrabold text-aqua-800 ring-1 ring-aqua-200 transition-colors hover:bg-aqua-100"
                      >
                        {it.secondary.label}
                      </button>
                    ) : (
                      <ChevronRightIcon
                        className={`h-4 w-4 shrink-0 ${active ? "text-aqua-700" : "text-ink-faint"}`}
                      />
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <div className="hidden items-center gap-3 border-t border-stone-line px-4 py-2 text-[0.6875rem] text-ink-faint sm:flex">
          <span className="flex items-center gap-1">
            <kbd className="rounded bg-stone-bg px-1 py-0.5 font-bold">↑</kbd>
            <kbd className="rounded bg-stone-bg px-1 py-0.5 font-bold">↓</kbd>
            이동
          </span>
          <span className="flex items-center gap-1">
            <kbd className="rounded bg-stone-bg px-1 py-0.5 font-bold">Enter</kbd>
            실행
          </span>
          <span className="ml-auto flex items-center gap-1">
            <UsersIcon className="h-3.5 w-3.5" />
            고객은 초성으로도 찾습니다
          </span>
        </div>
      </div>
    </div>,
    document.body,
  );
}
