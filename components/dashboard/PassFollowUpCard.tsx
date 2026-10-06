"use client";

/**
 * 이용권 챙길 분 — 기한 임박 · 기한 지남 · 다 쓰심 · 잔여 적음
 *
 * 매출기회 카드는 오늘 브리핑에 오른 분만 본다. 기한이 엿새 남은 이용권은
 * 그분이 브리핑에 안 오르면 아무 데도 안 보여서, 이 카드가 이용권 자료만
 * 보고 따로 고른다 (lib/scoring/pass-followup.ts).
 *
 * 한 줄에서 끝낸다 — 이름 · 이유 · 전화 걸기 · 「연락함」. 연락함을 누르면
 * 그 고객의 마지막 연락일이 오늘로 남고 줄은 맨 아래로 내려간다.
 * 고를 사람이 없으면 카드 자체를 그리지 않는다 (빈 카드로 첫 화면을 밀지 않는다).
 */

import Link from "next/link";
import { useMemo, useState } from "react";
import { useStore } from "@/lib/data/store";
import { displayName } from "@/lib/utils/format";
import { todayISO } from "@/lib/utils/date";
import {
  PASS_FOLLOW_ACTION,
  describePassFollowUp,
  findPassFollowUps,
} from "@/lib/scoring/pass-followup";
import { Card, SectionTitle } from "@/components/ui";
import { PhoneLink } from "@/components/ui/PhoneLink";
import { CheckIcon, TicketIcon } from "@/components/ui/icons";
import { useToast } from "@/components/ui/toast";

const SHOW = 4;

export default function PassFollowUpCard() {
  const {
    customers,
    memberships,
    visits,
    settings,
    privacyMode,
    canSeePhone,
    updateCustomer,
  } = useStore();
  const toast = useToast();
  const [all, setAll] = useState(false);

  const rows = useMemo(
    () =>
      findPassFollowUps(
        customers,
        memberships,
        visits,
        settings.careRules.membershipLowCount,
      ),
    [customers, memberships, visits, settings.careRules.membershipLowCount],
  );
  if (rows.length === 0) return null;

  const byId = new Map(customers.map((c) => [c.id, c]));
  const todo = rows.filter((r) => !r.contacted).length;
  const shown = all ? rows : rows.slice(0, SHOW);

  const markContacted = (customerId: string) => {
    const c = byId.get(customerId);
    if (!c) return;
    const prev = c.lastContactDate;
    updateCustomer(customerId, { lastContactDate: todayISO() });
    toast(
      `${displayName(c.name, privacyMode)} · 연락함으로 표시했습니다`,
      "success",
      {
        label: "되돌리기",
        onAction: () => updateCustomer(customerId, { lastContactDate: prev }),
      },
    );
  };

  return (
    <Card dataTour="dash-pass-followup">
      <SectionTitle
        tone="gold"
        icon={<TicketIcon className="h-4 w-4" />}
        hint={
          todo > 0
            ? `연락할 분 ${todo}명 · 기한 · 잔여 · 소진을 이용권 기록에서 골랐습니다`
            : "이번 주에 모두 연락했습니다"
        }
      >
        이용권 챙길 분
      </SectionTitle>

      <ul className="space-y-2" data-pass-followup>
        {shown.map((r) => {
          const c = byId.get(r.customerId);
          const name = displayName(c?.name ?? "고객", privacyMode);
          return (
            <li
              key={r.customerId}
              data-kind={r.kind}
              className={`rounded-card px-3.5 py-3 ring-1 ${
                r.contacted
                  ? "bg-card-soft ring-stone-line"
                  : r.kind === "expiring" || r.kind === "expired"
                    ? "bg-warn/10 ring-warn/40"
                    : "bg-card-soft ring-black/[0.04]"
              }`}
            >
              <Link
                href={`/customers/${r.customerId}`}
                className="block rounded-btn focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-aqua-400"
              >
                <span className="flex flex-wrap items-baseline gap-x-2">
                  <span className="break-words font-extrabold text-ink">{name}</span>
                  <span
                    className={`text-sm font-bold ${
                      r.contacted ? "text-ink-sub" : "text-aqua-800"
                    }`}
                  >
                    {r.contacted
                      ? `연락함 · ${Number(r.contactedAt!.slice(5, 7))}월 ${Number(
                          r.contactedAt!.slice(8, 10),
                        )}일`
                      : PASS_FOLLOW_ACTION[r.kind]}
                  </span>
                </span>
                <span
                  className={`mt-0.5 block text-[0.9375rem] leading-snug ${
                    r.kind === "expiring" || r.kind === "expired"
                      ? "text-warn-text"
                      : "text-ink-sub"
                  }`}
                >
                  {describePassFollowUp(r)}
                </span>
              </Link>
              {!r.contacted && (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <PhoneLink phone={c?.phone} canSee={canSeePhone} />
                  <button
                    type="button"
                    onClick={() => markContacted(r.customerId)}
                    className="touch-target inline-flex items-center gap-1.5 rounded-full bg-card px-3.5 py-1.5 text-sm font-bold text-ink-soft ring-1 ring-stone-line transition-colors hover:bg-aqua-50"
                  >
                    <CheckIcon className="h-4 w-4" />
                    연락함
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {rows.length > SHOW && (
        <button
          type="button"
          onClick={() => setAll((v) => !v)}
          className="touch-target mt-2 w-full rounded-btn text-center text-sm font-bold text-aqua-700 hover:bg-aqua-50"
        >
          {all ? "접기" : `${rows.length - SHOW}명 더 보기`}
        </button>
      )}
    </Card>
  );
}
