"use client";

/**
 * Money KPI 계약 — 무엇을, 어디서, 어떻게 재는가
 * ===============================================
 *
 * Unified v3.0 §4 "CORE VALUE 3 + MONEY KPI CONTRACT".
 *
 * 성과 화면은 지금까지 "숫자가 있으면 보여 주고, 없으면 비운다" 였다.
 * 정직하지만 반쪽이다. 심사자가 묻는 것은 "숫자가 있느냐" 보다
 * **"무엇을 재기로 했고, 어디서 재고, 이전은 얼마였느냐"** 이다.
 * 이 카드는 그 약속을 화면에 박는다 — 비어 있을 때도, 차 있을 때도.
 *
 * 세 줄 규칙 (§4.2)
 *   BASELINE STATUS: 기준선이 없으면 없다고 적는다
 *   MEASUREMENT POINT: 어느 기록에서 어떻게 계산하는지 적는다
 *   TARGET: DO NOT INVENT — 개선율은 기준선과 현재값이 **둘 다** 있을 때만
 */

import Link from "next/link";
import { Badge, Button, Card, SectionTitle } from "@/components/ui";
import { DownloadIcon } from "@/components/ui/icons";
import type { AppSettings } from "@/lib/types";
import type { StageInfo } from "@/lib/stage";

export interface KpiCurrent {
  /** 방문 기록이 문턱(5건)을 넘어 지표를 계산할 수 있는가 */
  ready: boolean;
  /** 2회 이상 방문 고객 비율 (0~1) — ready 일 때만 의미 있음 */
  revisitRate?: number;
  /** 직원 1인당 관리 고객 수 */
  customersPerStaff?: number;
  customers: number;
  staff: number;
}

type Row = {
  kind: "COST" | "REVENUE" | "SCALE";
  kindLabel: string;
  name: string;
  where: string;
  current: string;
  currentTone: "ok" | "wait";
  baseline: string;
  baselineKnown: boolean;
  delta: string;
};

const fmtPct = (v: number) => `${Math.round(v * 100)}%`;

export default function KpiContract({
  settings,
  current,
  stage,
  onExport,
}: {
  settings: AppSettings;
  current: KpiCurrent;
  stage: StageInfo;
  onExport: () => void;
}) {
  const b = settings.baseline ?? {};
  const asOf = b.asOf ? ` (${b.asOf} 기준)` : "";

  /*
    개선율은 기준선과 현재값이 둘 다 있고, 현재값이 실제 기록에서 나온
    것일 때만 적는다. 시연 자료(DEMO)에서는 둘 다 있어도 적지 않는다 —
    지어낸 숫자로 개선율을 꾸미면 §4.2 P0 FAIL 이다.
  */
  const mayDelta = current.ready && stage.canClaimResults;

  const rows: Row[] = [
    {
      kind: "COST",
      kindLabel: "비용 · 시간",
      name: "고객 1명 관리에 드는 시간",
      where:
        "실행 브리핑의 과제 처리 시각 · 방문 기록 시각에서 계산. 전화·확인·수기 정리에 쓰던 시간이 줄었는지 봅니다.",
      current: "측정 구조 준비됨 — 실운영 4주 뒤부터 계산",
      currentTone: "wait",
      baseline:
        b.minutesPerCustomerWeek !== undefined
          ? `주 ${b.minutesPerCustomerWeek}분/명${asOf}`
          : "기준선 없음",
      baselineKnown: b.minutesPerCustomerWeek !== undefined,
      delta: "계산하지 않음 (현재값 미측정)",
    },
    {
      kind: "REVENUE",
      kindLabel: "매출 · 고객",
      name: "재방문율 · 이용권 재등록",
      where:
        "방문 기록에서 2회 이상 오신 분의 비율, 이용권 소진 뒤 재등록까지 걸린 날. 예상 매출은 만들지 않습니다.",
      current: current.ready
        ? `재방문율 ${fmtPct(current.revisitRate ?? 0)}`
        : "축적 중 — 방문 기록 5건부터 계산",
      currentTone: current.ready ? "ok" : "wait",
      baseline:
        b.monthlyRevisitCustomers !== undefined || b.renewalGapDays !== undefined
          ? [
              b.monthlyRevisitCustomers !== undefined
                ? `월 재방문 ${b.monthlyRevisitCustomers}명`
                : null,
              b.renewalGapDays !== undefined ? `재등록까지 ${b.renewalGapDays}일` : null,
            ]
              .filter(Boolean)
              .join(" · ") + asOf
          : "기준선 없음",
      baselineKnown:
        b.monthlyRevisitCustomers !== undefined || b.renewalGapDays !== undefined,
      // 기준선(명 · 일)과 현재값(비율)의 단위가 달라 비율 개선율을 그대로
      // 적지 않는다 — 월 재방문 인원은 실운영 후 같은 단위로 다시 센다.
      delta: mayDelta
        ? "같은 단위(월 재방문 인원)로 실운영 후 비교"
        : "계산하지 않음",
    },
    {
      kind: "SCALE",
      kindLabel: "확장 · 처리량",
      name: "직원 1인당 관리 고객 수",
      where:
        "고객 명부 수 ÷ 직원 수. 사람을 비례해서 늘리지 않고 고객을 더 맡을 수 있는지 봅니다.",
      current:
        current.staff > 0
          ? `${current.customersPerStaff}명 / 직원 1인 (고객 ${current.customers} · 직원 ${current.staff})`
          : "직원 등록 후 계산",
      currentTone: current.staff > 0 ? "ok" : "wait",
      baseline:
        b.customersBefore !== undefined && b.staffBefore !== undefined && b.staffBefore > 0
          ? `${Math.round(b.customersBefore / b.staffBefore)}명 / 직원 1인${asOf}`
          : "기준선 없음",
      baselineKnown:
        b.customersBefore !== undefined && b.staffBefore !== undefined && b.staffBefore > 0,
      delta:
        mayDelta &&
        current.staff > 0 &&
        b.customersBefore !== undefined &&
        b.staffBefore !== undefined &&
        b.staffBefore > 0
          ? (() => {
              const before = b.customersBefore! / b.staffBefore!;
              const now = current.customers / current.staff;
              const d = Math.round(((now - before) / before) * 100);
              return `${d >= 0 ? "+" : ""}${d}% (기준선 대비)`;
            })()
          : "계산하지 않음 (기준선 또는 현재값 없음)",
    },
  ];

  const anyBaseline = rows.some((r) => r.baselineKnown);

  return (
    <Card dataTour="kpi-contract">
      <SectionTitle
        tone="aqua"
        action={
          <Button variant="secondary" size="sm" onClick={onExport}>
            <DownloadIcon className="h-4 w-4" />
            증적 내보내기
          </Button>
        }
      >
        무엇을 재기로 했나 — Money KPI 3
      </SectionTitle>

      <p className="mb-3 text-[0.9375rem] leading-relaxed text-ink-sub">
        성과는 이 셋으로 셉니다. 어느 기록에서 어떻게 계산하는지를 미리 적어
        두고, <b className="text-ink">기준선과 현재값이 둘 다 있을 때만</b>{" "}
        개선율을 적습니다. 없으면 없다고 적습니다.
      </p>

      {/*
        단계 고지 — 시연 자료면 개선율은 절대 적지 않는다는 것을 표에
        들어가기 전에 말한다.
      */}
      <p className="mb-4 flex flex-wrap items-center gap-2 text-[0.8125rem] text-ink-faint">
        <Badge tone={stage.tone} dot>
          {stage.label}
        </Badge>
        <span>
          {stage.canClaimResults
            ? "실제 기록입니다."
            : "시연 자료입니다 — 개선율을 계산하지 않습니다."}
        </span>
      </p>

      <ul className="space-y-2.5">
        {rows.map((r) => (
          <li
            key={r.kind}
            className="rounded-card bg-card-soft px-4 py-3.5 ring-1 ring-stone-line"
          >
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="nowrap-num rounded-full bg-stone-bg-deep px-2 py-0.5 text-[0.6875rem] font-extrabold tracking-wider text-ink-sub">
                {r.kind}
              </span>
              <span className="text-[0.75rem] font-bold text-ink-faint">{r.kindLabel}</span>
              <span className="text-[1rem] font-extrabold text-ink">{r.name}</span>
            </div>
            <dl className="mt-2 grid grid-cols-1 gap-x-4 gap-y-1.5 text-[0.875rem] sm:grid-cols-[6.5rem_1fr]">
              <dt className="font-bold text-ink-faint">측정 지점</dt>
              <dd className="leading-relaxed text-ink-sub">{r.where}</dd>
              <dt className="font-bold text-ink-faint">현재값</dt>
              <dd
                className={`tabular-nums font-bold leading-relaxed ${
                  r.currentTone === "ok" ? "text-ink" : "text-ink-sub"
                }`}
              >
                {r.current}
              </dd>
              <dt className="font-bold text-ink-faint">기준선</dt>
              <dd className="tabular-nums leading-relaxed">
                {r.baselineKnown ? (
                  <span className="font-bold text-ink">{r.baseline}</span>
                ) : (
                  <span className="text-warn-text">
                    BASELINE STATUS: UNKNOWN —{" "}
                    <Link
                      href="/settings#set-baseline"
                      className="tap-line font-bold underline underline-offset-2"
                    >
                      설정에서 도입 전 값 입력
                    </Link>
                  </span>
                )}
              </dd>
              <dt className="font-bold text-ink-faint">개선율</dt>
              <dd className="tabular-nums leading-relaxed text-ink-sub">{r.delta}</dd>
            </dl>
          </li>
        ))}
      </ul>

      {!anyBaseline && (
        <p className="mt-3 text-[0.8125rem] leading-relaxed text-ink-faint">
          도입 전 값은 시스템에 없습니다 — 수기로 운영하던 때라서요. 기억하는
          만큼만 적어 두면, 실운영 뒤 같은 단위로 다시 재서 비교합니다.
          지어내서 채우지 않습니다.
        </p>
      )}
    </Card>
  );
}
