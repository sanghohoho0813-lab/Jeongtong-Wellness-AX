"use client";

/**
 * 고객이 남긴 것 — 첫 화면 수신함
 * ================================
 *
 * 왜 여기 있는가
 * --------------
 * 고객이 MY WELLNESS 에서 방문 요청이나 만족도를 남기면 고객상세에 뜬다.
 * 그런데 원장님이 고객상세를 여는 건 이미 그 고객을 떠올렸을 때다.
 * 아직 떠올리지 못한 고객이 남긴 요청은 아무도 열어 보지 않는다.
 *
 * 밖에서 안으로 들어온 것을 안쪽 어딘가에 쌓아 두기만 하면, 연결한 의미가
 * 없다. 매일 아침 여는 첫 화면에 "누가 무엇을 남겼는지" 를 올려 둔다.
 *
 * 판정에는 쓰지 않는다
 * --------------------
 * 이 카드는 세어서 보여 줄 뿐, 관리 우선순위(Priority Score)에 손대지
 * 않는다. 매장이 정한 관리 기준은 하나로 두고, 고객이 남긴 말은 그 옆에
 * 나란히 놓는다.
 */

import Link from "next/link";
import { useStore } from "@/lib/data/store";
import { useStaffLink } from "@/lib/supabase/StaffLink";
import { Badge, Card, SectionTitle } from "@/components/ui";
import { ChevronRightIcon, PhoneIcon } from "@/components/ui/icons";
import { displayName } from "@/lib/utils/format";
import { formatDateKr, formatRelative } from "@/lib/utils/date";

const SLOT_LABEL: Record<string, string> = {
  morning: "오전",
  afternoon: "오후",
  evening: "저녁",
};

const INTENT_LABEL: Record<string, string> = {
  yes: "또 방문 예정",
  maybe: "아직 미정",
  no: "당분간 어려움",
};

export default function CustomerInboxCard() {
  const { customers, privacyMode } = useStore();
  const { phase, requests, feedback } = useStaffLink();

  // 매장 계정을 연결하지 않았으면 이 통로 자체가 없다 — 빈 카드를 두지 않는다
  if (phase !== "linked") return null;

  const openRequests = requests.filter((r) => r.status === "open");
  const unread = feedback.filter((f) => !f.readAt);
  if (openRequests.length === 0 && unread.length === 0) return null;

  const nameOf = (customerId: string) => {
    const c = customers.find((x) => x.id === customerId);
    return c ? displayName(c.name, privacyMode) : "알 수 없는 고객";
  };

  /** 요청과 피드백을 시간순으로 섞어 위에서부터 보여 준다 */
  const items = [
    ...openRequests.map((r) => ({
      kind: "request" as const,
      id: r.id,
      customerId: r.customerId,
      at: r.createdAt,
      row: r,
    })),
    ...unread.map((f) => ({
      kind: "feedback" as const,
      id: f.id,
      customerId: f.customerId,
      at: f.createdAt,
      row: f,
    })),
  ]
    .sort((a, b) => (a.at < b.at ? 1 : -1))
    .slice(0, 4);

  return (
    <Card>
      <SectionTitle
        icon={<PhoneIcon className="h-4 w-4" />}
        tone="gold"
        action={
          <span className="flex flex-wrap gap-1.5">
            {openRequests.length > 0 && (
              <Badge tone="warn" dot>
                요청 {openRequests.length}
              </Badge>
            )}
            {unread.length > 0 && <Badge tone="aqua">새 피드백 {unread.length}</Badge>}
          </span>
        }
      >
        고객이 남긴 것
      </SectionTitle>

      <ul className="space-y-2">
        {items.map((it) => (
          <li key={`${it.kind}-${it.id}`}>
            <Link
              href={`/customers/${it.customerId}`}
              className="flex items-start gap-3 rounded-card bg-card-soft px-4 py-3 ring-1 ring-stone-line transition-colors hover:bg-aqua-50/60"
            >
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="font-extrabold text-ink">
                    {nameOf(it.customerId)}
                  </span>
                  {it.kind === "request" ? (
                    <Badge tone="warn">
                      {it.row.kind === "booking" ? "방문 희망" : "문의"}
                    </Badge>
                  ) : (
                    <>
                      {it.row.satisfaction && (
                        <Badge tone={it.row.satisfaction >= 4 ? "positive" : "warn"}>
                          만족도 {it.row.satisfaction}점
                        </Badge>
                      )}
                      {it.row.revisitIntent && (
                        <Badge tone="gray">
                          {INTENT_LABEL[it.row.revisitIntent]}
                        </Badge>
                      )}
                    </>
                  )}
                  <span className="nowrap-num ml-auto text-[0.8125rem] tabular text-ink-faint">
                    {formatRelative(it.at.slice(0, 10))}
                  </span>
                </span>

                <span className="mt-1 block truncate text-[0.9375rem] text-ink-soft">
                  {it.kind === "request"
                    ? [
                        it.row.preferredDate ? formatDateKr(it.row.preferredDate) : null,
                        it.row.preferredSlot ? SLOT_LABEL[it.row.preferredSlot] : null,
                        it.row.note,
                      ]
                        .filter(Boolean)
                        .join(" · ") || "내용 없음"
                    : it.row.note || "남긴 말 없음"}
                </span>
              </span>
              <ChevronRightIcon className="mt-1 h-4 w-4 shrink-0 text-ink-faint" />
            </Link>
          </li>
        ))}
      </ul>

      <p className="mt-3 text-[0.8125rem] leading-relaxed text-ink-sub">
        고객이 자기 화면에서 직접 남긴 내용입니다. 참고정보이며 관리 우선순위
        계산에는 쓰지 않습니다.
      </p>
    </Card>
  );
}
