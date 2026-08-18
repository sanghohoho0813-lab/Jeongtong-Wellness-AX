"use client";

/**
 * 지점 / 운영 — HQ → Branch → Staff 구조.
 * 현재 1개 지점이지만 지점 추가만 하면 동일 운영구조를 쓸 수 있는 기반.
 */

import PageHeader from "@/components/layout/PageHeader";
import { useStore } from "@/lib/data/store";
import { calcAxSummary, calcMonthlyMetrics } from "@/lib/scoring/metrics";
import { formatKrw, formatPercent } from "@/lib/utils/format";
import { Badge, Card, SectionTitle } from "@/components/ui";
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
  } = useStore();

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

          const stats = [
            { label: "고객 수", value: `${summary.totalCustomers}명` },
            { label: "직원 수", value: `${branchStaff.length}명` },
            {
              label: "이번 달 방문",
              value: `${thisMonth.visitCount}건`,
            },
            { label: "재방문율", value: formatPercent(summary.revisitRate) },
            {
              label: "관리대상 고객",
              value: `${branchTasks.filter((t) => t.status === "pending" || t.status === "confirmed").length}명`,
            },
            { label: "이번 달 매출", value: formatKrw(thisMonth.revenue) },
          ];

          return (
            <Card key={branch.id}>
              <SectionTitle
                action={<Badge tone="aqua">운영 중</Badge>}
              >
                <span className="inline-flex items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-aqua-50 text-aqua-700">
                    <BuildingIcon className="h-5 w-5" />
                  </span>
                  {settings.companyName} {branch.name}
                </span>
              </SectionTitle>
              <p className="-mt-1 mb-4 text-sm text-ink-sub">
                영업시간 {branch.openHours ?? settings.openHours} · 관리자{" "}
                {settings.ownerName}
              </p>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
                {stats.map((s) => (
                  <div
                    key={s.label}
                    className="rounded-card bg-card-soft p-3.5 text-center ring-1 ring-black/[0.04]"
                  >
                    <p className="text-xs font-bold text-ink-sub">{s.label}</p>
                    <p className="mt-1 nowrap-num text-lg font-extrabold text-deep-800">
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
      </div>
    </div>
  );
}
