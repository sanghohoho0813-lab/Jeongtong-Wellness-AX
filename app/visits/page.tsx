"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import PageHeader from "@/components/layout/PageHeader";
import VisitForm from "@/components/visits/VisitForm";
import { BodyPartTags } from "@/components/body-map/BodyMap";
import { useStore } from "@/lib/data/store";
import { formatDateKr, formatRelative } from "@/lib/utils/date";
import { formatKrw } from "@/lib/utils/format";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  FilterChip,
  Modal,
  inputCls,
} from "@/components/ui";
import { PlusIcon, SearchIcon } from "@/components/ui/icons";

type TypeFilter = "all" | "visit" | "consult";

export default function VisitsPage() {
  const { visits, customers, staff } = useStore();
  const [openForm, setOpenForm] = useState(false);
  const [query, setQuery] = useState("");
  const [type, setType] = useState<TypeFilter>("all");

  const customerName = (id: string) =>
    customers.find((c) => c.id === id)?.name ?? "삭제된 고객";
  const staffName = (id?: string) =>
    staff.find((s) => s.id === id)?.name ?? "미지정";

  const rows = useMemo(() => {
    const q = query.trim();
    return [...visits]
      .filter((v) => {
        if (type !== "all" && v.type !== type) return false;
        if (!q) return true;
        return customerName(v.customerId).includes(q);
      })
      .sort((a, b) => b.visitedAt.localeCompare(a.visitedAt))
      .slice(0, 60);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visits, customers, query, type]);

  return (
    <div>
      <PageHeader
        title="방문 / 이용 기록"
        description="방문·상담 기록이 시간순으로 쌓입니다. 기록 시 이용권 차감과 다음 관리일이 함께 처리됩니다."
        action={
          <Button onClick={() => setOpenForm(true)}>
            <PlusIcon className="h-4 w-4" />
            방문 기록
          </Button>
        }
      />

      <Card className="mb-4">
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
      </Card>

      {rows.length === 0 ? (
        <EmptyState
          title="기록이 없습니다"
          description="우측 상단의 방문 기록 버튼으로 첫 기록을 남겨보세요."
        />
      ) : (
        <div className="space-y-2.5">
          {rows.map((v) => (
            <Card key={v.id} className="!py-4">
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={`/customers/${v.customerId}`}
                  className="font-bold text-ink hover:text-aqua-700"
                >
                  {customerName(v.customerId)}
                </Link>
                <Badge tone={v.type === "consult" ? "gold" : "aqua"}>
                  {v.type === "consult" ? "상담" : (v.programName ?? "방문")}
                </Badge>
                <span className="ml-auto nowrap-num text-xs text-ink-sub">
                  {formatDateKr(v.visitedAt)} ({formatRelative(v.visitedAt)})
                </span>
              </div>
              {v.bodyParts.length > 0 && (
                <div className="mt-2">
                  <BodyPartTags records={v.bodyParts} />
                </div>
              )}
              {v.reaction && (
                <p className="mt-2 text-sm text-ink-soft">{v.reaction}</p>
              )}
              <p className="mt-1.5 text-xs text-ink-sub">
                담당 {staffName(v.staffId)}
                {v.amount ? ` · 결제 ${formatKrw(v.amount)}` : ""}
                {v.membershipId ? " · 이용권 차감" : ""}
                {v.nextManageDate
                  ? ` · 다음 관리일 ${formatDateKr(v.nextManageDate)}`
                  : ""}
              </p>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={openForm}
        onClose={() => setOpenForm(false)}
        title="방문 · 상담 기록"
        wide
      >
        <VisitForm
          onCancel={() => setOpenForm(false)}
          onSaved={() => setOpenForm(false)}
        />
      </Modal>
    </div>
  );
}
