"use client";

/**
 * 고객 케어 리포트 — 고객에게 직접 보여 드리는 한 장
 *
 * 화면으로 함께 보거나 종이로 뽑아 드린다.
 * 재등록 상담 자리에서 "이만큼 이용하셨습니다"를 말이 아니라 기록으로 보여주는 자료다.
 *
 * 여기에는 매장 내부 판정(우선순위 점수, 매출기회, 관리 필요 등)을 넣지 않는다.
 * 그건 매장이 일하려고 만든 분류이지 고객에게 할 말이 아니다.
 */

import { useRef } from "react";
import { useStore } from "@/lib/data/store";
import { buildCareReport } from "@/lib/scoring/care-report";
import { Customer } from "@/lib/types";
import {
  formatDateKr,
  formatDateTimeKr,
  todayISO,
} from "@/lib/utils/date";
import { Button } from "@/components/ui";
import { PrinterIcon } from "@/components/ui/icons";
import { printRegion } from "@/lib/utils/print";

function Tile({
  label,
  value,
  unit,
  caption,
}: {
  label: string;
  value: string | number;
  unit?: string;
  caption?: string;
}) {
  return (
    <div className="rounded-card bg-card-soft px-3.5 py-3 ring-1 ring-black/[0.04]">
      <p className="truncate text-xs font-bold text-ink-sub">{label}</p>
      <p className="nowrap-num mt-1 text-2xl font-extrabold tracking-tight text-ink">
        {value}
        {unit && (
          <span className="ml-0.5 text-sm font-bold text-ink-sub">{unit}</span>
        )}
      </p>
      {caption && (
        <p className="mt-0.5 truncate text-xs text-ink-faint">{caption}</p>
      )}
    </div>
  );
}

function Heading({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="mb-2 flex items-center gap-2 text-[0.8125rem] font-extrabold uppercase tracking-wider text-ink-faint">
      <span className="h-3 w-1 rounded-full bg-aqua-500" />
      {children}
    </h4>
  );
}

export default function CareReport({ customer }: { customer: Customer }) {
  const { visits, memberships, settings } = useStore();
  const r = buildCareReport(customer, visits, memberships);

  const regionRef = useRef<HTMLDivElement>(null);

  const maxMonthly = Math.max(...r.monthlyVisits.map((m) => m.count), 1);
  const hasFlow = r.monthlyVisits.some((m) => m.count > 0);

  /** 리포트만 인쇄한다 — 뒤 화면을 걷어내는 방법은 printRegion 에 적어 두었다 */
  const print = () => printRegion(regionRef.current);

  return (
    <div>
      {/* 인쇄 대상 — 이 영역만 종이에 나간다 */}
      <div ref={regionRef} className="print-region">
        {/* 머리글 */}
        <div className="mb-4 flex flex-wrap items-end justify-between gap-x-4 gap-y-2 border-b border-stone-line pb-3">
          <div className="min-w-0">
            <p className="text-[0.7rem] font-extrabold uppercase tracking-[0.12em] text-aqua-700">
              {settings.companyName} 케어 기록
            </p>
            <p className="mt-1 text-2xl font-extrabold tracking-tight text-ink">
              {/* 이 종이는 고객 본인에게 보여 드리는 것이라 이름을 가리지 않는다 */}
              {r.customer.name} 님
            </p>
          </div>
          <p className="nowrap-num shrink-0 text-sm text-ink-sub">
            기준일 {formatDateKr(todayISO())}
          </p>
        </div>

        {/* 요약 */}
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <Tile
            label="함께한 기간"
            value={r.daysSinceRegistered}
            unit="일"
            caption={`${formatDateKr(r.customer.registeredAt)} 등록`}
          />
          <Tile
            label="이용 횟수"
            value={r.visitCount}
            unit="회"
            caption={
              r.consultCount > 0 ? `상담 ${r.consultCount}회 별도` : undefined
            }
          />
          <Tile
            label="평균 이용 주기"
            value={r.avgCycleDays ?? "-"}
            unit={r.avgCycleDays ? "일" : undefined}
            caption={r.avgCycleDays ? undefined : "이용 2회부터 계산됩니다"}
          />
          <Tile
            label="이용권 잔여"
            value={r.remainingTotal}
            unit="회"
            caption={
              r.lastVisitDate ? `최근 ${formatDateKr(r.lastVisitDate)}` : undefined
            }
          />
        </div>

        {/* 이용 흐름 */}
        {hasFlow && (
          <section className="mt-5">
            <Heading>최근 6개월 이용 흐름</Heading>
            <div className="flex items-end justify-between gap-2 rounded-card bg-card-soft px-4 py-3.5 ring-1 ring-black/[0.04]">
              {r.monthlyVisits.map((m) => (
                <div
                  key={m.month}
                  className="flex min-w-0 flex-1 flex-col items-center gap-1.5"
                >
                  <span className="nowrap-num text-xs font-bold text-ink-soft">
                    {m.count > 0 ? m.count : ""}
                  </span>
                  <div className="flex h-20 w-full max-w-9 items-end rounded-lg bg-stone-bg-deep/60">
                    <div
                      className="w-full rounded-lg bg-gradient-to-t from-deep-700 to-aqua-400"
                      style={{
                        height: `${m.count > 0 ? Math.max(10, (m.count / maxMonthly) * 100) : 0}%`,
                      }}
                    />
                  </div>
                  <span className="truncate text-[0.7rem] text-ink-sub">
                    {m.month.slice(5)}월
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 집중 관리 부위 */}
        {r.parts.length > 0 && (
          <section className="mt-5">
            <Heading>집중 관리해 온 부위</Heading>
            <ul className="space-y-1.5">
              {r.parts.slice(0, 5).map((p) => (
                <li key={p.part} className="flex items-center gap-3">
                  <span className="w-20 shrink-0 truncate text-sm font-bold text-ink-soft">
                    {p.label}
                  </span>
                  <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-stone-bg-deep">
                    <span
                      className="block h-full rounded-full bg-gradient-to-r from-aqua-400 to-deep-700"
                      style={{ width: `${Math.round(p.ratio * 100)}%` }}
                    />
                  </span>
                  <span className="nowrap-num w-16 shrink-0 text-right text-sm font-bold text-ink">
                    {p.count}회
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* 이용권 */}
        {r.memberships.length > 0 && (
          <section className="mt-5">
            <Heading>이용권 현황</Heading>
            <ul className="space-y-1.5">
              {r.memberships.slice(0, 4).map((m, i) => (
                <li
                  key={`${m.programName}-${m.purchasedAt}-${i}`}
                  className="rounded-card bg-card-soft px-3.5 py-2.5 ring-1 ring-black/[0.04]"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                    <span className="min-w-0 flex-1 truncate font-bold text-ink">
                      {m.programName}
                    </span>
                    <span className="nowrap-num shrink-0 text-sm font-extrabold text-ink">
                      {m.usedCount} / {m.totalCount}회 이용
                    </span>
                  </div>
                  <span className="mt-1.5 block h-2 overflow-hidden rounded-full bg-stone-bg-deep">
                    <span
                      className={`block h-full rounded-full ${
                        m.status === "active"
                          ? "bg-gradient-to-r from-aqua-400 to-deep-700"
                          : "bg-ink-faint"
                      }`}
                      style={{ width: `${Math.round(m.progress * 100)}%` }}
                    />
                  </span>
                  <p className="nowrap-num mt-1 text-xs text-ink-sub">
                    {formatDateKr(m.purchasedAt)} 등록
                    {m.status === "active" && ` · 잔여 ${m.remainingCount}회`}
                    {m.status === "exhausted" && " · 모두 이용"}
                    {m.status === "expired" && " · 사용 기한 종료"}
                    {m.expiresAt && ` · 기한 ${formatDateKr(m.expiresAt)}`}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* 요청해 주신 것 */}
        {r.pinnedPreferences.length > 0 && (
          <section className="mt-5">
            <Heading>매번 확인하고 있는 요청</Heading>
            <ul className="flex flex-wrap gap-1.5">
              {r.pinnedPreferences.map((p, i) => (
                <li
                  key={i}
                  className="rounded-full bg-gold-soft px-3 py-1.5 text-sm font-bold text-gold-deep ring-1 ring-gold/25"
                >
                  {p.category} · {p.note}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* 남겨 주신 말씀 */}
        {r.recentReactions.length > 0 && (
          <section className="mt-5">
            <Heading>남겨 주신 말씀</Heading>
            <ul className="space-y-1.5">
              {r.recentReactions.map((x, i) => (
                <li
                  key={i}
                  className="rounded-card border-l-[3px] border-aqua-200 bg-aqua-50/60 px-3.5 py-2.5"
                >
                  <p className="text-sm leading-relaxed text-ink-soft">
                    &ldquo;{x.note}&rdquo;
                  </p>
                  <p className="nowrap-num mt-1 text-xs text-ink-faint">
                    {formatDateKr(x.date)}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* 다음 방문 */}
        {r.nextManageDate && (
          <section className="mt-5">
            <div className="rounded-card bg-gradient-to-r from-aqua-50 to-card px-4 py-3.5 ring-1 ring-aqua-200/60">
              <p className="text-[0.8125rem] font-extrabold uppercase tracking-wider text-aqua-700">
                다음 방문 예정
              </p>
              <p className="nowrap-num mt-1 text-lg font-extrabold text-ink">
                {formatDateTimeKr(r.nextManageDate, r.nextManageTime)}
              </p>
            </div>
          </section>
        )}

        {/* 맺음말 — 지어내지 않는다는 것을 분명히 해 둔다 */}
        <p className="mt-5 border-t border-stone-line pt-3 text-xs leading-relaxed text-ink-faint">
          이 기록은 {settings.companyName}에 남아 있는 방문 · 이용 내역을 그대로
          정리한 것입니다. 몸 상태에 대한 판단이나 의학적 소견이 아니며, 앞으로의
          관리 일정을 함께 정하는 데 참고하기 위한 자료입니다.
        </p>
      </div>

      {/* 조작 버튼 — 종이에는 나가지 않는다 */}
      <div className="no-print mt-5 flex flex-wrap justify-end gap-2 border-t border-stone-line pt-4">
        <Button variant="secondary" onClick={print}>
          <PrinterIcon className="h-4 w-4" />
          리포트 인쇄
        </Button>
      </div>
    </div>
  );
}
