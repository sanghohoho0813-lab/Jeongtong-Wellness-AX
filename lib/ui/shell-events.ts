/**
 * 화면 어디서든 껍데기(AppShell)의 창을 여는 신호
 * ===============================================
 *
 * 방문 기록 · 고객 찾기 · 처음 오신 분 등록 창은 AppShell 이 갖고 있다.
 * 폰 하단 [기록] 단추와 머리글 돋보기가 그 창을 연다.
 *
 * 대시보드의 바로가기 칸(배달 앱의 아이콘 칸)도 같은 창을 열어야 하는데,
 * 창의 상태를 화면마다 따로 들고 있으면 같은 창이 두 벌 생긴다. 그래서
 * 화면은 신호만 보내고, 여는 일은 AppShell 한 곳이 맡는다.
 */

export const SHELL_EVENTS = {
  /** 고객 고르기 → 방문 기록 창 (폰 하단 [기록] 과 같다) */
  record: "jt:open-record",
  /** 고객 · 화면 찾기 (Ctrl/⌘+K 와 같다) */
  search: "jt:open-search",
  /** 처음 오신 분 등록 */
  newCustomer: "jt:new-customer",
} as const;

export type ShellEvent = keyof typeof SHELL_EVENTS;

export function openShell(kind: ShellEvent) {
  window.dispatchEvent(new CustomEvent(SHELL_EVENTS[kind]));
}
