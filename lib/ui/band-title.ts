/**
 * 머리 띠가 위로 사라지면 그 화면 이름을 맨 위 머리글에 (D-60)
 * ============================================================
 *
 * 폰 앱의 「큰 제목이 작아지며 위에 붙는」 움직임이다. 고객 상세를
 * 내려 보다 보면 지금 누구의 화면인지가 사라졌다 — 이름은 맨 위 띠에만
 * 있었고, 그 자리를 상호(정통대왕쑥뜸원)가 차지하고 있었다. 내려가 있는
 * 동안에는 머리글 왼쪽이 그 화면 이름(고객 이름)으로 바뀐다.
 *
 * 띠(StaffBand · 작은 띠 PageHeader · 고객 앱 PageHead)가 알리고
 * 머리글(AppShell 의 MobileHeader · 고객 앱 PortalHeader)이 듣는다.
 * 화면이 바뀌거나 띠가 다시 보이면 null 을 알려 상호로 돌아간다.
 */

import { RefObject, useEffect } from "react";

export const BAND_TITLE_EVENT = "jt:band-title";

export interface BandTitle {
  title: string;
  /** 얼굴 동그라미 글자 (고객 상세) */
  initial?: string;
}

export function announceBandTitle(value: BandTitle | null) {
  window.dispatchEvent(new CustomEvent<BandTitle | null>(BAND_TITLE_EVENT, { detail: value }));
}

/** 폰 머리글의 높이 — 띠가 「머리글 밑으로 들어갔는지」 를 잴 때 */
export function mobileHeaderHeight(): number {
  const v = getComputedStyle(document.documentElement).getPropertyValue("--mobile-header-h");
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
}

/**
 * 이 제목(ref)이 폰 머리글 밑으로 들어가면 알리고, 다시 나오면 거둔다.
 * 머리 띠(StaffBand) · 작은 띠(PageHeader) 가 같이 쓴다.
 */
export function useAnnounceWhenHidden(
  ref: RefObject<HTMLElement>,
  title?: string,
  initial?: string,
) {
  useEffect(() => {
    const el = ref.current;
    if (!el || !title || typeof IntersectionObserver === "undefined") return;
    let shown = false;
    const io = new IntersectionObserver(
      ([e]) => {
        const gone = !e.isIntersecting && e.boundingClientRect.top < (e.rootBounds?.top ?? 0) + 1;
        if (gone !== shown) {
          shown = gone;
          announceBandTitle(gone ? { title, initial } : null);
        }
      },
      { rootMargin: `-${Math.round(mobileHeaderHeight())}px 0px 0px 0px` },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      if (shown) announceBandTitle(null);
    };
  }, [ref, title, initial]);
}
