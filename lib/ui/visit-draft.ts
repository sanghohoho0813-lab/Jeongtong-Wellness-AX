/**
 * 적다 만 방문 기록 — 폰이 화면을 버려도 남게 (D-64)
 * ================================================
 *
 * 카운터에서 기록을 적다가 전화를 받거나 카톡을 보고 돌아오면, 폰(특히
 * 아이폰 사파리)이 뒤로 간 탭을 새로 불러오는 일이 잦다. 그러면 적던
 * 메모 · 금액이 통째로 사라졌다 — 다시 기억해서 쳐야 했다.
 *
 * 메모나 금액을 적는 동안 그 내용을 이 기기에 잠깐 적어 둔다(고객별 하나).
 *   · 저장하거나 「그냥 닫기」 로 창을 닫으면 지운다 (일부러 버린 것)
 *   · 폰이 화면을 새로 불러온 경우에만 남는다 → 앱을 다시 열면
 *     「적다 만 기록이 있습니다 — 이어서 쓰기」
 *   · 하루가 지나면 버린다
 *
 * 이 기기의 저장소에만 둔다 — 모든 기록이 이미 그곳에 있으므로 새로
 * 생기는 노출은 없다.
 */

const PREFIX = "jt-draft:visit:";
const MAX_AGE = 24 * 60 * 60 * 1000;

export interface VisitDraft {
  savedAt: number;
  visitDate: string;
  visitTime?: string;
  type: string;
  programName: string;
  membershipId: string;
  parts: unknown[];
  reaction: string;
  amount: string;
  nextManage: string;
  nextManageTime?: string;
  staffId: string;
  appliedPrefs: string[];
}

export function saveVisitDraft(customerId: string, d: Omit<VisitDraft, "savedAt">) {
  try {
    localStorage.setItem(PREFIX + customerId, JSON.stringify({ ...d, savedAt: Date.now() }));
  } catch {
    /* 못 적어도 기록 창은 그대로 */
  }
}

export function loadVisitDraft(customerId: string): VisitDraft | null {
  try {
    const d = JSON.parse(localStorage.getItem(PREFIX + customerId) || "null") as VisitDraft | null;
    if (!d || Date.now() - d.savedAt > MAX_AGE) return null;
    return d;
  } catch {
    return null;
  }
}

export function clearVisitDraft(customerId: string) {
  try {
    localStorage.removeItem(PREFIX + customerId);
  } catch {
    /* 무시 */
  }
}

/** 남아 있는 초안들 — 앱을 다시 열 때 「이어서 쓰기」 를 권한다 */
export function listVisitDrafts(): { customerId: string; savedAt: number }[] {
  const out: { customerId: string; savedAt: number }[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k?.startsWith(PREFIX)) continue;
      const id = k.slice(PREFIX.length);
      const d = loadVisitDraft(id);
      if (d) out.push({ customerId: id, savedAt: d.savedAt });
      else localStorage.removeItem(k);
    }
  } catch {
    /* 무시 */
  }
  return out.sort((a, b) => b.savedAt - a.savedAt);
}
