"use client";

/**
 * MY WELLNESS — 홈
 * =================
 *
 * 고객이 이 화면을 여는 이유는 셋 중 하나다.
 *   "다음에 언제 가지" · "몇 번 남았지" · "저번에 뭐 해줬더라"
 *
 * 그래서 위에서부터 그 순서로 답한다. 관리자 대시보드를 흉내 내지 않는다 —
 * 지표를 늘어놓으면 고객은 자기 이야기가 아니라 남의 보고서를 보는 기분이 된다.
 *
 * '다음 방문 예정' 은 새로 만든 값이 아니라 **매장이 잡아 둔 다음 관리
 * 예정일**이다. 직원이 고객 상세에서 그 날짜를 바꾸면 이 카드가 같이 바뀐다.
 * 같은 사실을 두 군데에 따로 저장하지 않는다.
 */

import Link from "next/link";
import { usePortal } from "@/lib/portal/store";
import {
  classifyWellnessType,
  nextReference,
  summarizePasses,
  summarizeUsage,
} from "@/lib/portal/wellness";
import { Button, Card } from "@/components/ui";
import {
  CalendarIcon,
  ChatIcon,
  ChevronRightIcon,
  GiftIcon,
  LeafIcon,
  TicketIcon,
} from "@/components/ui/icons";
import { formatDateKr, formatRelative } from "@/lib/utils/date";
import { BODY_PART_LABELS, type BodyPart } from "@/lib/types";
import FeedbackCard from "@/components/portal/FeedbackCard";
import ReferralCard from "@/components/portal/ReferralCard";
import { homecareTip } from "@/lib/portal/content";

export default function MyHome() {
  const { customer, branch, visits, memberships, profile, contentOpens } =
    usePortal();

  const usage = summarizeUsage(visits);
  const pass = summarizePasses(memberships);
  const next = nextReference(usage, customer?.nextManageDate);
  const type = classifyWellnessType({
    usage,
    pass,
    homecareInterest: profile.homecareInterest,
    contentOpens,
  });

  const lastVisit = visits.find((v) => v.type === "visit");

  /** 실제로 봐 드린 부위 상위 두 곳 — 매장이 남긴 기록에서 그대로 센다 */
  const partCount = new Map<BodyPart, number>();
  for (const v of visits) {
    for (const r of v.bodyParts ?? []) {
      partCount.set(r.part, (partCount.get(r.part) ?? 0) + 1);
    }
  }
  const topParts = [...partCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([part]) => part);

  const used = pass.active
    ? pass.active.totalCount - pass.active.remainingCount
    : 0;

  return (
    <div className="space-y-4">
      {/* ── 인사 ─────────────────────────────────────── */}
      <div className="px-1 pt-1">
        <p className="text-[1.75rem] font-extrabold leading-tight text-ink">
          {customer?.name}님,
        </p>
        <p className="mt-1.5 text-[1.0625rem] leading-snug text-ink-soft">
          오늘도 편안한 케어를
          <br />
          시작해 보세요.
        </p>
      </div>

      {/* ── 다음 방문 예정 ───────────────────────────── */}
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
                  {next.fromStore
                    ? "매장에서 안내드린 날짜입니다"
                    : "지금까지의 이용 간격으로 계산한 참고일입니다"}
                </p>
              </>
            ) : (
              <>
                <p className="mt-1 text-[1.25rem] font-extrabold leading-tight text-white">
                  아직 잡히지 않았습니다
                </p>
                <p className="mt-1 text-[0.9375rem] leading-snug text-white/75">
                  원하시는 날짜를 남겨 주시면 매장에서 확인 후 연락드립니다.
                </p>
              </>
            )}
            {branch?.name && (
              <p className="mt-2 flex items-center gap-1.5 text-[0.875rem] font-bold text-white/70">
                <LeafIcon className="h-4 w-4 shrink-0 text-gold/80" />
                {branch.name}
              </p>
            )}
          </div>
        </div>

        <Link href="/my/booking" className="mt-4 block">
          <Button variant="on-dark" size="lg" className="w-full justify-between">
            <span>{next.date ? "예약 변경 요청" : "방문 요청 남기기"}</span>
            <ChevronRightIcon className="h-5 w-5" />
          </Button>
        </Link>
      </Card>

      {/* ── 오늘의 맞춤 안내 ─────────────────────────── */}
      {/*
        여기에 Wellness Type 라벨(재등록 관심형 · 장기미방문형 …)을 큰 글씨로
        걸어 두었었다. 그건 매장이 고객을 나누려고 만든 말이지 고객에게 할
        말이 아니다. 자기 화면 맨 위에 "재등록 관심형" 이라고 붙어 있으면
        기분이 좋을 리 없고, "장기미방문형" 은 더하다.

        그 자리에 **매장이 실제로 해 드린 것**을 놓는다. 어느 부위를 봐
        드렸는지는 방문마다 남아 있는 사실이고, 다음에 오시면 거기서
        이어 간다는 말이 고객에게는 훨씬 쓸모 있다.

        유형 자체를 감추지는 않는다 — '나의 웰니스'(/my/wellness)에 가면
        무엇을 근거로 그렇게 봤는지까지 함께 설명되어 있다.
      */}
      <Card>
        <div className="flex items-start gap-3.5">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-deep-700 to-deep-900 text-gold">
            <LeafIcon className="h-6 w-6" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[0.8125rem] font-extrabold text-aqua-700">
              오늘의 맞춤 안내
            </p>
            <p className="mt-0.5 break-words text-[1.25rem] font-extrabold leading-tight text-ink">
              {topParts.length > 0
                ? `${topParts.map((p) => BODY_PART_LABELS[p]).join(" · ")} 케어`
                : usage.visitCount > 0
                  ? "이용 기록을 쌓고 있습니다"
                  : "첫 방문을 기다리고 있습니다"}
            </p>
          </div>
        </div>

        <p className="mt-3 text-[0.9375rem] leading-relaxed text-ink-soft">
          {topParts.length > 0
            ? "지금까지 이 부위를 가장 많이 봐 드렸습니다. 다음에 오시면 이어서 봐 드리겠습니다."
            : type.description}
        </p>

        <div className="mt-3 border-t border-stone-line pt-3">
          <p className="flex items-center gap-1.5 text-[0.875rem] font-extrabold text-gold-deep">
            <LeafIcon className="h-4 w-4 shrink-0" />홈케어 TIP
          </p>
          <p className="mt-1 text-[0.9375rem] leading-relaxed text-ink-soft">
            {homecareTip(type.key)}
          </p>
        </div>

        <Link href="/my/care" className="mt-4 block">
          <Button size="lg" className="w-full justify-between">
            <span>자세히 보기</span>
            <ChevronRightIcon className="h-5 w-5" />
          </Button>
        </Link>
      </Card>

      {/*
        ── 이용권 잔여 ────────────────────────────────

        고객이 이 화면에서 가장 자주 확인하는 숫자다. 그런데 예전에는
        아이콘 옆 작은 라벨 아래 32px 숫자로만 있었고, 남은 정도가
        얼마나 되는지는 가느다란 막대 하나로 눈에 잘 안 들어왔다.

        큰 원 눈금으로 바꾼다. 남은 칸이 얼마나 되는지를 색 있는 호(弧)
        길이로 보여 주고 가운데에 숫자를 넣는다 — 숫자를 지우는 것이
        아니라 숫자에 모양을 붙이는 것이다. 두 번 볼 필요가 없어진다.
      */}
      <Card>
        <div className="flex items-center gap-5">
          {pass.active ? (
            (() => {
              const total = Math.max(pass.active.totalCount, 1);
              const leftRatio = pass.active.remainingCount / total;
              const low = pass.active.remainingCount <= 2;
              /* 둘레 = 2πr, r=34 → 213.6 */
              const C = 213.6;
              return (
                <span
                  className="relative flex h-[5.5rem] w-[5.5rem] shrink-0 items-center justify-center"
                  role="img"
                  aria-label={`남은 횟수 ${pass.active.remainingCount}회 (전체 ${pass.active.totalCount}회)`}
                >
                  <svg viewBox="0 0 80 80" className="h-full w-full -rotate-90">
                    <circle
                      cx="40"
                      cy="40"
                      r="34"
                      fill="none"
                      stroke="rgb(var(--c-bg-deep))"
                      strokeWidth="8"
                    />
                    <circle
                      cx="40"
                      cy="40"
                      r="34"
                      fill="none"
                      stroke={low ? "rgb(var(--c-gold))" : "rgb(var(--c-aqua-500))"}
                      strokeWidth="8"
                      strokeLinecap="round"
                      strokeDasharray={`${C * leftRatio} ${C}`}
                    />
                  </svg>
                  <span className="nowrap-num tabular absolute flex flex-col items-center leading-none">
                    <span
                      className={`text-[1.75rem] font-extrabold ${low ? "text-gold-deep" : "text-aqua-800"}`}
                    >
                      {pass.active.remainingCount}
                    </span>
                    <span className="mt-0.5 text-[0.75rem] font-bold text-ink-sub">
                      /{pass.active.totalCount}회
                    </span>
                  </span>
                </span>
              );
            })()
          ) : (
            <span className="flex h-[5.5rem] w-[5.5rem] shrink-0 items-center justify-center rounded-full bg-stone-bg-deep text-ink-faint">
              <TicketIcon className="h-8 w-8" />
            </span>
          )}

          <div className="min-w-0 flex-1">
            <p className="text-[0.8125rem] font-extrabold tracking-wide text-ink-sub">
              이용권 잔여 횟수
            </p>
            {pass.active ? (
              <>
                <p className="mt-1 text-[1.1875rem] font-extrabold leading-snug text-ink">
                  {pass.active.remainingCount <= 2
                    ? "곧 다 쓰십니다"
                    : "남아 있습니다"}
                </p>
                <p className="nowrap-num mt-1 text-[0.875rem] leading-snug text-ink-sub">
                  {pass.active.programName}
                  <br />
                  {used}회 사용하셨습니다
                </p>
              </>
            ) : (
              <p className="mt-1 text-[1.1875rem] font-extrabold leading-snug text-ink">
                {pass.totalRemaining > 0
                  ? `${pass.totalRemaining}회 남음`
                  : "보유 이용권 없음"}
              </p>
            )}
          </div>
        </div>

        <Link href="/my/passes" className="mt-4 block">
          <Button size="lg" className="w-full justify-between">
            <span>이용권 보기</span>
            <ChevronRightIcon className="h-5 w-5" />
          </Button>
        </Link>
      </Card>

      {/* ── 최근 이용 한 줄 ──────────────────────────── */}
      {lastVisit && (
        <Card lift={false} className="bg-card-soft">
          <p className="text-[0.9375rem] leading-relaxed text-ink-soft">
            가장 최근 방문은{" "}
            <b className="text-ink">
              {formatDateKr(lastVisit.visitedAt.slice(0, 10))}
            </b>{" "}
            ({formatRelative(lastVisit.visitedAt)})이었습니다.
          </p>
        </Card>
      )}

      {/* ── 이번 이용은 어떠셨는지 (매장으로 바로 전달) ── */}
      <FeedbackCard lastVisitId={lastVisit?.id} lastVisitAt={lastVisit?.visitedAt} />

      {/* ── 1:1 상담 ─────────────────────────────────── */}
      <Card>
        <div className="flex items-center gap-3.5">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-deep-700 to-deep-900 text-gold">
            <ChatIcon className="h-6 w-6" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[1.0625rem] font-extrabold text-ink">
              1:1 상담하기
            </p>
            <p className="mt-0.5 text-[0.875rem] leading-snug text-ink-sub">
              궁금하신 점을 남겨 주시면 매장에서 확인 후 답해 드립니다.
            </p>
          </div>
          <Link href="/my/request" className="shrink-0">
            <Button variant="secondary">
              상담하기
              <ChevronRightIcon className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </Card>

      {/* ── 친구 추천 ────────────────────────────────── */}
      <ReferralCard branchName={branch?.name} icon={<GiftIcon className="h-6 w-6" />} />
    </div>
  );
}
