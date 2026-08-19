"use client";

/**
 * 빠른 고객 찾기 — 어느 화면에서든 고객을 바로 연다.
 *
 * 현장에서 가장 자주 하는 동작은 "지금 앞에 있는 고객 화면 열기"다.
 * 그때마다 고객 메뉴로 이동 → 검색 → 선택을 거치면 응대가 끊긴다.
 * 그래서 화면 이동 없이 이름·연락처로 찾아 바로 상세로 보낸다.
 *
 * 이름 초성(ㄱ, ㅎㄱㄷ)으로도 찾을 수 있게 해, 이름이 정확히 기억나지 않아도
 * 몇 글자만으로 좁혀진다.
 */

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "@/lib/data/store";
import { CustomerStatusBadge, OpportunityBadge } from "@/components/ui";
import { SearchIcon, XIcon } from "@/components/ui/icons";
import { displayPhone, phoneDigits } from "@/lib/utils/format";
import { formatRelative } from "@/lib/utils/date";
import { matchesQuery } from "@/lib/utils/hangul";

const MAX_RESULTS = 8;

export default function QuickSearch({
  variant = "sidebar",
}: {
  /** sidebar: PC 사이드바의 넓은 입력 / icon: 모바일 헤더의 아이콘 버튼 */
  variant?: "sidebar" | "icon";
}) {
  const router = useRouter();
  const { derivedById, opportunityById, canSeePhone } = useStore();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  const results = useMemo(() => {
    const q = query.trim();
    if (!q) return [];
    const digits = phoneDigits(q);
    const all = [...derivedById.values()];
    return all
      .filter((d) => {
        if (digits.length >= 2 && phoneDigits(d.customer.phone).includes(digits))
          return true;
        return matchesQuery(d.customer.name, q);
      })
      // 관리가 급한 고객을 위로 — 찾자마자 상태가 눈에 들어오게
      .sort((a, b) => b.priorityScore - a.priorityScore)
      .slice(0, MAX_RESULTS);
  }, [query, derivedById]);

  useEffect(() => setCursor(0), [query]);

  // 바깥을 누르면 닫는다
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const go = (id: string) => {
    setOpen(false);
    setQuery("");
    router.push(`/customers/${id}`);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      if (query) setQuery("");
      else setOpen(false);
      return;
    }
    if (results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCursor((c) => (c + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((c) => (c - 1 + results.length) % results.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      go(results[cursor].customer.id);
    }
  };

  // 사이드바는 폭이 좁아 결과 줄이 잘린다 — 목록만 사이드바보다 넓게 띄운다
  const list = (
    <div
      className={`absolute top-full z-50 mt-2 overflow-hidden rounded-card bg-card shadow-float ring-1 ring-black/[0.06] dark:ring-white/10 ${
        variant === "sidebar" ? "left-0 w-[21rem] max-w-[90vw]" : "inset-x-0"
      }`}
    >
      {query.trim() === "" ? (
        <p className="px-4 py-3.5 text-sm leading-relaxed text-ink-sub">
          고객 이름이나 연락처를 입력하세요. 초성(예: <b>ㅎㄱㄷ</b>)으로도
          찾을 수 있습니다.
        </p>
      ) : results.length === 0 ? (
        <p className="px-4 py-3.5 text-sm text-ink-sub">
          <b className="text-ink-soft">{query}</b> 와(과) 맞는 고객이 없습니다.
        </p>
      ) : (
        <ul className="max-h-[60vh] overflow-y-auto py-1">
          {results.map((d, i) => {
            const c = d.customer;
            const opp = opportunityById.get(c.id);
            return (
              <li key={c.id}>
                <button
                  type="button"
                  onMouseEnter={() => setCursor(i)}
                  onClick={() => go(c.id)}
                  className={`flex w-full items-center gap-3 px-3.5 py-2.5 text-left transition-colors ${
                    i === cursor ? "bg-aqua-50" : "hover:bg-stone-bg"
                  }`}
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-aqua-50 to-aqua-100 text-sm font-extrabold text-aqua-800 ring-1 ring-aqua-200/60">
                    {c.name.slice(0, 1)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
                      <span className="min-w-0 truncate font-extrabold text-ink">
                        {c.name}
                      </span>
                      <CustomerStatusBadge status={d.status} />
                      {opp && opp.type !== "none" && (
                        <OpportunityBadge opportunity={opp} size="sm" />
                      )}
                    </span>
                    <span className="nowrap-num block truncate text-xs text-ink-sub">
                      {displayPhone(c.phone, canSeePhone)} · 방문{" "}
                      {d.visitCount}회
                      {d.lastVisitDate
                        ? ` · 최근 ${formatRelative(d.lastVisitDate)}`
                        : ""}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );

  // ---------- 모바일 헤더: 아이콘 → 펼침 ----------
  if (variant === "icon") {
    return (
      <>
        <button
          type="button"
          aria-label="고객 찾기 열기"
          onClick={() => setOpen(true)}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-black/[0.05] bg-card text-ink-sub shadow-card dark:border-white/10"
        >
          <SearchIcon className="h-5 w-5" />
        </button>

        {open && (
          <div className="fixed inset-0 z-50">
            <div
              className="absolute inset-0 bg-deep-950/40 backdrop-blur-[2px]"
              onClick={() => setOpen(false)}
            />
            <div
              ref={boxRef}
              className="relative mx-3 mt-3 rounded-card bg-card p-2.5 shadow-float"
            >
              <div className="relative flex items-center gap-2">
                <SearchIcon className="pointer-events-none absolute left-3 h-5 w-5 text-ink-faint" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={onKeyDown}
                  placeholder="고객 이름 · 연락처"
                  aria-label="고객 빠르게 찾기"
                  className="h-11 w-full rounded-btn border border-stone-line bg-card pl-10 pr-3 text-[0.9375rem] font-bold text-ink outline-none placeholder:font-normal placeholder:text-ink-faint focus:border-aqua-500 focus:ring-2 focus:ring-aqua-100"
                />
                <button
                  type="button"
                  aria-label="닫기"
                  onClick={() => setOpen(false)}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-stone-bg text-ink-sub"
                >
                  <XIcon className="h-5 w-5" />
                </button>
              </div>
              <div className="relative">{list}</div>
            </div>
          </div>
        )}
      </>
    );
  }

  // ---------- PC 사이드바: 항상 보이는 입력 ----------
  return (
    <div ref={boxRef} className="relative">
      <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-[1.1rem] w-[1.1rem] -translate-y-1/2 text-ink-faint" />
      <input
        ref={inputRef}
        value={query}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onKeyDown={onKeyDown}
        placeholder="고객 빠르게 찾기"
        aria-label="고객 빠르게 찾기"
        className="h-10 w-full rounded-btn border border-stone-line bg-card-soft pl-9 pr-3 text-sm font-bold text-ink outline-none placeholder:font-normal placeholder:text-ink-faint focus:border-aqua-500 focus:bg-card focus:ring-2 focus:ring-aqua-100"
      />
      {open && list}
    </div>
  );
}
