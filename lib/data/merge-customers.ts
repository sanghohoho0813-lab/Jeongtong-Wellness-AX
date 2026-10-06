/**
 * 같은 고객 합치기
 * ================
 *
 * 같은 분이 두 번 등록되면 방문 기록이 둘로 갈라진다. 평균 이용주기도,
 * 누적 방문도, 이용권 잔여도 반쪽씩 보여서 브리핑이 틀린 판단을 한다
 * (「첫 방문 고객」 으로 보이는데 실은 열 번째 오신 분).
 *
 * 합치는 규칙 — 지우는 것은 명부의 한 줄뿐이고 기록은 하나도 잃지 않는다.
 *   · 방문 · 이용권 · 케어 선호 → 전부 남기는 분에게로
 *   · 고객 칸은 남기는 분 것이 기준. 비어 있는 칸만 다른 분 값으로 채운다
 *   · 둘 다 적혀 있는 글(메모 · 상담 원문)은 이어 붙인다 — 어느 한쪽을 버리지 않는다
 *   · 등록일은 이른 쪽, 마지막 연락일은 늦은 쪽
 *
 * 계산만 한다 (저장소 · 화면 모름). 되돌리기에 필요한 것도 함께 돌려준다.
 */

import type { BodyPartRecord, Customer, Membership, Visit } from "@/lib/types";

export interface CustomerMergeUndo {
  keepBefore: Customer;
  dropped: Customer;
  /** 옮긴 방문 · 이용권 id — 되돌릴 때 원래 분에게 돌려준다 */
  movedVisitIds: string[];
  movedMembershipIds: string[];
}

const joinText = (a?: string, b?: string) => {
  const x = a?.trim();
  const y = b?.trim();
  if (!x) return y || undefined;
  if (!y || x === y || x.includes(y)) return x;
  return `${x}\n\n${y}`;
};

const unionParts = (a: BodyPartRecord[], b: BodyPartRecord[]) => {
  const seen = new Set(a.map((p) => `${p.part}:${p.side ?? ""}`));
  return [...a, ...b.filter((p) => !seen.has(`${p.part}:${p.side ?? ""}`))];
};

export function mergeCustomerRecords(keep: Customer, drop: Customer): Customer {
  const minDate = (a?: string, b?: string) =>
    !a ? b : !b ? a : a < b ? a : b;
  const maxDate = (a?: string, b?: string) =>
    !a ? b : !b ? a : a > b ? a : b;

  const prefKey = (p: { category: string; note: string }) =>
    `${p.category}:${p.note.trim()}`;
  const keepPrefs = keep.preferences ?? [];
  const seen = new Set(keepPrefs.map(prefKey));
  const prefs = [
    ...keepPrefs,
    ...(drop.preferences ?? []).filter((p) => !seen.has(prefKey(p))),
  ];
  const tags = [...new Set([...(keep.tags ?? []), ...(drop.tags ?? [])])];
  const usePhone = !keep.phone?.trim() && !!drop.phone?.trim();

  return {
    ...keep,
    phone: usePhone ? drop.phone : keep.phone,
    phoneMasked: usePhone ? drop.phoneMasked : keep.phoneMasked,
    gender: keep.gender ?? drop.gender,
    birthYear: keep.birthYear ?? drop.birthYear,
    ageGroup: keep.ageGroup ?? drop.ageGroup,
    assignedStaffId: keep.assignedStaffId ?? drop.assignedStaffId,
    consultationNote: joinText(keep.consultationNote, drop.consultationNote),
    memo: joinText(keep.memo, drop.memo),
    focusBodyParts: unionParts(keep.focusBodyParts ?? [], drop.focusBodyParts ?? []),
    registeredAt: minDate(keep.registeredAt, drop.registeredAt) ?? keep.registeredAt,
    nextManageDate: keep.nextManageDate ?? drop.nextManageDate,
    nextManageTime: keep.nextManageDate ? keep.nextManageTime : drop.nextManageTime,
    lastContactDate: maxDate(keep.lastContactDate, drop.lastContactDate),
    tags: tags.length ? tags : undefined,
    preferences: prefs.length ? prefs : undefined,
  };
}

/** 합치기 전에 화면에 보여 줄 숫자 — 무엇이 옮겨 가는지 */
export function mergePreview(
  dropId: string,
  visits: Visit[],
  memberships: Membership[],
  drop: Customer,
) {
  return {
    visits: visits.filter((v) => v.customerId === dropId).length,
    memberships: memberships.filter((m) => m.customerId === dropId).length,
    preferences: drop.preferences?.length ?? 0,
  };
}

/** 같은 분으로 보이는 다른 고객 — 이름이 같거나, 번호가 같거나 */
export function findLikelySame(target: Customer, customers: Customer[]): Customer[] {
  const name = target.name.trim();
  const digits = (p?: string) => (p ?? "").replace(/\D/g, "");
  const phone = target.phoneMasked ? "" : digits(target.phone);
  return customers.filter((c) => {
    if (c.id === target.id) return false;
    if (c.name.trim() === name) return true;
    return phone.length >= 8 && !c.phoneMasked && digits(c.phone) === phone;
  });
}
