"use client";

/**
 * 지점 / 운영 — HQ → Branch → Staff 구조.
 * 현재 1개 지점이지만 지점 추가만 하면 동일 운영구조를 쓸 수 있는 기반.
 */

import PageHeader from "@/components/layout/PageHeader";
import { useStore } from "@/lib/data/store";
import { calcAxSummary, calcMonthlyMetrics } from "@/lib/scoring/metrics";
import { formatKrw, formatPercent } from "@/lib/utils/format";
import { Badge, Card, EmptyState, SectionTitle } from "@/components/ui";
import { BuildingIcon } from "@/components/ui/icons";

const ROLE_LABELS = {
  owner: "대표/관리자",
  manager: "관리자",
  staff: "직원",
} as const;

export default function BranchesPage() {
  const {
    branches,
    staff,
    customers,
    visits,
    memberships,
    factsById,
    briefingTasks,
    settings,
    isManager,
  } = useStore();

  if (!isManager) {
    return (
      <EmptyState
        title="대표/관리자 전용 화면입니다"
        description="지점 운영 정보는 관리자 계정에서 확인할 수 있습니다. 사이드바 하단 또는 더보기에서 사용자를 전환하세요."
      />
    );
  }

  return (
    <div>
      <PageHeader
        title="지점 / 운영"
        description="본사(HQ) → 지점 → 직원 → 고객 구조입니다. 지점이 추가되면 동일한 운영 지표를 지점별로 비교할 수 있습니다."
      />

      <div className="flex flex-col card-gap">
        {branches.map((branch) => {
          const branchFacts = [...factsById.values()].filter(
            (f) => f.customer.branchId === branch.id,
          );
          const branchTasks = briefingTasks.filter(
            (t) => t.branchId === branch.id,
          );
          const summary = calcAxSummary(
            branchFacts,
            branchTasks,
            settings.careRules,
          );
          const monthly = calcMonthlyMetrics(
            customers.filter((c) => c.branchId === branch.id),
            visits.filter((v) => v.branchId === branch.id),
            memberships.filter((m) => m.branchId === branch.id),
            1,
          );
          const thisMonth = monthly.at(-1)!;
          const branchStaff = staff.filter(
            (s) => s.branchId === branch.id && s.active,
          );

          const openTaskCount = branchTasks.filter(
            (t) => t.status === "pending" || t.status === "confirmed",
          ).length;
          // 운영 상태 판단 (기존 데이터 기반): 관리 대기 고객 비율로 표시
          const attention =
            summary.totalCustomers > 0 &&
            openTaskCount / summary.totalCustomers > 0.3;

          const stats: Array<{ label: string; value: string; warn?: boolean }> = [
            { label: "고객 수", value: `${summary.totalCustomers}명` },
            { label: "직원 수", value: `${branchStaff.length}명` },
            {
              label: "이번 달 방문",
              value: `${thisMonth.visitCount}건`,
            },
            { label: "재방문율", value: formatPercent(summary.revisitRate) },
            {
              label: "관리대상 고객",
              value: `${openTaskCount}명`,
              warn: attention,
            },
            { label: "이번 달 매출", value: formatKrw(thisMonth.revenue) },
          ];

          return (
            <Card key={branch.id} className="relative overflow-hidden">
              <span
                className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${attention ? "from-amber-300 to-warn" : "from-aqua-400 to-deep-700"}`}
              />
              <SectionTitle
                action={
                  attention ? (
                    <Badge tone="warn" dot>
                      관리 집중 필요
                    </Badge>
                  ) : (
                    <Badge tone="positive" dot>
                      정상 운영
                    </Badge>
                  )
                }
              >
                <span className="inline-flex items-center gap-2.5">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-deep-700 to-deep-900 text-aqua-300 shadow-[0_2px_8px_rgba(10,46,44,0.3)]">
                    <BuildingIcon className="h-5 w-5" />
                  </span>
                  {settings.companyName} {branch.name}
                </span>
              </SectionTitle>
              <p className="-mt-1 mb-4 text-sm text-ink-sub">
                영업시간 {branch.openHours ?? settings.openHours} · 관리자{" "}
                {settings.ownerName}
                {attention && (
                  <span className="ml-2 font-bold text-warn">
                    관리 대기 고객 비율이 높습니다 — 실행 브리핑을 확인하세요.
                  </span>
                )}
              </p>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
                {stats.map((s) => (
                  <div
                    key={s.label}
                    className={`rounded-card p-3.5 text-center ring-1 ${
                      s.warn
                        ? "bg-amber-50 ring-amber-200/60 dark:bg-amber-400/10 dark:ring-amber-400/20"
                        : "bg-card-soft ring-black/[0.04]"
                    }`}
                  >
                    <p className="text-xs font-bold text-ink-sub">{s.label}</p>
                    <p
                      className={`mt-1 nowrap-num text-lg font-extrabold ${s.warn ? "text-amber-700 dark:text-amber-300" : "text-deep-800 dark:text-aqua-700"}`}
                    >
                      {s.value}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-5">
                <p className="mb-2 text-sm font-bold text-ink-soft">
                  소속 직원
                </p>
                <ul className="flex flex-wrap gap-2">
                  {branchStaff.map((s) => (
                    <li
                      key={s.id}
                      className="inline-flex items-center gap-2 rounded-full bg-card-soft px-3.5 py-2 text-sm"
                    >
                      <span className="font-semibold text-ink">{s.name}</span>
                      <Badge tone={s.role === "owner" ? "gold" : "gray"}>
                        {ROLE_LABELS[s.role]}
                      </Badge>
                    </li>
                  ))}
                </ul>
              </div>
            </Card>
          );
        })}

        <Card className="border-2 border-dashed border-stone-bg-deep bg-card-soft text-center">
          <p className="font-bold text-ink-soft">지점 추가 (고도화 예정)</p>
          <p className="mx-auto mt-1.5 max-w-md text-sm leading-relaxed text-ink-sub">
            다점포 확장 시 지점을 추가하면 지점별 고객·방문·재방문율·매출을 이
            화면에서 비교하게 됩니다. 데이터 구조는 이미 지점 단위로 설계되어
            있습니다.
          </p>
        </Card>

        {/* 확장 로드맵 — 미구현 기능임을 명확히 표시 */}
        <Card>
          <SectionTitle>운영 확장 로드맵</SectionTitle>
          <p className="-mt-2 mb-4 text-sm text-ink-sub">
            직영점 데이터 축적 → 운영 표준화 → 다점포 → 본사 통합관리 순으로
            확장할 수 있는 구조입니다. 아래 항목은 아직 제공되지 않습니다.
          </p>
          <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            {[
              {
                title: "가맹점 통합관리",
                desc: "지점별 운영지표 비교 및 통합 관리",
              },
              {
                title: "본사 표준운영 관리",
                desc: "표준 프로세스·교육 콘텐츠 배포",
              },
              {
                title: "제조 · 공급관리",
                desc: "원료 수급 및 지점 공급 현황 관리",
              },
            ].map((r) => (
              <li
                key={r.title}
                className="rounded-card border border-dashed border-stone-line bg-card-soft p-3.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-bold text-ink-soft">{r.title}</p>
                  <Badge tone="gray">고도화 예정</Badge>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-ink-sub">
                  {r.desc}
                </p>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
