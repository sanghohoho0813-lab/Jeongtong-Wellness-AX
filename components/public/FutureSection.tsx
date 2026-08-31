"use client";

/**
 * 앞으로 준비하고 있는 것
 * ========================
 *
 * 다섯 가지를 목록으로 보여 주고, 누르면 설명 창을 연다.
 *
 * "이미 있는 것" 과 헷갈리지 않게 하는 세 겹
 * ------------------------------------------
 * 이 화면에서 가장 위험한 실패는 화면이 깨지는 것이 아니라, 보는 사람이
 * **아직 없는 것을 있다고 읽는 것**이다. 정책기관이 그렇게 읽으면 그건
 * 우리가 거짓말을 한 것이 된다.
 *
 * 그래서 한 가지 표시에 기대지 않고 셋을 겹쳐 둔다.
 *
 *   ① 배지    모든 항목에 「향후 확장」
 *   ② 생김새  현재 기능 카드는 채운 면 + 실선,
 *             이쪽은 **점선 테두리 + 바탕 없음**. 멀리서도 다르다
 *   ③ 문장    구역 머리글과 창 안에 "아직 준비 중" 을 글로도 적는다
 *
 * 색만으로 구분하지 않는 이유는, 색을 구분하기 어려운 분도 있고 흑백으로
 * 인쇄되는 경우도 있기 때문이다. 점선은 두 경우 모두에서 남는다.
 *
 * 자리
 * ----
 * 이 구역은 화면 **아래쪽**에 둔다. 지금 예약하고 이용권을 보러 온 분이
 * 미래 이야기를 먼저 만나면 안 된다 (현재 70~80 / 미래 20~30).
 */

import { useState } from "react";
import Image from "next/image";
import { FUTURE_ITEMS, type FutureItem } from "@/lib/public/future";
import { Modal } from "@/components/ui";
import { ChevronRightIcon, SparkIcon } from "@/components/ui/icons";

/** 「향후 확장」 배지 — 목록과 창 안에서 같은 것을 쓴다 */
export function FutureBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full border border-dashed border-gold/60 px-2.5 py-0.5 text-[0.75rem] font-extrabold text-gold-deep ${className}`}
    >
      향후 확장
    </span>
  );
}

function PreviewBody({ item }: { item: FutureItem }) {
  return (
    <div className="space-y-5">
      {/*
        창을 열자마자 맨 위에 '아직 준비 중' 을 적는다. 아래 내용이
        구체적일수록 이 한 줄이 더 필요해진다.
      */}
      <p className="rounded-card border border-dashed border-gold/50 bg-gold-soft/40 px-4 py-3 text-[0.9375rem] font-bold leading-relaxed text-gold-deep">
        아직 준비 중인 기능입니다. 아래는 앞으로 만들려는 모습이고, 지금
        신청하거나 이용하실 수는 없습니다.
      </p>

      {item.image && (
        <figure className="relative aspect-[3/2] overflow-hidden rounded-card ring-1 ring-stone-line">
          <Image
            src={item.image.src}
            alt={item.image.alt}
            fill
            sizes="(min-width: 640px) 560px, 100vw"
            className="object-cover object-center"
          />
        </figure>
      )}

      <section>
        <h4 className="eyebrow mb-1.5">왜 필요한가</h4>
        <p className="text-[0.9375rem] leading-relaxed text-ink-sub">{item.why}</p>
      </section>

      <section>
        <h4 className="eyebrow mb-2">이런 것을 준비하려 합니다</h4>
        <ul className="space-y-1.5">
          {item.features.map((f) => (
            <li
              key={f}
              className="flex items-start gap-2.5 rounded-card border border-dashed border-stone-line px-3.5 py-2.5 text-[0.9375rem] leading-snug text-ink-soft"
            >
              <span
                aria-hidden
                className="mt-[0.45rem] h-1.5 w-1.5 shrink-0 rounded-full bg-gold"
              />
              <span className="min-w-0">{f}</span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h4 className="eyebrow mb-1.5">고객에게 생기는 변화</h4>
        <p className="text-[0.9375rem] leading-relaxed text-ink-sub">
          {item.change}
        </p>
      </section>

      <section className="rounded-card bg-card-soft px-4 py-3.5 ring-1 ring-stone-line">
        <h4 className="eyebrow mb-1.5">매장에는 어떤 의미인가</h4>
        <p className="text-[0.9375rem] leading-relaxed text-ink-sub">
          {item.growth}
        </p>
      </section>
    </div>
  );
}

/**
 * 목록 한 줄.
 *
 * `<button>` 이지 `<a>` 가 아니다. 링크로 두면 주소가 생기고, 주소가
 * 생기면 그 주소를 연 사람은 없는 화면(404)을 만난다. 여기서 열리는
 * 것은 같은 화면 위의 설명 창뿐이다.
 */
function FutureRow({ item, onOpen }: { item: FutureItem; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="card-lift group flex h-full w-full items-start gap-3.5 rounded-card-lg border border-dashed border-stone-line bg-card/60 p-5 text-left transition-colors hover:bg-card"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold-soft/50 text-gold-deep ring-1 ring-dashed ring-gold/30">
        <SparkIcon className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-[1.0625rem] font-extrabold text-ink">
            {item.label}
          </span>
          <FutureBadge />
        </span>
        <span className="mt-1 block text-[0.9375rem] leading-snug text-ink-sub">
          {item.tagline}
        </span>
        <span className="mt-2 inline-flex items-center gap-0.5 text-[0.875rem] font-extrabold text-gold-deep">
          어떤 모습일지 보기
          <ChevronRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </span>
      </span>
    </button>
  );
}

/**
 * 목록 + 창을 함께 쓰는 훅스러운 덩어리.
 * 공개 첫화면과 고객 마이페이지 두 곳에서 같은 것을 쓴다.
 */
export function useFuturePreview() {
  const [open, setOpen] = useState<FutureItem | null>(null);
  const sheet = (
    <Modal
      open={open !== null}
      onClose={() => setOpen(null)}
      title={open ? `${open.label} — 향후 확장` : ""}
      wide
    >
      {open && <PreviewBody item={open} />}
    </Modal>
  );
  return { openItem: setOpen, sheet };
}

export default function FutureSection({
  /** 좁은 화면에서 한 칸으로 둘지 */
  compact = false,
}: {
  compact?: boolean;
}) {
  const { openItem, sheet } = useFuturePreview();

  return (
    <>
      <div className="mb-4">
        <h2 className="text-[1.375rem] font-extrabold text-ink sm:text-[1.625rem]">
          앞으로 준비하고 있는 것
        </h2>
        <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-ink-sub">
          아래 다섯 가지는 <b className="text-ink-soft">아직 이용하실 수
          없습니다.</b> 정통대왕쑥뜸원이 앞으로 만들어 가려는 방향이라
          미리 적어 둡니다.
        </p>
      </div>

      <ul
        className={`grid grid-cols-1 gap-3 ${compact ? "" : "sm:grid-cols-2 lg:grid-cols-3"}`}
      >
        {FUTURE_ITEMS.map((item) => (
          <li key={item.key} className="min-w-0">
            <FutureRow item={item} onOpen={() => openItem(item)} />
          </li>
        ))}
      </ul>

      {sheet}
    </>
  );
}
