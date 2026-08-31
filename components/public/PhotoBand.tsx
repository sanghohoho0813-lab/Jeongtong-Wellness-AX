/**
 * 사진 띠 — 글과 사진을 나란히 놓는 한 덩어리
 * ==============================================
 *
 * 공개 화면에 사진 자리가 여러 곳 생기면서, 같은 모양을 매번 손으로
 * 짜기 시작했다. 그러면 곧 여백이 4px 씩 어긋나고 폰에서 어떤 것은
 * 사진이 위, 어떤 것은 아래가 된다. 한 군데로 모은다.
 *
 * 왜 사진마다 aspect 를 받게 했나
 * -------------------------------
 * 받은 사진들의 원본 비율이 두 가지다.
 *
 *     1536×1024  → 1.50  (열 장)
 *     1774×887   → 2.00  (store_space, why_ax_growth 두 장)
 *
 * 2.0 짜리를 1.5 틀에 넣으면 좌우가 25% 잘리고, 1.5 짜리를 2.0 틀에
 * 넣으면 위아래가 25% 잘린다. 어느 쪽이든 사람 얼굴이나 핵심 피사체가
 * 먼저 잘려 나간다. 그래서 **부르는 쪽이 원본 비율을 알려 주고**,
 * 이 컴포넌트는 그 비율을 지킨다.
 *
 * 폰에서는 조금 다르다. 2.0 짜리를 폰 폭(358px)에 그대로 두면 높이가
 * 179px 라 띠처럼 얄팍해진다. 그래서 폰만 조금 더 세운 비율을 따로 받는다.
 */

import Image from "next/image";
import type { ReactNode } from "react";

export default function PhotoBand({
  src,
  alt,
  eyebrow,
  title,
  children,
  /** 폰에서 쓸 가로세로비 — 기본 4:3 */
  ratio = "aspect-[4/3]",
  /** sm 이상에서 쓸 가로세로비 — 원본에 가깝게 */
  ratioWide = "sm:aspect-[3/2]",
  /** 사진의 어느 지점을 남길지 */
  position = "object-center",
  /** 글을 왼쪽에 둘지 — 기본은 사진이 왼쪽 */
  textFirst = false,
  /** 사진 위에 얹는 작은 표 (선택) */
  tag,
}: {
  src: string;
  alt: string;
  eyebrow?: string;
  title: string;
  children: ReactNode;
  ratio?: string;
  ratioWide?: string;
  position?: string;
  textFirst?: boolean;
  tag?: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-card-lg bg-card shadow-card ring-1 ring-stone-line sm:grid sm:grid-cols-2 sm:items-stretch">
      {/*
        `aspect` 와 `min-h-full` 을 함께 둔다 — 둘 중 하나만 두면 안 된다.

        처음에는 `sm:aspect-auto sm:min-h-full` 로 두어 사진 높이를 옆 글
        높이에 맞췄다. 그런데 글이 짧은 칸에서 실제로 이렇게 나왔다.

            service_scene  537 × 225  → 가로세로비 2.39
            원본 1.50 을 2.39 틀에 넣으면 세로의 **37%** 가 잘린다

        사람 얼굴이 위쪽에 있는 사진이라 37% 를 위아래로 잘라내면 얼굴이
        먼저 없어진다. 글 길이가 사진 잘리는 양을 정하게 두면 안 된다.

        그래서 aspect 로 **최소 높이**를 잡고 min-h-full 로 늘어나게만 한다.
        aspect-ratio 가 높이를 정하고 min-height 는 그보다 줄이지 못하므로,
        결과는 '적어도 3:2, 옆 글이 더 길면 그만큼' 이 된다.

        (전에는 aspect-[3/2] 와 aspect-auto 를 한 요소에 같이 적어 두어서
         어느 쪽이 이길지가 Tailwind 의 출력 순서에 달려 있었다. 그런 건
         작동하는 것이 아니라 우연히 맞는 것이다.)
      */}
      <figure
        className={`relative ${ratio} ${ratioWide} sm:min-h-full ${
          textFirst ? "sm:order-2" : ""
        }`}
      >
        <Image
          src={src}
          alt={alt}
          fill
          sizes="(min-width: 640px) 50vw, 100vw"
          className={`object-cover ${position}`}
        />
        {tag && (
          <>
            <span
              aria-hidden
              className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/65 to-transparent"
            />
            <figcaption className="absolute inset-x-3 bottom-3">{tag}</figcaption>
          </>
        )}
      </figure>

      <div className="min-w-0 p-6 sm:flex sm:flex-col sm:justify-center sm:p-7">
        {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
        <h2 className="text-[1.375rem] font-extrabold leading-snug text-ink sm:text-[1.5rem]">
          {title}
        </h2>
        <div className="mt-2.5 space-y-2 text-[0.9375rem] leading-relaxed text-ink-sub">
          {children}
        </div>
      </div>
    </div>
  );
}
