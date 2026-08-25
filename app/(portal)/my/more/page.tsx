"use client";

/**
 * 서비스 알아보기 — 우리가 무엇을 어떻게 하는가
 *
 * 하단 다섯 칸을 '하러 오는 일'(홈·예약·이용권·케어기록·마이페이지)로
 * 다시 채우면서, 이 화면은 소개 전용이 되었다.
 *   내 이용권 → /my/passes
 *   내 계정   → /my/account
 * 같은 사실을 세 군데에 늘어놓지 않는다. 여기 남은 건 시술 구성과 가격,
 * 그리고 매장 정보뿐이다. (마이페이지에서 이어진다)
 */

import Image from "next/image";
import { usePortal } from "@/lib/portal/store";
import { Badge, Card } from "@/components/ui";
import { PhoneIcon } from "@/components/ui/icons";
import { formatWon } from "@/lib/utils/format";

/** 실제 제품자료에서 옮긴 사진 — 홍보 페이지를 만들지는 않는다 */
const LAYERS = [
  { no: 1, name: "보호용 거즈", desc: "피부에 먼저 올립니다" },
  { no: 2, name: "특제 반죽", desc: "여러 식물을 배합·발효" },
  { no: 3, name: "쑥", desc: "국내산 최상급" },
];

export default function MyMore() {
  const { products, branch } = usePortal();
  const sold = products.filter((p) => p.active);

  return (
    <div className="space-y-4">
      <div className="px-1">
        <h1 className="text-[1.375rem] font-extrabold text-ink">서비스 알아보기</h1>
      </div>

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
                  /*
                    매장에 전화 거는 것은 이 화면에서 고객이 하는 가장 중요한
                    동작이다. 그런데 글자 링크라 손가락 과녁이 128×20 이었다.
                    누르는 것으로 보이게, 그리고 닿는 크기로 둔다.
                  */
                  <a
                    href={`tel:${row.v.replace(/[^0-9+]/g, "")}`}
                    aria-label={`매장에 전화 걸기 ${row.v}`}
                    className="touch-target -my-1 inline-flex items-center gap-1.5 rounded-full bg-aqua-50 px-3.5 font-extrabold text-aqua-800 ring-1 ring-aqua-100 transition-colors hover:bg-aqua-100"
                  >
                    <PhoneIcon className="h-4 w-4 shrink-0" />
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

      <p className="px-1 pb-2 text-[0.75rem] leading-relaxed text-ink-faint">
        이 화면은 이용 내역을 확인하시는 곳입니다. 몸 상태에 대한 판단이나
        의학적 안내는 제공하지 않습니다.
      </p>
    </div>
  );
}
