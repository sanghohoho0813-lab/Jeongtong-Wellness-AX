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

import Link from "next/link";
import { usePortal } from "@/lib/portal/store";
import { summarizePasses } from "@/lib/portal/wellness";
import { Badge, Button, Card, ProgressBar } from "@/components/ui";
import { ChevronRightIcon, TicketIcon } from "@/components/ui/icons";
import { formatDateKr } from "@/lib/utils/date";
import { formatWon } from "@/lib/utils/format";

export default function MyPasses() {
  const { memberships, visits, products } = usePortal();
  const pass = summarizePasses(memberships);

  /** 이용권이 차감된 방문만 — "어디에 썼는지" 를 보여 준다 */
  const usedVisits = visits.filter((v) => v.membershipId).slice(0, 10);
  const sold = products.filter((p) => p.active);

  return (
    <div className="space-y-4">
      <div className="px-1">
        <h1 className="text-[1.375rem] font-extrabold text-ink">이용권</h1>
        <p className="mt-1 text-[0.9375rem] leading-relaxed text-ink-sub">
          보유하신 이용권과 사용 내역입니다.
        </p>
      </div>

      {/* 합계 — 여러 장을 갖고 계실 수 있다 */}
      {pass.totalRemaining > 0 && (
        <Card
          lift={false}
          className="!bg-gradient-to-br !from-deep-800 !to-deep-950 !ring-1 !ring-gold/25"
        >
          <div className="flex items-center gap-3.5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-gold ring-1 ring-white/15">
              <TicketIcon className="h-6 w-6" />
            </span>
            <div className="min-w-0">
              <p className="text-[0.8125rem] font-extrabold tracking-wide text-gold">
                남은 이용 횟수 모두 합쳐
              </p>
              <p className="nowrap-num mt-0.5 tabular">
                <span className="text-[2.25rem] font-extrabold leading-none text-white">
                  {pass.totalRemaining}
                </span>
                <span className="text-[1.125rem] font-bold text-white/70">회</span>
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* 이용권 목록 */}
      <Card>
        <h2 className="mb-3 text-[1.0625rem] font-extrabold text-ink">
          나의 이용권
        </h2>
        {memberships.length === 0 ? (
          <div className="rounded-card border border-dashed border-stone-line bg-card-soft px-4 py-6 text-center">
            <p className="text-[0.9375rem] text-ink-sub">
              보유하신 이용권이 없습니다.
            </p>
            <p className="mt-1 text-[0.875rem] text-ink-faint">
              이용권은 매장에서 등록해 드립니다.
            </p>
          </div>
        ) : (
          <ul className="space-y-2.5">
            {memberships.map((m) => {
              const used = m.totalCount - m.remainingCount;
              const active = m.status === "active" && m.remainingCount > 0;
              const low = active && m.remainingCount <= 2;
              return (
                <li
                  key={m.id}
                  className="rounded-card bg-card-soft px-4 py-3.5 ring-1 ring-stone-line"
                >
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="min-w-0 break-words font-extrabold text-ink">
                      {m.programName}
                    </span>
                    <span className="shrink-0">
                      {active ? (
                        <Badge tone="positive">이용 중</Badge>
                      ) : (
                        <Badge tone="gray">사용 완료</Badge>
                      )}
                    </span>
                    <span className="nowrap-num ml-auto shrink-0 text-[1.0625rem] font-extrabold tabular text-ink">
                      {m.remainingCount}/{m.totalCount}회
                    </span>
                  </div>

                  {/*
                    막대가 '쓴 만큼' 이 아니라 '남은 만큼' 을 채운다.

                    전에는 used/total 이었다. 그런데 바로 옆 숫자는
                    '6/10회' — 남은 횟수다. 한 줄에서 막대와 숫자가 서로
                    반대되는 것을 가리키고 있었고, 결과는 이랬다.

                        이용 중  6회 남음  →  막대 40% 참
                        사용 완료 0회 남음 →  막대 100% 참

                    다 쓴 이용권이 가장 꽉 차 보였다. 홈 화면의 도넛은
                    이미 '남은 만큼'(6/10 → 60%)을 그리고 있었으니 두
                    화면끼리도 어긋나 있었다.

                    남은 것이 줄어들수록 막대도 줄어든다 — 그게 고객이
                    기대하는 방향이고, 옆 숫자·홈 화면과도 맞는다.
                  */}
                  <div className="mt-2">
                    <ProgressBar
                      ratio={
                        m.totalCount > 0 ? m.remainingCount / m.totalCount : 0
                      }
                      tone={low ? "warn" : "aqua"}
                    />
                  </div>

                  <p className="nowrap-num mt-2 text-[0.8125rem] tabular text-ink-sub">
                    {used}회 사용 · {m.remainingCount}회 남음 · 등록{" "}
                    {formatDateKr(m.purchasedAt)}
                  </p>

                  {low && (
                    <p className="mt-2 rounded-btn bg-gold-soft px-3 py-2 text-[0.875rem] font-bold text-gold-deep">
                      곧 소진됩니다. 이어서 이용하실 계획이라면 매장에 문의해
                      주세요.
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        <p className="mt-3 text-[0.8125rem] leading-relaxed text-ink-faint">
          이용권 유효기간이나 환불 규정은 매장에서 정한 내용이 없어 표시하지
          않습니다. 궁금하신 점은 매장에 문의해 주세요.
        </p>
      </Card>

      {/* 사용 내역 */}
      <Card>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-[1.0625rem] font-extrabold text-ink">사용 내역</h2>
          <Link
            href="/my/visits"
            className="tap-line inline-flex items-center gap-1 text-sm font-bold text-aqua-700"
          >
            전체 기록
            <ChevronRightIcon className="h-4 w-4" />
          </Link>
        </div>
        {usedVisits.length === 0 ? (
          <p className="rounded-card border border-dashed border-stone-line bg-card-soft py-6 text-center text-[0.9375rem] text-ink-sub">
            아직 이용권으로 이용하신 기록이 없습니다.
          </p>
        ) : (
          <ul className="divide-y divide-stone-line">
            {usedVisits.map((v) => (
              <li key={v.id} className="flex items-baseline gap-3 py-2.5">
                <span className="nowrap-num w-24 shrink-0 text-[0.875rem] font-bold tabular text-ink-sub">
                  {formatDateKr(v.visitedAt.slice(0, 10))}
                </span>
                <span className="min-w-0 flex-1 break-words text-[0.9375rem] text-ink-soft">
                  {v.programName || "정통대왕쑥뜸"}
                </span>
                <span className="shrink-0 text-[0.8125rem] font-bold text-aqua-700">
                  1회 차감
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* 매장 가격표 */}
      {sold.length > 0 && (
        <Card>
          <h2 className="mb-1 text-[1.0625rem] font-extrabold text-ink">
            매장 가격표
          </h2>
          <p className="mb-3 text-[0.875rem] leading-relaxed text-ink-sub">
            새 이용권은 매장에서 등록해 드립니다.
          </p>
          <ul className="divide-y divide-stone-line">
            {sold.map((p) => (
              <li
                key={p.id}
                className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 py-2.5"
              >
                <span className="min-w-0 flex-1 break-words text-[0.9375rem] text-ink-soft">
                  {p.name}
                </span>
                <span className="nowrap-num shrink-0 text-[0.9375rem] font-extrabold tabular text-ink">
                  {formatWon(p.price)}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Link href="/my/request" className="block">
        <Button variant="secondary" size="lg" className="w-full justify-between">
          <span>이용권 문의하기</span>
          <ChevronRightIcon className="h-5 w-5" />
        </Button>
      </Link>
    </div>
  );
}
