"use client";

/**
 * 안내 영상 — 두 편 중 하나를 고르는 자리
 * =====================================
 *
 * 영상은 한 편씩 자기 화면에서 본다 (/videos/guide · /videos/tech).
 * 왼쪽 목차의 '사용법' · '기술 소개' 단추는 바로 그 화면으로 간다.
 * 이 화면은 주소를 직접 치거나 예전 주소(/videos#tech)로 들어온 경우를
 * 위한 것이다 — 예전 주소는 표식을 보고 그 영상 화면으로 넘긴다.
 *
 * 두 편을 여기서 나란히 틀지 않는다. 고르기만 한다.
 */

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/layout/PageHeader";
import { ChevronRightIcon, PlayIcon } from "@/components/ui/icons";
import { VIDEO_LIST } from "@/lib/content/videos";

export default function VideosPage() {
  const router = useRouter();

  useEffect(() => {
    const id = window.location.hash.slice(1);
    const hit = VIDEO_LIST.find((v) => v.id === id);
    if (hit) router.replace(hit.href);
  }, [router]);

  return (
    <div>
      <PageHeader title="안내 영상" description="보실 영상을 고르세요 · 세로(9:16) · 가로(16:9) 둘 다 있습니다" />
      <div className="grid gap-4 sm:grid-cols-2">
        {VIDEO_LIST.map((v) => {
          const gold = v.tone === "gold";
          return (
            <Link
              key={v.id}
              href={v.href}
              data-video-link={v.id}
              className="group flex items-center gap-4 rounded-card bg-card p-4 shadow-card ring-1 ring-stone-line transition-colors hover:bg-stone-bg active:bg-stone-bg sm:p-5"
            >
              <span
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-white shadow-sm ${
                  gold ? "bg-gradient-to-br from-gold to-gold-deep" : "bg-gradient-to-br from-aqua-500 to-deep-700"
                }`}
              >
                <PlayIcon className="h-6 w-6" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-baseline gap-x-2 text-[1.1875rem] font-extrabold text-ink">
                  {v.title}
                  <span className="nowrap-num text-[0.9375rem] font-bold text-ink-sub">{v.length}</span>
                </span>
                <span
                  className={`block text-[0.9375rem] font-bold leading-snug [word-break:keep-all] ${
                    gold ? "text-gold-deep" : "text-aqua-800 dark:text-aqua-400"
                  }`}
                >
                  {v.eyebrow}
                </span>
                <span className="mt-0.5 block text-[0.875rem] leading-snug text-ink-sub [word-break:keep-all]">
                  {v.summary}
                </span>
              </span>
              <ChevronRightIcon className="h-5 w-5 shrink-0 text-ink-faint" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
