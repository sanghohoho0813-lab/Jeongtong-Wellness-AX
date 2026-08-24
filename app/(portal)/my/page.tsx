"use client";

/**
 * MY WELLNESS — 홈
 *
 * 고객이 열자마자 3초 안에 알아야 하는 것은 셋뿐이다.
 *   언제 왔었나 · 언제쯤 다시 오면 되나 · 이용권이 얼마나 남았나
 * 그래서 그 셋을 맨 위에 큰 글씨로 두고, 나머지는 그 아래로 내렸다.
 *
 * 관리자 대시보드를 흉내 내지 않는다. 지표를 늘어놓으면 고객은 자기
 * 이야기가 아니라 남의 보고서를 보는 기분이 된다.
 */

import Link from "next/link";
import { usePortal } from "@/lib/portal/store";
import {
  classifyWellnessType,
  nextReference,
  summarizePasses,
  summarizeUsage,
} from "@/lib/portal/wellness";
import { Badge, Button, Card } from "@/components/ui";
import { ChevronRightIcon } from "@/components/ui/icons";
import { formatDateKr, formatRelative } from "@/lib/utils/date";
import FeedbackCard from "@/components/portal/FeedbackCard";

export default function MyHome() {
  const { customer, visits, memberships, profile, contentOpens } = usePortal();

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

  return (
    <div className="space-y-4">
      {/* 인사 — 이름은 서버가 내려 준 내 이름이다 */}
      <div className="px-1">
        <p className="text-[1.375rem] font-extrabold leading-snug text-ink">
          {customer?.name}님, 안녕하세요
        </p>
        <p className="mt-1 text-[0.9375rem] text-ink-sub">
          {usage.visitCount > 0
            ? `지금까지 ${usage.visitCount}회 이용하셨습니다.`
            : "첫 이용을 기다리고 있습니다."}
        </p>
      </div>

      {/* 핵심 3장 */}
      <div className="grid grid-cols-1 gap-2.5 xs:grid-cols-3">
        <Card lift={false} className="text-center">
          <p className="text-[0.8125rem] font-bold text-ink-sub">최근 이용일</p>
          <p className="nowrap-num mt-1.5 text-[1.375rem] font-extrabold tabular text-ink">
            {usage.lastVisitDate ? formatDateKr(usage.lastVisitDate) : "—"}
          </p>
          <p className="mt-0.5 text-[0.8125rem] text-ink-faint">
            {usage.lastVisitDate ? formatRelative(usage.lastVisitDate) : "기록 없음"}
          </p>
        </Card>

        <Card lift={false} className="text-center">
          <p className="text-[0.8125rem] font-bold text-ink-sub">
            다음 관리 참고일
          </p>
          <p className="nowrap-num mt-1.5 text-[1.375rem] font-extrabold tabular text-aqua-700">
            {next.date ? formatDateKr(next.date) : "—"}
          </p>
          <p className="mt-0.5 text-[0.8125rem] text-ink-faint">
            {next.fromStore ? "매장 안내" : next.date ? "이용 간격 기준" : "계산 전"}
          </p>
        </Card>

        <Card lift={false} className="text-center">
          <p className="text-[0.8125rem] font-bold text-ink-sub">이용권 잔여</p>
          <p className="nowrap-num mt-1.5 text-[1.375rem] font-extrabold tabular text-ink">
            {pass.totalRemaining > 0 ? `${pass.totalRemaining}회` : "없음"}
          </p>
          <p className="mt-0.5 truncate text-[0.8125rem] text-ink-faint">
            {pass.active ? pass.active.programName : "보유 이용권 없음"}
          </p>
        </Card>
      </div>

      {/* 참고일이 어떻게 나온 값인지 — 권고로 읽히지 않게 근거를 함께 둔다 */}
      <Card lift={false} className="bg-card-soft">
        <p className="text-[0.8125rem] leading-relaxed text-ink-sub">
          {next.basis}
        </p>
      </Card>

      {/* 나의 Wellness Profile 요약 */}
      <Card>
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[0.8125rem] font-bold text-ink-sub">
              나의 Wellness Type
            </p>
            <p className="mt-1 flex flex-wrap items-center gap-2">
              <span className="text-[1.125rem] font-extrabold text-ink">
                {type.label}
              </span>
              {type.key === "accumulating" && <Badge tone="gray">기록 쌓는 중</Badge>}
            </p>
          </div>
          <Link
            href="/my/wellness"
            aria-label="나의 웰니스 자세히 보기"
            className="tap-line shrink-0 text-aqua-700"
          >
            <ChevronRightIcon className="h-5 w-5" />
          </Link>
        </div>
        <p className="mt-2 text-[0.9375rem] leading-relaxed text-ink-soft">
          {type.description}
        </p>
      </Card>

      {/* 최근 이용기록 — 세 줄만 */}
      <Card>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-[1.0625rem] font-extrabold text-ink">최근 이용기록</h2>
          <Link
            href="/my/visits"
            className="tap-line inline-flex items-center gap-1 text-sm font-bold text-aqua-700"
          >
            전체 보기
            <ChevronRightIcon className="h-4 w-4" />
          </Link>
        </div>
        {visits.length === 0 ? (
          <p className="rounded-card border border-dashed border-stone-line bg-card-soft py-6 text-center text-sm text-ink-sub">
            아직 이용기록이 없습니다.
          </p>
        ) : (
          <ul className="divide-y divide-stone-line">
            {visits.slice(0, 3).map((v) => (
              <li key={v.id} className="flex items-baseline gap-3 py-2.5">
                <span className="nowrap-num w-24 shrink-0 text-[0.8125rem] font-bold tabular text-ink-sub">
                  {formatDateKr(v.visitedAt.slice(0, 10))}
                </span>
                <span className="min-w-0 flex-1 truncate text-[0.9375rem] text-ink-soft">
                  {v.type === "consult" ? "상담" : v.programName || "정통대왕쑥뜸"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* 이번 이용은 어떠셨는지 — 이번 단계의 핵심 동작 */}
      <FeedbackCard lastVisitId={lastVisit?.id} lastVisitAt={lastVisit?.visitedAt} />

      {/* 예약 · 문의 */}
      <Card>
        <h2 className="text-[1.0625rem] font-extrabold text-ink">
          방문 요청 · 문의
        </h2>
        <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-ink-sub">
          희망하시는 날짜를 남겨 주시면 매장에서 확인 후 연락드립니다. 이
          화면에서 예약이 바로 확정되지는 않습니다.
        </p>
        <Link href="/my/request" className="mt-3 block">
          <Button variant="secondary" size="lg" className="w-full">
            방문 요청 남기기
          </Button>
        </Link>
      </Card>
    </div>
  );
}
