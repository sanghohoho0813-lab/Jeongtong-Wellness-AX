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

const MAX_ROWS = 30;

export default function RecordSheet({
  open,
  onClose,
  onPick,
  onNew,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (customerId: string) => void;
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
        // 오늘 오기로 한 분, 예정일이 지난 분을 위로
        const due = d.customer.nextManageDate;
        const dueRank = due ? (due <= today ? 0 : 1) : 2;
        return { d, dueRank, last: d.lastVisitDate ?? "" };
      })
      .sort((a, b) => {
        if (a.dueRank !== b.dueRank) return a.dueRank - b.dueRank;
        // 예정일이 같은 무리 안에서는 최근에 온 분부터 (기억이 생생한 순)
        return b.last.localeCompare(a.last);
      })
      .slice(0, MAX_ROWS);
  }, [derivedById, query]);

  if (!open || !mounted) return null;

  const today = todayISO();

  return createPortal(
    <div className="fixed inset-0 z-[65] flex flex-col justify-end">
      <div
        className="absolute inset-0 bg-deep-950/45 backdrop-blur-[3px]"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="기록할 고객 고르기"
        className="relative z-10 flex max-h-[88dvh] flex-col rounded-t-card-lg bg-card shadow-float"
      >
        {/* 제목 + 닫기 — 닫기는 크게 (잘못 눌러 갇히지 않게) */}
        <div className="flex items-center justify-between gap-3 border-b border-stone-line px-4 py-3.5">
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
              className="h-12 w-full rounded-btn border border-stone-line bg-card-soft pl-11 pr-3 text-base font-bold text-ink outline-none placeholder:font-normal placeholder:text-ink-faint focus:border-aqua-500 focus:bg-card focus:ring-2 focus:ring-aqua-100"
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
            {rows.map(({ d }) => {
              const due = d.customer.nextManageDate;
              const isDue = !!due && due <= today;
              return (
                <li key={d.customer.id}>
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
                        {isDue && (
                          <span className="shrink-0 rounded-full bg-aqua-500 px-2 py-0.5 text-[0.6875rem] font-extrabold text-white">
                            오늘 예정
                          </span>
                        )}
                        {!isDue && <CustomerStatusBadge status={d.status} />}
                      </span>
                      <span className="tabular mt-0.5 block line-clamp-2 text-[0.8125rem] leading-snug text-ink-sub">
                        {displayPhone(d.customer.phone, canSeePhone)}
                        {d.lastVisitDate
                          ? ` · 최근 ${formatRelative(d.lastVisitDate)}`
                          : " · 방문 이력 없음"}
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
            className="flex h-12 w-full items-center justify-center gap-2 rounded-btn bg-aqua-50 text-[0.9375rem] font-extrabold text-aqua-800 ring-1 ring-aqua-200 active:bg-aqua-100"
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
