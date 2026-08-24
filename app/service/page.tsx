"use client";

/**
 * 서비스 표준
 * ===========
 * 우리 매장이 **무엇을, 어떤 구성으로, 얼마에** 제공하는지 한 장에 모은 화면.
 *
 * 홍보 페이지가 아니다. 새로 온 직원이 "우리가 파는 게 정확히 뭐고 얼마죠?"
 * 를 물어볼 자리이고, 원장님이 가격을 바꾸면 그 결과가 여기서 바로 보인다.
 * 가격은 설정의 가격표(ServiceProduct)를 그대로 읽으므로 화면마다 값이
 * 어긋날 수 없다.
 *
 * 표현 원칙
 *  - 회사 소개자료에는 '치유·효과' 같은 표현이 있지만 여기에는 옮기지 않는다.
 *    운영 시스템이 효능을 말하기 시작하면 그 순간 성격이 달라진다.
 *  - 사진과 구성은 실제 제품자료에 있는 것만 싣는다.
 */

import Image from "next/image";
import Link from "next/link";
import PageHeader from "@/components/layout/PageHeader";
import { useStore } from "@/lib/data/store";
import { formatWon } from "@/lib/utils/format";
import { Card, SectionTitle } from "@/components/ui";
import { ChevronRightIcon } from "@/components/ui/icons";

/** 실제 제품 사진 — 쑥뜸 제품자료에서 옮긴 것 */
const PHOTOS = [
  {
    src: "/service/dough.jpg",
    title: "특제 반죽",
    caption:
      "여러 가지 식물을 곱게 갈아 배합·발효해 만든 반죽입니다. 피부 위에 올린 거즈 위에 넓게 깔아 씁니다.",
  },
  {
    src: "/service/mugwort.jpg",
    title: "국내산 쑥",
    caption: "반죽 위에 올리는 쑥입니다. 국내산 최상급을 씁니다.",
  },
  {
    src: "/service/moxa.jpg",
    title: "정통대왕쑥뜸",
    caption:
      "거즈 → 특제 반죽 → 쑥 순서로 올려 완성한 모습입니다. 넓은 부위에 온열을 전달합니다.",
  },
];

/** 시술 구성 — 아래에서 위로 쌓는 순서 */
const LAYERS = [
  { no: 3, name: "쑥", desc: "국내산 최상급" },
  { no: 2, name: "특제 반죽", desc: "여러 식물을 배합·발효" },
  { no: 1, name: "보호용 거즈", desc: "피부에 먼저 올린다" },
];

export default function ServicePage() {
  const { products, settings, branches } = useStore();
  const sold = products
    .filter((p) => p.active)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const branch = branches[0];

  return (
    <div>
      <PageHeader
        title="서비스 표준"
        description="우리 매장이 제공하는 서비스의 구성과 판매 기준입니다."
      />

      {/* 1) 구성 — 무엇으로 이루어져 있는가 */}
      <Card className="mb-4 lg:mb-5">
        <SectionTitle>정통대왕쑥뜸 구성</SectionTitle>
        <p className="-mt-2 mb-4 text-sm leading-relaxed text-ink-sub">
          피부 위에 거즈를 깔고, 그 위에 특제 반죽을 넓게 편 다음, 쑥을 올려
          온열을 전달하는 방식입니다. 몸 한 곳이 아니라 복부·등처럼 넓은 부위에
          쓸 수 있습니다.
        </p>
        <ol className="space-y-2">
          {LAYERS.map((l) => (
            <li
              key={l.no}
              className="flex items-center gap-3 rounded-card bg-card-soft px-4 py-3 ring-1 ring-stone-line"
            >
              <span className="nowrap-num flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-aqua-50 text-sm font-extrabold text-aqua-800 ring-1 ring-aqua-100">
                {l.no}
              </span>
              <span className="min-w-0">
                <span className="block font-extrabold text-ink">{l.name}</span>
                <span className="block text-[0.8125rem] text-ink-sub">
                  {l.desc}
                </span>
              </span>
            </li>
          ))}
        </ol>
      </Card>

      {/* 2) 실제 제품 사진 */}
      <Card className="mb-4 lg:mb-5">
        <SectionTitle>실제 제품</SectionTitle>
        <p className="-mt-2 mb-4 text-sm leading-relaxed text-ink-sub">
          매장에서 실제로 쓰는 재료와 완성된 모습입니다.
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {PHOTOS.map((ph) => (
            <figure key={ph.src} className="min-w-0">
              <div className="relative aspect-[4/3] overflow-hidden rounded-card bg-stone-bg-deep ring-1 ring-black/[0.06]">
                <Image
                  src={ph.src}
                  alt={ph.title}
                  fill
                  sizes="(min-width: 640px) 33vw, 100vw"
                  className="object-cover"
                />
              </div>
              <figcaption className="mt-2.5">
                <p className="font-extrabold text-ink">{ph.title}</p>
                <p className="mt-0.5 text-[0.8125rem] leading-relaxed text-ink-sub">
                  {ph.caption}
                </p>
              </figcaption>
            </figure>
          ))}
        </div>
      </Card>

      {/* 3) 판매 기준 — 설정의 가격표를 그대로 읽는다 */}
      <Card className="mb-4 lg:mb-5">
        <SectionTitle>판매 중인 이용권</SectionTitle>
        <p className="-mt-2 mb-4 text-sm leading-relaxed text-ink-sub">
          설정 → 서비스 · 이용권 상품에 적어 둔 가격표입니다. 이용권 등록
          화면도 같은 값을 읽습니다.
        </p>
        {sold.length === 0 ? (
          <p className="rounded-card border border-dashed border-stone-line bg-card-soft py-8 text-center text-sm text-ink-sub">
            판매 중인 상품이 없습니다.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            {sold.map((p) => (
              <div
                key={p.id}
                className="rounded-card bg-card-soft px-4 py-4 text-center ring-1 ring-stone-line"
              >
                <p className="text-[0.9375rem] font-extrabold text-ink">
                  {p.name}
                </p>
                <p className="nowrap-num mt-2 text-2xl font-extrabold tabular text-ink">
                  {formatWon(p.price)}
                </p>
                {p.sessionCount > 1 && (
                  <p className="nowrap-num mt-1 text-[0.8125rem] tabular text-ink-sub">
                    1회당 {formatWon(Math.round(p.price / p.sessionCount))}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
        <p className="mt-3 text-[0.8125rem] leading-relaxed text-ink-sub">
          유효기간 · 할인 규정은 매장에서 정한 내용이 없어 시스템에 두지
          않았습니다. 정하시면 그때 반영합니다.
        </p>
      </Card>

      {/* 4) 매장 정보 */}
      <Card>
        <SectionTitle>매장</SectionTitle>
        <dl className="divide-y divide-stone-line">
          {[
            { k: "상호", v: settings.companyName },
            { k: "지점", v: `${settings.branchName} · 대표 ${settings.ownerName}` },
            { k: "주소", v: branch?.address ?? "-" },
            { k: "연락처", v: branch?.phone ?? "-" },
            { k: "영업시간", v: settings.openHours },
          ].map((row) => (
            <div
              key={row.k}
              className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 py-2.5"
            >
              <dt className="w-20 shrink-0 text-[0.8125rem] font-bold text-ink-sub">
                {row.k}
              </dt>
              <dd className="min-w-0 flex-1 text-[0.9375rem] text-ink-soft">
                {row.v}
              </dd>
            </div>
          ))}
        </dl>
        <Link
          href="/settings#set-store"
          className="tap-line mt-3 inline-flex items-center gap-1 text-sm font-bold text-aqua-700 hover:text-aqua-800"
        >
          설정에서 수정
          <ChevronRightIcon className="h-4 w-4" />
        </Link>
      </Card>
    </div>
  );
}
