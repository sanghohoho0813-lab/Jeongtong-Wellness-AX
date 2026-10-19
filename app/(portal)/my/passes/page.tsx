"use client";

/**
 * 이용권 — 몇 번 남았는가
 * ========================
 *
 * 고객이 가장 자주 확인하는 숫자다. 그래서 잔여 횟수를 제일 크게 두고,
 * 그 아래에 "그 숫자가 어떻게 나왔는지"(몇 회 썼는지, 언제 등록했는지)를 붙인다.
 *
 * 유효기간은 매장이 정한 내용이 없으면 **적지 않는다.** 없는 규정을 화면이
 * 지어내면 그건 약속이 되고, 고객은 그 약속을 들고 매장에 온다.
 */

import { usePortal } from "@/lib/portal/store";
import { summarizePasses } from "@/lib/portal/wellness";
import { ProgressBar } from "@/components/ui";
import { TicketIcon } from "@/components/ui/icons";
import { formatDateKr, formatDateWithDay } from "@/lib/utils/date";
import { formatWon } from "@/lib/utils/format";
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

export default function MyPasses() {
  const { memberships, visits, products } = usePortal();
  const pass = summarizePasses(memberships);

  /** 이용권이 차감된 방문만 — "어디에 썼는지" 를 보여 준다 */
  const usedVisits = visits.filter((v) => v.membershipId).slice(0, 10);
  const sold = products.filter((p) => p.active);

  return (
    <div className="space-y-6">
      <PageHead title="이용권" sub="보유하신 이용권과 사용 내역입니다." />

      {/* 합계 — 적립 앱 계정 화면의 「누적 적립」 자리. 여러 장을 갖고 계실 수 있다 */}
      {pass.totalRemaining > 0 && (
        <section className="rounded-[22px] bg-gradient-to-br from-deep-800 to-deep-950 p-5 text-white shadow-hero ring-1 ring-gold/20">
          <div className="flex items-center gap-3.5">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-gold ring-1 ring-white/15">
              <TicketIcon className="h-6 w-6" />
            </span>
            <div className="min-w-0">
              <p className="text-[0.8125rem] font-extrabold tracking-wide text-gold">
                남은 이용 횟수 모두 합쳐
              </p>
              <p className="nowrap-num tabular mt-0.5">
                <span className="text-[2.25rem] font-extrabold leading-none">
                  {pass.totalRemaining}
                </span>
                <span className="text-[1.125rem] font-bold text-white/70">회</span>
              </p>
            </div>
          </div>
          <p className="mt-3 text-[0.875rem] text-white/70">
            지금까지 등록하신 이용권 {pass.purchasedCount}장
          </p>
        </section>
      )}

      {/* 나의 이용권 — 쿠폰처럼: 왼쪽은 이름 · 막대, 오른쪽 절취선 너머는 남은 횟수 */}
      <Section title="나의 이용권">
        {memberships.length === 0 ? (
          <EmptyLine>
            보유하신 이용권이 없습니다.
            <br />
            이용권은 매장에서 등록해 드립니다.
          </EmptyLine>
        ) : (
          <ul className="space-y-3">
            {memberships.map((m) => {
              const used = m.totalCount - m.remainingCount;
              const active = m.status === "active" && m.remainingCount > 0;
              const low = active && m.remainingCount <= 2;
              return (
                <li
                  key={m.id}
                  data-pass-ticket
                  className={`overflow-hidden rounded-[20px] bg-card shadow-card ring-1 ring-black/[0.04] dark:ring-white/[0.06] ${
                    active ? "" : "opacity-75"
                  }`}
                >
                  <div className="flex">
                    <div className="min-w-0 flex-1 p-4">
                      <StatusPill tone={active ? (low ? "warn" : "done") : "muted"}>
                        {active ? (low ? "곧 소진" : "이용 중") : "사용 완료"}
                      </StatusPill>
                      <p className="mt-2 break-words text-[1.0625rem] font-extrabold leading-snug text-ink">
                        {m.programName}
                      </p>
                      {/*
                        막대는 '쓴 만큼' 이 아니라 '남은 만큼' 을 채운다 —
                        오른쪽 숫자(남은 횟수) · 홈 화면의 원 눈금과 같은 방향.
                        다 쓴 이용권이 가장 꽉 차 보이던 일을 되풀이하지 않는다.
                      */}
                      <div className="mt-2.5">
                        <ProgressBar
                          ratio={m.totalCount > 0 ? m.remainingCount / m.totalCount : 0}
                          tone={low ? "warn" : "aqua"}
                        />
                      </div>
                      <p className="nowrap-num tabular mt-2 text-[0.8125rem] text-ink-sub">
                        {used}회 사용 · 등록 {formatDateKr(m.purchasedAt)}
                      </p>
                    </div>
                    <div
                      className={`relative flex w-[5.5rem] shrink-0 flex-col items-center justify-center border-l-2 border-dashed border-stone-line ${
                        low ? "bg-gold-soft" : active ? "bg-aqua-50/70 dark:bg-aqua-500/10" : "bg-stone-bg-deep"
                      }`}
                    >
                      {/* 절취선 위아래의 반원 홈 */}
                      <span aria-hidden className="absolute -left-[9px] -top-2 h-4 w-4 rounded-full bg-stone-bg" />
                      <span aria-hidden className="absolute -bottom-2 -left-[9px] h-4 w-4 rounded-full bg-stone-bg" />
                      <span
                        className={`nowrap-num tabular text-[1.875rem] font-extrabold leading-none ${
                          low ? "text-gold-deep" : active ? "text-aqua-800" : "text-ink-faint"
                        }`}
                      >
                        {m.remainingCount}
                      </span>
                      <span className="nowrap-num mt-1 text-[0.75rem] font-bold text-ink-sub">
                        /{m.totalCount}회 남음
                      </span>
                    </div>
                  </div>

                  {low && (
                    <p className="border-t border-gold/20 bg-gold-soft/60 px-4 py-2.5 text-[0.875rem] font-bold text-gold-deep">
                      곧 소진됩니다. 이어서 이용하실 계획이라면 매장에 문의해 주세요.
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        <p className="mt-3 px-1 text-[0.8125rem] leading-relaxed text-ink-faint">
          이용권 유효기간이나 환불 규정은 매장에서 정한 내용이 없어 표시하지
          않습니다. 궁금하신 점은 매장에 문의해 주세요.
        </p>
      </Section>

      {/* 사용 내역 */}
      <Section title="사용 내역" more={{ href: "/my/visits", label: "전체 기록" }}>
        {usedVisits.length === 0 ? (
          <EmptyLine>아직 이용권으로 이용하신 기록이 없습니다.</EmptyLine>
        ) : (
          <ListGroup>
            {usedVisits.map((v) => (
              <ListRow
                key={v.id}
                chevron={false}
                title={
                  <span className="nowrap-num tabular">
                    {formatDateWithDay(v.visitedAt.slice(0, 10))}
                  </span>
                }
                sub={v.programName || "정통대왕쑥뜸"}
                right={<StatusPill tone="muted">1회 차감</StatusPill>}
              />
            ))}
          </ListGroup>
        )}
      </Section>

      {/* 매장 가격표 — 매장이 설정에 넣은 값 그대로 */}
      {sold.length > 0 && (
        <Section title="매장 가격표" sub="새 이용권은 매장에서 등록해 드립니다.">
          <ListGroup>
            {sold.map((p) => (
              <ListRow
                key={p.id}
                chevron={false}
                title={p.name}
                right={
                  <span className="nowrap-num tabular text-[1rem] font-extrabold text-ink">
                    {formatWon(p.price)}
                  </span>
                }
              />
            ))}
          </ListGroup>
        </Section>
      )}

      <StickyBar>
        <PillLink href="/my/request?kind=inquiry" tone="primary" full>
          이용권 문의하기
        </PillLink>
      </StickyBar>
    </div>
  );
}
