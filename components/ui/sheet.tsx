"use client";

/**
 * 아래에서 올라오는 창(시트) — 손잡이 · 끌어내려 닫기 (D-59)
 * ========================================================
 *
 * 폰에서 창은 이미 화면 아래에서 올라오는 모양이었다. 그런데
 *   · 나타날 때 움직임 없이 「툭」 떴고
 *   · 위에 손잡이(가로 막대)가 없어 끌어도 되는 창인지 몰랐고
 *   · 닫으려면 오른쪽 위 작은 ✕ 를 정확히 눌러야 했다.
 * 배달 · 지도 앱의 시트는 손잡이를 잡고 아래로 쓸면 닫힌다. 우리 사용자
 * (40~60대)가 매일 쓰는 앱이 그렇게 움직이니, 같은 손짓이 통하게 한다.
 *
 * 규칙
 *   · 끄는 자리는 **손잡이와 제목 줄만**이다. 창 안의 목록 · 입력칸을 끌면
 *     스크롤이어야지 닫힘이면 안 된다.
 *   · 손가락(터치 · 펜)일 때만 — 마우스는 ✕ 와 ESC 로 닫는다.
 *   · 단추 위에서 시작한 손짓은 그 단추를 누른 것이다 (끌기로 가로채지 않는다).
 *   · 충분히(110px) 내리거나 빠르게 휙 쓸면 닫고, 아니면 제자리로 돌아온다.
 *   · 닫는 길은 하나 — 창이 주는 onDismiss. 적던 내용이 있으면 Modal 은
 *     「적으신 내용이 사라집니다」 를 먼저 묻는다 (끌어서 닫아도 같다).
 *   · 움직임 줄이기 설정을 켠 분께는 올라오는 움직임을 없앤다 (globals.css).
 */

import { PointerEvent, useRef, useState } from "react";

export function useSheetDrag(onDismiss: () => void) {
  const [dy, setDy] = useState(0);
  const start = useRef<{ y: number; t: number; id: number } | null>(null);

  const end = (e: PointerEvent) => {
    const s = start.current;
    if (!s || s.id !== e.pointerId) return;
    start.current = null;
    const d = Math.max(0, e.clientY - s.y);
    const speed = d / Math.max(1, Date.now() - s.t); // px/ms
    setDy(0);
    if (d > 110 || (d > 40 && speed > 0.6)) onDismiss();
  };

  const handleProps = {
    onPointerDown: (e: PointerEvent) => {
      if (e.pointerType === "mouse") return;
      if ((e.target as HTMLElement).closest("button, a, input, select, textarea")) return;
      start.current = { y: e.clientY, t: Date.now(), id: e.pointerId };
      /* 손가락이 손잡이 밖으로 나가도 계속 따라오게. 못 잡아도 끌기는 된다 */
      try {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      } catch {
        /* 일부 브라우저 · 이미 놓은 손가락 */
      }
    },
    onPointerMove: (e: PointerEvent) => {
      const s = start.current;
      if (!s || s.id !== e.pointerId) return;
      setDy(Math.max(0, e.clientY - s.y));
    },
    onPointerUp: end,
    onPointerCancel: end,
    /* 손잡이 · 제목 줄을 끄는 동안 화면이 같이 스크롤되지 않게 */
    style: { touchAction: "none" as const },
  };

  /* 끄는 동안은 손가락을 그대로 따라오고, 놓으면 부드럽게 제자리로 */
  const panelStyle = dy
    ? { transform: `translateY(${dy}px)`, transition: "none" }
    : { transition: "transform 0.2s cubic-bezier(0.22, 1, 0.36, 1)" };

  return { dy, handleProps, panelStyle };
}

/** 시트 맨 위 손잡이 — 폰에서만 (넓은 화면의 창은 가운데 뜨는 상자라 끌 일이 없다) */
export function SheetGrabber() {
  return (
    <div aria-hidden data-sheet-grabber className="flex justify-center pb-1 pt-2.5 sm:hidden">
      <span className="h-1.5 w-11 rounded-full bg-ink-faint/40" />
    </div>
  );
}
