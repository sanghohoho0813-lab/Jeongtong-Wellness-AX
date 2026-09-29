"use client";

/**
 * 안내 영상 — 사용 안내 · 기술 소개
 * ==================================
 *
 * 두 편 다 세로(9:16) 영상이다. 폰으로 찍어 보내고 릴스로 올리는 것을
 * 전제로 만들었기 때문에, 이 화면도 폰에서 한 편이 화면 가득 차도록 둔다.
 * PC 에서는 둘을 나란히 세운다 — 가로로 늘리면 세로 영상 양옆이 비어서
 * 오히려 작아 보인다.
 *
 *   사용 안내  대표님 내외용. 아침에 챙길 고객 보기 · 기록 · 글씨 크게.
 *   기술 소개  심사 자리에서 "먼저 이것부터 보시죠" 하고 트는 영상.
 *              특허 출원 두 건 (온열 구조체 · 운영 AX) 과 성장 계획.
 *
 * 한 편을 틀면 다른 편은 멈춘다. 둘이 동시에 소리를 내면 둘 다 안 들린다.
 *
 * 파일은 public/videos 에 있다. 영상을 다시 만들면 같은 이름으로 덮어쓰고
 * 아래 LENGTH 의 길이만 고치면 된다.
 */

import { useEffect, useRef } from "react";
import PageHeader from "@/components/layout/PageHeader";
import { DownloadIcon, PlayIcon } from "@/components/ui/icons";

interface Video {
  id: "guide" | "tech";
  src: string;
  poster: string;
  title: string;
  length: string;
  who: string;
  points: string[];
  tone: "aqua" | "gold";
}

const VIDEOS: Video[] = [
  {
    id: "guide",
    src: "/videos/guide.mp4",
    poster: "/videos/guide-poster.jpg",
    title: "사용 안내",
    length: "3분 29초",
    who: "처음 쓰시는 분 · 대표님 내외",
    points: [
      "아침 — 오늘 챙길 손님 보기",
      "손님이 오시면 — 가운데 '기록'",
      "글씨가 작으면 — 더보기 → '크게'",
    ],
    tone: "aqua",
  },
  {
    id: "tech",
    src: "/videos/tech.mp4",
    poster: "/videos/tech-poster.jpg",
    title: "기술 소개",
    length: "2분 42초",
    who: "심사 · 투자 · 외부 발표 자리",
    points: [
      "특허 출원 ① 3층 온열 구조체",
      "특허 출원 ② 이용주기 기반 운영 AX",
      "자금 사용 계획 · 단계적 성장",
    ],
    tone: "gold",
  },
];

export default function VideosPage() {
  const refs = useRef<Record<string, HTMLVideoElement | null>>({});

  /*
    목차에서 '기술 소개' 를 눌러 들어왔으면 그 영상이 바로 보이게.

    이미 화면 안에 있으면 움직이지 않는다. PC 에서는 두 편이 나란히라
    둘 다 처음부터 보이는데, 끌어올리면 제목이 위쪽 백업 안내 띠 밑으로
    숨었다. 폰에서 아래에 있을 때만 내려가고, 위쪽 머리글 자리(scroll-mt)
    만큼 띄운다.
  */
  useEffect(() => {
    const id = window.location.hash.slice(1);
    const el = id && refs.current[id] ? document.getElementById(id) : null;
    if (el && el.getBoundingClientRect().top > window.innerHeight * 0.6) {
      el.scrollIntoView({ block: "start" });
    }
  }, []);

  const onPlay = (id: string) => {
    for (const [k, v] of Object.entries(refs.current)) {
      if (k !== id && v && !v.paused) v.pause();
    }
  };

  return (
    <div>
      <PageHeader
        title="안내 영상"
        description="세로 영상 두 편 · 소리를 켜고 보세요"
      />

      <div className="grid gap-5 lg:grid-cols-2">
        {VIDEOS.map((v) => {
          const gold = v.tone === "gold";
          return (
            <section
              key={v.id}
              id={v.id}
              aria-labelledby={`${v.id}-title`}
              className="scroll-mt-40 rounded-card bg-card p-4 shadow-card ring-1 ring-stone-line sm:p-5"
            >
              <div className="flex items-start gap-3">
                <span
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white shadow-sm ${
                    gold
                      ? "bg-gradient-to-br from-gold to-gold-deep"
                      : "bg-gradient-to-br from-aqua-500 to-deep-700"
                  }`}
                >
                  <PlayIcon className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <h2
                    id={`${v.id}-title`}
                    className="flex flex-wrap items-baseline gap-x-2 text-[1.25rem] font-extrabold leading-snug text-ink"
                  >
                    {v.title}
                    <span className="nowrap-num text-[0.9375rem] font-bold text-ink-sub">
                      {v.length}
                    </span>
                  </h2>
                  <p
                    className={`text-[0.9375rem] font-bold leading-snug ${
                      gold ? "text-gold-deep" : "text-aqua-800 dark:text-aqua-400"
                    }`}
                  >
                    {v.who}
                  </p>
                </div>
              </div>

              <ul className="mt-3 space-y-1">
                {v.points.map((p) => (
                  <li
                    key={p}
                    className="flex gap-2 text-[0.9375rem] leading-snug text-ink-sub [word-break:keep-all]"
                  >
                    <span
                      aria-hidden
                      className={`mt-[0.45em] h-1.5 w-1.5 shrink-0 rounded-full ${
                        gold ? "bg-gold" : "bg-aqua-500"
                      }`}
                    />
                    {p}
                  </li>
                ))}
              </ul>

              {/*
                세로 영상은 폭이 아니라 높이가 모자란다. PC 에서 폭을 다
                채우면 영상 하나가 화면 두 배 높이가 되어 버린다 — 화면
                높이 안에 들어오도록 폭을 줄인다.
              */}
              <div className="mx-auto mt-4 w-full max-w-[min(100%,calc((100dvh-10rem)*9/16))] overflow-hidden rounded-2xl bg-black shadow-card">
                <video
                  ref={(el) => {
                    refs.current[v.id] = el;
                  }}
                  data-video={v.id}
                  src={v.src}
                  poster={v.poster}
                  controls
                  playsInline
                  preload="metadata"
                  onPlay={() => onPlay(v.id)}
                  aria-label={`${v.title} 영상 (${v.length})`}
                  className="block aspect-[9/16] w-full bg-black"
                />
              </div>

              <a
                href={v.src}
                download={`정통대왕쑥뜸원-${v.title}.mp4`}
                className="mt-3 flex h-12 items-center justify-center gap-2 rounded-btn text-[0.9375rem] font-extrabold text-ink-sub ring-1 ring-stone-line transition-colors hover:bg-stone-bg active:bg-stone-bg"
              >
                <DownloadIcon className="h-5 w-5" />
                파일로 받기 · 카톡으로 보낼 때
              </a>
            </section>
          );
        })}
      </div>
    </div>
  );
}
