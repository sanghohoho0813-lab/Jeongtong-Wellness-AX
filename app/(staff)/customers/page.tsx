"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import PageHeader from "@/components/layout/PageHeader";
import CustomerForm from "@/components/customers/CustomerForm";
import { useStore } from "@/lib/data/store";
import { CustomerStatus } from "@/lib/types";
import { daysAgo, formatRelative } from "@/lib/utils/date";
import { displayName, displayPhone, phoneDigits } from "@/lib/utils/format";
import { matchesQuery } from "@/lib/utils/hangul";
import {
  Button,
  Card,
  CustomerStatusBadge,
  EmptyState,
  FilterChip,
  Modal,
  OpportunityBadge,
  RecommendBadge,
  SummaryTile,
  inputCls,
  recommendLevel,
} from "@/components/ui";
import { ChevronRightIcon, PlusIcon, SearchIcon } from "@/components/ui/icons";

const STATUS_TILES: Array<{
  key: CustomerStatus | "all";
  label: string;
  tone: "aqua" | "warn" | "danger" | "gray" | "gold" | "sky" | "violet" | "green";
}> = [
  { key: "all", label: "전체 고객", tone: "violet" },
  { key: "new", label: "신규", tone: "sky" },
  { key: "active", label: "활성", tone: "green" },
  { key: "at_risk", label: "관리 필요", tone: "warn" },
  { key: "dormant", label: "장기 미방문", tone: "danger" },
];

/** 폰 필터 칩의 상태 점 색 — 타일과 같은 색 체계를 쓴다 */
const TILE_DOT: Record<string, string> = {
  violet: "bg-violet-500",
  sky: "bg-sky-500",
  green: "bg-positive",
  warn: "bg-warn",
  danger: "bg-danger",
  aqua: "bg-aqua-500",
  gold: "bg-gold",
  gray: "bg-ink-faint",
};

/** 한 번에 그리는 고객 줄 수 — 나머지는 [더 보기]로 이어 그린다 */
const PAGE_SIZE = 60;

type SortKey = "priority" | "recent" | "name" | "visits";

const SORTS: Array<{ key: SortKey; label: string }> = [
  { key: "priority", label: "관리 우선" },
  { key: "recent", label: "최근 방문순" },
  { key: "visits", label: "방문 많은순" },
  { key: "name", label: "이름순" },
];

/** 상태별 아바타 그라데이션 — 목록에서 고객 상태를 색으로 인지 */
const AVATAR_BY_STATUS: Record<CustomerStatus, string> = {
  new: "from-sky-400 to-sky-600",
  active: "from-aqua-400 to-deep-700",
  at_risk: "from-amber-300 to-warn",
  dormant: "from-ink-faint to-ink-sub",
};

export default function CustomersPage() {
  const router = useRouter();
  const { derivedById, opportunityById, canSeePhone, privacyMode } = useStore();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<CustomerStatus | "all">("all");
  const [sort, setSort] = useState<SortKey>("priority");
  const [onlyOpportunity, setOnlyOpportunity] = useState(false);
  const [openForm, setOpenForm] = useState(false);
  /**
   * 한 번에 그리는 줄 수.
   * 고객이 수백 명을 넘어가면 전부 그리느라 화면이 잠깐 멈춘다.
   * 어차피 아래로 한참 내려가며 보지 않으므로 끊어서 그린다.
   */
  const [limit, setLimit] = useState(PAGE_SIZE);

  const all = useMemo(() => [...derivedById.values()], [derivedById]);
  const counts = useMemo(() => {
    const c: Record<string, number> = {
      all: all.length,
      new: 0,
      active: 0,
      at_risk: 0,
      dormant: 0,
    };
    for (const d of all) c[d.status]++;
    return c;
  }, [all]);

  const rows = useMemo(() => {
    const q = query.trim();
    return all
      .filter((d) => {
        if (status !== "all" && d.status !== status) return false;
        if (
          onlyOpportunity &&
          (opportunityById.get(d.customer.id)?.type ?? "none") === "none"
        )
          return false;
        if (!q) return true;
        // 이름은 초성(ㅎㄱㄷ)으로도 찾을 수 있게 한다
        if (matchesQuery(d.customer.name, q)) return true;
        const digits = phoneDigits(q);
        return digits.length >= 2 && phoneDigits(d.customer.phone).includes(digits);
      })
      .sort((a, b) => {
        switch (sort) {
          case "name":
            return a.customer.name.localeCompare(b.customer.name, "ko");
          case "visits":
            return b.visitCount - a.visitCount;
          case "recent":
            // 방문 이력이 없는 고객은 뒤로
            return (b.lastVisitDate ?? "").localeCompare(a.lastVisitDate ?? "");
          default:
            return b.priorityScore - a.priorityScore;
        }
      });
  }, [all, query, status, sort, onlyOpportunity, opportunityById]);

  // 검색·필터·정렬이 바뀌면 다시 처음부터 보여 준다
  useEffect(() => setLimit(PAGE_SIZE), [query, status, sort, onlyOpportunity]);

  const visibleRows = rows.slice(0, limit);
  const priorityCount = rows.filter((d) => d.priorityScore > 0).length;
  // AX 매출기회 대상 — 전체 고객 기준 (필터와 무관하게 항상 같은 수)
  const opportunityCount = all.filter(
    (d) => (opportunityById.get(d.customer.id)?.type ?? "none") !== "none",
  ).length;

  return (
    <div>
      <PageHeader
        title="고객"
        description="우선 관리가 필요한 고객부터 보여 드립니다."
        action={
          <Button onClick={() => setOpenForm(true)}>
            <PlusIcon className="h-4 w-4" />
            고객 등록
          </Button>
        }
      />

      {/*
        상태 요약 = 필터.

        폰에서는 타일 다섯 장이 화면의 3분의 1을 먹어서, 정작 고객 목록이
        첫 화면 밖으로 밀려났다. 고객 화면에 들어오는 이유는 고객을 찾기
        위해서다. 그래서 폰에서는 옆으로 넘기는 칩 한 줄로 줄이고,
        자리가 넉넉한 태블릿·PC 에서만 타일로 보여 준다.
      */}
      <div
        data-tour="customer-tiles"
        className="no-scrollbar -mx-4 mb-3 flex gap-2 overflow-x-auto px-4 sm:hidden"
      >
        {STATUS_TILES.map((t) => {
          const on = status === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setStatus(t.key)}
              aria-pressed={on}
              className={`touch-target nowrap-num inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 text-sm font-bold transition-colors ${
                on
                  ? "bg-sel text-sel-ink shadow-sm"
                  : "bg-card text-ink-sub ring-1 ring-stone-line"
              }`}
            >
              <span className={`h-2 w-2 shrink-0 rounded-full ${on ? "bg-white/80" : TILE_DOT[t.tone]}`} />
              {t.label}
              <span className={on ? "font-extrabold" : "font-extrabold text-ink"}>
                {counts[t.key]}
              </span>
            </button>
          );
        })}
      </div>
      <div className="mb-4 hidden gap-2.5 sm:grid sm:grid-cols-3 sm:gap-3 lg:grid-cols-5">
        {STATUS_TILES.map((t) => (
          <SummaryTile
            key={t.key}
            label={t.label}
            value={counts[t.key]}
            tone={t.tone}
            active={status === t.key}
            onClick={() => setStatus(t.key)}
          />
        ))}
      </div>

      {/*
        검색 · 정렬.
        정렬 칩 넷이 폰에서 두 줄로 접히며 카드가 화면 절반까지 커졌다.
        옆으로 넘기는 한 줄로 바꾸고, 두 군데로 흩어져 있던 숫자
        (AI 추천 n명 / n명)를 한 줄로 합쳤다.
      */}
      <Card className="mb-3 !py-3.5 lg:mb-4">
        <div className="relative">
          <SearchIcon className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-faint" />
          <input
            className={`${inputCls} pl-11`}
            aria-label="고객 검색"
            placeholder="고객명 · 초성 · 연락처 검색"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {/* 정렬 · 매출기회 — 폰에서는 한 줄로 두고 옆으로 넘긴다 */}
        <div className="mt-2.5 flex items-center gap-2 border-t border-stone-line pt-2.5">
          <span className="shrink-0 text-xs font-extrabold uppercase tracking-wider text-ink-faint">
            정렬
          </span>
          <div className="no-scrollbar flex flex-1 gap-2 overflow-x-auto">
            {SORTS.map((sopt) => (
              <FilterChip
                key={sopt.key}
                active={sort === sopt.key}
                onClick={() => setSort(sopt.key)}
              >
                <span className="whitespace-nowrap">{sopt.label}</span>
              </FilterChip>
            ))}
            {opportunityCount > 0 && (
              <button
                onClick={() => setOnlyOpportunity((v) => !v)}
                aria-pressed={onlyOpportunity}
                className={`touch-target nowrap-num inline-flex shrink-0 items-center rounded-full px-4 text-sm font-bold transition-colors ${
                  onlyOpportunity
                    ? "bg-gradient-to-r from-gold to-gold-deep text-white shadow-sm"
                    : "bg-gold-soft text-gold-deep ring-1 ring-gold/25 hover:bg-gold/20"
                }`}
              >
                매출기회 {opportunityCount}
              </button>
            )}
          </div>
        </div>
        <p className="nowrap-num mt-2 text-[0.8125rem] font-bold text-ink-sub">
          {rows.length}명 표시
          {priorityCount > 0 && (
            <>
              {" · "}
              <span className="text-deep-800 dark:text-aqua-700">
                AI 추천 {priorityCount}명
              </span>
            </>
          )}
        </p>
      </Card>

      {rows.length === 0 ? (
        all.length === 0 ? (
          <EmptyState
            title="등록된 고객이 없습니다"
            description="첫 고객을 등록하면 방문 기록과 재방문 관리가 시작됩니다."
            action={
              <Button onClick={() => setOpenForm(true)}>
                <PlusIcon className="h-4 w-4" />
                첫 고객 등록
              </Button>
            }
          />
        ) : (
          <EmptyState
            title="조건에 맞는 고객이 없습니다"
            description={
              onlyOpportunity
                ? "지금 매출기회로 볼 만한 고객이 없습니다. 매출기회 필터를 해제해 보세요."
                : "검색어나 필터를 변경해 보세요."
            }
          />
        )
      ) : (
        <div className="rise-stagger space-y-2.5">
          {visibleRows.map((d) => (
            <Link
              key={d.customer.id}
              data-tour="customer-row"
              href={`/customers/${d.customer.id}`}
              className="card card-lift row-accent group flex items-center gap-3 !py-3.5 !pl-5 sm:gap-4"
            >
              <span
                className={`icon-pop flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br font-extrabold text-white shadow-sm ${AVATAR_BY_STATUS[d.status]}`}
              >
                {d.customer.name.slice(0, 1)}
              </span>
              {/*
                한 줄에 배지를 넷씩 늘어놓았더니 폰에서 세 줄로 접히면서
                연락처가 '010-1…' 로 잘려 아무 쓸모가 없었다.
                이제는 이름 옆에 상태 하나만 두고, AI 추천·매출기회 표시는
                아래 '왜 챙겨야 하는지' 한 줄과 같은 줄에 붙인다.
                연락처는 좁은 화면에서 감춘다 — 목록에서 하는 일은
                번호를 읽는 게 아니라 사람을 고르는 것이다.
              */}
              <div className="min-w-0 flex-1">
                {/*
                  이름이 먼저다. 다만 이름 쪽을 shrink-0 으로 못 박아 두었더니
                  아주 긴 이름에서는 상태 배지가 화면 밖으로 밀려 아예 보이지
                  않았다 — 이름을 지키려다 '이 사람이 어떤 상태인지'를 잃은 셈.
                  이름은 줄바꿈으로 온전히 남기고(자르지 않는다), 배지는
                  줄어들지 않게 둔다. 두 정보 다 살아남는다.
                */}
                <div className="flex items-center gap-2">
                  <span className="min-w-0 break-words text-[1.0625rem] font-extrabold text-ink">
                    {displayName(d.customer.name, privacyMode)}
                  </span>
                  <span className="shrink-0">
                    <CustomerStatusBadge status={d.status} />
                  </span>
                </div>
                <p className="tabular mt-0.5 line-clamp-2 text-[0.875rem] leading-snug text-ink-sub">
                  방문 {d.visitCount}회 · 최근 {formatRelative(d.lastVisitDate)}
                  <span className="hidden sm:inline">
                    {" · "}
                    {displayPhone(d.customer.phone, canSeePhone)}
                  </span>
                </p>
                {/*
                  이용권 잔여 · 다음 관리 예정일.

                  이 둘은 "누구를 먼저 챙기지" 를 정하는 데 실제로 쓰는 값인데,
                  잔여는 넓은 화면에만 있었고 예정일은 어느 폭에서도 없었다.
                  목록에서 못 보면 한 명씩 열어 보게 된다. 글자를 늘리지 않도록
                  라벨 없이 값만, 한 줄로 둔다.
                */}
                <p className="tabular mt-0.5 text-[0.875rem] font-bold leading-snug">
                  <span
                    className={
                      d.activeMembership && d.activeMembership.remainingCount <= 2
                        ? "text-gold-deep"
                        : "text-ink-soft"
                    }
                  >
                    {d.activeMembership
                      ? `이용권 ${d.activeMembership.remainingCount}/${d.activeMembership.totalCount}회`
                      : "이용권 없음"}
                  </span>
                  <span className="text-ink-faint"> · </span>
                  <span
                    className={
                      d.customer.nextManageDate &&
                      daysAgo(d.customer.nextManageDate) >= 0
                        ? "text-danger-text"
                        : "text-ink-soft"
                    }
                  >
                    {/* 목록에서는 연도까지 필요 없다 — 줄을 하나로 유지한다 */}
                    {d.customer.nextManageDate
                      ? `예정일 ${d.customer.nextManageDate.slice(5).replace("-", ".")}`
                      : "예정일 미정"}
                  </span>
                </p>
                {(() => {
                  const opp = opportunityById.get(d.customer.id);
                  const hasOpp = opp && opp.type !== "none";
                  const reason = d.priorityScore > 0 ? d.priorityReasons[0] : "";
                  if (!hasOpp && !reason) return null;
                  return (
                    <>
                      {(d.priorityScore > 0 || hasOpp) && (
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          {d.priorityScore > 0 && (
                            <RecommendBadge score={d.priorityScore} compact />
                          )}
                          {hasOpp && (
                            <OpportunityBadge opportunity={opp} size="sm" />
                          )}
                        </div>
                      )}
                      {/*
                        왜 챙겨야 하는지는 줄을 따로 준다.
                        배지와 같은 줄에 두었더니 배지가 자리를 다 먹어
                        "등록 12…" 처럼 첫 글자만 남는 일이 잦았다.
                      */}
                      {reason && (
                        <p
                          className={`mt-0.5 line-clamp-2 text-[0.8125rem] font-bold leading-snug ${recommendLevel(d.priorityScore).text}`}
                        >
                          {reason}
                        </p>
                      )}
                    </>
                  );
                })()}
              </div>
              {/* 잔여 회차는 이제 왼쪽 줄에 늘 나오므로, 여기는 어떤 이용권인지만 */}
              {d.activeMembership && (
                <p className="hidden max-w-36 shrink-0 truncate text-right text-xs text-ink-sub sm:block">
                  {d.activeMembership.programName}
                </p>
              )}
              <ChevronRightIcon className="h-5 w-5 shrink-0 text-ink-faint" />
            </Link>
          ))}

          {rows.length > visibleRows.length && (
            <div className="pt-1 text-center">
              <p className="mb-2 text-sm leading-relaxed text-ink-sub">
                <span className="nowrap-num">
                  {rows.length}명 중 {visibleRows.length}명
                </span>{" "}
                표시 중
              </p>
              <Button
                variant="secondary"
                onClick={() => setLimit((n) => n + PAGE_SIZE)}
              >
                더 보기 ({Math.min(PAGE_SIZE, rows.length - visibleRows.length)}명)
              </Button>
            </div>
          )}
        </div>
      )}

      <Modal
        open={openForm}
        onClose={() => setOpenForm(false)}
        title="신규 고객 등록"
        wide
      >
        <CustomerForm
          onCancel={() => setOpenForm(false)}
          onSaved={(id) => {
            setOpenForm(false);
            router.push(`/customers/${id}`);
          }}
        />
      </Modal>
    </div>
  );
}
