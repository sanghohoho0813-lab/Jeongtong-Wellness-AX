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

import { useState } from "react";
import { usePortal } from "@/lib/portal/store";
import { nextReference, summarizePasses, summarizeUsage } from "@/lib/portal/wellness";
import FutureSection from "@/components/public/FutureSection";
import {
  BellIcon,
  BookIcon,
  BuildingIcon,
  ChevronRightIcon,
  LeafIcon,
  PhoneIcon,
  RefreshIcon,
  SparkIcon,
  TicketIcon,
} from "@/components/ui/icons";
import { daysAgo, formatDateKr, formatRelative } from "@/lib/utils/date";
import {
  EmptyLine,
  ListGroup,
  ListRow,
  PageHead,
  Panel,
  PillButton,
  Section,
  StatusPill,
} from "@/components/portal/kit";

interface Notice {
  key: string;
  text: string;
  href: string;
  tone: "wait" | "warn" | "done";
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
      tone: "done",
    });
  }

  const openReq = requests.filter((r) => r.status === "open");
  if (openReq.length > 0) {
    notices.push({
      key: "open",
      text: `매장에서 확인 중인 요청이 ${openReq.length}건 있습니다.`,
      href: "/my/booking",
      tone: "wait",
    });
  }

  if (pass.active && pass.active.remainingCount <= 2) {
    notices.push({
      key: "low",
      text: `${pass.active.programName} 잔여 ${pass.active.remainingCount}회 — 곧 소진됩니다.`,
      href: "/my/passes",
      tone: "warn",
    });
  }

  if (next.date && daysAgo(next.date) > 0) {
    notices.push({
      key: "due",
      text: `다음 방문 예정일(${formatDateKr(next.date)})이 지났습니다.`,
      href: "/my/booking",
      tone: "warn",
    });
  }

  const [futureOpen, setFutureOpen] = useState(false);
  const I = "h-5 w-5";

  return (
    <div className="space-y-6">
      <PageHead title="마이페이지" />

      {/* 내 정보 — 적립 앱 계정 화면의 머리 카드처럼 */}
      <section className="rounded-[22px] bg-gradient-to-br from-deep-800 to-deep-950 p-5 text-white shadow-hero ring-1 ring-gold/20">
        <div className="flex items-center gap-3.5">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-gold to-gold-deep text-[1.375rem] font-extrabold text-deep-900">
            {(customer?.name ?? "회").slice(0, 1)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="break-words text-[1.25rem] font-extrabold leading-tight">
              {customer?.name}님
            </p>
            <p className="mt-1 break-all text-[0.875rem] text-white/70">{email}</p>
          </div>
        </div>
        <dl className="mt-4 grid grid-cols-3 divide-x divide-white/15 rounded-2xl bg-white/[0.07] py-3 ring-1 ring-white/10">
          {[
            { k: "누적 이용", v: usage.visitCount > 0 ? `${usage.visitCount}회` : "—" },
            { k: "남은 이용권", v: pass.totalRemaining > 0 ? `${pass.totalRemaining}회` : "—" },
            {
              k: "첫 방문",
              v: usage.firstVisitDate ? formatDateKr(usage.firstVisitDate).slice(2) : "—",
            },
          ].map((row) => (
            <div key={row.k} className="min-w-0 px-2 text-center">
              <dt className="text-[0.75rem] font-bold text-white/65">{row.k}</dt>
              <dd className="nowrap-num tabular mt-1 text-[1.0625rem] font-extrabold">{row.v}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* 알림 — 저장된 사실에서만 뽑는다 */}
      <Section title={<span className="inline-flex items-center gap-1.5"><BellIcon className="h-4 w-4 text-aqua-700" />알림</span>}>
        {notices.length === 0 ? (
          <EmptyLine>새로 알려 드릴 내용이 없습니다.</EmptyLine>
        ) : (
          <ListGroup>
            {notices.map((n) => (
              <ListRow
                key={n.key}
                href={n.href}
                title={<span className="text-[0.9375rem] font-bold text-ink-soft">{n.text}</span>}
                right={<StatusPill tone={n.tone}>{n.tone === "warn" ? "확인" : "안내"}</StatusPill>}
              />
            ))}
          </ListGroup>
        )}
      </Section>

      {/* 내 기록 · 정보 — 한 판에 줄로 */}
      <Section title="내 기록 · 정보">
        <ListGroup>
          <ListRow href="/my/passes" icon={<TicketIcon className={I} />} title="이용권" sub="남은 횟수 · 사용 내역" />
          <ListRow href="/my/visits" icon={<RefreshIcon className={I} />} title="나의 이용기록" sub="언제 · 무엇을 이용했는지" />
          <ListRow href="/my/wellness" icon={<LeafIcon className={I} />} title="나의 웰니스" sub="이용 흐름 · 관심 부위 · 프로필" />
          <ListRow href="/my/content" icon={<BookIcon className={I} />} title="웰니스 정보" sub="일상에서 해볼 수 있는 생활관리" />
          <ListRow href="/my/more" icon={<SparkIcon className={I} />} title="서비스 · 가격 알아보기" sub="쑥뜸 방식 · 매장 가격표" />
        </ListGroup>
      </Section>

      {/* 연락처 */}
      <Section title="연락처">
        <ListGroup>
          <ListRow
            chevron={false}
            icon={<PhoneIcon className={I} />}
            title={customer?.phone || <span className="text-ink-faint">—</span>}
            sub="이름·연락처는 매장이 관리합니다. 바뀐 내용이 있으면 매장에 알려 주세요."
          />
        </ListGroup>
      </Section>

      {/* 매장 */}
      <Section title="매장">
        <Panel>
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-stone-bg-deep text-ink-soft ring-1 ring-black/[0.04]">
              <BuildingIcon className={I} />
            </span>
            <p className="min-w-0 flex-1 break-words text-[1rem] font-extrabold text-ink">
              {branch?.name ?? "정통대왕쑥뜸원"}
            </p>
          </div>
          <dl className="mt-3 divide-y divide-stone-line">
            {[
              { k: "주소", v: branch?.address },
              { k: "영업시간", v: branch?.openHours },
            ].map((row) => (
              <div key={row.k} className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 py-2.5">
                <dt className="w-20 shrink-0 text-[0.8125rem] font-bold text-ink-sub">{row.k}</dt>
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
              className="touch-target mt-2 inline-flex items-center gap-1.5 rounded-full bg-aqua-50 px-4 font-extrabold text-aqua-800 ring-1 ring-aqua-100 transition-colors hover:bg-aqua-100"
            >
              <PhoneIcon className="h-4 w-4 shrink-0" />
              {branch.phone}
            </a>
          )}
        </Panel>
      </Section>

      {/*
        앞으로 준비하고 있는 것 — 한 줄로 접어 둔다.

        다섯 장을 늘 펴 두었더니 마이페이지가 2,700px 이었고 그 절반이
        아직 쓸 수 없는 것이었다. 줄 하나(「앞으로 준비 중인 서비스 5」)를
        누르면 펴진다. 공개 소개 화면(/welcome)에는 그대로 펴져 있다.
      */}
      <div>
        <ListGroup>
          <ListRow
            onClick={() => setFutureOpen((v) => !v)}
            expanded={futureOpen}
            icon={<SparkIcon className={I} />}
            title="앞으로 준비 중인 서비스"
            sub="아직 이용하실 수 없습니다 · 방향만 미리 적어 둡니다"
            chevron={false}
            right={
              <span className="inline-flex items-center gap-1">
                <StatusPill tone="warn">5</StatusPill>
                <ChevronRightIcon
                  className={`h-5 w-5 text-ink-faint transition-transform ${futureOpen ? "-rotate-90" : "rotate-90"}`}
                />
              </span>
            }
          />
        </ListGroup>
        {futureOpen && (
          <Panel className="mt-3">
            <FutureSection />
          </Panel>
        )}
      </div>

      {/* 로그아웃 */}
      <div className="text-center">
        <PillButton tone="outline" full onClick={() => void signOut()}>
          로그아웃
        </PillButton>
        {usage.lastVisitDate && (
          <p className="mt-2 text-[0.8125rem] text-ink-faint">
            마지막 방문 {formatRelative(usage.lastVisitDate)}
          </p>
        )}
      </div>

      <p className="px-1 pb-2 text-[0.75rem] leading-relaxed text-ink-faint">
        이 화면은 이용 내역을 확인하시는 곳입니다. 몸 상태에 대한 판단이나
        의학적 안내는 제공하지 않습니다.
      </p>
    </div>
  );
}
