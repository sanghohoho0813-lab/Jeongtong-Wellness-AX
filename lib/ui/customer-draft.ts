/**
 * 적다 만 고객 등록 — 폰이 화면을 버려도 남게 (D-65)
 * =================================================
 *
 * 처음 오신 분의 이름 · 번호 · 상담 메모를 받아 적다가 전화가 오면, 폰이
 * 화면을 새로 불러와 적던 것이 사라졌다. 방문 기록 초안(visit-draft)과
 * 같은 규칙이다 — 적는 동안만 이 기기에, 저장 · 「그냥 닫기」 는 지우고,
 * 폰이 화면을 버린 경우에만 남아 앱을 다시 열면 「이어서 쓰기」.
 */

const KEY = "jt-draft:customer:new";
const MAX_AGE = 24 * 60 * 60 * 1000;

export interface CustomerDraft {
  savedAt: number;
  name: string;
  phone: string;
  gender: string;
  ageGroup: string;
  consultationNote: string;
  staffId: string;
  memo: string;
  parts: unknown[];
  nextManage: string;
  nextManageTime?: string;
}

export function saveCustomerDraft(d: Omit<CustomerDraft, "savedAt">) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...d, savedAt: Date.now() }));
  } catch {
    /* 무시 */
  }
}

export function loadCustomerDraft(): CustomerDraft | null {
  try {
    const d = JSON.parse(localStorage.getItem(KEY) || "null") as CustomerDraft | null;
    if (!d || Date.now() - d.savedAt > MAX_AGE) return null;
    return d;
  } catch {
    return null;
  }
}

export function clearCustomerDraft() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* 무시 */
  }
}
