"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import StaffBand, { BandProgress, BandStat, bandGhost } from "@/components/layout/StaffBand";
import TaskCard from "@/components/briefing/TaskCard";
import { useStore } from "@/lib/data/store";
import {
  TASK_CATEGORY_LABELS,
  TASK_STATUS_LABELS,
  TaskCategory,
  TaskStatus,
} from "@/lib/types";
import { Button, EmptyState, FilterChip } from "@/components/ui";
import { PrinterIcon } from "@/components/ui/icons";
import AiReadyNote from "@/components/ui/AiReadyNote";
import ChipRow from "@/components/ui/ChipRow";

/** 한 번에 그리는 과제 수 — 나머지는 [더 보기]로 이어 그린다 */
const PAGE_SIZE = 40;

/** 유형별 도트 색 — TaskCard 스트립 색과 동일 체계 */
const CATEGORY_DOTS: Record<TaskCategory, string> = {
  revisit_due: "bg-aqua-500",
  dormant: "bg-danger",
  membership_low: "bg-gold",
  new_followup: "bg-sky-500",
  consult_no_booking: "bg-violet-500",
  focus_care: "bg-warn",
};

const CATEGORY_FILTERS: Array<TaskCategory | "all"> = [
  "all",
  "revisit_due",
  "dormant",
  "membership_low",
  "new_followup",
  "consult_no_booking",
];

const STATUS_FILTERS: Array<TaskStatus | "open" | "all"> = [
  "open",
  "done",
  "hold",
  "all",
];

export default function BriefingPage() {
  const { briefingTasks, todayHandled, customers } = useStore();
  const [category, setCategory] = useState<TaskCategory | "all">("all");
  const [status, setStatus] = useState<TaskStatus | "open" | "all">("open");
  const [onlyOpportunity, setOnlyOpportunity] = useState(false);
  const [limit, setLimit] = useState(PAGE_SIZE);

  /** 조건을 좁혀 둔 상태인가 — 비어 있을 때 무슨 말을 할지가 여기서 갈린다 */
  const narrowed = category !== "all" || status !== "open" || onlyOpportunity;

  /** 매출기회 과제 수 — 필터 칩 라벨과 동일 기준 */
  const opportunityTotal = briefingTasks.filter(
    (t) => t.opportunity && t.opportunity.type !== "none",
  ).length;

  const filtered = briefingTasks.filter((t) => {
    if (category !== "all" && t.category !== category) return false;
    if (onlyOpportunity && (t.opportunity?.type ?? "none") === "none")
      return false;
    if (status === "open")
      return t.status === "pending" || t.status === "confirmed";
    if (status !== "all" && t.status !== status) return false;
    return true;
  });

  // 하루에 처리할 수 있는 양을 넘어서면 화면만 무거워지므로 끊어서 그린다
  useEffect(() => setLimit(PAGE_SIZE), [category, status, onlyOpportunity]);
  const visible = filtered.slice(0, limit);

  const openTasks = briefingTasks.filter(
    (t) => t.status === "pending" || t.status === "confirmed",
  );
  /*
    오늘 처리한 건수는 **이력**에서 센다.

    이 목록은 "지금 챙길 사람" 이라 매번 새로 계산된다. 아침에 처리한
    고객이 오후에 방문하면 우선순위가 0이 되어 목록에서 내려가는데,
    건수까지 목록에서 세면 고객이 올수록 오늘 한 일이 거꾸로 줄어든다.

    그래서 목록에 남아 있는 건과 이력의 건수가 다를 수 있다. 그 차이는
    "방문으로 마무리된 건" 이고, 아래에 그대로 적어 둔다 — 숫자가 안 맞아
    보이는 채로 두면 원장님이 무엇을 믿어야 할지 알 수 없다.
  */
  const doneCount = todayHandled.length;
  const listedDone = briefingTasks.filter((t) => t.status === "done").length;
  const closedByVisit = Math.max(0, doneCount - listedDone);
  const holdCount = briefingTasks.filter((t) => t.status === "hold").length;
  const total = briefingTasks.length + closedByVisit;

  /* 유형별 미처리 건수 — 거르개 칩에 붙는다 */
  const openByCategory: Record<string, number> = {};
  for (const t of openTasks)
    openByCategory[t.category] = (openByCategory[t.category] ?? 0) + 1;

  return (
    <div>
      {/*
        머리 띠 (D-57) — 전에는 화면 제목 줄 · 어두운 요약 카드 · 흰 거르개
        카드 세 덩어리였다. 대시보드와 같은 띠 하나로 합치고, 거르개는 띠에
        걸쳐 올라온 흰 판으로 둔다. 투어가 짚는 자리(briefing-hero)는 띠.
      */}
      <StaffBand
        title="오늘의 실행 브리핑"
        description="오늘 챙길 고객을 우선순위대로 정리했습니다."
        dataTour="briefing-hero"
        /* 순서가 무엇으로 정해지는지(AI READY) — 인쇄물에는 넣지 않는다 */
        badge={
          <span className="no-print">
            <AiReadyNote subject="priority" />
          </span>
        }
        headline={
          openTasks.length > 0 ? (
            <>
              챙길 분 <span className="nowrap-num text-aqua-300">{openTasks.length}명</span>을
              먼저 할 순서대로 놓았습니다
            </>
          ) : doneCount > 0 ? (
            <>오늘 챙길 분을 모두 챙기셨습니다</>
          ) : (
            <>지금 기준에 걸린 분이 없습니다</>
          )
        }
        actions={
          <button type="button" onClick={() => window.print()} className={bandGhost}>
            <PrinterIcon className="h-4 w-4" />
            오늘 할 일 인쇄
          </button>
        }
        panelClassName="no-print"
        panel={
          /* 화면에서 목록을 좁히는 도구 — 종이에는 필요 없다 */
          <div className="px-2.5 py-2.5 sm:px-3">
            <div className="flex flex-col gap-3">
            <ChipRow ariaLabel="관리 유형으로 거르기">
              {CATEGORY_FILTERS.map((c) => {
                const active = category === c;
                const dot = c === "all" ? "" : CATEGORY_DOTS[c];
                return (
                  <button
                    key={c}
                    onClick={() => setCategory(c)}
                    className={`touch-target inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-bold transition-all ${
                      active
                        ? "bg-sel text-sel-ink shadow-sm"
                        : "bg-card text-ink-sub ring-1 ring-stone-line hover:bg-aqua-50 hover:text-aqua-800"
                    }`}
                  >
                    {dot && (
                      <span
                        className={`h-2 w-2 rounded-full ${active ? "bg-white/80" : dot}`}
                      />
                    )}
                    {c === "all" ? "전체 유형" : TASK_CATEGORY_LABELS[c]}
                    {c !== "all" && openByCategory[c] > 0 && (
                      <span className="nowrap-num font-extrabold opacity-90">
                        {openByCategory[c]}
                      </span>
                    )}
                  </button>
                );
              })}
            </ChipRow>
            <ChipRow ariaLabel="처리 상태로 거르기">
              {STATUS_FILTERS.map((s) => (
                <FilterChip
                  key={s}
                  tone="ink"
                  active={status === s}
                  onClick={() => setStatus(s)}
                >
                  {s === "open"
                    ? "미처리"
                    : s === "all"
                      ? "전체 상태"
                      : TASK_STATUS_LABELS[s]}
                </FilterChip>
              ))}
              {/* AX 매출기회만 보기 — 관리 필요와 별개의 축이라 색을 달리한다 */}
              {opportunityTotal > 0 && (
                <button
                  onClick={() => setOnlyOpportunity((v) => !v)}
                  className={`touch-target nowrap-num shrink-0 rounded-full px-4 py-1.5 text-sm font-bold transition-colors sm:ml-auto ${
                    onlyOpportunity
                      ? "bg-gradient-to-r from-gold to-gold-deep text-white shadow-sm"
                      : "bg-gold-soft text-gold-deep ring-1 ring-gold/25 hover:bg-gold/20"
                  }`}
                >
                  매출기회 {opportunityTotal}
                </button>
              )}
            </ChipRow>
          </div>
          </div>
        }
      >
        <div className="flex flex-wrap items-end gap-x-8 gap-y-3">
          <BandStat label="오늘 관리 대상" value={openTasks.length} unit="명" />
          <BandStat
            label="처리완료"
            value={doneCount}
            unit="건"
            accent
            /* 목록에 없는 건이 섞여 있으면 왜 그런지 그 자리에서 밝힌다 */
            sub={closedByVisit > 0 ? `방문으로 마무리 ${closedByVisit}건 포함` : undefined}
          />
          {holdCount > 0 && <BandStat label="보류" value={holdCount} unit="건" />}
          <div className="min-w-40 flex-1">
            <BandProgress label="오늘 진행" done={doneCount} total={total} />
          </div>
        </div>
      </StaffBand>

      {filtered.length === 0 ? (
        /*
          비어 있는 이유가 세 가지인데 한 문장으로 뭉뚱그려 두었었다.
          "필터를 변경하거나, 오늘의 관리 과제를 모두 완료한 상태입니다."
          — 고객이 한 명도 없는 개업 첫날 원장님에게는 사실이 아닌 말이다.
          완료한 것이 없는데 완료했다고 하면 화면을 못 믿게 된다.
          셋을 갈라 놓는다.
        */
        customers.length === 0 ? (
          <EmptyState
            title="아직 등록된 고객이 없습니다"
            description="고객을 등록하시면 그날 챙길 분들을 여기에 우선순위대로 정리해 드립니다."
            action={
              <Link href="/customers">
                <Button>고객 등록하러 가기</Button>
              </Link>
            }
          />
        ) : narrowed ? (
          <EmptyState
            title={
              onlyOpportunity
                ? "이 조건의 매출기회 과제가 없습니다"
                : "이 조건의 실행 과제가 없습니다"
            }
            description={`고른 조건에 걸리는 과제가 없습니다. 오늘 전체 과제는 ${briefingTasks.length}건입니다.`}
            action={
              <Button
                variant="secondary"
                onClick={() => {
                  setCategory("all");
                  setStatus("open");
                  setOnlyOpportunity(false);
                }}
              >
                조건 없이 전체 보기
              </Button>
            }
          />
        ) : (
          <EmptyState
            title="오늘 챙길 고객이 없습니다"
            description={
              todayHandled.length > 0
                ? `오늘 ${todayHandled.length}건을 모두 처리하셨습니다. 수고하셨습니다.`
                : "지금 기준으로 관리가 필요한 고객이 없습니다."
            }
          />
        )
      ) : (
        <div className="rise-stagger space-y-3">
          {visible.map((task, i) => (
            <TaskCard key={task.id} task={task} rank={i + 1} />
          ))}

          {filtered.length > visible.length && (
            <div className="pt-1 text-center">
              {/* 긴 문장이라 줄바꿈이 필요하다 — nowrap 을 쓰면 좁은 화면에서 넘친다 */}
              <p className="mb-2 text-sm leading-relaxed text-ink-sub">
                <span className="nowrap-num">
                  {filtered.length}건 중 {visible.length}건
                </span>{" "}
                표시 중 · 위쪽부터 우선순위가 높은 순서입니다
              </p>
              <Button
                variant="secondary"
                onClick={() => setLimit((n) => n + PAGE_SIZE)}
              >
                더 보기 ({Math.min(PAGE_SIZE, filtered.length - visible.length)}건)
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
