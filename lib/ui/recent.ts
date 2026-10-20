/**
 * 최근 본 고객 (D-60)
 * ==================
 *
 * 카운터에서 하루에 찾는 고객은 대개 몇 분이 반복된다 — 아침에 연락한
 * 분, 방금 오신 분, 오후에 다시 오실 분. 그런데 찾기 창은 열 때마다
 * 빈 칸이라, 방금 본 분도 이름을 다시 쳐야 했다. 휴대폰 연락처 · 배달
 * 앱의 「최근」 처럼 빈 찾기 창에 방금 본 분들을 먼저 둔다.
 *
 * 이 기기에만, 고객 **번호(id)만** 적어 둔다. 이름 · 연락처는 적지 않는다
 * — 그릴 때마다 지금 자료에서 다시 찾으므로, 지워졌거나 합쳐진 고객은
 * 저절로 빠지고 화면 공유 모드의 가림도 그대로 따른다.
 */

const KEY = "jt-recent-customers";
const MAX = 6;

function read(): string[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

/** 고객 상세를 열 때 — 맨 앞으로 올린다 (같은 분은 한 번만) */
export function rememberCustomer(id: string) {
  try {
    const next = [id, ...read().filter((x) => x !== id)].slice(0, MAX);
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* 사생활 보호 창 등 — 못 적어도 화면은 그대로 */
  }
}

/** 최근 본 순서대로 */
export function recentCustomerIds(): string[] {
  return read();
}

/** 「최근 본 고객 지우기」 */
export function clearRecentCustomers() {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* 무시 */
  }
}
