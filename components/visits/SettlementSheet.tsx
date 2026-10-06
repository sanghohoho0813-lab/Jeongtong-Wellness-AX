"use client";

/**
 * 마감 정산 한 장 — 하루치 방문 · 상담 · 이용권 · 받은 돈
 *
 * 계산은 lib/scoring/settlement.ts. 여기서는 보여 주고, 인쇄하고, CSV 로 내보낸다.
 * 날짜는 ◀ ▶ 로 넘긴다 — 어제 정산을 오늘 아침에 확인하는 일이 실제로 많다.
 * 이름은 화면 공유 모드 규칙을 그대로 따른다 (종이 · 파일에도).
 */

import { useMemo, useRef } from "react";
import { useStore } from "@/lib/data/store";
import { displayName, formatWon } from "@/lib/utils/format";
import { formatDateKr, todayISO } from "@/lib/utils/date";
import { downloadFile, toCsv } from "@/lib/utils/export";
import { printRegion } from "@/lib/utils/print";
import {
  type SettlementLine,
  clock,
  computeSettlement,
  settlementCsvRows,
} from "@/lib/scoring/settlement";
import { Button } from "@/components/ui";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  DownloadIcon,
  PrinterIcon,
} from "@/components/ui/icons";

const WEEK = ["일", "월", "화", "수", "목", "금", "토"];

export function shiftDay(day: string, by: number): string {
  const d = new Date(`${day}T00:00:00`);
  d.setDate(d.getDate() + by);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export default function SettlementSheet({
  day,
  onDayChange,
}: {
  day: string;
  onDayChange: (day: string) => void;
}) {
  const { visits, memberships, staff, customers, settings, privacyMode } = useStore();
  const regionRef = useRef<HTMLDivElement>(null);
  const s = useMemo(
    () => computeSettlement(day, visits, memberships, staff),
    [day, visits, memberships, staff],
  );
  const today = todayISO();
  const name = (id: string) =>
    displayName(customers.find((c) => c.id === id)?.name ?? "삭제된 고객", privacyMode);
  const staffName = (id?: string) => staff.find((x) => x.id === id)?.name ?? "미지정";
  const week = WEEK[new Date(`${day}T00:00:00`).getDay()];
  const empty = s.records.length === 0 && s.sold.length === 0;

  const exportCsv = () => {
    const { headers, rows } = settlementCsvRows(s, name, staffName);
    downloadFile(`마감정산_${day}.csv`, toCsv(headers, rows));
  };

  return (
    <div className="space-y-4">
      <div className="no-print flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => onDayChange(shiftDay(day, -1))}
          aria-label="전날"
          className="touch-target flex h-11 w-11 shrink-0 items-center justify-center rounded-btn bg-card-soft ring-1 ring-stone-line hover:bg-aqua-50"
        >
          <ChevronLeftIcon className="h-5 w-5" />
        </button>
        {/* 좁은 폰 + 큰 글씨에서는 「오늘」 이 아랫줄로 — 화살표를 밀어내지 않는다 */}
        <p className="min-w-0 flex-1 text-center text-lg font-extrabold leading-snug text-ink">
          <span className="nowrap-num">
            {formatDateKr(day)} ({week})
          </span>{" "}
          {day === today && <span className="inline-block text-aqua-700 dark:text-aqua-400">오늘</span>}
        </p>
        <button
          type="button"
          onClick={() => onDayChange(shiftDay(day, 1))}
          disabled={day >= today}
          aria-label="다음 날"
          className="touch-target flex h-11 w-11 shrink-0 items-center justify-center rounded-btn bg-card-soft ring-1 ring-stone-line hover:bg-aqua-50 disabled:opacity-40"
        >
          <ChevronRightIcon className="h-5 w-5" />
        </button>
      </div>

      <div ref={regionRef} className="print-region space-y-4" data-settlement={day}>
        <p className="print-only hidden text-lg font-extrabold">
          {settings.companyName} {settings.branchName} · 마감 정산 {formatDateKr(day)} ({week})
        </p>

        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          <div className="col-span-2 sm:col-span-1">
            <Money label="받은 돈 합계" value={s.total} strong />
          </div>
          <Money label="현장 결제" value={s.onSite} />
          <Money label="이용권 판매" value={s.passSales} />
        </div>
        <p className="text-[0.9375rem] font-bold text-ink-soft" data-settlement-counts>
          {[
            `방문 ${s.visits}`,
            `상담 ${s.consults}`,
            `이용권 차감 ${s.passUses}회`,
            s.sold.length > 0 ? `이용권 판매 ${s.sold.length}건` : "",
          ]
            .filter(Boolean)
            .map((t, i) => (
              <span key={t} className="nowrap-num">
                {i > 0 ? " · " : ""}
                {t}
              </span>
            ))}
        </p>

        {empty ? (
          <p className="rounded-card border border-dashed border-stone-line bg-card-soft py-8 text-center text-[0.9375rem] text-ink-sub">
            이날은 방문 기록과 이용권 판매가 없습니다.
          </p>
        ) : (
          <>
            {s.byStaff.length > 0 && <LineTable title="담당별" lines={s.byStaff} />}
            {s.byProgram.length > 0 && <LineTable title="프로그램별" lines={s.byProgram} />}

            {s.records.length > 0 && (
              <section>
                <h3 className="mb-1.5 text-[0.9375rem] font-extrabold text-ink">기록</h3>
                <ul className="divide-y divide-stone-line rounded-card ring-1 ring-stone-line">
                  {s.records.map((v) => (
                    <li key={v.id} className="flex flex-wrap items-baseline gap-x-2.5 px-3.5 py-2.5 text-[0.9375rem]">
                      <span className="nowrap-num w-12 shrink-0 font-bold text-ink-sub">{clock(v.visitedAt)}</span>
                      <span className="min-w-0 break-words font-extrabold text-ink">{name(v.customerId)}</span>
                      <span className="text-ink-sub">
                        {v.type === "consult" ? "상담" : v.programName || "프로그램 미기재"} · {staffName(v.staffId)}
                      </span>
                      <span className="nowrap-num ml-auto font-bold text-ink">
                        {[v.membershipId ? "이용권 1회" : "", v.amount ? formatWon(v.amount) : ""]
                          .filter(Boolean)
                          .join(" · ") || "—"}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {s.sold.length > 0 && (
              <section>
                <h3 className="mb-1.5 text-[0.9375rem] font-extrabold text-ink">이용권 판매</h3>
                <ul className="divide-y divide-stone-line rounded-card ring-1 ring-stone-line">
                  {s.sold.map((m) => (
                    <li key={m.id} className="flex flex-wrap items-baseline gap-x-2.5 px-3.5 py-2.5 text-[0.9375rem]">
                      <span className="min-w-0 break-words font-extrabold text-ink">{name(m.customerId)}</span>
                      <span className="text-ink-sub">{m.programName}</span>
                      <span className="nowrap-num ml-auto font-bold text-ink">{formatWon(m.price ?? 0)}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}
        <p className="text-[0.8125rem] text-ink-sub">
          금액은 기록에 적은 그대로입니다 (반올림 없음). 카드 · 현금은 적는 칸이 없어 나누지 않았습니다.
        </p>
      </div>

      <div className="no-print flex flex-wrap justify-end gap-2 border-t border-stone-line pt-4">
        <Button variant="secondary" onClick={exportCsv} disabled={empty}>
          <DownloadIcon className="h-4 w-4" />
          CSV 받기
        </Button>
        <Button onClick={() => printRegion(regionRef.current)} disabled={empty}>
          <PrinterIcon className="h-4 w-4" />
          인쇄
        </Button>
      </div>
    </div>
  );
}

function Money({ label, value, strong }: { label: string; value: number; strong?: boolean }) {
  return (
    <div
      className={`min-w-0 rounded-card p-3.5 ring-1 ${
        strong ? "bg-aqua-50 ring-aqua-200" : "bg-card-soft ring-stone-line"
      }`}
    >
      <p className="text-[0.875rem] font-bold text-ink-sub">{label}</p>
      {/* 폰 반 칸에 1,350,000원 까지 들어가게 — 작은 칸 둘은 한 단계 작게 */}
      <p className={`nowrap-num mt-0.5 font-extrabold text-ink ${strong ? "text-2xl" : "text-lg sm:text-xl"}`}>
        {formatWon(value)}
      </p>
    </div>
  );
}

/**
 * 담당별 · 프로그램별 — 표가 아니라 줄로 쌓는다.
 * 다섯 칸짜리 표는 좁은 폰 + 큰 글씨에서 금액 칸이 잘렸다. 이름 한 줄,
 * 숫자 한 줄로 두면 자리가 모자랄 때 줄이 바뀔 뿐 잘리는 숫자가 없다.
 */
function LineTable({ title, lines }: { title: string; lines: SettlementLine[] }) {
  return (
    <section>
      <h3 className="mb-1.5 text-[0.9375rem] font-extrabold text-ink">{title}</h3>
      <ul className="divide-y divide-stone-line rounded-card ring-1 ring-stone-line">
        {lines.map((l) => (
          <li key={l.key} className="flex flex-wrap items-baseline gap-x-3 px-3.5 py-2.5 text-[0.9375rem]">
            <span className="min-w-0 break-words font-extrabold text-ink">{l.label}</span>
            <span className="text-ink-sub">
              {[
                l.visits ? `방문 ${l.visits}` : "",
                l.consults ? `상담 ${l.consults}` : "",
                l.passUses ? `이용권 ${l.passUses}회` : "",
              ]
                .filter(Boolean)
                .join(" · ")}
            </span>
            <span className="nowrap-num ml-auto font-bold text-ink">{formatWon(l.amount)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
