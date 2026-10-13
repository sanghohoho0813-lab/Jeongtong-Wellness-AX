"use client";

/**
 * 영상 한 편 보는 화면 — /videos/guide · /videos/tech
 * ================================================
 *
 *   ┌──────────────── 영상 ─────────────────┐  ┌── 영상 흐름 ──┐
 *   │      [ 세로 9:16 | 가로 16:9 ]         │  │ 0:00  인사     │
 *   │          ▶ (고른 비율의 영상)          │  │ 0:07  …        │
 *   │  재생 속도 [1배][1.25배][1.5배] [전체] │  └────────────────┘
 *   │  파일로 내려받기 [세로 29MB][가로 ..]  │  ┌── 보시기 전에 ─┐
 *   └────────────────────────────────────────┘  └────────────────┘
 *
 * 폰에서는 위에서 아래로 같은 순서다.
 *
 * - 처음 비율: 주소의 ?r=16x9 · ?r=9x16 → 지난번에 고른 비율 → 화면 폭
 *   (PC 는 가로, 폰은 세로). 고른 비율은 이 기기에만 기억한다.
 * - 보다가 비율을 바꾸면 **그 자리에서** 이어서 나온다. 두 파일은 같은
 *   음성 · 같은 시각이라 시각을 그대로 넘기면 된다. 재생 속도도 그대로.
 * - 영상 흐름을 누르면 그 장면부터 튼다. 지금 나오는 장면이 칠해진다.
 * - 재생 속도는 단추로 바로 — 브라우저 메뉴(⋮) 안의 속도는 대표님이
 *   찾지 못한다.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  DownloadIcon,
  ExpandIcon,
  GaugeIcon,
  ListPlayIcon,
  MonitorIcon,
  PhoneFrameIcon,
  PlayIcon,
} from "@/components/ui/icons";
import { useDocumentTitle } from "@/lib/utils/title";
import {
  clock,
  RATIO_LABEL,
  VIDEOS,
  type Ratio,
  type VideoId,
} from "@/lib/content/videos";

const RATIO_KEY = "jeongtong-video-ratio";
const RATES = [1, 1.25, 1.5] as const;
const ALL_RATIOS: Ratio[] = ["9x16", "16x9"];

function firstRatio(ratios: Ratio[]): Ratio {
  const ok = (r: string | null): r is Ratio => ratios.includes(r as Ratio);
  const q = new URLSearchParams(window.location.search).get("r");
  if (ok(q)) return q;
  try {
    const saved = localStorage.getItem(RATIO_KEY);
    if (ok(saved)) return saved;
  } catch {
    /* 사생활 보호 창 — 기억 없이 화면 폭으로 */
  }
  const wide = window.matchMedia("(min-width: 1024px)").matches;
  return ok(wide ? "16x9" : "9x16") ? (wide ? "16x9" : "9x16") : ratios[0];
}

export default function VideoWatch({ id }: { id: VideoId }) {
  const v = VIDEOS[id];
  useDocumentTitle(v.title);
  // 용량이 0 이면 아직 올리지 않은 파일 — 그 비율의 단추 · 내려받기를 감춘다
  const RATIOS = ALL_RATIOS.filter((r) => v.files[r].mb > 0);

  const ref = useRef<HTMLVideoElement | null>(null);
  const [ratio, setRatio] = useState<Ratio | null>(null);
  const [rate, setRate] = useState<number>(1);
  const [chapter, setChapter] = useState(0);
  // 비율을 바꾸는 순간의 자리 — 새 파일이 열리면 거기서 잇는다
  const resume = useRef<{ t: number; play: boolean } | null>(null);

  const ratioKey = RATIOS.join();
  useEffect(
    () => setRatio(firstRatio(ratioKey.split(",") as Ratio[])),
    [ratioKey],
  );

  const pickRatio = (r: Ratio) => {
    if (r === ratio) return;
    const el = ref.current;
    if (el)
      resume.current = { t: el.currentTime, play: !el.paused && !el.ended };
    setRatio(r);
    try {
      localStorage.setItem(RATIO_KEY, r);
    } catch {
      /* 기억 못 해도 지금 화면은 바뀐다 */
    }
  };

  const onLoaded = () => {
    const el = ref.current;
    if (!el) return;
    // 파일이 바뀌면 브라우저가 속도를 1배로 되돌린다 — 고른 속도를 다시 건다
    el.defaultPlaybackRate = rate;
    el.playbackRate = rate;
    const r = resume.current;
    resume.current = null;
    if (r && r.t > 0) {
      el.currentTime = r.t;
      if (r.play) el.play().catch(() => {});
    }
  };

  const pickRate = (r: number) => {
    setRate(r);
    const el = ref.current;
    if (el) {
      el.defaultPlaybackRate = r;
      el.playbackRate = r;
    }
  };

  const fullscreen = () => {
    const el = ref.current as
      | (HTMLVideoElement & { webkitEnterFullscreen?: () => void })
      | null;
    if (!el) return;
    if (el.requestFullscreen) {
      el.requestFullscreen().catch(() => el.webkitEnterFullscreen?.());
    } else {
      el.webkitEnterFullscreen?.(); // 아이폰 사파리
    }
  };

  const jump = (i: number) => {
    setChapter(i);
    const el = ref.current;
    if (!el) return;
    el.currentTime = v.chapters[i].at;
    el.play().catch(() => {});
  };

  const onTime = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    let i = 0;
    v.chapters.forEach((c, k) => {
      if (c.at <= el.currentTime + 0.25) i = k;
    });
    setChapter((p) => (p === i ? p : i));
  }, [v.chapters]);

  const file = ratio ? v.files[ratio] : null;
  const gold = v.tone === "gold";
  const accent = gold ? "text-gold-deep" : "text-aqua-800 dark:text-aqua-400";

  return (
    <div data-video-page={v.id}>
      {/* 머리 — 누구를 위한 영상 · 제목 · 한 줄 요약 */}
      <header className="mb-4 lg:mb-6">
        <p
          className={`text-[0.8125rem] font-extrabold tracking-[0.16em] ${accent}`}
        >
          {v.eyebrow}
        </p>
        <h1
          id="video-title"
          className="text-page-title mt-1 flex items-center gap-2.5 text-ink"
        >
          <span
            className={`hidden h-6 w-1.5 shrink-0 rounded-full sm:block ${
              gold
                ? "bg-gradient-to-b from-gold to-gold-deep"
                : "bg-gradient-to-b from-aqua-400 to-deep-700"
            }`}
          />
          {v.title}
        </h1>
        <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-ink-sub [word-break:keep-all]">
          {v.summary} ·{" "}
          <span className="nowrap-num font-bold text-ink">{v.length}</span> ·{" "}
          {RATIOS.map((r) => RATIO_LABEL[r].long).join(" · ")} · 자막 포함
        </p>
      </header>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_23rem]">
        {/* ── 영상 ── */}
        <section
          aria-label={`${v.title} 재생`}
          className="rounded-card bg-card p-3 shadow-card ring-1 ring-stone-line sm:p-5"
        >
          <div
            role="group"
            aria-label="화면 비율"
            className="mx-auto mb-3 flex w-fit rounded-full bg-stone-bg p-1 ring-1 ring-stone-line sm:mb-4"
          >
            {RATIOS.map((r) => {
              const on = ratio === r;
              const Icon = r === "9x16" ? PhoneFrameIcon : MonitorIcon;
              return (
                <button
                  key={r}
                  type="button"
                  data-ratio={r}
                  aria-pressed={on}
                  onClick={() => pickRatio(r)}
                  className={`flex min-h-[44px] items-center gap-1.5 rounded-full px-4 text-[0.9375rem] font-extrabold transition-colors sm:px-5 ${
                    on
                      ? "bg-deep-800 text-white shadow-sm"
                      : "text-ink-sub hover:text-ink"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="nowrap-num">{RATIO_LABEL[r].short}</span>
                </button>
              );
            })}
          </div>

          {/*
            세로 영상은 폭이 아니라 높이가 모자란다 — PC 에서 폭을 다 채우면
            영상 하나가 화면 두 배 높이가 된다. 화면 높이 안에 들어오도록
            폭을 줄인다. 가로 영상은 카드 폭을 다 쓴다.
          */}
          <div
            className={`mx-auto overflow-hidden rounded-2xl bg-black shadow-card ${
              ratio === "16x9"
                ? "w-full"
                : "w-full max-w-[min(100%,calc((100dvh-9rem)*9/16))] lg:max-w-[min(100%,calc((100dvh-21rem)*9/16))]"
            }`}
          >
            {file ? (
              <video
                ref={ref}
                key={v.id}
                data-video={v.id}
                data-ratio={ratio ?? undefined}
                src={file.src}
                poster={file.poster}
                controls
                playsInline
                preload="metadata"
                onLoadedMetadata={onLoaded}
                onTimeUpdate={onTime}
                aria-label={`${v.title} ${RATIO_LABEL[ratio!].short} (${v.length})`}
                className={`block w-full bg-black ${ratio === "16x9" ? "aspect-video" : "aspect-[9/16]"}`}
              />
            ) : (
              <div className="aspect-video w-full bg-black" />
            )}
          </div>

          {/* 재생 속도 · 전체 화면 — 폰에서 줄이 넘어가도 속도 단추 셋은 한 줄로 붙여 둔다 */}
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2 sm:mt-4">
            <div
              role="group"
              aria-label="재생 속도"
              className="flex items-center gap-1.5 sm:gap-2"
            >
              <span className="mr-0.5 flex items-center gap-1 text-[0.9375rem] font-bold text-ink-sub">
                <GaugeIcon className="h-4 w-4" />
                재생 속도
              </span>
              {RATES.map((r) => (
                <button
                  key={r}
                  type="button"
                  data-rate={r}
                  aria-pressed={rate === r}
                  onClick={() => pickRate(r)}
                  className={`nowrap-num min-h-[44px] rounded-full px-3.5 text-[0.9375rem] font-extrabold transition-colors sm:px-4 ${
                    rate === r
                      ? "bg-deep-800 text-white shadow-sm"
                      : "bg-card text-ink ring-1 ring-stone-line hover:bg-stone-bg"
                  }`}
                >
                  {r}배
                </button>
              ))}
            </div>
            <button
              type="button"
              data-fullscreen
              onClick={fullscreen}
              className="flex min-h-[44px] items-center gap-1.5 rounded-full bg-card px-4 text-[0.9375rem] font-extrabold text-ink ring-1 ring-stone-line transition-colors hover:bg-stone-bg"
            >
              <ExpandIcon className="h-4 w-4" />
              전체 화면
            </button>
          </div>

          {/* 내려받기 — 두 비율 다 */}
          <div className="mt-4 border-t border-stone-line pt-3 text-center sm:mt-5 sm:pt-4">
            <p className="text-[0.875rem] font-bold text-ink-sub">
              파일로 내려받기 · 카카오톡 전송용
            </p>
            <div className="mt-2 flex flex-wrap justify-center gap-2">
              {RATIOS.map((r) => (
                <a
                  key={r}
                  href={v.files[r].src}
                  download={`정통대왕쑥뜸원-${v.title.replace(/\s/g, "")}-${r === "9x16" ? "세로" : "가로"}.mp4`}
                  data-download={r}
                  className="flex min-h-[48px] items-center gap-1.5 rounded-full bg-card px-4 text-[0.9375rem] font-extrabold text-ink ring-1 ring-stone-line transition-colors hover:bg-stone-bg active:bg-stone-bg"
                >
                  <DownloadIcon className="h-5 w-5" />
                  <span className="nowrap-num">
                    {RATIO_LABEL[r].short} ({v.files[r].mb}MB)
                  </span>
                </a>
              ))}
            </div>
          </div>
        </section>

        {/* ── 오른쪽 (폰에서는 아래) ── */}
        <div className="space-y-5">
          <section
            aria-labelledby="flow-title"
            className="rounded-card bg-card p-4 shadow-card ring-1 ring-stone-line sm:p-5"
          >
            <h2
              id="flow-title"
              className="flex items-center gap-2 text-[1.125rem] font-extrabold text-ink"
            >
              <ListPlayIcon className={`h-5 w-5 ${accent}`} />
              영상 흐름
            </h2>
            <p className="mt-0.5 text-[0.875rem] text-ink-sub">
              누르면 그 장면부터 재생합니다.
            </p>
            <ol className="mt-3 space-y-1" data-chapters>
              {v.chapters.map((c, i) => {
                const on = chapter === i;
                return (
                  <li key={c.at}>
                    <button
                      type="button"
                      data-at={c.at}
                      aria-current={on ? "true" : undefined}
                      onClick={() => jump(i)}
                      className={`flex min-h-[46px] w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors ${
                        on
                          ? gold
                            ? "bg-gold/10 ring-1 ring-gold/30"
                            : "bg-aqua-50 ring-1 ring-aqua-200"
                          : "hover:bg-stone-bg"
                      }`}
                    >
                      <span className="nowrap-num w-11 shrink-0 font-mono text-[0.875rem] font-bold tabular text-ink-sub">
                        {clock(c.at)}
                      </span>
                      <span
                        className={`min-w-0 flex-1 text-[0.9375rem] leading-snug [word-break:keep-all] ${
                          on ? "font-extrabold text-ink" : "font-bold text-ink"
                        }`}
                      >
                        {c.label}
                      </span>
                      {on && (
                        <PlayIcon className={`h-4 w-4 shrink-0 ${accent}`} />
                      )}
                    </button>
                  </li>
                );
              })}
            </ol>
          </section>

          <section
            aria-labelledby="notes-title"
            className="rounded-card bg-card p-4 shadow-card ring-1 ring-stone-line sm:p-5"
          >
            <h2
              id="notes-title"
              className="text-[1.125rem] font-extrabold text-ink"
            >
              {v.notesTitle}
            </h2>
            <ul className="mt-2 space-y-1.5">
              {v.notes.map((n) => (
                <li
                  key={n}
                  className="flex gap-2 text-[0.9375rem] leading-snug text-ink-sub [word-break:keep-all]"
                >
                  <span
                    aria-hidden
                    className={`mt-[0.5em] h-1.5 w-1.5 shrink-0 rounded-full ${gold ? "bg-gold" : "bg-aqua-500"}`}
                  />
                  {n}
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
