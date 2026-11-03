"use client";

/** 재방문 관리 — 관리 대상 고객을 그룹별로 보여주는 화면 */

import Link from "next/link";
import { useState } from "react";
import StaffBand, { BandLink } from "@/components/layout/StaffBand";
import TaskCard from "@/components/briefing/TaskCard";
import { useStore } from "@/lib/data/store";
import { CustomerDerived, SalesOpportunity } from "@/lib/types";
import { daysAgo, formatRelative } from "@/lib/utils/date";
import { displayName, displayPhone } from "@/lib/utils/format";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  OpportunityBadge,
  SectionTitle,
} from "@/components/ui";
import { ChevronRightIcon, RefreshIcon } from "@/components/ui/icons";

interface Group {
  key: string;
  title: string;
  description: string;
  tone: "aqua" | "warn" | "danger" | "gray";
  rows: Array<{ derived: CustomerDerived; note: string }>;
}

function CustomerRow({
  derived,
  note,
  canSeePhone,
  privacyMode,
  opportunity,
}: {
  derived: CustomerDerived;
  note: string;
  canSeePhone: boolean;
  privacyMode: boolean;
  opportunity?: SalesOpportunity;
}) {
  const c = derived.customer;
  /**
   * 폰에서는 이름·배지·설명이 한 줄에서 서로 밀어내다가 글자가 포개졌다.
   * (이름은 '한…' 으로 잘리고 연락처는 '01…' 만 남았다)
   * 그래서 폰에서는 위에서 아래로 쌓고, 자리가 넉넉한 화면에서만
   * 설명을 오른쪽 끝에 붙인다.
   */
  return (
    <Link
      href={`/customers/${c.id}`}
      className="row-accent group flex items-center gap-3 overflow-hidden rounded-card bg-card-soft px-3.5 py-3 pl-4 ring-1 ring-black/[0.04] hover:bg-aqua-50 hover:ring-aqua-200"
    >
      <span className="icon-pop flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-aqua-50 to-aqua-100 font-extrabold text-aqua-800 ring-1 ring-aqua-200/60">
        {c.name.slice(0, 1)}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {/* 긴 이름이 들어와도 배지가 화면 밖으로 밀리지 않게 — 고객 목록과 같은 규칙 */}
          <span className="min-w-0 break-words text-[1.0625rem] font-extrabold text-ink">
            {displayName(c.name, privacyMode)}
          </span>
          {opportunity && opportunity.type !== "none" && (
            <span className="shrink-0">
              <OpportunityBadge opportunity={opportunity} size="sm" />
            </span>
          )}
        </div>
        <p className="tabular line-clamp-2 text-[0.8125rem] leading-snug text-ink-sub">
          방문 {derived.visitCount}회
          <span className="hidden sm:inline">
            {" · "}
            {displayPhone(c.phone, canSeePhone)}
          </span>
        </p>
        <p className="text-[0.875rem] font-bold leading-snug text-ink-soft sm:hidden">
          {note}
        </p>
      </div>
      <span className="hidden max-w-[45%] shrink-0 text-right text-sm font-bold leading-snug text-ink-soft sm:block">
        {note}
      </span>
      <ChevronRightIcon className="h-4 w-4 shrink-0 text-ink-faint" />
    </Link>
  );
}

const GROUP_ICON_TONE: Record<string, "aqua" | "amber" | "gray" | "gold"> = {
  due: "aqua",
  at_risk: "amber",
  dormant: "gray",
  low: "gold",
};

const GROUP_ACCENT: Record<string, string> = {
  due: "from-aqua-400 to-aqua-600",
  at_risk: "from-amber-300 to-warn",
  dormant: "from-red-300 to-danger",
  low: "from-gold to-gold-deep",
};

export default function RetentionPage() {
  const { derivedById, opportunityById, settings, briefingTasks, canSeePhone, privacyMode } =
    useStore();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const rules = settings.careRules;
  const all = [...derivedById.values()];

  const dueGroup: Group = {
    key: "due",
    title: "재방문 예정 · 관리일 도래",
    description: "다음 관리 예정일이 도래했거나 지난 고객",
    tone: "aqua",
    rows: all
      .filter((d) => {
        const nm = d.customer.nextManageDate;
        return nm && daysAgo(nm) >= -rules.revisitWindowDays;
      })
      .sort(
        (a, b) =>
          daysAgo(b.customer.nextManageDate!) -
          daysAgo(a.customer.nextManageDate!),
      )
      .map((d) => {
        const over = daysAgo(d.customer.nextManageDate!);
        return {
          derived: d,
          note:
            over > 0
              ? `관리일 ${over}일 경과`
              : `관리일 ${formatRelative(d.customer.nextManageDate)}`,
        };
      }),
  };

  const atRiskGroup: Group = {
    key: "at_risk",
    title: "방문 주기 초과",
    description: "평균 방문주기를 넘겨 이탈 위험이 있는 고객",
    tone: "warn",
    rows: all
      .filter((d) => d.status === "at_risk")
      .sort((a, b) => b.priorityScore - a.priorityScore)
      .map((d) => ({
        derived: d,
        note: d.lastVisitDate
          ? `최근 방문 ${formatRelative(d.lastVisitDate)}`
          : "방문 이력 없음",
      })),
  };

  const dormantGroup: Group = {
    key: "dormant",
    title: "장기 미방문",
    description: `${rules.dormantDays}일 이상 방문이 없는 고객`,
    tone: "danger",
    rows: all
      .filter((d) => d.status === "dormant")
      .sort((a, b) => b.priorityScore - a.priorityScore)
      .map((d) => ({
        derived: d,
        note: d.lastVisitDate
          ? `${daysAgo(d.lastVisitDate)}일째 미방문`
          : "방문 이력 없음",
      })),
  };

  const lowGroup: Group = {
    key: "low",
    title: "이용권 소진 임박 · 재구매 관리",
    description: `잔여 ${rules.membershipLowCount}회 이하 또는 최근 소진 고객`,
    tone: "gray",
    rows: all
      .filter((d) =>
        d.priorityReasons.some(
          (r) => r.includes("잔여") || r.includes("소진"),
        ),
      )
      .sort((a, b) => b.priorityScore - a.priorityScore)
      .map((d) => ({
        derived: d,
        note:
          d.activeMembership !== undefined
            ? `잔여 ${d.activeMembership.remainingCount}회`
            : "이용권 소진",
      })),
  };

  const groups = [dueGroup, atRiskGroup, dormantGroup, lowGroup];
  const filledGroups = groups.filter((g) => g.rows.length > 0);
  const emptyGroups = groups.filter((g) => g.rows.length === 0);

  // AX 매출기회 대상 수 — 재방문/재등록 기회가 있는 고객 (Priority 와 별개)
  const opportunityCount = all.filter(
    (d) => (opportunityById.get(d.customer.id)?.type ?? "none") !== "none",
  ).length;

  /*
    신규 · 상담 후속 — 띠의 「가장 먼저 연락할 분」 과 아래 과제 카드는 실행
    브리핑에서 오는데, 브리핑에는 위 네 구간 말고도 신규 고객 후속관리 ·
    상담 후 미예약이 있다. 칸에는 그 둘이 없어서, 「세 분께 연락하세요」
    바로 아래 칸들이 전부 0명이었다 (D-66). 같은 숫자로 맞춘다.
  */
  const followupCount = new Set(
    briefingTasks
      .filter(
        (t) =>
          (t.status === "pending" || t.status === "confirmed") &&
          (t.category === "new_followup" || t.category === "consult_no_booking"),
      )
      .map((t) => t.customerId),
  ).size;

  // 오늘 우선관리 — 우선도 상위 3명
  const topPriority = all
    .filter((d) => d.priorityScore > 0)
    .sort((a, b) => b.priorityScore - a.priorityScore)
    .slice(0, 3);

  return (
    <div>
      {/*
        머리 띠 (D-57) — 제목 줄 · 어두운 「오늘 우선관리」 띠 · 요약 타일
        다섯 장이 따로 있던 것을 띠 하나로. 결론(가장 먼저 연락할 분)은 띠의
        큰 글로, 구간별 인원은 띠에 걸친 흰 판 한 장의 칸으로.
      */}
      <StaffBand
        title="재방문 관리"
        description="다음 방문이 늦어지는 고객을 모았습니다."
        headline={
          all.length === 0 ? (
            <>아직 등록된 고객이 없습니다</>
          ) : topPriority.length > 0 ? (
            <>
              가장 먼저 연락할 분은{" "}
              {topPriority.map((d, i) => (
                <span key={d.customer.id}>
                  <Link
                    href={`/customers/${d.customer.id}`}
                    className="tap-line text-aqua-300 underline decoration-aqua-400/50 underline-offset-4 hover:text-white"
                  >
                    {displayName(d.customer.name, privacyMode)}
                  </Link>
                  {i < topPriority.length - 1 ? " · " : ""}
                </span>
              ))}{" "}
              님입니다
            </>
          ) : (
            <>지금 다음 방문이 늦어지는 분이 없습니다</>
          )
        }
        actions={
          topPriority.length > 0 ? (
            <BandLink href="/briefing">
              실행 브리핑
              <ChevronRightIcon className="h-4 w-4" />
            </BandLink>
          ) : undefined
        }
        panel={
          all.length > 0 ? (
            /* 구간별 인원 — 한 판 안의 칸 (예전 요약 타일 다섯 장) */
            <ul data-retention-cells className="grid grid-cols-3 gap-y-1 sm:grid-cols-6">
              {(
                [
                  { label: "재방문 예정", value: dueGroup.rows.length, dot: "bg-aqua-500", to: `#ret-${dueGroup.key}` },
                  { label: "방문 주기 초과", value: atRiskGroup.rows.length, dot: "bg-warn", to: `#ret-${atRiskGroup.key}` },
                  { label: "장기 미방문", value: dormantGroup.rows.length, dot: "bg-danger", to: `#ret-${dormantGroup.key}` },
                  { label: "이용권 임박·소진", value: lowGroup.rows.length, dot: "bg-gold", to: `#ret-${lowGroup.key}` },
                  { label: "신규 · 상담 후속", value: followupCount, dot: "bg-sky-500", to: "/briefing" },
                  { label: "AX 매출기회", value: opportunityCount, dot: "bg-positive" },
                ] as Array<{ label: string; value: number; dot: string; to?: string }>
              ).map((t) => {
                /*
                  숫자를 누르면 그 분들로 (D-67) — 구간은 이 화면 아래 그 카드로
                  내려가고, 신규 · 상담 후속은 실행 브리핑으로. 0명인 칸은
                  누를 것이 없으니 그냥 숫자.
                */
                const body = (
                  <>
                    <p className="flex items-start gap-1.5 text-[0.8125rem] font-bold leading-snug text-ink-sub">
                      <span className={`mt-[0.3rem] h-1.5 w-1.5 shrink-0 rounded-full ${t.dot}`} />
                      <span className="min-w-0 [word-break:keep-all]">{t.label}</span>
                    </p>
                    <p className="nowrap-num mt-0.5 flex items-center text-[1.375rem] font-extrabold tracking-tight text-ink">
                      {t.value}
                      <span className="ml-0.5 text-[0.875rem] font-bold text-ink-sub">명</span>
                      {t.to && t.value > 0 && (
                        <ChevronRightIcon aria-hidden className="ml-auto h-4 w-4 shrink-0 text-ink-faint" />
                      )}
                    </p>
                  </>
                );
                const cell = "flex min-w-0 flex-col justify-between rounded-2xl px-2.5 py-2 sm:px-3.5";
                return (
                  <li key={t.label} className="min-w-0">
                    {t.to && t.value > 0 ? (
                      t.to.startsWith("#") ? (
                        <a
                          href={t.to}
                          data-retention-jump={t.to.slice(5)}
                          onClick={(e) => {
                            const el = document.getElementById(t.to!.slice(1));
                            if (!el) return;
                            e.preventDefault();
                            el.scrollIntoView({ behavior: "smooth", block: "start" });
                          }}
                          className={`press ${cell} h-full transition-colors hover:bg-card-soft`}
                        >
                          {body}
                        </a>
                      ) : (
                        <Link
                          href={t.to}
                          data-retention-jump="followup"
                          className={`press ${cell} h-full transition-colors hover:bg-card-soft`}
                        >
                          {body}
                        </Link>
                      )
                    ) : (
                      <div className={`${cell} h-full`}>{body}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : undefined
        }
      />

      {/*
        고객이 한 명도 없을 때. 이 화면은 구간마다 "챙길 것이 없다는 뜻입니다"
        라고 세 번 말하는데, 개업 첫날 원장님에게는 사실이 아니다 — 챙길 것이
        없는 게 아니라 아직 아무도 없는 것이다. 그 경우엔 여기서 끝낸다.
      */}
      {all.length === 0 ? (
        <EmptyState
          title="아직 등록된 고객이 없습니다"
          description="고객이 쌓이면 다음 방문이 늦어지는 분들을 여기에 모아 드립니다."
          action={
            <Link href="/customers">
              <Button>고객 등록하러 가기</Button>
            </Link>
          }
        />
      ) : (
        <>

      {/* 오늘 우선관리 실행 카드 — 데이터 → 판단 → 실행 (브리핑 엔진 재사용) */}
      {(() => {
        const topTasks = briefingTasks
          .filter((t) => t.status === "pending" || t.status === "confirmed")
          .slice(0, 3);
        if (topTasks.length === 0) return null;
        return (
          <div className="mb-4 space-y-3 lg:mb-5">
            {topTasks.map((task, i) => (
              <TaskCard key={task.id} task={task} rank={i + 1} compact />
            ))}
          </div>
        );
      })()}


      {/*
        빈 구간은 한 장으로 모은다.

        예전에는 구간 넷이 저마다 카드를 열고 "지금 이 구간에 해당하는
        고객이 없습니다. 잘못된 것이 아니라…" 를 네 번 되풀이했다. 폰에서
        그 네 장이 화면 두 장을 먹었고, 정작 챙길 분이 있는 구간은 그 사이에
        섞여 찾아야 했다. 챙길 분이 있는 구간만 카드로 펴고, 빈 구간은
        아래 한 장에 한 줄씩 「0명」 으로 적는다.
      */}
      {filledGroups.length > 0 && (
        <div className="rise-stagger mb-4 grid grid-cols-1 card-gap xl:grid-cols-2">
          {filledGroups.map((g) => (
            <Card key={g.key} id={`ret-${g.key}`} className="relative scroll-mt-24 overflow-hidden">
              <span
                className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${GROUP_ACCENT[g.key]}`}
              />
              <SectionTitle
                tone={GROUP_ICON_TONE[g.key]}
                icon={<RefreshIcon className="h-4 w-4" />}
                action={
                  <Badge tone={g.tone} dot>
                    {g.rows.length}명
                  </Badge>
                }
              >
                {g.title}
              </SectionTitle>
              <p className="-mt-2 mb-3 text-sm text-ink-sub">{g.description}</p>
              <div className="space-y-2">
                {(expanded.has(g.key) ? g.rows : g.rows.slice(0, 8)).map(
                  (r) => (
                    <CustomerRow
                      key={r.derived.customer.id}
                      derived={r.derived}
                      note={r.note}
                      canSeePhone={canSeePhone}
                      privacyMode={privacyMode}
                      opportunity={opportunityById.get(r.derived.customer.id)}
                    />
                  ),
                )}
                {g.rows.length > 8 && (
                  <button
                    onClick={() =>
                      setExpanded((prev) => {
                        const next = new Set(prev);
                        if (next.has(g.key)) next.delete(g.key);
                        else next.add(g.key);
                        return next;
                      })
                    }
                    className="touch-target w-full rounded-card bg-card-soft py-2.5 text-center text-sm font-bold text-aqua-700 ring-1 ring-black/[0.04] transition-colors hover:bg-aqua-50"
                  >
                    {expanded.has(g.key)
                      ? "접기"
                      : `전체 ${g.rows.length}명 보기`}
                  </button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
      {/*
        빈 구간 — 위 칸이 이미 「0명」 이라고 말한다 (D-67). 넷을 한 줄씩
        「0명」 배지로 또 적던 카드(폰에서 350px)를 이름 한 줄 + 안내 한
        줄로 줄이고, 구간 기준은 누르면 펴지게 둔다.
      */}
      {emptyGroups.length > 0 && (
        <div data-retention-empty>
          <Card lift={false}>
            <p className="text-[0.9375rem] font-extrabold leading-snug text-ink [word-break:keep-all]">
              {emptyGroups.map((g) => g.title).join(" · ")}
              <span className="nowrap-num font-bold text-ink-sub"> — 지금 0명</span>
            </p>
            <p className="mt-0.5 text-sm text-ink-sub">
              잘못된 것이 아니라 오늘은 챙길 것이 없다는 뜻입니다.
            </p>
            <details className="group mt-2">
              <summary className="touch-target inline-flex cursor-pointer list-none items-center gap-1 text-sm font-bold text-aqua-700 hover:text-aqua-800 dark:text-aqua-300 [&::-webkit-details-marker]:hidden">
                구간 기준 보기
                <ChevronRightIcon aria-hidden className="h-4 w-4 transition-transform group-open:rotate-90" />
              </summary>
              <ul className="mt-1 divide-y divide-stone-bg-deep">
                {emptyGroups.map((g) => (
                  <li key={g.key} className="py-2">
                    <span className="block text-[0.875rem] font-bold text-ink">{g.title}</span>
                    <span className="block text-[0.8125rem] leading-snug text-ink-sub">{g.description}</span>
                  </li>
                ))}
              </ul>
            </details>
          </Card>
        </div>
      )}
        </>
      )}
    </div>
  );
}
