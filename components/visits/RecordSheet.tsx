"use client";

/**
 * 기록할 고객 고르기 — 폰 하단 [기록] 버튼이 여는 화면
 * ====================================================
 * 현장에서 가장 많이 하는 일이 방문 기록이다. 그런데 지금까지는
 * 고객 메뉴 → 목록에서 찾기 → 고객 열기 → 버튼 누르기까지 네 걸음이었다.
 * 손에 폰을 들고 고객을 응대하면서 하기에는 길다.
 *
 * 여기서는 두 걸음으로 줄인다 — [기록] 누르고, 이름 누르면 끝.
 *
 * 40~60대가 손가락으로 쓰는 화면이라 이렇게 만들었다.
 *  - 줄 높이를 넉넉히(64px 이상) 잡아 옆줄을 잘못 누르지 않게 한다.
 *  - 이름을 크게, 부가 정보는 한 줄로만.
 *  - 검색하지 않아도 바로 누를 수 있게 **오늘 올 만한 분**을 위에 올린다.
 *    (다음 관리 예정일이 됐거나 지난 고객 → 그다음 최근 방문 순)
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useStore } from "@/lib/data/store";
import { CustomerStatusBadge } from "@/components/ui";
import { PlusIcon, SearchIcon, XIcon } from "@/components/ui/icons";
import { displayName, displayPhone, phoneDigits } from "@/lib/utils/format";
import { formatRelative, todayISO } from "@/lib/utils/date";
import { matchesQuery } from "@/lib/utils/hangul";
import { SheetGrabber, useSheetDrag } from "@/components/ui/sheet";

const MAX_ROWS = 30;

export default function RecordSheet({
  open,
  onClose,
  onPick,
  onNew,
  currentId,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (customerId: string) => void;
  /**
   * 지금 보고 있는 고객 (고객 상세에서 [기록] 을 눌렀을 때, D-60).
   * 맨 위에 「지금 보고 있는 분」 으로 따로 둔다 — 그 화면에서 [기록] 을
   * 누른 사람은 십중팔구 그분을 기록하려는 것이다.
   */
  currentId?: string;
  /** 처음 오신 분 — 검색어를 이름으로 넘겨 등록 화면을 연다 */
  onNew: (name: string) => void;
}) {
  const { derivedById, canSeePhone, privacyMode } = useStore();
  const [query, setQuery] = useState("");
  const [mounted, setMounted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    // 폰에서 자판이 바로 튀어오르면 목록이 가려진다.
    // 대부분은 위에 뜬 이름을 그냥 누르므로, 자판은 검색칸을 눌렀을 때만 올라오게 둔다.
    const body = document.body;
    const prev = body.style.overflow;
    body.style.overflow = "hidden";
    // 닫기 함수는 매 렌더 새로 만들어지므로 ref 로 받는다.
    // (의존성에 직접 넣으면 렌더될 때마다 이 효과가 다시 돌아 검색어가 지워진다)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const rows = useMemo(() => {
    const q = query.trim();
    const today = todayISO();
    const all = [...derivedById.values()];

    const filtered = q
      ? all.filter((d) => {
          const digits = phoneDigits(q);
          if (digits.length >= 2 && phoneDigits(d.customer.phone).includes(digits))
            return true;
          return matchesQuery(d.customer.name, q);
        })
      : all;

    return filtered
      .map((d) => {
        // 오늘 오기로 한 분, 예정일이 지난 분을 위로.
        // 오늘 이미 기록한 분은 끝난 일이라 아래로 — 두 번 기록하는 실수를 줄인다.
        const due = d.customer.nextManageDate;
        const doneToday = (d.lastVisitDate ?? "").slice(0, 10) === today;
        const dueRank = doneToday ? 3 : due ? (due <= today ? 0 : 1) : 2;
        // 이름을 그대로 쳤으면 그분이 맨 위 — 「옥윤용」 을 찾는데 「옥윤용2」 가 먼저 뜨면 안 된다
        const exact = q && d.customer.name === q ? 0 : 1;
        const here = !q && d.customer.id === currentId ? 0 : 1;
        return { d, dueRank, exact, here, last: d.lastVisitDate ?? "" };
      })
      .sort((a, b) => {
        if (a.here !== b.here) return a.here - b.here;
        if (a.exact !== b.exact) return a.exact - b.exact;
        if (a.dueRank !== b.dueRank) return a.dueRank - b.dueRank;
        // 예정일이 같은 무리 안에서는 최근에 온 분부터 (기억이 생생한 순)
        return b.last.localeCompare(a.last);
      })
      .slice(0, MAX_ROWS);
  }, [derivedById, query, currentId]);

  /* 손잡이 · 제목 줄을 아래로 끌면 닫힌다 (components/ui/sheet.tsx) */
  const drag = useSheetDrag(onClose);

  if (!open || !mounted) return null;

  const today = todayISO();
  /*
    「오늘 예정」 인 분(예정일이 오늘이거나 지난 분)을 따로 묶어 머리를
    단다 (D-59). 순서는 전부터 그분들이 위였지만, 어디까지가 그 무리인지
    줄만 봐서는 알 수 없었다 — 다섯째 줄이 오늘 예정인지 그냥 최근
    손님인지. 머리 이름은 줄마다 붙는 「오늘 예정」 표와 같은 말을 쓴다.
    찾는 중(검색어가 있을 때)에는 묶지 않는다 — 찾는 이름이 맨 위면 된다.
  */
  const pinned = rows[0]?.here === 0 ? 1 : 0;
  const dueCount = query.trim()
    ? 0
    : rows.filter((r) => r.here !== 0 && r.dueRank === 0).length;

  return createPortal(
    <div className="fixed inset-0 z-[65] flex flex-col justify-end">
      <div
        className="sheet-backdrop absolute inset-0 bg-deep-950/45 backdrop-blur-[3px]"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="기록할 고객 고르기"
        style={drag.panelStyle}
        className="sheet-panel relative z-10 flex max-h-[88dvh] flex-col rounded-t-card-lg bg-card shadow-float"
      >
        {/* 손잡이 + 제목 + 닫기 — 닫기는 크게 (잘못 눌러 갇히지 않게) · 이 줄을 끌어내려도 닫힌다 */}
        <div {...drag.handleProps} className="shrink-0">
          <SheetGrabber />
          <div className="flex items-center justify-between gap-3 border-b border-stone-line px-4 pb-3.5 pt-1.5">
            <div className="min-w-0">
              <h2 className="truncate text-lg font-extrabold text-ink">
                누구의 기록인가요?
              </h2>
              <p className="mt-0.5 truncate text-xs text-ink-sub">
                이름을 누르면 바로 기록 화면이 열립니다
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="닫기"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-stone-bg text-ink-sub"
            >
              <XIcon className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* 검색 — 안 써도 되지만 고객이 많으면 필요하다 */}
        <div className="border-b border-stone-line px-4 py-3">
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-faint" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="이름 · 초성 · 연락처"
              aria-label="고객 찾기"
              inputMode="search"
              className="h-12 w-full rounded-full border border-transparent bg-stone-bg-deep pl-11 pr-4 text-base font-bold text-ink outline-none placeholder:font-normal placeholder:text-ink-sub focus:border-aqua-500 focus:bg-card focus:ring-2 focus:ring-aqua-100"
            />
          </div>
        </div>

        {rows.length === 0 ? (
          <p className="px-4 py-8 text-center text-[0.9375rem] leading-relaxed text-ink-sub">
            {query.trim()
              ? `'${query.trim()}' 님은 아직 등록되어 있지 않습니다.`
              : "등록된 고객이 없습니다."}
            <br />
            아래에서 바로 등록하고 기록할 수 있습니다.
          </p>
        ) : (
          <ul className="min-h-0 flex-1 overflow-y-auto">
            {rows.map(({ d }, i) => {
              const due = d.customer.nextManageDate;
              const doneToday = (d.lastVisitDate ?? "").slice(0, 10) === today;
              const isDue = !doneToday && !!due && due <= today;
              const m = d.activeMembership;
              const head =
                pinned && i === 0
                  ? "지금 보고 있는 분"
                  : dueCount > 0 && i === pinned
                    ? `오늘 예정 · ${dueCount}명`
                    : (dueCount > 0 || pinned) && i === pinned + dueCount
                      ? "그 밖의 분"
                      : null;
              return (
                <li key={d.customer.id}>
                  {head && (
                    <p
                      data-sheet-group
                      className="border-b border-stone-line/70 bg-card-soft px-4 py-2 text-[0.8125rem] font-extrabold text-ink-sub"
                    >
                      {head}
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={() => onPick(d.customer.id)}
                    className="flex w-full items-center gap-3.5 border-b border-stone-line/70 px-4 py-3.5 text-left active:bg-aqua-50"
                  >
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-aqua-500 to-deep-800 text-lg font-extrabold text-white">
                      {d.customer.name.slice(0, 1)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="min-w-0 truncate text-[1.0625rem] font-extrabold text-ink">
                          {displayName(d.customer.name, privacyMode)}
                        </span>
                        {doneToday ? (
                          <span className="shrink-0 rounded-full bg-stone-bg-deep px-2 py-0.5 text-[0.6875rem] font-extrabold text-ink-sub">
                            오늘 기록함
                          </span>
                        ) : isDue ? (
                          <span className="shrink-0 rounded-full bg-aqua-500 px-2 py-0.5 text-[0.6875rem] font-extrabold text-white">
                            오늘 예정
                          </span>
                        ) : (
                          <CustomerStatusBadge status={d.status} />
                        )}
                      </span>
                      <span className="tabular mt-0.5 block line-clamp-2 text-[0.8125rem] leading-snug text-ink-sub">
                        {displayPhone(d.customer.phone, canSeePhone)}
                        {d.lastVisitDate
                          ? ` · 최근 ${formatRelative(d.lastVisitDate)}`
                          : " · 방문 이력 없음"}
                        {/* 카운터에서 「몇 번 남았어요?」 에 바로 답한다 */}
                        {m && (
                          <span className="font-bold text-aqua-800 dark:text-aqua-400">
                            {` · 이용권 ${m.remainingCount}회`}
                          </span>
                        )}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {/*
          처음 오신 분 — 목록에 없다고 되돌아 나가지 않도록 늘 보이게 둔다.
          현장에서 새 손님을 받는 일은 드물지 않은데, 지금까지는
          시트를 닫고 고객 메뉴로 들어가 등록한 뒤 다시 기록을 시작해야 했다.
          검색칸에 적어 둔 이름은 등록 화면에 그대로 넘긴다.
        */}
        <div className="shrink-0 border-t border-stone-line px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3">
          <button
            type="button"
            onClick={() => onNew(query.trim())}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-aqua-50 text-[0.9375rem] font-extrabold text-aqua-800 ring-1 ring-aqua-200 active:bg-aqua-100"
          >
            <PlusIcon className="h-5 w-5" strokeWidth={2.4} />
            처음 오신 분 등록하고 기록
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
