/**
 * 지금 있는 탭을 한 번 더 누르면 맨 위로 (D-59)
 * =============================================
 *
 * 카카오톡 · 배달 앱 · 은행 앱이 다 이렇게 움직인다. 긴 목록을 내려 보다가
 * 하단 탭을 다시 누르면 맨 위로 올라간다. 우리 화면에서는 같은 주소로 가는
 * 링크라 아무 일도 일어나지 않았다 — 눌렀는데 반응이 없는 탭은 고장 난
 * 것처럼 보인다.
 *
 * 이미 그 화면이면 이동은 막고 위로만 올린다. 다른 화면이면 평소대로 이동.
 * 움직임 줄이기 설정을 켠 분께는 미끄러지지 않고 바로 올라간다.
 */

import type { MouseEvent } from "react";

export function scrollToTop() {
  const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
}

export function scrollTopIfHere(e: MouseEvent, pathname: string, href: string) {
  if (pathname !== href) return;
  /* 새 탭으로 열기(Ctrl · ⌘ · 가운데 단추)는 건드리지 않는다 */
  if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
  e.preventDefault();
  scrollToTop();
}
