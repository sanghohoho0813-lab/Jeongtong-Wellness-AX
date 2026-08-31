/**
 * 지금까지 → 지금 → 앞으로 — 한 화면에 셋
 * ==========================================
 *
 * Why AX 는 14개 절짜리 글이다. 끝까지 읽으면 이야기가 다 들어 있지만,
 * 심사 자리나 소개 자리에서는 **끝까지 읽어 주지 않는다.** 화면을 띄우고
 * 30초 안에 "그래서 뭐가 달라졌고 어디까지 가려는 거냐" 가 읽혀야 한다.
 *
 * 그래서 본문 앞에 세 칸을 둔다. 사진 세 장을 던져 놓는 것이 아니라,
 * 칸마다 **무엇이 달라지는지를 줄로 적고** 본문의 해당 절로 이어 준다.
 *
 * 왜 굳이 사진인가
 * ----------------
 * '수기 관리' 와 '데이터 기반 운영' 의 차이는 글로 쓰면 다 비슷하게
 * 읽힌다. 종이가 흩어진 책상 사진과 태블릿 화면 사진을 나란히 놓으면
 * 설명이 필요 없다.
 *
 * 세 번째 칸만 다르게 그린다
 * --------------------------
 * ①②는 지금 있는 것이고 ③은 아직 없다. 셋을 똑같이 그리면 보는 사람이
 * 가맹점과 멤버십이 이미 돌아가고 있다고 읽는다. 그래서 ③에만
 *
 *   - 점선 테두리
 *   - 「향후 확장」 배지
 *   - 사진 위 옅은 막
 *
 * 을 준다. 색 하나로만 구분하지 않는 이유는 흑백으로 인쇄되거나 색 구분이
 * 어려운 분이 볼 수 있기 때문이다.
 */

import Image from "next/image";
import Link from "next/link";

export interface Stage {
  /** 위에 붙는 시점 표시 */
  when: string;
  title: string;
  lead: string;
  /** 이 단계에서 실제로 벌어지는 일 */
  points: string[];
  image: { src: string; alt: string };
  /** 본문 어느 절로 이어지는가 */
  href: string;
  hrefLabel: string;
  /** 아직 없는 단계인가 */
  future?: boolean;
}

export default function DocStages({ stages }: { stages: Stage[] }) {
  return (
    <ol data-stages className="grid grid-cols-1 gap-3 md:grid-cols-3">
      {stages.map((s, i) => (
        <li key={s.when} className="min-w-0">
          <div
            className={`flex h-full flex-col overflow-hidden rounded-card-lg bg-card shadow-card ${
              s.future
                ? "border border-dashed border-gold/55"
                : "ring-1 ring-stone-line"
            }`}
          >
            {/*
              폰에서는 16:9 로 얄팍하게 눕힌다. 셋이 세로로 쌓이는데
              칸마다 사진이 4:3 이면 사진만 800px 을 먹는다.
            */}
            <div className="relative aspect-[16/9] md:aspect-[3/2]">
              <Image
                src={s.image.src}
                alt={s.image.alt}
                fill
                sizes="(min-width: 768px) 33vw, 100vw"
                className="object-cover object-center"
              />
              {s.future && (
                /* 아직 없는 단계 — 사진을 한 겹 눌러 '아직' 을 눈으로도 */
                <span
                  aria-hidden
                  className="absolute inset-0 bg-stone-bg/45 mix-blend-luminosity"
                />
              )}
              <span className="absolute left-3 top-3 inline-flex items-center gap-1.5">
                <span
                  className={`nowrap-num inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-[0.75rem] font-extrabold ${
                    s.future
                      ? "bg-gold text-deep-900"
                      : "bg-deep-900 text-gold-lite"
                  }`}
                >
                  {i + 1}
                </span>
                <span
                  className={`rounded-full px-2.5 py-1 text-[0.75rem] font-extrabold backdrop-blur-md ${
                    s.future
                      ? "border border-dashed border-gold/70 bg-deep-950/70 text-gold-lite"
                      : "bg-deep-950/70 text-white"
                  }`}
                >
                  {s.when}
                </span>
              </span>
            </div>

            <div className="flex min-w-0 flex-1 flex-col p-5">
              <h3 className="text-[1.125rem] font-extrabold leading-snug text-ink">
                {s.title}
              </h3>
              <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-ink-sub">
                {s.lead}
              </p>

              <ul className="mt-3 space-y-1.5">
                {s.points.map((p) => (
                  <li
                    key={p}
                    className="flex items-start gap-2 text-[0.875rem] leading-snug text-ink-soft"
                  >
                    <span
                      aria-hidden
                      className={`mt-[0.4rem] h-1.5 w-1.5 shrink-0 rounded-full ${
                        s.future ? "bg-gold" : "bg-aqua-500"
                      }`}
                    />
                    <span className="min-w-0">{p}</span>
                  </li>
                ))}
              </ul>

              <Link
                href={s.href}
                className={`tap-line mt-auto inline-block pt-4 text-[0.875rem] font-extrabold underline-offset-4 hover:underline ${
                  s.future ? "text-gold-deep" : "text-aqua-800"
                }`}
              >
                {s.hrefLabel} →
              </Link>
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}
