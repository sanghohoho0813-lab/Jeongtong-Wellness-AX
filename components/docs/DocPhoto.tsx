/**
 * 글 사이에 끼우는 사진 한 장
 * ============================
 *
 * Why AX 본문은 열네 절짜리 글이다. 도해와 표는 이미 있지만, 어떤
 * 대목은 그림보다 **실제 장면**이 빠르다. "직원이 하루 종일 뭘 하는가"
 * 같은 이야기가 그렇다.
 *
 * 다만 여기는 업무 화면이 아니라 이야기 화면이라는 점이 중요하다.
 * v1.4 는 "내부 AX 는 사진을 늘리지 않는다" 고 못 박아 두었고, 그건
 * 대시보드·고객목록·브리핑처럼 **지표를 읽는 화면**을 말한다. Why AX
 * 는 읽는 글이라 사진이 정보를 밀어내지 않는다.
 *
 * 그래서 크게 넣지 않는다. 16:9 로 눕혀 한 단락 높이만 차지하게 두고,
 * 사진이 무엇을 말하는지 밑에 한 줄 적는다 — 설명 없는 사진은 분위기만
 * 만들고 지나간다.
 */

import Image from "next/image";

export default function DocPhoto({
  src,
  alt,
  caption,
}: {
  src: string;
  alt: string;
  caption: string;
}) {
  return (
    <figure className="my-4">
      {/*
        21:9 로 눕혔다가 되돌렸다.

        받은 사진은 1536×1024 (비 1.50)인데 21:9 는 2.33 이다. 그 틀에
        넣으면 세로의 **36%** 가 잘린다 — 사람이 있는 사진이라 위아래를
        그만큼 잘라내면 머리나 손이 먼저 없어진다.
        16:9(1.78)면 16% 만 잘린다. 폰·PC 모두 같은 비율을 쓴다.
      */}
      <div className="relative aspect-[16/9] overflow-hidden rounded-card ring-1 ring-stone-line">
        <Image
          src={src}
          alt={alt}
          fill
          sizes="(min-width: 640px) 720px, 100vw"
          className="object-cover object-center"
        />
      </div>
      <figcaption className="mt-2 text-[0.875rem] leading-relaxed text-ink-faint">
        {caption}
      </figcaption>
    </figure>
  );
}
