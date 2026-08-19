"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import PageHeader from "@/components/layout/PageHeader";
import CustomerForm from "@/components/customers/CustomerForm";
import { useStore } from "@/lib/data/store";
import { CustomerStatus } from "@/lib/types";
import { formatRelative } from "@/lib/utils/date";
import { displayPhone } from "@/lib/utils/format";
import {
  Badge,
  Button,
  Card,
  CustomerStatusBadge,
  EmptyState,
  Modal,
  SummaryTile,
  inputCls,
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

/** 상태별 아바타 그라데이션 — 목록에서 고객 상태를 색으로 인지 */
const AVATAR_BY_STATUS: Record<CustomerStatus, string> = {
  new: "from-sky-400 to-sky-600",
  active: "from-aqua-400 to-deep-700",
  at_risk: "from-amber-300 to-warn",
  dormant: "from-ink-faint to-ink-sub",
};

/**
 * 관리점수 구간별 표기 — 같은 "우선관리"라도 긴급도를 색으로 구분한다.
 * (점수 계산 로직은 그대로, 표시 구간만 나눈다)
 */
function priorityLevel(score: number) {
  if (score >= 60)
    return {
      label: "AX 우선관리",
      badge: "danger" as const,
      chip: "bg-gradient-to-r from-red-500 to-danger text-white",
    };
  if (score >= 35)
    return {
      label: "AX 관리 대상",
      badge: "warn" as const,
      chip: "bg-gradient-to-r from-amber-400 to-warn text-white",
    };
  return {
    label: "AX 관찰",
    badge: "aqua" as const,
    chip: "bg-gradient-to-r from-aqua-500 to-deep-700 text-white",
  };
}

export default function CustomersPage() {
  const router = useRouter();
  const { derivedById, canSeePhone } = useStore();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<CustomerStatus | "all">("all");
  const [openForm, setOpenForm] = useState(false);

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
        if (!q) return true;
        return (
          d.customer.name.includes(q) ||
          d.customer.phone
            .replace(/\D/g, "")
            .includes(q.replace(/\D/g, "") || " ")
        );
      })
      .sort((a, b) => b.priorityScore - a.priorityScore);
  }, [all, query, status]);

  const priorityCount = rows.filter((d) => d.priorityScore > 0).length;

  return (
    <div>
      <PageHeader
        title="고객"
        description="우선 관리가 필요한 고객부터 표시됩니다. 상태 타일을 눌러 바로 필터링하세요."
        action={
          <Button onClick={() => setOpenForm(true)}>
            <PlusIcon className="h-4 w-4" />
            고객 등록
          </Button>
        }
      />

      {/* 상태 요약 = 필터 */}
      <div className="mb-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-5">
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

      <Card className="mb-4 !py-4">
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-faint" />
            <input
              className={`${inputCls} pl-11`}
              placeholder="고객명 또는 연락처 검색"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          {priorityCount > 0 && (
            <p className="shrink-0 text-sm font-bold text-ink-sub">
              AX 우선관리{" "}
              <span className="nowrap-num text-deep-800 dark:text-aqua-700">{priorityCount}명</span>{" "}
              포함
            </p>
          )}
        </div>
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
            description="검색어나 필터를 변경해 보세요."
          />
        )
      ) : (
        <div className="rise-stagger space-y-2.5">
          {rows.map((d) => (
            <Link
              key={d.customer.id}
              href={`/customers/${d.customer.id}`}
              className="card card-lift row-accent group flex items-center gap-3 !py-3.5 !pl-5 sm:gap-4"
            >
              <span
                className={`icon-pop flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br font-extrabold text-white shadow-sm ${AVATAR_BY_STATUS[d.status]}`}
              >
                {d.customer.name.slice(0, 1)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate font-extrabold text-ink">
                    {d.customer.name}
                  </span>
                  {d.priorityScore > 0 ? (
                    <Badge tone={priorityLevel(d.priorityScore).badge} dot>
                      {priorityLevel(d.priorityScore).label}
                    </Badge>
                  ) : (
                    <CustomerStatusBadge status={d.status} />
                  )}
                </div>
                <p className="mt-0.5 truncate text-sm text-ink-sub">
                  {displayPhone(d.customer.phone, canSeePhone)} · 방문 {d.visitCount}회 · 최근
                  방문 {formatRelative(d.lastVisitDate)}
                </p>
                {/* 시스템이 관리대상으로 판단한 첫 번째 근거 (브리핑과 동일 체계) */}
                {d.priorityScore > 0 && d.priorityReasons[0] && (
                  <p
                    className={`mt-0.5 truncate text-xs font-bold ${
                      d.priorityScore >= 60
                        ? "text-danger"
                        : d.priorityScore >= 35
                          ? "text-warn"
                          : "text-aqua-700"
                    }`}
                  >
                    {d.priorityReasons[0]}
                  </p>
                )}
              </div>
              <div className="hidden shrink-0 text-right sm:block">
                {d.activeMembership ? (
                  <>
                    <p className="nowrap-num text-sm font-bold text-ink-soft">
                      잔여 {d.activeMembership.remainingCount}회
                    </p>
                    <p className="max-w-36 truncate text-xs text-ink-sub">
                      {d.activeMembership.programName}
                    </p>
                  </>
                ) : (
                  <p className="text-xs text-ink-faint">이용권 없음</p>
                )}
              </div>
              {d.priorityScore > 0 && (
                <span
                  className={`nowrap-num hidden shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-extrabold shadow-sm md:inline-flex ${priorityLevel(d.priorityScore).chip}`}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-white/70" />
                  관리점수 {d.priorityScore}
                </span>
              )}
              <ChevronRightIcon className="h-5 w-5 shrink-0 text-ink-faint" />
            </Link>
          ))}
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
