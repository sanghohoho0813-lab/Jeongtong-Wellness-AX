"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import VisitForm from "@/components/visits/VisitForm";
import BodyMap, { BodyPartTags } from "@/components/body-map/BodyMap";
import { useStore } from "@/lib/data/store";
import { BodyPartRecord, Membership, Visit } from "@/lib/types";
import {
  formatDateKr,
  formatDateTimeKr,
  formatRelative,
} from "@/lib/utils/date";
import { displayName, displayPhone, formatKrw } from "@/lib/utils/format";
import {
  Badge,
  Button,
  Card,
  CustomerStatusBadge,
  EmptyState,
  Modal,
  OpportunityBadge,
  ProgressBar,
  SectionTitle,
  recommendLevel,
} from "@/components/ui";
import {
  BodyIcon,
  BookIcon,
  CalendarIcon,
  ChevronLeftIcon,
  PlusIcon,
  SparkIcon,
} from "@/components/ui/icons";
import TaskCard from "@/components/briefing/TaskCard";
import { DateTimePanel } from "@/components/ui/DateTimeField";
import { useToast } from "@/components/ui/toast";
import {
  buildCustomerInsight,
  recommendNextManageDate,
} from "@/lib/scoring/insight";
import CarePreferenceCard from "@/components/customers/CarePreferenceCard";
import CustomerForm from "@/components/customers/CustomerForm";
import MembershipForm from "@/components/customers/MembershipForm";
import CareReport from "@/components/customers/CareReport";
import CustomerVoiceCard from "@/components/customers/CustomerVoiceCard";
import { PREFERENCE_CATEGORY_LABELS } from "@/lib/types";

export default function CustomerDetailPage() {
  const params = useParams<{ id: string }>();
  const {
    derivedById,
    factsById,
    opportunityById,
    staff,
    updateCustomer,
    updateMembership,
    removeMembership,
    restoreMembership,
    removeVisit,
    restoreVisit,
    briefingTasks,
    settings,
    canSeePhone, privacyMode } = useStore();
  const toast = useToast();
  const [openVisit, setOpenVisit] = useState(false);
  const [editingVisit, setEditingVisit] = useState<Visit | undefined>();
  const [confirmDeleteV, setConfirmDeleteV] = useState<Visit | undefined>();
  const [openSchedule, setOpenSchedule] = useState(false);
  const [openProfile, setOpenProfile] = useState(false);
  const [openReport, setOpenReport] = useState(false);
  const [openMembership, setOpenMembership] = useState(false);
  const [editingMembership, setEditingMembership] = useState<
    Membership | undefined
  >();
  const [confirmDeleteM, setConfirmDeleteM] = useState<string | undefined>();
  const [editingParts, setEditingParts] = useState(false);
  const [draftParts, setDraftParts] = useState<BodyPartRecord[]>([]);
  /** AX Insight 판단 근거를 다 펼쳤는지 (기본은 핵심 3개만) */
  const [reasonsOpen, setReasonsOpen] = useState(false);

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

  // AX Insight — 실행 브리핑과 동일한 근거/권장행동을 재사용
  const task = briefingTasks.find((t) => t.customerId === c.id);
  const insight = buildCustomerInsight(derived, task, settings.careRules);
  // 다음 관리 예정일 선택 시 함께 제시하는 추천일 (방문 폼과 동일 기준)
  const recommendation = recommendNextManageDate(facts, settings.careRules);
  // AX 매출기회 — Priority Score 와 별개로 계산된 파생 판정
  const opportunity = opportunityById.get(c.id);

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
            {displayName(c.name, privacyMode).slice(0, 1)}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-page-title text-ink">
                {displayName(c.name, privacyMode)}
              </h1>
              <CustomerStatusBadge status={derived.status} />
              {c.tags?.map((t) => (
                <Badge key={t} tone="gold" dot>
                  {t}
                </Badge>
              ))}
            </div>
            <p className="mt-1 text-sm text-ink-sub">
              {displayPhone(c.phone, canSeePhone)}
              {c.ageGroup ? ` · ${c.ageGroup}` : ""} · 등록일{" "}
              {formatDateKr(c.registeredAt)} · 담당{" "}
              {staffName(c.assignedStaffId)}
            </p>
          </div>
          {/*
            여기서 할 일은 대부분 '방문 기록'이다.
            셋 다 같은 크기로 세로로 쌓아 두었더니 폰에서 화면 절반이
            단추 밭이 되고, 정작 어느 것을 눌러야 하는지도 흐릿했다.
            주 동작 하나만 크게 두고 나머지 둘은 그 아래 한 줄로 나눈다.
          */}
          <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto">
            <Button
              dataTour="visit-record"
              onClick={() => {
                setEditingVisit(undefined);
                setOpenVisit(true);
              }}
              size="lg"
              className="w-full sm:w-auto"
            >
              <PlusIcon className="h-4 w-4" />
              방문 · 상담 기록
            </Button>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                onClick={() => setOpenReport(true)}
                dataTour="care-report"
                className="flex-1 sm:flex-none"
              >
                <BookIcon className="h-4 w-4" />
                케어 리포트
              </Button>
              <Button
                variant="secondary"
                onClick={() => setOpenProfile(true)}
                className="flex-1 sm:flex-none"
              >
                정보 수정
              </Button>
            </div>
          </div>
        </div>
      </Card>

      <div className="flex flex-col card-gap">
        {/* 상태 요약 — 최근 방문 → 다음 관리일 → 이용권 잔여 → 우선도 순 */}
        <div className="rise-stagger grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
          <Card className="relative min-w-0 overflow-hidden !p-4 sm:!p-5">
            <span className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-sky-400 to-sky-600" />
            <p className="text-[0.8125rem] font-bold text-ink-sub">최근 방문</p>
            <p className="mt-1.5 text-2xl font-extrabold text-ink">
              {formatRelative(derived.lastVisitDate)}
            </p>
            <p className="mt-1 nowrap-num text-xs text-ink-sub">
              누적 {derived.visitCount}회
              {derived.avgCycleDays ? ` · 평균 주기 ${derived.avgCycleDays}일` : ""}
            </p>
          </Card>
          <Card
            dataTour="next-manage"
            className={`relative min-w-0 overflow-hidden !p-4 sm:!p-5 ${derived.priorityScore > 0 ? "!bg-gradient-to-br !from-aqua-50 !to-card ring-1 ring-aqua-200/50" : ""}`}
          >
            <span className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-aqua-400 to-deep-700" />
            <p className="text-[0.8125rem] font-bold text-ink-sub">
              다음 관리 예정일
            </p>
            <p className="mt-1.5 text-2xl font-extrabold text-deep-800 dark:text-aqua-700">
              {formatRelative(c.nextManageDate)}
            </p>
            <p className="tabular mt-1 text-xs leading-snug text-ink-sub">
              {c.nextManageDate
                ? formatDateTimeKr(c.nextManageDate, c.nextManageTime)
                : "예정일 미정"}
            </p>
            <button
              type="button"
              onClick={() => setOpenSchedule(true)}
              className="touch-target mt-2 flex w-full items-center justify-center gap-1.5 rounded-btn bg-card px-3 py-2 text-sm font-bold text-aqua-800 ring-1 ring-aqua-100 transition-colors hover:bg-aqua-50"
            >
              <CalendarIcon className="h-4 w-4" />
              날짜 · 시간 선택
            </button>
          </Card>
          <Card
            className="relative min-w-0 overflow-hidden !p-4 sm:!p-5"
            onClick={() =>
              document
                .querySelector('[data-tour="memberships"]')
                ?.scrollIntoView({ behavior: "smooth", block: "center" })
            }
          >
            <span className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-gold to-gold-deep" />
            <p className="text-[0.8125rem] font-bold text-ink-sub">이용권 잔여</p>
            {derived.activeMembership ? (
              <>
                <p className="mt-1.5 nowrap-num text-2xl font-extrabold text-ink">
                  {derived.activeMembership.remainingCount}
                  <span className="text-base font-bold text-ink-sub">
                    /{derived.activeMembership.totalCount}회
                  </span>
                </p>
                <p className="mt-1 truncate text-xs text-ink-sub">
                  {derived.activeMembership.programName}
                </p>
              </>
            ) : (
              <>
                <p className="mt-1.5 text-2xl font-extrabold text-ink-faint">
                  없음
                </p>
                <p className="mt-1 text-xs font-bold text-gold-deep">
                  눌러서 이용권 등록
                </p>
              </>
            )}
          </Card>
          <Card className="relative min-w-0 overflow-hidden !p-4 sm:!p-5">
            <span
              className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${derived.priorityScore > 0 ? "from-amber-300 to-warn" : "from-emerald-300 to-positive"}`}
            />
            <p className="text-[0.8125rem] font-bold text-ink-sub">AI 추천</p>
            <p
              className={`mt-1.5 truncate text-2xl font-extrabold ${
                derived.priorityScore > 0
                  ? recommendLevel(derived.priorityScore).text
                  : "text-positive-text"
              }`}
            >
              {derived.priorityScore > 0
                ? recommendLevel(derived.priorityScore).short
                : "정상"}
            </p>
            <p className="mt-1 text-xs text-ink-sub">
              {derived.priorityScore > 0 ? "관리 대상" : "정상 관리 중"}
            </p>
          </Card>
        </div>

        {/* AX INSIGHT — 브리핑과 동일한 판단근거·권장행동 체계를 재사용 */}
        <div data-tour="ax-insight" className="card-accent">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="flex items-center gap-2 text-[0.8125rem] font-extrabold uppercase tracking-wider text-deep-800 dark:text-aqua-700">
              <span
                className={`h-2 w-2 rounded-full ${insight.attention ? "bg-aqua-500" : "bg-positive"}`}
              />
              AX Insight
            </p>
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge tone={insight.attention ? "aqua" : "positive"} dot>
                {insight.attention ? "AI 추천 · 관리 대상" : "정상 관리군"}
              </Badge>
              {opportunity && opportunity.type !== "none" && (
                <OpportunityBadge opportunity={opportunity} />
              )}
            </div>
          </div>

          {/*
            관리상태 — 지금 챙겨야 하는 이유 (Priority 기준).

            근거를 전부 펼쳐 두면 무엇이 핵심인지 흐려진다. 판단을 뒤집을
            만한 것은 대개 위의 두세 줄이고, 나머지는 확인하고 싶을 때만
            본다. 그래서 셋까지만 펼치고 나머지는 눌러서 편다.
          */}
          <p className="mt-3 text-[0.7rem] font-extrabold uppercase tracking-wider text-ink-faint">
            관리상태
          </p>
          <ul className="mt-1 space-y-1">
            {(reasonsOpen ? insight.reasons : insight.reasons.slice(0, 3)).map(
              (r, i) => (
                <li
                  key={i}
                  className="flex items-start gap-1.5 text-sm leading-relaxed text-ink-soft"
                >
                  <span className="mt-[0.45rem] h-1 w-1 shrink-0 rounded-full bg-aqua-400" />
                  {r}
                </li>
              ),
            )}
          </ul>
          {insight.reasons.length > 3 && (
            <button
              type="button"
              onClick={() => setReasonsOpen((v) => !v)}
              aria-expanded={reasonsOpen}
              className="tap-line mt-1 text-[0.8125rem] font-bold text-aqua-700"
            >
              {reasonsOpen
                ? "판단 근거 접기"
                : `판단 근거 ${insight.reasons.length - 3}개 더 보기`}
            </button>
          )}

          {/* 매출기회 — 관리하면 기존 매출로 이어질 수 있는 근거 */}
          {opportunity && opportunity.type !== "none" && (
            <>
              <p className="mt-3 text-[0.7rem] font-extrabold uppercase tracking-wider text-gold-deep">
                매출기회 · {opportunity.label}
              </p>
              <ul className="mt-1 space-y-1">
                {opportunity.reasons.map((r, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-1.5 text-sm leading-relaxed text-ink-soft"
                  >
                    <span className="mt-[0.45rem] h-1 w-1 shrink-0 rounded-full bg-gold" />
                    {r}
                  </li>
                ))}
              </ul>
            </>
          )}

          {/* 권장 실행 — 관리 권장행동 + (있으면) 매출기회 권장행동 */}
          <p className="mt-3 text-[0.7rem] font-extrabold uppercase tracking-wider text-ink-faint">
            권장 실행
          </p>
          <p className="mt-1 text-sm font-bold text-aqua-700">
            → {insight.recommendation}
          </p>
          {opportunity && opportunity.type !== "none" && (
            <p className="mt-0.5 text-sm font-bold text-gold-deep">
              → {opportunity.action}
            </p>
          )}
        </div>

        {/*
          지금 이 고객에게 할 일.

          여태 이 화면은 브리핑이 만든 과제를 찾아 두고도 그 문장만 위
          AX Insight 에 빌려 쓰고, 정작 처리는 브리핑 화면으로 나가야 했다.
          한 고객을 열어 놓고 "그래서 지금 뭘 하지" 를 묻는 자리가 바로
          여기인데, 답은 다른 화면에 있었던 셈이다.

          브리핑과 **같은 카드**를 그대로 가져다 쓴다. 그래야 어느 쪽에서
          처리하든 남는 기록이 하나고, 두 화면이 서로 다른 말을 하지 않는다.
        */}
        {task && (
          <Card>
            <SectionTitle
              icon={<SparkIcon className="h-4 w-4" />}
              action={
                <Link
                  href="/briefing"
                  className="tap-line whitespace-nowrap text-sm font-bold text-aqua-700"
                >
                  전체 브리핑
                </Link>
              }
            >
              지금 할 일
            </SectionTitle>
            <TaskCard task={task} compact />
          </Card>
        )}

        <div className="grid grid-cols-1 card-gap xl:grid-cols-2">
          {/* 집중 케어 부위 — 주요 기능 */}
          <div data-tour="body-map" className="card-accent">
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
              주요 케어 부위
            </SectionTitle>
            <p className="-mt-2 mb-3 text-xs text-ink-sub">
              고객 프로필 기준 — 평소 집중 관리를 원하는 부위입니다. 방문별
              실제 케어 부위는 아래 이용 이력에서 확인하세요.
            </p>
            {editingParts ? (
              <BodyMap value={draftParts} onChange={setDraftParts} compactChips />
            ) : (
              // 읽기 모드에서는 그림 + 고른 부위 칩만 (아래 태그는 같은 내용이라 뺀다)
              <BodyMap value={c.focusBodyParts} readOnly compactChips />
            )}
          </div>

          {/* 이용권 현황 */}
          <Card dataTour="memberships">
            <SectionTitle
              action={
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setEditingMembership(undefined);
                    setOpenMembership(true);
                  }}
                >
                  <PlusIcon className="h-4 w-4" />
                  이용권 등록
                </Button>
              }
            >
              이용권 현황
            </SectionTitle>
            {facts.memberships.length === 0 ? (
              <div className="rounded-card border border-dashed border-stone-line bg-card-soft py-8 text-center">
                <p className="text-sm text-ink-sub">
                  등록된 이용권이 없습니다.
                </p>
                <button
                  onClick={() => {
                    setEditingMembership(undefined);
                    setOpenMembership(true);
                  }}
                  className="touch-target mt-2 rounded-full bg-aqua-50 px-4 py-1.5 text-sm font-bold text-aqua-800 ring-1 ring-aqua-100 hover:bg-aqua-100"
                >
                  첫 이용권 등록
                </button>
              </div>
            ) : (
              <ul className="space-y-4">
                {[...facts.memberships]
                  .sort((a, b) => {
                    // 사용 중인 이용권을 위로, 그 다음 최근 구매순
                    const rank = (m: typeof a) => (m.status === "active" ? 0 : 1);
                    return (
                      rank(a) - rank(b) ||
                      b.purchasedAt.localeCompare(a.purchasedAt)
                    );
                  })
                  .map((m) => {
                    const low = m.status === "active" && m.remainingCount <= 2;
                    return (
                      <li
                        key={m.id}
                        className="rounded-card bg-card-soft p-4 ring-1 ring-black/[0.04]"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="min-w-0 font-extrabold text-ink">
                            {m.programName}
                          </p>
                          <Badge
                            tone={
                              m.status === "active"
                                ? low
                                  ? "warn"
                                  : "aqua"
                                : m.status === "expired"
                                  ? "danger"
                                  : "gray"
                            }
                            dot
                          >
                            {m.status === "active"
                              ? `잔여 ${m.remainingCount}회`
                              : m.status === "expired"
                                ? "기한 만료"
                                : "소진"}
                          </Badge>
                        </div>
                        <ProgressBar
                          ratio={m.remainingCount / m.totalCount}
                          tone={low ? "warn" : "aqua"}
                          className="mt-2.5"
                        />
                        <p className="mt-2 nowrap-num text-xs text-ink-sub">
                          {m.remainingCount}/{m.totalCount}회 ·{" "}
                          {formatKrw(m.price)} · 구매{" "}
                          {formatDateKr(m.purchasedAt)}
                          {m.expiresAt
                            ? ` · 기한 ${formatDateKr(m.expiresAt)}`
                            : ""}
                        </p>

                        {/* 소진 임박·완료 시 재구매 상담을 바로 잇는다 */}
                        {(m.status !== "active" || low) && (
                          <p className="mt-2 rounded-btn bg-gold-soft px-3 py-2 text-[0.8125rem] font-bold text-gold-deep">
                            {m.status === "active"
                              ? "소진이 임박했습니다. 재구매 상담 시점입니다."
                              : "이용권을 모두 사용했습니다. 재구매 상담 대상입니다."}
                          </p>
                        )}

                        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                          <button
                            onClick={() => {
                              setEditingMembership(m);
                              setOpenMembership(true);
                            }}
                            className="touch-target rounded-full bg-card px-3 py-1 text-xs font-bold text-ink-sub ring-1 ring-stone-line hover:bg-aqua-50 hover:text-aqua-800"
                          >
                            수정
                          </button>
                          {m.status !== "expired" ? (
                            <button
                              onClick={() => {
                                updateMembership(m.id, { status: "expired" });
                                toast(`${m.programName}을(를) 기한 만료 처리했습니다`, "info");
                              }}
                              className="touch-target rounded-full bg-card px-3 py-1 text-xs font-bold text-ink-sub ring-1 ring-stone-line hover:bg-aqua-50 hover:text-aqua-800"
                            >
                              기한 만료 처리
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                updateMembership(m.id, {
                                  status:
                                    m.remainingCount > 0 ? "active" : "exhausted",
                                });
                                toast(`${m.programName}을(를) 다시 사용 상태로 되돌렸습니다`, "info");
                              }}
                              className="touch-target rounded-full bg-card px-3 py-1 text-xs font-bold text-ink-sub ring-1 ring-stone-line hover:bg-aqua-50 hover:text-aqua-800"
                            >
                              만료 취소
                            </button>
                          )}
                          <button
                            onClick={() => setConfirmDeleteM(m.id)}
                            className="touch-target ml-auto rounded-full px-3 py-1 text-xs font-bold text-ink-faint hover:text-danger-text"
                          >
                            삭제
                          </button>
                        </div>
                      </li>
                    );
                  })}
                <li className="nowrap-num rounded-card bg-gradient-to-r from-aqua-50 to-card px-4 py-3 text-sm font-bold text-aqua-800 ring-1 ring-aqua-100">
                  누적 구매{" "}
                  {formatKrw(
                    facts.memberships.reduce((sum, m) => sum + m.price, 0),
                  )}{" "}
                  · 이용권 {facts.memberships.length}건
                </li>
              </ul>
            )}
          </Card>
        </div>

        {/* 케어 선호 · 특이사항 (고객 감동 포인트) */}
        {/* 고객이 MY WELLNESS 에서 남긴 것 — 매장 계정 연결 시에만 나온다 */}
        <CustomerVoiceCard customerId={c.id} customerName={c.name} />

        <CarePreferenceCard
          customerId={c.id}
          preferences={c.preferences ?? []}
        />

        {/*
          고객 원문 상담메모.

          처음 오셨을 때 고객이 직접 이야기한 내용을 옮겨 둔 것이다.
          이 글에는 몸 상태에 대한 고객의 표현이 그대로 들어 있어서,
          시스템이 이를 읽고 무엇이라 판정하거나 무엇을 하라고 권하면
          하지 말아야 할 일을 하는 것이 된다.
          그래서 (1) 원문 그대로만 보여주고 (2) 어디서 온 글인지 밝히고
          (3) 우선순위·매출기회 계산에는 넣지 않는다.
        */}
        {c.consultationNote && (
          <Card>
            <SectionTitle>고객 원문 상담메모</SectionTitle>
            <blockquote className="rounded-card border-l-4 border-aqua-400 bg-aqua-50 px-4 py-3.5 dark:bg-aqua-500/10">
              <p className="whitespace-pre-line text-[0.9375rem] leading-relaxed text-ink-soft">
                {c.consultationNote}
              </p>
            </blockquote>
            <p className="mt-2.5 text-[0.8125rem] leading-relaxed text-ink-sub">
              처음 상담에서 <b>고객이 말한 그대로</b> 옮겨 둔 내용입니다.
              시스템은 이 글을 해석하지 않으며, 관리 우선순위나 매출기회
              판단에도 사용하지 않습니다.
            </p>
          </Card>
        )}

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
            <p className="rounded-card bg-card-soft px-4 py-8 text-center text-sm leading-relaxed text-ink-sub">
              아직 방문 기록이 없습니다. 위의 <b>방문 · 상담 기록</b>으로 첫
              기록을 남기면 이용주기와 관리 판단이 여기서부터 쌓입니다.
            </p>
          ) : (
            <ol className="relative space-y-4 border-l-2 border-aqua-100 pl-5">
              {visits.map((v) => (
                <li key={v.id} className="relative">
                  <span
                    className={`absolute -left-[1.65rem] top-1.5 h-3 w-3 rounded-full bg-gradient-to-br ring-4 ring-aqua-50 ${
                      v.type === "consult"
                        ? "from-gold to-gold-deep"
                        : v.programName?.includes("딥 릴랙스")
                          ? "from-violet-400 to-violet-600"
                          : v.programName?.includes("반신")
                            ? "from-sky-400 to-sky-600"
                            : "from-aqua-400 to-aqua-600"
                    }`}
                  />
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
                  {(v.appliedPreferenceIds?.length ?? 0) > 0 && (
                    <p className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs">
                      <span className="font-bold text-gold-deep">반영한 케어 포인트</span>
                      {v.appliedPreferenceIds!.map((pid) => {
                        const pref = c.preferences?.find((x) => x.id === pid);
                        if (!pref) return null;
                        return (
                          <span
                            key={pid}
                            className="inline-flex items-center gap-1 rounded-full bg-gold-soft px-2 py-0.5 font-bold text-gold-deep"
                          >
                            {PREFERENCE_CATEGORY_LABELS[pref.category]} · {pref.note}
                          </span>
                        );
                      })}
                    </p>
                  )}
                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                    <p className="min-w-0 text-xs text-ink-sub">
                      담당 {staffName(v.staffId)}
                      {v.amount ? ` · 결제 ${formatKrw(v.amount)}` : ""}
                      {v.membershipId ? " · 이용권 차감" : ""}
                    </p>
                    <button
                      onClick={() => {
                        setEditingVisit(v);
                        setOpenVisit(true);
                      }}
                      className="ml-auto shrink-0 rounded-full px-2.5 py-1 text-xs font-bold text-ink-sub ring-1 ring-stone-line transition-colors hover:bg-aqua-50 hover:text-aqua-800"
                    >
                      수정
                    </button>
                    <button
                      onClick={() => setConfirmDeleteV(v)}
                      className="shrink-0 rounded-full px-2.5 py-1 text-xs font-bold text-ink-faint transition-colors hover:text-danger-text"
                    >
                      삭제
                    </button>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>

      <Modal
        open={openVisit}
        onClose={() => setOpenVisit(false)}
        title={`${c.name} — 방문 · 상담 ${editingVisit ? "기록 수정" : "기록"}`}
        wide
      >
        <VisitForm
          customerId={c.id}
          visit={editingVisit}
          onCancel={() => setOpenVisit(false)}
          onSaved={() => {
            setOpenVisit(false);
            setEditingVisit(undefined);
          }}
        />
      </Modal>

      {/* 고객 정보 수정 */}
      <Modal
        open={openProfile}
        onClose={() => setOpenProfile(false)}
        title={`${c.name} — 고객 정보 수정`}
        wide
      >
        <CustomerForm
          customer={c}
          onCancel={() => setOpenProfile(false)}
          onSaved={() => setOpenProfile(false)}
        />
      </Modal>

      {/* 이용권 등록 · 수정 */}
      <Modal
        open={openMembership}
        onClose={() => setOpenMembership(false)}
        title={`${c.name} — 이용권 ${editingMembership ? "수정" : "등록"}`}
        wide
      >
        <MembershipForm
          customerId={c.id}
          membership={editingMembership}
          onCancel={() => setOpenMembership(false)}
          onSaved={() => {
            setOpenMembership(false);
            setEditingMembership(undefined);
          }}
        />
      </Modal>

      {/* 방문 기록 삭제 확인 */}
      <Modal
        open={!!confirmDeleteV}
        onClose={() => setConfirmDeleteV(undefined)}
        title="방문 기록 삭제"
      >
        <p className="text-[0.9375rem] leading-relaxed text-ink-soft">
          {confirmDeleteV && formatDateKr(confirmDeleteV.visitedAt)} 기록을
          삭제합니다.
          {confirmDeleteV?.membershipId
            ? " 이 기록에서 차감된 이용권 1회는 다시 되돌아갑니다."
            : ""}{" "}
          잘못 누르셨다면 삭제 직후 뜨는 <b>되돌리기</b>로 복구할 수 있습니다.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirmDeleteV(undefined)}>
            취소
          </Button>
          <Button
            variant="danger-ghost"
            onClick={() => {
              if (!confirmDeleteV) return;
              const removed = removeVisit(confirmDeleteV.id);
              toast(
                `${formatDateKr(confirmDeleteV.visitedAt)} 방문 기록을 삭제했습니다`,
                "info",
                removed
                  ? { label: "되돌리기", onAction: () => restoreVisit(removed) }
                  : undefined,
              );
              setConfirmDeleteV(undefined);
            }}
          >
            삭제
          </Button>
        </div>
      </Modal>

      {/* 고객 케어 리포트 — 고객과 함께 보는 한 장 */}
      <Modal
        open={openReport}
        onClose={() => setOpenReport(false)}
        title={`${c.name} 님 케어 리포트`}
        wide
      >
        <CareReport customer={c} />
      </Modal>

      {/* 이용권 삭제 확인 */}
      <Modal
        open={!!confirmDeleteM}
        onClose={() => setConfirmDeleteM(undefined)}
        title="이용권 삭제"
      >
        <p className="text-[0.9375rem] leading-relaxed text-ink-soft">
          이용권을 삭제합니다. 이 이용권을 사용한 방문 기록은 그대로 남고 연결만
          해제됩니다. 잘못 등록한 경우가 아니라면 <b>기한 만료 처리</b>를
          권장합니다.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirmDeleteM(undefined)}>
            취소
          </Button>
          <Button
            variant="danger-ghost"
            onClick={() => {
              if (!confirmDeleteM) return;
              const removed = removeMembership(confirmDeleteM);
              toast(
                "이용권을 삭제했습니다",
                "info",
                removed
                  ? {
                      label: "되돌리기",
                      onAction: () => restoreMembership(removed),
                    }
                  : undefined,
              );
              setConfirmDeleteM(undefined);
              setEditingMembership(undefined);
            }}
          >
            삭제
          </Button>
        </div>
      </Modal>

      {/* 다음 관리 예정일 — 날짜·시간 클릭 선택 */}
      <Modal
        open={openSchedule}
        onClose={() => setOpenSchedule(false)}
        title="다음 관리 예정일"
      >
        <DateTimePanel
          date={c.nextManageDate ?? ""}
          time={c.nextManageTime}
          recommended={
            recommendation.date
              ? { date: recommendation.date, label: "AI 추천일" }
              : undefined
          }
          onChange={(date, time) =>
            updateCustomer(c.id, {
              nextManageDate: date || undefined,
              nextManageTime: date ? time : undefined,
            })
          }
          onDone={() => {
            setOpenSchedule(false);
            toast(
              c.nextManageDate
                ? `다음 관리 예정일을 ${formatDateTimeKr(c.nextManageDate, c.nextManageTime)}로 저장했습니다`
                : "다음 관리 예정일을 비웠습니다",
            );
          }}
        />
      </Modal>
    </div>
  );
}
