"use client";

import { useStore } from "@/lib/data/store";
import { calcDashboardKpis, calcMonthlyMetrics } from "@/lib/scoring/metrics";
import { daysAgo } from "@/lib/utils/date";
import { formatKrw } from "@/lib/utils/format";
import { KpiCard, MiniBars } from "@/components/ui";
import CountUp from "@/components/ui/CountUp";
import {
  CalendarIcon,
  LeafIcon,
  SparkIcon,
  TrendUpIcon,
  UsersIcon,
} from "@/components/ui/icons";

export default function KpiRow() {
  const { customers, visits, memberships, settings, isManager, briefingTasks } =
    useStore();
  const kpis = calcDashboardKpis(
    customers,
    visits,
    memberships,
    settings.careRules,
  );
  const monthly = calcMonthlyMetrics(customers, visits, memberships, 6);

  // 보조 지표 (모두 실데이터)
  const consults7d = visits.filter(
    (v) => v.type === "consult" && daysAgo(v.visitedAt) <= 7,
  ).length;
  const overdue = customers.filter(
    (c) => c.nextManageDate && daysAgo(c.nextManageDate) > 0,
  ).length;
  const visits7d = visits.filter(
    (v) => v.type === "visit" && daysAgo(v.visitedAt) <= 7,
  ).length;
  const openTasks = briefingTasks.filter(
    (t) => t.status === "pending" || t.status === "confirmed",
  ).length;
  const doneTasks = briefingTasks.filter((t) => t.status === "done").length;

  return (
    <div className="rise-stagger grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
      <KpiCard
        label="오늘 신규 상담"
        value={<CountUp value={kpis.todayNewConsults} />}
        unit="명"
        sub={`최근 7일 상담 ${consults7d}건`}
        icon={<UsersIcon className="h-5 w-5" />}
        tint="sky"
      />
      <KpiCard
        label="재방문 예정 고객"
        value={<CountUp value={kpis.revisitDueCount} />}
        unit="명"
        sub={
          overdue > 0 ? (
            <span className="font-bold text-danger">
              관리일 경과 {overdue}명
            </span>
          ) : (
            "관리일 경과 없음"
          )
        }
        icon={<CalendarIcon className="h-5 w-5" />}
        tint="aqua"
      />
      <KpiCard
        label="오늘 방문 완료"
        value={<CountUp value={kpis.todayVisits} />}
        unit="건"
        sub={`최근 7일 방문 ${visits7d}건`}
        icon={<LeafIcon className="h-5 w-5" />}
        tint="emerald"
      />
      {isManager ? (
        <KpiCard
          label="월 매출 (누적)"
          value={
            <CountUp value={kpis.monthRevenue} format={(n) => formatKrw(n)} />
          }
          sub="최근 6개월 추이"
          chart={<MiniBars values={monthly.map((m) => m.revenue)} />}
          icon={<TrendUpIcon className="h-5 w-5" />}
          tint="amber"
        />
      ) : (
        // 직원 계정: 매출 대신 오늘의 관리 대상 표시
        <KpiCard
          label="오늘 관리 대상"
          value={<CountUp value={openTasks} />}
          unit="명"
          sub={`처리완료 ${doneTasks}건`}
          icon={<SparkIcon className="h-5 w-5" />}
          tint="violet"
        />
      )}
    </div>
  );
}
