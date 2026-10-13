"use client";

/**
 * 말풍선 — 마우스를 올리면 「이게 무엇인지」 가 뜬다
 * ===============================================
 *
 * 목차 · 탭 · 접힌 칸 아래에 늘 적혀 있던 작은 설명 글을 걷어 내고, 그
 * 설명을 여기로 옮긴다. 화면에는 이름만 남고, 궁금할 때 마우스를 올리면
 * 무엇이 들어 있는지 보인다 — 펼칠지 말지를 그걸 보고 정한다.
 *
 * - 마우스가 있는 화면(PC)에서만 올렸을 때 뜬다. 폰에는 「올리기」 가
 *   없으므로, 폰에서 설명이 필요한 자리(접는 칸 · 화면 제목)는 ⓘ 를
 *   눌러 그 자리에서 펴는 방식을 따로 둔다 (Fold · PageHeader).
 * - 키보드로 옮겨 와도(Tab) 뜬다.
 * - 말풍선은 화면 맨 위에 따로 그린다. 왼쪽 메뉴처럼 스크롤 상자 안에
 *   있는 단추도 상자 밖으로 말풍선을 낼 수 있어야 하기 때문이다.
 * - 읽어 주는 프로그램(스크린리더)에는 설명이 늘 같이 읽힌다.
 */

import {
  cloneElement,
  isValidElement,
  ReactElement,
  ReactNode,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

type Side = "right" | "bottom" | "top";

export function Hint({
  text,
  title,
  side = "bottom",
  children,
}: {
  /** 무엇이 들어 있는지 — 한두 줄 */
  text: ReactNode;
  /** 말풍선 맨 위 굵은 줄 (없으면 설명만) */
  title?: string;
  side?: Side;
  children: ReactElement;
}) {
  const id = useId();
  const wrap = useRef<HTMLSpanElement>(null);
  const timer = useRef<number | undefined>(undefined);
  const [pos, setPos] = useState<{ x: number; y: number; side: Side; start?: boolean } | null>(
    null,
  );

  const anchor = () => wrap.current?.firstElementChild as HTMLElement | null;

  const show = (now = false) => {
    window.clearTimeout(timer.current);
    const go = () => {
      const el = anchor();
      if (!el) return;
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) return;
      let s: Side = side;
      // 오른쪽 자리가 모자라면 아래로
      if (s === "right" && r.right + 280 > window.innerWidth) s = "bottom";
      if (s === "bottom" && r.bottom + 120 > window.innerHeight) s = "top";
      /*
        접는 칸 제목 줄처럼 넓은 단추는 가운데가 제목에서 멀다 — 그때는
        말풍선을 제목이 시작하는 왼쪽 끝에 붙인다 (어느 칸의 설명인지 바로 보이게).
      */
      const start = r.width > 320;
      const x = start ? r.left + 8 : r.left + r.width / 2;
      if (s === "right") setPos({ x: r.right + 12, y: r.top + r.height / 2, side: s });
      else if (s === "top") setPos({ x, y: r.top - 10, side: s, start });
      else setPos({ x, y: r.bottom + 10, side: s, start });
    };
    if (now) go();
    else timer.current = window.setTimeout(go, 220);
  };
  const hide = () => {
    window.clearTimeout(timer.current);
    setPos(null);
  };

  useEffect(() => {
    if (!pos) return;
    const off = () => setPos(null);
    window.addEventListener("scroll", off, true);
    window.addEventListener("resize", off);
    return () => {
      window.removeEventListener("scroll", off, true);
      window.removeEventListener("resize", off);
    };
  }, [pos]);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const canHover = () =>
    typeof window !== "undefined" && window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  const child =
    isValidElement(children) && typeof text === "string"
      ? cloneElement(children as ReactElement<Record<string, unknown>>, {
          "aria-describedby": `${id}-d`,
        })
      : children;

  return (
    <span
      ref={wrap}
      className="contents"
      onMouseEnter={() => canHover() && show()}
      onMouseLeave={hide}
      onFocus={(e) => {
        // 키보드로 왔을 때만 (눌러서 생긴 초점에는 띄우지 않는다)
        if ((e.target as HTMLElement).matches?.(":focus-visible")) show(true);
      }}
      onBlur={hide}
      onClick={hide}
    >
      {child}
      {/* 읽어 주는 프로그램용 설명 — 글만 (단추 같은 것을 숨은 자리에 한 벌 더 만들지 않는다) */}
      {typeof text === "string" && (
        <span id={`${id}-d`} className="sr-only">
          {title ? `${title} — ` : ""}
          {text}
        </span>
      )}
      {pos &&
        createPortal(
          <span
            role="tooltip"
            data-hint
            style={{
              left: pos.x,
              top: pos.y,
              transform:
                pos.side === "right"
                  ? "translateY(-50%)"
                  : pos.side === "top"
                    ? pos.start
                      ? "translateY(-100%)"
                      : "translate(-50%, -100%)"
                    : pos.start
                      ? "none"
                      : "translateX(-50%)",
            }}
            className="pointer-events-none fixed z-[90] block w-max max-w-[17rem] rounded-xl bg-deep-900 px-3.5 py-2.5 text-left text-[0.9375rem] font-semibold leading-snug text-white shadow-[0_10px_30px_rgba(0,0,0,0.25)] ring-1 ring-white/10 [word-break:keep-all]"
          >
            {title && (
              <span className="mb-0.5 block text-[0.9375rem] font-extrabold text-aqua-300">
                {title}
              </span>
            )}
            {text}
          </span>,
          document.body,
        )}
    </span>
  );
}
