"use client";

import { useStore } from "@/lib/data/store";
import { calcDashboardKpis } from "@/lib/scoring/metrics";
import { formatKrw } from "@/lib/utils/format";
import { KpiCard } from "@/components/ui";
import {
  CalendarIcon,
  LeafIcon,
  TrendUpIcon,
  UsersIcon,
} from "@/components/ui/icons";

export default function KpiRow() {
  const { customers, visits, memberships, settings } = useStore();
  const kpis = calcDashboardKpis(
    customers,
    visits,
    memberships,
    settings.careRules,
  );

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
      <KpiCard
        label="오늘 신규 상담"
        value={kpis.todayNewConsults}
        unit="명"
        icon={<UsersIcon className="h-6 w-6" />}
      />
      <KpiCard
        label="재방문 예정 고객"
        value={kpis.revisitDueCount}
        unit="명"
        icon={<CalendarIcon className="h-6 w-6" />}
      />
      <KpiCard
        label="오늘 방문 완료"
        value={kpis.todayVisits}
        unit="건"
        icon={<LeafIcon className="h-6 w-6" />}
      />
      <KpiCard
        label="월 매출 (누적)"
        value={formatKrw(kpis.monthRevenue)}
        icon={<TrendUpIcon className="h-6 w-6" />}
      />
    </div>
  );
}
