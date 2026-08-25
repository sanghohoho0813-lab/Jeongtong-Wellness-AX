"use client";

/**
 * 케어기록 — 저번에 뭘 해줬더라
 * ==============================
 *
 * 매장이 남긴 기록을 고객이 자기 말로 읽는 자리다.
 *
 * 여기서 조심할 것: 이 화면은 **무엇을 했는지**만 말한다. 그것이 몸에 어떤
 * 영향을 주었는지는 말하지 않는다. 그건 우리가 아는 일이 아니고, 안다고
 * 적는 순간 진단이 된다.
 *
 * 그래서 문장은 전부 사실만 남긴다 — 언제 오셨고, 어디를 봐 드렸고,
 * 몇 번째였고, 다음은 언제쯤인지.
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
import { ChevronRightIcon, LeafIcon } from "@/components/ui/icons";
import { formatDateKr, formatRelative } from "@/lib/utils/date";
import { BODY_PART_LABELS, type BodyPart } from "@/lib/types";
import { rankContents } from "@/lib/portal/content";

export default function MyCare() {
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

  const visitList = visits.filter((v) => v.type === "visit");
  const recent = visitList.slice(0, 4);

  /**
   * 실제로 봐 드린 부위를 세어 본다.
   * 고객이 고른 '관심 부위'(profile.interestAreas)와는 다른 값이다 —
   * 이쪽은 매장이 실제로 기록한 것이라서, 둘을 나란히 두면 서로를 설명해 준다.
   */
  const partCount = new Map<BodyPart, number>();
  for (const v of visitList) {
    for (const r of v.bodyParts ?? []) {
      partCount.set(r.part, (partCount.get(r.part) ?? 0) + 1);
    }
  }
  const topParts = [...partCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const interest = profile.interestAreas ?? [];
  const suggested = rankContents({ type: type.key, interestParts: interest }).slice(0, 2);

  return (
    <div className="space-y-4">
      <div className="px-1">
        <h1 className="text-[1.375rem] font-extrabold text-ink">케어기록</h1>
        <p className="mt-1 text-[0.9375rem] leading-relaxed text-ink-sub">
          매장에서 남긴 이용 기록입니다.
        </p>
      </div>

      {/* 누적 요약 세 칸 */}
      <div className="grid grid-cols-3 gap-2.5">
        <Card lift={false} className="!px-3 text-center">
          <p className="text-[0.8125rem] font-bold text-ink-sub">누적 이용</p>
          <p className="nowrap-num mt-1 text-[1.375rem] font-extrabold tabular text-ink">
            {usage.visitCount}회
          </p>
        </Card>
        <Card lift={false} className="!px-3 text-center">
          <p className="text-[0.8125rem] font-bold text-ink-sub">최근 방문</p>
          <p className="nowrap-num mt-1 text-[1.0625rem] font-extrabold tabular leading-tight text-ink">
            {usage.lastVisitDate ? formatDateKr(usage.lastVisitDate).slice(5) : "—"}
          </p>
          <p className="mt-0.5 text-[0.75rem] text-ink-faint">
            {usage.lastVisitDate ? formatRelative(usage.lastVisitDate) : "기록 없음"}
          </p>
        </Card>
        <Card lift={false} className="!px-3 text-center">
          <p className="text-[0.8125rem] font-bold text-ink-sub">다음 참고일</p>
          <p className="nowrap-num mt-1 text-[1.0625rem] font-extrabold tabular leading-tight text-aqua-800">
            {next.date ? formatDateKr(next.date).slice(5) : "—"}
          </p>
          <p className="mt-0.5 text-[0.75rem] text-ink-faint">
            {next.fromStore ? "매장 안내" : next.date ? "간격 기준" : "계산 전"}
          </p>
        </Card>
      </div>

      {/* 많이 봐 드린 부위 */}
      <Card>
        <h2 className="text-[1.0625rem] font-extrabold text-ink">
          많이 봐 드린 부위
        </h2>
        {topParts.length === 0 ? (
          <p className="mt-3 rounded-card border border-dashed border-stone-line bg-card-soft py-6 text-center text-[0.9375rem] text-ink-sub">
            아직 기록된 케어 부위가 없습니다.
          </p>
        ) : (
          <>
            <p className="mt-1 text-[0.875rem] leading-relaxed text-ink-sub">
              지금까지 방문에서 실제로 기록된 부위입니다.
            </p>
            <ul className="mt-3 space-y-2">
              {topParts.map(([part, n]) => {
                const max = topParts[0][1];
                return (
                  <li key={part} className="flex items-center gap-3">
                    <span className="w-20 shrink-0 text-[0.9375rem] font-bold text-ink-soft">
                      {BODY_PART_LABELS[part]}
                    </span>
                    <span className="h-2.5 min-w-0 flex-1 overflow-hidden rounded-full bg-stone-bg-deep">
                      <span
                        className="block h-full rounded-full bg-gradient-to-r from-aqua-500 to-deep-700"
                        style={{ width: `${Math.round((n / max) * 100)}%` }}
                      />
                    </span>
                    <span className="nowrap-num w-10 shrink-0 text-right text-[0.875rem] font-extrabold tabular text-ink">
                      {n}회
                    </span>
                  </li>
                );
              })}
            </ul>
          </>
        )}

        {interest.length > 0 && (
          <div className="mt-4 border-t border-stone-line pt-3">
            <p className="text-[0.875rem] font-bold text-ink-sub">
              내가 고른 관심 부위
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {interest.map((p) => (
                <Badge key={p} tone="outline">
                  {BODY_PART_LABELS[p]}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <Link href="/my/wellness" className="mt-4 block">
          <Button variant="secondary" size="lg" className="w-full justify-between">
            <span>나의 웰니스 정보 수정</span>
            <ChevronRightIcon className="h-5 w-5" />
          </Button>
        </Link>
      </Card>

      {/* 최근 방문 */}
      <Card>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-[1.0625rem] font-extrabold text-ink">최근 방문</h2>
          <Link
            href="/my/visits"
            className="tap-line inline-flex items-center gap-1 text-sm font-bold text-aqua-700"
          >
            전체 보기
            <ChevronRightIcon className="h-4 w-4" />
          </Link>
        </div>
        {recent.length === 0 ? (
          <p className="rounded-card border border-dashed border-stone-line bg-card-soft py-6 text-center text-[0.9375rem] text-ink-sub">
            아직 방문 기록이 없습니다.
          </p>
        ) : (
          <ul className="space-y-2.5">
            {recent.map((v) => (
              <li
                key={v.id}
                className="rounded-card bg-card-soft px-4 py-3 ring-1 ring-stone-line"
              >
                <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                  <span className="nowrap-num text-[0.9375rem] font-extrabold tabular text-ink">
                    {formatDateKr(v.visitedAt.slice(0, 10))}
                  </span>
                  <span className="text-[0.8125rem] text-ink-faint">
                    {formatRelative(v.visitedAt)}
                  </span>
                </div>
                <p className="mt-1 break-words text-[0.9375rem] text-ink-soft">
                  {v.programName || "정통대왕쑥뜸"}
                </p>
                {(v.bodyParts ?? []).length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {(v.bodyParts ?? []).map((r, i) => (
                      <Badge key={`${r.part}-${i}`} tone="aqua">
                        {BODY_PART_LABELS[r.part]}
                      </Badge>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* 이어서 볼 홈케어 */}
      {suggested.length > 0 && (
        <Card>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-1.5 text-[1.0625rem] font-extrabold text-ink">
              <LeafIcon className="h-4 w-4 shrink-0 text-gold-deep" />
              집에서 이어 가기
            </h2>
            <Link
              href="/my/content"
              className="tap-line inline-flex items-center gap-1 text-sm font-bold text-aqua-700"
            >
              전체 보기
              <ChevronRightIcon className="h-4 w-4" />
            </Link>
          </div>
          <ul className="space-y-2">
            {suggested.map((c) => (
              <li key={c.id}>
                <Link
                  href="/my/content"
                  className="block rounded-card bg-card-soft px-4 py-3 ring-1 ring-stone-line transition-colors hover:bg-aqua-50"
                >
                  <p className="break-words text-[0.9375rem] font-extrabold text-ink">
                    {c.title}
                  </p>
                  <p className="mt-0.5 break-words text-[0.875rem] leading-snug text-ink-sub">
                    {c.summary}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
