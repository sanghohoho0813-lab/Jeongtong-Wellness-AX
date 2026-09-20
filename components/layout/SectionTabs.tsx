"use client";

/**
 * 묶음 안에서 옆으로 옮기는 큰 탭
 * ==============================
 *
 * 목차를 넷으로 줄이면서 「오늘의 실행 브리핑」 「AX 코치」 「방문 기록」
 * 「재방문 관리」 가 목차에서 내려왔다. 내려온 화면이 찾기 어려워지면
 * 줄인 보람이 없으므로, 묶음에 들어서는 순간 **화면 맨 위**에 형제
 * 화면들을 통째로 펼쳐 놓는다. 한 번 더 누를 일이 없다.
 *
 * 지키는 것 셋.
 *
 *   1. 손가락 크기 — 높이 48px 아래로 내려가지 않는다.
 *   2. 읽히는 크기 — 17px. 이 화면의 주 사용자는 60대다.
 *   3. 색만으로 구분하지 않는다 — 지금 자리는 **칠해진 바탕 + 흰 글자 +
 *      더 굵은 획**으로 표시한다. 색맹이거나 화면이 밝은 곳에서도 보인다.
 *
 * 좁은 폰(400px 미만)에서는 아이콘을 뺀다. 셋이 한 줄에 들어가야 하는데
 * 아이콘까지 넣으면 글자가 잘리고, 잘린 탭은 아무도 누르지 않는다.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useStore } from "@/lib/data/store";
import { canAccessRoute } from "@/lib/auth/permissions";
import { isUnder, sectionForPath } from "./nav-items";

export default function SectionTabs() {
  const pathname = usePathname();
  const { isManager } = useStore();

  const section = sectionForPath(pathname);
  if (!section) return null;

  const tabs = section.tabs.filter(
    (t) => isManager || canAccessRoute("STAFF", t.href),
  );
  // 갈 곳이 하나뿐이면 탭은 장식이다 — 그리지 않는다
  if (tabs.length < 2) return null;

  return (
    <nav
      aria-label={`${section.label} 안에서 화면 옮기기`}
      data-section-tabs={section.root}
      className="no-print mb-4 grid gap-1.5 rounded-card bg-card-soft p-1.5 ring-1 ring-stone-line"
      style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
    >
      {tabs.map((t) => {
        const active = isUnder(pathname, t.href);
        const Icon = t.icon;
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? "page" : undefined}
            className={`flex min-h-[3rem] min-w-0 items-center justify-center gap-1.5 rounded-btn px-1.5 text-[1.0625rem] leading-tight transition-colors ${
              active
                ? "bg-gradient-to-r from-deep-700 to-deep-800 font-extrabold text-white shadow-[0_2px_8px_rgba(10,46,44,0.22)]"
                : "font-bold text-ink-sub hover:bg-stone-bg"
            }`}
          >
            <Icon className="hidden h-[1.15rem] w-[1.15rem] shrink-0 xs:block" />
            <span className="truncate">{t.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
