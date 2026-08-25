"use client";

/**
 * 폼 오류 — 말해 주고, 그 칸까지 데려다 준다
 * ==========================================
 *
 * 여태는 "연락처를 입력하세요." 라고 적어 주기만 했다. 그런데 그 문장은
 * 저장 단추 옆에 뜨고, 정작 비어 있는 칸은 화면 위쪽 어딘가다.
 *
 *   · 화면 낭독기를 쓰면 어느 칸이 문제인지 알 수 없다 (칸에 표시가 없다)
 *   · 폰에서 긴 폼이면 그 칸이 화면 밖이라 직접 찾아 올라가야 한다
 *   · 초점은 방금 누른 단추에 그대로 남아 있어, 탭으로 되짚어 가야 한다
 *
 * 그래서 오류를 낼 때 세 가지를 같이 한다.
 *   1) 무엇이 잘못됐는지 문장으로  (지금까지 하던 것)
 *   2) 그 칸에 표시를 남기고       (aria-invalid — 낭독기가 "잘못됨" 이라 읽는다)
 *   3) 그 칸으로 데려간다          (스크롤 + 초점)
 *
 * 표시는 값이 바뀌는 순간 지운다. 고치는 중에도 계속 "잘못됨" 이라고
 * 읽히면 그게 더 헷갈린다.
 */

import { useCallback, useRef, useState } from "react";
import type { RefObject } from "react";

type FieldRef = RefObject<HTMLElement | null>;

export function useFormError() {
  const [error, setError] = useState("");
  /** 지금 잘못됐다고 표시해 둔 칸 — 값이 바뀌면 표시를 거둔다 */
  const marked = useRef<HTMLElement | null>(null);

  const unmark = useCallback(() => {
    if (marked.current) {
      marked.current.removeAttribute("aria-invalid");
      marked.current = null;
    }
  }, []);

  /** 오류를 내고 그 칸으로 데려간다. 반환값은 undefined — `return fail(...)` 로 쓴다 */
  const fail = useCallback(
    (message: string, ref?: FieldRef) => {
      unmark();
      setError(message);
      const el = ref?.current;
      if (el) {
        el.setAttribute("aria-invalid", "true");
        marked.current = el;
        try {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          el.focus({ preventScroll: true });
        } catch {
          /* 초점을 못 받는 요소여도 문장은 이미 떴다 */
        }
      }
      return undefined;
    },
    [unmark],
  );

  /** 다시 시도할 때 — 문장과 표시를 함께 거둔다 */
  const clear = useCallback(() => {
    unmark();
    setError("");
  }, [unmark]);

  return { error, fail, clear };
}
