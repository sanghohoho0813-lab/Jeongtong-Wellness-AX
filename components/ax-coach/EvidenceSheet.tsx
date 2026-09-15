"use client";

/**
 * 실증 리포트 — 손에 들고 나갈 한 장
 * ==================================
 *
 * 증적 CSV 는 검산용이다. 엑셀을 열어 700줄을 읽을 사람은 심사장에
 * 없다. 그 자리에서 필요한 것은 **A4 한 장**이다 — 무엇을 재기로 했고,
 * 지금 어디까지 왔고, 그 숫자가 어느 기록에서 나왔는지.
 *
 * 꾸미지 않기 위한 규칙
 * ---------------------
 * · 이 종이에 새로 계산하는 값은 없다. 화면이 쓰는 함수를 그대로 쓴다
 *   (같은 사실을 두 군데서 다르게 세면 둘 다 못 믿는다)
 * · 비어 있는 칸은 비어 있다고 적는다. 「아직 측정 전」 · 「기준선 없음」
 * · 시연 자료면 종이 맨 위에 시연 자료라고 박는다. 종이는 화면과 달리
 *   맥락 없이 돌아다니므로, 그 한 줄이 없으면 나중에 실적으로 읽힌다
 */

import { useRef } from "react";
import { Button } from "@/components/ui";
import { PrinterIcon } from "@/components/ui/icons";
import { printRegion } from "@/lib/utils/print";
import { formatDateKr, todayISO } from "@/lib/utils/date";
import type { AppSettings } from "@/lib/types";
import type { CoachReport } from "@/lib/ax-coach/report";
import type { CoachMissionLog, CoverageResult } from "@/lib/ax-coach/types";

const MISSION_LABEL: Record<string, string> = {
  visit_record: "오늘 오신 고객 기록하기",
  briefing_action: "오늘 챙길 고객 연락하기",
  task_outcome: "처리 결과 남기기",
  consult_followup: "상담 후 미예약 고객 챙기기",
  membership_care: "이용권 잔여 임박 고객 확인",
  request_handle: "고객 요청 처리하기",
  portal_invite: "고객에게 MY WELLNESS 안내",
};

export default function EvidenceSheet({
  settings,
  coverage,
  report,
  missions,
  isDemo,
  stageLabel,
}: {
  settings: AppSettings;
  coverage: CoverageResult;
  report: CoachReport;
  missions: CoachMissionLog[];
  isDemo: boolean;
  stageLabel: string;
}) {
  const regionRef = useRef<HTMLDivElement>(null);
  const b = settings.baseline ?? {};

  /** 최근 14일에 낸 오늘 할 일 — 발행과 충족을 나란히 */
  const recent = [...missions]
    .sort((a, m) => m.issuedAt.localeCompare(a.issuedAt))
    .slice(0, 12);
  const verified = recent.filter((m) => m.verifiedAt).length;

  const baselineRows = [
    ["월평균 재방문 인원", b.monthlyRevisitCustomers, "명"],
    ["이용권 소진 뒤 재등록까지", b.renewalGapDays, "일"],
    ["월평균 이용권 판매", b.monthlyMembershipSales, "건"],
    ["고객 1명 관리 시간(주)", b.minutesPerCustomerWeek, "분"],
    ["도입 전 고객 수", b.customersBefore, "명"],
    ["도입 전 직원 수", b.staffBefore, "명"],
  ] as const;
  const hasBaseline = baselineRows.some(([, v]) => v !== undefined);

  return (
    <div>
      <div className="no-print mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[0.9375rem] leading-relaxed text-ink-sub">
          A4 한 장으로 나갑니다. 화면이 쓰는 값을 그대로 적고, 비어 있는
          칸은 비어 있다고 적습니다.
        </p>
        <Button onClick={() => printRegion(regionRef.current)} size="lg">
          <PrinterIcon className="h-5 w-5" />
          인쇄하기
        </Button>
      </div>

      <div ref={regionRef} className="print-region">
        {/* 머리글 */}
        <div className="mb-4 border-b border-stone-line pb-3">
          <p className="text-[0.7rem] font-extrabold uppercase tracking-[0.12em] text-aqua-700">
            {settings.companyName} {settings.branchName} · AX 실증 리포트
          </p>
          <p className="nowrap-num mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="text-2xl font-extrabold tracking-tight text-ink">
              실증 준비도{" "}
              {coverage.overall === null ? "아직 측정 전" : `${coverage.overall}%`}
            </span>
            <span className="text-sm text-ink-sub">
              기준일 {formatDateKr(todayISO())}
              {settings.axOwner ? ` · AX 담당 ${settings.axOwner}` : ""}
            </span>
          </p>
          {/*
            종이는 맥락 없이 돌아다닌다. 시연 자료라는 사실이 이 한 줄에
            없으면 몇 달 뒤 누군가 이것을 실적으로 읽는다.
          */}
          <p
            className={`mt-2 rounded-card px-3 py-1.5 text-[0.8125rem] font-bold ${
              isDemo
                ? "bg-gold-soft text-gold-deep ring-1 ring-gold/25"
                : "bg-aqua-50 text-aqua-800 ring-1 ring-aqua-200"
            }`}
          >
            {stageLabel} ·{" "}
            {isDemo
              ? "지어낸 견본 자료로 센 숫자입니다. 실제 성과가 아닙니다."
              : "실제 매장 기록으로 센 숫자입니다."}
          </p>
        </div>

        {/* 1. 네 영역 */}
        <Section title="1. 무엇이 얼마나 쌓였나">
          <table className="w-full border-collapse text-[0.875rem]">
            <thead>
              <tr className="border-b border-stone-line text-left text-ink-sub">
                <th className="py-1.5 font-bold">영역</th>
                <th className="py-1.5 font-bold">준비도</th>
                <th className="py-1.5 font-bold">센 근거</th>
              </tr>
            </thead>
            <tbody>
              {coverage.areas.map((a) => (
                <tr key={a.area} className="border-b border-stone-line/60 align-top">
                  <td className="py-1.5 pr-3 font-bold text-ink">{a.label}</td>
                  <td className="nowrap-num py-1.5 pr-3 font-extrabold text-ink">
                    {a.percent === null ? "아직 측정 전" : `${a.percent}%`}
                  </td>
                  <td className="py-1.5 leading-relaxed text-ink-sub">
                    {a.detail}
                    {a.unmeasurableReason ? ` — ${a.unmeasurableReason}` : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-[0.8125rem] leading-relaxed text-ink-sub">
            준비도는 「실제 건수 ÷ 목표 건수」 입니다. 목표를 함께 적어
            두었으므로 그대로 검산하실 수 있습니다. 잴 수 없는 영역은 0%가
            아니라 「아직 측정 전」으로 적습니다.
          </p>
        </Section>

        {/* 2. 최근 기간 */}
        <Section title={`2. 최근 ${report.days}일에 실제로 일어난 일`}>
          <ul className="grid grid-cols-2 gap-x-6 gap-y-1 text-[0.875rem] sm:grid-cols-3">
            <Row label="시스템 사용일" value={`${report.activeDays}일`} />
            <Row label="새 방문 · 상담 기록" value={`${report.newVisits}건`} />
            <Row label="실제 고객관리 행동" value={`${report.actions}건`} />
            <Row label="관리 후 재방문 확인" value={`${report.resultsConfirmed}건`} />
            <Row label="고객이 남긴 요청" value={`${report.customerRequests}건`} />
            <Row label="오늘 할 일 충족" value={`${report.missionsVerified}건`} />
          </ul>
          <p className="mt-2 text-[0.8125rem] leading-relaxed text-ink-sub">
            「관리 후 재방문 확인」 은 고객을 챙긴 뒤 30일 안에 실제 방문
            기록이 있었다는 뜻입니다. 관리가 재방문을 만들었다는 뜻은
            아니며, 일어난 순서만 적습니다.
          </p>
        </Section>

        {/* 3. 도입 전 기준선 */}
        <Section title="3. 도입 전 기준선">
          {hasBaseline ? (
            <>
              <ul className="grid grid-cols-2 gap-x-6 gap-y-1 text-[0.875rem] sm:grid-cols-3">
                {baselineRows
                  .filter(([, v]) => v !== undefined)
                  .map(([label, v, unit]) => (
                    <Row key={label} label={label} value={`${v}${unit}`} />
                  ))}
              </ul>
              <p className="mt-2 text-[0.8125rem] leading-relaxed text-ink-sub">
                출처: 수기 기준선{b.asOf ? ` (${b.asOf} 기준)` : ""}
                {b.note ? ` — ${b.note}` : ""}. 수기 운영 시절 자료라
                시스템에 없던 값이며, 대표가 기억하는 만큼만 적은 것입니다.
              </p>
            </>
          ) : (
            <p className="text-[0.875rem] leading-relaxed text-warn-text">
              도입 전 값이 아직 입력되지 않았습니다 (BASELINE STATUS:
              UNKNOWN). 지어내지 않고 비워 둡니다 — 값이 들어오면 같은
              단위로 다시 재서 나란히 놓습니다.
            </p>
          )}
        </Section>

        {/* 4. 오늘 할 일 이력 */}
        <Section title="4. 무엇을 하자고 했고, 무엇이 실제로 생겼나">
          {recent.length === 0 ? (
            <p className="text-[0.875rem] text-ink-sub">
              아직 발행된 오늘 할 일이 없습니다.
            </p>
          ) : (
            <>
              <p className="mb-2 nowrap-num text-[0.875rem] text-ink-sub">
                최근 {recent.length}건 중 <b className="text-ink">{verified}건</b>이
                실제 기록으로 충족되었습니다.
              </p>
              <table className="w-full border-collapse text-[0.875rem]">
                <thead>
                  <tr className="border-b border-stone-line text-left text-ink-sub">
                    <th className="py-1.5 font-bold">발행</th>
                    <th className="py-1.5 font-bold">하자고 한 일</th>
                    <th className="py-1.5 font-bold">충족</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((m) => (
                    <tr key={m.id} className="border-b border-stone-line/60">
                      <td className="nowrap-num py-1.5 pr-3 text-ink-sub">
                        {m.issuedAt.slice(5, 10).replace("-", ".")}
                      </td>
                      <td className="py-1.5 pr-3 text-ink">
                        {MISSION_LABEL[m.type] ?? m.type}
                      </td>
                      <td className="nowrap-num py-1.5 font-bold">
                        {m.verifiedAt ? (
                          <span className="text-aqua-800">
                            확인됨 {m.verifiedAt.slice(5, 10).replace("-", ".")}
                          </span>
                        ) : (
                          <span className="text-ink-sub">미확인</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-2 text-[0.8125rem] leading-relaxed text-ink-sub">
                충족은 사람이 누른 것이 아니라 실제 기록(방문 저장 · 과제
                처리 · 고객 요청)에서 찾은 것입니다. 충족되지 않은 것도
                그대로 적습니다.
              </p>
            </>
          )}
        </Section>

        <p className="mt-4 border-t border-stone-line pt-2 text-[0.75rem] leading-relaxed text-ink-faint">
          이 종이의 모든 숫자는 저장된 기록에서 계산한 것입니다. 예상 매출 ·
          AI 확률 · 개선율을 만들어 적지 않습니다. 줄 단위 원본이 필요하시면
          AX 도입성과 화면의 「증적 내보내기」 로 표 전체를 받으실 수 있습니다.
        </p>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-4">
      <h3 className="mb-1.5 text-[1rem] font-extrabold text-ink">{title}</h3>
      {children}
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <li className="flex items-baseline justify-between gap-2 border-b border-stone-line/60 py-1">
      <span className="text-ink-sub">{label}</span>
      <span className="nowrap-num font-extrabold text-ink">{value}</span>
    </li>
  );
}
