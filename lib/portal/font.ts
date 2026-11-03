/**
 * 고객 앱의 글자 크기 — 이 폰에만 (D-63)
 * ====================================
 *
 * 직원 화면에는 「글자 크게」 설정이 있지만, 고객 화면(MY WELLNESS)은
 * 늘 기본 크기로 고정이었다 — 그 설정은 매장 기기를 쓰는 직원의 것이라
 * 고객 폰에는 없기 때문이다. 그런데 정작 큰 글씨가 더 필요한 쪽은
 * 40~60대 고객이다. 폰의 「확대」 로 키우면 화면이 옆으로 밀려 보였다.
 *
 * 고객 폰의 저장 공간에 고객이 고른 값 하나만 둔다 (매장 자료 · 계정과
 * 상관없다). 화면을 그리기 전에 app/layout.tsx 가 읽어 붙이고, 고객
 * 화면이 열릴 때 한 번 더 붙인다(직원 화면에서 넘어온 경우).
 */

import { useCallback, useEffect, useState } from "react";

export const MY_FONT_KEY = "jt-my-font";
export type MyFont = "default" | "large";

export function readMyFont(): MyFont {
  try {
    return localStorage.getItem(MY_FONT_KEY) === "large" ? "large" : "default";
  } catch {
    return "default";
  }
}

export function useMyFontScale(): [MyFont, (v: MyFont) => void] {
  const [font, setFont] = useState<MyFont>("default");
  useEffect(() => {
    const v = readMyFont();
    setFont(v);
    document.documentElement.dataset.fontScale = v;
  }, []);
  const change = useCallback((v: MyFont) => {
    setFont(v);
    document.documentElement.dataset.fontScale = v;
    try {
      localStorage.setItem(MY_FONT_KEY, v);
    } catch {
      /* 못 적어도 지금 화면은 바뀐다 */
    }
  }, []);
  return [font, change];
}
