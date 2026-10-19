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

import { usePortal } from "@/lib/portal/store";
import { nextReference, summarizeUsage } from "@/lib/portal/wellness";
import { PhoneIcon } from "@/components/ui/icons";
import { formatDateKr, formatDateWithDay, formatRelative } from "@/lib/utils/date";
import NextVisitCard from "@/components/portal/NextVisitCard";
import {
  EmptyLine,
  ListGroup,
  ListRow,
  PageHead,
  PillLink,
  Section,
  StatusPill,
  StickyBar,
} from "@/components/portal/kit";

const SLOT_LABEL: Record<string, string> = {
  morning: "오전",
  afternoon: "오후",
  evening: "저녁",
};

const STATUS: Record<string, { label: string; tone: "wait" | "done" | "muted" }> = {
  open: { label: "확인 중", tone: "wait" },
  handled: { label: "매장 확인함", tone: "done" },
  closed: { label: "종료", tone: "muted" },
};

export default function MyBooking() {
  const { customer, branch, visits, requests } = usePortal();
  const usage = summarizeUsage(visits);
  const next = nextReference(usage, customer?.nextManageDate);

  const bookings = requests.filter((r) => r.kind === "booking");
  const pastVisits = visits.filter((v) => v.type === "visit").slice(0, 5);

  return (
    <div className="space-y-6">
      <PageHead
        title="예약"
        sub="이 화면에서 예약이 바로 확정되지는 않습니다. 남겨 주시면 매장에서 확인한 뒤 연락드립니다."
      />

      {/* 다음 방문 — 홈과 같은 카드, 이 화면에서는 「어떻게 나온 날짜인지」 까지 */}
      <NextVisitCard
        date={next.date}
        fromStore={next.fromStore}
        lastDate={usage.lastVisitDate}
        basis={next.basis}
      />

      {/* 내가 남긴 요청 — 주문 목록처럼 상태 알약 */}
      <Section title="내가 남긴 요청">
        {bookings.length === 0 ? (
          <EmptyLine>아직 남기신 요청이 없습니다.</EmptyLine>
        ) : (
          <ListGroup>
            {bookings.map((r) => {
              const st = STATUS[r.status] ?? STATUS.open;
              return (
                <ListRow
                  key={r.id}
                  chevron={false}
                  title={
                    <span className="nowrap-num tabular">
                      {r.preferredDate ? formatDateKr(r.preferredDate) : "날짜 미정"}
                      {r.preferredSlot ? ` · ${SLOT_LABEL[r.preferredSlot]}` : ""}
                    </span>
                  }
                  sub={
                    <>
                      {r.note && <span className="block text-ink-soft">{r.note}</span>}
                      <span className="block text-ink-faint">{formatRelative(r.createdAt)} 남김</span>
                    </>
                  }
                  right={<StatusPill tone={st.tone}>{st.label}</StatusPill>}
                />
              );
            })}
          </ListGroup>
        )}
      </Section>

      {/* 지난 방문 */}
      <Section title="지난 방문" more={{ href: "/my/visits" }}>
        {pastVisits.length === 0 ? (
          <EmptyLine>아직 방문 기록이 없습니다.</EmptyLine>
        ) : (
          <ListGroup>
            {pastVisits.map((v) => (
              <ListRow
                key={v.id}
                chevron={false}
                title={
                  <span className="nowrap-num tabular">
                    {formatDateWithDay(v.visitedAt.slice(0, 10))}
                  </span>
                }
                sub={v.programName || "정통대왕쑥뜸"}
                right={<StatusPill tone="done">이용 완료</StatusPill>}
              />
            ))}
          </ListGroup>
        )}
      </Section>

      {branch?.phone && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-1">
          <p className="text-[0.875rem] text-ink-sub">급하시면 매장으로 바로 전화 주세요</p>
          <a
            href={`tel:${branch.phone.replace(/[^0-9+]/g, "")}`}
            aria-label={`매장에 전화 걸기 ${branch.phone}`}
            className="touch-target inline-flex items-center gap-1.5 rounded-full bg-aqua-50 px-4 text-[0.9375rem] font-extrabold text-aqua-800 ring-1 ring-aqua-100 transition-colors hover:bg-aqua-100"
          >
            <PhoneIcon className="h-4 w-4 shrink-0" />
            {branch.phone}
          </a>
        </div>
      )}

      {/* 할 일은 하나 — 하단 탭 바로 위에 늘 */}
      <StickyBar>
        <PillLink href="/my/request" full>
          날짜 고르고 요청하기
        </PillLink>
      </StickyBar>
    </div>
  );
}
