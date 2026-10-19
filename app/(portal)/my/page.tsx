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
 * 모양은 배달 · 적립 앱(대표님이 보여 주신 talabat · Rakuten)을 따른다.
 *
 *   인사 한 줄
 *   다음 방문 카드   ← 주문 추적 카드처럼: 지난 방문 → 오늘 → 다음 방문 진행선
 *   바로가기 여덟 칸 ← 카테고리 칸처럼: 고객 화면의 모든 곳이 한 번에 닿는다
 *   이용권 카드      ← 적립 포인트 카드처럼
 *   나를 위한 케어   ← 「Picks for you」 처럼 옆으로 넘기는 카드
 *   이번 이용 한마디 · 친구에게 알리기
 *   (상담 · 방문 요청은 바로가기 칸에 있다 — 같은 길을 두 번 그리지 않는다)
 *
 * '다음 방문 예정' 은 새로 만든 값이 아니라 **매장이 잡아 둔 다음 관리
 * 예정일**이다. 직원이 고객 상세에서 그 날짜를 바꾸면 이 카드가 같이 바뀐다.
 * 같은 사실을 두 군데에 따로 저장하지 않는다. 진행선의 양 끝도 지어낸 값이
 * 아니다 — 마지막 이용일과 그 예정일이다.
 */

import Link from "next/link";
import { ReactNode } from "react";
import { usePortal } from "@/lib/portal/store";
import {
  classifyWellnessType,
  nextReference,
  summarizePasses,
  summarizeUsage,
} from "@/lib/portal/wellness";
import {
  BookIcon,
  CalendarIcon,
  ChatIcon,
  ChevronRightIcon,
  ClipboardIcon,
  GiftIcon,
  LeafIcon,
  RefreshIcon,
  SparkIcon,
  TicketIcon,
} from "@/components/ui/icons";
import { BODY_PART_LABELS, type BodyPart } from "@/lib/types";
import FeedbackCard from "@/components/portal/FeedbackCard";
import NextVisitCard from "@/components/portal/NextVisitCard";
import ReferralCard from "@/components/portal/ReferralCard";
import { homecareTip, rankContents } from "@/lib/portal/content";
import {
  HCard,
  HScroll,
  Panel,
  QuickGrid,
  Section,
  StatusPill,
} from "@/components/portal/kit";

const ICON = "h-6 w-6";

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

  /**
   * 함께한 개월 수 — 첫 방문일부터 오늘까지.
   * 한 달이 안 됐으면 0 이 아니라 1 로 적는다. "0개월째" 는 사람이 쓰는
   * 말이 아니고, 처음 오신 분께 0 을 보여 줄 이유도 없다.
   */
  const monthsTogether = usage.firstVisitDate
    ? Math.max(
        1,
        Math.round(
          (Date.now() - new Date(usage.firstVisitDate).getTime()) /
            (30 * 86400_000),
        ),
      )
    : 0;

  const contents = rankContents({
    type: type.key,
    interestParts: profile.interestAreas ?? [],
  }).slice(0, 3);

  return (
    <div className="space-y-6">
      {/* ── 인사 ─────────────────────────────────────────
          「지금까지 쌓인 것」(함께한 개월 · 다녀가신 횟수)을 인사 아래 한 줄로.
          예전에는 숫자 세 칸이 따로 있었는데, 고객에게 그건 표가 아니라
          「6개월째 다니고 있구나」 하는 한 문장이면 된다. */}
      <div className="px-1 pt-1">
        <p className="text-[0.9375rem] font-bold text-ink-sub">
          {branch?.name ?? "정통대왕쑥뜸원"}
          {usage.visitCount > 0 &&
            ` · 함께한 지 ${monthsTogether}개월 · ${usage.visitCount}회 다녀가셨어요`}
        </p>
        <h1 className="mt-1 text-[1.625rem] font-extrabold leading-tight tracking-tight text-ink [word-break:keep-all]">
          {customer?.name}님, 안녕하세요
        </h1>
      </div>

      {/* ── 다음 방문 — 주문 추적 카드처럼 ─────────────── */}
      <NextVisitCard
        date={next.date}
        fromStore={next.fromStore}
        lastDate={usage.lastVisitDate}
        cta={{ href: "/my/booking", label: next.date ? "예약 변경 요청" : "방문 요청 남기기" }}
      />

      {/* ── 바로가기 여덟 칸 ─────────────────────────────
          하단 탭 다섯 칸에 못 들어간 곳(이용 기록 · 나의 웰니스 · 콘텐츠 ·
          서비스 안내)이 예전에는 다른 화면 안쪽 링크로만 닿았다.
          여기서 한 번에 다 보이게 한다 — 숨겨진 기능이 없게. */}
      <Panel className="!px-2 !py-4">
        <QuickGrid
          items={[
            { href: "/my/request", label: "방문 요청", icon: <CalendarIcon className={ICON} />, tone: "deep" },
            { href: "/my/passes", label: "이용권", icon: <TicketIcon className={ICON} />, tone: "gold" },
            { href: "/my/care", label: "케어기록", icon: <ClipboardIcon className={ICON} /> },
            { href: "/my/request?kind=inquiry", label: "1:1 상담", icon: <ChatIcon className={ICON} /> },
            { href: "/my/visits", label: "이용 기록", icon: <RefreshIcon className={ICON} /> },
            { href: "/my/wellness", label: "나의 웰니스", icon: <LeafIcon className={ICON} /> },
            { href: "/my/content", label: "웰니스 정보", icon: <BookIcon className={ICON} /> },
            { href: "/my/more", label: "서비스 안내", icon: <SparkIcon className={ICON} />, tone: "stone" },
          ]}
        />
      </Panel>

      {/* ── 이용권 — 적립 카드처럼 ─────────────────────── */}
      <PassCard
        remaining={pass.active?.remainingCount}
        total={pass.active?.totalCount}
        programName={pass.active?.programName}
        totalRemaining={pass.totalRemaining}
      />

      {/* ── 나를 위한 케어 — 옆으로 넘기는 카드 ────────────
          여기에 Wellness Type 라벨(재등록 관심형 · 장기미방문형 …)을 걸어
          두지 않는다. 매장이 고객을 나누려고 만든 말이지 고객에게 할 말이
          아니다. 그 자리에 **매장이 실제로 해 드린 것**(많이 봐 드린 부위)과
          생활 정보를 놓는다. */}
      <Section
        title="나를 위한 케어"
        sub="지금까지의 기록에 맞춰 골랐어요"
        more={{ href: "/my/content" }}
      >
        <HScroll label="나를 위한 케어">
          <HCard
            href="/my/care"
            className="!bg-gradient-to-br !from-deep-800 !to-deep-950 !ring-gold/20"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-gold ring-1 ring-white/15">
              <LeafIcon className="h-5 w-5" />
            </span>
            <span className="mt-3 text-[0.8125rem] font-extrabold text-gold">맞춤 안내</span>
            <span className="mt-0.5 break-words text-[1.125rem] font-extrabold leading-snug text-white [word-break:keep-all]">
              {topParts.length > 0
                ? `${topParts.map((p) => BODY_PART_LABELS[p]).join(" · ")} 케어`
                : usage.visitCount > 0
                  ? "이용 기록을 쌓고 있어요"
                  : "첫 방문을 기다리고 있어요"}
            </span>
            <span className="mt-1.5 text-[0.875rem] leading-relaxed text-white/75">
              {topParts.length > 0
                ? "지금까지 가장 많이 봐 드린 부위예요. 다음에 오시면 이어서 봐 드릴게요."
                : type.description}
            </span>
          </HCard>
          <HCard href="/my/content" className="!bg-gold-soft !ring-gold/25">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-card text-gold-deep ring-1 ring-gold/25">
              <SparkIcon className="h-5 w-5" />
            </span>
            <span className="mt-3 text-[0.8125rem] font-extrabold text-gold-deep">홈케어 TIP</span>
            <span className="mt-1 text-[0.9375rem] font-bold leading-relaxed text-ink-soft">
              {homecareTip(type.key)}
            </span>
          </HCard>
          {contents.map((c) => (
            <HCard key={c.id} href={`/my/content#${c.id}`}>
              <StatusPill tone="muted" className="self-start">
                {c.tag}
              </StatusPill>
              <span className="mt-2.5 break-words text-[1.0625rem] font-extrabold leading-snug text-ink [word-break:keep-all]">
                {c.title}
              </span>
              <span className="mt-1 text-[0.875rem] leading-relaxed text-ink-sub">
                {c.summary}
              </span>
              <span className="mt-auto inline-flex items-center gap-0.5 pt-3 text-[0.875rem] font-extrabold text-aqua-700">
                읽어 보기
                <ChevronRightIcon className="h-4 w-4" />
              </span>
            </HCard>
          ))}
        </HScroll>
      </Section>

      {/* ── 이번 이용은 어떠셨는지 (매장으로 바로 전달) ── */}
      <FeedbackCard lastVisitId={lastVisit?.id} lastVisitAt={lastVisit?.visitedAt} />

      {/* ── 친구 추천 ────────────────────────────────── */}
      <ReferralCard branchName={branch?.name} icon={<GiftIcon className="h-5 w-5" />} />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   이용권 카드 — 적립 포인트 카드처럼
   ───────────────────────────────────────────────────────── */

function PassCard({
  remaining,
  total,
  programName,
  totalRemaining,
}: {
  remaining?: number;
  total?: number;
  programName?: string;
  totalRemaining: number;
}) {
  const has = remaining !== undefined && total !== undefined;
  const low = has && remaining <= 2;
  const used = has ? total - remaining : 0;
  /* 둘레 = 2πr, r=30 → 188.5 */
  const C = 188.5;
  const ratio = has && total > 0 ? remaining / total : 0;

  return (
    <PillCardLink href="/my/passes">
      <span className="min-w-0 flex-1">
        <span className="block text-[0.8125rem] font-extrabold tracking-wide text-gold-deep">
          이용권
        </span>
        <span className="mt-0.5 block text-[1.3125rem] font-extrabold leading-tight text-ink">
          {has
            ? low
              ? `${remaining}회 남았어요 · 곧 다 쓰세요`
              : `${remaining}회 남았어요`
            : totalRemaining > 0
              ? `${totalRemaining}회 남았어요`
              : "보유 이용권이 없어요"}
        </span>
        <span className="mt-1 block text-[0.875rem] leading-snug text-ink-sub">
          {has
            ? `${programName} · ${used}회 사용`
            : "이용권은 매장에서 등록해 드립니다"}
        </span>
        <span className="mt-2.5 inline-flex items-center gap-0.5 text-[0.9375rem] font-extrabold text-gold-deep">
          이용권 보기
          <ChevronRightIcon className="h-4 w-4" />
        </span>
      </span>

      {has ? (
        <span
          className="relative flex h-[4.75rem] w-[4.75rem] shrink-0 items-center justify-center"
          role="img"
          aria-label={`남은 횟수 ${remaining}회 (전체 ${total}회)`}
        >
          <svg viewBox="0 0 72 72" className="h-full w-full -rotate-90">
            <circle cx="36" cy="36" r="30" fill="none" stroke="rgb(var(--c-card))" strokeWidth="8" />
            <circle
              cx="36"
              cy="36"
              r="30"
              fill="none"
              stroke={low ? "rgb(var(--c-gold))" : "rgb(var(--c-aqua-500))"}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${C * ratio} ${C}`}
            />
          </svg>
          <span className="nowrap-num tabular absolute flex flex-col items-center leading-none">
            <span className={`text-[1.5rem] font-extrabold ${low ? "text-gold-deep" : "text-aqua-800"}`}>
              {remaining}
            </span>
            <span className="mt-0.5 text-[0.6875rem] font-bold text-ink-sub">/{total}회</span>
          </span>
        </span>
      ) : (
        <span className="flex h-[4.75rem] w-[4.75rem] shrink-0 items-center justify-center rounded-full bg-card text-gold-deep ring-1 ring-gold/25">
          <TicketIcon className="h-8 w-8" />
        </span>
      )}
    </PillCardLink>
  );
}

function PillCardLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      data-pass-card
      className="group flex items-center gap-4 rounded-[22px] bg-gradient-to-br from-gold-soft to-card p-4 shadow-card ring-1 ring-gold/25 transition-transform hover:-translate-y-0.5"
    >
      {children}
    </Link>
  );
}
