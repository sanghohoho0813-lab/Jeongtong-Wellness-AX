"use client";

import Link from "next/link";
import { useState } from "react";
import { useStore } from "@/lib/data/store";
import {
  BriefingTask,
  SalesOpportunityType,
  TASK_CATEGORY_LABELS,
  TASK_CONTACT_RESULT_LABELS,
  TaskCategory,
  TaskContactResult,
  TaskStatus,
} from "@/lib/types";
import {
  daysAgo,
  daysFromToday,
  formatDateKr,
  formatTimeKr,
} from "@/lib/utils/date";
import { displayName, displayPhone } from "@/lib/utils/format";
import {
  Badge,
  BadgeTone,
  Button,
  Modal,
  OpportunityBadge,
  TaskStatusBadge,
} from "@/components/ui";
import MembershipForm from "@/components/customers/MembershipForm";
import { useToast } from "@/components/ui/toast";
import { CheckIcon, ChevronRightIcon, PauseIcon } from "@/components/ui/icons";
import { DateTimeField } from "@/components/ui/DateTimeField";

/** 관리 유형별 배지 색 — 유형이 한눈에 구분되도록 */
const CATEGORY_TONES: Record<TaskCategory, BadgeTone> = {
  revisit_due: "aqua",
  dormant: "danger",
  membership_low: "gold",
  new_followup: "sky",
  consult_no_booking: "violet",
  focus_care: "warn",
};

/** 카드 좌측 컬러 스트립 — 유형을 색으로 즉시 구분 */
export const CATEGORY_STRIPS: Record<TaskCategory, string> = {
  revisit_due: "from-aqua-400 to-aqua-600",
  dormant: "from-red-300 to-danger",
  membership_low: "from-gold to-gold-deep",
  new_followup: "from-sky-400 to-sky-600",
  consult_no_booking: "from-violet-400 to-violet-600",
  focus_care: "from-amber-300 to-warn",
};

/** 랭크 뱃지 색 — 1·2·3위 구분 */
const RANK_COLORS = [
  "bg-gradient-to-br from-aqua-400 to-deep-700 text-white",
  "bg-gradient-to-br from-sky-400 to-sky-600 text-white",
  "bg-gradient-to-br from-violet-400 to-violet-600 text-white",
];

/**
 * 업무 처리 액션 — 처리완료 / 보류 두 가지로 고정.
 * ("확인"은 행동이 모호하여 제거 — 고객 확인은 '고객 상세' 링크가 담당)
 */
const NEXT_ACTIONS: Array<{ status: TaskStatus; label: string }> = [
  { status: "done", label: "처리완료" },
  { status: "hold", label: "보류" },
];

/** 우선도 링 (0~100) */
function PriorityRing({
  score,
  onDark = false,
}: {
  score: number;
  onDark?: boolean;
}) {
  const R = 15;
  const C = 2 * Math.PI * R;
  const ratio = Math.min(score, 100) / 100;
  return (
    <span className="relative inline-flex h-10 w-10 shrink-0 items-center justify-center">
      <svg viewBox="0 0 36 36" className="h-10 w-10 -rotate-90">
        <circle
          cx="18"
          cy="18"
          r={R}
          fill="none"
          stroke={onDark ? "rgba(255,255,255,0.18)" : "var(--chart-track)"}
          strokeWidth="3.5"
        />
        <circle
          cx="18"
          cy="18"
          r={R}
          fill="none"
          stroke={onDark ? "#2AB3AF" : "#149D9A"}
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeDasharray={`${ratio * C} ${C}`}
        />
      </svg>
      <span
        className={`absolute nowrap-num text-[0.7rem] font-extrabold ${onDark ? "text-white" : "text-deep-800 dark:text-aqua-700"}`}
      >
        {score}
      </span>
    </span>
  );
}

export default function TaskCard({
  task,
  rank,
  compact = false,
  variant = "light",
}: {
  task: BriefingTask;
  rank?: number;
  compact?: boolean;
  variant?: "light" | "hero";
}) {
  const { customers, staff, setTaskStatus, canSeePhone, privacyMode } = useStore();
  const toast = useToast();

  /** 열려 있는 입력 패널 — 처리완료 결과 / 보류 재확인일 */
  const [panel, setPanel] = useState<null | "done" | "hold">(null);
  const [contactResult, setContactResult] =
    useState<TaskContactResult>("contacted");
  const [revisitPlanned, setRevisitPlanned] = useState(true);
  const [nextDate, setNextDate] = useState("");
  const [nextTime, setNextTime] = useState<string | undefined>();
  const [renewed, setRenewed] = useState(false);
  const [openMembership, setOpenMembership] = useState(false);
  const [panelOppType, setPanelOppType] = useState<
    SalesOpportunityType | undefined
  >();
  const [note, setNote] = useState("");
  const [holdUntil, setHoldUntil] = useState(() => daysFromToday(3));
  /** 폰에서 '판단 이유 · 매출기회 근거'를 펼쳤는지 (PC 는 항상 펼침) */
  const [detailOpen, setDetailOpen] = useState(false);

  const customer = customers.find((c) => c.id === task.customerId);
  if (!customer) return null;

  const handlerName = staff.find((s) => s.id === task.handledByStaffId)?.name;

  const STATUS_TOAST: Record<TaskStatus, string> = {
    pending: "대기 상태로 되돌렸습니다",
    confirmed: "확인 처리했습니다",
    done: "처리완료했습니다",
    hold: "보류 처리했습니다",
  };

  const finished = task.status === "done";
  /** AX 매출기회 — 있으면 실행 카드에 함께 노출한다 (Priority Score 와 무관) */
  const opp = task.opportunity;
  /**
   * 결과 패널을 연 시점의 매출기회 유형을 붙잡아 둔다.
   * 패널에서 이용권을 등록하면 그 고객의 매출기회는 즉시 사라지는데,
   * 그때 재등록 체크까지 함께 사라지면 성과를 저장할 수 없기 때문이다.
   */
  const panelIsRenewal = panelOppType === "renewal";
  /** 미처리로 넘어온 일수 (0 = 오늘 새로 올라옴) */
  const openDays = task.openSince ? daysAgo(task.openSince) : 0;
  const hero = variant === "hero";

  /** 처리완료 패널 열기 — 기존 결과 또는 고객의 현재 다음 관리일로 초기화 */
  const openDonePanel = () => {
    const o = task.outcome;
    const d = o?.nextManageDate ?? customer.nextManageDate ?? "";
    setContactResult(o?.contactResult ?? "contacted");
    setRevisitPlanned(o?.revisitPlanned ?? !!d);
    setNextDate(d);
    setNextTime(o?.nextManageTime ?? customer.nextManageTime);
    setRenewed(!!o?.membershipRenewed);
    setPanelOppType(o?.opportunityType ?? task.opportunity?.type);
    setNote(o?.note ?? "");
    setPanel("done");
  };

  const openHoldPanel = () => {
    setHoldUntil(task.holdUntil ?? daysFromToday(3));
    setPanel("hold");
  };

  const saveDone = () => {
    setTaskStatus(task.id, "done", {
      outcome: {
        contactResult,
        revisitPlanned,
        nextManageDate: revisitPlanned ? nextDate || undefined : undefined,
        nextManageTime: revisitPlanned && nextDate ? nextTime : undefined,
        note: note.trim() || undefined,
        membershipRenewed: panelIsRenewal ? renewed : undefined,
        opportunityType: panelOppType,
      },
    });
    setPanel(null);
    toast(`${customer.name} · 처리 결과가 저장되었습니다`);
  };

  const saveHold = () => {
    setTaskStatus(task.id, "hold", { holdUntil });
    setPanel(null);
    toast(`${customer.name} · 보류 — ${formatDateKr(holdUntil)} 재확인 예정`, "info");
  };

  /** 이미 처리된 상태에서 버튼을 다시 누르면 대기로 되돌린다 */
  const revertToPending = () => {
    setTaskStatus(task.id, "pending");
    setPanel(null);
    toast(`${customer.name} · ${STATUS_TOAST.pending}`, "info");
  };

  const panelShell = hero
    ? "rounded-card bg-white/10 ring-1 ring-white/15"
    : "rounded-card bg-card ring-1 ring-black/[0.06] dark:ring-white/10";
  const panelLabel = hero
    ? "text-[0.7rem] font-extrabold uppercase tracking-wider text-aqua-200"
    : "text-[0.7rem] font-extrabold uppercase tracking-wider text-ink-faint";
  const chipOn = hero
    ? "bg-white text-deep-900"
    : "bg-sel text-sel-ink";
  const chipOff = hero
    ? "bg-white/10 text-white ring-1 ring-white/20 hover:bg-white/20"
    : "bg-card-soft text-ink-sub ring-1 ring-stone-line hover:bg-aqua-50";
  const fieldCls = hero
    ? "w-full rounded-btn border border-white/20 bg-white/10 px-3 py-2 text-sm text-white outline-none placeholder:text-white/50 focus:border-aqua-300"
    : "w-full rounded-btn border border-stone-line bg-card-soft px-3 py-2 text-sm text-ink outline-none focus:border-aqua-500";

  const shell = hero
    ? "rounded-card bg-white/[0.07] ring-1 ring-white/10 backdrop-blur-[2px]"
    : "rounded-card bg-card-soft ring-1 ring-black/[0.04] card-lift";

  return (
    <div
      data-tour="task-card"
      className={`group relative overflow-hidden ${shell} p-4 pl-5 transition-opacity ${finished ? "opacity-55" : ""}`}
    >
      {/* 관리 유형 컬러 스트립 */}
      <span
        className={`absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b ${CATEGORY_STRIPS[task.category]} ${hero ? "opacity-80" : ""}`}
      />
      <div className="flex items-start gap-3">
        {rank !== undefined && (
          <span
            className={`icon-pop mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-extrabold shadow-sm ${
              hero
                ? "bg-aqua-400 text-deep-900 shadow-[0_0_0_4px_rgba(42,179,175,0.18)]"
                : (RANK_COLORS[(rank - 1) % RANK_COLORS.length] ??
                  "bg-deep-800 text-white")
            }`}
          >
            {rank}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/customers/${customer.id}`}
              className={`tap-line truncate text-[1.0625rem] font-extrabold ${
                hero ? "text-white hover:text-aqua-200" : "text-ink hover:text-aqua-700"
              }`}
            >
              {displayName(customer.name, privacyMode)}
            </Link>
            <Badge tone={hero ? "on-dark" : CATEGORY_TONES[task.category]} dot>
              {TASK_CATEGORY_LABELS[task.category]}
            </Badge>
            {!hero && <TaskStatusBadge status={task.status} />}
            {opp && opp.type !== "none" && (
              <OpportunityBadge opportunity={opp} size="sm" />
            )}
            {/* 며칠째 미처리인지 — 오래 방치된 과제를 눈에 띄게 한다 */}
            {openDays > 0 && (
              <span
                className={`nowrap-num inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[0.7rem] font-extrabold ${
                  hero
                    ? "bg-white/15 text-white ring-1 ring-white/25"
                    : openDays >= 3
                      ? "bg-red-50 text-danger-text ring-1 ring-red-100 dark:bg-red-400/10 dark:ring-red-400/20"
                      : "bg-amber-50 text-amber-700 ring-1 ring-amber-100 dark:bg-amber-400/10 dark:text-amber-300 dark:ring-amber-400/20"
                }`}
              >
                {openDays + 1}일째 미처리
              </span>
            )}
            <span className="ml-auto">
              <PriorityRing score={task.priorityScore} onDark={hero} />
            </span>
          </div>
          {hero ? (
            <>
              <p className="mt-1.5 text-sm leading-relaxed text-deep-sub">
                {task.reason}
              </p>
              <p className="mt-1 text-sm font-bold text-aqua-300">
                → {task.suggestedAction}
              </p>
              {opp && opp.type !== "none" && (
                <p className="mt-1 text-sm font-bold text-gold">
                  → {opp.action}
                  <span className="ml-1.5 font-medium text-deep-sub">
                    ({opp.reasons[0]})
                  </span>
                </p>
              )}
            </>
          ) : (
            /**
             * 폰에서는 **할 일**만 먼저 보이고, 왜 그런지는 눌러야 펼쳐진다.
             *
             * 한 화면에 근거까지 다 펼치면 카드 하나가 폰 화면의 3/4을 먹어서
             * 열 명만 넘어가도 한참을 쓸어내려야 한다. 실제로 필요한 건
             * "누구에게 무엇을" 이고, 근거는 확인하고 싶을 때만 본다.
             * PC 는 자리가 넉넉하므로 늘 펼친 상태로 둔다(lg:block).
             */
            <div className="mt-2 space-y-2">
              <div className="rounded-btn bg-aqua-50 px-3 py-2 dark:bg-aqua-500/10">
                {/* 작은 대문자 라벨이라 한 단계 진하게 — 아쿠아 배경 위 5.75 */}
                <p className="text-[0.7rem] font-extrabold uppercase tracking-wider text-ink-sub">
                  권장 행동
                </p>
                <p className="mt-0.5 text-[0.9375rem] font-bold leading-relaxed text-aqua-800">
                  {task.suggestedAction}
                </p>
              </div>

              {/* 폰 전용 — 근거 펼치기 */}
              <button
                type="button"
                onClick={() => setDetailOpen((v) => !v)}
                aria-expanded={detailOpen}
                className="no-print touch-target inline-flex w-full items-center justify-between gap-2 rounded-btn bg-card px-3 py-2 text-sm font-bold text-ink-sub ring-1 ring-stone-line lg:hidden"
              >
                <span>{detailOpen ? "판단 이유 접기" : "왜 이 고객인가요?"}</span>
                <ChevronRightIcon
                  className={`h-4 w-4 shrink-0 transition-transform ${detailOpen ? "rotate-90" : ""}`}
                />
              </button>

              <div
                className={`print-open space-y-2 ${detailOpen ? "block" : "hidden lg:block"}`}
              >
                <div>
                  <p className="text-[0.7rem] font-extrabold uppercase tracking-wider text-ink-faint">
                    판단 이유
                  </p>
                  <ul className="mt-0.5 space-y-0.5">
                    {task.reason.split(" · ").map((r, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-1.5 text-sm leading-relaxed text-ink-soft"
                      >
                        <span className="mt-[0.45rem] h-1 w-1 shrink-0 rounded-full bg-aqua-400" />
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>
                {opp && opp.type !== "none" && (
                  <div className="rounded-btn bg-gold-soft/70 px-3 py-2">
                    <p className="text-[0.7rem] font-extrabold uppercase tracking-wider text-gold-deep">
                      매출기회 · {opp.label}
                    </p>
                    <ul className="mt-0.5 space-y-0.5">
                      {opp.reasons.slice(0, 3).map((r, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-1.5 text-sm leading-relaxed text-ink-soft"
                        >
                          <span className="mt-[0.45rem] h-1 w-1 shrink-0 rounded-full bg-gold" />
                          {r}
                        </li>
                      ))}
                    </ul>
                    <p className="mt-1 text-sm font-bold text-gold-deep">
                      → {opp.action}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
          {!compact && (
            <p className={`mt-1 text-xs ${hero ? "text-deep-faint" : "text-ink-sub"}`}>
              {displayPhone(customer.phone, canSeePhone)}
            </p>
          )}
          {/*
            종이로 뽑아 손에 들고 도는 경우 — 통화하고 나서 그 자리에 적을
            칸이 없으면 뒷면에 따로 적게 된다. 화면에는 안 보이고 종이에만 나온다.
          */}
          <div className="print-only mt-2 border-t border-dashed border-stone-line pt-2 text-[0.8125rem] text-ink-sub">
            <span>□ 통화함</span>
            <span className="ml-4">□ 다음 방문 잡음</span>
            <span className="ml-4">메모</span>
            <span className="ml-1 inline-block w-56 border-b border-stone-line align-bottom" />
          </div>
          <div className="no-print mt-3 flex flex-wrap items-center gap-2">
            {NEXT_ACTIONS.map((a) => {
              const active = task.status === a.status;
              const activeCls =
                a.status === "done"
                  ? "bg-aqua-500 text-white shadow-sm"
                  : "bg-warn text-white shadow-sm";
              const idleCls = hero
                ? "bg-white/10 text-white ring-1 ring-white/15 hover:bg-white/20"
                : "bg-card text-ink-soft ring-1 ring-black/[0.06] hover:bg-aqua-50 dark:ring-white/10";
              const open = panel === a.status;
              return (
                <button
                  key={a.status}
                  onClick={() => {
                    if (open) return setPanel(null);
                    if (active) return revertToPending();
                    // 상태를 바로 바꾸지 않고 입력 패널을 먼저 연다
                    if (a.status === "done") openDonePanel();
                    else openHoldPanel();
                  }}
                  className={`touch-target inline-flex items-center gap-1 rounded-full px-3.5 py-1.5 text-sm font-bold transition-colors ${active || open ? activeCls : idleCls}`}
                >
                  {a.status === "done" && <CheckIcon className="h-4 w-4" />}
                  {a.status === "hold" && <PauseIcon className="h-4 w-4" />}
                  {a.label}
                </button>
              );
            })}
            {/* 처리완료 상태에서 결과를 다시 열어 수정 */}
            {finished && panel !== "done" && (
              <button
                onClick={openDonePanel}
                className={`touch-target rounded-full px-3 py-1.5 text-sm font-bold ${hero ? "text-aqua-200 hover:text-white" : "text-aqua-700 hover:text-aqua-800"}`}
              >
                결과 수정
              </button>
            )}
            <Link
              href={`/customers/${customer.id}`}
              className={`touch-target ml-auto inline-flex items-center gap-0.5 text-sm font-bold ${
                hero
                  ? "text-aqua-200 hover:text-white"
                  : "text-ink-sub hover:text-aqua-700"
              }`}
            >
              고객 상세
              <ChevronRightIcon className="h-4 w-4" />
            </Link>
          </div>

          {/* 처리완료 결과 입력 — [처리완료] 직후 이 자리에서 바로 기록 */}
          {panel === "done" && (
            <div className={`mt-3 px-3.5 py-3 ${panelShell}`}>
              <p className={panelLabel}>실행 결과</p>

              <p className={`mt-2 text-xs font-bold ${hero ? "text-deep-sub" : "text-ink-sub"}`}>
                처리결과
              </p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {(
                  Object.keys(TASK_CONTACT_RESULT_LABELS) as TaskContactResult[]
                ).map((r) => (
                  <button
                    key={r}
                    onClick={() => {
                      setContactResult(r);
                      // 재방문 예약을 선택하면 재방문 여부도 함께 맞춰준다
                      if (r === "reserved") setRevisitPlanned(true);
                    }}
                    className={`touch-target rounded-full px-3 py-1 text-xs font-bold transition-colors ${contactResult === r ? chipOn : chipOff}`}
                  >
                    {TASK_CONTACT_RESULT_LABELS[r]}
                  </button>
                ))}
              </div>

              <div className="mt-2.5 flex flex-wrap items-end gap-3">
                <div>
                  <p className={`text-xs font-bold ${hero ? "text-deep-sub" : "text-ink-sub"}`}>
                    재방문
                  </p>
                  <div className="mt-1 flex gap-1.5">
                    {[
                      { v: true, label: "예약 예정" },
                      { v: false, label: "미정" },
                    ].map((o) => (
                      <button
                        key={o.label}
                        onClick={() => setRevisitPlanned(o.v)}
                        className={`touch-target rounded-full px-3 py-1 text-xs font-bold transition-colors ${revisitPlanned === o.v ? chipOn : chipOff}`}
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="min-w-40 flex-1">
                  <p className={`text-xs font-bold ${hero ? "text-deep-sub" : "text-ink-sub"}`}>
                    다음 관리 예정일
                  </p>
                  {/* 날짜 · 시간 모두 클릭으로 지정 (타자 입력 불필요) */}
                  <div className="mt-1">
                    <DateTimeField
                      date={nextDate}
                      time={nextTime}
                      disabled={!revisitPlanned}
                      onChange={(d, t) => {
                        setNextDate(d);
                        setNextTime(t);
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* 재등록 기회 과제에서만 — 매출 성과로 이어졌는지 남긴다 */}
              {panelIsRenewal && (
                <div className="mt-2.5 flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setRenewed((v) => !v)}
                  className={`flex min-w-0 flex-1 items-center gap-2 rounded-btn px-3 py-2.5 text-left text-sm font-bold transition-colors ${
                    renewed
                      ? "bg-gradient-to-r from-gold to-gold-deep text-white shadow-sm"
                      : hero
                        ? "bg-white/10 text-white ring-1 ring-white/20 hover:bg-white/20"
                        : "bg-gold-soft text-gold-deep ring-1 ring-gold/25 hover:bg-gold-soft"
                  }`}
                >
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md ${
                      renewed ? "bg-white/25" : "bg-white/60 dark:bg-white/10"
                    }`}
                  >
                    {renewed && <CheckIcon className="h-3.5 w-3.5" />}
                  </span>
                  이용권 재등록으로 이어짐
                </button>
                {/* 체크만 하고 끝나지 않게 — 여기서 바로 이용권을 등록한다 */}
                <button
                  onClick={() => setOpenMembership(true)}
                  className={`touch-target shrink-0 rounded-btn px-3.5 py-2.5 text-sm font-bold transition-colors ${
                    hero
                      ? "bg-white/10 text-white ring-1 ring-white/20 hover:bg-white/20"
                      : "bg-card text-aqua-800 ring-1 ring-aqua-200 hover:bg-aqua-50"
                  }`}
                >
                  이용권 등록
                </button>
                </div>
              )}

              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="메모 (선택)"
                className={`mt-2.5 ${fieldCls}`}
              />

              <div className="mt-3 flex items-center gap-2">
                <Button
                  size="sm"
                  variant={hero ? "on-dark" : "primary"}
                  onClick={saveDone}
                >
                  <CheckIcon className="h-4 w-4" />
                  완료 저장
                </Button>
                <button
                  onClick={() => setPanel(null)}
                  className={`touch-target rounded-full px-3 py-1.5 text-sm font-bold ${hero ? "text-deep-sub hover:text-white" : "text-ink-sub hover:text-ink"}`}
                >
                  취소
                </button>
              </div>
            </div>
          )}

          {/* 보류 재확인일 선택 */}
          {panel === "hold" && (
            <div className={`mt-3 px-3.5 py-3 ${panelShell}`}>
              <p className={panelLabel}>보류 — 재확인 예정일</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {[
                  { d: 1, label: "내일" },
                  { d: 3, label: "3일 뒤" },
                  { d: 7, label: "1주 뒤" },
                ].map((o) => {
                  const v = daysFromToday(o.d);
                  return (
                    <button
                      key={o.label}
                      onClick={() => setHoldUntil(v)}
                      className={`touch-target rounded-full px-3 py-1 text-xs font-bold transition-colors ${holdUntil === v ? chipOn : chipOff}`}
                    >
                      {o.label}
                    </button>
                  );
                })}
              </div>
              <div className="mt-2">
                <DateTimeField
                  date={holdUntil}
                  withTime={false}
                  ariaLabel="재확인 예정일"
                  onChange={(d) => setHoldUntil(d)}
                />
              </div>
              <div className="mt-3 flex items-center gap-2">
                <Button
                  size="sm"
                  variant={hero ? "on-dark" : "primary"}
                  onClick={saveHold}
                >
                  <PauseIcon className="h-4 w-4" />
                  보류 저장
                </Button>
                <button
                  onClick={() => setPanel(null)}
                  className={`touch-target rounded-full px-3 py-1.5 text-sm font-bold ${hero ? "text-deep-sub hover:text-white" : "text-ink-sub hover:text-ink"}`}
                >
                  취소
                </button>
              </div>
            </div>
          )}

          {/* 저장된 실행결과 / 보류 상태 요약 */}
          {panel === null && finished && task.outcome && (
            <p
              className={`mt-2.5 nowrap-num text-[0.7rem] ${hero ? "text-deep-faint" : "text-ink-faint"}`}
            >
              {TASK_CONTACT_RESULT_LABELS[task.outcome.contactResult]}
              {handlerName ? ` · ${handlerName} 처리` : ""}
              {task.statusChangedAt
                ? ` · ${formatDateKr(task.statusChangedAt)}`
                : ""}
              {task.outcome.revisitPlanned && task.outcome.nextManageDate
                ? ` · 재방문 ${formatDateKr(task.outcome.nextManageDate)}${
                    task.outcome.nextManageTime
                      ? ` ${formatTimeKr(task.outcome.nextManageTime)}`
                      : ""
                  }`
                : " · 재방문 미정"}
              {task.outcome.membershipRenewed ? " · 이용권 재등록" : ""}
              {task.outcome.note ? ` · ${task.outcome.note}` : ""}
            </p>
          )}
          {/* 재등록 기회 — 결과 기록과 같은 자리에서 이용권을 바로 등록한다 */}
          <Modal
            open={openMembership}
            onClose={() => setOpenMembership(false)}
            title={`${customer.name} — 이용권 등록`}
            wide
          >
            <MembershipForm
              customerId={customer.id}
              onCancel={() => setOpenMembership(false)}
              onSaved={() => {
                setOpenMembership(false);
                setRenewed(true);
              }}
            />
          </Modal>

          {panel === null && task.status === "hold" && task.holdUntil && (
            <p
              className={`mt-2.5 text-[0.7rem] font-bold ${hero ? "text-deep-faint" : "text-warn-text"}`}
            >
              재확인 예정 {formatDateKr(task.holdUntil)}
              {handlerName ? ` · ${handlerName} 보류` : ""}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
