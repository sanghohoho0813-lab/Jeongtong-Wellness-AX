"use client";

/**
 * 폰 하단 고정 예약 막대
 * =======================
 *
 * 이 화면에 들어온 분이 하려는 일은 대개 하나다 — 예약.
 * 그런데 예약 카드는 첫 화면 맨 아래에 한 번 나오고, 그 아래로 '이런 분께',
 * 가격표, 기록 안내가 다섯 화면쯤 이어진다. 가격을 보다 마음이 정해지는
 * 순간에 예약 단추는 다섯 화면 위에 있는 셈이다.
 *
 * 왜 처음부터 띄우지 않는가
 * -------------------------
 * 처음부터 띄워 봤더니 첫 화면에 '예약하기' 가 두 번 나왔다 — 카드 하나,
 * 고정 막대 하나. 나란히 붙어 있으니 같은 단추를 두 번 그린 것처럼
 * 보이고, 첫인상만 어수선해졌다.
 *
 * 그래서 **위쪽 단추가 화면 밖으로 나간 뒤에만** 올라온다. 눈에 보이는
 * 예약 단추는 언제나 하나다.
 *
 * PC 에서는 아예 그리지 않는다 — 화면이 넓어 위쪽 카드가 계속 보인다.
 */

import Link from "next/link";
import { useEffect, useState } from "react";
import { CalendarIcon } from "@/components/ui/icons";

export default function StickyBookBar() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    /*
      기준점은 화면 위쪽 단추 묶음이다. 픽셀 숫자로 정하면 글자 크기나
      기기에 따라 어긋나므로, 그 요소가 실제로 지나갔는지를 본다.
    */
    const anchor = document.querySelector("[data-book-anchor]");
    if (!anchor) return;

    const io = new IntersectionObserver(
      ([entry]) => setShow(!entry.isIntersecting),
      { rootMargin: "-8px 0px 0px 0px" },
    );
    io.observe(anchor);
    return () => io.disconnect();
  }, []);

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-40 border-t border-black/[0.06] bg-card/95 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur-md transition-transform duration-200 ease-out sm:hidden ${
        show ? "translate-y-0" : "translate-y-full"
      }`}
      /* 숨어 있는 동안에는 읽어 주는 도구와 탭 이동에서도 빠진다 */
      aria-hidden={!show}
      {...(show ? {} : { inert: "" as never })}
    >
      <div className="flex items-center gap-2.5">
        <Link
          href="/my/request"
          tabIndex={show ? 0 : -1}
          className="touch-target flex shrink-0 items-center justify-center rounded-btn px-4 text-[0.9375rem] font-extrabold text-ink-sub ring-1 ring-stone-line transition-colors active:bg-stone-bg"
        >
          상담 문의
        </Link>
        <Link
          href="/my/booking"
          tabIndex={show ? 0 : -1}
          className="touch-target flex flex-1 items-center justify-center gap-1.5 rounded-btn bg-gradient-to-b from-aqua-650 to-aqua-850 text-[1.0625rem] font-extrabold text-white shadow-[0_2px_10px_rgba(14,127,125,0.35)] transition-transform active:scale-[0.99]"
        >
          <CalendarIcon className="h-5 w-5" />
          예약하기
        </Link>
      </div>
    </div>
  );
}
