"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import VisitForm from "@/components/visits/VisitForm";
import BodyMap, { BodyPartTags } from "@/components/body-map/BodyMap";
import { useStore } from "@/lib/data/store";
import { BodyPartRecord } from "@/lib/types";
import { formatDateKr, formatRelative } from "@/lib/utils/date";
import { formatKrw, formatPhone } from "@/lib/utils/format";
import {
  Badge,
  Button,
  Card,
  CustomerStatusBadge,
  EmptyState,
  Modal,
  ProgressBar,
  SectionTitle,
  inputCls,
} from "@/components/ui";
import { BodyIcon, ChevronLeftIcon, PlusIcon } from "@/components/ui/icons";
import { useToast } from "@/components/ui/toast";

export default function CustomerDetailPage() {
  const params = useParams<{ id: string }>();
  const { derivedById, factsById, staff, updateCustomer } = useStore();
  const toast = useToast();
  const [openVisit, setOpenVisit] = useState(false);
  const [editingParts, setEditingParts] = useState(false);
  const [draftParts, setDraftParts] = useState<BodyPartRecord[]>([]);

  const derived = derivedById.get(params.id);
  const facts = factsById.get(params.id);

  if (!derived || !facts) {
    return (
      <EmptyState
        title="고객을 찾을 수 없습니다"
        description="고객 목록에서 다시 선택해 주세요."
      />
    );
  }

  const c = derived.customer;
  const visits = [...facts.visits].sort((a, b) =>
    b.visitedAt.localeCompare(a.visitedAt),
  );
  const staffName = (id?: string) =>
    staff.find((s) => s.id === id)?.name ?? "미지정";

  const consultNotes = visits.filter((v) => v.reaction).slice(0, 5);

  return (
    <div>
      <Link
        href="/customers"
        className="mb-3 inline-flex items-center gap-1 text-sm font-bold text-ink-sub hover:text-aqua-700"
      >
        <ChevronLeftIcon className="h-4 w-4" />
        고객 목록
      </Link>

      {/* 프로필 헤더 */}
      <Card className="mb-4 lg:mb-5">
        <div className="flex flex-wrap items-center gap-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-aqua-500 to-deep-800 text-xl font-extrabold text-white shadow-[0_4px_12px_rgba(10,46,44,0.25)] sm:h-16 sm:w-16 sm:text-2xl">
            {c.name.slice(0, 1)}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-page-title text-ink">{c.name}</h1>
              <CustomerStatusBadge status={derived.status} />
              {c.tags?.map((t) => (
                <Badge key={t} tone="gold" dot>
                  {t}
                </Badge>
              ))}
            </div>
            <p className="mt-1 text-sm text-ink-sub">
              {formatPhone(c.phone)} · 등록일 {formatDateKr(c.registeredAt)} ·
              담당 {staffName(c.assignedStaffId)}
            </p>
          </div>
          <Button onClick={() => setOpenVisit(true)} size="lg" className="w-full sm:w-auto">
            <PlusIcon className="h-4 w-4" />
            방문 · 상담 기록
          </Button>
        </div>
      </Card>

      <div className="flex flex-col card-gap">
        {/* 상태 요약 */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
          <Card className="min-w-0 !p-4 sm:!p-5">
            <p className="text-[0.8125rem] font-bold text-ink-sub">관리 우선도</p>
            <p className="mt-1.5 nowrap-num text-2xl font-extrabold text-deep-800">
              {derived.priorityScore > 0 ? derived.priorityScore : "—"}
            </p>
            <p className="mt-1 text-xs text-ink-sub">
              {derived.priorityScore > 0 ? "관리 대상" : "정상 관리 중"}
            </p>
          </Card>
          <Card className="min-w-0 !p-4 sm:!p-5">
            <p className="text-[0.8125rem] font-bold text-ink-sub">최근 방문</p>
            <p className="mt-1.5 text-2xl font-extrabold text-ink">
              {formatRelative(derived.lastVisitDate)}
            </p>
            <p className="mt-1 text-xs text-ink-sub">
              {formatDateKr(derived.lastVisitDate)}
            </p>
          </Card>
          <Card className="min-w-0 !p-4 sm:!p-5">
            <p className="text-[0.8125rem] font-bold text-ink-sub">누적 방문</p>
            <p className="mt-1.5 nowrap-num text-2xl font-extrabold text-ink">
              {derived.visitCount}회
            </p>
            {derived.avgCycleDays && (
              <p className="mt-1 nowrap-num text-xs text-ink-sub">
                평균 주기 {derived.avgCycleDays}일
              </p>
            )}
          </Card>
          <Card className="min-w-0 !p-4 sm:!p-5">
            <p className="text-[0.8125rem] font-bold text-ink-sub">
              다음 관리 예정일
            </p>
            <p className="mt-1.5 text-2xl font-extrabold text-ink">
              {formatRelative(c.nextManageDate)}
            </p>
            <input
              type="date"
              className={`${inputCls} mt-1.5 !py-1.5 text-sm`}
              value={c.nextManageDate ?? ""}
              onChange={(e) =>
                updateCustomer(c.id, {
                  nextManageDate: e.target.value || undefined,
                })
              }
              aria-label="다음 관리 예정일 변경"
            />
          </Card>
        </div>

        {/* 우선순위 근거 */}
        {derived.priorityReasons.length > 0 && (
          <div className="card-accent">
            <p className="flex items-center gap-2 text-sm font-extrabold text-deep-800">
              <span className="h-2 w-2 rounded-full bg-aqua-500" />
              AI 관리 포인트
            </p>
            <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-ink-soft">
              {derived.priorityReasons.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="grid grid-cols-1 card-gap xl:grid-cols-2">
          {/* 집중 케어 부위 — 주요 기능 */}
          <div className="card-accent">
            <SectionTitle
              icon={<BodyIcon className="h-4 w-4" />}
              action={
                editingParts ? (
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingParts(false)}
                    >
                      취소
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        updateCustomer(c.id, { focusBodyParts: draftParts });
                        setEditingParts(false);
                        toast(`${c.name} 고객의 집중 케어 부위를 저장했습니다`);
                      }}
                    >
                      저장
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setDraftParts(c.focusBodyParts);
                      setEditingParts(true);
                    }}
                  >
                    부위 수정
                  </Button>
                )
              }
            >
              집중 케어 희망 부위
            </SectionTitle>
            {editingParts ? (
              <BodyMap value={draftParts} onChange={setDraftParts} compactChips />
            ) : (
              <>
                <BodyMap value={c.focusBodyParts} readOnly compactChips />
                <div className="mt-3">
                  <BodyPartTags records={c.focusBodyParts} />
                </div>
              </>
            )}
          </div>

          {/* 이용권 현황 */}
          <Card>
            <SectionTitle>이용권 현황</SectionTitle>
            {facts.memberships.length === 0 ? (
              <p className="rounded-card bg-card-soft py-8 text-center text-sm text-ink-sub">
                등록된 이용권이 없습니다.
              </p>
            ) : (
              <ul className="space-y-4">
                {facts.memberships.map((m) => {
                  const low =
                    m.status === "active" && m.remainingCount <= 2;
                  return (
                    <li
                      key={m.id}
                      className="rounded-card bg-card-soft p-4 ring-1 ring-black/[0.04]"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-extrabold text-ink">
                          {m.programName}
                        </p>
                        <Badge
                          tone={
                            m.status === "active"
                              ? low
                                ? "warn"
                                : "aqua"
                              : "gray"
                          }
                          dot
                        >
                          {m.status === "active"
                            ? `잔여 ${m.remainingCount}회`
                            : "소진"}
                        </Badge>
                      </div>
                      <ProgressBar
                        ratio={m.remainingCount / m.totalCount}
                        tone={low ? "warn" : "aqua"}
                        className="mt-2.5"
                      />
                      <p className="mt-2 nowrap-num text-xs text-ink-sub">
                        {m.remainingCount}/{m.totalCount}회 · {formatKrw(m.price)}{" "}
                        · 구매 {formatDateKr(m.purchasedAt)}
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>

        {/* 최근 상담/메모 */}
        {(consultNotes.length > 0 || c.memo) && (
          <Card>
            <SectionTitle>최근 상담 · 고객 반응</SectionTitle>
            <ul className="space-y-3">
              {c.memo && (
                <li className="rounded-card border border-gold/25 bg-gold-soft/60 p-3.5 text-sm text-ink-soft">
                  <span className="mr-2 font-extrabold text-gold-deep">
                    기본 메모
                  </span>
                  {c.memo}
                </li>
              )}
              {consultNotes.map((v) => (
                <li
                  key={v.id}
                  className="rounded-card bg-card-soft p-3.5 ring-1 ring-black/[0.04]"
                >
                  <p className="text-sm text-ink-soft">{v.reaction}</p>
                  <p className="mt-1 text-xs text-ink-sub">
                    {formatDateKr(v.visitedAt)} ·{" "}
                    {v.type === "consult" ? "상담" : (v.programName ?? "방문")}
                  </p>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {/* 이용 이력 */}
        <Card>
          <SectionTitle>방문 · 이용 이력</SectionTitle>
          {visits.length === 0 ? (
            <p className="rounded-card bg-card-soft py-8 text-center text-sm text-ink-sub">
              아직 방문 기록이 없습니다.
            </p>
          ) : (
            <ol className="relative space-y-4 border-l-2 border-aqua-100 pl-5">
              {visits.map((v) => (
                <li key={v.id} className="relative">
                  <span className="absolute -left-[1.65rem] top-1.5 h-3 w-3 rounded-full bg-gradient-to-br from-aqua-400 to-aqua-600 ring-4 ring-aqua-50" />
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-extrabold text-ink">
                      {v.type === "consult" ? "상담" : (v.programName ?? "방문")}
                    </span>
                    <Badge tone={v.type === "consult" ? "gold" : "aqua"} dot>
                      {v.type === "consult" ? "상담" : "이용"}
                    </Badge>
                    <span className="nowrap-num text-xs text-ink-sub">
                      {formatDateKr(v.visitedAt)}
                    </span>
                  </div>
                  {v.bodyParts.length > 0 && (
                    <div className="mt-1.5">
                      <BodyPartTags records={v.bodyParts} />
                    </div>
                  )}
                  {v.reaction && (
                    <p className="mt-1.5 text-sm text-ink-soft">{v.reaction}</p>
                  )}
                  <p className="mt-1 text-xs text-ink-sub">
                    담당 {staffName(v.staffId)}
                    {v.amount ? ` · 결제 ${formatKrw(v.amount)}` : ""}
                    {v.membershipId ? " · 이용권 차감" : ""}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>

      <Modal
        open={openVisit}
        onClose={() => setOpenVisit(false)}
        title={`${c.name} — 방문 · 상담 기록`}
        wide
      >
        <VisitForm
          customerId={c.id}
          onCancel={() => setOpenVisit(false)}
          onSaved={() => setOpenVisit(false)}
        />
      </Modal>
    </div>
  );
}
