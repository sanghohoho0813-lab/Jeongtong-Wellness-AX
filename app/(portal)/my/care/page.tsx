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

import { usePortal } from "@/lib/portal/store";
import {
  classifyWellnessType,
  nextReference,
  summarizePasses,
  summarizeUsage,
} from "@/lib/portal/wellness";
import { ChevronRightIcon } from "@/components/ui/icons";
import { formatDateKr, formatDateWithDay, formatRelative } from "@/lib/utils/date";
import { BODY_PART_LABELS, type BodyPart } from "@/lib/types";
import { rankContents } from "@/lib/portal/content";
import {
  EmptyLine,
  HCard,
  HScroll,
  PageHead,
  Panel,
  PillLink,
  Section,
  StatusPill,
} from "@/components/portal/kit";

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
  const suggested = rankContents({ type: type.key, interestParts: interest }).slice(0, 4);

  return (
    <div className="space-y-6">
      <PageHead title="케어기록" sub="매장에서 남긴 이용 기록입니다." />

      {/* 누적 요약 — 한 판 안의 세 칸 */}
      <Panel className="!p-0">
        <dl className="grid grid-cols-3 divide-x divide-stone-line">
          <div className="min-w-0 px-2 py-4 text-center">
            <dt className="text-[0.8125rem] font-bold text-ink-sub">누적 이용</dt>
            <dd className="nowrap-num tabular mt-1 text-[1.375rem] font-extrabold leading-none text-ink">
              {usage.visitCount}
              <span className="ml-0.5 text-[0.875rem] font-bold text-ink-sub">회</span>
            </dd>
          </div>
          <div className="min-w-0 px-2 py-4 text-center">
            <dt className="text-[0.8125rem] font-bold text-ink-sub">최근 방문</dt>
            <dd className="nowrap-num tabular mt-1 text-[1.0625rem] font-extrabold leading-tight text-ink">
              {usage.lastVisitDate ? formatDateKr(usage.lastVisitDate).slice(5) : "없음"}
            </dd>
            <dd className="mt-0.5 text-[0.75rem] text-ink-faint">
              {usage.lastVisitDate ? formatRelative(usage.lastVisitDate) : "기록 없음"}
            </dd>
          </div>
          <div className="min-w-0 px-2 py-4 text-center">
            <dt className="text-[0.8125rem] font-bold text-ink-sub">다음 참고일</dt>
            <dd className="nowrap-num tabular mt-1 text-[1.0625rem] font-extrabold leading-tight text-aqua-800">
              {next.date ? formatDateKr(next.date).slice(5) : "미정"}
            </dd>
            <dd className="mt-0.5 text-[0.75rem] text-ink-faint">
              {next.fromStore ? "매장 안내" : next.date ? "간격 기준" : "계산 전"}
            </dd>
          </div>
        </dl>
      </Panel>

      {/* 많이 봐 드린 부위 */}
      <Section title="많이 봐 드린 부위" sub="지금까지 방문에서 실제로 기록된 부위입니다.">
        <Panel>
          {topParts.length === 0 ? (
            <EmptyLine>아직 기록된 케어 부위가 없습니다.</EmptyLine>
          ) : (
            <ul className="space-y-2.5">
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
          )}

          {interest.length > 0 && (
            <div className="mt-4 border-t border-stone-line pt-3">
              <p className="text-[0.875rem] font-bold text-ink-sub">내가 고른 관심 부위</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {interest.map((p) => (
                  <StatusPill key={p} tone="muted">
                    {BODY_PART_LABELS[p]}
                  </StatusPill>
                ))}
              </div>
            </div>
          )}

          <PillLink href="/my/wellness" tone="soft" size="md" full between className="mt-4">
            <span>나의 웰니스 정보 수정</span>
            <ChevronRightIcon className="h-5 w-5" />
          </PillLink>
        </Panel>
      </Section>

      {/* 최근 방문 — 주문 추적 화면의 타임라인처럼: 맨 위가 가장 최근 */}
      <Section title="최근 방문" more={{ href: "/my/visits" }}>
        {recent.length === 0 ? (
          <EmptyLine>아직 방문 기록이 없습니다.</EmptyLine>
        ) : (
          <Panel>
            <ol data-care-timeline>
              {recent.map((v, i) => (
                <li key={v.id} className="relative flex gap-3.5 pb-5 last:pb-0">
                  {/* 점과 이어지는 선 */}
                  <span aria-hidden className="relative flex w-4 shrink-0 justify-center">
                    <span
                      className={`mt-1.5 h-3.5 w-3.5 rounded-full ring-4 ${
                        i === 0
                          ? "bg-aqua-500 ring-aqua-100 dark:ring-aqua-500/25"
                          : "bg-stone-line ring-transparent"
                      }`}
                    />
                    {i < recent.length - 1 && (
                      <span className="absolute bottom-[-0.25rem] top-6 w-0.5 rounded-full bg-stone-line" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="nowrap-num tabular text-[1rem] font-extrabold text-ink">
                      {formatDateWithDay(v.visitedAt.slice(0, 10))}
                      <span className="ml-1.5 text-[0.8125rem] font-medium text-ink-faint">
                        {formatRelative(v.visitedAt)}
                      </span>
                    </p>
                    <p className="mt-0.5 text-[0.9375rem] text-ink-sub">
                      {v.programName || "정통대왕쑥뜸"}
                    </p>
                    {(v.bodyParts ?? []).length > 0 && (
                      <p className="mt-1.5 flex flex-wrap gap-1.5">
                        {(v.bodyParts ?? []).map((r, j) => (
                          <StatusPill key={`${r.part}-${j}`} tone="wait">
                            {BODY_PART_LABELS[r.part]}
                          </StatusPill>
                        ))}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </Panel>
        )}
      </Section>

      {/* 집에서 이어 가기 — 옆으로 넘기는 카드 */}
      {suggested.length > 0 && (
        <Section title="집에서 이어 가기" more={{ href: "/my/content" }}>
          <HScroll label="집에서 이어 가기">
            {suggested.map((c) => (
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
              </HCard>
            ))}
          </HScroll>
        </Section>
      )}
    </div>
  );
}
