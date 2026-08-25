"use client";

/**
 * 마이페이지 — 내 정보 · 알림 · 로그아웃
 * =====================================
 *
 * '알림' 을 새 기능으로 만들지 않았다. 고객에게 알릴 일은 이미 다 있다 —
 * 내가 남긴 요청을 매장이 봤는지, 이용권이 얼마 안 남았는지, 예정일이
 * 지났는지. 없는 알림함을 새로 파는 대신 **이미 있는 사실을 모아서** 보여 준다.
 *
 * 그래서 여기 뜨는 줄은 전부 다른 화면에서도 확인할 수 있는 것이고,
 * 지어낸 알림은 하나도 없다.
 */

import Link from "next/link";
import { usePortal } from "@/lib/portal/store";
import { nextReference, summarizePasses, summarizeUsage } from "@/lib/portal/wellness";
import { Badge, Button, Card } from "@/components/ui";
import {
  BellIcon,
  ChevronRightIcon,
  PhoneIcon,
  TicketIcon,
} from "@/components/ui/icons";
import { daysAgo, formatDateKr, formatRelative } from "@/lib/utils/date";

interface Notice {
  key: string;
  text: string;
  href: string;
  tone: "aqua" | "gold" | "positive";
}

export default function MyAccount() {
  const { customer, branch, email, visits, memberships, requests, signOut } =
    usePortal();

  const usage = summarizeUsage(visits);
  const pass = summarizePasses(memberships);
  const next = nextReference(usage, customer?.nextManageDate);

  /* ── 알림 — 저장된 사실에서만 뽑는다 ─────────────── */
  const notices: Notice[] = [];

  const handled = requests.filter((r) => r.status === "handled");
  if (handled.length > 0) {
    notices.push({
      key: "handled",
      text: `남기신 요청 ${handled.length}건을 매장에서 확인했습니다.`,
      href: "/my/booking",
      tone: "positive",
    });
  }

  const openReq = requests.filter((r) => r.status === "open");
  if (openReq.length > 0) {
    notices.push({
      key: "open",
      text: `매장에서 확인 중인 요청이 ${openReq.length}건 있습니다.`,
      href: "/my/booking",
      tone: "aqua",
    });
  }

  if (pass.active && pass.active.remainingCount <= 2) {
    notices.push({
      key: "low",
      text: `${pass.active.programName} 잔여 ${pass.active.remainingCount}회 — 곧 소진됩니다.`,
      href: "/my/passes",
      tone: "gold",
    });
  }

  if (next.date && daysAgo(next.date) > 0) {
    notices.push({
      key: "due",
      text: `다음 방문 예정일(${formatDateKr(next.date)})이 지났습니다.`,
      href: "/my/booking",
      tone: "gold",
    });
  }

  return (
    <div className="space-y-4">
      <div className="px-1">
        <h1 className="text-[1.375rem] font-extrabold text-ink">마이페이지</h1>
      </div>

      {/* 내 정보 */}
      <Card>
        <div className="flex items-center gap-3.5">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-deep-700 to-deep-900 text-[1.375rem] font-extrabold text-gold">
            {(customer?.name ?? "회").slice(0, 1)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="break-words text-[1.25rem] font-extrabold leading-tight text-ink">
              {customer?.name}님
            </p>
            <p className="mt-1 break-all text-[0.875rem] text-ink-sub">{email}</p>
          </div>
        </div>

        <dl className="mt-4 divide-y divide-stone-line border-t border-stone-line">
          {[
            {
              k: "연락처",
              v: customer?.phone,
            },
            {
              k: "누적 이용",
              v: usage.visitCount > 0 ? `${usage.visitCount}회` : undefined,
            },
            {
              k: "첫 방문",
              v: usage.firstVisitDate ? formatDateKr(usage.firstVisitDate) : undefined,
            },
          ].map((row) => (
            <div
              key={row.k}
              className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 py-2.5"
            >
              <dt className="w-20 shrink-0 text-[0.8125rem] font-bold text-ink-sub">
                {row.k}
              </dt>
              <dd className="nowrap-num min-w-0 flex-1 break-words text-[0.9375rem] tabular text-ink-soft">
                {row.v || <span className="text-ink-faint">—</span>}
              </dd>
            </div>
          ))}
        </dl>

        <p className="mt-3 text-[0.8125rem] leading-relaxed text-ink-faint">
          이름·연락처는 매장이 관리합니다. 바뀐 내용이 있으면 매장에 알려
          주세요.
        </p>
      </Card>

      {/* 알림 */}
      <Card>
        <h2 className="mb-3 flex items-center gap-1.5 text-[1.0625rem] font-extrabold text-ink">
          <BellIcon className="h-4 w-4 shrink-0 text-aqua-700" />
          알림
        </h2>
        {notices.length === 0 ? (
          <p className="rounded-card border border-dashed border-stone-line bg-card-soft py-6 text-center text-[0.9375rem] text-ink-sub">
            새로 알려 드릴 내용이 없습니다.
          </p>
        ) : (
          <ul className="space-y-2">
            {notices.map((n) => (
              <li key={n.key}>
                <Link
                  href={n.href}
                  className="flex items-center gap-3 rounded-card bg-card-soft px-4 py-3 ring-1 ring-stone-line transition-colors hover:bg-aqua-50"
                >
                  <span className="shrink-0">
                    <Badge tone={n.tone} dot>
                      {n.tone === "gold" ? "확인" : "안내"}
                    </Badge>
                  </span>
                  <span className="min-w-0 flex-1 break-words text-[0.9375rem] text-ink-soft">
                    {n.text}
                  </span>
                  <ChevronRightIcon className="h-4 w-4 shrink-0 text-ink-faint" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* 매장 */}
      <Card>
        <h2 className="mb-3 text-[1.0625rem] font-extrabold text-ink">매장</h2>
        <dl className="divide-y divide-stone-line">
          {[
            { k: "상호", v: branch?.name ?? "정통대왕쑥뜸원" },
            { k: "주소", v: branch?.address },
            { k: "영업시간", v: branch?.openHours },
          ].map((row) => (
            <div
              key={row.k}
              className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 py-2.5"
            >
              <dt className="w-20 shrink-0 text-[0.8125rem] font-bold text-ink-sub">
                {row.k}
              </dt>
              <dd className="min-w-0 flex-1 break-words text-[0.9375rem] text-ink-soft">
                {row.v || <span className="text-ink-faint">—</span>}
              </dd>
            </div>
          ))}
        </dl>

        {branch?.phone && (
          <a
            href={`tel:${branch.phone.replace(/[^0-9+]/g, "")}`}
            aria-label={`매장에 전화 걸기 ${branch.phone}`}
            className="touch-target mt-3 inline-flex items-center gap-1.5 rounded-full bg-aqua-50 px-4 font-extrabold text-aqua-800 ring-1 ring-aqua-100 transition-colors hover:bg-aqua-100"
          >
            <PhoneIcon className="h-4 w-4 shrink-0" />
            {branch.phone}
          </a>
        )}
      </Card>

      {/* 서비스 소개로 가는 길 — 예전 '더보기' 화면 */}
      <Link href="/my/more" className="block">
        <Button variant="secondary" size="lg" className="w-full justify-between">
          <span className="inline-flex items-center gap-1.5">
            <TicketIcon className="h-4 w-4" />
            서비스 · 가격 알아보기
          </span>
          <ChevronRightIcon className="h-5 w-5" />
        </Button>
      </Link>

      {/* 로그아웃 */}
      <Card>
        <Button variant="ghost" className="w-full" onClick={() => void signOut()}>
          로그아웃
        </Button>
        {usage.lastVisitDate && (
          <p className="mt-2 text-center text-[0.8125rem] text-ink-faint">
            마지막 방문 {formatRelative(usage.lastVisitDate)}
          </p>
        )}
      </Card>

      <p className="px-1 pb-2 text-[0.75rem] leading-relaxed text-ink-faint">
        이 화면은 이용 내역을 확인하시는 곳입니다. 몸 상태에 대한 판단이나
        의학적 안내는 제공하지 않습니다.
      </p>
    </div>
  );
}
