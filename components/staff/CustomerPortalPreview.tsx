"use client";

/**
 * 고객 화면 미리보기 — 세션을 바꾸지 않고 들여다본다
 * ==================================================
 *
 * 왜 이런 방식인가
 * ----------------
 * "직원이 고객 화면으로 전환한다" 를 문자 그대로 만들면, 직원 세션으로
 * 남의 고객 자료를 여는 통로가 하나 생긴다. 아무리 화면에서 잘 가려도
 * 그 통로 자체가 구멍이다.
 *
 * 그래서 여기서는 **아무것도 전환하지 않는다.**
 *   · 로그인 상태는 직원 그대로다 (토큰 발급 없음, 고객 로그인 흉내 없음)
 *   · 자료는 RLS 가 이미 이 직원에게 내준 것만 쓴다 (직원 스토어의 factsById)
 *   · 즉 직원이 고객 상세에서 이미 보고 있던 것을 **고객의 말로 다시 그린 것**뿐
 *
 * 그러니 이 화면이 새로 보여 주는 정보는 없다. 배치와 말투만 바뀐다.
 * 권한이 없는 자료는 애초에 스토어에 오지 않았으므로 여기에도 없다.
 *
 * 왜 폰 모양 안에 넣는가
 * ----------------------
 * 진짜 고객 화면과 헷갈리면 안 되기 때문이다. 직원 화면 한가운데 폰이
 * 하나 놓여 있으면 "이건 남의 화면을 들여다보는 중" 이 한눈에 읽힌다.
 * 배지 한 줄로 적어 두는 것보다 형태로 말하는 편이 확실하다.
 */

import Link from "next/link";
import { Badge } from "@/components/ui";
import {
  CalendarIcon,
  ChatIcon,
  ChevronRightIcon,
  GiftIcon,
  LeafIcon,
  TicketIcon,
} from "@/components/ui/icons";
import { homecareTip } from "@/lib/portal/content";
import {
  classifyWellnessType,
  nextReference,
  summarizePasses,
  summarizeUsage,
} from "@/lib/portal/wellness";
import type { CustomerFacts } from "@/lib/scoring/priority";
import { formatDateKr, formatRelative } from "@/lib/utils/date";

/** 폰 화면 한 장 — 고객 포털의 카드 배치를 그대로 따른다 */
function Screen({ facts, branchName }: { facts: CustomerFacts; branchName?: string }) {
  const { customer, visits, memberships } = facts;
  const usage = summarizeUsage(visits);
  const pass = summarizePasses(memberships);
  const next = nextReference(usage, customer.nextManageDate);
  const type = classifyWellnessType({ usage, pass });
  const lastVisit = visits
    .filter((v) => v.type === "visit")
    .sort((a, b) => b.visitedAt.localeCompare(a.visitedAt))[0];
  const used = pass.active
    ? pass.active.totalCount - pass.active.remainingCount
    : 0;

  return (
    <div className="space-y-3 bg-stone-bg p-4">
      {/* 인사 */}
      <div className="px-0.5 pt-1">
        <p className="break-words text-[1.375rem] font-extrabold leading-tight text-ink">
          {customer.name}님,
        </p>
        <p className="mt-1 text-[0.9375rem] leading-snug text-ink-soft">
          오늘도 편안한 케어를 시작해 보세요.
        </p>
      </div>

      {/* 다음 방문 예정 */}
      <div className="rounded-card bg-gradient-to-br from-deep-800 to-deep-950 p-4 ring-1 ring-gold/25">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-gold ring-1 ring-white/15">
            <CalendarIcon className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[0.75rem] font-extrabold tracking-wide text-gold">
              다음 방문 예정
            </p>
            <p className="nowrap-num mt-0.5 break-words text-[1.1875rem] font-extrabold tabular leading-tight text-white">
              {next.date ? formatDateKr(next.date) : "아직 잡히지 않았습니다"}
            </p>
            {branchName && (
              <p className="mt-1 flex items-center gap-1 text-[0.8125rem] font-bold text-white/70">
                <LeafIcon className="h-3.5 w-3.5 shrink-0 text-gold/80" />
                <span className="min-w-0 break-words">{branchName}</span>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* 오늘의 맞춤 추천 */}
      <div className="rounded-card bg-card p-4 shadow-card ring-1 ring-stone-line">
        <p className="text-[0.75rem] font-extrabold text-aqua-700">
          오늘의 맞춤 추천
        </p>
        <p className="mt-0.5 break-words text-[1.0625rem] font-extrabold leading-tight text-ink">
          {type.label}
        </p>
        <p className="mt-2 text-[0.875rem] leading-relaxed text-ink-soft">
          {type.description}
        </p>
        <p className="mt-2 border-t border-stone-line pt-2 text-[0.8125rem] leading-relaxed text-ink-sub">
          <span className="font-extrabold text-gold-deep">홈케어 TIP </span>
          {homecareTip(type.key)}
        </p>
      </div>

      {/* 이용권 */}
      <div className="rounded-card bg-card p-4 shadow-card ring-1 ring-stone-line">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gold-soft/60 text-gold-deep ring-1 ring-gold/25">
            <TicketIcon className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[0.75rem] font-extrabold text-ink-sub">
              이용권 잔여 횟수
            </p>
            {pass.active ? (
              <p className="nowrap-num tabular">
                <span className="text-[1.5rem] font-extrabold leading-none text-aqua-800">
                  {pass.active.remainingCount}
                </span>
                <span className="text-[0.9375rem] font-bold text-ink-sub">
                  {" "}
                  / {pass.active.totalCount}회
                </span>
              </p>
            ) : (
              <p className="text-[1rem] font-extrabold text-ink">
                {pass.totalRemaining > 0
                  ? `${pass.totalRemaining}회 남음`
                  : "보유 이용권 없음"}
              </p>
            )}
          </div>
        </div>
        {pass.active && (
          <>
            <span className="mt-2.5 block h-2 overflow-hidden rounded-full bg-stone-bg-deep">
              <span
                className={`block h-full rounded-full ${
                  pass.active.remainingCount <= 2
                    ? "bg-gradient-to-r from-gold to-gold-deep"
                    : "bg-gradient-to-r from-aqua-500 to-deep-700"
                }`}
                style={{
                  width: `${
                    pass.active.totalCount > 0
                      ? Math.round((used / pass.active.totalCount) * 100)
                      : 0
                  }%`,
                }}
              />
            </span>
            <p className="nowrap-num mt-1.5 break-words text-[0.75rem] tabular text-ink-sub">
              {pass.active.programName} · {used}회 사용
            </p>
          </>
        )}
      </div>

      {/* 최근 방문 한 줄 */}
      {lastVisit && (
        <div className="rounded-card bg-card-soft p-4 ring-1 ring-stone-line">
          <p className="text-[0.875rem] leading-relaxed text-ink-soft">
            가장 최근 방문은{" "}
            <b className="text-ink">
              {formatDateKr(lastVisit.visitedAt.slice(0, 10))}
            </b>{" "}
            ({formatRelative(lastVisit.visitedAt)})이었습니다.
          </p>
        </div>
      )}

      {/* 상담 · 친구 추천 (모양만 — 미리보기에서는 눌리지 않는다) */}
      {[
        { icon: <ChatIcon className="h-5 w-5" />, t: "1:1 상담하기", d: "궁금하신 점을 남겨 주세요" },
        { icon: <GiftIcon className="h-5 w-5" />, t: "친구에게 알리기", d: "매장 소개 링크를 보내 드립니다" },
      ].map((x) => (
        <div
          key={x.t}
          className="flex items-center gap-3 rounded-card bg-card p-4 shadow-card ring-1 ring-stone-line"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-deep-700 to-deep-900 text-gold">
            {x.icon}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[0.9375rem] font-extrabold text-ink">
              {x.t}
            </span>
            <span className="block text-[0.8125rem] leading-snug text-ink-sub">
              {x.d}
            </span>
          </span>
          <ChevronRightIcon className="h-4 w-4 shrink-0 text-ink-faint" />
        </div>
      ))}
    </div>
  );
}

export default function CustomerPortalPreview({
  facts,
  branchName,
  backHref,
}: {
  facts: CustomerFacts;
  branchName?: string;
  backHref: string;
}) {
  return (
    <div>
      {/* 무엇을 보고 있는지 — 오해할 여지를 남기지 않는다 */}
      <div className="mb-4 rounded-card bg-aqua-50 p-4 ring-1 ring-aqua-200 dark:bg-aqua-500/10">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="aqua" dot>
            직원 미리보기
          </Badge>
          <p className="min-w-0 flex-1 break-words text-[0.9375rem] font-bold text-aqua-800">
            {facts.customer.name}님 화면을 그대로 그려 본 것입니다
          </p>
        </div>
        <p className="mt-2 text-[0.875rem] leading-relaxed text-ink-soft">
          고객으로 로그인한 것이 아닙니다. 지금 보고 계신 자료는 이 화면을 열기
          전에도 이미 보실 수 있던 것이고, 배치와 말투만 고객 쪽으로 바꾼
          것입니다. 여기서 무언가를 남기거나 고칠 수는 없습니다.
        </p>
      </div>

      <div className="flex flex-col items-center gap-4">
        {/* 폰 모양 — 형태로 "남의 화면" 임을 말한다 */}
        <div className="w-full max-w-[380px] overflow-hidden rounded-[2rem] bg-deep-950 p-2.5 shadow-float ring-1 ring-black/10">
          <div className="overflow-hidden rounded-[1.5rem] bg-stone-bg">
            {/* 포털 머리글 흉내 */}
            <div className="flex items-center gap-2.5 border-b border-black/[0.06] bg-stone-bg px-4 py-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-deep-700 to-deep-900 font-serif text-sm font-bold text-gold">
                鼎
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[0.625rem] font-bold text-ink-sub">
                  정통대왕쑥뜸원
                </span>
                <span className="block truncate text-[0.875rem] font-extrabold leading-tight text-ink">
                  MY WELLNESS
                </span>
              </span>
            </div>

            <Screen facts={facts} branchName={branchName} />

            {/* 하단 탭 흉내 */}
            <div className="flex border-t border-black/[0.06] bg-card">
              {["홈", "예약", "이용권", "케어기록", "마이"].map((t, i) => (
                <span
                  key={t}
                  className={`flex-1 py-2.5 text-center text-[0.625rem] font-bold ${
                    i === 0 ? "text-aqua-700" : "text-ink-faint"
                  }`}
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>

        <Link
          href={backHref}
          className="touch-target inline-flex items-center gap-1.5 rounded-btn bg-aqua-50 px-5 text-[1rem] font-extrabold text-aqua-800 ring-1 ring-aqua-200 transition-colors hover:bg-aqua-100"
        >
          내부 화면으로 돌아가기
        </Link>
      </div>
    </div>
  );
}
