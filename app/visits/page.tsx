"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import PageHeader from "@/components/layout/PageHeader";
import VisitForm from "@/components/visits/VisitForm";
import { BodyPartTags } from "@/components/body-map/BodyMap";
import { useStore } from "@/lib/data/store";
import { daysAgo, formatDateKr, formatRelative, todayISO } from "@/lib/utils/date";
import { displayName, formatKrw } from "@/lib/utils/format";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  FilterChip,
  Modal,
  SummaryTile,
  inputCls,
} from "@/components/ui";
import { PlusIcon, SearchIcon } from "@/components/ui/icons";
import { useToast } from "@/components/ui/toast";
import { Visit } from "@/lib/types";

type TypeFilter = "all" | "visit" | "consult";
type PeriodFilter = "all" | "7" | "30" | "90";

const PERIODS: Array<{ key: PeriodFilter; label: string }> = [
  { key: "7", label: "최근 7일" },
  { key: "30", label: "최근 30일" },
  { key: "90", label: "최근 90일" },
  { key: "all", label: "전체 기간" },
];

/**
 * 프로그램별 색 — 기록 목록에서 어떤 케어였는지 색으로 구분.
 * (상담은 골드, 미등록 프로그램은 아쿠아 기본)
 */
function programStyle(programName?: string, isConsult?: boolean) {
  if (isConsult)
    return { strip: "from-gold to-gold-deep", badge: "gold" as const };
  if (programName?.includes("딥 릴랙스"))
    return { strip: "from-violet-400 to-violet-600", badge: "violet" as const };
  if (programName?.includes("반신"))
    return { strip: "from-sky-400 to-sky-600", badge: "sky" as const };
  if (programName?.includes("베이직"))
    return { strip: "from-aqua-400 to-aqua-600", badge: "aqua" as const };
  return { strip: "from-emerald-400 to-emerald-600", badge: "positive" as const };
}

export default function VisitsPage() {
  const { visits, customers, staff, removeVisit, restoreVisit, privacyMode } = useStore();
  const toast = useToast();
  const [openForm, setOpenForm] = useState(false);
  const [editingVisit, setEditingVisit] = useState<Visit | undefined>();
  const [confirmDelete, setConfirmDelete] = useState<Visit | undefined>();
  const [query, setQuery] = useState("");
  const [type, setType] = useState<TypeFilter>("all");
  const [period, setPeriod] = useState<PeriodFilter>("30");
  const [staffFilter, setStaffFilter] = useState<string>("all");

  const customerName = (id: string) =>
    customers.find((c) => c.id === id)?.name ?? "삭제된 고객";
  const staffName = (id?: string) =>
    staff.find((s) => s.id === id)?.name ?? "미지정";

  const rows = useMemo(() => {
    const q = query.trim();
    return [...visits]
      .filter((v) => {
        if (type !== "all" && v.type !== type) return false;
        if (period !== "all" && daysAgo(v.visitedAt) > Number(period))
          return false;
        if (staffFilter !== "all" && (v.staffId ?? "") !== staffFilter)
          return false;
        if (!q) return true;
        return customerName(v.customerId).includes(q);
      })
      .sort((a, b) => b.visitedAt.localeCompare(a.visitedAt))
      .slice(0, 80);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visits, customers, query, type, period, staffFilter]);

  return (
    <div>
      <PageHeader
        title="방문 / 이용 기록"
        description="방문·상담 기록이 시간순으로 쌓입니다."
        action={
          <Button
            onClick={() => {
              setEditingVisit(undefined);
              setOpenForm(true);
            }}
          >
            <PlusIcon className="h-4 w-4" />
            방문 기록
          </Button>
        }
      />

      {(() => {
        const today = todayISO();
        const todayVisits = visits.filter(
          (v) => v.type === "visit" && v.visitedAt.slice(0, 10) === today,
        ).length;
        const todayConsults = visits.filter(
          (v) => v.type === "consult" && v.visitedAt.slice(0, 10) === today,
        ).length;
        const week = visits.filter(
          (v) => v.type === "visit" && daysAgo(v.visitedAt) <= 7,
        ).length;
        const withParts = visits.filter(
          (v) => daysAgo(v.visitedAt) <= 7 && v.bodyParts.length > 0,
        ).length;
        return (
          <div className="rise-stagger mb-4 grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
            <SummaryTile label="오늘 방문" value={todayVisits} unit="건" tone="aqua" />
            <SummaryTile label="오늘 상담" value={todayConsults} unit="건" tone="gold" />
            <SummaryTile label="최근 7일 방문" value={week} unit="건" tone="sky" />
            <SummaryTile
              label="7일 내 부위 기록"
              value={withParts}
              unit="건"
              tone="violet"
            />
          </div>
        );
      })()}

      <Card className="mb-4 !py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-faint" />
            <input
              className={`${inputCls} pl-11`}
              placeholder="고객명 검색"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            {(
              [
                { key: "all", label: "전체" },
                { key: "visit", label: "방문 · 이용" },
                { key: "consult", label: "상담" },
              ] as const
            ).map((f) => (
              <FilterChip
                key={f.key}
                active={type === f.key}
                onClick={() => setType(f.key)}
              >
                {f.label}
              </FilterChip>
            ))}
          </div>
        </div>

        {/* 기간 · 담당 직원 */}
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-stone-line pt-3">
          <span className="text-xs font-extrabold uppercase tracking-wider text-ink-faint">
            기간
          </span>
          {PERIODS.map((f) => (
            <FilterChip
              key={f.key}
              active={period === f.key}
              onClick={() => setPeriod(f.key)}
            >
              {f.label}
            </FilterChip>
          ))}
          <span className="ml-2 text-xs font-extrabold uppercase tracking-wider text-ink-faint">
            담당
          </span>
          <FilterChip
            active={staffFilter === "all"}
            onClick={() => setStaffFilter("all")}
          >
            전체
          </FilterChip>
          {staff
            .filter((st) => st.active)
            .map((st) => (
              <FilterChip
                key={st.id}
                active={staffFilter === st.id}
                onClick={() => setStaffFilter(st.id)}
              >
                {st.name}
              </FilterChip>
            ))}
          <span className="nowrap-num ml-auto text-sm font-bold text-ink-sub">
            {rows.length}건
          </span>
        </div>
      </Card>

      {rows.length === 0 ? (
        visits.length === 0 ? (
          <EmptyState
            title="기록이 없습니다"
            description="우측 상단의 방문 기록 버튼으로 첫 기록을 남겨보세요."
          />
        ) : (
          <EmptyState
            title="조건에 맞는 기록이 없습니다"
            description="기간이나 담당 직원 필터를 넓혀 보세요."
            action={
              <Button
                variant="secondary"
                onClick={() => {
                  setPeriod("all");
                  setStaffFilter("all");
                  setType("all");
                  setQuery("");
                }}
              >
                필터 초기화
              </Button>
            }
          />
        )
      ) : (
        <div className="rise-stagger space-y-2.5">
          {rows.map((v) => {
            const st = programStyle(v.programName, v.type === "consult");
            return (
            <Card key={v.id} className="relative overflow-hidden !py-4 !pl-5">
              <span
                className={`absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b ${st.strip}`}
              />
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={`/customers/${v.customerId}`}
                  className="tap-line font-bold text-ink hover:text-aqua-700"
                >
                  {displayName(customerName(v.customerId), privacyMode)}
                </Link>
                <Badge tone={st.badge} dot>
                  {v.type === "consult" ? "상담" : (v.programName ?? "방문")}
                </Badge>
              </div>
              {/* 날짜는 아래 줄로 — 이름·프로그램과 한 줄에 두면 폰에서 늘 줄이 넘친다 */}
              <p className="nowrap-num mt-0.5 text-[0.8125rem] font-bold text-ink-soft">
                {formatDateKr(v.visitedAt)} ({formatRelative(v.visitedAt)})
              </p>
              {v.bodyParts.length > 0 && (
                <div className="mt-2">
                  <BodyPartTags records={v.bodyParts} />
                </div>
              )}
              {v.reaction && (
                <p className="mt-2 text-sm text-ink-soft">{v.reaction}</p>
              )}
              {/*
                담당·결제 정보는 한 줄로, [수정]·[삭제]는 그 아래 오른쪽에.
                한 줄에 섞어 두면 좁은 화면에서 글이 길어질 때마다 단추가
                제멋대로 다음 줄로 밀려나 위치가 매번 달라진다.
              */}
              <p className="mt-1.5 text-[0.8125rem] text-ink-sub">
                담당 {staffName(v.staffId)}
                {v.amount ? ` · 결제 ${formatKrw(v.amount)}` : ""}
                {v.membershipId ? " · 이용권 차감" : ""}
                {v.nextManageDate
                  ? ` · 다음 관리일 ${formatDateKr(v.nextManageDate)}`
                  : ""}
              </p>
              <div className="-mb-1.5 mt-0.5 flex items-center justify-end gap-1.5">
                <button
                  onClick={() => {
                    setEditingVisit(v);
                    setOpenForm(true);
                  }}
                  className="touch-target inline-flex shrink-0 items-center rounded-full px-4 text-sm font-bold text-ink-sub ring-1 ring-stone-line transition-colors hover:bg-aqua-50 hover:text-aqua-800"
                >
                  수정
                </button>
                <button
                  onClick={() => setConfirmDelete(v)}
                  className="touch-target inline-flex shrink-0 items-center rounded-full px-4 text-sm font-bold text-ink-faint transition-colors hover:text-danger-text"
                >
                  삭제
                </button>
              </div>
            </Card>
            );
          })}
        </div>
      )}

      <Modal
        open={openForm}
        onClose={() => setOpenForm(false)}
        title={editingVisit ? "방문 · 상담 기록 수정" : "방문 · 상담 기록"}
        wide
      >
        <VisitForm
          visit={editingVisit}
          onCancel={() => setOpenForm(false)}
          onSaved={() => {
            setOpenForm(false);
            setEditingVisit(undefined);
          }}
        />
      </Modal>

      {/* 삭제 확인 */}
      <Modal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(undefined)}
        title="방문 기록 삭제"
      >
        <p className="text-[0.9375rem] leading-relaxed text-ink-soft">
          {confirmDelete && customerName(confirmDelete.customerId)} 고객의{" "}
          {confirmDelete && formatDateKr(confirmDelete.visitedAt)} 기록을
          삭제합니다.
          {confirmDelete?.membershipId
            ? " 이 기록에서 차감된 이용권 1회는 다시 되돌아갑니다."
            : ""}{" "}
          잘못 누르셨다면 삭제 직후 뜨는 <b>되돌리기</b>로 복구할 수 있습니다.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirmDelete(undefined)}>
            취소
          </Button>
          <Button
            variant="danger-ghost"
            onClick={() => {
              if (!confirmDelete) return;
              const removed = removeVisit(confirmDelete.id);
              toast(
                `${customerName(confirmDelete.customerId)} 고객의 방문 기록을 삭제했습니다`,
                "info",
                removed
                  ? { label: "되돌리기", onAction: () => restoreVisit(removed) }
                  : undefined,
              );
              setConfirmDelete(undefined);
            }}
          >
            삭제
          </Button>
        </div>
      </Modal>
    </div>
  );
}
