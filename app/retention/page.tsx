"use client";

/** 재방문 관리 — 관리 대상 고객을 그룹별로 보여주는 화면 */

import Link from "next/link";
import PageHeader from "@/components/layout/PageHeader";
import { useStore } from "@/lib/data/store";
import { CustomerDerived } from "@/lib/types";
import { daysAgo, formatRelative } from "@/lib/utils/date";
import { formatPhone } from "@/lib/utils/format";
import {
  Badge,
  Card,
  Em,
  InsightBanner,
  SectionTitle,
  SummaryTile,
} from "@/components/ui";
import { ChevronRightIcon } from "@/components/ui/icons";

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
}: {
  derived: CustomerDerived;
  note: string;
}) {
  const c = derived.customer;
  return (
    <Link
      href={`/customers/${c.id}`}
      className="flex items-center gap-3 rounded-card bg-card-soft px-3.5 py-3 ring-1 ring-black/[0.04] transition-all hover:bg-aqua-50 hover:ring-aqua-200"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-aqua-50 to-aqua-100 font-extrabold text-aqua-800 ring-1 ring-aqua-200/60">
        {c.name.slice(0, 1)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-extrabold text-ink">{c.name}</p>
        <p className="truncate text-xs text-ink-sub">
          {formatPhone(c.phone)} · 방문 {derived.visitCount}회
        </p>
      </div>
      <span className="max-w-[45%] truncate text-right text-sm font-bold text-ink-soft">
        {note}
      </span>
      <ChevronRightIcon className="h-4 w-4 shrink-0 text-ink-faint" />
    </Link>
  );
}

const GROUP_ACCENT: Record<string, string> = {
  due: "from-aqua-400 to-aqua-600",
  at_risk: "from-amber-300 to-warn",
  dormant: "from-red-300 to-danger",
  low: "from-gold to-gold-deep",
};

export default function RetentionPage() {
  const { derivedById, settings } = useStore();
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

  // 오늘 우선관리 — 우선도 상위 3명
  const topPriority = all
    .filter((d) => d.priorityScore > 0)
    .sort((a, b) => b.priorityScore - a.priorityScore)
    .slice(0, 3);

  return (
    <div>
      <PageHeader
        title="재방문 관리"
        description="관리 기준은 설정에서 조정할 수 있으며, 오늘의 실행 브리핑과 동일한 기준을 사용합니다."
      />

      {/* 오늘 우선관리 인사이트 */}
      {topPriority.length > 0 && (
        <InsightBanner
          title="오늘 우선관리"
          className="mb-4 lg:mb-5"
          action={
            <Link
              href="/briefing"
              className="inline-flex items-center gap-0.5 whitespace-nowrap rounded-full bg-white/10 px-3.5 py-1.5 text-sm font-bold text-white ring-1 ring-white/20 transition-colors hover:bg-white/20"
            >
              실행 브리핑
              <ChevronRightIcon className="h-4 w-4" />
            </Link>
          }
        >
          지금 가장 먼저 연락해야 할 고객은{" "}
          {topPriority.map((d, i) => (
            <span key={d.customer.id}>
              <Link
                href={`/customers/${d.customer.id}`}
                className="font-extrabold text-white underline decoration-aqua-400/60 underline-offset-4 hover:text-aqua-200"
              >
                {d.customer.name}
              </Link>
              <Em> ({d.priorityScore})</Em>
              {i < topPriority.length - 1 ? ", " : ""}
            </span>
          ))}
          {" "}
          입니다. 관리일 도래 <Em>{dueGroup.rows.length}명</Em> · 장기 미방문{" "}
          <Em>{dormantGroup.rows.length}명</Em>이 관리 대기 중입니다.
        </InsightBanner>
      )}

      {/* 그룹 요약 타일 */}
      <div className="mb-4 grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
        <SummaryTile
          label="재방문 예정"
          value={dueGroup.rows.length}
          tone="aqua"
        />
        <SummaryTile
          label="방문 주기 초과"
          value={atRiskGroup.rows.length}
          tone="warn"
        />
        <SummaryTile
          label="장기 미방문"
          value={dormantGroup.rows.length}
          tone="danger"
        />
        <SummaryTile
          label="이용권 임박·소진"
          value={lowGroup.rows.length}
          tone="gold"
        />
      </div>

      <div className="grid grid-cols-1 card-gap xl:grid-cols-2">
        {groups.map((g) => (
          <Card key={g.key} className="relative overflow-hidden">
            <span
              className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${GROUP_ACCENT[g.key]}`}
            />
            <SectionTitle
              action={
                <Badge tone={g.tone} dot>
                  {g.rows.length}명
                </Badge>
              }
            >
              {g.title}
            </SectionTitle>
            <p className="-mt-2 mb-3 text-sm text-ink-sub">{g.description}</p>
            {g.rows.length === 0 ? (
              <p className="rounded-card bg-card-soft py-6 text-center text-sm text-ink-sub">
                해당 고객이 없습니다.
              </p>
            ) : (
              <div className="space-y-2">
                {g.rows.slice(0, 8).map((r) => (
                  <CustomerRow
                    key={r.derived.customer.id}
                    derived={r.derived}
                    note={r.note}
                  />
                ))}
                {g.rows.length > 8 && (
                  <p className="pt-1 text-center text-xs text-ink-sub">
                    외 {g.rows.length - 8}명 — 고객 메뉴에서 전체를 확인하세요.
                  </p>
                )}
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
