"use client";

/**
 * 브라우저 탭 제목 — 어느 탭이 무슨 화면인지
 * ==========================================
 *
 * 여섯 화면이 전부 "정통대왕쑥뜸원 AX Platform" 이었다. 원장님은 실제로
 * 대시보드를 띄워 두고 고객 상세를 새 탭으로 여는 식으로 쓰는데, 탭 줄에는
 * 같은 글자만 나란히 서서 어느 것이 어느 것인지 알 수 없었다.
 *
 * 화면 이름을 앞에 둔다 — 탭이 좁아지면 뒤쪽부터 잘리기 때문이다.
 *   "고객 · 정통대왕쑥뜸원 AX"
 *   "김영희 · 정통대왕쑥뜸원 AX"
 */

import { useEffect } from "react";

const BASE = "정통대왕쑥뜸원 AX";

export function useDocumentTitle(name?: string) {
  useEffect(() => {
    document.title = name ? `${name} · ${BASE}` : BASE;
  }, [name]);
}
