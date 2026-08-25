"use client";

/**
 * 예약 — 다음에 언제 가는가
 * ==========================
 *
 * 이 화면에서 예약이 **확정되지 않는다.** 그 사실을 감추지 않고 맨 위에 적는다.
 * 매장은 전화로 일정을 잡고, 여기서 하는 일은 "이 날 가고 싶습니다" 를
 * 남겨 두는 것이다. 확정된 것처럼 보이게 만들면 고객은 오지 않을 날에
 * 옷을 갈아입고 기다린다.
 *
 * '다음 방문 예정' 은 매장이 잡아 둔 다음 관리 예정일을 그대로 보여 준다.
 * 새 테이블을 만들지 않았다 — 직원이 고객 상세에서 그 날짜를 바꾸면
 * 이 화면이 같이 바뀐다. 한 사실은 한 군데에만 둔다.
 */

import Link from "next/link";
import { usePortal } from "@/lib/portal/store";
import { nextReference, summarizeUsage } from "@/lib/portal/wellness";
import { Badge, Button, Card } from "@/components/ui";
import { CalendarIcon, ChevronRightIcon, PhoneIcon } from "@/components/ui/icons";
import { daysAgo, formatDateKr, formatRelative } from "@/lib/utils/date";

const SLOT_LABEL: Record<string, string> = {
  morning: "오전",
  afternoon: "오후",
  evening: "저녁",
};

const STATUS: Record<string, { label: string; tone: "gray" | "positive" | "aqua" }> = {
  open: { label: "확인 중", tone: "aqua" },
  handled: { label: "매장 확인함", tone: "positive" },
  closed: { label: "종료", tone: "gray" },
};

export default function MyBooking() {
  const { customer, branch, visits, requests } = usePortal();
  const usage = summarizeUsage(visits);
  const next = nextReference(usage, customer?.nextManageDate);

  const bookings = requests.filter((r) => r.kind === "booking");
  const pastVisits = visits.filter((v) => v.type === "visit").slice(0, 5);

  /** 예정일이 지났는지 — 지났으면 문구를 바꾼다 */
  const overdue = next.date ? daysAgo(next.date) > 0 : false;

  return (
    <div className="space-y-4">
      <div className="px-1">
        <h1 className="text-[1.375rem] font-extrabold text-ink">예약</h1>
        <p className="mt-1 text-[0.9375rem] leading-relaxed text-ink-sub">
          이 화면에서 예약이 바로 확정되지는 않습니다. 남겨 주시면 매장에서
          확인한 뒤 연락드립니다.
        </p>
      </div>

      {/* 다음 방문 예정 */}
      <Card
        lift={false}
        className="!bg-gradient-to-br !from-deep-800 !to-deep-950 !ring-1 !ring-gold/25"
      >
        <div className="flex items-start gap-3.5">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-gold ring-1 ring-white/15">
            <CalendarIcon className="h-6 w-6" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[0.8125rem] font-extrabold tracking-wide text-gold">
              다음 방문 예정
            </p>
            {next.date ? (
              <>
                <p className="nowrap-num mt-1 text-[1.4375rem] font-extrabold tabular leading-tight text-white">
                  {formatDateKr(next.date)}
                </p>
                <p className="mt-1 text-[0.9375rem] leading-snug text-white/75">
                  {overdue
                    ? "예정일이 지났습니다. 편하신 날짜를 알려 주세요."
                    : next.fromStore
                      ? "매장에서 안내드린 날짜입니다"
                      : "지금까지의 이용 간격으로 계산한 참고일입니다"}
                </p>
              </>
            ) : (
              <p className="mt-1 text-[1.1875rem] font-extrabold leading-snug text-white">
                아직 잡히지 않았습니다
              </p>
            )}
          </div>
        </div>
        <p className="mt-3 rounded-btn bg-white/[0.07] px-3.5 py-2.5 text-[0.875rem] leading-relaxed text-white/75 ring-1 ring-white/10">
          {next.basis}
        </p>
      </Card>

      {/* 요청 남기기 */}
      <Card>
        <h2 className="text-[1.0625rem] font-extrabold text-ink">
          방문 요청 남기기
        </h2>
        <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-ink-sub">
          희망하시는 날짜와 시간대를 골라 주시면 매장에서 확인 후 연락드립니다.
        </p>
        <Link href="/my/request" className="mt-3 block">
          <Button size="lg" className="w-full justify-between">
            <span>날짜 고르고 요청하기</span>
            <ChevronRightIcon className="h-5 w-5" />
          </Button>
        </Link>

        {branch?.phone && (
          <div className="mt-3 border-t border-stone-line pt-3 text-center">
            <p className="text-[0.8125rem] text-ink-sub">
              급하시면 매장으로 바로 전화 주세요
            </p>
            <a
              href={`tel:${branch.phone.replace(/[^0-9+]/g, "")}`}
              aria-label={`매장에 전화 걸기 ${branch.phone}`}
              className="touch-target mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-aqua-50 px-4 text-[0.9375rem] font-extrabold text-aqua-800 ring-1 ring-aqua-100 transition-colors hover:bg-aqua-100"
            >
              <PhoneIcon className="h-4 w-4 shrink-0" />
              {branch.phone}
            </a>
          </div>
        )}
      </Card>

      {/* 내가 남긴 요청 */}
      <Card>
        <h2 className="mb-3 text-[1.0625rem] font-extrabold text-ink">
          내가 남긴 요청
        </h2>
        {bookings.length === 0 ? (
          <p className="rounded-card border border-dashed border-stone-line bg-card-soft py-6 text-center text-[0.9375rem] text-ink-sub">
            아직 남기신 요청이 없습니다.
          </p>
        ) : (
          <ul className="divide-y divide-stone-line">
            {bookings.map((r) => {
              const s = STATUS[r.status] ?? STATUS.open;
              return (
                <li key={r.id} className="py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="nowrap-num text-[0.9375rem] font-extrabold tabular text-ink">
                      {r.preferredDate ? formatDateKr(r.preferredDate) : "날짜 미정"}
                    </span>
                    {r.preferredSlot && (
                      <span className="text-[0.875rem] font-bold text-ink-sub">
                        {SLOT_LABEL[r.preferredSlot]}
                      </span>
                    )}
                    <span className="ml-auto shrink-0">
                      <Badge tone={s.tone}>{s.label}</Badge>
                    </span>
                  </div>
                  {r.note && (
                    <p className="mt-1 text-[0.875rem] leading-relaxed text-ink-sub">
                      {r.note}
                    </p>
                  )}
                  <p className="nowrap-num mt-1 text-[0.8125rem] tabular text-ink-faint">
                    {formatRelative(r.createdAt)} 남김
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {/* 지난 방문 */}
      <Card>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-[1.0625rem] font-extrabold text-ink">지난 방문</h2>
          <Link
            href="/my/visits"
            className="tap-line inline-flex items-center gap-1 text-sm font-bold text-aqua-700"
          >
            전체 보기
            <ChevronRightIcon className="h-4 w-4" />
          </Link>
        </div>
        {pastVisits.length === 0 ? (
          <p className="rounded-card border border-dashed border-stone-line bg-card-soft py-6 text-center text-[0.9375rem] text-ink-sub">
            아직 방문 기록이 없습니다.
          </p>
        ) : (
          <ul className="divide-y divide-stone-line">
            {pastVisits.map((v) => (
              <li key={v.id} className="flex items-baseline gap-3 py-2.5">
                <span className="nowrap-num w-24 shrink-0 text-[0.875rem] font-bold tabular text-ink-sub">
                  {formatDateKr(v.visitedAt.slice(0, 10))}
                </span>
                <span className="min-w-0 flex-1 break-words text-[0.9375rem] text-ink-soft">
                  {v.programName || "정통대왕쑥뜸"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
