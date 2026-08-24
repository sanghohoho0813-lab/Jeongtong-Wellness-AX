"use client";

/**
 * 더보기 — 이용권 · 서비스 · 매장 · 계정
 *
 * 하단 네비를 다섯 칸으로 묶었으니 나머지는 여기 모은다.
 * 어르신이 한 화면에서 위에서 아래로 훑을 수 있게 순서를 정했다:
 * 내 것(이용권) → 우리가 파는 것(서비스) → 매장 → 내 계정.
 */

import Image from "next/image";
import { usePortal } from "@/lib/portal/store";
import { summarizePasses } from "@/lib/portal/wellness";
import { Badge, Button, Card, ProgressBar } from "@/components/ui";
import { formatWon } from "@/lib/utils/format";
import { formatDateKr } from "@/lib/utils/date";

/** 실제 제품자료에서 옮긴 사진 — 홍보 페이지를 만들지는 않는다 */
const LAYERS = [
  { no: 1, name: "보호용 거즈", desc: "피부에 먼저 올립니다" },
  { no: 2, name: "특제 반죽", desc: "여러 식물을 배합·발효" },
  { no: 3, name: "쑥", desc: "국내산 최상급" },
];

export default function MyMore() {
  const { customer, memberships, products, branch, email, signOut } = usePortal();
  const pass = summarizePasses(memberships);
  const sold = products.filter((p) => p.active);

  return (
    <div className="space-y-4">
      <div className="px-1">
        <h1 className="text-[1.375rem] font-extrabold text-ink">더보기</h1>
      </div>

      {/* 나의 이용권 */}
      <Card>
        <h2 className="mb-3 text-[1.0625rem] font-extrabold text-ink">
          나의 이용권
        </h2>

        {memberships.length === 0 ? (
          <p className="rounded-card border border-dashed border-stone-line bg-card-soft py-6 text-center text-sm text-ink-sub">
            보유하신 이용권이 없습니다.
          </p>
        ) : (
          <ul className="space-y-2.5">
            {memberships.map((m) => {
              const used = m.totalCount - m.remainingCount;
              const active = m.status === "active" && m.remainingCount > 0;
              return (
                <li
                  key={m.id}
                  className="rounded-card bg-card-soft px-4 py-3.5 ring-1 ring-stone-line"
                >
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="font-extrabold text-ink">{m.programName}</span>
                    {active ? (
                      <Badge tone="positive">이용 중</Badge>
                    ) : (
                      <Badge tone="gray">사용 완료</Badge>
                    )}
                    <span className="nowrap-num ml-auto text-[1.0625rem] font-extrabold tabular text-ink">
                      {m.remainingCount}/{m.totalCount}회
                    </span>
                  </div>

                  <div className="mt-2">
                    <ProgressBar
                      ratio={m.totalCount > 0 ? used / m.totalCount : 0}
                      tone={active && m.remainingCount <= 2 ? "warn" : "aqua"}
                    />
                  </div>

                  <p className="nowrap-num mt-2 text-[0.8125rem] tabular text-ink-sub">
                    {used}회 사용 · {m.remainingCount}회 남음 · 등록{" "}
                    {formatDateKr(m.purchasedAt)}
                  </p>
                </li>
              );
            })}
          </ul>
        )}

        {pass.totalRemaining > 0 && (
          <p className="nowrap-num mt-3 text-center text-[0.9375rem] font-bold tabular text-aqua-700">
            남은 이용 횟수 모두 합쳐 {pass.totalRemaining}회
          </p>
        )}

        <p className="mt-3 text-[0.75rem] leading-relaxed text-ink-faint">
          이용권 유효기간이나 환불 규정은 매장에서 정한 내용이 없어 표시하지
          않습니다. 궁금하신 점은 매장에 문의해 주세요.
        </p>
      </Card>

      {/* 서비스 알아보기 */}
      <Card>
        <h2 className="mb-3 text-[1.0625rem] font-extrabold text-ink">
          정통대왕쑥뜸 서비스 알아보기
        </h2>

        <div className="relative mb-3 aspect-[4/3] overflow-hidden rounded-card bg-stone-bg-deep ring-1 ring-black/[0.06]">
          <Image
            src="/service/moxa.jpg"
            alt="정통대왕쑥뜸 완성된 모습"
            fill
            sizes="(min-width: 640px) 480px, 100vw"
            className="object-cover"
          />
        </div>

        <p className="mb-3 text-[0.9375rem] leading-relaxed text-ink-sub">
          피부 위에 거즈를 깔고, 그 위에 특제 반죽을 넓게 편 다음, 쑥을 올려
          온열을 전달하는 방식입니다.
        </p>

        <ol className="space-y-2">
          {LAYERS.map((l) => (
            <li
              key={l.no}
              className="flex items-center gap-3 rounded-card bg-card-soft px-4 py-2.5 ring-1 ring-stone-line"
            >
              <span className="nowrap-num flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-aqua-50 text-sm font-extrabold text-aqua-800 ring-1 ring-aqua-100">
                {l.no}
              </span>
              <span className="min-w-0">
                <span className="block text-[0.9375rem] font-extrabold text-ink">
                  {l.name}
                </span>
                <span className="block text-[0.8125rem] text-ink-sub">{l.desc}</span>
              </span>
            </li>
          ))}
        </ol>

        {sold.length > 0 && (
          <>
            <p className="mb-2 mt-4 text-[0.8125rem] font-bold text-ink-sub">
              매장 가격표
            </p>
            <ul className="divide-y divide-stone-line">
              {sold.map((p) => (
                <li
                  key={p.id}
                  className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 py-2.5"
                >
                  <span className="min-w-0 flex-1 text-[0.9375rem] text-ink-soft">
                    {p.name}
                  </span>
                  <span className="nowrap-num text-[0.9375rem] font-extrabold tabular text-ink">
                    {formatWon(p.price)}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>

      {/* 앞으로 준비 중 — 되는 것처럼 보이지 않게 눌리지 않는 상태로 둔다 */}
      <Card>
        <h2 className="mb-3 text-[1.0625rem] font-extrabold text-ink">
          준비 중인 서비스
        </h2>
        <ul className="space-y-2">
          {[
            { name: "홈케어 상품", desc: "집에서 이어가는 관리" },
            { name: "웰니스 멤버십", desc: "정기 이용 회원 혜택" },
          ].map((x) => (
            <li
              key={x.name}
              className="flex items-center gap-3 rounded-card bg-card-soft px-4 py-3 opacity-70 ring-1 ring-stone-line"
            >
              <span className="min-w-0 flex-1">
                <span className="block text-[0.9375rem] font-extrabold text-ink-sub">
                  {x.name}
                </span>
                <span className="block text-[0.8125rem] text-ink-faint">
                  {x.desc}
                </span>
              </span>
              <Badge tone="gray">준비 중</Badge>
            </li>
          ))}
        </ul>
      </Card>

      {/* 매장 */}
      <Card>
        <h2 className="mb-3 text-[1.0625rem] font-extrabold text-ink">매장</h2>
        <dl className="divide-y divide-stone-line">
          {[
            { k: "상호", v: branch?.name ?? "정통대왕쑥뜸원" },
            { k: "주소", v: branch?.address },
            { k: "연락처", v: branch?.phone },
            { k: "영업시간", v: branch?.openHours },
          ].map((row) => (
            <div
              key={row.k}
              className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 py-2.5"
            >
              <dt className="w-20 shrink-0 text-[0.8125rem] font-bold text-ink-sub">
                {row.k}
              </dt>
              <dd className="min-w-0 flex-1 text-[0.9375rem] text-ink-soft">
                {row.k === "연락처" && row.v ? (
                  <a
                    href={`tel:${row.v.replace(/[^0-9+]/g, "")}`}
                    className="font-bold text-aqua-700"
                  >
                    {row.v}
                  </a>
                ) : (
                  row.v || <span className="text-ink-faint">—</span>
                )}
              </dd>
            </div>
          ))}
        </dl>
      </Card>

      {/* 계정 */}
      <Card>
        <h2 className="mb-2 text-[1.0625rem] font-extrabold text-ink">내 계정</h2>
        <p className="text-[0.8125rem] leading-relaxed text-ink-sub">
          {customer?.name}님 · {email}
        </p>
        <Button
          variant="ghost"
          className="mt-3 w-full"
          onClick={() => void signOut()}
        >
          로그아웃
        </Button>
      </Card>

      <p className="px-1 pb-2 text-[0.75rem] leading-relaxed text-ink-faint">
        이 화면은 이용 내역을 확인하시는 곳입니다. 몸 상태에 대한 판단이나
        의학적 안내는 제공하지 않습니다.
      </p>
    </div>
  );
}
