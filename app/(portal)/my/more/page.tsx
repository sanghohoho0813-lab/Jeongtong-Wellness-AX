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
import { PhoneIcon } from "@/components/ui/icons";
import { formatWon } from "@/lib/utils/format";
import {
  ListGroup,
  ListRow,
  PageHead,
  Panel,
  Section,
  StatusPill,
} from "@/components/portal/kit";

/** 실제 제품자료에서 옮긴 사진 — 홍보 페이지를 만들지는 않는다 */
const LAYERS: { no: number; name: string; desc: string; photo?: string }[] = [
  { no: 1, name: "보호용 거즈", desc: "피부에 먼저 올립니다" },
  { no: 2, name: "특제 반죽", desc: "여러 식물을 배합·발효", photo: "/service/dough.jpg" },
  { no: 3, name: "쑥", desc: "국내산 최상급", photo: "/service/mugwort.jpg" },
];

export default function MyMore() {
  const { products, branch } = usePortal();
  const sold = products.filter((p) => p.active);

  return (
    <div className="space-y-6">
      <PageHead back={{ href: "/my", label: "홈" }} title="서비스 안내" />

      {/* 사진이 맨 위 — 가게 화면 머리 사진처럼 */}
      <section className="overflow-hidden rounded-[22px] bg-card shadow-card ring-1 ring-black/[0.04] dark:ring-white/[0.06]">
        <div className="relative aspect-[16/10] bg-stone-bg-deep">
          <Image
            src="/service/moxa.jpg"
            alt="정통대왕쑥뜸 완성된 모습"
            fill
            sizes="(min-width: 640px) 480px, 100vw"
            className="object-cover"
          />
        </div>
        <div className="p-4">
          <h2 className="text-[1.125rem] font-extrabold text-ink">정통대왕쑥뜸</h2>
          <p className="mt-1 text-[0.9375rem] leading-relaxed text-ink-sub">
            피부 위에 거즈를 깔고, 그 위에 특제 반죽을 넓게 편 다음, 쑥을 올려
            온열을 전달하는 방식입니다.
          </p>
        </div>
      </section>

      <Section title="세 겹으로 올립니다">
        <ListGroup>
          {LAYERS.map((l) => (
            <ListRow
              key={l.no}
              chevron={false}
              icon={
                l.photo ? (
                  /* 사진이 있는 겹은 사진으로 — 가게 화면 메뉴 줄의 작은 사진처럼 */
                  <span className="relative block h-10 w-10 overflow-hidden rounded-xl">
                    <Image src={l.photo} alt={l.name} fill sizes="40px" className="object-cover" />
                  </span>
                ) : (
                  <span className="nowrap-num text-[1rem] font-extrabold text-aqua-800">{l.no}</span>
                )
              }
              title={
                l.photo ? (
                  <span>
                    <span className="nowrap-num mr-1.5 text-aqua-700">{l.no}</span>
                    {l.name}
                  </span>
                ) : (
                  l.name
                )
              }
              sub={l.desc}
            />
          ))}
        </ListGroup>
      </Section>

      {sold.length > 0 && (
        <Section title="매장 가격표" sub="새 이용권은 매장에서 등록해 드립니다.">
          <ListGroup>
            {sold.map((p) => (
              <ListRow
                key={p.id}
                chevron={false}
                title={p.name}
                right={
                  <span className="nowrap-num tabular text-[1rem] font-extrabold text-ink">
                    {formatWon(p.price)}
                  </span>
                }
              />
            ))}
          </ListGroup>
        </Section>
      )}

      {/* 앞으로 준비 중 — 되는 것처럼 보이지 않게 눌리지 않는 상태로 둔다 */}
      <Section title="준비 중인 서비스">
        <ListGroup className="opacity-80">
          {[
            { name: "홈케어 상품", desc: "집에서 이어가는 관리" },
            { name: "웰니스 멤버십", desc: "정기 이용 회원 혜택" },
          ].map((x) => (
            <ListRow
              key={x.name}
              chevron={false}
              title={<span className="text-ink-sub">{x.name}</span>}
              sub={x.desc}
              right={<StatusPill tone="muted">준비 중</StatusPill>}
            />
          ))}
        </ListGroup>
      </Section>

      {/* 매장 */}
      <Section title="매장">
        <Panel>
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
                      동작이다. 글자 링크가 아니라 누르는 알약으로 둔다.
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
        </Panel>
      </Section>

      <p className="px-1 pb-2 text-[0.75rem] leading-relaxed text-ink-faint">
        이 화면은 이용 내역을 확인하시는 곳입니다. 몸 상태에 대한 판단이나
        의학적 안내는 제공하지 않습니다.
      </p>
    </div>
  );
}
