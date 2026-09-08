"use client";

/**
 * 맨 위로 — 긴 화면에서 길을 잃지 않게
 * ==================================
 *
 * 폰에서 설정은 9.8화면, 사용 방법은 6.7화면, 대시보드도 5화면이다.
 * 아래까지 내려간 뒤 위의 단추로 돌아가려면 엄지로 여덟 번을 쓸어야
 * 하고, 60대 손은 그 사이 어디까지 왔는지를 놓친다.
 *
 * 한 화면 반 넘게 내려갔을 때만 나타난다. 첫 화면에서는 없다 —
 * 늘 떠 있는 단추는 누를 자리를 하나 잡아먹을 뿐이다.
 * 폰에서는 하단 네비 위, 가운데 [기록] 단추와 겹치지 않게 오른쪽 끝.
 */

import { useEffect, useState } from "react";

export default function BackToTop() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    let raf = 0;
    const check = () => {
      raf = 0;
      setShow(window.scrollY > window.innerHeight * 1.5);
    };
    const onScroll = () => {
      if (!raf) raf = window.requestAnimationFrame(check);
    };
    check();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, []);

  if (!show) return null;

  const toTop = () => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
  };

  return (
    <button
      type="button"
      onClick={toTop}
      aria-label="맨 위로"
      data-back-to-top
      className="no-print fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] right-4 z-30 flex h-12 w-12 items-center justify-center rounded-full bg-card text-ink shadow-float ring-1 ring-stone-line transition-colors hover:bg-aqua-50 hover:text-aqua-800 lg:bottom-6 lg:right-6"
    >
      <svg
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M12 19V5" />
        <path d="m5 12 7-7 7 7" />
      </svg>
    </button>
  );
}
