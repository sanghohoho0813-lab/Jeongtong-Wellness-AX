/**
 * 없는 주소 — 길 잃은 분을 다시 문 앞으로
 * ========================================
 *
 * 전에는 Next 기본 화면이었다. 검은 바탕에 영어 한 줄 —
 * 「404 | This page could not be found.」 주 사용자(40~60대)에게는
 * 무엇이 잘못됐는지도, 어디로 가야 하는지도 알 수 없는 화면이었다.
 *
 * 다른 문 화면과 같은 뼈대(DoorFrame)로 짓고, 갈 곳 셋을 목록 줄로 둔다.
 * 누가 왔는지 모르므로 고객 쪽 · 직원 쪽 길을 다 둔다.
 */

import Link from "next/link";
import type { Metadata } from "next";
import DoorFrame from "@/components/layout/DoorFrame";
import { ChevronRightIcon } from "@/components/ui/icons";

export const metadata: Metadata = {
  title: "찾으시는 화면이 없습니다 · 정통대왕쑥뜸원",
};

const WAYS = [
  { href: "/welcome", title: "매장 안내", sub: "가격 · 예약 · 상담 — 고객용 화면" },
  { href: "/my", title: "내 기록 (MY WELLNESS)", sub: "이용 기록과 남은 이용권" },
  { href: "/", title: "직원 화면 (내부 AX)", sub: "오늘 챙길 고객 · 방문 기록" },
];

export default function NotFound() {
  return (
    <DoorFrame
      eyebrow="주소를 다시 확인해 주세요"
      title="찾으시는 화면이 없습니다"
      sub="주소가 바뀌었거나 잘못 입력되었을 수 있습니다. 아래에서 가실 곳을 골라 주세요."
    >
      <ul className="-mx-2 divide-y divide-stone-line">
        {WAYS.map((w) => (
          <li key={w.href}>
            <Link
              href={w.href}
              className="flex min-h-[60px] items-center gap-3 rounded-2xl px-2 py-3 transition-colors hover:bg-card-soft"
            >
              <span className="min-w-0 flex-1">
                <span className="block text-[1rem] font-extrabold text-ink">{w.title}</span>
                <span className="mt-0.5 block text-[0.875rem] text-ink-sub">{w.sub}</span>
              </span>
              <ChevronRightIcon className="h-5 w-5 shrink-0 text-ink-faint" />
            </Link>
          </li>
        ))}
      </ul>
    </DoorFrame>
  );
}
