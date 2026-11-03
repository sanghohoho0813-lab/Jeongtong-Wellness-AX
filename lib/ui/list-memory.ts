/**
 * 목록에서 고객을 열었다가 돌아오면 — 찾던 자리 그대로 (D-64)
 * ==========================================================
 *
 * 고객 목록에서 「김」 을 치고 정렬을 바꿔 내려가다가 한 분을 열고, 다시
 * 목록으로 돌아오면 검색어 · 정렬 · 거르개가 다 풀리고 맨 위였다. 다음
 * 분을 보려면 처음부터 다시 쳐야 했다. 폰 앱은 돌아오면 그 자리다.
 *
 * 규칙
 *   · **고객 상세에서 돌아왔을 때만** 되살린다. 하단 탭이나 다른 화면에서
 *     들어오면 새 목록 — 「아까 친 검색어」 가 엉뚱할 때 나타나면 헷갈린다.
 *   · 이 탭(세션)에만 둔다(sessionStorage). 창을 닫으면 잊는다.
 *   · 고객 이름 같은 자료는 적지 않는다 — 검색어 · 거르개 · 스크롤 위치뿐.
 *
 * 「직전 화면」 은 AppShell 이 화면이 바뀔 때마다 적는다(lastPage).
 */

import { useEffect, useRef } from "react";

const LAST = "jt-last-page";

/** AppShell — 화면이 바뀌기 직전(이전 화면의 정리 단계)에 그 주소를 적는다 */
export function noteLeaving(pathname: string) {
  try {
    sessionStorage.setItem(LAST, pathname);
  } catch {
    /* 무시 */
  }
}

function lastPage(): string {
  try {
    return sessionStorage.getItem(LAST) ?? "";
  } catch {
    return "";
  }
}

const isDetail = (p: string) => /^\/customers\/[^/]+$/.test(p);

/**
 * 목록 화면의 상태 기억.
 * @param key     화면 이름 (customers · visits)
 * @param state   기억할 값 (검색어 · 거르개 등, 그대로 JSON 으로)
 * @param restore 되살릴 때 부르는 함수
 */
export function useListMemory<T>(key: string, state: T, restore: (saved: T) => void) {
  const storeKey = `jt-list:${key}`;
  const restored = useRef(false);
  const restoreRef = useRef(restore);
  restoreRef.current = restore;

  /* 들어올 때 — 고객 상세에서 돌아왔으면 되살리고, 스크롤은 그린 뒤에 */
  useEffect(() => {
    let saved: { state: T; y: number } | null = null;
    try {
      saved = JSON.parse(sessionStorage.getItem(storeKey) || "null");
    } catch {
      saved = null;
    }
    if (saved && isDetail(lastPage())) {
      restoreRef.current(saved.state);
      const y = saved.y;
      /* 되살린 값으로 목록이 다시 그려진 다음에 내려간다 */
      let n = 0;
      const tick = () => {
        if (++n < 3) return void window.requestAnimationFrame(tick);
        window.scrollTo({ top: y, behavior: "instant" as ScrollBehavior });
      };
      window.requestAnimationFrame(tick);
    }
    restored.current = true;
  }, [storeKey]);

  /* 값이 바뀔 때마다 · 스크롤할 때마다 적는다 */
  const json = JSON.stringify(state);
  const latest = useRef(state);
  latest.current = state;
  useEffect(() => {
    if (!restored.current) return;
    try {
      const prev = JSON.parse(sessionStorage.getItem(storeKey) || "null");
      sessionStorage.setItem(storeKey, JSON.stringify({ state: JSON.parse(json), y: prev?.y ?? 0 }));
    } catch {
      /* 무시 */
    }
  }, [json, storeKey]);
  useEffect(() => {
    /* 다른 화면으로 넘어가는 순간의 「맨 위로」 스크롤은 적지 않는다 — 주소가 이미 바뀌어 있다 */
    const here = window.location.pathname;
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(() => {
        raf = 0;
        if (window.location.pathname !== here) return;
        try {
          sessionStorage.setItem(storeKey, JSON.stringify({ state: latest.current, y: Math.round(window.scrollY) }));
        } catch {
          /* 무시 */
        }
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, [storeKey]);
}
