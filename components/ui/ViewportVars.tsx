"use client";

/**
 * 폰 자판이 올라와도 창이 가려지지 않게 (D-61)
 * ============================================
 *
 * 아래에서 올라오는 창(방문 기록 · 고객 등록 · 기록할 고객 고르기)에서
 * 칸을 누르면 폰 자판이 올라온다. 아이폰 · 요즘 안드로이드 크롬은 자판이
 * 올라와도 화면 「바닥」 을 그대로 두고 그 위에 자판을 덮는다 — 그래서
 * 창 아래쪽(메모 칸 · 저장 단추)이 자판 밑에 깔렸다. 칸을 눌렀는데 그
 * 칸이 안 보이고, 저장 단추를 찾으려면 자판을 내려야 했다.
 *
 * 브라우저가 알려 주는 「지금 실제로 보이는 높이」(visualViewport)로
 * 두 값을 문서에 적어 둔다.
 *   --kb   자판 높이 (자판이 없으면 0)
 *   --vvh  지금 보이는 높이
 * 창은 바닥을 --kb 만큼 올리고, 키를 --vvh 안으로 줄인다 (globals.css
 * `.sheet-wrap` · `.sheet-panel`). 칸을 누르면 그 칸이 창 안에서 가운데로
 * 온다 (`keepFieldInView`).
 *
 * 주소창이 접히고 펴지는 정도(80px 미만)는 자판으로 치지 않는다.
 */

import { useEffect } from "react";

export default function ViewportVars() {
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const root = document.documentElement;
    let raf = 0;
    const apply = () => {
      raf = 0;
      const kb = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      root.style.setProperty("--kb", `${kb >= 80 ? Math.round(kb) : 0}px`);
      root.style.setProperty("--vvh", `${Math.round(vv.height)}px`);
      root.dataset.keyboard = kb >= 80 ? "open" : "closed";
    };
    const onChange = () => {
      if (!raf) raf = window.requestAnimationFrame(apply);
    };
    apply();
    vv.addEventListener("resize", onChange);
    vv.addEventListener("scroll", onChange);
    return () => {
      vv.removeEventListener("resize", onChange);
      vv.removeEventListener("scroll", onChange);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, []);
  return null;
}

/**
 * 창 안의 칸을 누르면 — 자판이 다 올라온 뒤(약 0.3초) 그 칸을 창 안
 * 가운데로. 창(패널)에 onFocus 로 단다.
 */
export function keepFieldInView(e: React.FocusEvent) {
  const t = e.target as HTMLElement;
  if (!t.matches("input:not([type=checkbox]):not([type=radio]), textarea, select")) return;
  window.setTimeout(() => {
    if (document.activeElement === t) t.scrollIntoView({ block: "center", behavior: "smooth" });
  }, 320);
}
